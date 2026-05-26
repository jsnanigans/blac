---
task: 02-adapter-null-state
phase: 1
parallel_safe: true
model: sonnet
effort: low
depends_on: []
files:
  - packages/blac-adapter/src/index.ts
  - packages/blac-adapter/src/__tests__/adapter.edge-cases.test.ts
---

# 02 — `null` state → object transition must re-render

## Bug

`packages/blac-adapter/src/index.ts:182-199` (inside `autoTrackSubscribe`'s listener):

```ts
const isPrimitiveState =
  instance.state !== null &&
  typeof instance.state !== 'object' &&
  typeof instance.state !== 'function';

if (!hasStateDeps && !hasGetterDeps && !isPrimitiveState) {
  return;
}
```

`null` has `typeof === 'object'`, so it's classified as **non-primitive** here — but `createInternal` returns `null` raw (it's not proxyable), so the user can never deref it and `pathCache` stays empty. The listener then early-returns (`!hasStateDeps && !hasGetterDeps && !isPrimitiveState`) on every state change, including `null → { something }`. **The component never re-renders.**

The same hazard exists for `undefined` state, though that's less common.

## Fix

Treat `null` and `undefined` state as "untrackable, always notify". The cleanest fix is to broaden `isPrimitiveState` to "isNotProxyable":

```ts
const stateIsTrackable =
  instance.state !== null &&
  instance.state !== undefined &&
  (typeof instance.state === 'object' || typeof instance.state === 'function');

if (!hasStateDeps && !hasGetterDeps && stateIsTrackable) {
  return;
}
```

Inversion: early-return only when (a) we have no tracked paths/getters **and** (b) the state is currently a trackable object (so we trust path-tracking to handle changes). When state is `null`/`undefined`/primitive, fall through to call `callback()` unconditionally on every change.

**Subtlety:** the equivalent check needs to consider the **previous** state too, not just the current one. If state was `{ a: 1 }` and is now `null`, we need to re-render. With the new logic: current state is `null` → not trackable → don't early-return → `hasDependencyChanges` runs against `null`, returns `true` (because `pathCache.size > 0` from previous render and `getValueAtPath` returns `PATH_MISSING` for everything, differing from old values) → callback fires. Good.

If state was `null` and is now `{ a: 1 }`: pathCache is empty (we never tracked anything), current state is now trackable → with the new logic we still early-return. **Still broken.**

So we also need to track whether the last render was on an untrackable state. Simplest: track `lastSnapshotState` on `adapterState`; if it differs in trackability from current, force a re-render.

Final fix:

```ts
export interface AdapterState<TBloc extends StateContainerConstructor> {
  dependencyState: DependencyState<ExtractState<TBloc>> | null;
  manualDepsCache: unknown[] | null;
  getterState: GetterState | null;
  proxiedBloc: InstanceState<TBloc>;
  // NEW: remember the last state we returned from snapshot, so we can detect
  // transitions between trackable and untrackable shapes (null ↔ object).
  lastSnapshotState: ExtractState<TBloc> | undefined;
}
```

(Initialize to `undefined` in all three `*Init` functions.)

Then in `autoTrackSnapshot`, before returning, set `adapterState.lastSnapshotState = instance.state`.

In the listener:

```ts
const wasTrackable =
  adapterState.lastSnapshotState !== null &&
  adapterState.lastSnapshotState !== undefined &&
  (typeof adapterState.lastSnapshotState === 'object' ||
    typeof adapterState.lastSnapshotState === 'function');
const isTrackable =
  instance.state !== null &&
  instance.state !== undefined &&
  (typeof instance.state === 'object' || typeof instance.state === 'function');

if (wasTrackable !== isTrackable) {
  callback();
  return;
}

if (!isTrackable) {
  callback(); // primitive / null / undefined — no tracking possible
  return;
}

// existing logic for trackable state:
if (!hasStateDeps && !hasGetterDeps) return;
// ... rest unchanged
```

The `isPrimitiveState` local can be deleted.

## Check (before editing)

```sh
grep -n "isPrimitiveState\|isTrackable" packages/blac-adapter/src/index.ts
grep -n "lastSnapshotState" packages/blac-adapter/src/
```

The second grep should return nothing — confirms the field doesn't already exist.

## Implement

1. Add `lastSnapshotState` to `AdapterState`. Initialize in `autoTrackInit`, `manualDepsInit`, `noTrackInit`.
2. Set `adapterState.lastSnapshotState = instance.state` at the end of every snapshot function (`autoTrackSnapshot`, `manualDepsSnapshot`, `noTrackSnapshot`).
3. Rewrite the early-return logic inside `autoTrackSubscribe` per the fix above.
4. Leave `manualDepsSubscribe` and `noTrackSubscribe` alone — `noTrack` already always calls back, and `manualDeps` does shallow-array comparison which works for any state shape.

## Test

Add to `packages/blac-adapter/src/__tests__/adapter.edge-cases.test.ts`:

```ts
describe('autoTrack — nullable state transitions', () => {
  it('re-renders when state transitions null → object', () => {
    // build a bloc whose state starts as null, then emits { value: 1 }
    // subscribe, snapshot, change state, assert listener invoked
  });

  it('re-renders when state transitions object → null', () => {
    // start as { value: 1 }, accessed value once, then emit null, assert listener invoked
  });

  it('does not re-render when null state emits another null', () => {
    // null → null no callback
  });
});
```

Use the existing test harness in `adapter.test.ts` as a template for setting up a `StateContainer` with the desired initial state. The state type must allow `null` (e.g., `class NullableBloc extends StateContainer<{ value: number } | null>`).

## Verify

```sh
pnpm --filter @blac/adapter typecheck
pnpm --filter @blac/adapter test -- adapter.edge-cases.test.ts
pnpm --filter @blac/adapter test -- adapter.test.ts
```

## Commit

```
fix(adapter): re-render on null↔object state transitions
```

Body: "autoTrackSubscribe early-returned when current state was an object with empty pathCache, missing transitions from a previously-null state. Track lastSnapshotState and force a callback whenever trackability changes."

## Checklist

- [x] `AdapterState.lastSnapshotState` added; all three `*Init` initialize it.
- [x] Each snapshot function updates `lastSnapshotState` before returning.
- [x] `autoTrackSubscribe` listener uses the new logic.
- [x] Three new regression tests pass.
- [x] Existing adapter tests still pass.
- [x] Committed.

## Completion

**Commit SHA:** 437b93db
**Files touched:**

- `packages/blac-adapter/src/index.ts`
- `packages/blac-adapter/src/__tests__/adapter.edge-cases.test.ts`

**Typecheck result:** pass (tsc --noEmit, 0 errors)
**Test result:** 32/32 pass (adapter.edge-cases.test.ts + adapter.test.ts)
