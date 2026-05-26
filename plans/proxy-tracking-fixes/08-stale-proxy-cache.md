---
task: 08-stale-proxy-cache
phase: 2
parallel_safe: false
serial_group: tracking-proxy
model: sonnet
effort: medium
depends_on:
  - 07-pathcache-trim
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts
---

# 08 — Cached nested proxies bake in the wrong path

## Bug (CONFIRMED with repro)

`tracking-proxy.ts:144 / 242` (caches in both traps) and `:250-264` (`createForTarget`).

`state.proxyCache` is keyed by **raw target object**, but the proxy's `get` trap closes over `path` from the first time it was created. If the same nested object appears at a different location across renders (structural sharing on immutable updates is the prototypical case), the cached proxy returns the **old path**:

```
stateA = { a: shared }       access stateA.a.x    → tracked: ['a', 'a.x']
stateB = { other: shared }   access stateB.other.x → tracked: ['other', 'a.x']  ✗
                                                                       ^^^^^
                                                              should be 'other.x'
```

`createForTarget` only deletes the **root** from `proxyCache` between state transitions (`state.proxyCache.delete(state.lastProxiedState)`). Nested proxies persist — and with them, their stale paths.

Real-world consequence: state restructures (e.g. `{user}` → `{data: {user}}`), the same `user` object now lives at a different path, but `pathCache` records `user.name` instead of `data.user.name`. Change detection runs the wrong path; users see either missing re-renders or spurious ones.

## Fix

Two options:

**Option A — clear nested cache on every fresh state.** Simpler. In `createForTarget`, when `target !== lastProxiedState`, replace the entire `proxyCache` instead of trying to delete one entry:

```ts
export function createForTarget<T>(state: ProxyState<T>, target: T): T {
  if (state.lastProxiedState === target && state.lastProxy) {
    return state.lastProxy;
  }

  // New state — discard all nested proxies. They might point at the wrong path.
  state.proxyCache = new WeakMap<object, unknown>();
  state.boundFunctionsCache = null;

  const proxy = createInternal(state, target, '', 0);
  state.lastProxiedState = target;
  state.lastProxy = proxy;
  return proxy;
}
```

Cost: one WeakMap allocation per state change. Cheap, and the previous WeakMap is GC-eligible.

**Option B — key by (target, path).** Preserves cross-render proxy identity for unchanged nested objects, but breaks WeakMap semantics (you'd need a `Map` of `WeakRef`s or a path-keyed Map of WeakMaps). More moving parts, more bug surface.

**Pick Option A.** WeakMap allocation is cheap; identity stability of nested proxies across renders isn't required (consumers receive the root proxy and re-deref through it every render).

While here, update the `ProxyState` interface to reflect the swap (`proxyCache` reassignment is supported because the field is mutable).

## Check (before editing)

```sh
grep -n "proxyCache" packages/blac-core/src/tracking/tracking-proxy.ts
```

Should show: type declaration on `ProxyState`, `new WeakMap` init in `createProxyState`, the `.set` calls in both traps, and the `.delete` in `createForTarget`. The fix replaces the `.delete` with a full `new WeakMap`.

Also confirm no test depends on `proxyCache` identity surviving a state change.

## Implement

1. Replace the `state.proxyCache.delete(state.lastProxiedState)` line with `state.proxyCache = new WeakMap();`.
2. Drop the `if (state.lastProxiedState !== null)` guard — the unconditional reassignment is simpler and correct from the first state.
3. Keep `state.boundFunctionsCache = null;` (already correct; task 06 made it nested).

## Test

Add to `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts`:

```ts
describe('nested proxy cache — path correctness across state shapes', () => {
  it('uses the correct path when a shared nested object moves between states', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;

    const shared = { x: 1 };
    const stateA = { a: shared };
    const pA = createForTarget(state, stateA) as typeof stateA;
    void pA.a.x;
    expect(state.trackedPaths.has('a.x')).toBe(true);

    // Move to stateB where `shared` lives at a different key.
    state.trackedPaths.clear();
    const stateB = { other: shared };
    const pB = createForTarget(state, stateB) as typeof stateB;
    void pB.other.x;

    expect(state.trackedPaths.has('other.x')).toBe(true);
    expect(state.trackedPaths.has('a.x')).toBe(false); // pre-fix this leaks
  });

  it('drops nested proxies from the cache after a state swap', () => {
    const state = createProxyState<unknown>();
    state.isTracking = true;
    const inner = { x: 1 };
    const s1 = { a: inner };
    const p1 = createForTarget(state, s1) as typeof s1;
    void p1.a;
    const cachedBefore = state.proxyCache.has(inner);
    expect(cachedBefore).toBe(true);

    const s2 = { b: 2 };
    createForTarget(state, s2);
    expect(state.proxyCache.has(inner)).toBe(false);
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
fix(core): drop nested proxy cache on state swap
```

Body: "Nested proxies cache the path at creation time. When the same object appears at a new location in a later state, the cached proxy reports the old path, corrupting tracked paths. Replace the entire proxyCache on every fresh state instead of only deleting the root."

## Checklist

- [ ] `createForTarget` replaces `proxyCache` instead of single-deleting.
- [ ] Two regression tests pass.
- [ ] Existing tracker tests still pass.
- [ ] No identity-equality assumption broken (check tests that assert proxy ref).
- [ ] Committed.

## Completion

**Commit SHA:** (to be filled after commit)
**Files touched:**

- `packages/blac-core/src/tracking/tracking-proxy.ts` — replaced `proxyCache.delete` with `new WeakMap` reassignment in `createForTarget`, dropped the `if (lastProxiedState !== null)` guard
- `packages/blac-core/src/tracking/proxy-tracker.edge-cases.test.ts` — added `nested proxy cache — path correctness across state shapes` describe block with two regression tests

**Typecheck result:** pass (tsc --noEmit, 0 errors)
**Test result:** 530 passed, 0 failed across all three targeted test files
