import type { PathInterner } from './path-interner';
import type { PathId } from './types';
import { ALL_PATHS, emptyPathSet, type PathSet } from './path-set';

/**
 * True when `v` is a plain object literal (or `Object.create(null)`).
 * Class instances, arrays, `Map`, `Set`, `Date`, etc. are leaves for patch
 * semantics — patching with one replaces the whole branch.
 */
const isPlainPatchObject = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * Read a value at a dotted path from `state`.
 *
 * - `path` is dot-separated (`"a"`, `"user.email"`, `"items.5.name"`). Array
 *   indices appear as numeric segments — bracket access handles both.
 * - Returns `undefined` for any missing intermediate (never throws).
 * - Empty path returns `state` itself.
 *
 * Only walks own properties via bracket access. No prototype walking is
 * performed beyond what bracket access naturally does for plain objects.
 */
export const getAt = (state: unknown, path: string): unknown => {
  if (path === '') return state;
  const segments = path.split('.');
  let cursor: unknown = state;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) return undefined;
    if (typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

/**
 * Diff `prev` against `next` along the `skeleton` of observed paths.
 *
 * Walks each `PathId` in the skeleton, looks up its dotted string, reads the
 * value at that path in both states, and includes the id in the result iff the
 * two values are not equal under `equalsAt` (default: `Object.is`).
 *
 * - `ALL_PATHS` skeleton short-circuits to `ALL_PATHS`.
 * - Empty skeleton short-circuits to an empty result.
 * - The optional `equalsAt` hook is the per-path custom-equality seam promised
 *   by the v1 spec; container-level config plumbs concrete matchers through
 *   here. Default reference-equality is intentional — immutable updates rely
 *   on `===` for the fast-skip.
 *
 * Pure: does not mutate `prev`, `next`, or `skeleton`.
 */
export const diffAlongSkeleton = <S>(
  prev: S,
  next: S,
  skeleton: PathSet,
  interner: PathInterner,
  equalsAt?: (pathId: PathId, prev: unknown, next: unknown) => boolean,
): PathSet => {
  if (skeleton === ALL_PATHS) return ALL_PATHS;
  const ids = skeleton as Set<PathId>;
  if (ids.size === 0) return emptyPathSet();

  const result = new Set<PathId>();
  for (const id of ids) {
    const pathStr = interner.lookup(id);
    const pv = getAt(prev, pathStr);
    const nv = getAt(next, pathStr);
    const eq = equalsAt ? equalsAt(id, pv, nv) : Object.is(pv, nv);
    if (!eq) result.add(id);
  }
  return result;
};

/**
 * Flatten a `patch` object tree into a `PathSet` of interned dotted paths.
 *
 * Tree-pulses-up semantics: each branch contributes its own path *and*
 * recurses into its children. A patch of `{ user: { email: 'x' } }` records
 * both `"user"` and `"user.email"`, so a consumer of just `"user"` wakes up
 * too.
 *
 * Leaves (anything that isn't a plain object literal — arrays, primitives,
 * `null`, `undefined`, class instances, `Date`, `Map`, `Set`) record their
 * path and stop. Arrays are atomic replacements in patch semantics.
 *
 * `basePath` is an internal recursion seed; callers normally omit it.
 */
export const pathsFromPatch = <S>(
  patch: Partial<S>,
  interner: PathInterner,
  basePath: string = '',
): PathSet => {
  const result = new Set<PathId>();
  walkPatch(patch, interner, basePath, result);
  return result;
};

const walkPatch = (
  node: unknown,
  interner: PathInterner,
  basePath: string,
  out: Set<PathId>,
): void => {
  if (!isPlainPatchObject(node)) return;
  for (const key of Object.keys(node)) {
    const childPath = basePath === '' ? key : `${basePath}.${key}`;
    out.add(interner.intern(childPath));
    const value = node[key];
    if (isPlainPatchObject(value)) {
      walkPatch(value, interner, childPath, out);
    }
  }
};

/**
 * Like `pathsFromPatch`, but value-filtered against the `prev`/`next` states:
 * a path is included only when its value actually changed.
 *
 * Walks the same plain-object branches of `patch` and pulses up (each touched
 * branch contributes its own path), but compares `getAt(prev, path)` against
 * `getAt(next, path)` and skips any path that is equal — recursion into an
 * unchanged branch is pruned too, since `deepMerge` gives a changed branch a
 * fresh reference (an unchanged subtree keeps its reference, so equal refs
 * mean nothing beneath changed either).
 *
 * This lets `patch` mark precisely the paths that changed — independent of any
 * consumer skeleton, so raw channel subscribers wake correctly — without
 * over-waking siblings when a patch over-spreads an unchanged parent.
 *
 * `equalsAt` is the same per-path custom-equality seam as `diffAlongSkeleton`;
 * default is reference equality (`Object.is`).
 */
export const changedPathsFromPatch = <S>(
  prev: S,
  next: S,
  patch: Partial<S>,
  interner: PathInterner,
  equalsAt?: (pathId: PathId, prev: unknown, next: unknown) => boolean,
): PathSet => {
  const out = new Set<PathId>();
  // Thread the prev/next subtree references down the recursion and index by
  // key, rather than re-deriving each value with `getAt(root, dottedPath)`.
  // `getAt` re-walks from the root and `split('.')`s a fresh array per path —
  // pure overhead on the hot mutation path when the parallel subtree is
  // already in hand. `prevNode[key]` reproduces `getAt(prev, childPath)`
  // exactly (a non-object node yields `undefined`, matching getAt's guard).
  const walk = (
    node: unknown,
    prevNode: unknown,
    nextNode: unknown,
    basePath: string,
  ): void => {
    if (!isPlainPatchObject(node)) return;
    const prevObj =
      prevNode !== null && typeof prevNode === 'object'
        ? (prevNode as Record<string, unknown>)
        : undefined;
    const nextObj =
      nextNode !== null && typeof nextNode === 'object'
        ? (nextNode as Record<string, unknown>)
        : undefined;
    for (const key of Object.keys(node)) {
      const childPath = basePath === '' ? key : `${basePath}.${key}`;
      const id = interner.intern(childPath);
      const pv = prevObj?.[key];
      const nv = nextObj?.[key];
      const eq = equalsAt ? equalsAt(id, pv, nv) : Object.is(pv, nv);
      if (eq) continue; // value unchanged → skip this branch (and its subtree)
      out.add(id);
      walk(node[key], pv, nv, childPath);
    }
  };
  walk(patch as unknown, prev, next, '');
  return out;
};
