# Performance

## P1 · structural · Single-consumer `ALL_PATHS` shortcut inverts the cost tradeoff

`container.ts:141-145` — with ≤1 registered consumer, `emit` skips the diff and wakes the sole consumer on *every* change. The skipped work is a few `getAt` + `Object.is` per skeleton path (microseconds); the induced work is a full React component render for changes the consumer didn't read. One-consumer-per-container is the common topology, so the shortcut pessimizes the common case — and it's also what hides T1 in small apps. Diff whenever the skeleton is non-empty; reserve `ALL_PATHS` for the zero-consumer case (with T1's root-mark so raw subscribers still wake).

## P2 · spatial · `RectSpace.union` accumulates quadratically

`rect-space.ts:10-14`, `dirty-channel.ts:47` — `mark()` runs `accumulated = union(accumulated, r)` and union is `[...a, ...b]` — a full copy of everything accumulated so far, per mark. N damage marks in one frame ⇒ 1+2+…+N element copies ≈ N²/2. An animation ticking 500 nodes per frame does ~125k element copies *per frame* before any rendering. The `Space` contract requires purity, so the fix belongs in the channel or the space representation: let the channel keep a mutable staging buffer it owns (purity preserved at the API boundary), or make `DirtyRegion` a persistent/chunked structure (array-of-arrays flattened at flush).

## P3 · spatial · `intersects` is O(interest × dirty) per subscriber per flush

`rect-space.ts:16-25` — nested loop over every interest rect × every damage rect. The root's interest is one rect so the root pays O(dirty), but any additional subscriber with multi-rect interest (per-region observers, minimap, culling helpers) pays the product against an un-coalesced damage list that P2 already lets grow large. Coalescing overlapping damage at flush time (or bounding-box prefilter per side) drops both this and renderer over-draw — today the renderer receives every raw rect including exact duplicates from repeated marks.

## P4 · structural · `diffAlongSkeleton`/`_refineAncestorMarks` re-derive path structure per emit

- `diff.ts:27-37` — `getAt` does `path.split('.')` (fresh array) per skeleton path per emit; `changedPathsFromPatch` was explicitly rewritten to avoid exactly this (`diff.ts:155-160` documents the reasoning) but the emit-side diff still pays it. Caching segment arrays on the interner (`lookupSegments(id)`) makes the hot diff allocation-free.
- `container.ts:263-316` — `_refineAncestorMarks` decodes every ancestor mark to a string prefix, then string-`startsWith`-scans the **entire skeleton** per patch that contains any atomic replacement (i.e., every array update). With many consumers × paths, each array patch is O(skeleton × prefixes) string work. An interner-side parent-index (path id → parent id) would turn descendant checks into integer walks.

## P5 · structural · Skeleton recompute is O(consumers × paths) per registration

`container.ts:206-216, 236-240` (flagged in-code as future work) — every `registerConsumerPaths`/`unregisterConsumer` re-unions all consumers from scratch; mounting/unmounting N consumers is O(N²·paths). Refcount per path id (increment on register, decrement on unregister) makes it O(Δpaths).

## P6 · structural · Tracker allocates a handler object + closures per wrapped object per render

`tracker.ts:101-228` — each `wrap()` allocates `pinArrayPath`, the `handler` literal, and the Proxy. Deep reads wrap every visited object every render. The handler could be a single shared object reading per-proxy state (`prefix`, `isArray`) from a WeakMap keyed by target — one allocation instead of three per node — at the cost of one extra lookup per get. Worth measuring before doing; listed because this is the hottest per-render allocation site in the stack.

## P7 · spatial · Stage loops and `_clipRect` do per-damage tree walks

- `scene-node.ts:130-138` — `_clipRect` walks the full ancestor chain on **every** `markDamaged`; deep trees with chatty leaves pay O(depth) per mark. Caching the effective clip per node (invalidated on `setBounds`/reparent of ancestors) removes it.
- `scene-root.ts:99-111` — `_paintCulled` is O(children × regions); fine at top level (documented), but combined with P2's uncoalesced regions the constant grows with damage count, not damaged *area*. Coalesce first (P3), then cull.

## P8 · engine · `Signal` snapshots subscribers per set

`primitives.ts:23` — `Array.from(this._subscribers)` allocates on every value change even with zero-or-one subscribers. Trivial, and `Signal` is currently unused — noted only in case it gets adopted for high-frequency use (pointer positions), where the per-set allocation and the throw-at-writer semantics (E4) both matter.
