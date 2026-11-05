import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setPassword, readInitialPassword, verifyPassword, passwordFilePath } from '../../lib/store.js';

test('only initial credentials remain displayable across restart and normal passwords are never stored in plaintext', async t => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'lifecycle-bootstrap-'));
  const previous = process.env.DSH_HOME;process.env.DSH_HOME = home;
  t.after(() => { if (previous === undefined) delete process.env.DSH_HOME;else process.env.DSH_HOME = previous;rmSync(home, { recursive: true, force: true }); });
  assert.equal(readInitialPassword(), null);
  await setPassword('Initial-Random-123!', { initial: true });
  assert.equal(readInitialPassword(), 'Initial-Random-123!');
  assert.equal(await verifyPassword(readInitialPassword()), true);
  await setPassword('Personal-New-456!');
  assert.equal(readInitialPassword(), null);
  const disk = readFileSync(passwordFilePath(), 'utf8');
  assert.equal(disk.includes('Personal-New-456!'), false);
  assert.equal(disk.includes('Initial-Random-123!'), false);
});
