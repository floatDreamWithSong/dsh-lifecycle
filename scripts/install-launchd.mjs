#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { launchAgentPlist } from '../dist/launchd.js';

if (process.platform !== 'darwin' || process.getuid() === 0) throw new Error('Run as the macOS desktop user, without sudo');
const { values: v, positionals: command } = parseArgs({ allowPositionals: true, options: {
  cwd: { type: 'string' }, 'install-root': { type: 'string' }, 'source-manifest': { type: 'string' },
  node: { type: 'string', default: process.execPath }, npm: { type: 'string' },
  port: { type: 'string', default: '3080' }, channel: { type: 'string', default: 'latest' },
  label: { type: 'string', default: 'net.deepseek.dsh-lifecycle' }, 'state-dir': { type: 'string' },
} });
if (!v.cwd || !path.isAbsolute(v.cwd) || !existsSync(v.cwd)) throw new Error('--cwd must be an existing absolute directory');
if (!command[0] || !path.isAbsolute(command[0]) || !existsSync(command[0])) throw new Error('Pass the absolute Harness executable and arguments after --');
if (!/^[a-zA-Z0-9_.-]+$/.test(v.label)) throw new Error('Invalid launchd label');
const port = Number(v.port);
if (!Number.isInteger(port) || port < 1 || port > 65534) throw new Error('Invalid fixed gateway port');
if (!['latest', 'next', 'alpha'].includes(v.channel)) throw new Error('Invalid channel');
if (Boolean(v['source-manifest']) === Boolean(v['install-root'])) throw new Error('Choose --source-manifest or --install-root');
for (const key of ['node', 'npm', 'source-manifest', 'install-root']) {
  if (v[key] && (!path.isAbsolute(v[key]) || !existsSync(v[key]))) throw new Error('Invalid path for --' + key);
}
if (v['install-root'] && !v.npm) throw new Error('--npm is required for npm-managed Harness updates');
const home = os.homedir();
const root = v['state-dir'] || path.join(home, 'Library/Application Support/dsh-lifecycle');
if (!path.isAbsolute(root) || Buffer.byteLength(path.join(root, 'control.sock')) > 103) throw new Error('Controller directory is not absolute or socket path is too long');
const agents = path.join(home, 'Library/LaunchAgents');
const domain = 'gui/' + process.getuid();
const plist = path.join(agents, v.label + '.harness.plist');
const supervisorPlist = path.join(agents, v.label + '.plist');
// Existing services require explicit removal; never silently replace somebody's running launch target.
if (existsSync(plist) || existsSync(supervisorPlist) || existsSync(path.join(root, 'config.json'))) throw new Error('Lifecycle LaunchAgents already exist; stop and remove them before reinstalling');
// Refuse to launch a duplicate of a manually started Harness.
for (const candidate of [port, port + 1]) await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', error => reject(new Error(`Port ${candidate} is unavailable; stop the existing Harness before installation: ${error.code}`)));
  probe.listen(candidate, '127.0.0.1', () => probe.close(resolve));
});
mkdirSync(root, { recursive: true, mode: 0o700 });
mkdirSync(agents, { recursive: true, mode: 0o700 });
const socket = path.join(root, 'control.sock');
const configFile = path.join(root, 'config.json');
const config = { backend: 'launchd', service: v.label + '.harness', domain, plist, home,
  node: realpathSync(v.node), npm: v.npm, installRoot: v['install-root'], sourceManifest: v['source-manifest'],
  channel: v.channel, socket, healthUrl: 'http://127.0.0.1:' + port + '/login' };
copyFileSync(fileURLToPath(new URL('../dist/supervisor.js', import.meta.url)), path.join(root, 'supervisor.mjs'));
writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
// Capture only launch-relevant variables, never the interactive shell's credentials.
const environment = { HOME: home, PATH: process.env.PATH, DSH_LIFECYCLE_SOCKET: socket };
if (process.env.DSH_HOME) environment.DSH_HOME = process.env.DSH_HOME;
writeFileSync(plist, launchAgentPlist({ label: config.service, command, cwd: v.cwd, environment, log: path.join(root, 'harness.log') }), { mode: 0o600 });
writeFileSync(supervisorPlist, launchAgentPlist({ label: v.label, command: [config.node, path.join(root, 'supervisor.mjs')], cwd: root,
  environment: { HOME: home, PATH: process.env.PATH, DSH_LIFECYCLE_CONFIG: configFile }, log: path.join(root, 'controller.log'), keepAlive: true }), { mode: 0o600 });
for (const file of [plist, supervisorPlist]) execFileSync('/usr/bin/plutil', ['-lint', file], { stdio: 'inherit' });
execFileSync('/bin/launchctl', ['bootstrap', domain, supervisorPlist], { stdio: 'inherit' });
execFileSync('/bin/launchctl', ['bootstrap', domain, plist], { stdio: 'inherit' });
console.log('Installed per-user lifecycle services. Logs:', root);
