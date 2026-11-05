import os from 'node:os';
import path from 'node:path';

/** Resolve the current user's controller paths without changing the system-wide Linux layout. */
export function powerPaths(platform = process.platform, home = os.homedir(), localAppData = process.platform === 'win32' ? process.env.LOCALAPPDATA : undefined) {
  if (platform === 'win32') {
    const local = localAppData || path.win32.join(home, 'AppData', 'Local');
    const root = path.win32.join(local, 'dsh-lifecycle');
    return { root, config: path.win32.join(root, 'config.json') };
  }
  const root = platform === 'darwin' ? path.posix.join(home, 'Library/Application Support/dsh-lifecycle') : '/etc/dsh-lifecycle';
  return { root, config: path.posix.join(root, 'config.json'), socket: platform === 'darwin' ? path.posix.join(root, 'control.sock') : '/run/dsh-lifecycle/control.sock' };
}
