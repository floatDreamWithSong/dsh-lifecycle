import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowsControlTarget, authorizedWindowsControl } from '../../src/utils/windows-control.js';

test('Windows uses a private random pipe and requires a full controller credential', () => {
  const config = { backend: 'windows', socket: '\\\\.\\pipe\\dsh-lifecycle-12345678-1234-1234-1234-123456789abc', controlToken: 'ab'.repeat(32) };
  assert.deepEqual(windowsControlTarget(config), { socketPath: config.socket, headers: { 'X-DSH-Controller-Token': config.controlToken } });
  assert.equal(authorizedWindowsControl(undefined, config.controlToken), false);
  assert.equal(authorizedWindowsControl('short', config.controlToken), false);
  assert.equal(authorizedWindowsControl('cd'.repeat(32), config.controlToken), false);
  assert.equal(authorizedWindowsControl(config.controlToken, config.controlToken), true);
  assert.throws(() => windowsControlTarget({ ...config, socket: 'http://example.com' }), /Invalid/);
  assert.throws(() => windowsControlTarget({ ...config, controlToken: 'short' }), /Invalid/);
});
