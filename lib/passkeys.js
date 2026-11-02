import { randomBytes } from 'node:crypto';
import { readDurableJson, writeDurableJson } from './durable-json.js';
import { lifecyclePath } from './lifecycle-policy.js';

/** Read the one Admin account's WebAuthn credentials; only public keys are stored. */
export function passkeyStore() {
  const stored = readDurableJson(lifecyclePath('passkeys.json'));
  if (stored && (stored.version !== 1 || !Array.isArray(stored.credentials))) throw new Error('Invalid passkey store');
  return stored || { version: 1, userID: randomBytes(32).toString('base64url'), credentials: [] };
}

/** Atomically persist authenticator counters and credential enrollment changes. */
export function savePasskeys(value) { writeDurableJson(lifecyclePath('passkeys.json'), value); }
