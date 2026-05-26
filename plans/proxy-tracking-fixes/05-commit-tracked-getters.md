---
task: 05-commit-tracked-getters
phase: 2
parallel_safe: false
serial_group: tracking-proxy
model: haiku
effort: low
depends_on:
  - 04-array-index-tracking
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/getter-tracker.test.ts
---

# 05 — `commitTrackedGetters` must always replace, not size-gate

## Bug

`packages/blac-core/src/tracking/tracking-proxy.ts:592-597`:

```ts
export function commitTrackedGetters(tracker: GetterState): void {
  if (tracker.currentlyAccessing.size > 0) {
    tracker.trackedGetters = new Set(tracker.currentlyAccessing);
  }
  tracker.currentlyAccessing.clear();
}
```

The size-gate is wrong. If render N accessed `bloc.computed` but render N+1 doesn't access any getter (conditional UI), `trackedGetters` keeps the **stale** entry. `hasGetterChanges` then keeps invoking the now-unconsumed getter on every state change, and a change in its return value re-renders the component even though the render no longer reads it.

## Fix

Always replace. Drop the size-gate:

```ts
export function commitTrackedGetters(tracker: GetterState): void {
  tracker.trackedGetters = new Set(tracker.currentlyAccessing);
  tracker.currentlyAccessing.clear();
}
```

The new `Set` allocation is unchanged in the common case; in the "no getters accessed" case we now correctly reset to an empty set.

## Check (before editing)

```sh
grep -n "commitTrackedGetters\|trackedGetters" packages/blac-core/src/tracking/tracking-proxy.ts
```

Confirm the function still matches the bug listing and that `trackedGetters` is read in `hasGetterChanges` (so empty set there is a no-op — function early-returns when `trackedGetters.size === 0`).

## Implement

One-line edit. Remove the conditional.

## Test

Add to `packages/blac-core/src/tracking/getter-tracker.test.ts`:

```ts
describe('commitTrackedGetters — clears stale entries', () => {
  it('drops getters that were tracked previously but not accessed this commit', () => {
    const state = createGetterState();
    state.currentlyAccessing.add('computedA');
    commitTrackedGetters(state);
    expect(state.trackedGetters.has('computedA')).toBe(true);

    // Next render: no getter accessed
    commitTrackedGetters(state);
    expect(state.trackedGetters.size).toBe(0);
  });
});
```

Reuse the existing imports from that test file. If `createGetterState` and `commitTrackedGetters` aren't exported, check `tracking-proxy.ts`'s exports — they are exported as named functions.

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- getter-tracker.test.ts
```

Also re-run the dependency tracker test to confirm no regression in the combined flow:

```sh
pnpm --filter @blac/core test -- dependency-tracker.test.ts
```

## Commit

```
fix(core): always replace trackedGetters on commit
```

Body (optional): "Previously a render that accessed no getters left the prior render's getter set intact, causing unnecessary re-renders on changes to no-longer-consumed computed properties."

## Checklist

- [ ] Size-gate removed.
- [ ] Regression test passes.
- [ ] Existing getter tests still pass.
- [ ] Committed.

## Completion

**Commit SHA:** (pending)
**Files touched:** packages/blac-core/src/tracking/tracking-proxy.ts, packages/blac-core/src/tracking/getter-tracker.test.ts
**Typecheck result:** passed
**Test result:** 523 tests passed
