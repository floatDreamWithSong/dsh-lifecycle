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
