import { test } from 'node:test';
import assert from 'node:assert/strict';
import { powerPaths } from '../../src/utils/power-paths.js';

test('macOS uses a per-user controller socket while Linux retains its existing paths', () => {
  assert.equal(powerPaths('darwin', '/Users/example').socket, '/Users/example/Library/Application Support/dsh-lifecycle/control.sock');
  assert.equal(powerPaths('linux', '/home/example').socket, '/run/dsh-lifecycle/control.sock');
  assert.equal(powerPaths('linux', '/home/example').config, '/etc/dsh-lifecycle/config.json');
});

test('Windows stores controller data in the desktop user profile rather than /etc', () => {
  const paths = powerPaths('win32', 'C:\\Users\\Example', 'C:\\Users\\Example\\AppData\\Local');
  assert.equal(paths.root, 'C:\\Users\\Example\\AppData\\Local\\dsh-lifecycle');
  assert.equal(paths.config, 'C:\\Users\\Example\\AppData\\Local\\dsh-lifecycle\\config.json');
  assert.equal(paths.socket, undefined, 'Windows must read its private, random pipe name from config');
});
