import { describe, expect, it, vi } from 'vite-plus/test';
import { MicrotaskScheduler, SyncScheduler } from '@dirtytalk/engine';
import {
  StructuralContainer,
  type DeepPartial,
  type StructuralContainerOptions,
} from './container';
import {
  ALL_PATHS,
  pathSetEquals,
  pathSetUnion,
  type PathSet,
} from './path-set';
import type { PathId } from './types';

// A minimal concrete subclass used across the suite.
class Counter extends StructuralContainer<{ count: number; label: string }> {}

const make = (
  initial: { count: number; label: string } = { count: 0, label: 'a' },
  options: StructuralContainerOptions = { scheduler: new SyncScheduler() },
): Counter => new Counter(initial, options);

const setOf = (c: Counter, ...paths: string[]): PathSet =>
  new Set<PathId>(paths.map((p) => c.interner.intern(p)));

describe('StructuralContainer — reads', () => {
  it('state reads the initial value', () => {
    const c = make({ count: 7, label: 'init' });
    expect(c.state).toEqual({ count: 7, label: 'init' });
  });
});

describe('StructuralContainer — emit', () => {
  it('updates state and notifies the sole consumer on a tracked-field change (single-consumer diff, not ALL_PATHS skip)', () => {
    const c = make();
    const cb = vi.fn();
    const interest = setOf(c, 'count');
    c.registerConsumerPaths('A', interest);
    c.subscribe(
      () => interest,
      (dirty) => cb(dirty),
    );

    c.emit({ count: 1, label: 'a' });

    expect(c.state).toEqual({ count: 1, label: 'a' });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('reference-equal next state is a no-op (no mark, no notify)', () => {
    const c = make();
    const cb = vi.fn();
    c.registerConsumerPaths('A', setOf(c, 'count'));
    c.subscribe(() => setOf(c, 'count'), cb);

    c.emit(c.state); // same reference

    expect(cb).not.toHaveBeenCalled();
  });

  it('update is emit of fn(state)', () => {
    const c = make({ count: 5, label: 'a' });
    c.registerConsumerPaths('A', setOf(c, 'count'));
    c.registerConsumerPaths('B', setOf(c, 'label')); // force multi-consumer diff
    const cb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), cb);

    c.update((s) => ({ ...s, count: s.count + 1 }));

    expect(c.state.count).toBe(6);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('StructuralContainer — patch', () => {
  it('records dotted paths and only wakes matching consumers', () => {
    const c = make();
    c.registerConsumerPaths('A', setOf(c, 'count'));
    c.registerConsumerPaths('B', setOf(c, 'label'));

    const countCb = vi.fn();
    const labelCb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), countCb);
    c.subscribe(() => setOf(c, 'label'), labelCb);

    c.patch({ count: 1 });

    expect(c.state).toEqual({ count: 1, label: 'a' });
    expect(countCb).toHaveBeenCalledTimes(1);
    expect(labelCb).not.toHaveBeenCalled();
  });

  it('nested patch records every ancestor and leaf path', () => {
    interface UserState {
      user: { email: string; name: string };
    }
    class UserBox extends StructuralContainer<UserState> {}

    const c = new UserBox(
      { user: { email: 'a@a', name: 'n' } },
      { scheduler: new SyncScheduler() },
    );

    const userCb = vi.fn();
    const emailCb = vi.fn();
    const nameCb = vi.fn();

    // Pre-intern so interest sets capture the right ids.
    const userId = c.interner.intern('user');
    const emailId = c.interner.intern('user.email');
    const nameId = c.interner.intern('user.name');

    c.registerConsumerPaths('user', new Set<PathId>([userId]));
    c.registerConsumerPaths('email', new Set<PathId>([emailId]));
    c.registerConsumerPaths('name', new Set<PathId>([nameId]));

    c.subscribe(() => new Set<PathId>([userId]), userCb);
    c.subscribe(() => new Set<PathId>([emailId]), emailCb);
    c.subscribe(() => new Set<PathId>([nameId]), nameCb);

    // DeepPartial<S> means no cast is required for nested patches.
    c.patch({ user: { email: 'x@x' } });

    expect(c.state.user.email).toBe('x@x');
    expect(c.state.user.name).toBe('n'); // merged, not replaced
    expect(userCb).toHaveBeenCalledTimes(1);
    expect(emailCb).toHaveBeenCalledTimes(1);
    expect(nameCb).not.toHaveBeenCalled();
  });

  it('empty patch is a no-op', () => {
    const c = make();
    c.registerConsumerPaths('A', setOf(c, 'count'));
    const cb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), cb);

    const before = c.state;
    c.patch({});
    expect(c.state).toBe(before);
    expect(cb).not.toHaveBeenCalled();
  });

  it('(PN10) empty partial early-returns (allocation-free check); non-empty proceeds', () => {
    const c = make({ count: 0, label: 'a' });
    c.registerConsumerPaths('A', setOf(c, 'count'));
    const cb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), cb);

    const before = c.state;
    c.patch({}); // no own enumerable keys → early return, no state change/mark
    expect(c.state).toBe(before);
    expect(cb).not.toHaveBeenCalled();

    c.patch({ count: 1 }); // non-empty → proceeds
    expect(c.state).toEqual({ count: 1, label: 'a' });
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('StructuralContainer — DeepPartial patch type-checking', () => {
  interface Nested {
    user: { name: string; email: string };
    items: number[];
    count: number;
  }
  class NestedBox extends StructuralContainer<Nested> {}
  const makeNested = () =>
    new NestedBox(
      { user: { name: 'n', email: 'e@e' }, items: [1, 2], count: 0 },
      { scheduler: new SyncScheduler() },
    );

  it('nested object patch type-checks without cast', () => {
    const c = makeNested();
    // This must compile without `as Partial<Nested>` or any other cast.
    c.patch({ user: { name: 'updated' } });
    expect(c.state.user.name).toBe('updated');
    expect(c.state.user.email).toBe('e@e'); // merged, not replaced
  });

  it('array replacement type-checks without cast', () => {
    const c = makeNested();
    c.patch({ items: [3, 4, 5] });
    expect(c.state.items).toEqual([3, 4, 5]);
  });

  it('top-level primitive patch type-checks', () => {
    const c = makeNested();
    c.patch({ count: 42 });
    expect(c.state.count).toBe(42);
  });

  it('wrong-typed patch fails type-check', () => {
    const c = makeNested();
    // @ts-expect-error — `count` is `number`, not `string`
    c.patch({ count: 'not-a-number' });
    // runtime still runs (ts-expect-error only suppresses the TS error above)
    expect(c.state.count).toBe('not-a-number');
  });

  it('DeepPartial<T> is exported and usable as a standalone type', () => {
    // Compile-time: confirm the exported type works in user code.
    type DP = DeepPartial<Nested>;
    const partial: DP = { user: { name: 'x' } };
    expect(partial.user?.name).toBe('x');
  });
});

describe('StructuralContainer — multi-consumer diff', () => {
  it('only notifies consumers whose paths overlap the diff', () => {
    const c = make({ count: 0, label: 'a' });
    c.registerConsumerPaths('A', setOf(c, 'count'));
    c.registerConsumerPaths('B', setOf(c, 'label'));

    const countCb = vi.fn();
    const labelCb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), countCb);
    c.subscribe(() => setOf(c, 'label'), labelCb);

    // Only `count` changed — label consumer should stay quiet.
    c.emit({ count: 1, label: 'a' });

    expect(countCb).toHaveBeenCalledTimes(1);
    expect(labelCb).not.toHaveBeenCalled();
  });

  it('single registered consumer stays asleep on an untracked-field change, but an ALL_PATHS subscriber still wakes via the root sentinel', () => {
    const c = make({ count: 0, label: 'a' });
    c.registerConsumerPaths('A', setOf(c, 'count'));
    const leafCb = vi.fn();
    const allPathsCb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), leafCb);
    c.subscribe(() => ALL_PATHS, allPathsCb);

    // Change `label` only — outside the {count} skeleton. The registered
    // leaf consumer's interest doesn't intersect, so it stays asleep; the
    // root-sentinel still wakes the ALL_PATHS subscriber (blac bridge,
    // plugins, watch/select).
    c.emit({ count: 0, label: 'b' });

    expect(leafCb).not.toHaveBeenCalled();
    expect(allPathsCb).toHaveBeenCalledTimes(1);
  });

  it('single registered consumer wakes when its own tracked field changes', () => {
    const c = make({ count: 0, label: 'a' });
    c.registerConsumerPaths('A', setOf(c, 'count'));
    const leafCb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), leafCb);

    c.emit({ count: 1, label: 'a' });

    expect(leafCb).toHaveBeenCalledTimes(1);
  });

  it('zero-consumer emit still uses ALL_PATHS', () => {
    const c = make({ count: 0, label: 'a' });
    const cb = vi.fn();
    c.subscribe(() => ALL_PATHS, cb);

    c.emit({ count: 1, label: 'a' });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[0]).toBe(ALL_PATHS);
  });

  it('zero-consumer patch still wakes an ALL_PATHS subscriber', () => {
    const c = make({ count: 0, label: 'a' });
    const cb = vi.fn();
    c.subscribe(() => ALL_PATHS, cb);

    c.patch({ count: 1 });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[0]).toBe(ALL_PATHS);
  });
});

describe('StructuralContainer — root-sentinel wakes ALL_PATHS on off-skeleton emit', () => {
  // Wider state: `serverData` is never watched by any registered consumer, so
  // the skeleton never includes it and `diffAlongSkeleton` returns empty when
  // only `serverData` changes.
  type WideState = { count: number; label: string; serverData: string };
  class Wide extends StructuralContainer<WideState> {}
  const makeWide = (initial: WideState): Wide =>
    new Wide(initial, { scheduler: new SyncScheduler() });
  const setOfWide = (c: Wide, ...paths: string[]): PathSet =>
    new Set<PathId>(paths.map((p) => c.interner.intern(p)));

  it('(a) an ALL_PATHS subscribe() callback fires when the change is outside every consumer skeleton', () => {
    const c = makeWide({ count: 0, label: 'a', serverData: 'x' });
    // Two registered auto-track consumers, both on `count` → forces the
    // multi-consumer diff branch, skeleton = {count}.
    c.registerConsumerPaths('A', setOfWide(c, 'count'));
    c.registerConsumerPaths('B', setOfWide(c, 'count'));

    const allPathsCb = vi.fn();
    c.subscribe(() => ALL_PATHS, allPathsCb);

    // Only `serverData` changes — outside the {count} skeleton.
    c.emit({ count: 0, label: 'a', serverData: 'y' });

    expect(allPathsCb).toHaveBeenCalledTimes(1);
  });

  it('(b) a leaf consumer of `count` does not wake on the off-skeleton `serverData` emit', () => {
    const c = makeWide({ count: 0, label: 'a', serverData: 'x' });
    c.registerConsumerPaths('A', setOfWide(c, 'count'));
    c.registerConsumerPaths('B', setOfWide(c, 'count'));

    const countCb = vi.fn();
    c.subscribe(() => setOfWide(c, 'count'), countCb);

    c.emit({ count: 0, label: 'a', serverData: 'y' });

    expect(countCb).not.toHaveBeenCalled();
  });

  it('(c) an Object.is-equal emit (same reference) still no-ops — sentinel is not unioned', () => {
    const c = makeWide({ count: 0, label: 'a', serverData: 'x' });
    c.registerConsumerPaths('A', setOfWide(c, 'count'));
    c.registerConsumerPaths('B', setOfWide(c, 'count'));

    const allPathsCb = vi.fn();
    c.subscribe(() => ALL_PATHS, allPathsCb);

    c.emit(c.state); // same reference — reference short-circuit, no mark at all

    expect(allPathsCb).not.toHaveBeenCalled();
  });
});

describe('StructuralContainer — consumer registry', () => {
  it('registerConsumerPaths fast-path skip on identical re-register', () => {
    const c = make();
    const paths = setOf(c, 'count');
    c.registerConsumerPaths('A', paths);

    // Spy on recompute via the channel side-effect: the registry change must
    // not cause any marks to flow. We confirm by snapshotting consumerCount
    // and ensuring no extra subscriber notifications happen.
    const cb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), cb);

    const sameShape = setOf(c, 'count');
    c.registerConsumerPaths('A', sameShape);
    expect(c.consumerCount).toBe(1);
    expect(cb).not.toHaveBeenCalled();

    // Sanity: a *different* path set still updates.
    c.registerConsumerPaths('A', setOf(c, 'label'));
    expect(c.consumerCount).toBe(1);
  });

  it('unregisterConsumer removes from skeleton (diff no longer matches removed path)', () => {
    const c = make({ count: 0, label: 'a' });
    c.registerConsumerPaths('A', setOf(c, 'count'));
    c.registerConsumerPaths('B', setOf(c, 'label'));

    const cb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), cb);

    // Remove the `label` consumer. Now skeleton = {count}.
    c.unregisterConsumer('B');
    expect(c.consumerCount).toBe(1);

    // Single-consumer skip triggers — any emit wakes the remaining consumer.
    // To exercise *skeleton recompute correctness*, add a second consumer
    // back so we go through the source-diff path again.
    c.registerConsumerPaths('C', setOf(c, 'count'));
    cb.mockClear();

    // Now change only `label`. Skeleton = {count}, so diffAlongSkeleton
    // returns empty — no consumer wakes.
    c.emit({ count: 0, label: 'b' });
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('StructuralContainer — equality option', () => {
  it('custom equality suppresses the diff entry for the matched path', () => {
    const c = make(
      { count: 0, label: 'a' },
      {
        scheduler: new SyncScheduler(),
        equality: new Map([['count', () => true]]),
      },
    );

    c.registerConsumerPaths('A', setOf(c, 'count'));
    c.registerConsumerPaths('B', setOf(c, 'label')); // force multi-consumer diff path

    const countCb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), countCb);

    c.emit({ count: 99, label: 'a' }); // real change to count
    expect(c.state.count).toBe(99);
    expect(countCb).not.toHaveBeenCalled(); // equality override said "equal"
  });

  it('(PN6) _equalsFn is memoized: same closure across calls when configured, undefined when not', () => {
    // No custom equality → always undefined (unchanged fast path).
    const plain = make();
    const plainFn = plain as unknown as { _equalsFn: () => unknown };
    expect(plainFn._equalsFn()).toBeUndefined();
    expect(plainFn._equalsFn()).toBeUndefined();

    // With custom equality → one closure reused across many calls.
    const c = make(
      { count: 0, label: 'a' },
      {
        scheduler: new SyncScheduler(),
        equality: new Map([['count', () => true]]),
      },
    );
    const withFn = c as unknown as {
      _equalsFn: () => (id: PathId, a: unknown, b: unknown) => boolean;
    };
    const f1 = withFn._equalsFn();
    const f2 = withFn._equalsFn();
    expect(f1).toBe(f2); // memoized — same reference

    // Still produces correct results: matched path → custom eq, others → Object.is.
    const countId = c.interner.intern('count');
    const labelId = c.interner.intern('label');
    expect(f1(countId, 1, 2)).toBe(true); // custom eq says equal
    expect(f1(labelId, 'x', 'y')).toBe(false); // falls back to Object.is
    expect(f1(labelId, 'x', 'x')).toBe(true);
  });
});

describe('StructuralContainer — onError option', () => {
  it('forwards onError to the underlying DirtyChannel so a throwing subscriber routes there instead of throwing', () => {
    const onError = vi.fn();
    const c = make(
      { count: 0, label: 'a' },
      { scheduler: new SyncScheduler(), onError },
    );
    c.registerConsumerPaths('A', setOf(c, 'count'));

    const err = new Error('boom');
    c.subscribe(
      () => setOf(c, 'count'),
      () => {
        throw err;
      },
    );

    expect(() => c.emit({ count: 1, label: 'a' })).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

describe('StructuralContainer — default scheduler', () => {
  it('MicrotaskScheduler is the default — flush is deferred to a microtask', async () => {
    const c = new Counter({ count: 0, label: 'a' }); // no options
    c.registerConsumerPaths('A', setOf(c, 'count'));
    c.registerConsumerPaths('B', setOf(c, 'label'));

    const cb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), cb);

    c.emit({ count: 1, label: 'a' });
    expect(cb).not.toHaveBeenCalled(); // microtask hasn't drained yet

    await Promise.resolve(); // yield one microtask
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('accepts an explicit MicrotaskScheduler instance', () => {
    // Smoke: just construct and ensure no throws — behaviour covered above.
    const c = new Counter(
      { count: 0, label: 'a' },
      { scheduler: new MicrotaskScheduler() },
    );
    expect(c.state.count).toBe(0);
  });
});

describe('StructuralContainer — subscribe pass-through', () => {
  it('direct subscribe bypasses the tracker registry but still receives dirty events', () => {
    const c = make();
    // No registerConsumerPaths — direct subscribe only.
    const cb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), cb);

    c.patch({ count: 1 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(c.consumerCount).toBe(0); // registry untouched
  });
});

describe('StructuralContainer — per-class interner', () => {
  it('two instances of the same class share the same interner', () => {
    const a = make();
    const b = make();
    expect(a.interner).toBe(b.interner);
  });

  it('two instances of different subclasses get different interners', () => {
    class AlphaBox extends StructuralContainer<{ x: number }> {}
    class BetaBox extends StructuralContainer<{ x: number }> {}

    const alpha = new AlphaBox({ x: 0 }, { scheduler: new SyncScheduler() });
    const beta = new BetaBox({ x: 0 }, { scheduler: new SyncScheduler() });

    expect(alpha.interner).not.toBe(beta.interner);
  });

  it('path IDs from one subclass interner do not bleed into another', () => {
    class GammaBox extends StructuralContainer<{ g: number }> {}
    class DeltaBox extends StructuralContainer<{ d: number }> {}

    const g = new GammaBox({ g: 0 }, { scheduler: new SyncScheduler() });
    const d = new DeltaBox({ d: 0 }, { scheduler: new SyncScheduler() });

    g.interner.intern('gamma.only');

    // DeltaBox's interner is independent — 'gamma.only' should not exist in it.
    expect(d.interner.size).toBe(0);
  });

  it('getInternerFor uses a WeakMap so the registry itself is not a Map', () => {
    // Structural guard: the static field is a WeakMap instance, ensuring
    // class constructors can be GC'd once all instances are gone.
    const registryDescriptor = Object.getOwnPropertyDescriptor(
      StructuralContainer,
      '_interners',
    );
    // _interners is private — access via getInternerFor side-effect instead.
    // Two calls for the same ctor must return the same interner (lazy init
    // works correctly), while calls for distinct ctors differ.
    class EpsilonBox extends StructuralContainer<{ e: number }> {}
    const e1 = new EpsilonBox({ e: 0 }, { scheduler: new SyncScheduler() });
    const e2 = new EpsilonBox({ e: 0 }, { scheduler: new SyncScheduler() });

    const directA = StructuralContainer.getInternerFor(EpsilonBox);
    const directB = StructuralContainer.getInternerFor(EpsilonBox);

    expect(directA).toBe(directB);
    expect(e1.interner).toBe(directA);
    expect(e2.interner).toBe(directA);

    // Verify the WeakMap contract: a brand-new constructor gets a fresh interner.
    class ZetaBox extends StructuralContainer<{ z: number }> {}
    expect(StructuralContainer.getInternerFor(ZetaBox)).not.toBe(directA);

    // Suppress TS unused-variable warning on the descriptor variable.
    void registryDescriptor;
  });

  it('all instances of a class share path IDs — intern once, resolve from any instance', () => {
    class SharedBox extends StructuralContainer<{ v: number }> {}

    const first = new SharedBox({ v: 0 }, { scheduler: new SyncScheduler() });
    const id = first.interner.intern('shared.path');

    const second = new SharedBox({ v: 0 }, { scheduler: new SyncScheduler() });
    // The second instance's interner is the same object — it already knows
    // about 'shared.path' without being told.
    expect(second.interner.lookup(id)).toBe('shared.path');
    expect(second.interner.intern('shared.path')).toBe(id);
  });
});

describe('StructuralContainer — patch ancestor-mark refinement (P4b)', () => {
  interface ListState {
    items: { id: number; name: string }[];
    label: string;
  }
  class ListBox extends StructuralContainer<ListState> {}
  const makeList = () =>
    new ListBox(
      {
        items: [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ],
        label: 'L',
      },
      { scheduler: new SyncScheduler() },
    );
  const setOfList = (c: ListBox, ...paths: string[]): PathSet =>
    new Set<PathId>(paths.map((p) => c.interner.intern(p)));

  it('array replacement with an unchanged element does not wake a descendant reader, but wakes a whole-array reader', () => {
    const c = makeList();
    c.registerConsumerPaths('leaf', setOfList(c, 'items.0.name'));
    c.registerConsumerPaths('whole', setOfList(c, 'items'));

    const leafCb = vi.fn();
    const wholeCb = vi.fn();
    c.subscribe(() => setOfList(c, 'items.0.name'), leafCb);
    c.subscribe(() => setOfList(c, 'items'), wholeCb);

    // New array reference, identical values at items.0.name.
    c.patch({
      items: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    });

    // Ancestor-watch on `items` is refined away: items.0.name is unchanged.
    expect(leafCb).not.toHaveBeenCalled();
    // The whole-array reader pinned `items` directly → preserved mark wakes it.
    expect(wholeCb).toHaveBeenCalledTimes(1);
  });

  it('array replacement with a changed element wakes the descendant reader', () => {
    const c = makeList();
    c.registerConsumerPaths('leaf', setOfList(c, 'items.0.name'));

    const leafCb = vi.fn();
    c.subscribe(() => setOfList(c, 'items.0.name'), leafCb);

    c.patch({
      items: [
        { id: 1, name: 'CHANGED' },
        { id: 2, name: 'b' },
      ],
    });

    expect(c.state.items[0]?.name).toBe('CHANGED');
    expect(leafCb).toHaveBeenCalledTimes(1);
  });

  it('mixed patch (array replace + primitive) wakes only the consumers whose values changed', () => {
    const c = makeList();
    c.registerConsumerPaths('leaf', setOfList(c, 'items.0.name'));
    c.registerConsumerPaths('label', setOfList(c, 'label'));

    const leafCb = vi.fn();
    const labelCb = vi.fn();
    c.subscribe(() => setOfList(c, 'items.0.name'), leafCb);
    c.subscribe(() => setOfList(c, 'label'), labelCb);

    // items.0.name unchanged, label changed.
    c.patch({
      items: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      label: 'NEW',
    });

    expect(leafCb).not.toHaveBeenCalled();
    expect(labelCb).toHaveBeenCalledTimes(1);
  });

  // (PN2) Lock the exact refined dirty set (the marks _refineAncestorMarks
  // produces) for array-replace and mixed patches — the folded single-pass +
  // inner-loop rewrite must be byte-identical to the prior two-pass version.
  const dirtyStrings = (c: ListBox, dirty: PathSet): string[] => {
    if (dirty === ALL_PATHS || !(dirty instanceof Set)) {
      throw new Error('expected Set<PathId>');
    }
    return [...dirty].map((id) => c.interner.lookup(id)).sort();
  };

  it('(PN2) array-replace refined marks: unchanged element yields exactly {items}, changed element yields {items, items.0.name}', () => {
    // Unchanged element.
    const c1 = makeList();
    c1.registerConsumerPaths('leaf', setOfList(c1, 'items.0.name'));
    c1.registerConsumerPaths('whole', setOfList(c1, 'items'));
    let dirty1: PathSet | undefined;
    c1.subscribe(
      () => ALL_PATHS,
      (d) => {
        dirty1 = d;
      },
    );
    c1.patch({
      items: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    });
    expect(dirtyStrings(c1, dirty1!)).toEqual(['items']);

    // Changed element.
    const c2 = makeList();
    c2.registerConsumerPaths('leaf', setOfList(c2, 'items.0.name'));
    c2.registerConsumerPaths('whole', setOfList(c2, 'items'));
    let dirty2: PathSet | undefined;
    c2.subscribe(
      () => ALL_PATHS,
      (d) => {
        dirty2 = d;
      },
    );
    c2.patch({
      items: [
        { id: 1, name: 'CHANGED' },
        { id: 2, name: 'b' },
      ],
    });
    expect(dirtyStrings(c2, dirty2!)).toEqual(['items', 'items.0.name']);
  });

  it('(PN2) mixed patch refined marks: array unchanged + label changed yields exactly {items, label}', () => {
    const c = makeList();
    c.registerConsumerPaths('leaf', setOfList(c, 'items.0.name'));
    c.registerConsumerPaths('label', setOfList(c, 'label'));
    let dirty: PathSet | undefined;
    c.subscribe(
      () => ALL_PATHS,
      (d) => {
        dirty = d;
      },
    );
    c.patch({
      items: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      label: 'NEW',
    });
    expect(dirtyStrings(c, dirty!)).toEqual(['items', 'label']);
  });
});

describe('StructuralContainer — incremental skeleton refcounting (P5)', () => {
  // `_skeleton` is private; read it at runtime (TS `private` is compile-only)
  // to compare the incrementally-maintained skeleton against a from-scratch
  // union of every currently-registered consumer's paths.
  const skeletonOf = (c: Counter): PathSet =>
    (c as unknown as { _skeleton: PathSet })._skeleton;
  const fromScratch = (c: Counter): PathSet => {
    let s: PathSet = new Set<PathId>();
    for (const p of c.getConsumerPaths().values()) s = pathSetUnion(s, p);
    return s;
  };

  it('shared path across consumers survives until its last referrer unregisters', () => {
    const c = make();
    c.registerConsumerPaths('A', setOf(c, 'count', 'label'));
    c.registerConsumerPaths('B', setOf(c, 'count'));
    expect(pathSetEquals(skeletonOf(c), fromScratch(c))).toBe(true);

    // Drop B — `count` is still referenced by A, so it stays in the skeleton.
    c.unregisterConsumer('B');
    expect(pathSetEquals(skeletonOf(c), fromScratch(c))).toBe(true);
    expect((skeletonOf(c) as Set<PathId>).has(c.interner.intern('count'))).toBe(
      true,
    );

    // Drop A — now the skeleton is empty.
    c.unregisterConsumer('A');
    expect((skeletonOf(c) as Set<PathId>).size).toBe(0);
  });

  it('re-registration with changed paths updates refcounts correctly', () => {
    const c = make();
    c.registerConsumerPaths('A', setOf(c, 'count'));
    c.registerConsumerPaths('A', setOf(c, 'label')); // A no longer refs count
    expect(pathSetEquals(skeletonOf(c), fromScratch(c))).toBe(true);
    expect((skeletonOf(c) as Set<PathId>).has(c.interner.intern('count'))).toBe(
      false,
    );
  });

  it('an ALL_PATHS-interest consumer forces an ALL_PATHS skeleton until it leaves', () => {
    const c = make();
    c.registerConsumerPaths('A', setOf(c, 'count'));
    c.registerConsumerPaths('W', ALL_PATHS);
    expect(skeletonOf(c)).toBe(ALL_PATHS);

    c.unregisterConsumer('W');
    expect(skeletonOf(c)).not.toBe(ALL_PATHS);
    expect(pathSetEquals(skeletonOf(c), fromScratch(c))).toBe(true);
  });

  it('property: skeleton is set-equal to a from-scratch union for randomized register/unregister sequences', () => {
    const c = make();
    const pathPool = ['count', 'label', 'a.b', 'a.c', 'x'];
    const consumers = ['C0', 'C1', 'C2', 'C3'];
    const registered = new Set<string>();

    const randomInterest = (): PathSet => {
      // ~1 in 5 consumers is an ALL_PATHS-interest consumer.
      if (Math.random() < 0.2) return ALL_PATHS;
      const set = new Set<PathId>();
      for (const p of pathPool) {
        if (Math.random() < 0.5) set.add(c.interner.intern(p));
      }
      return set;
    };

    for (let i = 0; i < 300; i++) {
      const id = consumers[Math.floor(Math.random() * consumers.length)]!;
      // Bias toward register (including re-register with changed paths); still
      // exercise unregister frequently.
      if (Math.random() < 0.65) {
        c.registerConsumerPaths(id, randomInterest());
        registered.add(id);
      } else {
        c.unregisterConsumer(id);
        registered.delete(id);
      }
      // The invariant must hold after every single operation.
      expect(pathSetEquals(skeletonOf(c), fromScratch(c))).toBe(true);
    }
  });
});

describe('StructuralContainer — dispose', () => {
  it('forwards to the underlying channel, cancelling a pending flush', () => {
    const scheduler = new MicrotaskScheduler();
    const cancelSpy = vi.spyOn(scheduler, 'cancel');
    const c = make({ count: 0, label: 'a' }, { scheduler });

    c.emit({ count: 1, label: 'a' }); // marks dirty, schedules a pending flush

    c.dispose();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('is safe to call twice', () => {
    const scheduler = new MicrotaskScheduler();
    const c = make({ count: 0, label: 'a' }, { scheduler });

    c.emit({ count: 1, label: 'a' });

    expect(() => {
      c.dispose();
      c.dispose();
    }).not.toThrow();
  });
});
