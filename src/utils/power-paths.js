import os from 'node:os';
import path from 'node:path';

/** Resolve the current user's controller paths without changing the system-wide Linux layout. */
export function powerPaths(platform = process.platform, home = os.homedir()) {
  const root = platform === 'darwin' ? path.join(home, 'Library/Application Support/dsh-lifecycle') : '/etc/dsh-lifecycle';
  return { root, config: path.join(root, 'config.json'), socket: platform === 'darwin' ? path.join(root, 'control.sock') : '/run/dsh-lifecycle/control.sock' };
}
