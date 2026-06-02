---
task: 11-react-tests-per-consumer
phase: 5
parallel_safe: false
model: opus
effort: high
depends_on:
  - 09-active-tracker-per-consumer
files:
  - packages/blac-react/src/__tests__/*
  - packages/blac-react/src/useBloc.ts (only if a real impl bug surfaces)
  - packages/blac-adapter/src/index.ts (only if a real impl bug surfaces)
  - packages/blac-core/src/tracking/*.ts (only if a real impl bug surfaces)
---

# 11 — Align `@blac/react` tests with per-consumer tracker design

## Context

Task 09 (`70e5fb11`) replaced the shared `blocProxyCache` + `activeTrackerMap` with per-consumer proxies that each close over their own `GetterState`. **This is the intentional, desired design**: each `useBloc` consumer tracks only the state/getters that _it_ uses and re-renders only when those change — independent of other consumers of the same bloc.

After task 09, `pnpm --filter @blac/react test` reports 38 failures across 11 files. They are not all regressions in the old sense — many encode behaviors of the old shared-proxy model that are no longer the spec. This task aligns the test suite (and any real impl gaps) with the per-consumer ground truth.

## Triage (pre-categorized)

| Category                                | Count | Disposition                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Proxy-identity assertions**        | 11    | Test bug. Per-consumer proxies are intentionally distinct. Rewrite to compare the **raw bloc instance** (via `BlacInstanceRegistry.get(BlocClass, instanceId)` or similar) instead of comparing return values of two `useBloc` calls.                                                                                                 |
| **B. Single-consumer getter re-render** | 16    | These assert that one consumer accessing a getter re-renders when that getter's value changes. Per-consumer design preserves this — same-consumer re-render is exactly what the design enables. **If they fail, it's a real impl bug; root-cause and fix in `tracking-proxy.ts` / `adapter/index.ts`.** Do not rewrite the assertion. |
| **C. Cross-bloc / external deps**       | 8     | Same as B for the consumer that depends on the external bloc — the test's consumer should still re-render when its `depend()`-resolved external bloc changes. **Real impl bug; root-cause and fix.** Do not rewrite away.                                                                                                             |
| **D. Filtered-list (getter value)**     | 3     | Same as B — a consumer reading a derived list-getter should re-render when the underlying state changes. **Real impl bug; root-cause and fix.**                                                                                                                                                                                       |

**Rule of thumb:** if the test asserts behavior _of a single consumer's view of its own state/getters_, that behavior MUST still hold under per-consumer design — root-cause any failure and fix in impl. If the test asserts cross-consumer identity or assumes a shared tracker, rewrite the test.

For each failing test, list the file + name in the completion block with chosen disposition (rewrote test / fixed impl) and a one-line justification.

## Failing test inventory

(From `pnpm --filter @blac/react test`, post-`70e5fb11`.)

### A — Rewrite tests (proxy identity → raw identity)

- `BlocProvider.test.tsx`:
  - `two descendants under the same provider share the same instance`
  - `numeric instanceId on the provider is coerced to string`
- `useBloc.test.tsx`:
  - `should share instance across multiple hooks (default shared)`
  - `should share instance with same custom ID`
- `useBloc.shared-instances.test.tsx`:
  - `two components using same class get the same instance`
- `useBloc.instance-isolation.test.tsx`:
  - `numeric instanceId is coerced to string — same as the string version`
  - `instanceId: undefined falls back to the default key`
- `useBloc.stress.test.tsx`:
  - `parent and child both calling useBloc — both get the same correct instance`
- `useBloc.autoInstance.test.tsx`:
  - `without autoInstance and without isolated, siblings share the default instance`
  - `explicit instanceId beats autoInstance`
  - `explicit instanceId beats static isolated`

**Rewrite pattern:**

```ts
// OLD
expect(blocA).toBe(blocB);

// NEW — assert raw instance identity (the contract that should hold)
import { BlacInstanceRegistry } from '@blac/core';
// (use whatever public API the codebase already exposes to look up the raw
//  instance by class + instanceId; if none, grep the existing test utilities
//  in packages/blac-react/src/__tests__/ for the canonical pattern.)
const raw = BlacInstanceRegistry.get(CounterCubit, 'shared');
expect(raw).toBe(/* the same raw across both consumers */);
```

If the test doesn't have access to a registry lookup, an alternative is to compare a `bloc.constructor === bloc.constructor` (always true) plus assert via _behavior_ (e.g., both consumers observe the same `state` value after an update) rather than via `===`. Prefer the registry lookup if available — it's the most direct assertion of the actual invariant.

### B/C/D — Investigate impl; root-cause and fix

These tests assert per-consumer re-render correctness and should still pass under per-consumer design. Failing means there's a real bug in the wiring. **Do not rewrite these tests.**

Use targeted diagnostic logging (e.g. instrument `autoTrackSnapshot`, `disableGetterTracking`, `hasGetterChanges`, the proxy's `get` trap) to identify where the chain breaks. Likely suspects, in order:

1. `commitTrackedGetters` is called at the START of every `autoTrackSnapshot` (`adapter/index.ts:316`) AND in `disableGetterTracking` (`adapter/index.ts:disableGetterTracking`). The useEffect that calls `disableGetterTracking` has stable deps so it only fires once on mount. After the first state-change re-render, `trackedGetters` may be emptied at snapshot-start with no second commit to repopulate it before the next subscriber callback runs. → If confirmed, fix by moving the commit point or running it post-render reliably.

2. `tracker.isTracking` lifecycle: set in `autoTrackSnapshot`, cleared in `disableGetterTracking`. Same issue — useEffect only runs once. After the first re-render, `isTracking` stays `true` indefinitely. May or may not be a real bug depending on whether the proxy's tracking outside render is harmful.

3. `ExternalDepsManager.updateSubscriptions` is wired in a useEffect that only fires once on mount (`useBloc.ts:218–226`). Dynamically-accessed external deps (added/removed between renders) won't re-establish subscriptions. → If confirmed, move `updateSubscriptions` to fire on every render (with a stability guard inside the manager to avoid re-subscribing unchanged deps).

4. `hasGetterChanges` mutates `trackedValues` to the new value before returning, so two callbacks in a row won't double-fire. Verify no off-by-one with re-renders.

Use `pnpm --filter @blac/react test -- <file>` to iterate on one file at a time. Don't run the full suite each iteration.

## Implementation plan

1. **Round 1 — rewrite A (11 tests).** Find the raw-instance lookup pattern (grep test utilities). Rewrite all 11 identity assertions in one sweep. Run `pnpm --filter @blac/react test` and verify exactly the 11 A-category tests now pass.
2. **Round 2 — investigate B/C/D.** Pick one representative failure from each subgroup. Instrument with `console.log` around tracker lifecycle events. Run the single test, read logs, identify the breakage point.
3. **Round 3 — fix impl.** Apply the minimal fix(es) needed. Keep per-consumer design intact. Re-run targeted tests.
4. **Round 4 — verify.**

   ```sh
   pnpm --filter @blac/core typecheck
   pnpm --filter @blac/core test
   pnpm --filter @blac/adapter typecheck
   pnpm --filter @blac/adapter test
   pnpm --filter @blac/react typecheck
   pnpm --filter @blac/react test
   pnpm --filter @blac/preact typecheck
   pnpm --filter @blac/preact test
   ```

   All four packages should be green. (For this task only, full-suite `pnpm test` per package is authorized — same as task 10.)

5. **Commit.** Single commit, message:

   ```
   fix(react): align useBloc tests + tracker lifecycle with per-consumer design
   ```

   Body: "After 70e5fb11 each useBloc consumer owns its own proxy and getter
   state. Tests that compared two consumers' proxy references now compare the
   underlying raw bloc instance. Tracker/subscription lifecycle bugs that the
   refactor exposed (commitTrackedGetters timing, updateSubscriptions
   re-subscription) are fixed so single-consumer getter and external-dep
   re-renders work as designed."

   No `[ticket]` prefix. No Claude co-author. No `--no-verify`.

## Checklist

- [ ] All 11 A-category tests rewritten with raw-instance comparison.
- [ ] B/C/D tests root-caused and fixed at impl layer (no test rewrites for these).
- [ ] All four packages typecheck.
- [ ] `pnpm --filter @blac/react test` passes (0 failures).
- [ ] `pnpm --filter @blac/preact test` passes (0 failures).
- [ ] `pnpm --filter @blac/core test` and `pnpm --filter @blac/adapter test` still pass.
- [ ] Completion block filled in, staged in the same commit.

## Completion

**Commit SHA:** _placeholder — see git log_

**Files touched:**

- `packages/blac-adapter/src/index.ts` — tracker lifecycle (snapshot + disable).
- `packages/blac-core/src/tracking/tracking-proxy.ts` — `commitTrackedGetters` semantics.
- `packages/blac-core/src/tracking/getter-tracker.test.ts` — updated unit test to match new commit semantics.
- `packages/blac-react/src/useBloc.ts` — moved post-render effect from one-shot to per-commit.
- `packages/blac-react/src/__tests__/BlocProvider.test.tsx` — 2 identity tests rewritten.
- `packages/blac-react/src/__tests__/useBloc.autoInstance.test.tsx` — 3 identity tests rewritten.
- `packages/blac-react/src/__tests__/useBloc.instance-isolation.test.tsx` — 2 identity tests rewritten.
- `packages/blac-react/src/__tests__/useBloc.shared-instances.test.tsx` — 1 identity test rewritten.
- `packages/blac-react/src/__tests__/useBloc.stress.test.tsx` — 1 identity test rewritten.
- `packages/blac-react/src/__tests__/useBloc.test.tsx` — 2 identity tests rewritten.
- `packages/blac-preact/src/__tests__/useBloc.test.tsx` — 2 identity tests rewritten (preact mirror of Category A).

**Tests rewritten (Category A — 11 react + 2 preact):**

Each pre-existing assertion `expect(blocA).toBe(blocB)` compared two `useBloc`
consumers' _proxy_ references, which under the per-consumer design are
intentionally distinct. The rewrite swaps the contract to identity of the
underlying raw bloc (via `borrow(BlocClass, instanceId)` from `@blac/core`)
combined with a behavioural assertion (mutate via raw, both consumer proxies
observe the new state, and `blocA.state === blocB.state` — proving they
forward to the same target).

- `BlocProvider.test.tsx > two descendants under the same provider share the same instance` — raw lookup via `borrow(CounterCubit, 'shared')`.
- `BlocProvider.test.tsx > numeric instanceId on the provider is coerced to string` — raw lookup via `borrow(CounterCubit, '7')`.
- `useBloc.test.tsx > should share instance across multiple hooks (default shared)` — raw lookup via `borrow(CounterBloc)`.
- `useBloc.test.tsx > should share instance with same custom ID` — raw lookup via `borrow(CounterBloc, 'shared-counter')`.
- `useBloc.shared-instances.test.tsx > two components using same class get the same instance` — raw lookup via `borrow(SharedBloc)`.
- `useBloc.instance-isolation.test.tsx > numeric instanceId is coerced to string — same as the string version` — raw lookup via `borrow(IsoBloc, '1')`.
- `useBloc.instance-isolation.test.tsx > instanceId: undefined falls back to the default key` — raw lookup via `borrow(IsoBloc)`.
- `useBloc.stress.test.tsx > parent and child both calling useBloc — both get the same correct instance` — raw lookup via `borrow(CounterBloc)`.
- `useBloc.autoInstance.test.tsx > without autoInstance and without isolated, siblings share the default instance` — raw lookup via `borrow(SharedCubit)`.
- `useBloc.autoInstance.test.tsx > explicit instanceId beats autoInstance` — raw lookup via `borrow(SharedCubit, 'pinned')`.
- `useBloc.autoInstance.test.tsx > explicit instanceId beats static isolated` — raw lookup via `borrow(IsoCubit, 'shared')`.
- `(preact) useBloc.test.tsx > should share instance across multiple hooks (default shared)` — preact mirror.
- `(preact) useBloc.test.tsx > should share instance with same custom ID` — preact mirror.

**Impl fixes (Categories B/C/D — 26 tests):**

Root cause was a per-consumer-tracker lifecycle mismatch the task-09 refactor
exposed. The previous shared-tracker model implicitly re-committed across
consumers, masking three subtler bugs:

1. **`packages/blac-react/src/useBloc.ts`** (the post-render effect, formerly
   lines 218–226) — the effect that called `disableGetterTracking` and
   `ExternalDepsManager.updateSubscriptions` had a stable dep array
   (`[adapterState, rawInstance, forceUpdate]`), so it fired only on mount.
   After the first state-change re-render `trackedGetters` was never
   re-committed and `updateSubscriptions` never re-synced — single-consumer
   getter re-renders silently stopped working and dynamically-added external
   deps never re-subscribed. **Fix:** drop the dep array entirely so the
   effect runs on every commit. Both inner calls are idempotent
   (`updateSubscriptions` shallow-diffs the dep set; `disableGetterTracking`
   is guarded — see fix #2).

2. **`packages/blac-adapter/src/index.ts` (`autoTrackSnapshot`)** — the
   original snapshot called `commitTrackedGetters` at its top, which moved
   `currentlyAccessing` into `trackedGetters`. But `useSyncExternalStore`
   calls `getSnapshot` _multiple_ times per render attempt, and the second
   call (with `currentlyAccessing` already cleared by the first) wiped
   `trackedGetters` to ∅ before the post-render commit ran. **Fix:** stop
   committing at snapshot time. Instead, only flip
   `isTracking` from false→true on the _first_ call after a post-render
   commit, and clear `currentlyAccessing` only on that transition. Subsequent
   in-render snapshots are no-ops for tracker state, preserving the accesses
   recorded by the render itself.

3. **`packages/blac-adapter/src/index.ts` (`disableGetterTracking`) +
   `packages/blac-core/src/tracking/tracking-proxy.ts`
   (`commitTrackedGetters`)** — React StrictMode runs `useEffect`
   setup → cleanup → setup for one logical commit; with the new
   per-commit effect (fix #1) the second setup fires with no intervening
   render, so `currentlyAccessing` is empty and the previous
   `commitTrackedGetters` would have wiped the (still-valid)
   `trackedGetters`. **Fix (two-layer):**
   (a) `disableGetterTracking` early-returns when `isTracking` is already
   false (re-entry guard — the second StrictMode setup pass is a no-op);
   (b) `commitTrackedGetters` itself early-returns when
   `currentlyAccessing.size === 0`, preserving the prior commit's tracked
   set. The two checks are mutually reinforcing.

The unit test
`packages/blac-core/src/tracking/getter-tracker.test.ts >
commitTrackedGetters — clears stale entries` encoded the old "wipe on
empty" semantics. It is replaced with two tests covering the new contract:
the normal "replace on real render" case and the new
"preserve on empty commit" case (StrictMode safety).

**Test result:**

- `pnpm --filter @blac/core test` — 528 / 528 pass (27 files).
- `pnpm --filter @blac/adapter test` — 34 / 34 pass (2 files).
- `pnpm --filter @blac/react test` — 184 / 184 pass (24 files).
- `pnpm --filter @blac/preact test` — 10 / 10 pass (1 file).
- All four packages also `tsc --noEmit` clean.
