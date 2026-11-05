import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { authorizedAction, trustedTransport } from './security.js';
import { json, readJson } from '../utils/http.js';
import { powerPaths } from '../utils/power-paths.js';
import { readFile } from 'node:fs/promises';
import { windowsControlTarget } from '../utils/windows-control.js';
import { controllerConfig, installWindowsControl } from './windows-setup.js';

export const name = 'dsh-lifecycle-power';
export const inject = ['webServer'];
const BASE = '/api/dsh-lifecycle/power';

/** Forward a fixed operation to the independent controller over its private socket or named pipe. */
export async function controlRequest(method, path, body, configFile) {
  const target = process.platform === 'win32'
    ? windowsControlTarget(JSON.parse(await readFile(configFile || process.env.DSH_LIFECYCLE_CONFIG || powerPaths().config, 'utf8')))
    : { socketPath: process.env.DSH_LIFECYCLE_SOCKET || powerPaths().socket, headers: {} };
  return new Promise((resolve, reject) => {
    const req = http.request({ ...target, path, method,
      headers: { 'Content-Type': 'application/json', ...target.headers }, timeout: 12000 }, async res => {
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
  const port = ctx.webServer.port - 1;
  const configFile = process.platform === 'win32' ? controllerConfig(port) : undefined;
  const control = (method, path, body) => controlRequest(method, path, body, configFile);
  const exit = ctx.get?.('appExit');
  const setupAvailable = process.platform === 'win32' && typeof exit === 'function' && Number.isInteger(port) && port > 0;
  let installing = false;
  let handoff = false;
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
          const health = await control('GET', '/health');
          return json(res, 200, { ...health, instanceId });
        }
        if (path === BASE + '/status' && req.method === 'GET') {
          try {
            const status = await control('GET', '/status');
            return json(res, 200, { ...status, installed: true, instanceId, csrf });
          } catch (error) {
            if (!['ENOENT', 'ECONNREFUSED'].includes(error.code) || process.platform !== 'win32') throw error;
            return json(res, 200, { installed: false, setupAvailable, instanceId, csrf,
              setupReason: setupAvailable ? '启用后会自动配置当前用户的后台服务，并重新启动一次。正在运行的任务会中断。' : '当前启动器不支持自动托管，请使用 Windows Web CLI 启动。' });
          }
        }
        if (path === BASE + '/setup' && req.method === 'POST') {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: 'Invalid CSRF token' });
          const body = await readJson(req);
          if (body.confirm !== 'enable-and-restart') return json(res, 400, { error: '请确认启用服务并重新启动' });
          if (!setupAvailable) return json(res, 409, { error: '当前启动器不支持自动托管' });
          if (installing) return json(res, 409, { error: '正在启用电源控制，请勿重复操作' });
          installing = true;
          try {
            await installWindowsControl(port, configFile);
            if (process.env.DSH_LIFECYCLE_CONFIG) {
              // A managed host only needs its stopped controller repaired, not another restart.
              return json(res, 200, { installed: true, restartRequired: false });
            }
            const operation = await control('POST', '/action', { action: 'takeover' });
            handoff = true;
            res.once('finish', () => { setTimeout(() => exit(0), 1200); });
            return json(res, 202, { ...operation, restartRequired: true });
          } finally { if (!handoff) installing = false; }
        }
        if (path === BASE + '/refresh' && req.method === 'POST') {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: 'Invalid CSRF token' });
          const status = await control('POST', '/refresh', {});
          return json(res, 200, { ...status, instanceId, csrf });
        }
        if (path === BASE + '/action' && req.method === 'POST') {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: 'Invalid CSRF token' });
          const body = await readJson(req);
          if (!['restart', 'shutdown', 'update'].includes(body.action)) return json(res, 400, { error: 'Unknown power action' });
          if (body.action === 'shutdown' && body.confirm !== 'shutdown') return json(res, 400, { error: 'Shutdown confirmation required' });
          const operation = await control('POST', '/action', { action: body.action, target: body.target });
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
