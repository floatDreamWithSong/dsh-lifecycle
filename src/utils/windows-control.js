import { timingSafeEqual } from 'node:crypto';

/** Validate the private pipe endpoint and construct its authenticated local HTTP target. */
export function windowsControlTarget(config) {
  if (config.backend !== 'windows' || !/^\\\\\.\\pipe\\dsh-lifecycle-[0-9a-f-]{36}$/.test(config.socket)
    || !/^[0-9a-f]{64}$/.test(config.controlToken)) throw new Error('Invalid Windows controller pipe configuration');
  return { socketPath: config.socket, headers: { 'X-DSH-Controller-Token': config.controlToken } };
}

/** A pipe connection alone is insufficient: Windows requests must carry the private controller token. */
export function authorizedWindowsControl(supplied, expected) {
  return typeof supplied === 'string' && Buffer.byteLength(supplied) === Buffer.byteLength(expected)
    && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
