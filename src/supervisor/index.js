import http from 'node:http';
import { readFile, chmod } from 'node:fs/promises';
import { Controller } from './controller.js';
import { json, readJson } from '../utils/http.js';
import { powerPaths } from '../utils/power-paths.js';
import { prepareSocket } from '../utils/unix-socket.js';
import { windowsControlTarget, authorizedWindowsControl } from '../utils/windows-control.js';
import { windowsSystemTool } from './windows.js';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { config: { type: 'string' } } });
const config = JSON.parse(await readFile(values.config || process.env.DSH_LIFECYCLE_CONFIG || powerPaths().config, 'utf8'));
if (config.backend === 'launchd') {
  if (process.platform !== 'darwin' || config.domain !== 'gui/' + process.getuid()
    || !/^[a-zA-Z0-9_.-]+$/.test(config.service) || !config.plist?.startsWith('/')) throw new Error('Invalid per-user launchd target');
} else if (config.backend === 'windows') {
  if (process.platform !== 'win32' || !/^[a-zA-Z0-9_.-]+$/.test(config.service)
    || config.taskTool?.toLowerCase() !== windowsSystemTool('schtasks.exe').toLowerCase()) throw new Error('Invalid Windows scheduled task');
  windowsControlTarget(config);
  Object.assign(process.env, config.environment);
} else if (config.backend && config.backend !== 'systemd') throw new Error('Unsupported power backend');
else if (!/^[a-zA-Z0-9_.@-]+\.service$/.test(config.service)) throw new Error('Invalid systemd unit');
if (!['latest', 'next', 'alpha'].includes(config.channel)) throw new Error('Invalid release channel');
if (!config.healthUrl.startsWith('http://127.0.0.1:')) throw new Error('Health URL must use loopback');
const control = new Controller(config);
const server = http.createServer(async (req, res) => {
  try {
    if (config.backend === 'windows' && !authorizedWindowsControl(req.headers['x-dsh-controller-token'], config.controlToken)) return json(res, 403, { error: 'Invalid controller credential' });
    if (req.url === '/health' && req.method === 'GET') return json(res, 200, { operation: control.operation });
    if (req.url === '/status' && req.method === 'GET') return json(res, 200, await control.status());
    if (req.url === '/refresh' && req.method === 'POST') return json(res, 200, await control.status(true));
    if (req.url === '/action' && req.method === 'POST') {
      const body = await readJson(req);
      const op = await control.accept(body.action, body.target);
      // The supervisor owns this timer, independently of the service it stops.
      setTimeout(() => { void control.run(); }, 1000);
      return json(res, 202, op);
    }
    json(res, 404, { error: 'Unknown operation' });
  } catch (error) {
    json(res, 409, { error: error.message });
  }
});
if (config.backend !== 'windows') await prepareSocket(config.socket);
server.listen(config.socket, async () => {
  if (config.backend !== 'windows') await chmod(config.socket, config.backend === 'launchd' ? 0o600 : 0o660);
  console.log('Power supervisor listening on', config.socket);
});
