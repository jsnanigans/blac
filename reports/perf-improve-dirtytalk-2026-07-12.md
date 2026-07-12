# Investigation: Still-open dirtytalk perf on blac render/re-render path

## Bottom Line
**Root Cause**: The prior report's high-value low-risk batch (PN1/PN2/PN3a/PN5/PN6/PN10 + P6/PN4 via `ProxyCache`) all SHIPPED (`d1f51d5a`, `372c65fb`, `79c4d90b`). Only two render-path items remain, both medium-risk design decisions; the rest are internal-only or spatial (no blac consumer).
**Fix Location**: `packages/dirtytalk-engine/src/dirty-channel.ts:104` (per-flush subscriber snapshot) and `packages/dirtytalk-structural/src/path-interner.ts:49` (whole-memo clear).
**Confidence**: High (static, verified at `b9fc9c01`).

## How dirtytalk touches render perf
`blac-core StateContainer extends StructuralContainer` (`StateContainer.ts:126`). Every `emit`/`patch` → `diffAlongSkeleton`/`_refineAncestorMarks` → `channel.mark` → scheduled `#flush` → subscriber notify (the blac bridge → React re-render). `useBloc` runs `trackRender(state, interner, proxyCache)` per render (`useBloc.ts:479`). So structural + engine are squarely on state-change → diff → notify; spatial is NOT (only `apps/examples` canvas uses it).

## Still-open (render-affecting)

**F1 — PN3b: per-flush subscriber snapshot array.** `dirty-channel.ts:104` `Array.from(this.#subscribers.values())` allocates every flush, i.e. every notify cycle for every container (emit AND patch), regardless of subscriber count. big-O O(subs)/flush.
- *Fix*: when `#subscribers.size <= 1`, grab the single entry and run it directly (guard on `entry.alive`) — no array. Preserves the "subscribers added mid-callback don't run this cycle" contract (a lone callback that self-unsubs is safe; additions defer to the tail re-schedule).
- *Impact*: removes one alloc from the universal notify path. *Effort S, risk med* (re-entrancy contract).

**F2 — PN9: `_ancestorIds` memo fully cleared on every new intern.** `path-interner.ts:49` `this._ancestorIds.length = 0`. `trackRender` interns a fresh path on every newly-read leaf (new mount, new array index, dynamic key), nuking the whole ancestor memo. The next `patch` (with consumers) → `_refineAncestorMarks` → `ancestorIds(skelId)` recomputes for every skeleton leaf via `segments.slice(0,k).join('.')` (`:106`, O(depth) string alloc per level per leaf). Growing-list / dynamic-key workloads thrash. Only bites `patch()` (not `emit()`).
- *Fix*: version the memo by `this._paths.length` at cache time and recompute only when it grew (O(1) freshness check) — or invalidate only entries whose path is a strict-prefix superset of the new path. MUST preserve the staleness correctness fix that the coarse clear currently provides (see `dirtytalk-structural-phase1-phase3-verify.md`).
- *Impact*: kills recompute thrash on patch-path re-renders for growing state. *Effort M, risk med* (memo correctness).

## Internal-only / not blac render path
- `react-hook.ts:49` `useStructural` passes no `ProxyCache` → full proxy-tree realloc per render. Affects direct dirtytalk-react users only; blac's `useBloc` already caches. *Low priority, S.*
- Spatial P2 `rect-space.ts:13` `[...a,...b]` O(N²) union; P3 `intersects`; P7 `scene-node.ts` double ancestor walk — spatial has no blac render consumer. *Deferred pkg.*
- P8 `primitives.ts:23` `Signal` snapshot+eager errors per set — `Signal` unused by blac. *Deferred.*

## Evidence
- `rg "@dirtytalk/" packages/blac-core packages/blac-react` — StateContainer/useBloc are the consumers.
- Verified shipped: `path-set.ts:16-17` (PN1), `dirty-channel.ts:106,123` lazy errors (PN3a), `container.ts:289` cached equals (PN6), `:216-221` for-in empty test (PN10), `:390-398` closureless refine (PN2), `tracker.ts:337-338` lazy `prefixId()` (PN5), `tracker.ts:191-208` `ProxyCache` (P6/PN4).

## Next Steps
1. Decide F1 `size<=1` fast-path vs keep snapshot (measure via `hotpath.bench.ts`).
2. Prototype F2 length-versioned memo + add the leaf-only-consumer regression test from the verify report before touching it.
3. Treat spatial/Signal items as deferred until a blac render consumer exists.
