import semver from 'semver';

/** Only offer an exact published version strictly newer than the installed version. */
export function availableUpdate(current, latest) {
  if (!semver.valid(current) || !semver.valid(latest)) throw new Error('Invalid Harness version metadata');
  return semver.gt(latest, current) ? latest : null;
}

/** Query the official npm package and preserve the configured release channel. */
export async function publishedVersion(channel, fetcher = fetch) {
  if (!['latest', 'next', 'alpha'].includes(channel)) throw new Error('Unsupported release channel');
  const res = await fetcher('https://registry.npmjs.org/@deepseek-ai%2Fdsh/' + channel, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`npm registry returned ${res.status}`);
  const metadata = await res.json();
  if (metadata.name !== '@deepseek-ai/dsh' || !semver.valid(metadata.version)) throw new Error('Unexpected npm metadata');
  return metadata.version;
}
