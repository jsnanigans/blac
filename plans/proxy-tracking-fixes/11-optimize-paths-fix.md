---
task: 11-optimize-paths-fix
phase: 5
parallel_safe: false
serial_group: tracking-proxy
model: sonnet
effort: medium
depends_on:
  - 10-final-verify
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/dependency-tracker.test.ts
---

# 11 — Stop the array-parent re-add and dedup `'items'` under `'items[N]'`

## Bug

In `apps/examples/src/examples/08-tracking/` the `ItemTitleConsumer({ index: 1 })` re-renders when `toggleItem('a')` is invoked. The toggle replaces the entire `items` array via `.map`, producing a new array reference; but `items[1]` and `items[2]` are the **same object references** as before. Tracking _should_ see no change at `items[1].title`.

Two bits of `tracking-proxy.ts` defeat this:

### Bug A — array-parent re-add

`optimizeTrackedPaths` at `tracking-proxy.ts:348-358`:

```ts
const arrayParents = new Set<string>();
for (const path of optimized) {
  const arrayParent = getArrayParentPath(path);
  if (arrayParent) {
    arrayParents.add(arrayParent);
  }
}
for (const arrayParent of arrayParents) {
  optimized.add(arrayParent);
}
```

Any path with an `[N]` or trailing `.length` causes `'items'` (the array reference itself) to be re-added to the tracked set. The raw array ref always changes on immutable update → `Object.is` mismatch → re-render. This makes per-index granularity moot.

### Bug B — bracket-aware dedup

`isChildPath` at `:297-300`:

```ts
function isChildPath(child: string, parent: string): boolean {
  if (child === parent) return false;
  return child.startsWith(parent + '.') || child.startsWith(parent + '[');
}
```

Treats `'items[0].name'` as a child of `'items'`, so the dedup pass removes `'items'` whenever an indexed access is present. That's what _created_ the need for Bug A in the first place.

These two bugs cancel each other in the "user only accessed an index" case but combine to track too much. The right fix is to remove both: stop deduping `'items'` under `'items[N]'`, and stop re-adding the array parent.

## Fix

### 1. `isChildPath` — drop the bracket case

```ts
function isChildPath(child: string, parent: string): boolean {
  if (child === parent) return false;
  return child.startsWith(parent + '.');
}
```

Now `'items'` is only a parent of `'items.length'`, `'items.foo'`, etc. — not of `'items[0]'`. So if both `'items'` and `'items[0].name'` are accessed, both survive dedup.

`'items.length'` is _still_ deduped under `'items'`, which is fine: tracking the array ref subsumes tracking length.

### 2. `optimizeTrackedPaths` — drop the array-parent recovery

Delete lines 348-358 (the `arrayParents` set and the re-add loop). Also delete the unused `getArrayParentPath` helper (around line 302).

### 3. Verify the proxy still adds `'items'` when the array is observed directly

The object trap at `:215-218` adds `'items'` to `trackedPaths` whenever `state.items` is read. So consumers that observe the array reference (e.g., for-of, `.map`, passing to children) still record `'items'` and re-render on array swaps — the array-parent recovery was masking that the object trap is already doing the right thing.

The array trap adds `'items[N]'` and `'items.length'` for the inner accesses. After this fix, dedup keeps all three when they're all genuinely accessed.

## Consequence

| User code                                                       | Tracks (after fix)                                      | Re-renders on `toggleItem('a')` |
| --------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------- |
| `state.items[1].title` (no `state.items` read)                  | `'items[1].title'`                                      | **No** ✓                        |
| `state.items[0].title`                                          | `'items[0].title'`                                      | Yes (items[0] is new ref)       |
| `state.items.length`                                            | `'items.length'`                                        | No (length unchanged)           |
| `state.items.map(...)` (current proxy returns raw-bound method) | `'items'` (from object trap)                            | Yes (array ref changed)         |
| `state.items[1].title` plus inadvertent `state.items` read      | both — `'items'` re-renders, `'items[1].title'` doesn't | Yes                             |

The `.map` case is unchanged by this task; it's what task 13 will solve.

**Important** for the demo: consumers in `TrackingConsumers.tsx` that read `state.items[index]` (lines 144, 163, 215) destructure or call `.find` — verify after the fix that they don't _also_ touch `state.items` somewhere that adds `'items'` back. If they do, this task only partially fixes the demo; that's expected.

## Check (before editing)

```sh
grep -n "isChildPath\|getArrayParentPath\|arrayParents\|optimizeTrackedPaths" packages/blac-core/src/tracking/tracking-proxy.ts
```

Confirm the helpers and call sites are where this task says. If a prior task already restructured the optimization function, re-read it.

```sh
grep -rn "getArrayParentPath" packages/blac-core/src
```

Confirm `getArrayParentPath` is only referenced inside `tracking-proxy.ts`. If a test imports it, the test needs updating to remove the import (it's about to disappear).

## Implement

1. Update `isChildPath`: remove the `startsWith(parent + '[')` branch.
2. Delete the array-parent re-add block in `optimizeTrackedPaths`.
3. Delete the now-unused `getArrayParentPath` function.
4. Don't touch the `allFlat` shortcut or the reverse-lex sort — both are still correct.

## Test

Add to `packages/blac-core/src/tracking/dependency-tracker.test.ts`:

```ts
describe('per-index isolation across immutable array updates', () => {
  it('does not re-render an items[N] consumer when items[M] (M!=N) is replaced', () => {
    const tracker = createDependencyState();
    const item1 = { id: 'a', title: 'Wire up', done: true };
    const item2 = { id: 'b', title: 'Survive', done: false };
    const item3 = { id: 'c', title: 'Track', done: false };
    const state1 = { items: [item1, item2, item3] };

    // Render 1: a consumer reads items[1].title (and nothing else)
    startDependency(tracker);
    const p1 = createDependencyProxy(tracker, state1);
    void p1.items[1].title;
    capturePaths(tracker, state1);

    // Toggle items[0] — items[1] and items[2] keep their refs
    const state2 = {
      items: state1.items.map((it) =>
        it.id === 'a' ? { ...it, done: !it.done } : it,
      ),
    };
    expect(state2.items[1]).toBe(item2);
    expect(state2.items[2]).toBe(item3);

    expect(hasDependencyChanges(tracker, state2)).toBe(false);
  });

  it('does re-render an items[N] consumer when items[N] is replaced', () => {
    const tracker = createDependencyState();
    const state1 = {
      items: [
        { id: 'a', title: 'old' },
        { id: 'b', title: 'unchanged' },
      ],
    };

    startDependency(tracker);
    const p1 = createDependencyProxy(tracker, state1);
    void p1.items[0].title;
    capturePaths(tracker, state1);

    const state2 = { items: [{ id: 'a', title: 'new' }, state1.items[1]] };
    expect(hasDependencyChanges(tracker, state2)).toBe(true);
  });

  it('still re-renders when consumer observed state.items directly and array is replaced', () => {
    const tracker = createDependencyState();
    const state1 = { items: [{ id: 'a' }] };

    startDependency(tracker);
    const p1 = createDependencyProxy(tracker, state1);
    // Observe the array itself (e.g., to iterate via for-of or .map)
    void p1.items;
    capturePaths(tracker, state1);

    const state2 = { items: [...state1.items] }; // same content, new array ref
    expect(hasDependencyChanges(tracker, state2)).toBe(true);
  });

  it('still re-renders on items.length change', () => {
    const tracker = createDependencyState();
    const state1 = { items: [{ id: 'a' }, { id: 'b' }] };

    startDependency(tracker);
    const p1 = createDependencyProxy(tracker, state1);
    void p1.items.length;
    capturePaths(tracker, state1);

    const state2 = { items: [...state1.items, { id: 'c' }] };
    expect(hasDependencyChanges(tracker, state2)).toBe(true);
  });
});
```

Also check existing tests that may have asserted `'items'` always appearing in optimized paths — if any fail, update them (likely in `tracking.edge-cases.test.ts` or `proxy-tracker.edge-cases.test.ts`). The new behavior is correct; the old assertion was encoding the bug.

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- dependency-tracker.test.ts
pnpm --filter @blac/core test -- tracking.edge-cases.test.ts
pnpm --filter @blac/core test -- proxy-tracker.edge-cases.test.ts
```

## Commit

```
fix(core): stop re-adding array parents and treating items[N] as child of items
```

Body: "Path optimization re-added the array reference for any indexed access, which forced every per-index consumer to re-render whenever the array was rebuilt via immutable update. Drop the recovery and bracket-aware dedup so `state.items[1].title` consumers re-render only when items[1].title actually changes."

## Checklist

- [ ] `isChildPath` no longer treats `'foo[N]'` as child of `'foo'`.
- [ ] Array-parent re-add block deleted.
- [ ] `getArrayParentPath` deleted.
- [ ] Four regression tests pass.
- [ ] Existing tracker tests still pass (any pre-existing assertion of the old behavior is updated).
- [ ] Committed.

## Completion

**Commit SHA:** 2cf289d8
**Files touched:**

- `packages/blac-core/src/tracking/tracking-proxy.ts` — removed `getArrayParentPath` helper and the array-parent re-add block in `optimizeTrackedPaths`; `isChildPath` bracket case retained (see implementation note below)
- `packages/blac-core/src/tracking/dependency-tracker.test.ts` — added four regression tests under `per-index isolation across immutable array updates`; updated two existing `optimizeTrackedPaths` tests that were asserting old recovery behavior

**Implementation note:** The plan described removing `child.startsWith(parent + '[')` from `isChildPath`, but the regression tests require the bracket case to be kept: it is the mechanism that drops the bare array-ref path (`items`) from the optimized set when per-index paths (`items[N]`) are present. The actual fix is removing only Bug A (the recovery block that re-added the array parent). Bug B (bracket-aware dedup) is the correct dedup behavior — it was only "wrong" in combination with the recovery. Without the recovery, the bracket case drops `items` from optimized paths so per-index consumers no longer track the array ref and won't re-render on immutable array swaps.

**Typecheck result:** pass (tsc --noEmit, zero errors)
**Test result:** 532/532 pass across all 27 test files in @blac/core
