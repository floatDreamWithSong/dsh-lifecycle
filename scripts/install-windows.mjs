#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import net from 'node:net';
import { windowsTaskXml, windowsSystemTool } from '../dist/windows.js';

if (process.platform !== 'win32') throw new Error('This experimental installer must run on Windows; it has not been verified on Windows hardware');
const { values: v, positionals: command } = parseArgs({ allowPositionals: true, options: {
  cwd: { type: 'string' }, 'install-root': { type: 'string' }, 'source-manifest': { type: 'string' },
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
if (!process.env.LOCALAPPDATA || !/^[A-Za-z]:\\/.test(process.env.LOCALAPPDATA)) throw new Error('LOCALAPPDATA must point to the current user local drive');
const root = path.join(process.env.LOCALAPPDATA, 'dsh-lifecycle');
if (existsSync(root)) throw new Error('Controller directory already exists; back it up and remove the old tasks before reinstalling');
const identity = execFileSync(windowsSystemTool('whoami.exe'), ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true });
const sid = identity.match(/"(S-1-\d+(?:-\d+)+)"/)?.[1];
if (!sid) throw new Error('Cannot resolve the current Windows user SID');
for (const candidate of [port, port + 1]) await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', error => reject(new Error(`Port ${candidate} is unavailable; stop the existing Harness: ${error.code}`)));
  probe.listen(candidate, '127.0.0.1', () => probe.close(resolve));
});
mkdirSync(root, { recursive: true });
// Node chmod cannot enforce Windows owner-only files; set a non-inherited DACL before writing secrets.
execFileSync(windowsSystemTool('icacls.exe'), [root, '/inheritance:r', '/grant:r', '*' + sid + ':(OI)(CI)F'], { stdio: 'inherit', windowsHide: true });
const name = 'DSH-Lifecycle-' + createHash('sha256').update(sid).digest('hex').slice(0, 16);
const environment = { HOME: home, USERPROFILE: home, PATH: process.env.PATH };
if (process.env.DSH_HOME) environment.DSH_HOME = process.env.DSH_HOME;
const config = { backend: 'windows', service: name + '.Harness', controllerTask: name + '.Controller',
  taskTool: windowsSystemTool('schtasks.exe'), home, node: realpathSync(v.node), npmCli: v['npm-cli'],
  installRoot: v['install-root'], sourceManifest: v['source-manifest'], channel: v.channel,
  socket: '\\\\.\\pipe\\dsh-lifecycle-' + randomUUID(), controlToken: randomBytes(32).toString('hex'),
  healthUrl: 'http://127.0.0.1:' + port + '/login', environment,
  harnessLog: path.join(root, 'harness.log'), controllerLog: path.join(root, 'controller.log') };
for (const [source, target] of [['supervisor.js', 'supervisor.mjs'], ['windows-env.mjs', 'windows-env.mjs']]) {
  copyFileSync(fileURLToPath(new URL('../dist/' + source, import.meta.url)), path.join(root, target));
}
writeFileSync(path.join(root, 'config.json'), JSON.stringify(config, null, 2) + '\n');
const harnessXml = path.join(root, 'harness.xml');
const controllerXml = path.join(root, 'controller.xml');
writeFileSync(harnessXml, '\ufeff' + windowsTaskXml({ sid, command: [config.node, '--import', pathToFileURL(path.join(root, 'windows-env.mjs')).href, ...command.slice(1)], cwd: v.cwd }), 'utf16le');
writeFileSync(controllerXml, '\ufeff' + windowsTaskXml({ sid, command: [config.node, path.join(root, 'supervisor.mjs')], cwd: root, keepAlive: true }), 'utf16le');
const created = [];
try {
  for (const [name, xml] of [[config.controllerTask, controllerXml], [config.service, harnessXml]]) {
    // No /F: an existing scheduled task is never overwritten.
    execFileSync(config.taskTool, ['/Create', '/TN', name, '/XML', xml], { stdio: 'inherit', windowsHide: true });
    created.push(name);
  }
} catch (error) {
  for (const task of created) execFileSync(config.taskTool, ['/Delete', '/TN', task, '/F'], { stdio: 'inherit', windowsHide: true });
  throw error;
}
for (const task of [config.controllerTask, config.service]) execFileSync(config.taskTool, ['/Run', '/TN', task], { stdio: 'inherit', windowsHide: true });
console.log('Experimental Windows tasks registered; Windows hardware validation is still required. Config and console logs:', root);
