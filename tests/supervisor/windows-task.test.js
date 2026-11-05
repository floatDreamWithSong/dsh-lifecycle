import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { windowsArguments, windowsSystemTool } from '../../src/supervisor/windows.js';

test('hidden Windows launcher preserves native argv, logs both streams and propagates exit status', { skip: process.platform !== 'win32' }, t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'lifecycle-launch-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const log = path.join(root, 'output.log');
  const config = path.join(root, 'config.json');
  const args = ['a b', 'x"y', 'C:\\folder\\', '& echo unsafe', '中文'];
  const script = 'console.log(JSON.stringify(process.argv.slice(1)));process.stderr.write("stderr-data");process.exitCode=42;';
  writeFileSync(config, JSON.stringify({ node: process.execPath, tasks: { harness: {
    arguments: windowsArguments(['-e', script, ...args]), cwd: root, log,
  } } }));
  const result = spawnSync(windowsSystemTool('powershell.exe'), ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('../../src/supervisor/windows-task.ps1', import.meta.url)), '-Config', config, '-Role', 'harness'], { windowsHide: true, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 42, result.stderr);
  const output = readFileSync(log, 'utf8');
  assert.deepEqual(JSON.parse(output.split(/\r?\n/)[0]), args);
  assert.match(output, /stderr-data/);
});

test('terminating the Windows launcher kills its child and grandchild through the Job Object', { skip: process.platform !== 'win32', timeout: 20000 }, async t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'lifecycle-job-'));
  const config = path.join(root, 'config.json');
  const pidFile = path.join(root, 'pids.json');
  const script = path.join(root, 'child.mjs');
  writeFileSync(script, 'import {spawn} from "node:child_process";import {writeFileSync} from "node:fs";const child=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});writeFileSync(process.argv[2],JSON.stringify([process.pid,child.pid]));setInterval(()=>{},1000);');
  writeFileSync(config, JSON.stringify({ node: process.execPath, tasks: { harness: {
    arguments: windowsArguments([script, pidFile]), cwd: root, log: path.join(root, 'output.log'),
  } } }));
  const launcher = spawn(windowsSystemTool('powershell.exe'), ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('../../src/supervisor/windows-task.ps1', import.meta.url)), '-Config', config, '-Role', 'harness'], { windowsHide: true, stdio: 'ignore' });
  let pids = [];
  t.after(() => {
    launcher.kill();
    for (const pid of pids) { try { process.kill(pid); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
    rmSync(root, { recursive: true, force: true });
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { pids = JSON.parse(readFileSync(pidFile, 'utf8'));break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(pids.length, 2, 'The managed child did not start');
  const exited = new Promise(resolve => launcher.once('exit', resolve));
  launcher.kill();await exited;
  for (let attempt = 0; attempt < 50; attempt++) {
    const alive = pids.some(pid => { try { process.kill(pid, 0);return true; } catch (error) { if (error.code === 'ESRCH') return false;throw error; } });
    if (!alive) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
});
