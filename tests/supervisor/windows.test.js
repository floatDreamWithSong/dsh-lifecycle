import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { windowsArguments, windowsTaskXml, windowsSystemTool, windowsPortsClosed } from '../../src/supervisor/windows.js';

test('native Windows arguments preserve empty values, quotes and trailing backslashes', () => {
  assert.equal(windowsArguments(['', 'a b', 'x"y', 'C:\\folder\\']), '"" "a b" "x\\"y" "C:\\folder\\\\"');
  assert.throws(() => windowsArguments(['bad\0argument']), /Invalid/);
});

test('Windows tasks use the interactive user, escape XML and never use a command shell', () => {
  const xml = windowsTaskXml({ sid: 'S-1-5-21-123-456-789-1001', command: ['C:\\Program Files\\nodejs\\node.exe', 'C:\\研发 & tools\\cli.js', 'a"b'], cwd: 'C:\\研发 & tools' });
  assert.match(xml, /<LogonType>InteractiveToken<\/LogonType>/);
  assert.match(xml, /<RunLevel>LeastPrivilege<\/RunLevel>/);
  assert.match(xml, /研发 &amp; tools/);
  assert.match(xml, /&quot;/);
  assert.doesNotMatch(xml, /Password|HighestAvailable|cmd\.exe|powershell|RestartOnFailure/);
  assert.match(xml, /per-user background service/);
  assert.match(windowsTaskXml({ sid: 'S-1-5-21-1', command: ['C:\\node.exe'], cwd: 'C:\\data', keepAlive: true }), /RestartOnFailure/);
  assert.throws(() => windowsTaskXml({ sid: '<bad>', command: ['node'], cwd: 'relative' }), /Invalid/);
});

test('Windows system tools resolve to explicit system paths from a fixed allowlist', () => {
  assert.equal(windowsSystemTool('schtasks.exe', 'C:\\Windows'), 'C:\\Windows\\System32\\schtasks.exe');
  assert.throws(() => windowsSystemTool('cmd.exe', 'C:\\Windows'), /Invalid/);
});

test('Windows stop detection checks real listeners instead of assuming End completed', async t => {
  const server = net.createServer(socket => socket.destroy());
  server.listen(0, '127.0.0.1');await once(server, 'listening');
  t.after(() => server.close());
  assert.equal(await windowsPortsClosed('http://127.0.0.1:' + server.address().port + '/login'), false);
  await assert.rejects(windowsPortsClosed('http://example.com:3080/login'), /Invalid/);
});
