import { isTagged, type Wire } from '@blac/devtools-connect/protocol';

export interface Change {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: Wire;
  after?: Wire;
}

const MAX_CHANGES = 100;
const MAX_DEPTH = 8;

const isContainer = (value: Wire): value is Wire[] | { [key: string]: Wire } =>
  typeof value === 'object' && value !== null && !isTagged(value);

const same = (a: Wire, b: Wire) =>
  a === b || JSON.stringify(a) === JSON.stringify(b);

export function diff(before: Wire, after: Wire): Change[] {
  const out: Change[] = [];

  const walk = (path: string, a: Wire, b: Wire, depth: number) => {
    if (out.length >= MAX_CHANGES) return;
    if (
      depth < MAX_DEPTH &&
      isContainer(a) &&
      isContainer(b) &&
      Array.isArray(a) === Array.isArray(b)
    ) {
      const left = a as Record<string, Wire>;
      const right = b as Record<string, Wire>;
      for (const key of new Set([
        ...Object.keys(left),
        ...Object.keys(right),
      ])) {
        const next = path ? `${path}.${key}` : key;
        if (!(key in left)) {
          out.push({ path: next, kind: 'added', after: right[key] });
        } else if (!(key in right)) {
          out.push({ path: next, kind: 'removed', before: left[key] });
        } else {
          walk(next, left[key], right[key], depth + 1);
        }
        if (out.length >= MAX_CHANGES) return;
      }
    } else if (!same(a, b)) {
      out.push({ path, kind: 'changed', before: a, after: b });
    }
  };

  walk('', before, after, 0);
  return out;
}
