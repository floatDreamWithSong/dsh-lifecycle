import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { tokenFromCookieHeader, sessionCookie, expiredCookie } from './auth.js';
import { isInitialPassword, readInitialPassword, verifyPassword, setPassword } from './store.js';
import { hasOTP, getOTPStatus, getOTPSecret, verifyAndUseBackupCode } from './otp-store.js';
import { validatePasswordStrength } from './policy.js';
import { readLifecyclePolicy, saveLifecyclePolicy } from './lifecycle-policy.js';
import { passkeyStore, savePasskeys } from './passkeys.js';
import { lifecyclePageHtml } from './lifecycle-page.js';
import { wallpaperLibrary, wallpaperImage, addWallpaper, selectWallpaper, deleteWallpaper, MAX_WALLPAPER_BYTES } from './wallpapers.js';

const loginScript = () => readFileSync(new URL('../dist/login.js', import.meta.url));
const wallpaper = () => readFileSync(new URL('../dist/wallpaper-v1.png', import.meta.url));
const loginStyle = () => readFileSync(new URL('../dist/login.css', import.meta.url));

/** Own the Admin lock-screen, enrollment and authentication protocol. */
export function createLifecycleRoutes(gateway, priv) {
  const preauth = new Map();
  const { json, readJson, secureCookie, verifyOtp, authEvent } = priv;
  const otpBound = () => hasOTP() && getOTPStatus().enabled;
  const address = req => req.socket.remoteAddress || 'unknown';
  const cookie = req => tokenFromCookieHeader(req.headers.cookie);
  const full = req => gateway.sessions.isValid(cookie(req)) && !gateway.sessions.isNeedsOnboarding(cookie(req))
    && (!readLifecyclePolicy().twoFactor || gateway.sessions.isOTPVerified(cookie(req)));
  const jsonError = (res, status, error) => json(res, status, { ok: false, error });
  const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

  function challenge(req, res, create = false) {
    const raw = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('dsh_lifecycle_flow='))?.slice(19);
    let entry = raw && preauth.get(raw);
    if (entry && entry.expiresAt > Date.now()) return entry;
    if (!create) return null;
    for (const [key, value] of preauth) if (value.expiresAt <= Date.now()) preauth.delete(key);
    if (preauth.size >= 256) preauth.delete(preauth.keys().next().value);
    const id = randomBytes(24).toString('hex');
    entry = { csrf: randomBytes(24).toString('hex'), expiresAt: Date.now() + 1800000 };
    preauth.set(id, entry);
    res.setHeader('Set-Cookie', `dsh_lifecycle_flow=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800${secureCookie(req) ? '; Secure' : ''}`);
    return entry;
  }

  function verifyCsrf(req, res) {
    const entry = challenge(req, res);
    if (!equal(entry?.csrf, req.headers['x-lifecycle-csrf'])) { jsonError(res, 403, '页面验证已过期，请刷新后重试');return null; }
    return entry;
  }

  function requireAdmin(req, res, onboarding = false) {
    if (full(req) || onboarding && gateway.sessions.isValid(cookie(req)) && (!readLifecyclePolicy().twoFactor || gateway.sessions.isOTPVerified(cookie(req)))) return true;
    jsonError(res, 401, '请先完成 Admin 身份验证');return false;
  }

  async function reauthenticate(req, body) {
    const session = gateway.sessions.sessions.get(gateway.sessions.key(cookie(req)));
    if (session && ['otp', 'passkey', 'backup'].includes(session.method) && session.verifiedAt > Date.now() - 300000) return true;
    return typeof body.password === 'string' && await verifyPassword(body.password);
  }

  function budget(req, factor = false) {
    const now = Date.now(), ip = address(req);
    // The OTP limiter already consumes the global budget; never count it twice.
    return !(gateway.attempts.get(ip)?.lockedUntil > now) && (factor
      ? gateway.rateLimit.otpVerifyAllowed(ip, now) : gateway.rateLimit.globalAuthAllowed(now));
  }

  function failure(req, res, message = '密码或验证码不正确') {
    gateway.rateLimit.recordFailure(address(req), Date.now());authEvent('login-failed', address(req), 'lifecycle-invalid-credentials');
    return jsonError(res, 401, message);
  }

  function issue(req, res, method, { pending = false } = {}) {
    const token = gateway.sessions.issue();
    const entry = gateway.sessions.sessions.get(gateway.sessions.key(token));
    entry.method = method;entry.verifiedAt = Date.now();
    if (pending) { entry.passwordVerifiedUntil = Date.now() + 300000;entry.expiresAt = entry.passwordVerifiedUntil; }
    else gateway.sessions.markOTPVerified(token);
    if (isInitialPassword()) gateway.sessions.markNeedsOnboarding(token);
    if (!pending) { gateway.attempts.delete(address(req));authEvent('login-success', address(req), method); }
    json(res, 200, { ok: true, stage: pending ? 'factor' : isInitialPassword() ? 'setup' : 'done', next: isInitialPassword() ? gateway.basePath + '/onboarding' : gateway.basePath + '/' }, sessionCookie(token, secureCookie(req)));
  }

  function pendingPassword(req) {
    const entry = gateway.sessions.sessions.get(gateway.sessions.key(cookie(req)));
    return gateway.sessions.isValid(cookie(req)) && entry.passwordVerifiedUntil > Date.now();
  }

  function completeFactor(req, res, method) {
    gateway.sessions.revoke(cookie(req));
    return issue(req, res, method);
  }

  function passkeyOrigin(req) {
    const policy = readLifecyclePolicy();
    if (!policy.publicOrigin) throw new Error('请先配置稳定的 HTTPS 域名，再启用 Passkey');
    if (req.headers.origin !== policy.publicOrigin) throw new Error('请通过配置的 Passkey 域名访问');
    return { origin: policy.publicOrigin, rpID: new URL(policy.publicOrigin).hostname };
  }

  /** Public, non-secret capability state and a browser-bound CSRF challenge. */
  function state(req, res) {
    const entry = challenge(req, res, true), policy = readLifecyclePolicy();
    const stored = passkeyStore();
    json(res, 200, { ok: true, csrf: entry.csrf, initialized: !isInitialPassword(), authenticated: full(req),
      pendingFactor: pendingPassword(req) && !gateway.sessions.isOTPVerified(cookie(req)),
      needsPasswordChange: gateway.sessions.isValid(cookie(req)) && gateway.sessions.isNeedsOnboarding(cookie(req)),
      twoFactor: policy.twoFactor, otp: otpBound(), passkey: stored.credentials.length > 0,
      publicOrigin: policy.publicOrigin, currentHost: req.headers.host,
      methods: { password: true, otp: otpBound() && !policy.twoFactor, passkey: stored.credentials.length > 0 && !policy.twoFactor } });
  }

  /** Render one self-contained lifecycle page with no externally loaded assets. */
  function servePage(req, res, view = 'login') {
    if (view === 'security' && !full(req)) { res.writeHead(302, { location: gateway.basePath + '/login' });res.end();return; }
    if (view === 'login' && full(req)) { res.writeHead(302, { location: gateway.basePath + '/' });res.end();return; }
    const nonce = randomBytes(18).toString('base64');
    const html = lifecyclePageHtml({ view: view === 'login' && isInitialPassword() ? 'setup' : view, basePath: gateway.basePath, nonce });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });res.end(html);
  }

  /** Dispatch the explicitly enumerated lifecycle surface before upstream forwarding. */
  async function handle(req, res, pathname) {
    const legacyOTP = pathname.startsWith('/otp/');
    if (!pathname.startsWith('/lifecycle/') && !legacyOTP) return false;
    if (legacyOTP) {
      if (req.method !== 'POST') return false;
      if (!verifyCsrf(req, res)) return true;
      if (pathname !== '/otp/enable') return false;
    }
    if (req.method === 'GET') {
      if (pathname === '/lifecycle/wallpaper/current' || pathname.startsWith('/lifecycle/wallpapers/image/')) {
        const current = pathname === '/lifecycle/wallpaper/current';
        if (!current && !requireAdmin(req, res)) return true;
        const id = current ? wallpaperLibrary().selected : pathname.slice('/lifecycle/wallpapers/image/'.length);
        const image = id ? wallpaperImage(id) : { bytes: wallpaper(), mime: 'image/png' };
        if (!image) { jsonError(res,404,'壁纸不存在');return true; }
        res.writeHead(200,{'Content-Type':image.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(image.bytes);return true;
      }
      if (pathname === '/lifecycle/wallpapers') {
        if (requireAdmin(req,res)) json(res,200,{ok:true,...wallpaperLibrary()});return true;
      }
      if (pathname === '/lifecycle/assets/wallpaper-v1.png') {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });res.end(wallpaper());return true;
      }
      if (pathname === '/lifecycle/assets/login.js' || pathname === '/lifecycle/assets/login.css') {
        res.writeHead(200, { 'Content-Type': pathname.endsWith('.js') ? 'application/javascript' : 'text/css', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(pathname.endsWith('.js') ? loginScript() : loginStyle());return true;
      }
      if (pathname === '/lifecycle/state') { state(req, res);return true; }
      if (pathname === '/lifecycle/security') { servePage(req, res, 'security');return true; }
      if (pathname === '/lifecycle/security/state') {
        if (requireAdmin(req, res)) json(res, 200, { ok: true, ...readLifecyclePolicy(), otp: getOTPStatus(),
          activeSessions: [...gateway.sessions.sessions.values()].filter(s => s.expiresAt > Date.now() && gateway.sessions.canPersist(s)).length,
          passkeys: passkeyStore().credentials.map(c => ({ id: c.id, name: c.name, createdAt: c.createdAt })) });return true;
      }
      jsonError(res, 404, '未知页面');return true;
    }
    if (req.method !== 'POST') { jsonError(res, 405, '不支持的请求');return true; }
    const entry = verifyCsrf(req, res);if (!entry) return true;
    if (pathname === '/lifecycle/bootstrap') {
      const initialPassword = readInitialPassword();
      if (!initialPassword) { jsonError(res, 410, '初始密码已失效，请使用你设置的密码登录');return true; }
      json(res, 200, { ok: true, initialPassword });return true;
    }
    if (pathname === '/lifecycle/wallpapers/upload') {
      if (!requireAdmin(req,res)) return true;
      const bytes = await new Promise((resolve,reject) => {
        const chunks=[];let size=0, exceeded=false;
        req.on('data',chunk=>{
          size+=chunk.length;
          if (size>MAX_WALLPAPER_BYTES) {
            if (!exceeded) { exceeded=true;chunks.length=0;jsonError(res,413,'图片不能超过 5 MB');resolve(null); }
          } else if (!exceeded) chunks.push(chunk);
        });
        req.on('end',()=>{if(!exceeded)resolve(Buffer.concat(chunks));});req.on('error',reject);
      });
      if (!bytes) return true;
      try {
        const item=addWallpaper(bytes,new URL(req.url,'http://localhost').searchParams.get('name'),req.headers['content-type']);
        json(res,201,{ok:true,item});
      } catch(error) { if (!(error instanceof TypeError || error instanceof RangeError)) throw error;jsonError(res,400,error.message); }
      return true;
    }
    if (!req.headers['content-type']?.startsWith('application/json')) { jsonError(res, 415, '请求必须为 JSON');return true; }
    const body = await readJson(req, res);if (body === undefined) return true;
    if (pathname === '/lifecycle/wallpapers/select' || pathname === '/lifecycle/wallpapers/delete') {
      if (!requireAdmin(req,res)) return true;
      try {
        if(pathname.endsWith('/select'))selectWallpaper(body.id);else deleteWallpaper(body.id);
        json(res,200,{ok:true});
      } catch(error) { if (!(error instanceof TypeError)) throw error;jsonError(res,400,error.message); }
      return true;
    }

    if (pathname === '/otp/enable') {
      if (!requireAdmin(req, res)) return true;
      if (!budget(req)) { jsonError(res, 429, '尝试次数过多');return true; }
      if (!await reauthenticate(req, body)) { failure(req, res);return true; }
      await gateway.otpRoutes.handleEnable(req, res);return true;
    }

    if (pathname === '/lifecycle/lock') {
      gateway.sessions.revoke(cookie(req));authEvent('logout', address(req), 'lock');json(res, 200, { ok: true }, expiredCookie(secureCookie(req)));return true;
    }
    if (pathname === '/lifecycle/login') {
      if (!budget(req, body.method !== 'password')) { jsonError(res, 429, '尝试次数过多，请稍后再试');return true; }
      const policy = readLifecyclePolicy();
      if (body.method === 'password') {
        if (typeof body.password !== 'string' || !await verifyPassword(body.password)) { failure(req, res);return true; }
        issue(req, res, 'password', { pending: policy.twoFactor });return true;
      }
      if (!otpBound() || policy.twoFactor && !pendingPassword(req)) { failure(req, res);return true; }
      const valid = body.method === 'backup' ? typeof body.code === 'string' && await verifyAndUseBackupCode(body.code)
        : body.method === 'otp' && typeof body.code === 'string' && verifyOtp(getOTPSecret(), body.code, address(req));
      if (!valid) {
        if (body.method === 'otp' && typeof body.code === 'string') { authEvent('login-failed', address(req), 'invalid-otp');jsonError(res, 401, '验证码不正确'); }
        else failure(req, res);
        return true;
      }
      if (policy.twoFactor) completeFactor(req, res, body.method);else issue(req, res, body.method);return true;
    }
    if (pathname === '/lifecycle/password') {
      if (!requireAdmin(req, res, true)) return true;
      if (!budget(req)) { jsonError(res, 429, '尝试次数过多');return true; }
      if (!await reauthenticate(req, body)) { failure(req, res);return true; }
      const strength = validatePasswordStrength(body.newPassword, gateway.policy);
      if (!strength.ok) { jsonError(res, 400, '新密码至少 8 位，并包含大小写字母或特殊字符');return true; }
      if (isInitialPassword() && await verifyPassword(body.newPassword)) { jsonError(res, 400, '新密码必须不同于页面公开的初始密码');return true; }
      await setPassword(body.newPassword);gateway.sessions.revokeAll();issue(req, res, 'password');return true;
    }
    if (pathname === '/lifecycle/security/policy') {
      if (!requireAdmin(req, res)) return true;
      if (!budget(req)) { jsonError(res, 429, '尝试次数过多');return true; }
      if (!await reauthenticate(req, body)) { failure(req, res);return true; }
      if (body.twoFactor && !otpBound() && passkeyStore().credentials.length === 0) { jsonError(res, 400, '请先绑定 OTP 或 Passkey，再开启两步验证');return true; }
      if (body.publicOrigin !== readLifecyclePolicy().publicOrigin && passkeyStore().credentials.length > 0) { jsonError(res, 400, '更换 Passkey 域名前，请先移除旧域名的 Passkey');return true; }
      try { saveLifecyclePolicy(body); }
      catch (error) {
        if (error.code && error.code !== 'ERR_INVALID_URL') throw error;
        jsonError(res, 400, error.message);return true;
      }
      gateway.sessions.revokeAll();json(res, 200, { ok: true, next: gateway.basePath + '/login' }, expiredCookie(secureCookie(req)));return true;
    }
    if (pathname === '/lifecycle/sessions/others') {
      if (!requireAdmin(req, res)) return true;
      const current = gateway.sessions.key(cookie(req));
      for (const hash of gateway.sessions.sessions.keys()) if (hash !== current) gateway.sessions.revokeHash(hash);
      authEvent('sessions-revoked', address(req), 'other-devices');json(res, 200, { ok: true });return true;
    }
    if (pathname === '/lifecycle/passkeys/remove') {
      if (!requireAdmin(req, res)) return true;
      if (!budget(req)) { jsonError(res, 429, '尝试次数过多');return true; }
      if (!await reauthenticate(req, body)) { failure(req, res);return true; }
      const store = passkeyStore(), credentials = store.credentials.filter(c => c.id !== body.id);
      if (credentials.length === store.credentials.length) { jsonError(res, 404, 'Passkey 不存在');return true; }
      if (readLifecyclePolicy().twoFactor && credentials.length === 0 && !otpBound()) { jsonError(res, 400, '请先关闭两步验证，或绑定 OTP');return true; }
      store.credentials = credentials;savePasskeys(store);gateway.sessions.revokeAll();authEvent('passkey-removed', address(req), 'webauthn');json(res, 200, { ok: true }, expiredCookie(secureCookie(req)));return true;
    }
    if (pathname.startsWith('/lifecycle/passkeys/')) {
      if (!budget(req, pathname.endsWith('/auth/verify'))) { jsonError(res, 429, '尝试次数过多');return true; }
      const register = pathname.includes('/register/');
      if (register && !requireAdmin(req, res)) return true;
      if (register && pathname.endsWith('/options') && !await reauthenticate(req, body)) { failure(req, res);return true; }
      let binding;
      try { binding = passkeyOrigin(req); }
      catch (error) { if (!error.message.startsWith('请')) throw error;jsonError(res, 400, error.message);return true; }
      const { origin, rpID } = binding, store = passkeyStore();
      if (!register && readLifecyclePolicy().twoFactor && !pendingPassword(req)) { jsonError(res, 401, '请先验证密码');return true; }
      if (pathname.endsWith('/options')) {
        const options = register ? await generateRegistrationOptions({ rpName: 'DeepSeek Lifecycle', rpID, userName: 'Admin', userDisplayName: 'Admin', userID: Buffer.from(store.userID, 'base64url'),
          attestationType: 'none', excludeCredentials: store.credentials.map(c => ({ id: c.id, transports: c.transports })), authenticatorSelection: { residentKey: 'required', userVerification: 'required' } })
          : await generateAuthenticationOptions({ rpID, userVerification: 'required', allowCredentials: store.credentials.map(c => ({ id: c.id, transports: c.transports })) });
        entry.webauthn = { challenge: options.challenge, kind: register ? 'register' : 'auth', expiresAt: Date.now() + 300000 };
        if (register) savePasskeys(store);
        json(res, 200, { ok: true, options });return true;
      }
      if (!entry.webauthn || entry.webauthn.expiresAt <= Date.now() || entry.webauthn.kind !== (register ? 'register' : 'auth')) { jsonError(res, 400, 'Passkey 请求已过期，请重新开始');return true; }
      const challenge = entry.webauthn.challenge;delete entry.webauthn;
      if (register) {
        let result;
        try { result = await verifyRegistrationResponse({ response: body.response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true }); }
        catch { failure(req, res, 'Passkey 注册校验失败，请重新开始');return true; }
        if (!result.verified) { failure(req, res, 'Passkey 注册校验失败');return true; }
        const c = result.registrationInfo.credential;
        store.credentials.push({ id: c.id, publicKey: Buffer.from(c.publicKey).toString('base64url'), counter: c.counter, transports: c.transports || [], name: 'Admin Passkey', createdAt: Date.now() });
        savePasskeys(store);gateway.sessions.revokeAll();authEvent('passkey-enrolled', address(req), 'webauthn');json(res, 200, { ok: true }, expiredCookie(secureCookie(req)));return true;
      }
      const stored = store.credentials.find(c => c.id === body.response?.id);
      if (!stored) { failure(req, res);return true; }
      let result;
      try { result = await verifyAuthenticationResponse({ response: body.response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID,
        credential: { id: stored.id, publicKey: Buffer.from(stored.publicKey, 'base64url'), counter: stored.counter, transports: stored.transports }, requireUserVerification: true }); }
      catch { failure(req, res, 'Passkey 验证未通过，请重新开始');return true; }
      if (!result.verified) { failure(req, res);return true; }
      stored.counter = result.authenticationInfo.newCounter;savePasskeys(store);
      if (readLifecyclePolicy().twoFactor) completeFactor(req, res, 'passkey');else issue(req, res, 'passkey');return true;
    }
    jsonError(res, 404, '未知操作');return true;
  }
  function allowOtpDisable(req, res) {
    if (readLifecyclePolicy().twoFactor && passkeyStore().credentials.length === 0) { jsonError(res, 400, '请先切换为单步验证，或绑定另一种第二验证方式');return false; }
    return true;
  }
  return { handle, servePage, full, allowOtpDisable };
}
