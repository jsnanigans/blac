import { isTagged, type Wire } from '@blac/devtools-connect/protocol';

export interface Scalar {
  text: string;
  kind: string;
}

export const clock = (at: number) => {
  const d = new Date(at);
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${d.toLocaleTimeString([], { hour12: false })}.${ms}`;
};

/**
 * An instance's key within its class: `CounterCubit:main` → `main`. Drops the
 * `#n` the agent appends to keep a re-created instance's id unique.
 */
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
  ).replace(/#\d+$/, '');

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
