# Investigation: Structural perf/forward findings (P4/P5/T9/F) — diff verification

## Bottom Line
**Root Cause**: `PathInterner.ancestorIds()` permanently memoizes a lookup whose
correct answer depends on the *global, monotonically-growing* set of interned
real paths (shared per-class via `getInternerFor`'s `WeakMap`), but nothing
invalidates the cache when new real paths are interned later — so a leaf id
computed (and cached) before its ancestor's real path existed in the interner
never picks that ancestor up, even after it is interned by a later, unrelated
patch/consumer-registration.
**Fix Location**: `packages/dirtytalk-structural/src/path-interner.ts:97-108` (`ancestorIds`)
**Confidence**: High

## What's Happening
P5 (refcount skeleton), T9 (doc-only), and F (`container.dispose()` → `channel.dispose()`)
are correctly and completely implemented, matching their done-checks exactly.
P4a (segment cache) is also correct. P4b's `ancestorIds` integer lookup,
however, can silently produce **fewer** marks than the old `startsWith` scan —
a real functional regression, not just a perf-neutral rewrite.

## Why It Happens
**Primary Cause**: `ancestorIds(id)` walks shrinking path prefixes and does a
plain `this._map.get(prefix)` read, caching whichever ids already exist at
first-call time (`path-interner.ts:97-108`). `intern()` (`:41-48`) never
touches this cache. Because the interner is shared per class across *all*
instances (`StructuralContainer.getInternerFor`), any patch/consumer anywhere
that interns a *new* real path can retroactively make an earlier-cached,
now-stale `ancestorIds` result wrong.
**Trigger**: `container.ts:349-354` — any atomically-replaced *primitive*
field (e.g. `patch({ label: 'x' })`) unconditionally emits an ancestor-watch
mark via the pre-existing `changedPathsFromPatch` (`diff.ts:190-208`), which
is enough to make `targetIds.size > 0` and force the skeleton loop to run
(`container.ts:356-361`) even though the patch has nothing to do with the
leaf being refined.
**Decision Point**: `container.ts:377-381` — `interner.ancestorIds(skelId).some(a => targetIds.has(a))`
reads the memoized/stale result instead of a fresh scan.

**Concrete repro** (same interner shared per class):
1. Register consumer `leaf` on `items.0.name` only (interns `items.0.name`;
   `items`/`items.0` never interned).
2. `patch({ label: 'x' })` — unrelated primitive. `targetIds = {labelId}` is
   non-empty, so the skeleton loop runs and calls `ancestorIds(itemsNameId)`
   for the first time. Neither `items.0` nor `items` is interned yet →
   result `[]` is cached **forever** for that id.
3. `patch({ items: [...with items[0].name changed...] })` — atomic array
   replace interns `items` and emits its ancestor-watch mark
   (`targetIds = {itemsId}`). The loop calls `ancestorIds(itemsNameId)` again
   → returns the **stale cached `[]`** → `descends` is false → the leaf mark
   is dropped even though its value changed. The old `startsWith` scan (pure
   string comparison, no caching) would have caught this every time.

Existing `container.test.ts:531-594` tests happen to avoid this because the
"whole-array" consumer (`setOfList(c, 'items')`) always interns `items`
*before* any patch runs, so `ancestorIds('items.0.name')`'s first-ever
computation already finds `items` in the map — the test ordering never
exercises the "leaf-only, ancestor interned later" sequence.

## Evidence
- **Key File**: `packages/dirtytalk-structural/src/path-interner.ts:41-48` — `intern()` has no cache-invalidation hook for `_ancestorIds`.
- **Key File**: `packages/dirtytalk-structural/src/path-interner.ts:97-108` — `ancestorIds` caches on first call, keyed only by `id`, using a plain (non-force-interning) `_map.get`.
- **Key File**: `packages/dirtytalk-structural/src/container.ts:339-388` — `_refineAncestorMarks` relies on `ancestorIds` per skeleton leaf every patch.
- **Confirmed correct**: `container.ts:140-142` (`dispose()` forwards to `this._channel.dispose()`), `dirty-channel.ts:54-55,71-72,87-88,162-173` (dispose idempotent, guards `mark`/`subscribe`/`#flush`, `cancel?.()` tolerates schedulers without `cancel`, pre-dispose flush/error/AggregateError logic untouched), `container.ts:288-316` (`_applyRefDelta` — verified no double-decrement/negative-count/ALL_PATHS-mixing bugs by tracing all branches), `path-interner.test.ts:107-113,148-156` (confirms `ancestorIds`/`lookupSegments` never force-intern, `.size` unaffected in isolation).
- **Search Used**: `rg -n "_ancestorIds\[" path-interner.ts` — only written in `ancestorIds`, never cleared/invalidated anywhere.

## Next Steps
1. Invalidate/version the `_ancestorIds` cache — e.g. record `this._paths.length` at cache time per id and recompute if it has grown since (cheap `O(1)` freshness check), or simply don't cache the array itself and only cache confirmed-present prefix ids incrementally.
2. Add a regression test that registers a leaf-only consumer, triggers an unrelated primitive-field patch first (to force early `ancestorIds` computation), then an array-replace patch on the real ancestor, asserting the leaf still wakes.
3. Re-run `container.test.ts`'s P4b describe block with the leaf-only consumer registered *before* any consumer that would incidentally intern the ancestor path, to catch this class of ordering bug going forward.
