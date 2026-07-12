-- COUNCIL REVIEW --
Task: Plan 3 re-render/alloc optimizations in @blac/lit's BindingSession + each + component wrapper.
Risks: Skipping re-registration could desync the source skeleton; each fast-path could regress the orphan-sweep; eliding the component wrapper could reintroduce the ref/subscription leak.
Approach: Phase incrementally, phase 1 shippable alone; guard every skip behind a provable-equality check; add a dedicated probe to prove the alloc reduction; gate on existing leak/perf tests.

Nancy Leveson: "Worst case = a binding stops waking because we reused stale interest — mitigated by only reusing when the path SET is structurally identical and interest is a pure function of paths+interner."
Matt Blaze: "No security surface; pure in-process perf. No new inputs trusted."
Butler Lampson: "Phase 1 is the simplest high-value win: skip work when the path set didn't change. Yes."
Alan Kay: "Right problem — the memo already handles unchanged snapshots; this handles unchanged shape on real value changes."
Barbara Liskov: "Integrity preserved iff pathSetEqual is exact and interest stays a deterministic derivation of paths."
Decision: Proceed. Phase 1 primary, 2 medium, 3 stretch/investigate-only.
-- END COUNCIL --

# Plan: @blac/lit re-render / allocation optimizations

## Decision
**Approach**: Guard `computeCurrent` to reuse cached `interest` + skip `registerConsumerPaths` when the tracked path SET is structurally unchanged; add an `each` turnover fast-path; investigate conditional component-wrapper elision.
**Why**: On real value changes the path set is almost always identical; only values move. Interest is a pure fn of (paths, interner), so reuse is provably safe.
**Risk Level**: Low (P1), Medium (P2), Medium (P3).

## Phase 1 — Paths-equality guard (PRIMARY, shippable alone)
Files: `src/internal/track.ts`, `src/internal/binding-session.ts`.

1. **Add `pathSetEqual(a, b)` to `track.ts`** (beside `unionPaths` :93). Logic: `a === b` short-circuit (covers `ALL_PATHS` sentinel and identical-ref empty sets); if either is `ALL_PATHS` and not both → false; else compare `Set.size` then membership (`for (id of a) if (!b.has(id)) return false`).
2. **Primary path in `computeCurrent`** (`binding-session.ts` :225-231): after `value = reader(...)`, compute `const changed = !pathSetEqual(tracked.paths, primary.paths)`. Set `primary.snapshot = snapshot` always. Only when `changed`: `primary.paths = tracked.paths; primary.interest = expandWithAncestors(...); if (primary.unsubscribe) this.registerPaths(primary)`. When unchanged: leave `primary.paths`/`primary.interest` as-is and skip both the `expandWithAncestors` alloc and `registerConsumerPaths`.
3. **Dep path in `reconcileDeps`** (:330-341): for the `rec` (existing-dep) branch, compute `const depChanged = !pathSetEqual(p.paths, rec.paths)`; only when changed recompute `interest = expandWithAncestors(...)`, assign `rec.paths`/`rec.interest`, and call `t.registerConsumerPaths(...)`. Always stamp `rec.snapshot`. Fresh deps unchanged (must always expand+register).

Correctness: subscription reads interest lazily via `() => rec.interest` (:411), so an untouched cached interest that matches unchanged paths stays valid. First subscribed compute: `primary.paths` starts `emptyPathSet()` (:118) so `changed` is true → full registration, matching today. Dynamic selectors whose paths genuinely move → `changed` true → identical to current behavior. Orthogonal to the memo (:175): guard only runs when the memo MISSES.

## Phase 2 — `each` turnover fast-path — DROPPED (2026-07-12)
**Decision: dropped.** The proposed shared-identity heuristic is unsound for an
index-dependent `keyFn` (a supported public API): a shared *item* at a moved
index yields a different *key*, so shared-item-identity does not prove key
overlap — a false "not a turnover" skips the `setValue(nothing)` orphan-sweep and
reintroduces the lit-html 3.3.3 `_$endNode` leak. The stated goal (eliminate the
O(N) `computeKeys`) is also not surgically reachable: `prevKeys` must stay
materialized for the next tick's comparison, and that O(N) is co-order with the
key→index map `repeat` builds internally. Marginal benefit, real correctness risk
→ not worth it. A sound version would be Fork B (incremental key-membership
tracking) as a dedicated, separately-planned effort. Original design retained
below for reference.

File: `src/control-flow.ts`, `EachDirective.apply` (:62) / `computeKeys` (:88).

Add cheap pre-checks BEFORE building the full new-key Set: full turnover (0 overlap) is impossible if the new and prev arrays share any element identity, or if the prev key set is empty. Shape: in `apply`, first cheaply scan for a shared item (bounded early-exit) — if any shared identity found, skip `computeKeys`/`isDisjoint` entirely, set `prevKeys` lazily (or keep a dirty flag), commit `build(arr)` directly. Only on a possible turnover do the full `computeKeys` + `isDisjoint`. Must preserve: the empty-list collapse in `build` (:82) and the orphan-sweep `setValue(nothing)` on genuine disjoint turnover (:73-74, cite the class-doc bug comment :24-34 in code so it can't regress).

Risk: mis-detecting turnover leaks orphan `_$endNode` comments. Mitigation: fast-path only SKIPS work when a shared identity proves overlap>0; never asserts turnover cheaply.

## Phase 3 — Component wrapper elision (STRETCH / investigate-only) — CLOSED: KEEP WRAPPER (2026-07-12)
File: `src/component.ts` :518. Do NOT change behavior yet. Investigation step: determine whether `html\`${componentDirective(...)}\`` can be conditionally replaced with a bare `componentDirective(...)` when the component is NOT a direct `each`/`repeat` item (the wrapper exists to dodge lit's `_$clear(isClearingValue=true)` skip that leaks refs — comment :512-517). Deliverable: a written finding + a gating experiment run against `leak.test.ts` only. If elision can't be proven leak-safe, keep the wrapper and close the phase.

### Finding — KEEP the wrapper; do not elide.

**1. Architectural: value-level conditional elision is impossible.** `component()`
returns a factory whose call site yields the same value whether it lands as a
direct `each` item or a nested child (`${Header()}`). Lit never tells a value its
placement, so the factory cannot "elide when not an each-item." Elision would need
either a new API or moving the wrapper into `each` — and the rows of a large list
(the only case where the per-instance wrapper cost is material) ARE the direct-
each-item case that must keep the wrapper. So elision cannot help the hot path.
Low value even if it worked.

**2. Empirical: the wrapper is load-bearing (gating experiment run).**
- Elided the wrapper globally (factory + `.local` → bare `componentDirective`),
  ran `leak.test.ts`: **all 5 passed** — but only because that harness exercises
  FULL clear (→ empty → `nothing`) and FULL disjoint replace (→ turnover →
  `nothing`), both of which hit `EachDirective`'s `nothing`-collapse that clears
  the whole part and disconnects everything. The harness never exercises PARTIAL
  removal.
- Wrote a scratch partial-removal test (100 rows → keep first 50: overlap>0, not
  disjoint, never empty → `repeat` takes its per-key `removePart`/`_$clear(true)`
  path, no `nothing`-collapse). **Wrapper elided → LEAK**: RowBloc live instances
  `afterPartial=100` (expected 50) — the 50 removed rows' blocs never released.
  **Wrapper restored → PASS** (`afterPartial=50`). Scratch test deleted after.

**Conclusion:** the wrapper is required and cannot be conditionally elided safely
or usefully. Close Phase 3 with no source change.

### Follow-up surfaced (coverage gap, not Phase 3 scope)
`leak.test.ts` does NOT cover partial removal (overlap-preserving), which is the
exact scenario the wrapper defends. Recommend adding a partial-removal regression
case to `leak.test.ts` so an accidental future elision of the wrapper fails a
test. (Deferred — separate small task.)

## Files to Change
- `src/internal/track.ts` — add `pathSetEqual`.
- `src/internal/binding-session.ts` — Phase 1 guards; add `__registerProbe`.
- `src/control-flow.ts` — Phase 2 fast-path.
- `src/perf-budget.test.ts` — assert new probe counts.

## New probe
`__registerProbe` in `binding-session.ts` mirroring `__recomputeProbe` (:23): a module counter `registerCount` incremented inside `registerPaths` (:467) and the dep `registerConsumerPaths` call (:340), with `count()`/`reset()`. Assert in `perf-budget.test.ts` that `updateEveryTenth` on N=100 drives re-registration to ~changed-rows (≤20), not O(N), and swap/select stay ≤5.

## Acceptance Criteria
- [ ] Existing `perf-budget.test.ts` (`__recomputeProbe`) still passes.
- [ ] New `__registerProbe` shows re-registration ≤ recompute count on unchanged-shape ticks.
- [ ] `depend.test.ts`, `reactive.test.ts`, `leak.test.ts`, `component.test.ts` pass.
- [ ] Phase 2: no orphaned `<!---->` markers after full turnover.

## Risks & Mitigations
**Main Risk**: A skipped re-registration desyncs the source skeleton and a binding stops waking.
**Mitigation**: skip only when `pathSetEqual` proves the leaf set is identical; interest is a deterministic derivation of (paths, interner) so the cached value remains correct.

## Verify (orchestrator only)
Targeted, fish syntax, affected files only: `vp run typecheck`, `vp run lint src/`, and `vp run format:check` (oxfmt), plus the 5 named test files. Implementation subagents must NOT commit and NOT run tests/typecheck/lint/build — the orchestrator owns commits and validation.

## Out of Scope
- Rewriting the tracker/interner or channel subscription model.
- Committing to removing the component wrapper (Phase 3 is investigate-then-decide).
- Any repository-wide test/lint/build run.

## Assumptions & forks
- Assumes `interest` is a pure function of `(paths, interner)` with no time dependence (confirmed via `expandWithAncestors` :55). If false, Phase 1 reuse is unsafe — verify before shipping.
- Fork A (probe placement): count in `registerPaths` only vs. also the inline dep `registerConsumerPaths` (:340). Recommend both for a complete picture.
- Fork B (Phase 2 detection): shared-identity scan (simple, O(min) early-exit) vs. incremental key-membership tracking (more code, amortized O(1)). Recommend the scan first; revisit only if profiling demands.
