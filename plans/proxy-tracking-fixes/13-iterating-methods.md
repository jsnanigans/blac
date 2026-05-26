---
task: 13-iterating-methods
phase: 5
parallel_safe: false
serial_group: tracking-proxy
model: opus
effort: high
depends_on:
  - 12-symbol-iterator
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts
---

# 13 — Wrap callback-iterating array methods to proxy each item

## Bug

In `createArrayProxy`, function-valued props go through `getBoundFunction` which binds the raw method to the raw array. For `.map`/`.filter`/`.forEach`/etc., the callback then receives **raw** items — no proxy, no per-index tracking. Concretely, `ItemTitlesConsumer` in `apps/examples/src/examples/08-tracking/TrackingConsumers.tsx:180`:

```tsx
const titles = state.items.map((item) => item.title);
```

records only `'items'` (from the upstream `state.items` access), not `'items[0].title'` / `'items[1].title'` / `'items[2].title'`. So toggling `items[0].done` rebuilds the array (new ref) and re-renders the consumer even though the titles array is identical.

## Fix

Intercept the **callback-iterating** methods in the array trap *before* the `getBoundFunction` fallback. Wrap each so the callback receives a **proxied** item at path `path[i]`. Pass the array **proxy itself** (captured at trap creation time) as the third callback argument.

### Methods in scope

```
forEach
map
filter
find
findIndex
findLast
findLastIndex
some
every
flatMap         (treat the same; the mapper is per-item — see notes)
```

### Out of scope (handled by other tasks or left raw)

- `reduce` / `reduceRight` → task 14 (different signature)
- `values()` / `entries()` → task 15 (iterator-returning)
- `keys()` → leave raw (numeric indices)
- `indexOf` / `lastIndexOf` / `includes` → leave raw (no callback)
- `slice` / `concat` / `flat` / `toReversed` / `toSorted` / `toSpliced` / `join` → leave raw (derived arrays)
- mutators (`push`, `pop`, `sort`, `reverse`, etc.) → leave raw (future task; will warn/throw later)

### Implementation skeleton

Refactor `createArrayProxy` to capture the proxy reference so wrappers can pass it as the third argument:

```ts
export function createArrayProxy<T, U>(
  state: ProxyState<T>,
  target: U[],
  path: string,
  depth: number = 0,
): U[] {
  let proxyRef: U[]; // forward-declared so wrappers can close over it

  const ITERATING_METHODS = new Set([
    'forEach',
    'map',
    'filter',
    'find',
    'findIndex',
    'findLast',
    'findLastIndex',
    'some',
    'every',
    'flatMap',
  ]);

  function makeIteratingWrapper(methodName: string) {
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const realMethod = (Array.prototype as any)[methodName] as Function;
    return function (
      this: unknown,
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (item: any, index: number, arr: U[]) => any,
      thisArg?: unknown,
    ) {
      // realMethod iterates `target` directly; we hand it our wrapped callback.
      return realMethod.call(
        target,
        (item: U, index: number /*, _rawArr */) => {
          const indexPath = path ? `${path}[${index}]` : `[${index}]`;
          if (state.isTracking) {
            state.trackedPaths.add(indexPath);
          }
          const proxiedItem = isProxyable(item)
            ? createInternal(state, item as T, indexPath, depth + 1)
            : item;
          return callback.call(thisArg, proxiedItem, index, proxyRef);
        },
      );
    };
  }

  const proxy = new Proxy(target, {
    get: (arr, prop) => {
      if (prop === Symbol.iterator) {
        // (existing wrapper from task 12)
      }
      if (typeof prop === 'symbol') return Reflect.get(arr, prop);

      const value = Reflect.get(arr, prop);

      if (typeof value === 'function') {
        if (typeof prop === 'string' && ITERATING_METHODS.has(prop)) {
          // Use the bound-function cache so identity stays stable across renders.
          return getOrCacheBound(state, arr, value, () =>
            makeIteratingWrapper(prop),
          );
        }
        return getBoundFunction(state as ProxyState<unknown>, arr, value);
      }

      // ... existing length / index handling
    },
  });

  proxyRef = proxy;
  state.proxyCache.set(target, proxy);
  return proxy;
}
```

### `getOrCacheBound` — small refactor to `getBoundFunction`

`getBoundFunction` currently always does `fn.bind(target)`. We want the cache to also accept custom wrappers. Extract a helper:

```ts
function getOrCacheBound(
  state: ProxyState<unknown>,
  target: object,
  fn: Function,
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
  factory: () => Function,
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
): Function {
  if (!state.boundFunctionsCache) {
    state.boundFunctionsCache = new WeakMap();
  }
  let perTarget = state.boundFunctionsCache.get(target);
  if (!perTarget) {
    perTarget = new WeakMap();
    state.boundFunctionsCache.set(target, perTarget);
  }
  const cached = perTarget.get(fn);
  if (cached) return cached;
  const made = factory();
  perTarget.set(fn, made);
  return made;
}

// Rewrite existing getBoundFunction in terms of it:
function getBoundFunction(state, target, fn) {
  return getOrCacheBound(state, target, fn, () => fn.bind(target));
}
```

This preserves identity stability across renders (task 06) for both vanilla-bound methods and the new wrappers.

### Subtle correctness notes

- **`thisArg`:** `Array.prototype.map(callback, thisArg)` accepts a `thisArg`. Honor it. The wrapper passes it through with `callback.call(thisArg, ...)`.
- **Third arg:** native methods pass the array. We pass the **proxy** (`proxyRef`). Rationale: if the user does `cb(item, i, arr)` and then `arr[j].foo`, that read goes through the proxy and tracks correctly.
- **`flatMap`:** the mapper can return a value or an array; native flatten handles both. Our wrapper only proxies the input item, not the return value. The flattened output is a new raw array — that matches the "derived arrays return raw" decision.
- **Short-circuit semantics:** `.some`/`.every`/`.find`/`.findIndex`/`.findLast`/`.findLastIndex` stop early. Our wrapper inherits this naturally because the native method controls iteration. Tracking is recorded only for indices the iteration actually visits.
- **Sparse arrays:** native methods skip holes for `forEach`/`map`/`filter`/`some`/`every`/`reduce`; they **do** visit holes for `find`/`findIndex`/`findLast`/`findLastIndex`. Our wrapper inherits whichever behavior the native method has (because we call the native method). Tracking matches what's visited.
- **`.find` return value:** the native method returns the value passed to the callback. Since we hand it the proxied item, `.find` returns the proxied item. Subsequent dereferences on the returned value continue to track. Good.
- **`.findIndex` / `.indexOf`-likes:** `findIndex` returns a number; nothing to proxy on return.
- **Identity stability:** caching the wrapper per `(target, native fn)` keeps `proxy.items.map === proxy.items.map` between renders so React `useCallback`/`useMemo` deps stay stable.
- **Depth limit:** wrappers honor `depth + 1`, so the depth-10 guard still applies.

## Check (before editing)

```sh
grep -n "getBoundFunction\|createArrayProxy" packages/blac-core/src/tracking/tracking-proxy.ts
```

Confirm the helper is at line ~86 (post task 06). If task 12 already touched the array trap (added `Symbol.iterator` wrapper), preserve that wrapper — insert the new method dispatch *after* the iterator check but *before* the generic symbol passthrough.

## Implement

1. Add `getOrCacheBound` helper; rewrite `getBoundFunction` on top of it.
2. Inside `createArrayProxy`, forward-declare `proxyRef` and assign it after `new Proxy(target, ...)`.
3. Add the `ITERATING_METHODS` set and `makeIteratingWrapper` factory inside `createArrayProxy` (so the closure captures `state`, `target`, `path`, `depth`, `proxyRef`).
4. In the `get` trap's function branch, dispatch to `getOrCacheBound` with the wrapper factory when prop is in `ITERATING_METHODS`; otherwise fall through to the existing `getBoundFunction` behavior.
5. Don't touch the object trap.

## Test

Add to `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts`:

```ts
describe('array iterating methods — proxied callbacks', () => {
  function makeProxy<T>(obj: T) {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const p = createForTarget(state, obj) as T;
    return { state, p };
  }

  it('map: callback receives a proxied item; per-index path tracked', () => {
    const { state, p } = makeProxy({
      items: [{ title: 'a' }, { title: 'b' }, { title: 'c' }],
    });
    const titles = p.items.map((it) => it.title);
    expect(titles).toEqual(['a', 'b', 'c']);
    expect(state.trackedPaths.has('items[0].title')).toBe(true);
    expect(state.trackedPaths.has('items[1].title')).toBe(true);
    expect(state.trackedPaths.has('items[2].title')).toBe(true);
  });

  it('filter: callback receives a proxied item', () => {
    const { state, p } = makeProxy({
      items: [{ n: 1 }, { n: 2 }, { n: 3 }],
    });
    const big = p.items.filter((it) => it.n > 1);
    expect(big.length).toBe(2);
    expect(state.trackedPaths.has('items[0].n')).toBe(true);
    expect(state.trackedPaths.has('items[1].n')).toBe(true);
    expect(state.trackedPaths.has('items[2].n')).toBe(true);
  });

  it('forEach: callback receives a proxied item', () => {
    const { state, p } = makeProxy({ items: [{ x: 1 }, { x: 2 }] });
    let sum = 0;
    p.items.forEach((it) => {
      sum += it.x;
    });
    expect(sum).toBe(3);
    expect(state.trackedPaths.has('items[0].x')).toBe(true);
    expect(state.trackedPaths.has('items[1].x')).toBe(true);
  });

  it('find: returns the proxied item; tracks only visited indices', () => {
    const { state, p } = makeProxy({
      items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    });
    const got = p.items.find((it) => it.id === 'b');
    expect(got?.id).toBe('b');
    expect(state.trackedPaths.has('items[0].id')).toBe(true);
    expect(state.trackedPaths.has('items[1].id')).toBe(true);
    // Short-circuit: index 2 not visited
    expect(state.trackedPaths.has('items[2].id')).toBe(false);
  });

  it('findIndex: short-circuits and returns the index', () => {
    const { state, p } = makeProxy({ items: [{ n: 1 }, { n: 2 }, { n: 3 }] });
    const i = p.items.findIndex((it) => it.n === 2);
    expect(i).toBe(1);
    expect(state.trackedPaths.has('items[0].n')).toBe(true);
    expect(state.trackedPaths.has('items[1].n')).toBe(true);
    expect(state.trackedPaths.has('items[2].n')).toBe(false);
  });

  it('some / every: respect short-circuit', () => {
    const { state, p } = makeProxy({ items: [{ ok: false }, { ok: true }, { ok: false }] });
    expect(p.items.some((it) => it.ok)).toBe(true);
    expect(state.trackedPaths.has('items[0].ok')).toBe(true);
    expect(state.trackedPaths.has('items[1].ok')).toBe(true);
    expect(state.trackedPaths.has('items[2].ok')).toBe(false);
  });

  it('findLast / findLastIndex: iterate from the end', () => {
    const { state, p } = makeProxy({ items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    const last = p.items.findLast((it) => it.id === 'b');
    expect(last?.id).toBe('b');
    // Index 2 visited first; index 1 matches; index 0 not visited
    expect(state.trackedPaths.has('items[2].id')).toBe(true);
    expect(state.trackedPaths.has('items[1].id')).toBe(true);
    expect(state.trackedPaths.has('items[0].id')).toBe(false);
  });

  it('flatMap: tracks input items', () => {
    const { state, p } = makeProxy({
      groups: [{ items: [1, 2] }, { items: [3, 4] }],
    });
    const flat = p.groups.flatMap((g) => g.items);
    expect(flat).toEqual([1, 2, 3, 4]);
    expect(state.trackedPaths.has('groups[0].items')).toBe(true);
    expect(state.trackedPaths.has('groups[1].items')).toBe(true);
  });

  it('thisArg is honored', () => {
    const { p } = makeProxy({ items: [{ n: 1 }, { n: 2 }] });
    const ctx = { factor: 10 };
    const out = p.items.map(function (this: typeof ctx, it: { n: number }) {
      return it.n * this.factor;
    }, ctx);
    expect(out).toEqual([10, 20]);
  });

  it('third callback arg is the proxy (dereferences are tracked)', () => {
    const { state, p } = makeProxy({ items: [{ n: 1 }, { n: 2 }] });
    p.items.forEach((_it, i, arr) => {
      if (i === 0) {
        void arr[1].n; // observed via the proxy
      }
    });
    expect(state.trackedPaths.has('items[1].n')).toBe(true);
  });

  it('method identity is stable across reads of the same proxy', () => {
    const { p } = makeProxy({ items: [{ x: 1 }] });
    expect(p.items.map).toBe(p.items.map);
  });

  it('method identity differs across distinct arrays in the same state', () => {
    const { p } = makeProxy({ a: [{ x: 1 }], b: [{ y: 2 }] });
    expect(p.a.map).not.toBe(p.b.map);
  });

  it('per-index tracking — toggling one item does not invalidate path of another', () => {
    // End-to-end via the dependency tracker, mirroring the demo case.
    const tracker = createDependencyState();
    const item1 = { id: 'a', title: 'Wire up', done: true };
    const item2 = { id: 'b', title: 'Survive', done: false };
    const item3 = { id: 'c', title: 'Track',   done: false };
    const state1 = { items: [item1, item2, item3] };

    startDependency(tracker);
    const p1 = createDependencyProxy(tracker, state1);
    // .map-style render
    const titles = p1.items.map((it) => it.title);
    expect(titles).toEqual(['Wire up', 'Survive', 'Track']);
    capturePaths(tracker, state1);

    const state2 = {
      items: state1.items.map((it) =>
        it.id === 'a' ? { ...it, done: !it.done } : it,
      ),
    };
    // items[0].title is unchanged (toggle only flips .done); items[1]/[2] same ref.
    expect(hasDependencyChanges(tracker, state2)).toBe(false);
  });
});
```

(Use the existing `createDependencyState`, `startDependency`, `createDependencyProxy`, `capturePaths`, `hasDependencyChanges` imports already in scope from `dependency-tracker.test.ts`. Copy whichever helpers `proxy-tracker.edge-cases.test.ts` is missing.)

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- proxy-tracker.edge-cases.test.ts
pnpm --filter @blac/core test -- dependency-tracker.test.ts
pnpm --filter @blac/core test -- tracking.edge-cases.test.ts
pnpm --filter @blac/adapter typecheck
pnpm --filter @blac/adapter test
```

## Commit

```
feat(core): wrap iterating array methods to track per-index paths
```

Body: "map, filter, forEach, find, findIndex, findLast, findLastIndex, some, every and flatMap now invoke the user callback with a proxied item so per-index tracked paths are recorded. Consumers iterating via these methods re-render only when an item their callback read from actually changes."

## Checklist

- [ ] `getOrCacheBound` helper added; `getBoundFunction` rewritten on top of it.
- [ ] `createArrayProxy` forward-declares `proxyRef` and captures it post-construction.
- [ ] `ITERATING_METHODS` set + `makeIteratingWrapper` factory in place.
- [ ] Dispatch table in the get trap's function branch.
- [ ] All 13 regression tests pass.
- [ ] Existing tracker tests still pass.
- [ ] Committed.

## Completion

**Commit SHA:** d9956789
**Files touched:**
- `packages/blac-core/src/tracking/tracking-proxy.ts` — added `getOrCacheBound` helper (`getBoundFunction` rewritten on top of it); added module-level `ITERATING_METHODS` set; in `createArrayProxy` forward-declared `proxyRef`, added `makeIteratingWrapper(methodName)` factory, dispatched iterating methods through `getOrCacheBound` in the get trap's function branch (preserving the task 12 `Symbol.iterator` wrapper).
- `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts` — imported dependency-tracker helpers (`createDependencyState`, `startDependency`, `createDependencyProxy`, `capturePaths`, `hasDependencyChanges`); added `describe('array iterating methods — proxied callbacks', ...)` with all 13 regression tests; updated the stale "should NOT track array iteration methods" test to assert per-index paths ARE tracked now.
- `plans/proxy-tracking-fixes/13-iterating-methods.md` — completion block filled.

**Typecheck result:** clean (`pnpm --filter @blac/core typecheck`, `pnpm --filter @blac/adapter typecheck`)
**Test result:**
- `pnpm --filter @blac/core test -- proxy-tracker.edge-cases.test.ts` — 551 passed
- `pnpm --filter @blac/core test -- dependency-tracker.test.ts` — 551 passed
- `pnpm --filter @blac/core test -- tracking.edge-cases.test.ts` — 551 passed
- `pnpm --filter @blac/adapter test` — 34 passed
