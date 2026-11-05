#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, existsSync, realpathSync, readFileSync } from 'node:fs';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import net from 'node:net';
import http from 'node:http';
import { setTimeout as pause } from 'node:timers/promises';
import { windowsArguments, windowsTaskXml, windowsSystemTool } from '../dist/windows.js';

if (process.platform !== 'win32') throw new Error('This installer must run on Windows');
const { values: v, positionals: command } = parseArgs({ allowPositionals: true, options: {
  cwd: { type: 'string' }, 'install-root': { type: 'string' }, 'source-manifest': { type: 'string' },
  'controller-root': { type: 'string' }, 'defer-harness': { type: 'boolean', default: false }, 'update-reason': { type: 'string' },
  node: { type: 'string', default: process.execPath }, 'npm-cli': { type: 'string' },
  port: { type: 'string', default: '3080' }, channel: { type: 'string', default: 'latest' },
} });
for (const key of ['cwd', 'node', 'source-manifest', 'install-root', 'npm-cli']) {
  if (v[key] && (!path.isAbsolute(v[key]) || !existsSync(v[key]))) throw new Error('Invalid existing absolute path for --' + key);
}
if (!v.cwd || !command[0] || !path.isAbsolute(command[0]) || !existsSync(command[0])) throw new Error('Pass --cwd and the absolute node.exe command after --');
if (path.basename(v.node).toLowerCase() !== 'node.exe' || realpathSync(command[0]).toLowerCase() !== realpathSync(v.node).toLowerCase()) throw new Error('The task must run node.exe directly; cmd, PowerShell and pnpm.cmd wrappers are not supported');
if (Boolean(v['source-manifest']) === Boolean(v['install-root'])) throw new Error('Choose --source-manifest or --install-root');
if (v['install-root'] && (!v['npm-cli'] || path.basename(v['npm-cli']).toLowerCase() !== 'npm-cli.js')) throw new Error('npm-managed installs require --npm-cli pointing to npm-cli.js, not npm.cmd');
const port = Number(v.port);
if (!Number.isInteger(port) || port < 1 || port > 65534 || !['latest', 'next', 'alpha'].includes(v.channel)) throw new Error('Invalid fixed port or release channel');
const home = os.homedir();
if (!v['controller-root'] && (!process.env.LOCALAPPDATA || !/^[A-Za-z]:\\/.test(process.env.LOCALAPPDATA))) throw new Error('LOCALAPPDATA must point to the current user local drive');
if (v['controller-root'] && !/^[A-Za-z]:\\/.test(v['controller-root'])) throw new Error('--controller-root must be an absolute local-drive path');
const root = path.resolve(v['controller-root'] || path.join(process.env.LOCALAPPDATA, 'dsh-lifecycle'));
if (existsSync(root) && !v['defer-harness']) throw new Error('Controller directory already exists; back it up and remove the old tasks before reinstalling');
const identity = execFileSync(windowsSystemTool('whoami.exe'), ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true });
const sid = identity.match(/"(S-1-\d+(?:-\d+)+)"/)?.[1];
if (!sid) throw new Error('Cannot resolve the current Windows user SID');
for (const candidate of v['defer-harness'] ? [] : [port, port + 1]) await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', error => reject(new Error(`Port ${candidate} is unavailable; stop the existing Harness: ${error.code}`)));
  probe.listen(candidate, '127.0.0.1', () => probe.close(resolve));
});
const existing = existsSync(root);
mkdirSync(root, { recursive: true });
// Node chmod cannot enforce Windows owner-only files; set a non-inherited DACL before writing secrets.
if (!existing) execFileSync(windowsSystemTool('icacls.exe'), [root, '/inheritance:r', '/grant:r', '*' + sid + ':(OI)(CI)F'], { stdio: 'inherit', windowsHide: true });
const name = 'DSH-Lifecycle-' + createHash('sha256').update(v['controller-root'] ? sid + '\0' + root.toLowerCase() : sid).digest('hex').slice(0, 16);
const environment = { HOME: home, USERPROFILE: home, PATH: process.env.PATH };
if (process.env.DSH_HOME) environment.DSH_HOME = process.env.DSH_HOME;
const config = { backend: 'windows', service: name + '.Harness', controllerTask: name + '.Controller',
  taskTool: windowsSystemTool('schtasks.exe'), home, node: realpathSync(v.node), npmCli: v['npm-cli'],
  installRoot: v['install-root'], sourceManifest: v['source-manifest'], updateReason: v['update-reason'], channel: v.channel,
  socket: '\\\\.\\pipe\\dsh-lifecycle-' + randomUUID(), controlToken: randomBytes(32).toString('hex'),
  healthUrl: 'http://127.0.0.1:' + port + '/login', environment,
  harnessLog: path.join(root, 'harness.log'), controllerLog: path.join(root, 'controller.log') };
config.tasks = {
  harness: { arguments: windowsArguments(['--import', pathToFileURL(path.join(root, 'windows-env.mjs')).href, ...command.slice(1)]), cwd: v.cwd, log: config.harnessLog },
  controller: { arguments: windowsArguments([path.join(root, 'supervisor.mjs'), '--config', path.join(root, 'config.json')]), cwd: root, log: config.controllerLog },
};
if (existing) {
  const saved = JSON.parse(readFileSync(path.join(root, 'config.json'), 'utf8'));
  if (saved.backend !== 'windows' || saved.service !== config.service || saved.controllerTask !== config.controllerTask
    || saved.home !== home || saved.node !== config.node || saved.healthUrl !== config.healthUrl
    || saved.tasks?.harness?.cwd !== config.tasks.harness.cwd || saved.tasks.harness.arguments !== config.tasks.harness.arguments
    || saved.taskTool !== config.taskTool) throw new Error('Existing controller belongs to a different deployment; it was not replaced');
  Object.assign(config, saved);
}
for (const [source, target] of [['supervisor.js', 'supervisor.mjs'], ['windows-env.mjs', 'windows-env.mjs'], ['windows-task.ps1', 'windows-task.ps1']]) {
  if (!existing) copyFileSync(fileURLToPath(new URL('../dist/' + source, import.meta.url)), path.join(root, target));
}
if (!existing) writeFileSync(path.join(root, 'config.json'), JSON.stringify(config, null, 2) + '\n');
const harnessXml = path.join(root, 'harness.xml');
const controllerXml = path.join(root, 'controller.xml');
// The hidden launcher owns a kill-on-close Job Object for the complete process tree.
const taskCommand = role => [windowsSystemTool('powershell.exe'), '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'windows-task.ps1'), '-Config', path.join(root, 'config.json'), '-Role', role];
if (!existing) {
  writeFileSync(harnessXml, '\ufeff' + windowsTaskXml({ sid, command: taskCommand('harness'), cwd: v.cwd }), 'utf16le');
  writeFileSync(controllerXml, '\ufeff' + windowsTaskXml({ sid, command: taskCommand('controller'), cwd: root, keepAlive: true }), 'utf16le');
}
const created = [];
try {
  for (const [name, xml] of [[config.controllerTask, controllerXml], [config.service, harnessXml]]) {
    if (existing) {
      const query = spawnSync(config.taskTool, ['/Query', '/TN', name], { windowsHide: true, stdio: 'ignore' });
      if (query.error) throw query.error;
      if (query.status === 0) continue;
    }
    // No /F: an existing scheduled task is never overwritten.
    execFileSync(config.taskTool, ['/Create', '/TN', name, '/XML', xml], { stdio: 'inherit', windowsHide: true });
    created.push(name);
  }
} catch (error) {
  for (const task of created) execFileSync(config.taskTool, ['/Delete', '/TN', task, '/F'], { stdio: 'inherit', windowsHide: true });
  throw error;
}
for (const task of v['defer-harness'] ? [config.controllerTask] : [config.controllerTask, config.service]) execFileSync(config.taskTool, ['/Run', '/TN', task], { stdio: 'inherit', windowsHide: true });
// Registration is not readiness: surface task launch, file-virtualization and policy failures here.
let startupError;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    await new Promise((resolve, reject) => {
      const req = http.get({ socketPath: config.socket, path: '/health', headers: { 'X-DSH-Controller-Token': config.controlToken }, timeout: 1500 }, res => {
        res.resume();
        if (res.statusCode === 200) resolve();else reject(new Error('Controller HTTP ' + res.statusCode));
      });
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('Controller startup probe timed out')));
    });
    const response = await fetch(config.healthUrl, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
    await response.body?.cancel();
    if (![200, 302, 401].includes(response.status)) throw new Error('Harness HTTP ' + response.status);
    console.log('Windows controller and Harness are ready. Config and logs:', root);
    process.exit(0);
  } catch (error) { startupError = error; }
  await pause(1000);
}
throw new Error('Tasks registered but did not become ready. Inspect logs in ' + root + '; for redirected AppData, use --controller-root outside AppData. ' + startupError.message);
