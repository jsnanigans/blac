# Complex Investigation: Remaining Performance Opportunities across dirtytalk (structural / engine / spatial)

## Bottom Line
**Root Cause**: Several per-`mark`/per-`flush`/per-patch hot paths still allocate needlessly (empty-operand Set copies, per-flush snapshot + error arrays, per-leaf closures, repeated interns); the catalogued-but-deferred P2/P3/P6/P7/P8 items remain open, and P6 (tracker per-render allocation) is confirmed still the single heaviest allocation site.
**Fix Location**: highest-value new win at `packages/dirtytalk-structural/src/path-set.ts:12-17` (`PathSetSpace.union` lacks the empty-operand fast-path that `RectSpace.union` already has).
**Confidence**: High (static analysis; all line refs verified against current source at commit `aa4616ae`).

---

## Investigation Findings & Hypothesis

### Part A — review-889 catalogue: status of deferred perf items

Source of truth: `review-889/02-performance.md` (P1-P8). Cross-checked against the two shipped plans (`plans/dirtytalk-fixes-cleanups`, `plans/dirtytalk-perf-stability`) and current source.

| id | orig. description (abridged) | package | status now |
|----|------------------------------|---------|-----------|
| **P1** | single-consumer `ALL_PATHS` shortcut inverts cost tradeoff | structural | **SHIPPED** — `container.ts:169` now uses `ALL_PATHS` only when `size===0`; root-sentinel preserved. |
| **P2** | `RectSpace.union` = `[...a,...b]` ⇒ O(N²) element copies per frame | spatial | **OPEN** — `rect-space.ts:10-14` still spreads; only the `a.length===0`/`b.length===0` identity shortcuts exist, the growth copy remains. |
| **P3** | `intersects` O(interest × dirty), un-coalesced damage list | spatial | **OPEN** — `rect-space.ts:16-24` unchanged; no flush-time coalescing. |
| **P4** | emit-side diff re-`split('.')`s + `_refineAncestorMarks` `startsWith`-scans whole skeleton | structural | **SHIPPED** — `PathInterner.lookupSegments` memoizes the split (`path-interner.ts:85`); `_refineAncestorMarks` now uses integer `ancestorIds`/`ancestorTargetId` (`container.ts:349-387`). |
| **P5** | skeleton recompute O(consumers × paths) per (un)register | structural | **SHIPPED** — incremental refcount `_applyRefDelta` (`container.ts:288-316`). |
| **P6** | tracker allocates handler + closures + Proxy per wrapped object per render | structural | **OPEN** (explicitly "measure first") — `tracker.ts:137-300` still builds a fresh `handler` literal + `pinArrayPath` closure + `Proxy` per `wrap`. See PN4 below. |
| **P7** | `_clipRect` + `_paintCulled` per-damage tree walks | spatial | **OPEN** — `scene-node.ts:135-143` walks ancestor chain per mark; `scene-root.ts:99-111` O(children × regions). |
| **P8** | `Signal` snapshots subscribers per set | engine | **OPEN** — `primitives.ts` `Array.from(this._subscribers)` per set; primitive still unused. |

Also confirmed open (reliability, not perf, out of scope): spatial **S1-S9** (`plans/dirtytalk-fixes-cleanups/open-questions.md` Q1) and **T9**'s deeper interner-growth mitigation (only the doc note shipped).

### Part B — NEW opportunities found by hot-path analysis

These are not in the review-889 catalogue (several sit in code that P4/P5 *introduced*).

**PN1 — `PathSetSpace.union` has no empty-operand fast-path (the one win P2 already applied to spatial, missing on the structural side).**
`DirtyChannel.mark` runs `#accumulated = union(#accumulated, r)` on every mark (`dirty-channel.ts:60`). After each `#flush`, `#accumulated` is reset to `empty()` (`dirty-channel.ts:92`). So the common single-emit-per-flush case always hits `union(emptySet, r)`, which at `path-set.ts:12-17` does `new Set(a)` (copy the empty set) then re-adds every member of `r` — a full copy of the dirty set produced by `diffAlongSkeleton`, discarded immediately at flush. `RectSpace.union` already short-circuits `if (a.length===0) return b`; `PathSetSpace.union` does not. Because `emit`/`patch` always hand `mark` a freshly-allocated Set (or `ALL_PATHS`) they never retain, returning `b` directly is alias-safe. This fires on **every** structural mutation with ≥1 consumer.

**PN2 — `_refineAncestorMarks` allocates a closure per skeleton leaf and scans `roughSet` twice.**
`container.ts:380`: `this.interner.ancestorIds(skelId).some((a) => targetIds.has(a))` allocates a fresh `(a)=>…` closure for **every** skeleton leaf on every atomic-leaf patch (every array/class-instance update). Additionally `roughSet` is iterated twice with `isAncestorId` per id — once to build `targetIds` (`:349-354`) and again to copy non-ancestor marks (`:370-372`). A plain `for` loop (no closure) + a single combined pass removes both.

**PN3 — `DirtyChannel.#flush` allocates a subscriber snapshot array and an `errors` array on every flush, even the single-subscriber no-error case.**
`dirty-channel.ts:104` `Array.from(this.#subscribers.values())` copies the whole subscriber map every flush; `:106` `const errors: unknown[] = []` allocates even when nothing throws. For the dominant blac topology (one bridge subscriber, no throw) both are pure waste per wake cycle.
- *PN3a (cheap):* allocate `errors` lazily on first catch — trivially safe.
- *PN3b (needs design):* skip the `Array.from` snapshot when `#subscribers.size <= 1`, or iterate the map directly guarding on `entry.alive` — but the snapshot exists precisely for subscribe/unsubscribe-during-callback re-entrancy safety, so this needs a decision, not a blind edit.

**PN5 — tracker re-interns `prefix` repeatedly within a single proxy's traps.**
Within one `wrap(target, prefix)`, `prefix`'s id is recomputed via `interner.intern(prefix)` in `pinArrayPath` (`tracker.ts:153`), in the own-property parent-drop (`:228`), and again via `ownKeys`→`pinArrayPath` (`:282`). `prefix` is fixed for the life of the proxy, so its id can be computed once per `wrap` and reused. Fires per property read during render (interacts with P6).

**PN6 — `_equalsFn()` builds a fresh closure per `emit`/`patch` when a custom-equality map is configured.**
`container.ts:270-278` returns `undefined` fast (common case, good), but when `_equalsByPathId` is non-empty it allocates a new `(id,a,b)=>…` closure on **every** call — `emit` (`:180`), `patch` (`:229`), and `_refineAncestorMarks` (`:363`). The closure only closes over `this`, so it can be built once (constructor/lazily) and stored as a field.

**PN9 — `PathInterner.intern` discards the *entire* `_ancestorIds` memo on every genuinely-new path.**
`path-interner.ts:49` `this._ancestorIds.length = 0`. For state shapes with unbounded dynamic keys (the T9 growth scenario) every newly-seen key nukes the whole ancestor-id cache, so subsequent `_refineAncestorMarks` patches re-walk `slice/join` prefix lookups from scratch. Correct but coarse. A more surgical invalidation (only entries whose path has the new path as a strict prefix) or an append-only parent-index would avoid the thrash — but this is a design decision, not a mechanical edit.

**PN10 — `patch` allocates a keys array just to test emptiness.** `container.ts:215` `Object.keys(partial).length === 0`. Per-patch, negligible; listed for completeness.

**Spatial (deferred package, zero in-repo consumers) — extends the catalogued items:**
- PN7 ≈ **P2**: confirmed still O(N²) at `rect-space.ts:10-14`.
- PN8 extends **P7**: `markDamaged` walks the ancestor chain **twice** per damage — once in `_clipRect` (`scene-node.ts:135-143`) and once in `_root()` (`:122-133`); `_emitBatchedDamage` calls `_root()` again (`:76`). P7 only called out `_clipRect`. A cached root pointer (set on adopt/reparent) plus a cached effective-clip removes both walks.

---

## Evidence & Diagnostics
- **Key trace (PN1)**: `path-set.ts:12-17` — `pathSetUnion` copies `a` unconditionally; compare `rect-space.ts:11-12` which returns the other operand when one side is empty. `dirty-channel.ts:60,92` show `#accumulated` is empty at the start of every flush window, so the empty-`a` branch is the common path.
- **Key trace (PN2)**: `container.ts:380` closure literal inside the `for (const skelId of skeleton)` loop; `container.ts:349` and `:370` are two separate `for (const id of roughSet)` passes each calling `isAncestorId`.
- **Key trace (PN3)**: `dirty-channel.ts:104` `Array.from(...)`, `:106` `errors` array — both unconditional per `#flush`.
- **Key trace (PN6)**: `container.ts:274` `return (id,a,b)=>{…}` allocated per invocation of `_equalsFn()`.
- **Key trace (PN9)**: `path-interner.ts:49` `this._ancestorIds.length = 0` on every new intern.
- **Diagnostic note**: no tests/benches were run (per task constraint). Verified statically against `git` commit `aa4616ae` ("perf(structural): segment cache, integer ancestor lookup, refcount skeleton"). The bench harness `packages/dirtytalk-structural/src/hotpath.bench.ts` + `plans/dirtytalk-perf-stability/bench-baseline.json` exist and would validate PN1/PN2/PN3 emit/patch deltas.

---

## Recommended Mitigations (ranked by impact ÷ effort)

| rank | id | one-line | file:line | severity | effort | risk | ship? |
|------|----|----------|-----------|----------|--------|------|-------|
| 1 | **PN1** | add empty-operand fast-path to `PathSetSpace.union` (return the other Set) | `packages/dirtytalk-structural/src/path-set.ts:12-17` | hot-path-per-mark (every mutation) | S | low (emit/patch never retain the Set) | independent |
| 2 | **PN3a** | allocate `#flush` `errors` array lazily on first catch | `packages/dirtytalk-engine/src/dirty-channel.ts:106` | per-flush | S | low | independent |
| 3 | **PN2** | drop the per-leaf `.some(closure)` + double `roughSet` scan for a single `for` pass | `packages/dirtytalk-structural/src/container.ts:349-387` | per-patch (atomic-leaf/array updates) | S | low | independent |
| 4 | **PN5** | cache `prefixId = interner.intern(prefix)` once per `wrap` | `packages/dirtytalk-structural/src/tracker.ts:153,228,282` | per-read during render | S | low | independent |
| 5 | **P6 / PN4** | single shared Proxy handler reading per-proxy `(prefix,isArray)` from a WeakMap (1 alloc vs 3 per node) | `packages/dirtytalk-structural/src/tracker.ts:137-300` | hottest per-render allocation | M-L | medium (per-get lookup cost; measure first) | design decision |
| 6 | **PN3b** | avoid subscriber snapshot array when `#subscribers.size <= 1` | `packages/dirtytalk-engine/src/dirty-channel.ts:104` | per-flush | M | medium (re-entrant sub/unsub safety) | design decision |
| 7 | **PN6** | memoize the `_equalsFn` closure as a field (only bites with custom equality) | `packages/dirtytalk-structural/src/container.ts:270-278` | per-emit/patch when equality configured | S | low | independent |
| 8 | **PN9** | surgical `_ancestorIds` invalidation instead of full clear on new intern | `packages/dirtytalk-structural/src/path-interner.ts:49` | workload-dependent (dynamic keys + patches) | M | medium (memo correctness) | design decision |
| 9 | **P2 / PN7** | channel-owned mutable staging buffer or chunked `DirtyRegion` (fix O(N²) union) | `packages/dirtytalk-spatial/src/rect-space.ts:10-14` | per-mark (spatial) | S-M | low | deferred pkg |
| 10 | **P7 / PN8** | cache root pointer + effective clip; remove double ancestor walk per damage | `packages/dirtytalk-spatial/src/scene-node.ts:122-143,76` | per-damage (spatial) | M | medium (invalidate on reparent/setBounds) | design decision |
| 11 | **P3** | coalesce overlapping damage at flush; bounding-box prefilter in `intersects` | `packages/dirtytalk-spatial/src/rect-space.ts:16-24` | per-flush per multi-rect subscriber (spatial) | M | low | deferred pkg |
| 12 | **P8** | snapshot `Signal` subscribers only when >1 | `packages/dirtytalk-engine/src/primitives.ts` | per-set (unused primitive) | S | low | deferred (unused) |
| 13 | **PN10** | avoid `Object.keys()` allocation for emptiness test in `patch` | `packages/dirtytalk-structural/src/container.ts:215` | per-patch (negligible) | S | low | independent |

**Suggested first batch (independent, low-risk, all in the emit/patch/flush hot path):** PN1 + PN3a + PN2 + PN5 (+ PN6, PN10). All mechanical, no semantic change, coverable by the existing `hotpath.bench.ts` baseline.
