/** Send a non-cacheable JSON response at the HTTP boundary. */
export function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

/** Read a bounded JSON payload; reject oversized or malformed input. */
export async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 4096) throw new Error('Request exceeds 4 KiB');
  }
  return JSON.parse(body);
}
