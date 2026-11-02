import path from 'node:path';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { dshHome, credentialDir } from './paths.js';
import { readDurableJson, writeDurableJson } from './durable-json.js';

/** Lifecycle state is separate from the compatible upstream credential directory. */
export function lifecyclePath(name) { return path.join(dshHome(), 'lifecycle', name); }

/** Preserve existing OTP enforcement on migration; a new installation starts password-only. */
export function readLifecyclePolicy() {
  const stored = readDurableJson(lifecyclePath('policy.json'));
  if (stored) {
    if (stored.version !== 1 || typeof stored.twoFactor !== 'boolean' || typeof stored.publicOrigin !== 'string') throw new Error('Invalid lifecycle security policy');
    return stored;
  }
  const otp = readDurableJson(path.join(credentialDir(), 'otp.json'));
  return { version: 1, twoFactor: otp?.enabled === true, publicOrigin: '' };
}

/** Materialize the migrated mode once so enrolling OTP does not silently change that mode. */
export function initializeLifecyclePolicy() {
  if (!readDurableJson(lifecyclePath('policy.json'))) saveLifecyclePolicy(readLifecyclePolicy());
}

/** Persist an explicitly chosen factor policy. Callers must verify Admin and enrolled factors. */
export function saveLifecyclePolicy(policy) {
  let publicOrigin = '';
  if (policy.publicOrigin) {
    const url = new URL(policy.publicOrigin);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) || isIP(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Passkey 需要 HTTPS 域名；本地测试可用 http://localhost');
    publicOrigin = url.origin;
  }
  if (typeof policy.twoFactor !== 'boolean') throw new Error('Invalid verification policy');
  const value = { version: 1, twoFactor: policy.twoFactor, publicOrigin };
  writeDurableJson(lifecyclePath('policy.json'), value);return value;
}

/** Bind restored sessions to password/factor configuration without using DSH startup secrets. */
export function credentialFingerprint() {
  const password = readDurableJson(path.join(credentialDir(), 'password.json'));
  const otp = readDurableJson(path.join(credentialDir(), 'otp.json'));
  const passkeys = readDurableJson(lifecyclePath('passkeys.json'));
  return createHash('sha256').update(JSON.stringify({ password: password && [password.salt, password.hash, password.initial],
    otp: otp && [otp.secret, otp.enabled], policy: readLifecyclePolicy(),
    passkeys: passkeys?.credentials?.map(c => [c.id, c.publicKey]) || [] })).digest('hex');
}
