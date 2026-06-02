---
task: 09-active-tracker-per-consumer
phase: 3
parallel_safe: false
serial_group: tracking-proxy
model: opus
effort: high
depends_on:
  - 04-array-index-tracking
  - 05-commit-tracked-getters
  - 06-bound-functions-cache
  - 07-pathcache-trim
  - 08-stale-proxy-cache
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-adapter/src/index.ts
  - packages/blac-core/src/tracking/getter-tracker.test.ts
  - packages/blac-adapter/src/__tests__/adapter.edge-cases.test.ts
---

# 09 — Per-consumer active tracker; drop global bloc-proxy cache

## Bug

`tracking-proxy.ts:494-499`:

```ts
const blocProxyCache = new WeakMap<
  StateContainerInstance,
  StateContainerInstance
>();
const activeTrackerMap = new WeakMap<StateContainerInstance, GetterState>();
```

Two module-level globals shared by every consumer of a given bloc.

Consequences:

1. **One bloc proxy** for `N` components — but each component's getter tracker is stored under the same map key. `autoTrackSnapshot` calls `setActiveTracker(instance, this.getterState)` every render; the last writer wins. If component A renders then B renders, B clobbers A's tracker. If A's `useEffect` runs after B's snapshot, A's `clearActiveTracker(bloc)` wipes B's tracker.
2. **In concurrent / Suspense / interleaved rendering**, two components' renders can be in flight together. Getter access via the proxy goes to whichever tracker was set last.
3. Cleanup happens in `useEffect` (commit phase) — getter access during commit (e.g. inside layout effects of child components) is still tracked into the previous render's tracker.

## Fix (sketch)

Replace the global active tracker with a **consumer-scoped** tracker. The cleanest version:

1. Give each consumer its own **per-consumer bloc proxy** instead of caching a single proxy globally.
2. The proxy closes over its own `GetterState` directly — no `activeTrackerMap` lookup at all.
3. Drop `blocProxyCache`, `activeTrackerMap`, `setActiveTracker`, `clearActiveTracker`, `getActiveTracker`.
4. `autoTrackInit` creates the per-consumer proxy:

   ```ts
   export function autoTrackInit<TBloc extends StateContainerConstructor>(
     instance: InstanceState<TBloc>,
   ): AdapterState<TBloc> {
     if (isSsrEnvironment()) return noTrackInit(instance);
     const getterState = createGetterState();
     return {
       dependencyState: null,
       manualDepsCache: null,
       getterState,
       proxiedBloc: createBlocProxy(instance, getterState),
       lastSnapshotState: undefined, // from task 02
     };
   }
   ```

5. `createBlocProxy(bloc, getterState)` becomes:

   ```ts
   export function createBlocProxy<TBloc extends StateContainerInstance>(
     bloc: TBloc,
     tracker: GetterState,
   ): TBloc {
     return new Proxy(bloc, {
       get(target, prop, receiver) {
         if (tracker.isTracking && isGetter(target, prop)) {
           return executeTrackedGetter(target, prop, tracker);
         }
         return Reflect.get(target, prop, receiver);
       },
     }) as TBloc;
   }
   ```

   No cache; one proxy per consumer is fine. Two `useBloc` calls on the same component already share one `adapterState` (via the hook's `useMemo`), so the per-consumer proxy is created exactly once per `useBloc` invocation, not per render.

6. `autoTrackSnapshot` no longer calls `setActiveTracker` — it just flips `adapterState.getterState.isTracking = true` and commits. `disableGetterTracking` in `useEffect` flips it back to `false`.

   ```ts
   export function disableGetterTracking<
     TBloc extends StateContainerConstructor,
   >(
     adapterState: AdapterState<TBloc>,
     // rawInstance no longer needed
   ): void {
     if (adapterState.getterState) {
       adapterState.getterState.isTracking = false;
       commitTrackedGetters(adapterState.getterState);
     }
   }
   ```

7. Update the call site in `useBloc.ts` to pass the new signature (drop `rawInstance` arg if removed).

### What about the combined `createTrackingProxy` used by `tracked()` / `watch()` ?

That function (`tracking-proxy.ts:823-874`) already builds its own per-call proxy and doesn't use the global tracker map — it carries `tracker` in its closure. No change needed there.

### Verify the existing `executeTrackedGetter` still works

`executeTrackedGetter(target, prop, tracker)` already takes an explicit tracker arg. The global lookup was only at the top of `createBlocProxy`. Once removed, the rest of the path is unchanged.

## Check (before editing)

```sh
grep -rn "activeTrackerMap\|setActiveTracker\|clearActiveTracker\|getActiveTracker\|blocProxyCache" packages/
```

Map every call site. Expected: `tracking-proxy.ts` (defs + uses), `adapter/index.ts` (snapshot/disable), `useBloc.ts` (disableGetterTracking call), tests (some may use these directly).

Any test that calls `setActiveTracker` directly needs updating to use the new per-consumer flow.

## Implement

1. Rewrite `createBlocProxy` to take `tracker: GetterState` and close over it.
2. Delete `activeTrackerMap`, `setActiveTracker`, `clearActiveTracker`, `getActiveTracker`, `blocProxyCache`.
3. Update `autoTrackInit` to pass `getterState` to `createBlocProxy`.
4. Update `autoTrackSnapshot`: remove `setActiveTracker` call. Just set `getterState.isTracking = true`.
5. Update `disableGetterTracking` signature: drop the `rawInstance` parameter.
6. Update `useBloc.ts` (`packages/blac-react/src/useBloc.ts`) to match the new `disableGetterTracking` signature.
7. Update `useBloc.ts` in `@blac/preact` if it has a symmetric call (`packages/blac-preact/src/useBloc.ts`).
8. Update `@blac/adapter`'s exports if the deleted helpers were re-exported.
9. Update or delete tests that referenced the removed APIs.

## Test

Add to `packages/blac-adapter/src/__tests__/adapter.edge-cases.test.ts`:

```ts
describe('per-consumer active tracker', () => {
  it('two consumers of the same bloc track getters independently', () => {
    // Build a bloc with two getters: computedA and computedB.
    // Set up two adapter states (simulate two useBloc consumers).
    // Render consumer 1: access computedA via proxiedBloc; commit.
    // Render consumer 2: access computedB via proxiedBloc; commit.
    // Assert: state1.getterState.trackedGetters has 'computedA' only.
    //         state2.getterState.trackedGetters has 'computedB' only.
  });

  it('interleaved renders do not contaminate each others trackers', () => {
    // state1 snapshot → start tracking
    // state2 snapshot → start tracking
    // access via state1.proxiedBloc.computedA
    // access via state2.proxiedBloc.computedB
    // commit both
    // assert independent tracker contents
  });
});
```

Use the existing test utilities in `adapter.test.ts` as scaffolding.

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- getter-tracker.test.ts
pnpm --filter @blac/core test -- tracking.edge-cases.test.ts
pnpm --filter @blac/adapter typecheck
pnpm --filter @blac/adapter test
pnpm --filter @blac/react typecheck
pnpm --filter @blac/preact typecheck
```

(`@blac/react` and `@blac/preact` only typecheck — their consumers may have been touched. Don't run their full test suites here; the final-verify task covers cross-package.)

## Commit

```
refactor(core): per-consumer active tracker; drop global proxy cache
```

Body: "Replaced module-level activeTrackerMap and blocProxyCache with per-adapter-state references. Each useBloc consumer now owns its own bloc proxy and getter tracker, eliminating cross-component contamination during interleaved or concurrent rendering."

## Checklist

- [ ] `createBlocProxy(bloc, tracker)` closure-based.
- [ ] `activeTrackerMap`, `blocProxyCache`, and their helpers removed.
- [ ] `autoTrackInit` passes tracker.
- [ ] `autoTrackSnapshot` no longer calls `setActiveTracker`.
- [ ] `disableGetterTracking` simplified.
- [ ] React `useBloc.ts` call site updated.
- [ ] Preact `useBloc.ts` call site updated (if symmetric).
- [ ] Per-consumer regression tests pass.
- [ ] All four targeted typechecks pass.
- [ ] Committed.

## Completion

**Commit SHA:** (to be filled after commit)
**Files touched:**

- `packages/blac-core/src/tracking/tracking-proxy.ts` — removed `blocProxyCache`, `activeTrackerMap`, `setActiveTracker`, `clearActiveTracker`, `getActiveTracker`; rewrote `createBlocProxy(bloc, tracker)` to close over a per-consumer tracker.
- `packages/blac-core/src/tracking/index.ts` — dropped re-exports of the removed helpers.
- `packages/blac-core/src/tracking/getter-tracker.test.ts` — updated `createBlocProxy` callers to pass tracker; removed obsolete `tracker management` describe; replaced shared-cache assertion with a fresh-proxy-per-call assertion.
- `packages/blac-adapter/src/index.ts` — dropped `setActiveTracker`/`clearActiveTracker` imports and call sites; `autoTrackInit` now passes its `getterState` into `createBlocProxy`; `disableGetterTracking` no longer takes `rawInstance`.
- `packages/blac-adapter/src/__tests__/adapter.test.ts` — updated `disableGetterTracking` call sites to the single-arg signature.
- `packages/blac-adapter/src/__tests__/adapter.edge-cases.test.ts` — added `per-consumer active tracker` describe with two regression tests covering independent + interleaved consumers.
- `packages/blac-react/src/useBloc.ts` — dropped `rawInstance` arg from `disableGetterTracking` call.
- `packages/blac-preact/src/useBloc.ts` — dropped `rawInstance` arg from `disableGetterTracking` call.
- `plans/proxy-tracking-fixes/09-active-tracker-per-consumer.md` — this completion block.

**Typecheck result:** All four targeted typechecks pass: `@blac/core`, `@blac/adapter`, `@blac/react`, `@blac/preact` (`tsc --noEmit` clean).

**Test result:**

- `pnpm --filter @blac/core test -- getter-tracker.test.ts`: 527/527 pass (27 files).
- `pnpm --filter @blac/core test -- tracking.edge-cases.test.ts`: 527/527 pass (27 files).
- `pnpm --filter @blac/adapter test`: 34/34 pass (2 files), including the two new `per-consumer active tracker` regression tests.
