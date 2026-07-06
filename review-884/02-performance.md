# Performance

Ordered by expected real-world impact. Line refs point at the hot statement.

## P1 · Single-consumer skip inverts the cost tradeoff

`packages/dirtytalk-structural/src/container.ts:141-145`

With ≤1 registered consumer, `emit` skips the skeleton diff and marks `ALL_PATHS`. The saved diff is a handful of `getAt` + `Object.is` per skeleton path — microseconds. The cost is that the sole consumer **re-renders on every state change** even when nothing it read changed; a React component render (plus reconciliation) is orders of magnitude more expensive than the diff. Single-consumer blocs are the *common* case (one component per feature bloc), so the "optimization" pessimizes the majority. It's also the enabling condition for R1's safety at size ≤1 — fixing R1 with a root-mark makes it safe to always diff when ≥1 consumer has real paths.

**Suggestion:** diff whenever the skeleton is non-empty; keep `ALL_PATHS` only for the zero-consumer case (where nothing wakes anyway except raw subscribers, which need the R1 root-mark regardless).

## P2 · `PluginContext` rebuilt per plugin per flush

`packages/blac-core/src/plugin/PluginManager.ts:297-311, 326-340, 351-436`

`dispatchStateChange` calls `this.buildContext(container)` **inside the per-plugin loop** — an object with ~15 closure-allocating methods, per plugin, per container flush. With devtools + logging + persist installed and a busy container, that's 45 nontrivial allocations per microtask flush. `notifyPlugins` does the same per lifecycle event. The context is identical for every plugin in a dispatch (it varies only by container).

**Fix:** hoist `buildContext(container)` out of the loop (one per dispatch); better, cache per-container contexts in the existing `containerBridges` WeakMap entry — the code comment argues per-dispatch creation "sidesteps the lifetime question", but the bridge already has exactly the right lifetime.

## P3 · Dep `.track()` pays `JSON.stringify` on every tracked getter read, every render

`packages/blac-react/src/useBloc.ts:564-572`, `packages/blac-core/src/utils/structural-key.ts:17`

`makeDepWrapper.resolve()` runs `registry.resolveKey` → `structuralKey(args)` → `JSON.stringify` with a sort-and-copy replacer for every object node — on **every** `.track()`/`.untracked()` call. A getter chain touched during render invokes this once per dep per render; with args of any size this is the most expensive thing in the render-path proxy machinery. `registry.ensure` → `acquire` then re-derives config and re-checks maps.

**Fix:** cache `args → key` per wrapper (args are usually the same `defaultArgs` reference — a single-entry identity cache eliminates ~all calls); skip the dev-mode arg-mismatch `structuralKey` re-hash in `acquire` when the entry was found by an identical key.

## P4 · `expandWithAncestors` recomputed every commit even when paths are unchanged

`packages/blac-react/src/useBloc.ts:380-397, 682-705`

The layout effect runs after **every** render of every auto-track consumer and rebuilds the expanded interest: per leaf, `interner.lookup` + repeated `lastIndexOf`/`slice` + `internAncestor`. `registerConsumerPaths` has a `pathSetEquals` fast path, but the expansion runs unconditionally before/alongside it. Steady-state renders (same paths as last commit — the overwhelmingly common case) pay full string-walk cost.

**Fix:** keep the previous leaf `PathSet`; if `pathSetEquals(prev, current)`, reuse the previous expanded set. Same for the dep loop (`useBloc.ts:424-427` recomputes per dep per commit).

## P5 · Skeleton recompute is O(consumers × paths) per registration → O(N²) mount storms

`packages/dirtytalk-structural/src/container.ts:206-216, 236-240` (flagged in-code as future work)

Every `registerConsumerPaths`/`unregisterConsumer` unions **all** consumers' sets from scratch. Mounting a list screen with N consumers of one bloc does N registrations × O(N·paths) each. Unmount storms likewise. Incremental union (refcount per path id) turns this into O(paths changed).

## P6 · R7 fallout: stuck `stateChanged` gate makes every emit allocate + queue

See R7. Once the listener count is wedged >0, every `emit`/`patch` on **every** container allocates the `[container, prev, next]` tuple, possibly the pending array, and schedules a microtask — forever, app-wide. Worth fixing for the perf floor even if the double-subscribe pattern is rare.

## P7 · `BlocProvider` remounts context value every render

`packages/blac-react/src/BlocProvider.tsx:72-77`

`args` is typically an inline object literal, so the `useMemo([parentMap, bloc, args])` re-runs every provider render → new `Map` → context change → **every** descendant `useBloc` re-renders (context read at `useBloc.ts:137`), regardless of whether the args are structurally identical. Nested providers compound (each rebuilds when the parent map identity changes).

**Fix:** key the memo on a structural key of `args` (`JSON.stringify`/`structuralKey`) instead of identity, or store a stable ref-map and only replace the entry when the key changes.

## P8 · Per-instance subscription bookkeeping duplicated across four layers

Every state change fans out through: (1) `StructuralContainer.emit` equality + diff, (2) `StateContainer._equalityFn` (shallow compare of the full state — `StateContainer.ts:536`), (3) channel flush interest checks, (4) registry `notifyStateChanged` queue, (5) plugin `ALL_PATHS` bridge. Layers 2 and 1 both do (different) equality work; layers 4 and 5 both exist to tell observers "state changed". For a hot bloc this is 2 equality passes + 2 notification queues per emit. Consolidation is A3's subject; the perf angle: default `shallowEqualState` walks all top-level keys on every emit even when the reference changed and the diff will re-walk the skeleton anyway.

## P9 · `onSystemEvent` as an instance arrow-function field

`packages/blac-core/src/core/StateContainer.ts:719`

Allocated per instance (it's a class property, not a prototype method) — presumably for destructuring safety, but nothing in-repo destructures it. Trivial per-instance overhead + defeats prototype sharing; make it a normal method unless the bound form is a deliberate API guarantee.

## P10 · Query helpers allocate on read paths

`StateContainerRegistry.ts:583-624`: `getRefCount`/`hasInstance` call `ensureInstancesMap`, *creating* the WeakMap bucket for types never instantiated; `getInstancesMap` returns `new Map()` for misses (allocation per call in polling devtools). `getRefIds` at `PluginManager.ts:424-434` is an O(all types × all instances) scan per call — fine for a debug panel, but it's exposed on the hot plugin context; document it as O(n) or index by id.
