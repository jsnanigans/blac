# Investigation: Pure-state Blac ops 1.3x-4x slower than Zustand/RTK

## Bottom Line
**Root Cause**: `.state` and getters are already zero-cost (no proxy, confirmed) — the gap is entirely on the *write* side: every `patch()`/`emit()` call pays for 3-5 stacked bookkeeping layers (redundant key-enumeration, a full shallow-equality scan, dev-only rate-limit check, pending-change capture, registry hooks) wrapped around a Zustand-equivalent clone, even with zero subscribers.
**Fix Location**: `packages/blac-core/src/core/StateContainer.ts:472-525` (`patch`) and `:527-558` (`applyState`/`emit`); `packages/dirtytalk-structural/src/container.ts:215-247` (`patch`) and `:429-455` (`deepMerge`)
**Confidence**: High

## What's Happening
`bloc.state` and class getters are plain property access with no proxy/interception anywhere in the pure-state path (verified: no `new Proxy` on `Cubit`/`StateContainer` instances, `StructuralContainer.state` is `return this._state`) — so read-side ops ("proxy track *", "getter track *") are not paying for tracking machinery. The slowdown is that every mutation (`patch`/`emit`) walks through StateContainer's override, then StructuralContainer's override, before reaching a Zustand-equivalent merge, and each layer re-derives information the layer above/below it already computed.

## Why It Happens

**Mechanism 1 — Redundant key enumeration + full-object clone per patch (dominant, explains the biggest gaps)**
- `StateContainer.patch` (`StateContainer.ts:478`) does `Object.keys(partial)` once to get `partialKeys`, then a `for` loop over them doing `Object.is` pre-checks (`:490-500`).
- It then calls `super.patch(partial)` → `StructuralContainer.patch` (`container.ts:215-247`), which **re-enumerates** the same object with a `for...in` emptiness check (`:217-220`), then calls `deepMerge` (`:429-455`), which does `Object.keys(target)` via `{...target}` spread (full shallow clone of *every* field, not just the patched ones — `:434-436`) plus a *third* `Object.keys(patch)` loop (`:442`).
- Net: for a 1-key patch on a 20-field object (`WideBloc`), 20 fields get copied and the small patch object's keys get walked 3 separate times, across two class layers, before any subscriber work happens.
- Explains: **multi-store coordination** (3 patches/iter), **cross-store propagation** (2 patches/iter), **batch rapid updates**, **derived state computation**, **proxy track 1 field**, **proxy track 20 fields**/**proxy cache reuse** (their setup loop patches `wide` too, even though the labeled read itself is cheap).

**Mechanism 2 — Full shallow-equality scan on every `emit()`, unconditionally**
- `StateContainer.applyState` (`:527-558`, used by `Cubit.emit`) calls `this._equalityFn(prev, next)` (`:536`) which defaults to `shallowEqualState` (`config.ts:56-76`): `Object.keys(prev)` + `Object.keys(next)` + a per-key `Object.is` loop — run even though the caller just constructed a brand-new object that is *known* to differ (every benchmark op does `emit({...new literal...})`). Zustand's `set()` has no such default equality gate.
- Explains: **getter track simple/multiple** (`getter.emit({count:i})` each iter), **proxy change detection hit** (`counter.emit({count:i})`).

**Mechanism 3 — Dev-only per-call overhead not eliminated at the call site**
- `_checkEmitRate()` (`StateContainer.ts:762-786`) is guarded by `process.env.NODE_ENV !== 'production'` at *each* `patch`/`emit` call (`:503`, `:538`) rather than hoisted/dead-code-eliminated, so every call pays a function-call + `Date.now()` + branch even though the benchmark explicitly raises the limit to `Infinity` (`pure-state.ts:7`) specifically to try to neutralize this — the guard itself isn't free, only the warning path is skipped.
- Adds a fixed per-call tax on top of Mechanisms 1 & 2 for every op in the file (all use `patch`/`emit` in a 1000x loop).

**Mechanism 4 — Pending-change + registry bookkeeping layered per call**
- Both `patch` and `applyState` unconditionally do: `this.state` read (cheap) + `Object.is(prev,next)` + hydration-status branch + `_pendingChange` object touch (`:516-520`/`:547-551`) + `this._registry.hasStateChangedListeners` check (`:522-524`/`:555-557`, cheap boolean but still a property chase through `_registry`). None of this exists in Zustand's `set`. Individually cheap, but stacks with Mechanisms 1-3 on every single call in a 1000-iteration loop.

**Confirmed NOT a cost mechanism (ruled out)**:
- `.state` getter: `container.ts:129-131`, plain `return this._state` — no Proxy.
- Getters (`get doubled()`): plain prototype accessors, no instance-level Proxy wraps `Cubit`/`StateContainer` (`rg "new Proxy"` in `blac-core/src` and `dirtytalk-structural/src` hit only `tracker.ts:545`, which only runs from React's `trackRender`, never called by `pure-state.ts`).
- Structural diffing (`diffAlongSkeleton`/`changedPathsFromPatch`): both `emit` (`container.ts:170-174`) and `patch` (`container.ts:235-238`) have an explicit **zero-consumer skip** that short-circuits straight to `ALL_PATHS` — confirmed these ops never register via `registerConsumerPaths`, so the diff engine is correctly bypassed. The always-on channel-bridge subscriber (`StateContainer.ts:349-352`) uses plain `channel.subscribe`, which does **not** count toward `_consumerPaths.size`, so it doesn't defeat this skip.
- `DirtyChannel.mark`/flush: `dirty-channel.ts:54-69` — `mark()` is O(1) (`Space.union` on the `ALL_PATHS` sentinel is a symbol-identity check, `path-set.ts:13`), and the actual flush is deferred to a microtask (never runs inside the synchronous 1000-iteration loop), so it isn't counted in the measured wall time for ops with 0-3 subscribers. The `DirtyChannel`/`path-set.ts` per-subscriber `intersects()` cost is real for "multi-store coordination"/"batch rapid updates" (3 and 1 live subscribers respectively) but is the mechanism already documented in the separate DirtyChannel-fan-out investigation — not re-derived here.

## Evidence
- **Key File**: `packages/blac-core/src/core/StateContainer.ts:472-525` — `patch()` layering (Object.keys, allEqual loop, `_checkEmitRate`, `super.patch`, second `this.state` read, pendingChange, registry check).
- **Key File**: `packages/dirtytalk-structural/src/container.ts:429-455` — `deepMerge` full-object spread clone + separate `Object.keys(patch)` loop, invoked on every `patch()` regardless of subscriber count.
- **Key File**: `packages/blac-core/src/config.ts:56-76` — `shallowEqualState`, the default equality fn run on every `emit()`.
- **Search Used**: `rg "new Proxy" packages/blac-core/src packages/dirtytalk-structural/src` — only hit is `tracker.ts:545` (React-only `trackRender`), confirming no instance/state proxy exists in the pure-state path.
- **Search Used**: `rg "hasStateChangedListeners"` — confirms it's a cheap `> 0` boolean check (`StateContainerRegistry.ts:107-109`), ruling it out as a major cost.

## Next Steps
1. Add a true zero-consumer/zero-listener fast path in `StructuralContainer.patch`/`deepMerge` that mutates-and-marks without the full `{...target}` clone when only shallow top-level keys changed (or at minimum, stop re-enumerating `partial`'s keys three times across two classes for the same call).
2. Skip `shallowEqualState` when the caller can't possibly be passing back the same reference/shape cheaply, or make the default equality a cheap `Object.is`-only check with shallow compare opt-in (documented as `configureBlac({ equality })`).
3. Ensure `process.env.NODE_ENV` checks in `_checkEmitRate` are eliminated by the production build (verify the perf app's bundler actually defines/inlines `NODE_ENV==='production'` so dead-code elimination removes the branch and the call it guards — the perf benchmarks may be running in dev mode).
