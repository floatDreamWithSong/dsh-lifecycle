import { timingSafeEqual } from 'node:crypto';

/** Accept loopback transports only; remote access requires an authenticated gateway. */
export function trustedTransport(req) {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/** Require an explicit per-process CSRF token for every power operation. */
export function authorizedAction(req, token) {
  if (!trustedTransport(req) || !req.headers['content-type']?.startsWith('application/json')) return false;
  const supplied = req.headers['x-dsh-power-token'];
  return typeof supplied === 'string' && Buffer.byteLength(supplied) === Buffer.byteLength(token)
    && timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
}
