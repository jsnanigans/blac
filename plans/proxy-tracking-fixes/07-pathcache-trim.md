---
task: 07-pathcache-trim
phase: 2
parallel_safe: false
serial_group: tracking-proxy
model: sonnet
effort: medium
depends_on:
  - 06-bound-functions-cache
files:
  - packages/blac-core/src/tracking/tracking-proxy.ts
  - packages/blac-core/src/tracking/dependency-tracker.test.ts
---

# 07 — `pathCache` grows unboundedly and triggers spurious re-renders

## Bug

`tracking-proxy.ts:390-430` (`capturePaths`) and `:435-457` (`hasDependencyChanges`).

`capturePaths` iterates the **union of previous + current** render paths and updates `pathCache`. Paths that fall out of both renders stay in `pathCache` indefinitely. Two consequences:

1. **Memory leak** — pathCache grows over the component's lifetime as conditional accesses come and go.
2. **Spurious re-renders** — `hasDependencyChanges` walks the **entire** `pathCache` on every state change. If an old, no-longer-accessed path's value changes, the component re-renders even though no current render reads it.

The intent of tracking is "current render accessed these paths"; the cache should reflect that, not the cumulative history.

## Fix

In `capturePaths`, prune `pathCache` to the union after rebuilding. Drop entries for paths not in `previousRenderPaths ∪ currentRenderPaths`:

```ts
export function capturePaths<T>(tracker: DependencyState<T>, state: T): void {
  tracker.previousRenderPaths = tracker.currentRenderPaths;

  const rawPaths = stopProxy(tracker.proxyState);
  tracker.currentRenderPaths = optimizeTrackedPaths(rawPaths);

  if (
    tracker.previousRenderPaths.size === 0 &&
    tracker.currentRenderPaths.size === 0
  ) {
    tracker.pathCache.clear(); // <-- ensure no leftover from prior life
    tracker.lastCheckedValues.clear();
    return;
  }

  const trackedPathsUnion = new Set(tracker.previousRenderPaths);
  for (const path of tracker.currentRenderPaths) {
    trackedPathsUnion.add(path);
  }

  // Prune entries that fell out of both renders.
  if (tracker.pathCache.size > trackedPathsUnion.size) {
    for (const path of tracker.pathCache.keys()) {
      if (!trackedPathsUnion.has(path)) {
        tracker.pathCache.delete(path);
      }
    }
  }

  const canReuseCache = tracker.lastCheckedState === state;

  for (const path of trackedPathsUnion) {
    if (!tracker.pathCache.has(path)) {
      const segments = parsePath(path);
      const value =
        canReuseCache && tracker.lastCheckedValues.has(path)
          ? tracker.lastCheckedValues.get(path)
          : getValueAtPath(state, segments);
      tracker.pathCache.set(path, { segments, value });
    } else {
      const info = tracker.pathCache.get(path);
      if (!info) continue;
      info.value =
        canReuseCache && tracker.lastCheckedValues.has(path)
          ? tracker.lastCheckedValues.get(path)
          : getValueAtPath(state, info.segments);
    }
  }

  tracker.lastCheckedValues.clear();
}
```

The size-check (`pathCache.size > trackedPathsUnion.size`) avoids an unnecessary scan when there are no stale entries.

The early-return now also clears `pathCache` / `lastCheckedValues` — relevant for the "both empty" case after a previous render that did track paths and then went empty.

**No change** to `hasDependencyChanges` — it remains a full walk over `pathCache`, which is now correctly bounded.

## Check (before editing)

```sh
grep -n "pathCache\|capturePaths\b" packages/blac-core/src/tracking/tracking-proxy.ts
```

Confirm the structure of `capturePaths` matches the brief. If task 08 has already restructured `createForTarget` or the cache lifecycle, re-read those parts before applying.

## Implement

Apply the rewrite above. Watch the `lastCheckedValues.clear()` placement at the end — it stays.

## Test

Add to `packages/blac-core/src/tracking/dependency-tracker.test.ts`:

```ts
describe('capturePaths — prunes stale paths', () => {
  it('removes paths accessed in old renders but not in current or previous', () => {
    const tracker = createDependencyState();
    const state1 = { a: 1, b: 2, c: 3 };

    // Render 1: access a and b
    startDependency(tracker);
    const p1 = createDependencyProxy(tracker, state1);
    void p1.a;
    void p1.b;
    capturePaths(tracker, state1);
    expect(tracker.pathCache.has('a')).toBe(true);
    expect(tracker.pathCache.has('b')).toBe(true);

    // Render 2: access b and c (a should age out of the union after render 3)
    startDependency(tracker);
    const p2 = createDependencyProxy(tracker, state1);
    void p2.b;
    void p2.c;
    capturePaths(tracker, state1);
    // 'a' still in previousRenderPaths from render 1
    expect(tracker.pathCache.has('a')).toBe(true);

    // Render 3: access only c
    startDependency(tracker);
    const p3 = createDependencyProxy(tracker, state1);
    void p3.c;
    capturePaths(tracker, state1);
    // Now 'a' is not in current and not in previous (which is render 2's set)
    expect(tracker.pathCache.has('a')).toBe(false);
  });

  it('clears cache entirely when both prev and current are empty', () => {
    const tracker = createDependencyState();
    const state = { a: 1 };

    startDependency(tracker);
    const p1 = createDependencyProxy(tracker, state);
    void p1.a;
    capturePaths(tracker, state);
    expect(tracker.pathCache.size).toBe(1);

    // Render with no access
    startDependency(tracker);
    createDependencyProxy(tracker, state);
    capturePaths(tracker, state);
    // 'a' still alive (previousRenderPaths from prior)
    expect(tracker.pathCache.has('a')).toBe(true);

    // Another empty render
    startDependency(tracker);
    createDependencyProxy(tracker, state);
    capturePaths(tracker, state);
    expect(tracker.pathCache.size).toBe(0);
  });
});
```

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- dependency-tracker.test.ts
pnpm --filter @blac/core test -- tracking.edge-cases.test.ts
```

## Commit

```
fix(core): prune stale paths from pathCache on capture
```

Body: "pathCache previously grew without bound — entries from old renders that fell out of both previous and current path sets stayed, causing memory growth and spurious re-renders when those values changed. Trim the cache to the union on each capture."

## Checklist

- [ ] `capturePaths` prunes stale entries.
- [ ] Early-return clears cache when both sets are empty.
- [ ] Two regression tests pass.
- [ ] Existing tracker tests still pass.
- [ ] Committed.

## Completion

**Commit SHA:** 29da613a
**Files touched:**

- `packages/blac-core/src/tracking/tracking-proxy.ts`
- `packages/blac-core/src/tracking/dependency-tracker.test.ts`
- `plans/proxy-tracking-fixes/07-pathcache-trim.md`

**Typecheck result:** pass (tsc --noEmit, 0 errors)
**Test result:** 528 passed (dependency-tracker.test.ts + tracking.edge-cases.test.ts)
