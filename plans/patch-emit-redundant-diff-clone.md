# Plan: Collapse redundant key-walks/clone in patch()/emit()

## Decision
**Approach**: Make `dirtytalk-structural`'s `deepMerge` lazily allocate its
`{...target}` clone only once a real per-key difference is found, instead of
unconditionally cloning before knowing if anything changed; leave
`StateContainer.patch()`'s existing top-level pre-check and `emit()`'s
`_equalityFn` scan as-is (documented as accepted, not silently dropped).
**Why**: The unconditional `{...target}` clone in `deepMerge` is the dominant,
mechanically-fixable cost (Mechanism 1) and is fully local to one already
independently-tested function; it requires no new cross-package API and keeps
every existing no-op/reference-equality invariant intact. The other two scans
(`StateContainer.patch`'s pre-check, `emit()`'s `shallowEqualState`) protect
distinct bookkeeping layers or a user-configurable safety net — collapsing
them (Options A/C) buys little and risks more than it saves.
**Risk Level**: Low

## Root Cause (recap)
`patch()` answers "did anything change" 2-3x: `StateContainer.patch()`'s
`allEqual` pre-check (`StateContainer.ts:489-500`), `StructuralContainer.patch`'s
emptiness guard (`container.ts:216-221`, = backlog **PN10**), then `deepMerge`
(`container.ts:429-455`) redoes the per-key `Object.is` compare *and*
unconditionally clones `target` via `{...target}` (`:434-436`) before it even
knows whether the patch is a no-op — the clone is thrown away whenever
`changed` ends up `false`. Separately, `emit()`/`applyState`
(`StateContainer.ts:536`) runs `shallowEqualState` (full `Object.keys` +
per-key `Object.is`) unconditionally. This exact triple-walk-plus-unconditional-clone
shape is **not** in `reports/perf-opportunities-dirtytalk.md` (PN1/PN2/PN6/PN10
are adjacent but distinct: empty-Set union, ancestor-mark closures, equality-fn
closure reuse, patch's emptiness-check allocation) — this plan is a new item,
and it makes PN10's emptiness guard purely optional (still cheap, left as-is).

## Options Considered
- **Option A (rejected)** — new internal API so `StateContainer.patch()`
  passes a pre-merged object + changed-flag into `StructuralContainer`,
  skipping `deepMerge`'s own walk. Rejected: `StateContainer`'s pre-check is
  shallow-only and can't produce nested merges, so it can't actually replace
  `deepMerge`'s work when a real (possibly nested) change exists — this would
  add a new internal symbol-branded API (like `INIT_CONFIG`/`APPLY_DEPS`) for
  a case that only pays off on the already-cheap true-no-op path.
- **Option B (recommended)** — lazy-clone `deepMerge`: walk `Object.keys(patch)`
  once, only materialize `out = {...target}` on the first key where
  `Object.is(merged, prev)` is false; unchanged keys need no explicit
  assignment since the eventual `{...target}` spread already carries their
  value. Preserves the "same-reference on no-op" contract at every recursion
  level (including nested branches that are individually no-ops), and is the
  minimal change confined to one function.
- **Option C (rejected)** — drop `StateContainer.patch()`'s own pre-check and
  rely solely on `deepMerge`'s `Object.is(prev,next)` post-check. Rejected:
  the pre-check also gates `_checkEmitRate()`, `_pendingChange` capture, and
  the registry `hasStateChangedListeners` notify (`StateContainer.ts:503-524`)
  for true no-ops — removing it would let those run for calls that used to
  short-circuit, a correctness-adjacent behavior change for a marginal win
  once Option B lands (the walk left over is a handful of `Object.is` calls).
- **`emit()`'s `shallowEqualState` scan (deferred, not implemented here)** —
  it's user-configurable (`configureBlac({ equality })`) and is the only
  thing standing between a caller reusing/mutating a reference and a bogus
  wake; it can't be proven safe to skip generically. The only safe lever is
  an opt-in escape hatch (e.g. `emit(next, { skipEqualityCheck: true })`) for
  callers who know they always construct a fresh, distinct object — that's a
  public-API surface change and belongs in its own plan/maintainer sign-off,
  same treatment as backlog items marked "design decision" (PN6/PN9/BC2).

## Implementation Steps
1. **Read first** — re-open `packages/dirtytalk-structural/src/container.test.ts`
   in full to confirm no test asserts on `deepMerge`'s old eager-clone timing
   (none found in this investigation; only reference/value assertions).
2. **Rewrite `deepMerge`** in `packages/dirtytalk-structural/src/container.ts`
   (`:429-455`): single loop over `Object.keys(patch)`; compute `mergedVal`/
   `keyChanged` per key (recursing into nested plain-object branches exactly
   as today); lazily create `out` on first `keyChanged`; return `out ?? target`.
   No signature change, no new exports.
3. **Extend `packages/dirtytalk-structural/src/container.test.ts`** — add
   cases: (a) a wide (~20-field) target patched with 1 already-equal field
   returns the identical `target` reference; (b) a wide target patched with 1
   truly-different field returns a new reference with only that field changed
   and all others value-identical; (c) a nested no-op patch (`{user: {email:
   sameValue}}`) still returns `target` by reference at every level.
4. **Extend `packages/dirtytalk-structural/src/hotpath.bench.ts`** — add a
   new `describe` block (e.g. `PN-patch-width`) sweeping target width
   `N = 1..20` with exactly 1 field touched, plus a true-no-op variant at the
   same widths, per the prompt's flagged "under-measured shape."
5. **No changes to `blac-core`** — `StateContainer.patch`/`applyState` are
   left untouched; add a one-line code comment at `StateContainer.ts:489`
   cross-referencing this plan so a future reader knows the pre-check was
   deliberately kept, not missed.

## Files to Change
- `packages/dirtytalk-structural/src/container.ts` — lazy-clone `deepMerge`.
- `packages/dirtytalk-structural/src/container.test.ts` — new no-op/width tests.
- `packages/dirtytalk-structural/src/hotpath.bench.ts` — new width-sweep bench.
- `packages/blac-core/src/core/StateContainer.ts` — comment only, no logic change.

## Acceptance Criteria
- [ ] `deepMerge` returns `Object.is`-identical `target` for every no-op
      patch shape already covered by tests (flat, nested, empty).
- [ ] A 1-of-N-field real change on a wide object allocates exactly one
      `{...target}` clone per changed nesting level (verified by the new
      width-sweep bench showing flat, not width-proportional, cost growth
      relative to today's baseline for the no-op case).
- [ ] No change to `changedPathsFromPatch`/`_refineAncestorMarks` observable
      output — existing `container.test.ts` path-marking tests still pass.

## Risks & Mitigations
**Main Risk**: subtly breaking the "no-op returns same reference" invariant
that downstream callers (`StructuralContainer.patch`'s `Object.is(prev,next)`
skip, `StateContainer.patch`'s own `Object.is(prev,next)` at `:510`) rely on
for correctness, not just perf — a regression here silently reintroduces
consumer wake-ups on no-op patches.
**Mitigation**: keep the fix confined to `deepMerge` only (no touch to the
callers that already trust its contract), and add the explicit reference-
identity tests in Step 3 before relying on bench numbers alone.
**Secondary Risk**: nested nested-object nested-key ordering edge case where
an earlier key's lazy `out` creation must still carry later, unrelated keys
correctly — mitigated by the fact `{...target}` always spreads the full
object regardless of *which* key triggered its creation.

## Validation (targeted only — do not run repo-wide)
- `cd packages/dirtytalk-structural; vp test run container.test.ts`
- `cd packages/dirtytalk-structural; vp test run container.test.ts --coverage=false -- --reporter=verbose` (or repo's bench invocation) against `hotpath.bench.ts` only, comparing new `PN-patch-width` numbers pre/post-change.
- Re-run (implementer, not this planning task) the `apps/perf` pure-state
  benchmarks named in the investigation — **multi-store coordination**,
  **cross-store propagation**, **batch rapid updates**, **derived state
  computation** — these are `patch()`-based and should show the improvement.
  **getter track simple/multiple** are `emit()`-based (Mechanism 2) and are
  *not* expected to move from this change alone; note that explicitly in the
  PR so no one misreads a flat result there as a regression.
- `cd packages/dirtytalk-structural; vp lint src/container.ts src/container.test.ts src/hotpath.bench.ts`
- `cd packages/dirtytalk-structural; vp typecheck` scoped to the package (no repo-wide tsc).

## Out of Scope
- Cluster 1 (`acquire`/`release`/instance-construction, `createMeta` closures,
  eager `stateChanged` bridge subscription) — separate, already documented.
- `emit()`'s `shallowEqualState` full-scan — flagged above as a deferred,
  opt-in-API design decision, not implemented in this plan.
- Any array element-wise diffing — arrays remain atomic leaves.
- Cataloguing this item into `reports/perf-opportunities-dirtytalk.md` — left
  to the implementer/maintainer as a follow-up note, not a code change.
