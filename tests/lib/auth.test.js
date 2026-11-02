import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SessionStore } from '../../lib/auth.js';
import { setPassword } from '../../lib/store.js';
import { lifecyclePath, initializeLifecyclePolicy, saveLifecyclePolicy } from '../../lib/lifecycle-policy.js';

let home;
beforeEach(async () => { home = mkdtempSync(path.join(os.tmpdir(), 'lifecycle-auth-'));process.env.DSH_HOME = home;await setPassword('Test-Password-123!');initializeLifecyclePolicy(); });
afterEach(() => { delete process.env.DSH_HOME;rmSync(home, { recursive: true, force: true }); });

test('completed session survives a new store without persisting its bearer token', () => {
  const first = new SessionStore(), token = first.issue();first.markOTPVerified(token);first.flush();
  const disk = readFileSync(lifecyclePath('sessions.json'), 'utf8');
  assert.equal(disk.includes(token), false);assert.equal(disk.includes('tempOTP'), false);
  assert.equal(statSync(lifecyclePath('sessions.json')).mode & 0o777, 0o600);
  const restarted = new SessionStore();assert.equal(restarted.isValid(token), true);assert.equal(restarted.isOTPVerified(token), true);
});
test('initial-password and pending second-factor sessions never survive restart', () => {
  const store = new SessionStore({ canPersist: s => !s.needsOnboarding && s.otpVerified });
  const initial = store.issue();store.markNeedsOnboarding(initial);
  const pending = store.issue();store.setTempOTP(pending, 'private-otp-secret');store.flush();
  const restarted = new SessionStore();assert.equal(restarted.isValid(initial), false);assert.equal(restarted.isValid(pending), false);
  assert.equal(readFileSync(lifecyclePath('sessions.json'), 'utf8').includes('private-otp-secret'), false);
});
test('lock and password changes revoke sessions durably', async () => {
  const store = new SessionStore(), first = store.issue(), second = store.issue();store.flush();
  store.revoke(first);assert.equal(new SessionStore().isValid(first), false);assert.equal(new SessionStore().isValid(second), true);
  await setPassword('New-Password-456!');assert.equal(new SessionStore().isValid(second), false);
});
test('a factor-policy change invalidates persisted sessions even without a prior shutdown', () => {
  const store = new SessionStore(), token = store.issue();store.flush();
  saveLifecyclePolicy({ twoFactor: true, publicOrigin: '' });
  assert.equal(new SessionStore().isValid(token), false);
});
