# Investigation: Blac ~3x slower than Zustand-selector on shared-instance, many-consumer updates

## Bottom Line
**Root Cause**: `DirtyChannel#flush` does an O(N) scan over *every* registered subscriber on a shared bloc instance, and per-subscriber the check (closure call → ref deref → `PathSetSpace.intersects`, which allocates a 2-element array and walks two `Set`s) costs several times more than Zustand's per-listener check (plain function call → property read → `Object.is`).
**Fix Location**: `packages/dirtytalk-engine/src/dirty-channel.ts:104-139` (flush loop) and `packages/dirtytalk-structural/src/path-set.ts:41-52` (`intersects`)
**Confidence**: High

## What's Happening
20 (or 100) `<WideFieldConsumer>` components each call plain `useBloc(WideBloc)` against ONE shared `WideBloc` instance. `updateField0()` → `patch({field0:...})` only needs to wake 1 (or 5) of them, but Blac's channel must still iterate ALL N subscribers to find out which ones intersect.

## Why It Happens
**Primary Cause**: Each mounted `useBloc(WideBloc)` registers its own `SubscriberEntry` in `DirtyChannel#subscribers` (`dirty-channel.ts:33`, a `Map<number, SubscriberEntry>`) via `channel.subscribe(() => expandedInterestRef.current, () => force())` (`useBloc.ts:365-368`). A flush is O(N) subscribers regardless of how many actually match.

**Trigger**: `dirty-channel.ts:104` — `Array.from(this.#subscribers.values())` snapshots all N entries every flush; `dirty-channel.ts:109-138` loops all of them, calling each `entry.interest()` thunk and `this.#space.intersects(interest, dirty)`.

**Decision Point**: `path-set.ts:41-52` — `intersects` allocates a fresh 2-element array via `[small, large] = size<=size ? [a,b] : [b,a]` destructuring on **every subscriber, every flush**, then iterates the smaller `Set` doing `.has()` lookups on the larger one. For 19 (or 95) non-matching consumers this per-call overhead (closure invoke, ref deref, branch checks, array literal, Set iteration/lookup) is pure waste — none of them re-render, but all of them pay this cost.

Zustand's equivalent (`useStore(store, selector)`): `setState` iterates a plain `Set`/array of listener functions; each listener re-invokes the user's selector directly against state and does `Object.is` — no interning, no PathId Sets, no array allocation, no extra indirection layer. Roughly 3-4 "ops" per subscriber vs Blac's ~10-15, which lines up with the observed ~3x wall-clock gap (Blac 8.8-9.0ms vs Zustand 2.6-3.0ms).

Container-side cost is NOT the bottleneck: `StructuralContainer.patch` (`container.ts:215-247`) calls `changedPathsFromPatch` which walks only the **patch's own keys** (`diff.ts:159-206`), O(1) for `{field0: n}` — independent of state width (confirmed 20 flat fields in `apps/perf/src/shared/types.ts:81-118`) and independent of consumer count.

**Why nestedPaths (N=4) flips**: the O(N) flush-loop overhead is small in absolute terms at N=4, so Blac's precise per-path skip (avoiding 3 of 4 re-renders) wins outright. At N=20/100 the same overhead, multiplied by a higher per-subscriber constant than Zustand's, dominates and outweighs the benefit of only re-rendering 1-5 consumers.

## Evidence
- **Key File**: `packages/dirtytalk-engine/src/dirty-channel.ts:33,104,109-138` — subscriber Map + O(N) flush loop.
- **Key File**: `packages/dirtytalk-structural/src/path-set.ts:41-52` — per-call array allocation in `intersects`.
- **Key File**: `packages/blac-react/src/useBloc.ts:365-375` — one channel subscription + one `registerConsumerPaths` call per mounted `useBloc`.
- **Key File**: `packages/blac-core/src/core/StateContainer.ts:349-352` — always-on ALL_PATHS "bridge" subscriber, O(1) extra, not the multiplier.
- **Search Used**: `rg "changedPathsFromPatch" diff.ts` — confirmed patch diff walks patch shape only, O(1) here, ruling out container-side width scaling.
- **Prior report**: `reports/perf-opportunities-blac.md` (BR1/BR2) covers `expandWithAncestors`/dep-reconcile overhead — irrelevant here since `WideState` is flat (no dots, ancestor-expansion loop is a no-op).

## Next Steps
1. Reduce per-subscriber flush cost: avoid the array allocation in `PathSetSpace.intersects` (branch-free size check without destructuring).
2. Consider a coarse index (e.g. pathId → interested subscriber ids) so `#flush` can skip non-matching subscribers instead of visiting all N.
3. Benchmark `intersects` in isolation (microbenchmark) to quantify its per-call cost vs a plain `Object.is` selector check.
