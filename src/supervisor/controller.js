import { readFile, mkdir, rename, chown } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { availableUpdate, publishedVersion } from './version.js';
import { windowsPortsClosed } from './windows.js';
const exec = promisify(execFile);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Own lifecycle operations independently of the managed Harness process. */
export class Controller {
  constructor(config, execute = exec, getPublished = publishedVersion) {
    this.config = config;
    this.execute = execute;
    this.getPublished = getPublished;
    this.operation = null;
    this.check = null;
    this.checking = null;
  }

  /** Read the version from the actual managed install, never from client input. */
  async installedVersion() {
    const manifest = await readFile(this.config.sourceManifest || path.join(this.config.installRoot, 'node_modules/@deepseek-ai/dsh/package.json'), 'utf8');
    return JSON.parse(manifest).version;
  }

  /** Cache registry checks for ten minutes; a failed check is explicit and retryable. */
  async status(forceRefresh = false) {
    const current = await this.installedVersion();
    const platformNotice = this.config.backend === 'windows' ? 'Windows 支持暂未实机验证' : undefined;
    // Source checkouts are owned by the developer; never replace them with an npm release.
    if (this.config.sourceManifest) return { current, update: null, updateSupported: false,
      updateReason: '源码构建：请通过源码工作流更新', operation: this.operation, platformNotice };
    if (forceRefresh || !this.check || Date.now() - this.check.checkedAt > 600000) {
      this.checking ??= this.getPublished(this.config.channel).then(latest => {
        this.check = { latest, checkedAt: Date.now(), checkError: null };
      }).catch(error => {
        this.check = { latest: null, checkedAt: Date.now(), checkError: error.message };
      }).finally(() => { this.checking = null; });
      await this.checking;
    }
    return { current, ...this.check, channel: this.config.channel,
      update: this.check.latest ? availableUpdate(current, this.check.latest) : null, operation: this.operation, platformNotice };
  }

  /** Claim an operation before returning HTTP 202; duplicate requests cannot race. */
  async accept(action, target) {
    if (!['restart', 'shutdown', 'update'].includes(action)) throw new Error('Unknown action');
    if (action === 'update' && this.config.sourceManifest) throw new Error('Source builds must be updated through their source workflow');
    if (this.operation && !['done', 'failed'].includes(this.operation.phase)) throw new Error('Another power operation is running');
    // Reserve before awaiting registry IO, including when two update requests arrive together.
    this.operation = { id: randomUUID(), action, phase: 'accepted', startedAt: Date.now(), error: null };
    if (action === 'update') {
      try {
        const current = await this.installedVersion();
        const latest = await this.getPublished(this.config.channel);
        if (typeof target !== 'string' || target !== availableUpdate(current, latest)) throw new Error('The offered update changed or no update is available; reopen the menu');
        this.operation.target = target;
      } catch (error) {
        this.operation.phase = 'failed'; this.operation.error = error.message; throw error;
      }
    }
    return { ...this.operation };
  }

  /** Execute one accepted operation; failures remain visible in status and the journal. */
  async run() {
    const op = this.operation;
    try {
      if (op.action === 'update') await this.update(op);
      else {
        op.phase = op.action === 'shutdown' ? 'stopping' : 'restarting';
        await this.service(op.action === 'shutdown' ? 'stop' : 'restart');
        if (op.action === 'restart') await this.waitReady();
      }
      op.phase = 'done';
    } catch (error) {
      op.phase = 'failed'; op.error = error.message;
      console.error('Power operation failed', op.id, error);
    }
  }

  /** Control the single configured service through its owning OS manager, without a shell. */
  async service(verb) {
    if (!['start', 'stop', 'restart'].includes(verb)) throw new Error('Unknown service operation');
    if (this.config.backend === 'windows') {
      if (verb === 'restart') { await this.service('stop'); return this.service('start'); }
      if (verb === 'stop') {
        if (await this.windowsStopped()) return;
        await this.execute(this.config.taskTool, ['/End', '/TN', this.config.service], { timeout: 90000 });
        await this.waitStopped();
        return;
      }
      return this.execute(this.config.taskTool, ['/Run', '/TN', this.config.service], { timeout: 90000 });
    }
    if (this.config.backend === 'launchd') {
      const { domain, service, plist } = this.config;
      // Unload gracefully before starting: kickstart -k can terminate before DSH flushes state.
      if (verb === 'restart') { await this.service('stop'); return this.service('start'); }
      const args = verb === 'stop' ? ['bootout', '--wait', domain + '/' + service] : ['bootstrap', domain, plist];
      return this.execute('/bin/launchctl', args, { timeout: 90000 });
    }
    return this.execute('/usr/bin/systemctl', [verb, this.config.service], { timeout: 90000 });
  }

  /** Inspect listener shutdown independently of localized Task Scheduler status strings. */
  windowsStopped() {
    return windowsPortsClosed(this.config.healthUrl);
  }

  /** Do not race a Windows task stop with a replacement process binding the same ports. */
  async waitStopped() {
    for (let i = 0; i < 60; i++) {
      if (await this.windowsStopped()) return;
      await pause(1000);
    }
    throw new Error('Harness did not release its Windows listener ports within 60 seconds');
  }

  /** Wait for an HTTP listener after the OS manager starts the service. */
  async waitReady() {
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(this.config.healthUrl, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
        if ([200, 302, 401].includes(res.status)) return;
      } catch (error) {
        if (!['TypeError', 'TimeoutError', 'AbortError'].includes(error.name)) throw error;
      }
      await pause(1000);
    }
    throw new Error('Harness did not become ready within 60 seconds');
  }

  /** Stage and validate a pinned npm release before stopping the current service. */
  async update(op) {
    const c = this.config;
    const stage = c.installRoot + '.staged-' + op.id;
    const backup = c.installRoot + '.backup-' + op.id;
    op.phase = 'downloading';
    await mkdir(stage, { mode: 0o755 });
    if (c.backend === 'windows') {
      await this.execute(c.node, [c.npmCli, 'install', '--prefix', stage, '--registry=https://registry.npmjs.org', '--no-audit', '--no-fund', '@deepseek-ai/dsh@' + op.target],
        { timeout: 600000, maxBuffer: 8 * 1024 * 1024, cwd: stage, env: { ...process.env, HOME: c.home } });
    } else if (c.backend === 'launchd') {
      await this.execute(c.npm, ['install', '--prefix', stage, '--registry=https://registry.npmjs.org', '--no-audit', '--no-fund', '@deepseek-ai/dsh@' + op.target],
        { timeout: 600000, maxBuffer: 8 * 1024 * 1024, cwd: stage, env: { ...process.env, HOME: c.home } });
    } else {
      const uid = Number((await this.execute('/usr/bin/id', ['-u', c.user])).stdout.trim());
      const gid = Number((await this.execute('/usr/bin/id', ['-g', c.user])).stdout.trim());
      await chown(stage, uid, gid);
      // npm and the staged CLI run as the Harness account, never as root.
      await this.execute('/usr/sbin/runuser', ['-u', c.user, '--', c.npm, 'install', '--prefix', stage,
        '--registry=https://registry.npmjs.org', '--no-audit', '--no-fund', '@deepseek-ai/dsh@' + op.target],
        { timeout: 600000, maxBuffer: 8 * 1024 * 1024, cwd: stage, env: { ...process.env, HOME: c.home, PATH: path.dirname(c.node) + ':/usr/bin:/bin' } });
    }
    op.phase = 'validating';
    const cli = path.join(stage, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
    const result = ['launchd', 'windows'].includes(c.backend)
      ? await this.execute(c.node, [cli, '--version'], { timeout: 30000, cwd: c.home })
      : await this.execute('/usr/sbin/runuser', ['-u', c.user, '--', c.node, cli, '--version'], { timeout: 30000, cwd: c.home });
    if (result.stdout.trim() !== op.target) throw new Error('Staged CLI version does not match the requested release');
    op.phase = 'restarting';
    await this.service('stop');
    let backedUp = false;
    let activated = false;
    try {
      await rename(c.installRoot, backup);
      backedUp = true;
      await rename(stage, c.installRoot);
      activated = true;
      await this.service('start');
      await this.waitReady();
    } catch (error) {
      // Deliberate rollback: an update must not leave a working server unavailable.
      op.phase = 'rolling-back';
      // A failed launchd bootstrap leaves no loaded job to boot out.
      if (c.backend !== 'launchd' || activated) {
        try { await this.service('stop'); }
        catch (stopError) { if (c.backend !== 'launchd' || ![3, 113].includes(stopError.code)) throw stopError; }
      }
      if (activated) await rename(c.installRoot, stage);
      if (backedUp) await rename(backup, c.installRoot);
      await this.service('start');
      await this.waitReady();
      throw new Error('Update failed; previous install restored: ' + error.message);
    }
    this.check = null;
  }
}
