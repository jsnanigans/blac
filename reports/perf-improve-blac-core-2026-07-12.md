# Investigation: Still-open re-render/emit hot-path perf in @blac/core

## Bottom Line
**Root Cause**: The emit→diff→notify→consumer-recompute fan-out still pays two
avoidable per-subscriber costs (array alloc in `intersects`, O(N) flush scan) and
an eager clone in `deepMerge`; the shipped easy-wins (BC1, BR2/BR3, PN1) do not
touch these.
**Fix Location**: `path-set.ts:46`, `dirty-channel.ts:104`, `container.ts:434`
**Confidence**: High

## What's Already Landed (do NOT re-propose)
BC1 lazy `buildContext` (`PluginManager.ts:308,341` — `ctx ??=`), BR2/BR3
(`d65c0885`), PN1 empty-operand union fast-path (`path-set.ts:16-17`), no-consumer
patch skip (`71c17817`), lazy flush error array. `deepMerge` lazy-clone
(`plans/patch-emit-redundant-diff-clone.md`) is STILL open — code at
`container.ts:434` still spreads `{...target}` unconditionally.

## Findings (ranked impact ÷ risk)

**F1 — `intersects` allocates a 2-element array per subscriber per flush** — TOP
`packages/dirtytalk-structural/src/path-set.ts:46-49`. The `[small,large] = …?[…]:[…]`
destructuring allocates on EVERY subscriber on EVERY flush; cost = O(subscribers ×
flushes). Fix: pick the smaller Set into two locals with a plain `if` (no array
literal, no destructure). Effort S, risk very-low, behavior identical. This is the
per-consumer fan-out multiplier called out in `rerender-wide-many-consumers-vs-zustand.md`.

**F2 — `deepMerge` clones `{...target}` before knowing anything changed**
`packages/dirtytalk-structural/src/container.ts:434-455`. On every `patch()` the
full target is spread even for a no-op / 1-of-N-field change; clone is discarded
when `changed===false`. Fix: lazily materialize `out` on first changed key, return
`target` otherwise (plan already written: `patch-emit-redundant-diff-clone.md`,
Option B). Effort S/M, risk low-med (must keep the "same-ref on no-op" invariant
that `StateContainer.patch:510` + channel skip rely on). Scales with state width.

**F3 — `DirtyChannel#flush` is O(N-subscribers) regardless of match count**
`packages/dirtytalk-engine/src/dirty-channel.ts:104-139`. `Array.from(subscribers)`
allocates every flush, then every subscriber's `interest()` thunk + `intersects`
runs even when only 1 of N matches. On a shared bloc with many `useBloc` consumers
this is the dominant cost (~3x Zustand). Fix: coarse inverted index `pathId →
Set<subscriberId>` so flush visits only matched subs + always-visited ALL_PATHS
subs (the StateContainer bridge + plugin bridge). Effort L, risk med (incremental
index upkeep on interest change; must preserve mid-flush subscribe/unsubscribe
snapshot semantics). Highest ceiling; do after F1/F2.

**F4 — Registry re-acquire dev-warn double-stringifies args**
`packages/blac-core/src/core/StateContainerRegistry.ts:316-317`. Every re-acquire
of an existing keyed entry recomputes `structuralKey(args)` AND
`structuralKey(entry.args)` (both `JSON.stringify` w/ replacer) purely for a
dev-warn. Fix: cache the stored key's `structuralKey` on the `InstanceEntry`;
compare against one fresh stringify. Effort S, risk low. Dev-only (StrictMode
remount churn), not prod-hot.

**F5 (flag, design decision) — `applyState` runs full `_equalityFn` scan every emit**
`StateContainer.ts:536`. `shallowEqualState` (Object.keys + per-key Object.is)
runs unconditionally on every `emit()`, even when the caller built a fresh object.
Only safe lever is an opt-in `emit(next,{skipEqualityCheck})` — public surface, needs
maintainer sign-off. Do not patch blindly.

**F6 (flag, needs API) — `watch()` installs a global `disposed` listener per target**
`packages/blac-core/src/watch/watch.ts:277-285` (BC2). Each target's listener fires
on EVERY app-wide dispose (`container !== instances[i]` check); cost O(watchers ×
app disposals). Needs a per-instance dispose hook or class-scoped dispatch — API
design, not a drop-in.

## Test Gates That Constrain Changes
`packages/blac-core/src/core/StateContainer.perf.test.ts`: (a) 100 sync patches →
ONE channel flush → one listener call (coalescing must survive F3); (b) `stateChanged`
is microtask-deferred + batched in order (F3 must keep bridge ALL_PATHS subscriber
firing); (c) no callback fires for a no-op flush (F1/F2 must keep no-op → empty
dirty set → skip). Do NOT reintroduce a shared per-consumer proxy cache.

## Next Steps
1. Ship F1 (branch-free `intersects`) — smallest, safe, multiplies across fan-out.
2. Ship F2 via the existing lazy-clone plan; add the reference-identity tests first.
3. Prototype F3 inverted index behind the perf bench; measure before committing.
4. F4 as a dev-only micro-win; raise F5/F6 with maintainer before any code.
