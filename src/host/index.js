import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { authorizedAction, trustedTransport } from './security.js';
import { json, readJson } from '../utils/http.js';

export const name = 'dsh-lifecycle-power';
export const inject = ['webServer'];
const BASE = '/api/dsh-lifecycle/power';

/** Forward a fixed operation to the independently managed Unix socket service. */
export function controlRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath: process.env.DSH_LIFECYCLE_SOCKET || '/run/dsh-lifecycle/control.sock', path, method,
      headers: { 'Content-Type': 'application/json' }, timeout: 12000 }, async res => {
      try {
        const data = await readJson(res);
        if (res.statusCode >= 400) throw new Error(data.error || `Supervisor HTTP ${res.statusCode}`);
        resolve(data);
      } catch (error) { reject(error); }
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Power supervisor timed out')));
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

/** Mount the DSH host routes. No child process is used to relaunch this host. */
export function apply(ctx) {
  const instanceId = randomUUID();
  const csrf = randomUUID();
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix', path: BASE,
    handler: async (req, res) => {
      // This handler is an HTTP boundary: report errors instead of dropping the connection.
      try {
        if (!trustedTransport(req)) return json(res, 403, { error: 'Untrusted transport' });
        const path = new URL(req.url, 'http://localhost').pathname;
        if (path === BASE + '/session' && req.method === 'GET') {
          // Action credentials are local metadata; never wait for a version check.
          return json(res, 200, { instanceId, csrf });
        }
        if (path === BASE + '/health' && req.method === 'GET') {
          const health = await controlRequest('GET', '/health');
          return json(res, 200, { ...health, instanceId });
        }
        if (path === BASE + '/status' && req.method === 'GET') {
          const status = await controlRequest('GET', '/status');
          return json(res, 200, { ...status, instanceId, csrf });
        }
        if (path === BASE + '/refresh' && req.method === 'POST') {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: 'Invalid CSRF token' });
          const status = await controlRequest('POST', '/refresh', {});
          return json(res, 200, { ...status, instanceId, csrf });
        }
        if (path === BASE + '/action' && req.method === 'POST') {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: 'Invalid CSRF token' });
          const body = await readJson(req);
          if (!['restart', 'shutdown', 'update'].includes(body.action)) return json(res, 400, { error: 'Unknown power action' });
          if (body.action === 'shutdown' && body.confirm !== 'shutdown') return json(res, 400, { error: 'Shutdown confirmation required' });
          const operation = await controlRequest('POST', '/action', { action: body.action, target: body.target });
          return json(res, 202, operation);
        }
        json(res, 404, { error: 'Unknown endpoint' });
      } catch (error) {
        ctx.logger?.warn('Power request failed: %s', error.message);
        json(res, 503, { error: error.message });
      }
    },
  }));
}
