import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizedAction, trustedTransport } from '../../src/host/security.js';
const request = headers => ({ socket: { remoteAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:3081', ...headers } });

test('rejects remote sockets and cross-origin requests even with the right token', () => {
  assert.equal(trustedTransport({ ...request({}), socket: { remoteAddress: '203.0.113.1' } }), false);
  assert.equal(authorizedAction(request({ origin: 'https://evil.test', 'content-type': 'application/json', 'x-dsh-power-token': 'secret' }), 'secret'), false);
  assert.equal(trustedTransport(request({ 'sec-fetch-site': 'cross-site' })), false);
});
test('requires explicit JSON and a constant-time comparable token', () => {
  assert.equal(authorizedAction(request({ 'content-type': 'application/json', 'x-dsh-power-token': 'secret' }), 'secret'), true);
  assert.equal(authorizedAction(request({ 'content-type': 'text/plain', 'x-dsh-power-token': 'secret' }), 'secret'), false);
  assert.equal(authorizedAction(request({ 'content-type': 'application/json', 'x-dsh-power-token': 'bad' }), 'secret'), false);
});
