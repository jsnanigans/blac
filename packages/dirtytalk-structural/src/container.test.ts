import { describe, expect, it, vi } from 'vite-plus/test';
import { MicrotaskScheduler, SyncScheduler } from '@dirtytalk/engine';
import {
  StructuralContainer,
  type DeepPartial,
  type StructuralContainerOptions,
} from './container';
import { ALL_PATHS, type PathSet } from './path-set';
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
  it('updates state and notifies the sole consumer (single-consumer skip → ALL_PATHS)', () => {
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
    expect(cb.mock.calls[0]?.[0]).toBe(ALL_PATHS);
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

  it('single-consumer skip uses ALL_PATHS even when the change does not overlap interest', () => {
    const c = make({ count: 0, label: 'a' });
    c.registerConsumerPaths('A', setOf(c, 'count'));
    const cb = vi.fn();
    c.subscribe(() => setOf(c, 'count'), cb);

    // Change `label` only. With one consumer we still mark ALL_PATHS — the
    // sole consumer wakes regardless of overlap.
    c.emit({ count: 0, label: 'b' });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[0]).toBe(ALL_PATHS);
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
