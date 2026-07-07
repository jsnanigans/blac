# Recon: useBloc R2/R3/R4

Primary file: `packages/blac-react/src/useBloc.ts` (read whole). All three findings verified against source.

## R2 — Mount gap (passive subscribe, no post-subscribe recheck) — CONFIRMED
- Render reads the snapshot at `useBloc.ts:330` (`bloc.state`); auto-track subscription is created in a **passive** `useEffect` at `useBloc.ts:249-300`. Select-mode seeds `lastSelectionRef` during render at `useBloc.ts:336-341`.
- `dirty-channel.ts:58-70` `subscribe` only registers `{interest, cb, alive}` — **no replay** of accumulated dirt. Emits landing after the render read but before the passive effect runs are lost until the next *intersecting* emit.
- Note: the `useLayoutEffect` at `:380` runs before paint but only refreshes interest/skeleton; it never calls `force()`, so it does not close the gap.
- Fix options: (a) after `channel.subscribe(...)`, recheck and `force()` if state advanced — but auto-track needs a *path* check, not `Object.is(state)`, so this needs a container version/emit counter; (b) adopt `useSyncExternalStore` for the wake signal (getSnapshot = version counter) keeping the path proxy for interest. Select-mode needs `useSyncExternalStoreWithSelector` (getSnapshot returns array → must cache-compare or it loops). Recommend (b).

## R3 — Ref-count leak from divergent memo vs. resolved key — CONFIRMED
- Acquire (`countRef:true`, `refId=useBloc@<consumerId>`) in `useMemo` at `useBloc.ts:184`, memo keyed `[BlocClass, ownArgsKey, providerArgsKey]` at `:224`, where keys are `JSON.stringify(args)` (`:134,:141`) — **order-dependent, all fields**.
- Release effect keyed `[bloc, instanceKey]` at `:308-320`; `instanceKey` = `resolvedKey` from `resolveInstanceKey` (`:181,:220`), which routes to `static key(args)` or `structuralKey` (**sorted keys, identity-only**) — `acquire.ts:37-42`, `structural-key.ts:16-40`.
- Divergence: with a `static key` that ignores non-identity fields, or a key-order flip, the memo re-runs (JSON differs) while `resolvedKey`/`bloc` stay the same. Re-run re-acquires same `refId` → `entry.refs.set(refId, count+1)` at `StateContainerRegistry.ts:317-319`. Release decrements by 1 (`:462-468`), so one unmount leaves count ≥ 1 → `refs.size` never hits 0 → never disposed. Leak confirmed.
- Surgical fix (preferred over a last-key ref): compute `resolvedKey` in the render body (pure — `resolveKey` has no side effects) and use it as the memo dep → memo re-runs iff `resolvedKey` changes, matching the release effect. Kills divergence, concurrent-safe.

## R4 — Ownership acquired during render leaks on abandoned renders — CONFIRMED
- Primary acquire (`countRef:true`) runs in `useMemo` (render phase) at `useBloc.ts:184`. Dep acquire (`countRef:true`) runs inside `.track()` during JSX at `useBloc.ts:596-603` (guarded by session/`depSubsRef`). Note the resolver already `ensure`s (no ref) at `:567`; the `:597` acquire is a *separate* ownership ref.
- Release for both is in effects/cleanup only (`:308-320`, reconcile `:414-421`, unmount `:453-465`). React can render without committing (concurrent tearing, Suspense, offscreen, StrictMode discards) → acquire with no paired cleanup → leak. StrictMode's mount→unmount→mount happens to balance it.
- Fix: render should only `ensure` (create, `countRef:false`); take the ownership ref in `useLayoutEffect` (release already there). For deps, drop the `:597` acquire and let reconcile pass-2 (`:423-445`) take the ref when it first sees the dep.

## Fix strategy fork — RECOMMENDATION
**R3 and R4 are NOT independent in the deep sense: the R4 fix subsumes R3.** Once ownership `countRef` moves out of the memo into an effect keyed on `[bloc, instanceKey]`, memo re-runs only `ensure` (no ref), so a JSON-key flip can no longer double-count — R3's leak vanishes with no separate change.

Two viable plans:
- **Option A (minimal, keep acquire in render):** Fix R3 alone via resolvedKey-as-memo-dep (~3-line change, near-zero blast radius, concurrent-safe). Leaves R4's abandoned-render leak unaddressed.
- **Option B (unified, recommended):** Move ALL ownership acquisition to effects — primary `ensure`-in-memo + acquire in a new `useLayoutEffect`; deps acquire in reconcile pass-2. Fixes R4 and makes R3 moot. Blast radius: memo return, one new layout effect, reconcile pass-2, and the `:596` double-acquire guard. Concurrent-correct.

Recommendation: **Option B.** The codebase already targets concurrent React (per-render proxy, `trackedStateRef` cleared in layout effect, scheduling comments). Fixing R3 in isolation (Option A) leaves a real R4 leak and would be partly rewritten by B later. One caveat for B: `ensure` leaves the instance at 0 refs until the layout effect runs — use `useLayoutEffect` (sync, pre-paint) to minimize the window; this matches the existing dep-ensure pattern.

**R2 vs R3/R4 interaction:** Largely orthogonal. `useSyncExternalStore` replaces the wake path (`:234` reducer + `:249` effect) but not acquire/release ownership. It shares only `channel.subscribe`. It composes cleanly with Option B (bloc identity is available at render via `ensure`). No blocking conflict; sequence R3/R4 first, then R2.

## Affected tests (extend, do not rewrite)
React (`packages/blac-react/src/__tests__/`):
- `useBloc.track-lifecycle.test.tsx`, `useBloc.lifecycle-edge-cases.test.tsx` — mount/unmount, R4.
- `useBloc.shared-instances.test.tsx`, `useBloc.instance-isolation.test.tsx`, `useBloc.args.test.tsx` — ref-count/key identity, R3 (add: non-identity arg flip + `static key` retains single ref across re-render).
- `useBloc.stress.test.tsx` — leak-under-churn, R3/R4.
- `useBloc.cross-bloc-react.test.tsx`, `useBloc.cross-bloc-edge-cases.test.tsx` — dep acquire/release, R4 deps.
- `useBloc.select.test.tsx`, `useBloc.test.tsx`, `useBloc.auto-track-optimization.test.tsx` — R2 mount-gap (emit between render and effect); add select-mode gap case.
- `BlocProvider.test.tsx` — provider-arg keyed acquisition.

Core (`packages/blac-core/src/core/`):
- `StateContainerRegistry.refcount.test.ts`, `StateContainerRegistry.args-release.test.ts`, `StateContainerRegistry.keying.test.ts` — acquire/release symmetry; add same-`refId` double-acquire→single-release residual-count assertion.
