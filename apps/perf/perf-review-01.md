# Perf Review 01 — Blac Bottleneck Investigation

Date: 2026-04-16
Scope: `apps/perf/report.md` scorecard — 5 critical items (>2x slower)

## Scorecard Context

| Library | Wins | Slow (>1.5x) | Geometric Mean |
|---|---|---|---|
| Blac | 24 | 5 | 1.30x |
| Zustand | 24 | 3 | 1.19x |
| Redux Toolkit | 14 | 15 | 2.82x |

Blac ties Zustand on wins (24) and beats RTK handily, but 5 operations are >2x slower than the fastest library. This review investigates each.

---

## Critical Items

| Operation | Blac | Fastest | Gap |
|---|---|---|---|
| proxy track 20 fields | 5.8ms (Blac) | 500µs (RTK) | 11.6x |
| proxy cache reuse | 3.4ms (Blac) | 500µs (RTK) | 6.8x |
| multi-store coordination | 400µs (Blac) | 100µs (Zustand) | 4.0x |
| proxy track 1 field | 300µs (Blac) | 100µs (Zustand) | 3.0x |
| cross-store propagation | 200µs (Blac) | 100µs (Zustand) | 2.0x |

---

## Root Causes

### RC-A: Proxy cache destroyed on every state identity change

**Files:** `packages/blac-core/src/tracking/tracking-proxy.ts:248-260`

`createForTarget()` ties proxy identity to state object identity:

```ts
if (state.lastProxiedState === target && state.lastProxy) {
  return state.lastProxy; // fast path — same ref
}
state.proxyCache = new WeakMap<object, any>(); // DESTROYED
state.boundFunctionsCache = null;              // DESTROYED
const proxy = createInternal(state, target, '', 0); // full rebuild
```

With immutable state patterns (`emit` / `patch` always produce new objects), the identity check always fails. Every render cycle rebuilds the entire proxy tree from scratch — new WeakMap, new Proxy per nested object, new bound function cache.

**Impacts:** `proxy track 20 fields` (11.6x), `proxy cache reuse` (6.8x)

### RC-B: Excessive allocations per tracking cycle

Every render cycle (triggered by `autoTrackSnapshot`) allocates multiple intermediate collections:

| Allocation | Location | Trigger |
|---|---|---|
| `new Set(trackedPaths)` clone | `stopProxy()` line 75 | Every render |
| `Array.from(paths).sort()` + `new Set()` | `optimizeTrackedPaths()` lines 311-314 | Every render |
| `new Set(previousRenderPaths)` union | `capturePaths()` line 389 | Every render |
| String concatenation per property access | `get` trap line 203 | Every field read through proxy |
| `Object.getPrototypeOf()` per nested value | `isProxyable()` line 25 | Every nested object access |

For `proxy track 20 fields`: 20 string concats + ~6 collection allocations per cycle × 1000 iterations.

**Impacts:** `proxy track 20 fields` (11.6x), `proxy track 1 field` (3x), `proxy cache reuse` (6.8x)

### RC-C: Redundant `getValueAtPath()` calls across capture + change check

Both `capturePaths()` (`tracking-proxy.ts:402,411`) and `hasDependencyChanges()` (`tracking-proxy.ts:432`) call `getValueAtPath(state, segments)` for every tracked path. That's 2× property walks per path per render cycle. The `lastCheckedValues` cache mitigates this partially but adds Map lookup overhead.

**Impacts:** `proxy track 20 fields` (11.6x), `proxy track 1 field` (3x), `proxy cache reuse` (6.8x)

### RC-D: `patch()` always creates new object, bypasses identity check

**File:** `packages/blac-core/src/core/Cubit.ts:17`

```ts
this[EMIT]({ ...this.state, ...partial } as S);
```

Spread always produces a new object, so `applyState()`'s fast exit (`StateContainer.ts:237` — `if (this._state === newState) return`) never triggers for `patch()` calls — even when values are identical.

**Impacts:** `cross-store propagation` (2x), `multi-store coordination` (4x)

### RC-E: `Array.from()` listener snapshot on every emit

**File:** `packages/blac-core/src/core/StateContainer.ts:270`

```ts
const snapshot = Array.from(this._listeners);
```

Every state change allocates a new array from the listener Set. In `multi-store coordination` (3000 patches with 3 subscribers), that's 3000 array allocations. Zustand iterates its listener Set directly.

**Impacts:** `multi-store coordination` (4x), `cross-store propagation` (2x)

### RC-F: Multi-layer notification pipeline

Every Blac state change runs through up to 3 notification passes:

1. System event handlers (line 257-267) — guarded by `_hasStateChangeHandlers`
2. Direct listeners via `Array.from()` snapshot (line 269-278)
3. Registry `notifyStateChanged()` (line 280) → microtask queue → flush → plugin system

Zustand has 1 notification pass: iterate listeners. No registry, no plugin hooks, no microtask scheduling.

The registry call at line 280 always executes even when there are no registry-level listeners. While `notifyStateChanged()` guards with `_stateChangedListenerCount === 0`, the function call + count check still adds overhead per emit.

**Impacts:** `multi-store coordination` (4x), `cross-store propagation` (2x)

---

## Benchmark Asymmetry Note

The proxy benchmarks are not measuring equivalent operations across libraries. For `proxy track 20 fields` and `proxy cache reuse`:

| Library | What it does |
|---|---|
| Blac | Full tracking lifecycle: proxy creation → path interception → optimization → cache update → change detection |
| Zustand | 20 plain property reads from a plain object (no tracking) |
| Redux Toolkit | 20 plain property reads from a plain object (no tracking) |

Zustand and RTK have no equivalent fine-grained reactivity feature. The comparison measures "tracking overhead vs no tracking," not "Blac tracking vs competitor tracking." That said, the overhead can still be reduced.

---

## Improvement Plan

### P0 — High Impact

#### 1. Decouple proxy cache from state identity

**Target:** `tracking-proxy.ts:248-260`
**Expected impact:** Close the 6.8x `proxy cache reuse` gap, significantly improve `proxy track 20 fields`

Instead of keying the proxy WeakMap by the state object itself (which changes on every immutable update), use a single long-lived proxy that reads from a mutable reference to the current state. This way the proxy tree is built once and reused across renders — only the backing state reference swaps.

**Approach:** Maintain a `currentStateRef` that the proxy traps read from. On render, swap the ref instead of rebuilding proxies. The proxy tree only needs reconstruction when structural shape changes (new keys, different nesting).

#### 2. Shallow equality check in `patch()`

**Target:** `Cubit.ts:17`
**Expected impact:** Eliminates no-op emissions for the cross-store and multi-store benchmarks

```ts
// Before
this[EMIT]({ ...this.state, ...partial } as S);

// After — skip if nothing changed
const next = { ...this.state, ...partial } as S;
let changed = false;
for (const key in partial) {
  if (!Object.is(next[key], this.state[key])) { changed = true; break; }
}
if (changed) this[EMIT](next);
```

### P1 — Medium Impact

#### 3. Merge `capturePaths` + `hasDependencyChanges` into a single pass

**Target:** `tracking-proxy.ts:376-443`
**Expected impact:** 2× fewer `getValueAtPath()` calls per render cycle

Currently both functions independently walk the state tree for each tracked path. A combined function could update the cache and detect changes in one pass.

#### 4. Replace `Array.from(listeners)` with direct Set iteration

**Target:** `StateContainer.ts:270`
**Expected impact:** Eliminate per-emit array allocation

Iterate the Set directly. If mutation-safety during notification is needed, use a copy-on-write pattern for the Set itself (only snapshot when actual subscription changes happen during iteration).

#### 5. Skip `optimizeTrackedPaths` for flat paths

**Target:** `tracking-proxy.ts:305-340`
**Expected impact:** Avoid sort + array + Set allocation for common case

When all tracked paths are top-level (no dots), the optimization pass is unnecessary. Fast path: if no path contains `.` or `[`, return as-is.

### P2 — Lower Impact

#### 6. Swap sets in `stopProxy` instead of cloning

**Target:** `tracking-proxy.ts:75`
**Expected impact:** Eliminate per-render Set allocation

Instead of `new Set(state.trackedPaths)`, swap the trackedPaths reference with a fresh empty Set and return the old one.

#### 7. Guard `notifyStateChanged` call with local cached boolean

**Target:** `StateContainer.ts:280`
**Expected impact:** Avoid unnecessary function call + count check per emit

Cache `registry.hasStateChangedListeners` in the container instance on subscribe/unsubscribe events. Skip the registry call entirely when false.

#### 8. Lazy prototype check in `isProxyable`

**Target:** `tracking-proxy.ts:23-27`
**Expected impact:** Reduce per-property-access overhead

Cache the prototype check result per constructor, or use a WeakSet of known-proxyable constructors to avoid `Object.getPrototypeOf()` on every nested value access.

---

## Expected Outcome

If P0 + P1 fixes are implemented:

| Operation | Current | Target |
|---|---|---|
| proxy track 20 fields | 11.6x slower | <2x |
| proxy cache reuse | 6.8x slower | <1.5x |
| multi-store coordination | 4.0x slower | <2x |
| proxy track 1 field | 3.0x slower | <1.5x |
| cross-store propagation | 2.0x slower | ~1x |

Geometric mean target: <1.15x (matching Zustand's 1.19x).
