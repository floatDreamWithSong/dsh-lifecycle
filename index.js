// Authentication kernel adapted from xbzbing/dsh-auth-gateway 0.8.7 (MIT).
/**
 * dsh-auth-gateway — Cordis plugin entry.
 *
 * Provides a password login gateway in front of the dsh web server. The
 * gateway owns the external port; every HTTP request and WebSocket upgrade
 * passes its auth gate before being forwarded verbatim to the internal dsh
 * webserver (whose bundle patch moves it to a loopback-only port).
 *
 * See docs/zh/DEVELOPMENT.md for the architecture and docs/zh/SECURITY.md for
 * the security model.
 */

import { createGateway, lanAddresses } from './lib/gateway.js'
import { Config } from './lib/config.js'
import { AuditLogWriter } from './lib/audit-log.js'
import { hasPassword, isInitialPassword, readInitialPassword, setPassword, generateInitialPassword } from './lib/store.js'
import { hasOTP, getOTPStatus } from './lib/otp-store.js'
import { buildLanTrustScript } from './lib/lan-trust-script.js'
import { createCachedSecretReader } from './lib/upstream-auth.js'
import { readPackageMeta } from './lib/version.js'
import { localePreference } from './lib/locale.js'
import { readLifecyclePolicy } from './lib/lifecycle-policy.js'

export const name = 'dsh-lifecycle'

export { Config }

/**
 * The gateway needs the real web server running (its port is the upstream).
 * `credentials` is the official record service for the upstream
 * `client-connection/browser-session` signing secret.
 */
export const inject = ['webServer', 'credentials', 'settings']

/** The credential record dsh persists its upstream browser-session secret in. */
const UPSTREAM_RECORD_KEY = 'client-connection/browser-session'

/** Our own credential record holding the panel's cookieSecure override. */
const COOKIE_SECURE_RECORD = 'dsh-auth-gateway/cookie-secure'

/**
 * Build the upstream browser-auth secret source (see
 * createCachedSecretReader in lib/upstream-auth.js for the caching and
 * retry semantics). `secret` is the synchronous reader handed down to the
 * forwarder; `warm` is awaited before the gateway listens so the first
 * forwarded request can never race ahead of the cache.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
function upstreamSecretReader(ctx) {
  return createCachedSecretReader({
    key: UPSTREAM_RECORD_KEY,
    readRecord: (key) => ctx.credentials.readRecord(key),
    onError: (err) => {
      // Transient read failure: keep the last known secret so forwarding
      // keeps working; a truly revoked secret surfaces as upstream 401s
      // (visible) rather than a silent gateway-side refusal.
      ctx.logger.warn('[dsh-lifecycle] 读取 upstream browser-session 密钥失败: %s',
        err instanceof Error ? err.message : String(err))
    },
  })
}

/**
 * Build the credential-record persistence half of the cookieSecure override
 * (the settings panel writes it via POST /login-api/cookie-secure). The
 * record lives in our own scope (`dsh-auth-gateway/cookie-secure`, a grant
 * payload in our format — the seam treats it as opaque).
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
function cookieSecureOverrideStore(ctx) {
  return {
    read: async () => {
      try {
        const record = await ctx.credentials.readRecord(COOKIE_SECURE_RECORD)
        const mode = record?.kind === 'grant' ? record.payload?.mode : undefined
        return mode === true || mode === false || mode === 'auto' ? mode : null
      } catch (err) {
        // A broken record (or a transient service error) must not brick
        // startup: fall back to the composition value, keep the panel's
        // write path available (a failed write reports storage-failed).
        ctx.logger.warn('[dsh-lifecycle] 读取 cookieSecure 面板覆盖失败，回退到部署配置: %s',
          err instanceof Error ? err.message : String(err))
        return null
      }
    },
    write: async (mode) => {
      await ctx.credentials.modifyRecord(COOKIE_SECURE_RECORD, async () => ({ kind: 'grant', payload: { mode } }))
    },
    clear: async () => {
      await ctx.credentials.deleteRecord(COOKIE_SECURE_RECORD)
    },
  }
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {object} [config] - plugin config from the composition
 */
export async function apply(ctx, config) {
  const upstream = upstreamSecretReader(ctx)
  // The panel override of the cookie Secure policy, persisted through the
  // credential record; read BEFORE the gateway listens so the first login
  // already applies it (empty record → the composition value rules).
  const cookieSecureOverrideStoreInstance = cookieSecureOverrideStore(ctx)
  const cookieSecureOverride = await cookieSecureOverrideStoreInstance.read()
  // Running version + repository, read from the package.json shipped beside
  // this module: the settings panel displays them and the update check
  // compares against them. Read once per apply — a deploy replaces both the
  // code and its metadata together.
  const packageMeta = readPackageMeta()
  // Populate the upstream browser-auth secret cache BEFORE the gateway
  // listens: the first forwarded request must never race ahead of the read
  // (fire-and-forget warm-up could cost one visible upstream 401). A failed
  // or absent read still resolves; without a secret the upstream answers
  // 401 until the record appears.
  await upstream.warm()
  // `onError` is assigned just below; LoginGateway only ever reads it through
  // an optional call, so an unwired sink is a no-op.
  const gateway = createGateway(config, {
    upstreamSecretReader: upstream.secret,
    localePreference: () => localePreference(ctx.settings),
    versionInfo: packageMeta,
    cookieSecureOverride,
    cookieSecureOverrideStore: cookieSecureOverrideStoreInstance,
    // Automatic checks are opt-IN (default off), so a fresh install makes no
    // outbound request. The panel's "check for updates" button drives an
    // explicit on-demand check whatever this is set to.
    updateCheckAuto: config?.updateCheck ?? false,

  })

  // Browser-side compatibility for authenticated pages. The randomUUID
  // polyfill can run at the start of <head>; it also publishes the gateway's
  // basePath ('' for root) as a global so the client settings panel builds
  // API paths and redirects that survive sub-path (reverse-proxy) deployments.
  // The loader proxy flips connection.isLoopback at registration time, before
  // consumers snapshot it. See lib/lan-trust-script.js for its authenticated
  // gateway boundary; no separate legacy settings client is loaded.
  const randomUUIDScript = '<script>'
    + 'window.__dshAuthGatewayBasePath__=' + JSON.stringify(gateway.basePath) + ';'
    + 'if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {'
    + 'crypto.randomUUID = function () {'
    + 'var b = crypto.getRandomValues(new Uint8Array(16));'
    + 'b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;'
    + 'var h = "";'
    + 'for (var i = 0; i < 16; i++) h += (i === 4 || i === 6 || i === 8 || i === 10 ? "-" : "") + b[i].toString(16).padStart(2, "0");'
    + 'return h;'
    + '};'
    + '}'
    + '</script>'

  ctx.effect(() => ctx.webServer.tapIndex((html) => {
    const withPolyfill = html.replace('<head>', `<head>${randomUUIDScript}`)
    // The LAN trust script must run AFTER the loader bootstrap has defined
    // `window.__ModuleLoader__` (queue mode) but before any bundle registers.
    // dsh's index defines it inline (window.__ModuleLoader__={...}); insert
    // right after that script tag, falling back to the end of <head>.
    const marker = 'window.__ModuleLoader__='
    const loaderStart = withPolyfill.indexOf(marker)
    const loaderEnd = loaderStart === -1 ? -1 : withPolyfill.indexOf('</script>', loaderStart)
    if (loaderStart === -1 || loaderEnd === -1) {
      // No recognizable loader bootstrap — still inject at <head> end so the
      // polyfill works; the LAN trust guard degrades silently.
      return withPolyfill.replace('</head>', `${buildLanTrustScript()}</head>`)
    }
    const insertAt = loaderEnd + '</script>'.length
    return withPolyfill.slice(0, insertAt) + buildLanTrustScript() + withPolyfill.slice(insertAt)
  }), 'dsh-auth-gateway: randomUUID + basePath global + LAN trust bootstrap')

  // Safety net: the whole design assumes the internal webserver is loopback-only.
  // The bundle patch enforces it, but a manual composition may forget.
  if (ctx.webServer.host !== '127.0.0.1') {
    ctx.logger.warn(
      '[dsh-lifecycle] webServer is listening on %s; the internal port stays reachable '
      + 'outside this machine. The bundle patch sets host 127.0.0.1 — verify your composition.',
      ctx.webServer.host,
    )
  }

  gateway.onError = (err) => {
    ctx.logger.warn('[dsh-lifecycle] %s', err instanceof Error ? err.message : String(err))
  }

  // Deployment-configuration warnings (e.g. forced cookieSecure over a
  // plain-HTTP link) go to the CONSOLE as well as the logger: ctx.logger is
  // buffer-only in the current dsh runtime (the built-in exporter keeps the
  // last 1000 records in memory), and a headless LAN box has no panel open
  // to explain why logins "succeed" but hold no session.
  gateway.onConfigWarning = (err) => {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(message)
    ctx.logger.warn('[dsh-lifecycle] %s', message)
  }

  // Durable audit trail. ctx.logger is buffer-only in the current dsh runtime
  // (its built-in exporter keeps the last 1000 records in memory), so auth
  // events and brute-force alerts are additionally appended as JSONL to
  // $DSH_HOME/auth-gateway/log/audit.log — the persistent, greppable record.
  // Daily rotation, 90-day retention; write failures degrade to a warn line
  // and never touch the auth flow (see lib/audit-log.js).
  const auditLog = new AuditLogWriter({
    onError: (err) => {
      const suppressed = err.suppressed > 0 ? `（已抑制 ${err.suppressed} 条重复告警）` : ''
      ctx.logger.warn('[dsh-lifecycle] 审计日志写入失败%s: %s', suppressed, err.message)
    },
    onRecover: () => {
      ctx.logger.info('[dsh-lifecycle] 审计日志写入已恢复')
    },
    onMigrate: (line) => {
      // Pre-0.5.1 audit files found at the credential-dir root were folded
      // into log/ so the trail stays continuous across upgrades.
      ctx.logger.info('[dsh-lifecycle] 审计日志迁移: %s', line)
    },
  })
  auditLog.open()

  // Brute-force alerts, through dsh's official channels only: a Host log
  // line plus a Cordis event (`dsh-auth-gateway/brute-force`) any plugin
  // can listen to. No DOM/UI poking — surfacing this in the GUI would be a
  // client-plugin slot registration (out of scope for the host-only plugin).
  gateway.onSecurityEvent = (payload) => {
    ctx.logger.warn('[dsh-lifecycle] 疑似暴力破解: %s', JSON.stringify(payload))
    ctx.emit('dsh-auth-gateway/brute-force', payload)
    // Same alert lands in the file trail. sourceAddress is absent for the
    // process-wide `global-rate-limit` event; the writer omits undefined
    // fields, so the line carries only what the payload had.
    auditLog.append({
      kind: payload.kind,
      ip: payload.sourceAddress,
      limit: payload.limit,
      windowSeconds: payload.windowSeconds,
      maxFailures: payload.maxFailures,
      lockedUntil: payload.lockedUntil,
    })
  }

  // Auth audit: login success/failure, logout and password change go to the
  // host log at info level and to the audit.log file sink. Payloads carry
  // only {kind, ip, reason?} — never credentials, OTP codes or session tokens.
  gateway.onAuthEvent = (payload) => {
    const { kind, ip, reason } = payload
    const detail = reason === undefined ? '' : ` reason=${reason}`
    const label = {
      'login-success': '登录成功',
      'login-failed': '登录失败',
      'logout': '登出',
      'password-change': '修改密码成功',
      'password-change-failed': '修改密码失败',
      'otp-enabled': '启用 OTP 成功',
      'otp-enable-failed': '启用 OTP 失败',
      'otp-disabled': '禁用 OTP 成功',
      'otp-disable-failed': '禁用 OTP 失败',
    }[kind] ?? kind
    ctx.logger.info('[dsh-lifecycle] %s ip=%s%s', label, ip, detail)
    auditLog.append(payload)
  }

  // Complete first-run state before listening. Legacy unclaimed credentials
  // have no recoverable plaintext and are rotated for the setup-page flow.
  if (!hasPassword() || isInitialPassword() && !readInitialPassword()) {
    const initial = generateInitialPassword()
    await setPassword(initial, { initial: true })
  }
  await gateway.start()
  console.log('[dsh-lifecycle] 登录验证已启用：安装后请务必刷新页面进入登录或首次设置。旧页面收到 HTTP 401 不代表服务无法连接。初始密码仅在首次设置页展示，不在终端打印。')

  ctx.effect(() => async () => {
    await gateway.close()
    // Graceful shutdown drains in-flight audit writes; a hard crash can
    // still lose the single line that was being written.
    await auditLog.flush()
  }, 'dsh-auth-gateway: gateway listen')

  // The real URL line. dsh's own line prints the INTERNAL webserver address
  // (loopback-only by design), which would mislead; this one names the
  // gateway — the address everyone should open. An operator-declared
  // `--public-url` wins: it is the canonical external root, and it is also
  // what dsh feeds into its runtime context and DSH_WEB_URL, so the console
  // must not disagree with them. LAN hints only when the gateway actually
  // listens on all interfaces.
  const declaredUrl = ctx.get('webStartup')?.publicUrl
  const localUrl = `http://127.0.0.1:${gateway.listenPort}`
  const lan = lanAddresses()
  const lanHint = gateway.listenHost === '0.0.0.0' && lan.length > 0
    ? ` (LAN: http://${lan[0]}:${gateway.listenPort})`
    : ''
  console.log(`dsh web: ${declaredUrl ?? localUrl}${lanHint}`)
  ctx.logger.info('[dsh-lifecycle] gateway listening on http://%s:%s -> http://%s:%s',
    gateway.listenHost, gateway.listenPort, gateway.upstreamHost, gateway.upstreamPort)

  // Log the actual OTP state once the gateway is serving.
  try {
    if (hasOTP() && getOTPStatus().enabled) {
      ctx.logger.info('[dsh-lifecycle] OTP 已绑定，当前采用%s验证', readLifecyclePolicy().twoFactor ? '两步' : '单步')
    }
  } catch (err) {
    // A corrupt OTP record fails loud at request time (mapped to a JSON
    // error); it must not take the whole plugin down over a log line.
    ctx.logger.warn('[dsh-lifecycle] 读取 OTP 状态失败: %s',
      err instanceof Error ? err.message : String(err))
  }
}

export default { name, inject, apply, Config }
