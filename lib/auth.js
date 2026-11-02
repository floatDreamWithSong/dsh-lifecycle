/**
 * Persistent session digests and secure cookie handling; derived from dsh-auth-gateway (MIT).
 *
 * Sessions are atomically persisted before authentication responses. Raw tokens and
 * incomplete OTP/onboarding state are deliberately excluded from disk.
 *
 * The Secure attribute is decided per response by the caller (the
 * `cookieSecure` config: 'auto' follows {@link requestIsSecure}, true/false
 * pin it) — see docs/zh/SECURITY.md「明文 HTTP」for the deployment trade-off.
 */

import { randomBytes, createHash } from 'node:crypto'
import { readDurableJson, writeDurableJson } from './durable-json.js'
import { lifecyclePath, credentialFingerprint } from './lifecycle-policy.js'

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days
const COOKIE_NAME = 'dsh_auth'

/** One live session. */
class Session {
  constructor(expiresAt) {
    this.expiresAt = expiresAt
    /** Temporary OTP secret during setup (not yet verified). */
    this.tempOTP = null
    /** Whether OTP verification has been completed for this session. */
    this.otpVerified = false
    /** Whether this session logged in with the auto-generated initial
     * password and still owes the onboarding step (set a new password). */
    this.needsOnboarding = false
  }
}

/** Session table owned by one gateway instance. */
export class SessionStore {
  constructor({ canPersist = session => !session.needsOnboarding, onRevoke = () => {} } = {}) {
    this.sessions = new Map()
    this.canPersist = canPersist
    this.onRevoke = onRevoke
    this.dirty = false
    const saved = readDurableJson(lifecyclePath('sessions.json'))
    if (saved) {
      if (saved.version !== 1 || !Array.isArray(saved.sessions)) throw new Error('Invalid persisted sessions')
      if (saved.fingerprint === credentialFingerprint()) {
        for (const [hash, entry] of saved.sessions) {
          if (!/^[a-f0-9]{64}$/.test(hash) || typeof entry.expiresAt !== 'number' || typeof entry.otpVerified !== 'boolean') throw new Error('Corrupt persisted session')
          if (entry.expiresAt > Date.now() && entry.expiresAt <= Date.now() + SESSION_TTL_SECONDS * 1000) this.sessions.set(hash, Object.assign(new Session(entry.expiresAt), { otpVerified: entry.otpVerified }))
        }
      }
    }
  }

  /** One-way identifier: raw bearer tokens never enter the state file. */
  key(token) { return createHash('sha256').update(String(token)).digest('hex') }

  /** Persist only completed sessions; never write temporary OTP secrets or pending factors. */
  flush() {
    if (!this.dirty) return
    const sessions = [...this.sessions].filter(([, s]) => s.expiresAt > Date.now() && this.canPersist(s))
      .map(([hash, s]) => [hash, { expiresAt: s.expiresAt, otpVerified: s.otpVerified }])
    writeDurableJson(lifecyclePath('sessions.json'), { version: 1, fingerprint: credentialFingerprint(), sessions })
    this.dirty = false
  }

  /** Mint a new token (hex, 64 chars) valid for SESSION_TTL_SECONDS. */
  issue() {
    for (const [key, session] of this.sessions) if (session.expiresAt <= Date.now()) this.sessions.delete(key)
    if (this.sessions.size >= 256) throw new Error('Too many sessions; revoke old sessions first')
    const token = randomBytes(32).toString('hex')
    this.sessions.set(this.key(token), new Session(Date.now() + SESSION_TTL_SECONDS * 1000))
    this.dirty = true
    return token
  }

  /** True when the token exists and has not expired; lazy-expires. */
  isValid(token) {
    if (token === undefined) return false
    const session = this.sessions.get(this.key(token))
    if (session === undefined) return false
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(this.key(token))
      return false
    }
    return true
  }

  /** Drop one token (logout). */
  revoke(token) {
    this.revokeHash(this.key(token))
  }

  /** Revoke an owned digest and any live WebSockets authenticated by it. */
  revokeHash(hash) {
    this.sessions.delete(hash)
    this.onRevoke(hash)
    this.dirty = true;this.flush()
  }

  /** Drop every token (password change). */
  revokeAll() {
    this.sessions.clear()
    this.onRevoke(null)
    this.dirty = true;this.flush()
  }

  /** Set temporary OTP secret during setup. */
  setTempOTP(token, secret) {
    const session = this.sessions.get(this.key(token))
    if (session) {
      session.tempOTP = secret
    }
  }

  /** Get temporary OTP secret during setup. */
  getTempOTP(token) {
    const session = this.sessions.get(this.key(token))
    return session?.tempOTP || null
  }

  /** Clear temporary OTP secret after setup. */
  clearTempOTP(token) {
    const session = this.sessions.get(this.key(token))
    if (session) {
      session.tempOTP = null
    }
  }

  /** Mark session as OTP-verified. */
  markOTPVerified(token) {
    const session = this.sessions.get(this.key(token))
    if (session) {
      session.otpVerified = true
      session.expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
      this.dirty = true
    }
  }

  /** Check if session has OTP verification completed. */
  isOTPVerified(token) {
    const session = this.sessions.get(this.key(token))
    return session?.otpVerified || false
  }

  /** Mark a session as logged in with the initial password (owes onboarding). */
  markNeedsOnboarding(token) {
    const session = this.sessions.get(this.key(token))
    if (session) {
      session.needsOnboarding = true
      this.dirty = true
    }
  }

  /** Whether the session still owes the onboarding step. */
  isNeedsOnboarding(token) {
    const session = this.sessions.get(this.key(token))
    return session?.needsOnboarding || false
  }
}

/** Parse the Cookie header and return the dsh_auth value, if any. */
export function tokenFromCookieHeader(cookieHeader) {
  if (cookieHeader === undefined) return undefined
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === COOKIE_NAME) {
      return part.slice(eq + 1).trim() || undefined
    }
  }
  return undefined
}

/**
 * Whether this request reached the gateway over an encrypted link, as far as
 * the gateway can tell: a TLS socket of its own (`socket.encrypted`) or the
 * `X-Forwarded-Proto: https` a reverse proxy sets when it terminates TLS.
 *
 * The header is deliberately trusted without a trusted-proxy allowlist. It is
 * per-request and self-directed — a client forging `https` only makes its OWN
 * cookie Secure, which its plain-HTTP user agent then refuses to store (a
 * self-inflicted lockout), and forging `http` only downgrades that same
 * client. No cross-client gain exists, so there is nothing to fence off; a
 * multi-hop header list is read at the first (closest-proxy) entry.
 */
export function requestIsSecure(req) {
  if (req?.socket?.encrypted === true) return true
  const forwarded = req?.headers?.['x-forwarded-proto']
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
  if (typeof first !== 'string') return false
  return first.split(',')[0].trim().toLowerCase() === 'https'
}

/** Set-Cookie value for a fresh token. HttpOnly + SameSite=Strict always;
 * `secure` adds the Secure attribute. Plain-HTTP deployments leave it off:
 * a Secure cookie is never sent back over http, so forcing it there would
 * break the login instead of protecting it. */
export function sessionCookie(token, secure = false) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`
}

/** The ONE Secure decision for a cookie under a policy mode: pinned true/false
 * win outright, 'auto' follows the request transport. Every cookie minting
 * site (gateway login/logout/clear, the panel's post-save reissue) derives
 * its Secure attribute from here — a new transport signal needs exactly one
 * edit. */
export function secureForPolicy(mode, req) {
  if (mode === true) return true
  if (mode === false) return false
  return requestIsSecure(req)
}

/** Expired-cookie value used on logout. `secure` mirrors the attribute the
 * session cookie was set with, so the clearing cookie matches it. */
export function expiredCookie(secure = false) {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`
}
