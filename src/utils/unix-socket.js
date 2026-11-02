import { lstat, unlink } from 'node:fs/promises';
import net from 'node:net';

/** Remove only an owned, abandoned socket; never unlink an active controller or a regular file. */
export async function prepareSocket(socketPath) {
  let stat;
  try { stat = await lstat(socketPath); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (!stat.isSocket() || stat.uid !== process.getuid()) throw new Error('Refusing to replace an unowned or non-socket controller path');
  await new Promise((resolve, reject) => {
    const socket = net.connect(socketPath);
    socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Controller socket probe timed out')); });
    socket.once('connect', () => { socket.destroy(); reject(new Error('A power controller is already running')); });
    socket.once('error', error => { if (error.code === 'ECONNREFUSED') resolve(); else reject(error); });
  });
  await unlink(socketPath);
}
