import { test } from 'node:test';
import assert from 'node:assert/strict';
import { powerPaths } from '../../src/utils/power-paths.js';

test('macOS uses a per-user controller socket while Linux retains its existing paths', () => {
  assert.equal(powerPaths('darwin', '/Users/example').socket, '/Users/example/Library/Application Support/dsh-lifecycle/control.sock');
  assert.equal(powerPaths('linux', '/home/example').socket, '/run/dsh-lifecycle/control.sock');
  assert.equal(powerPaths('linux', '/home/example').config, '/etc/dsh-lifecycle/config.json');
});
