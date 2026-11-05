import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { powerPaths } from '../utils/power-paths.js';
import { dshHome } from '../../lib/paths.js';
const execute = promisify(execFile);

/** Locate an owning package without adopting an arbitrary Node entry point. */
async function packageAt(entry, name) {
  for (let dir = path.dirname(entry); ; dir = path.dirname(dir)) {
    const manifest = path.join(dir, 'package.json');
    if (existsSync(manifest) && JSON.parse(await readFile(manifest, 'utf8')).name === name) return manifest;
    if (dir === path.dirname(dir)) throw new Error('Cannot identify the Harness CLI package');
  }
}

/** Capture the running CLI invocation; HTTP callers cannot supply executable paths or arguments. */
export async function launchPlan({ argv = process.argv, execArgv = process.execArgv, cwd = process.cwd() } = {}) {
  if (!argv[1] || !/[/\\](?:src[/\\]bin\.ts|lib[/\\]bin\.js)$/.test(argv[1])) throw new Error('Cannot identify the Harness CLI entry');
  const manifest = await packageAt(argv[1], '@deepseek-ai/dsh');
  // The task installer adds this preload once; omit the existing copy when repairing a managed host.
  const ownPreload = process.env.DSH_LIFECYCLE_CONFIG && pathToFileURL(path.join(path.dirname(process.env.DSH_LIFECYCLE_CONFIG), 'windows-env.mjs')).href;
  const nodeArgs = execArgv.filter((arg, index) => !(arg === '--import' && execArgv[index + 1] === ownPreload) && !(arg === ownPreload && execArgv[index - 1] === '--import'));
  const args = [...nodeArgs, path.resolve(argv[1]), ...argv.slice(2).filter(arg => arg !== '--open')];
  if (!args.includes('--no-open')) args.push('--no-open');
  // Shared/global installs and pnpm workspaces must never be renamed by the updater.
  const updateReason = argv[1].endsWith('.ts') ? '源码构建：请通过源码工作流更新' : '当前安装由原包管理器维护，请通过原方式更新；电源控制不受影响';
  return { args, cwd, manifest, updateReason };
}

/** Keep automatic installs in the real Harness home, separate for each fixed Web port. */
export function automaticConfig(port) {
  return path.resolve(dshHome(), 'lifecycle', 'windows-' + port, 'config.json');
}

/** Preserve explicit and legacy deployments; never replace a different configured service. */
export function controllerConfig(port) {
  if (process.env.DSH_LIFECYCLE_CONFIG) return process.env.DSH_LIFECYCLE_CONFIG;
  const automatic = automaticConfig(port);
  if (existsSync(automatic)) return automatic;
  const legacy = powerPaths().config;
  if (existsSync(legacy)) {
    const config = JSON.parse(readFileSync(legacy, 'utf8'));
    if (config.healthUrl === 'http://127.0.0.1:' + port + '/login'
      && path.resolve(config.environment?.DSH_HOME || path.join(config.home, '.dsh')) === path.resolve(dshHome())) return legacy;
  }
  return automatic;
}

/** Register current-user background tasks, leaving the interactive host alive until handoff is accepted. */
export async function installWindowsControl(port, configFile) {
  const plan = await launchPlan();
  const pluginManifest = await packageAt(fileURLToPath(import.meta.url), 'dsh-lifecycle');
  const installer = path.join(path.dirname(pluginManifest), 'scripts/install-windows.mjs');
  await execute(process.execPath, [installer, '--cwd', plan.cwd, '--controller-root', path.dirname(configFile),
    '--source-manifest', plan.manifest, '--update-reason', plan.updateReason, '--port', String(port), '--defer-harness',
    '--', process.execPath, ...plan.args], { windowsHide: true, timeout: 90000, maxBuffer: 1024 * 1024 });
}
