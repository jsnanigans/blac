declare const __BLAC_UI_VERSION__: string | undefined;

/** This `@blac/devtools-ui` version; `'dev'` when built from source. */
export const UI_VERSION: string =
  typeof __BLAC_UI_VERSION__ === 'string' ? __BLAC_UI_VERSION__ : 'dev';

export type Side = 'agent' | 'panel';

const older = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true }) < 0;

/**
 * The sides behind the newest of the agent, the panel and the latest release.
 * An agent without a version predates version reporting. `'dev'` is unknown.
 */
export function outdatedSides(
  agent: string | undefined,
  panel: string,
  latest?: string,
): Side[] {
  if (agent === panel || agent === 'dev' || panel === 'dev') return [];
  const newest = [agent, latest].reduce<string>(
    (max, v) => (v && older(max, v) ? v : max),
    panel,
  );
  const sides: Side[] = [];
  if (agent === undefined || older(agent, newest)) sides.push('agent');
  if (older(panel, newest)) sides.push('panel');
  return sides;
}

let latest: Promise<string | undefined> | undefined;

/** The latest published version; `undefined` when offline or blocked. */
export function fetchLatestVersion(): Promise<string | undefined> {
  latest ??= fetch('https://registry.npmjs.org/@blac/devtools-ui/latest')
    .then((res) => (res.ok ? res.json() : undefined))
    .then((pkg: { version?: string } | undefined) => pkg?.version)
    .catch(() => undefined);
  return latest;
}
