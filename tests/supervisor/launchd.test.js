import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launchAgentPlist } from '../../src/supervisor/launchd.js';

test('LaunchAgents preserve argv boundaries and escape XML without enabling a shell', () => {
  const xml = launchAgentPlist({ label: 'net.example.harness', command: ['/node', '/project with spaces/cli.js', '<test>&"'], cwd: '/project', environment: { HOME: '/Users/example' }, log: '/private/log' });
  assert.match(xml, /<string>\/project with spaces\/cli.js<\/string>/);
  assert.match(xml, /&lt;test&gt;&amp;&quot;/);
  assert.match(xml, /<key>KeepAlive<\/key><false\/>/);
  assert.match(xml, /<key>Umask<\/key><integer>63<\/integer>/);
  assert.doesNotMatch(xml, /\/bin\/sh/);
});

test('only the independent controller is kept alive', () => {
  const xml = launchAgentPlist({ label: 'net.example.controller', command: ['/node'], cwd: '/project', environment: {}, log: '/private/log', keepAlive: true });
  assert.match(xml, /<key>KeepAlive<\/key><true\/>/);
});
