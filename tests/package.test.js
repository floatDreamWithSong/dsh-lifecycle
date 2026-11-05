import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test('GitHub installs contain every public entry and the Windows installer artifacts without a build', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const files = [...Object.values(manifest.exports), './dist/supervisor.js', './dist/windows.js', './dist/windows-env.mjs', './dist/windows-task.ps1', './dist/login.js', './dist/login.css', './dist/wallpaper-v1.png'];
  const tracked = new Set(execFileSync('git', ['ls-files'], { encoding: 'utf8', windowsHide: true }).split(/\r?\n/));
  for (const file of files) {
    assert.ok(existsSync(file), `Missing distribution file: ${file}`);
    assert.ok(tracked.has(file.replace(/^\.\//, '')), `GitHub install omits ${file}`);
  }
});
