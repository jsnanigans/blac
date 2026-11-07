// Seeded generators for the dependency-tracking fuzz suites: random state
// trees, random render-time readers and random immutable mutations. The
// oracle is the reader itself: run on the raw next state, its output must
// match what the consumer last rendered unless the consumer was woken.

export type Rng = {
  next(): number;
  int(n: number): number;
  pick<T>(xs: readonly T[]): T;
  chance(p: number): boolean;
};

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number) => Math.floor(next() * n);
  return {
    next,
    int,
    pick: (xs) => xs[int(xs.length)],
    chance: (p) => next() < p,
  };
}

// Dotted, numeric, empty-looking and prototype-ish keys on purpose.
export const KEYS = [
  'a',
  'b',
  'c',
  'n',
  'id',
  'x.y',
  'a\\b',
  '0',
  '1',
  'length',
  'items',
  'constructor',
] as const;

type Path = string[];
type Tree = Record<string, unknown>;

const prim = (r: Rng): unknown =>
  r.pick([
    () => r.int(100),
    () => `s${r.int(5)}`,
    () => r.chance(0.5),
    () => null,
    () => undefined,
  ])();

const item = (r: Rng, i: number): Tree => ({
  id: i,
  n: r.int(100),
  t: `t${r.int(4)}`,
});

export function genValue(r: Rng, depth: number): unknown {
  const roll = r.int(depth <= 0 ? 3 : 10);
  if (roll < 3) return prim(r);
  if (roll < 5) return Array.from({ length: r.int(5) }, (_, i) => item(r, i));
  if (roll === 5) return Array.from({ length: r.int(4) }, () => prim(r));
  if (roll === 6)
    return r.chance(0.5) ? new Map([['k', r.int(9)]]) : new Date(r.int(1e6));
  return genObject(r, depth - 1);
}

export function genObject(r: Rng, depth: number): Tree {
  const out: Tree = {};
  const n = 1 + r.int(4);
  for (let i = 0; i < n; i++) out[r.pick(KEYS)] = genValue(r, depth);
  return out;
}

export const genState = (r: Rng): Tree => {
  const s = genObject(r, 3);
  s.items ??= Array.from({ length: 3 }, (_, i) => item(r, i));
  return s;
};

// ---- Readers ---------------------------------------------------------------

const isObj = (v: unknown): v is Tree =>
  v !== null &&
  typeof v === 'object' &&
  !(v instanceof Map) &&
  !(v instanceof Date);

/** `v?.[k]` for each segment, stopping at non-objects (records each step). */
const at = (s: unknown, path: Path): unknown => {
  let v = s;
  for (const k of path) {
    if (!isObj(v)) return undefined;
    v = v[k];
  }
  return v;
};

const describe = (v: unknown): unknown => {
  if (v instanceof Map) return ['Map', [...v.entries()]];
  if (v instanceof Date) return ['Date', v.getTime()];
  if (Array.isArray(v)) return ['Array', v.length];
  if (isObj(v)) return ['Object'];
  return v;
};

const field = (x: unknown, f: string): unknown =>
  isObj(x) ? describe(x[f]) : undefined;

type Op = (v: unknown) => unknown;

const arrayOps = (r: Rng): Op[] => {
  const f = r.pick(['n', 't', 'id', 'x.y']);
  const target = r.int(4);
  return [
    (v) => (v as unknown[]).length,
    (v) => (v as unknown[]).map((x) => field(x, f)),
    (v) =>
      (v as unknown[]).filter((x) => isObj(x) && (x.n as number) > 50).length,
    (v) =>
      field(
        (v as unknown[]).find((x) => isObj(x) && x.id === target),
        f,
      ),
    (v) => (v as unknown[]).some((x) => isObj(x) && x.t === 't1'),
    (v) => (v as unknown[]).every((x) => isObj(x) && typeof x.n === 'number'),
    (v) => (v as unknown[]).includes(target),
    (v) => (v as unknown[]).indexOf(`s${target}`),
    (v) => field((v as unknown[]).at(-1), f),
    (v) => (v as unknown[]).slice(1, 3).map((x) => field(x, f)),
    (v) => {
      let sum = 0;
      for (const x of v as unknown[])
        if (isObj(x) && typeof x.n === 'number') sum += x.n;
      return sum;
    },
    (v) =>
      [...(v as unknown[])]
        .map((x) => (isObj(x) ? (x.n as number) : -1))
        .sort((p, q) => p - q),
    (v) =>
      (v as unknown[]).reduce<number>((acc, x) => acc + (isObj(x) ? 1 : 0), 0),
    (v) => (v as unknown[]).findIndex((x) => isObj(x) && x.n === target),
    (v) => (v as unknown[]).join('|'),
  ];
};

const objectOps = (r: Rng): Op[] => {
  const k = r.pick(KEYS);
  const rest = r.pick(KEYS);
  return [
    (v) => Object.keys(v as Tree),
    (v) => k in (v as Tree),
    (v) => Object.hasOwn(v as Tree, k),
    (v) => Object.entries(v as Tree).map(([key, x]) => [key, describe(x)]),
    (v) => JSON.stringify(v),
    (v) => {
      const { [rest]: _omit, ...others } = v as Tree;
      return Object.keys(others);
    },
    (v) => Object.values({ ...(v as Tree) }).map(describe),
    (v) => describe((v as Tree)[k]),
  ];
};

export interface Reader {
  label: string;
  read(state: unknown): unknown;
}

/** A reader of 1–4 reads at random paths, some behind a condition. */
export function genReader(r: Rng, sample: unknown): Reader {
  const steps: { label: string; run: (s: unknown) => unknown }[] = [];
  const count = 1 + r.int(4);
  for (let i = 0; i < count; i++) {
    const path = randomPath(r, sample);
    const arr = arrayOps(r);
    const obj = objectOps(r);
    const ai = r.int(arr.length);
    const oi = r.int(obj.length);
    const label = `${path.join('/') || '<root>'}:${r.chance(0.2) ? 'leaf' : `a${ai}|o${oi}`}`;
    const leaf = label.endsWith(':leaf');
    steps.push({
      label,
      run: (s) => {
        const v = at(s, path);
        if (leaf) return describe(v);
        if (Array.isArray(v)) return arr[ai](v);
        if (isObj(v)) return obj[oi](v);
        return describe(v);
      },
    });
  }
  const gate = r.chance(0.3) ? randomPath(r, sample) : null;
  return {
    label:
      (gate ? `if(${gate.join('/')}) ` : '') +
      steps.map((s) => s.label).join(', '),
    read: (s) => {
      if (gate !== null) {
        const g = at(s, gate);
        if (typeof g === 'number' ? g < 50 : !g) return ['gated'];
      }
      return steps.map((st) => st.run(s));
    },
  };
}

/** Deterministic, order-preserving serialization of a reader's output. */
export const serialize = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x === undefined
      ? '<undef>'
      : typeof x === 'number' && !Number.isFinite(x)
        ? String(x)
        : x,
  );

// ---- Paths and mutations ---------------------------------------------------

/** A path that mostly exists in `state`, sometimes walking off the edge. */
export function randomPath(r: Rng, state: unknown): Path {
  const path: Path = [];
  let v = state;
  const depth = r.int(4);
  for (let d = 0; d < depth; d++) {
    if (Array.isArray(v) && v.length > 0 && r.chance(0.85)) {
      const i = r.int(v.length);
      path.push(String(i));
      v = v[i];
    } else if (isObj(v) && !Array.isArray(v) && r.chance(0.85)) {
      const keys = Object.keys(v);
      const k = keys.length > 0 && r.chance(0.9) ? r.pick(keys) : r.pick(KEYS);
      path.push(k);
      v = v[k];
    } else {
      path.push(r.pick(KEYS));
      break;
    }
  }
  return path;
}

const shallow = (v: unknown): unknown =>
  Array.isArray(v) ? [...v] : isObj(v) ? { ...v } : v;

/** Immutable set: clones every container on the way down to `path`. */
export function setIn(
  s: unknown,
  path: Path,
  fn: (prev: unknown) => unknown,
): unknown {
  if (path.length === 0) return fn(s);
  const [k, ...rest] = path;
  // Arrays only take index writes; `length`/`constructor` would corrupt them.
  if (Array.isArray(s) && !/^\d+$/.test(k)) return s;
  const base = isObj(s) ? shallow(s) : {};
  const out = base as Tree;
  const next = setIn(Object.hasOwn(out, k) ? out[k] : undefined, rest, fn);
  if (next === DELETE) delete out[k];
  else out[k] = next;
  return out;
}

export const DELETE = Symbol('delete');

export type Mutation =
  | { kind: 'emit'; label: string; next: (s: Tree) => Tree }
  | { kind: 'patch'; label: string; patch: (s: Tree) => Tree };

export function genMutation(r: Rng, s: Tree): Mutation {
  // Root state stays an object (`S extends object`); replacements target a key.
  const found = randomPath(r, s);
  const path = found.length > 0 ? found : [r.pick(KEYS)];
  const p = path.join('/');
  const arrayEdit = (
    label: string,
    fn: (a: unknown[]) => unknown[],
  ): Mutation => ({
    kind: 'emit',
    label: `${label} ${p}`,
    next: (st) =>
      setIn(st, path, (v) => (Array.isArray(v) ? fn(v) : v)) as Tree,
  });
  const roll = r.int(16);
  switch (roll) {
    case 0:
    case 1:
      return {
        kind: 'emit',
        label: `set ${p}`,
        next: (st) => setIn(st, path, () => prim(r)) as Tree,
      };
    case 2:
      return {
        kind: 'emit',
        label: `replace ${p}`,
        next: (st) => setIn(st, path, () => genValue(r, 2)) as Tree,
      };
    case 3:
      return {
        kind: 'emit',
        label: `clone ${p}`,
        next: (st) => setIn(st, path, shallow) as Tree,
      };
    case 4:
      return r.chance(0.8)
        ? {
            kind: 'emit',
            label: `delete ${p}`,
            next: (st) => setIn(st, path, () => DELETE) as Tree,
          }
        : { kind: 'emit', label: 'clone root', next: (st) => ({ ...st }) };
    case 5:
      return arrayEdit('push', (a) => [...a, item(r, a.length)]);
    case 6:
      return arrayEdit('pop', (a) => a.slice(0, -1));
    case 7:
      return arrayEdit('reverse', (a) => [...a].reverse());
    case 8:
      return arrayEdit('splice', (a) => a.filter((_, i) => i !== 1));
    case 9: {
      const i = r.int(3);
      const f = r.pick(['n', 't', 'x.y']);
      const v = prim(r);
      return arrayEdit(`item[${i}].${f}=`, (a) =>
        a.map((x, j) => (j === i && isObj(x) ? { ...x, [f]: v } : x)),
      );
    }
    case 10:
      return {
        kind: 'emit',
        label: `null ${p}`,
        next: (st) => setIn(st, path, () => null) as Tree,
      };
    case 11: {
      const k = r.pick(KEYS);
      const v = genValue(r, 1);
      return {
        kind: 'emit',
        label: `add ${p}/${k}`,
        next: (st) =>
          setIn(st, path, (o) =>
            isObj(o) && !Array.isArray(o) ? { ...o, [k]: v } : o,
          ) as Tree,
      };
    }
    case 12:
      return {
        kind: 'emit',
        label: 'deep clone',
        next: (st) => structuredClone(st),
      };
    default: {
      // A deep partial along plain-object ancestors; stops at the first array
      // or leaf, replacing that subtree as patch semantics require.
      const v = r.chance(0.6) ? prim(r) : genValue(r, 2);
      return {
        kind: 'patch',
        label: `patch ${p}`,
        patch: (st) => {
          const partial: Tree = {};
          let cursor = partial;
          let src: unknown = st;
          for (let i = 0; i < path.length; i++) {
            const k = path[i];
            const child =
              isObj(src) && !Array.isArray(src) ? src[k] : undefined;
            const last = i === path.length - 1;
            if (last || !isObj(child) || Array.isArray(child)) {
              cursor[k] = last ? v : setIn(child, path.slice(i + 1), () => v);
              break;
            }
            cursor = cursor[k] = {};
            src = child;
          }
          return partial;
        },
      };
    }
  }
}
