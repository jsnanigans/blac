---
task: 15-iterator-methods
phase: 5
parallel_safe: false
serial_group: tracking-proxy
model: sonnet
effort: low
depends_on:
  - 14-reducers
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts
---

# 15 — Wrap `values()` / `entries()` iterators (keys() stays raw)

## Bug

`Array.prototype.values()` and `Array.prototype.entries()` return iterator objects whose `next().value` is the item itself (or `[index, item]` pair). With the current bind-to-raw cache, calling `proxy.items.values()` returns the **raw** iterator over **raw** items. Same blind spot as the other iteration paths.

`keys()` returns an iterator over numeric indices — no items to proxy, no tracking gap.

## Fix

Add two new wrappers — they're structurally close to the `Symbol.iterator` wrapper from task 12 but distinguish the yielded shape:

```ts
const ITERATOR_METHODS = new Set(['values', 'entries']);

function makeIteratorMethod(methodName: 'values' | 'entries') {
  return function () {
    return (function* () {
      const len = target.length;
      if (state.isTracking && path) {
        state.trackedPaths.add(`${path}.length`);
      }
      for (let i = 0; i < len; i++) {
        const indexPath = path ? `${path}[${i}]` : `[${i}]`;
        if (state.isTracking) {
          state.trackedPaths.add(indexPath);
        }
        const item = target[i];
        const proxied = isProxyable(item)
          ? createInternal(state, item as T, indexPath, depth + 1)
          : item;
        if (methodName === 'entries') {
          yield [i, proxied] as [number, U];
        } else {
          yield proxied;
        }
      }
    })();
  };
}
```

Extend the dispatch in the get trap:

```ts
if (typeof prop === 'string') {
  if (ITERATING_METHODS.has(prop)) { ... }
  if (REDUCING_METHODS.has(prop)) { ... }
  if (ITERATOR_METHODS.has(prop)) {
    return getOrCacheBound(state, arr, value, () =>
      makeIteratorMethod(prop as 'values' | 'entries'),
    );
  }
}
```

`keys()` falls through to the existing `getBoundFunction` and continues to return the raw key iterator. That's the correct behavior since keys are primitive numbers.

### Subtleties

- **Lazy iteration:** the returned iterator iterates lazily. If the caller breaks out early, only the consumed indices record paths. Consistent with `Symbol.iterator` (task 12) and `.find` (task 13).
- **Iterator protocol:** generators provide `next`, `return`, `throw`, and `Symbol.iterator` automatically. The iterator-of-iterator case (`for (const x of proxy.items.values())`) works.
- **`entries()` tuple:** the returned tuple `[i, item]` is a new array per yield. Its `[1]` is the proxied item. We don't proxy the tuple itself — it's a fresh non-state array.
- **Symbol.iterator on the returned iterator:** generators return themselves from `Symbol.iterator`. So `for (const [i, item] of proxy.items.entries())` works.

## Check (before editing)

```sh
grep -n "ITERATING_METHODS\|REDUCING_METHODS\|ITERATOR_METHODS\|makeIteratorMethod" packages/blac-core/src/tracking/tracking-proxy.ts
```

Confirm tasks 13 and 14 landed and `ITERATOR_METHODS` doesn't already exist.

## Implement

1. Add `ITERATOR_METHODS` set + `makeIteratorMethod` factory inside `createArrayProxy`.
2. Extend the dispatch table.
3. Leave `keys()` to the existing `getBoundFunction` path.

## Test

Add to `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts`:

```ts
describe('values() / entries() / keys() — proxied iteration', () => {
  function makeProxy<T>(obj: T) {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const p = createForTarget(state, obj) as T;
    return { state, p };
  }

  it('values() yields proxied items', () => {
    const { state, p } = makeProxy({ items: [{ t: 'a' }, { t: 'b' }] });
    const out: string[] = [];
    for (const it of p.items.values()) out.push(it.t);
    expect(out).toEqual(['a', 'b']);
    expect(state.trackedPaths.has('items[0].t')).toBe(true);
    expect(state.trackedPaths.has('items[1].t')).toBe(true);
  });

  it('entries() yields [index, proxiedItem]', () => {
    const { state, p } = makeProxy({ items: [{ x: 1 }, { x: 2 }] });
    const pairs: [number, number][] = [];
    for (const [i, it] of p.items.entries()) pairs.push([i, it.x]);
    expect(pairs).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(state.trackedPaths.has('items[0].x')).toBe(true);
    expect(state.trackedPaths.has('items[1].x')).toBe(true);
  });

  it('keys() returns raw indices (no item tracking from keys themselves)', () => {
    const { state, p } = makeProxy({ items: [{ x: 1 }, { x: 2 }] });
    const ks = Array.from(p.items.keys());
    expect(ks).toEqual([0, 1]);
    // keys() iteration alone does not record per-index data paths
    expect(state.trackedPaths.has('items[0].x')).toBe(false);
  });

  it('lazy iteration — early break only tracks consumed indices', () => {
    const { state, p } = makeProxy({
      items: [{ x: 1 }, { x: 2 }, { x: 3 }],
    });
    for (const it of p.items.values()) {
      void it.x;
      break;
    }
    expect(state.trackedPaths.has('items[0].x')).toBe(true);
    expect(state.trackedPaths.has('items[1].x')).toBe(false);
    expect(state.trackedPaths.has('items[2].x')).toBe(false);
  });

  it('method identity is stable', () => {
    const { p } = makeProxy({ items: [{ x: 1 }] });
    expect(p.items.values).toBe(p.items.values);
    expect(p.items.entries).toBe(p.items.entries);
  });
});
```

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- proxy-tracker.edge-cases.test.ts
pnpm --filter @blac/core test -- dependency-tracker.test.ts
pnpm --filter @blac/core test -- tracking.edge-cases.test.ts
```

## Commit

```
feat(core): wrap values() and entries() iterators to yield proxied items
```

Body: "Aligns the iterator-returning array methods with Symbol.iterator (task 12) and the iterating methods (task 13). keys() continues to return the raw numeric iterator."

## Checklist

- [ ] `ITERATOR_METHODS` set + `makeIteratorMethod` factory added.
- [ ] Dispatch extended.
- [ ] `keys()` left to existing path.
- [ ] All five regression tests pass.
- [ ] Existing tracker tests still pass.
- [ ] Committed.

## Completion

**Commit SHA:** 07686dd9
**Files touched:**

- `packages/blac-core/src/tracking/tracking-proxy.ts` — added `ITERATOR_METHODS` set, `makeIteratorMethod` factory, extended get-trap dispatch
- `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts` — added 5 regression tests under `values() / entries() / keys() — proxied iteration`

**Typecheck result:** pass (tsc --noEmit, 0 errors)
**Test result:** 564 passed (27 test files)
