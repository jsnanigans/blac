import type { LogEntry } from '@blac/devtools-connect/client';
import { isTagged, type Wire } from '@blac/devtools-connect/protocol';

export interface Scalar {
  text: string;
  kind: string;
}

export const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour12: false });

export const clock = (at: number) =>
  `${time(at)}.${String(new Date(at).getMilliseconds()).padStart(3, '0')}`;

export const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

export function ago(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(at).toLocaleDateString();
}

export interface LogRow {
  entry: LogEntry;
  /** Events folded into this row; 1 for a single event. */
  count: number;
  first: number;
}

const BURST_MS = 1000;

/**
 * Newest first, with back-to-back changes of one instance less than a second
 * apart folded into one row.
 */
export function logRows(log: readonly LogEntry[]): LogRow[] {
  const rows: LogRow[] = [];
  let last: LogRow | undefined;
  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i];
    if (
      last &&
      entry.kind === 'changed' &&
      last.entry.kind === 'changed' &&
      entry.id === last.entry.id &&
      last.first - entry.at < BURST_MS
    ) {
      last.count++;
      last.first = entry.at;
      continue;
    }
    last = { entry, count: 1, first: entry.at };
    rows.push(last);
  }
  return rows;
}

/** The suffix that keeps ids unique: `#n` for a duplicate, `#useBloc-n` for an isolated mount. */
const SUFFIX = /#(?:useBloc-)?(\d+)$/;

/** An instance's key within its class: `CounterCubit:main#2` → `main`. */
export const instanceKey = ({
  id,
  className,
}: {
  id: string;
  className: string;
}) =>
  (id.startsWith(`${className}:`)
    ? id.slice(className.length + 1)
    : id
  ).replace(SUFFIX, '');

/** `2` for `CounterCubit:main#2`, so instances sharing a key stay apart. */
export const instanceCopy = (id: string) => SUFFIX.exec(id)?.[1];

const short = (text: string) =>
  text.length > 16 ? `${text.slice(0, 8)}…${text.slice(-4)}` : text;

/** A key built from JSON args, compacted: `{"id":"01a1e9fa-…"}` → `id 01a1e9fa…1520`. */
export function keyLabel(key: string): string {
  if (!key.startsWith('{')) return key;
  try {
    const args = JSON.parse(key) as Record<string, unknown>;
    return Object.entries(args)
      .map(
        ([k, v]) =>
          `${k} ${short(typeof v === 'string' ? v : JSON.stringify(v))}`,
      )
      .join(', ');
  } catch {
    return key;
  }
}

/** A stable hue per class, so a class keeps its color across sessions. */
export function classHue(className: string): number {
  let hash = 0;
  for (const char of className) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return (Math.abs(hash) % 24) * 15;
}

/** Two letters, ignoring a `Bloc`/`Cubit` suffix: `ChatComposerCubit` → `CC`, `TodoBloc` → `TO`. */
export function monogram(className: string): string {
  const base = className.replace(/(Bloc|Cubit)$/, '') || className;
  const caps = base.match(/[A-Z0-9]/g) ?? [];
  return (
    caps.length > 1 ? caps.slice(0, 2).join('') : base.slice(0, 2)
  ).toUpperCase();
}

const str = (value: Wire | undefined) =>
  typeof value === 'object' ? '' : String(value ?? '');

export function scalar(value: Wire | undefined): Scalar | undefined {
  if (value === undefined) return { text: 'undefined', kind: 'special' };
  if (value === null) return { text: 'null', kind: 'special' };
  if (typeof value === 'string') {
    return { text: JSON.stringify(value), kind: 'string' };
  }
  if (typeof value !== 'object') {
    return { text: String(value), kind: typeof value };
  }
  if (!isTagged(value)) return undefined;

  const special = (text: string) => ({ text, kind: 'special' });
  switch (value.__type) {
    case 'Map':
    case 'Set':
    case 'Error':
      return undefined;
    case 'undefined':
      return special('undefined');
    case 'Function':
      return special(`ƒ ${str(value.name)}()`);
    case 'Symbol':
      return special(`Symbol(${str(value.description)})`);
    case 'BigInt':
      return { text: `${str(value.value)}n`, kind: 'number' };
    case 'Number':
      return { text: str(value.value), kind: 'number' };
    case 'Date':
    case 'RegExp':
      return special(str(value.value));
    case 'DOMNode':
      return special(`<${str(value.nodeName).toLowerCase()}>`);
    case 'TypedArray':
      return special(`${str(value.name)}(${str(value.length)} bytes)`);
    case 'Truncated':
      return special(value.total ? `… ${str(value.total)} total` : '…');
    default:
      return special(`[${value.__type}]`);
  }
}

export function children(value: Wire): Array<[label: string, child: Wire]> {
  if (Array.isArray(value)) return value.map((v, i) => [String(i), v]);
  if (typeof value !== 'object' || value === null) return [];
  if (!isTagged(value)) return Object.entries(value);

  const more: Array<[string, Wire]> = value.truncated
    ? [['…', { __type: 'Truncated', total: value.truncated }]]
    : [];
  if (value.__type === 'Map') {
    const entries = (value.entries as Wire[][]) ?? [];
    return [
      ...entries.map(([k, v]): [string, Wire] => [summary(k), v]),
      ...more,
    ];
  }
  if (value.__type === 'Set') {
    const values = (value.values as Wire[]) ?? [];
    return [...values.map((v, i): [string, Wire] => [String(i), v]), ...more];
  }
  return Object.entries(value).filter(([key]) => key !== '__type');
}

export function summary(value: Wire | undefined): string {
  const leaf = scalar(value);
  if (leaf) return leaf.text;
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value && typeof value === 'object' && isTagged(value)) {
    if (value.__type === 'Error') {
      return `${str(value.name)}: ${str(value.message)}`;
    }
    return `${value.__type}(${children(value).length})`;
  }
  return `{${Object.keys(value ?? {}).length} keys}`;
}
