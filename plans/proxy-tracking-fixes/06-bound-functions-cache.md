---
task: 06-bound-functions-cache
phase: 2
parallel_safe: false
serial_group: tracking-proxy
model: sonnet
effort: medium
depends_on:
  - 05-commit-tracked-getters
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts
---

# 06 — `boundFunctionsCache` collision: array methods bound to wrong target

## Bug (CONFIRMED with repro)

`tracking-proxy.ts:99-110` (array trap) and `:192-203` (object trap):

```ts
if (typeof value === 'function') {
  if (!state.boundFunctionsCache) {
    state.boundFunctionsCache = new WeakMap<Function, Function>();
  }
  const cached = state.boundFunctionsCache.get(value);
  if (cached) return cached;
  const bound = value.bind(arr);
  state.boundFunctionsCache.set(value, bound);
  return bound;
}
```

The cache is `WeakMap<Function, Function>` keyed by **function identity**. All arrays share `Array.prototype.map` / `.filter` / `.forEach` / `.find` / `.some` / `.every` / `.reduce` etc. — they are literally the same function reference.

First access: `state.users.map` caches `map.bind(users)`.
Second access: `state.posts.map` reads the same cache key, returns `map.bind(users)` (wrong target).

The user calls `state.posts.map(fn)` and silently maps `state.users`. Repro (already verified):

```
proxy1.map(x => x*100) → [100,200,300]
proxy2.map(x => x*100) → [100,200,300]   <-- should be [1000,2000,3000]
```

This breaks any render that touches array methods on more than one array from state.

## Fix

Key the cache by **target**, not by function. Two reasonable shapes:

**Option A — nested cache (recommended):** `WeakMap<object, WeakMap<Function, Function>>`. Lookup is two hops but each is O(1).

**Option B — drop the cache:** `value.bind(target)` is cheap; the WeakMap was a speculative optimization. The downside is identity instability — components that `useCallback`/`useMemo` on a method reference would see new identities every render. But callers should never bind to a proxied array method anyway, so the impact is small.

Pick **Option A** — preserves identity stability for the common case (same array, same method, same render) and fixes the bug. Implementation:

```ts
// Module-level WeakMap shared across all proxy states is wrong (same bug).
// Per-state WeakMap nested by target:
state.boundFunctionsCache: WeakMap<object, WeakMap<Function, Function>> | null;
```

In `ProxyState<T>` interface (around line 33-42), change the type:

```ts
// oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
boundFunctionsCache: WeakMap<object, WeakMap<Function, Function>> | null;
```

In `createProxyState`, leave as `null` (lazy-init unchanged).

Helper (add near the top of the file or inline twice):

```ts
function getBoundFunction(
  state: ProxyState<unknown>,
  target: object,
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
  fn: Function,
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
  const bound = fn.bind(target);
  perTarget.set(fn, bound);
  return bound;
}
```

Then in both traps, replace the inline cache block:

```ts
if (typeof value === 'function') {
  return getBoundFunction(state, arr /* or obj */, value);
}
```

The reset in `createForTarget` (`state.boundFunctionsCache = null;`) stays — it now also drops the per-target sub-caches in one move, since the outer WeakMap is replaced.

## Check (before editing)

```sh
grep -n "boundFunctionsCache" packages/blac-core/src/tracking/tracking-proxy.ts
```

Should show: the type on `ProxyState`, the `null` init in `createProxyState`, the two trap blocks, and the reset in `createForTarget`. All five sites are involved in the fix.

## Implement

1. Update the `ProxyState.boundFunctionsCache` type.
2. Add `getBoundFunction` helper.
3. Replace the inline cache block in both `createArrayProxy` and `createInternal` (object trap) with a single call.
4. Confirm `createForTarget`'s reset still compiles (it sets to `null`, which is fine).

## Test

Add to `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts`:

```ts
describe('boundFunctionsCache — per-target', () => {
  it('binds Array.prototype methods to the correct target', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { users: [1, 2, 3], posts: [10, 20, 30] };
    const proxy = createForTarget(state, obj) as typeof obj;

    const r1 = proxy.users.map((x) => x * 100);
    const r2 = proxy.posts.map((x) => x * 100);

    expect(r1).toEqual([100, 200, 300]);
    expect(r2).toEqual([1000, 2000, 3000]); // pre-fix: [100,200,300]
  });

  it('returns stable identity for the same (target, method) pair', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { items: [1, 2, 3] };
    const proxy = createForTarget(state, obj) as typeof obj;

    const m1 = proxy.items.map;
    const m2 = proxy.items.map;
    expect(m1).toBe(m2);
  });

  it('returns distinct identity for the same method on different targets', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const obj = { a: [1], b: [2] };
    const proxy = createForTarget(state, obj) as typeof obj;

    expect(proxy.a.map).not.toBe(proxy.b.map);
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
fix(core): key bound-function cache by (target, fn) not by fn alone
```

Body: "Array.prototype methods are shared across all arrays, so caching by function identity returned the first-bound target for every subsequent array. Multi-array renders silently iterated the wrong array. Switch to a nested WeakMap<target, WeakMap<fn, bound>>."

## Checklist

- [ ] `ProxyState.boundFunctionsCache` type updated.
- [ ] `getBoundFunction` helper added.
- [ ] Both traps call the helper; inline blocks deleted.
- [ ] Regression test (multi-array `.map`) passes.
- [ ] Identity-stability tests pass.
- [ ] Existing tracker tests still pass.
- [ ] Committed.

## Completion

**Commit SHA:** (to be filled after commit)
**Files touched:**

- `packages/blac-core/src/tracking/tracking-proxy.ts`
- `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts`

**Typecheck result:** pass (no errors)
**Test result:** 526 tests passed (27 test files)
