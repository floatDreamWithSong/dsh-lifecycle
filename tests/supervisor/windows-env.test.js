import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

test('Windows preload resolves adjacent config and restores the configured Harness environment', { skip: process.platform !== 'win32' }, t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'lifecycle-env-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const preload = path.join(root, 'windows-env.mjs');
  copyFileSync(new URL('../../dist/windows-env.mjs', import.meta.url), preload);
  writeFileSync(path.join(root, 'config.json'), JSON.stringify({ backend: 'windows', environment: { DSH_HOME: root } }));
  const env = { ...process.env };delete env.DSH_LIFECYCLE_CONFIG;
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, '-e', 'console.log(JSON.stringify({home:process.env.DSH_HOME,config:process.env.DSH_LIFECYCLE_CONFIG}));'], { env, encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { home: root, config: path.join(root, 'config.json') });
});
