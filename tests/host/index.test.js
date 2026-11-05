import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { apply } from '../../src/host/index.js';

test('local session metadata is available without a supervisor or version registry', async t => {
  let handler;
  apply({ effect: install => install(), webServer: { register: route => { handler = route.handler; return () => {}; } } });
  const server = http.createServer((req, res) => handler(req, res));
  server.listen(0, '127.0.0.1');await once(server, 'listening');
  t.after(() => { server.closeAllConnections();server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api/dsh-lifecycle/power/session`;
  const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
  assert.equal(res.status, 200);
  const info = await res.json();assert.ok(info.instanceId);assert.ok(info.csrf);
  assert.equal('latest' in info, false);
});

test('missing Windows control offers page setup, while setup and takeover remain protected', { skip: process.platform !== 'win32' }, async t => {
  let handler;
  apply({ get: key => key === 'appExit' ? () => { throw new Error('Must not exit'); } : undefined,
    effect: install => install(), webServer: { port: 32988, register: route => { handler = route.handler;return () => {}; } } });
  const server = http.createServer((req, res) => handler(req, res));
  server.listen(0, '127.0.0.1');await once(server, 'listening');
  t.after(() => { server.closeAllConnections();server.close(); });
  const base = `http://127.0.0.1:${server.address().port}/api/dsh-lifecycle/power`;
  const status = await (await fetch(base + '/status')).json();
  assert.equal(status.installed, false);assert.equal(status.setupAvailable, true);
  const post = (route, body, token) => fetch(base + route, { method: 'POST', headers: {
    'Content-Type': 'application/json', ...(token ? { 'X-DSH-Power-Token': token } : {}),
  }, body: JSON.stringify(body) });
  assert.equal((await post('/setup', { confirm: 'enable-and-restart' })).status, 403);
  assert.equal((await post('/setup', {}, status.csrf)).status, 400);
  assert.equal((await post('/action', { action: 'takeover' }, status.csrf)).status, 400);
});
