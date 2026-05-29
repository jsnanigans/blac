import { describe, expect, it, vi } from 'vite-plus/test';
import { PathInterner } from './path-interner';
import { ALL_PATHS, emptyPathSet, type PathSet } from './path-set';
import {
  changedPathsFromPatch,
  diffAlongSkeleton,
  getAt,
  pathsFromPatch,
} from './diff';
import type { PathId } from './types';

const skeletonFromPaths = (
  interner: PathInterner,
  paths: string[],
): Set<PathId> => new Set(paths.map((p) => interner.intern(p)));

describe('getAt', () => {
  it('empty path returns the state itself', () => {
    const state = { a: 1 };
    expect(getAt(state, '')).toBe(state);
  });

  it('top-level key returns the value', () => {
    expect(getAt({ a: 1 }, 'a')).toBe(1);
  });

  it('nested object path returns the leaf', () => {
    expect(getAt({ user: { email: 'x@y.z' } }, 'user.email')).toBe('x@y.z');
  });

  it('array index segment returns the element', () => {
    expect(getAt({ items: ['a', 'b', 'c'] }, 'items.2')).toBe('c');
  });

  it('missing intermediate returns undefined (no throw)', () => {
    expect(() => getAt({ a: 1 }, 'a.b.c')).not.toThrow();
    expect(getAt({ a: 1 }, 'a.b.c')).toBeUndefined();
  });

  it('path through null returns undefined', () => {
    expect(getAt({ user: null }, 'user.email')).toBeUndefined();
  });

  it('path into a primitive returns undefined', () => {
    expect(getAt({ count: 5 }, 'count.toString')).toBeUndefined();
  });
});

describe('diffAlongSkeleton', () => {
  it('empty skeleton → empty result regardless of states', () => {
    const interner = new PathInterner();
    const result = diffAlongSkeleton(
      { a: 1 },
      { a: 999 },
      emptyPathSet(),
      interner,
    );
    expect(result).not.toBe(ALL_PATHS);
    expect((result as Set<PathId>).size).toBe(0);
  });

  it('changed leaf appears in result', () => {
    const interner = new PathInterner();
    const skeleton = skeletonFromPaths(interner, ['a']);
    const result = diffAlongSkeleton({ a: 1 }, { a: 2 }, skeleton, interner);
    expect((result as Set<PathId>).has(interner.intern('a'))).toBe(true);
    expect((result as Set<PathId>).size).toBe(1);
  });

  it('unchanged leaf yields empty result', () => {
    const interner = new PathInterner();
    const skeleton = skeletonFromPaths(interner, ['a']);
    const result = diffAlongSkeleton({ a: 1 }, { a: 1 }, skeleton, interner);
    expect((result as Set<PathId>).size).toBe(0);
  });

  it('returns only paths that actually changed', () => {
    const interner = new PathInterner();
    const skeleton = skeletonFromPaths(interner, ['a', 'b']);
    const result = diffAlongSkeleton(
      { a: 1, b: 2 },
      { a: 1, b: 3 },
      skeleton,
      interner,
    ) as Set<PathId>;
    expect(result.has(interner.intern('b'))).toBe(true);
    expect(result.has(interner.intern('a'))).toBe(false);
    expect(result.size).toBe(1);
  });

  it('shared sub-tree reference ⇒ no entries for paths through it', () => {
    const interner = new PathInterner();
    const shared = { email: 'x@y.z', name: 'a' };
    const prev = { user: shared, count: 1 };
    const next = { user: shared, count: 2 };
    const skeleton = skeletonFromPaths(interner, [
      'user',
      'user.email',
      'user.name',
      'count',
    ]);
    const result = diffAlongSkeleton(
      prev,
      next,
      skeleton,
      interner,
    ) as Set<PathId>;
    expect(result.has(interner.intern('user'))).toBe(false);
    expect(result.has(interner.intern('user.email'))).toBe(false);
    expect(result.has(interner.intern('user.name'))).toBe(false);
    expect(result.has(interner.intern('count'))).toBe(true);
    expect(result.size).toBe(1);
  });

  it('ALL_PATHS skeleton short-circuits to ALL_PATHS', () => {
    const interner = new PathInterner();
    const result = diffAlongSkeleton({ a: 1 }, { a: 2 }, ALL_PATHS, interner);
    expect(result).toBe(ALL_PATHS);
  });

  it('custom equalsAt that returns true ⇒ empty result even when values differ', () => {
    const interner = new PathInterner();
    const skeleton = skeletonFromPaths(interner, ['a', 'b']);
    const alwaysEqual = () => true;
    const result = diffAlongSkeleton(
      { a: 1, b: 2 },
      { a: 999, b: 888 },
      skeleton,
      interner,
      alwaysEqual,
    ) as Set<PathId>;
    expect(result.size).toBe(0);
  });

  it('custom equalsAt is called with (pathId, prev, next)', () => {
    const interner = new PathInterner();
    const idA = interner.intern('a');
    const idB = interner.intern('b');
    const skeleton: PathSet = new Set([idA, idB]);
    const equalsAt = vi.fn<
      (pathId: PathId, prev: unknown, next: unknown) => boolean
    >(() => false);
    diffAlongSkeleton(
      { a: 1, b: 'x' },
      { a: 2, b: 'y' },
      skeleton,
      interner,
      equalsAt,
    );
    expect(equalsAt.mock.calls.length).toBe(2);
    const byId = new Map<PathId, { prev: unknown; next: unknown }>();
    for (const call of equalsAt.mock.calls) {
      byId.set(call[0], { prev: call[1], next: call[2] });
    }
    expect(byId.get(idA)).toEqual({ prev: 1, next: 2 });
    expect(byId.get(idB)).toEqual({ prev: 'x', next: 'y' });
  });

  it('NaN values compare equal under default Object.is', () => {
    const interner = new PathInterner();
    const skeleton = skeletonFromPaths(interner, ['n']);
    const result = diffAlongSkeleton(
      { n: NaN },
      { n: NaN },
      skeleton,
      interner,
    ) as Set<PathId>;
    expect(result.size).toBe(0);
  });

  it('does not mutate inputs', () => {
    const interner = new PathInterner();
    const skeleton = skeletonFromPaths(interner, ['a']);
    const skeletonSnapshot = new Set(skeleton);
    const prev = { a: 1 };
    const next = { a: 2 };
    diffAlongSkeleton(prev, next, skeleton, interner);
    expect(prev).toEqual({ a: 1 });
    expect(next).toEqual({ a: 2 });
    expect(skeleton).toEqual(skeletonSnapshot);
  });
});

describe('pathsFromPatch', () => {
  it('flat patch records each top-level key', () => {
    const interner = new PathInterner();
    const result = pathsFromPatch({ a: 1, b: 2 }, interner) as Set<PathId>;
    expect(result.has(interner.intern('a'))).toBe(true);
    expect(result.has(interner.intern('b'))).toBe(true);
    expect(result.size).toBe(2);
  });

  it('nested patch records both branch and leaf paths', () => {
    const interner = new PathInterner();
    const result = pathsFromPatch(
      { user: { email: 'x' } },
      interner,
    ) as Set<PathId>;
    expect(result.has(interner.intern('user'))).toBe(true);
    expect(result.has(interner.intern('user.email'))).toBe(true);
    expect(result.size).toBe(2);
  });

  it('arrays are leaves — no per-index entries', () => {
    const interner = new PathInterner();
    const result = pathsFromPatch(
      { items: [1, 2, 3] },
      interner,
    ) as Set<PathId>;
    expect(result.has(interner.intern('items'))).toBe(true);
    expect(result.size).toBe(1);
    // Sanity: index path was not interned at all
    // (interner.size includes only paths actually interned by this call)
    expect(interner.size).toBe(1);
  });

  it('class instances are leaves — no inner walk', () => {
    const interner = new PathInterner();
    const result = pathsFromPatch(
      { date: new Date() },
      interner,
    ) as Set<PathId>;
    expect(result.has(interner.intern('date'))).toBe(true);
    expect(result.size).toBe(1);
  });

  it('null leaf records its path and stops', () => {
    const interner = new PathInterner();
    const result = pathsFromPatch({ user: null }, interner) as Set<PathId>;
    expect(result.has(interner.intern('user'))).toBe(true);
    expect(result.size).toBe(1);
  });

  it('empty patch produces an empty result', () => {
    const interner = new PathInterner();
    const result = pathsFromPatch({}, interner) as Set<PathId>;
    expect(result.size).toBe(0);
    expect(interner.size).toBe(0);
  });

  it('Object.create(null) is recognised as a plain patch object', () => {
    const interner = new PathInterner();
    const bag = Object.create(null) as Record<string, unknown>;
    bag.flag = true;
    const result = pathsFromPatch(bag, interner) as Set<PathId>;
    expect(result.has(interner.intern('flag'))).toBe(true);
  });

  it('deeply nested patch records every intermediate path', () => {
    const interner = new PathInterner();
    const result = pathsFromPatch(
      { a: { b: { c: 1 } } },
      interner,
    ) as Set<PathId>;
    expect(result.has(interner.intern('a'))).toBe(true);
    expect(result.has(interner.intern('a.b'))).toBe(true);
    expect(result.has(interner.intern('a.b.c'))).toBe(true);
    expect(result.size).toBe(3);
  });

  it('does not mutate the input patch', () => {
    const interner = new PathInterner();
    const patch = { user: { email: 'x', name: 'a' }, items: [1, 2] };
    const snapshot = JSON.parse(JSON.stringify(patch));
    pathsFromPatch(patch, interner);
    expect(patch).toEqual(snapshot);
  });
});

describe('changedPathsFromPatch', () => {
  const paths = (set: PathSet, interner: PathInterner): string[] => {
    if (set === ALL_PATHS || !(set instanceof Set))
      throw new Error('expected Set');
    return [...set].map((id) => interner.lookup(id)).sort();
  };

  it('marks only the path whose value actually changed', () => {
    const interner = new PathInterner();
    const prev = { user: { name: 'Ada', email: 'a@x.io' } };
    const next = { user: { name: 'Grace', email: 'a@x.io' } };
    // Over-spread patch: includes the unchanged email.
    const result = changedPathsFromPatch(
      prev,
      next,
      { user: { name: 'Grace', email: 'a@x.io' } },
      interner,
    );
    expect(paths(result, interner)).toEqual(['user', 'user.name']);
  });

  it('skips an unchanged subtree entirely (prunes recursion)', () => {
    const interner = new PathInterner();
    const addr = { city: 'Berlin', zip: '10115' };
    const prev = { user: { name: 'Ada', address: addr } };
    const next = { user: { name: 'Bob', address: addr } };
    const result = changedPathsFromPatch(
      prev,
      next,
      { user: { name: 'Bob', address: addr } },
      interner,
    );
    // address ref is unchanged → neither it nor its children are walked.
    expect(paths(result, interner)).toEqual(['user', 'user.name']);
  });

  it('marks a swapped nested object and its changed leaves but not siblings', () => {
    const interner = new PathInterner();
    const prev = {
      user: { name: 'Ada', email: 'a@x.io', address: { city: 'Berlin' } },
    };
    const next = {
      user: { name: 'Ada', email: 'a@x.io', address: { city: 'Lisbon' } },
    };
    const result = changedPathsFromPatch(
      prev,
      next,
      { user: { name: 'Ada', email: 'a@x.io', address: { city: 'Lisbon' } } },
      interner,
    );
    expect(paths(result, interner)).toEqual([
      'user',
      'user.address',
      'user.address.city',
    ]);
  });

  it('honors a custom equality override', () => {
    const interner = new PathInterner();
    const prev = { tags: ['a'] };
    const next = { tags: ['a'] }; // different ref, equal contents
    const tagsId = interner.intern('tags');
    const result = changedPathsFromPatch(
      prev,
      next,
      { tags: ['a'] },
      interner,
      (id, a, b) =>
        id === tagsId
          ? JSON.stringify(a) === JSON.stringify(b)
          : Object.is(a, b),
    );
    expect(paths(result, interner)).toEqual([]);
  });

  it('returns an empty set when nothing changed', () => {
    const interner = new PathInterner();
    const prev = { a: 1, b: 2 };
    const next = { a: 1, b: 2 };
    const result = changedPathsFromPatch(prev, next, { a: 1 }, interner);
    expect(paths(result, interner)).toEqual([]);
  });
});

describe('diff + patch cross-module sanity', () => {
  it('paths produced by pathsFromPatch feed cleanly into diffAlongSkeleton', () => {
    // Tracker is not yet implemented (parallel Phase 2 task). Use
    // pathsFromPatch — which targets the same dotted-path format the tracker
    // is specified to emit — as the source of a "skeleton" that diff walks.
    const interner = new PathInterner();
    const prev = { user: { email: 'a@b.c', name: 'A' }, count: 1 };
    const next = { user: { email: 'a@b.c', name: 'B' }, count: 1 };

    // Pretend a consumer reads user.email and user.name; the skeleton is the
    // union of their observed paths.
    const skeleton = pathsFromPatch(
      { user: { email: true, name: true } },
      interner,
    );

    const dirty = diffAlongSkeleton(
      prev,
      next,
      skeleton,
      interner,
    ) as Set<PathId>;
    expect(dirty.has(interner.intern('user.name'))).toBe(true);
    expect(dirty.has(interner.intern('user.email'))).toBe(false);
    // `user` itself is in the skeleton (intermediate path) but the value at
    // `user` is the sub-object identity — which differs between prev/next
    // since we built a new outer object, so it should be flagged too.
    expect(dirty.has(interner.intern('user'))).toBe(true);
  });
});
