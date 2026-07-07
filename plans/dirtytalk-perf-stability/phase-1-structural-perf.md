# Phase 1 — Structural emit-path perf: P4, P5, T9-doc (Unit S)

**Goal:** the emit-side diff and `_refineAncestorMarks` no longer re-derive
path segments or string-scan the skeleton per emit (P4); consumer
register/unregister maintains the skeleton incrementally instead of
re-unioning every consumer (P5); `PathInterner.size` (already the T9 minimal
fix) gets a one-line doc cross-reference (T9).

**Parallel:** whole phase runs ∥ Phase 2 (disjoint package). All tasks below
are **one agent, sequential** (shared files `path-interner.ts`, `diff.ts`,
`container.ts`).

**Owner:** quick-build, **opus/high**. Do **not** commit; do **not** run
tests/typecheck/lint/build. Extend existing tests, don't rewrite.

## Verify (phase entry — orchestrator)

- `rg -n 'lookupSegments|ancestorIds|ancestorTargetId' packages/dirtytalk-structural/src/path-interner.ts`
  → no hits (confirms none of this exists yet).
- `rg -n '_pathRefCounts|_allPathsConsumers' packages/dirtytalk-structural/src/container.ts`
  → no hits (confirms `registerConsumerPaths`/`unregisterConsumer` still call
  `_recomputeSkeleton` which re-unions from scratch).
- `rg -n 'get size' packages/dirtytalk-structural/src/path-interner.ts` →
  confirms the getter already exists (T9's minimal fix is already shipped).

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent (model/effort) | Report-back | Done-check |
|---|------|-------|-----------|-----------|---------------------|-------------|------------|
| S1 | **P4a** — add `lookupSegments(id): readonly string[]` to `PathInterner`: memoize `path.split('.')` per id in a parallel array (`this._segments[id]`), computed via the existing `lookup(id)` (so sentinel decoding is reused). Add `getAtSegments(state, segments)` to `diff.ts` (same body as `getAt` minus the split). Rewrite `getAt` to call `getAtSegments(state, path === '' ? [] : path.split('.'))` (keeps the public signature/behavior identical for existing callers). Rewrite `diffAlongSkeleton`'s loop (`diff.ts:66-73`) to use `interner.lookupSegments(id)` + `getAtSegments` instead of `interner.lookup(id)` + `getAt`. | `path-interner.ts`, `diff.ts` | sequential | — | quick-build (opus/high) | sync final response | `diffAlongSkeleton` produces identical results to before on existing test fixtures; no `path.split` call remains in its hot loop (only inside `lookupSegments`'s first-computation branch); `getAt`'s public behavior (incl. empty-path, missing-intermediate) is unchanged. |
| S2 | **P4b** — add an ancestor-lookup pair to `PathInterner`: (1) change `internAncestor(path)` to also call `this.intern(path)` first (idempotent — the real path is already interned by every current call site, this just makes it explicit/safe) and record `this._ancestorTarget[ancestorId] = realId` in a parallel array; expose `ancestorTargetId(id): PathId \| undefined`. (2) add `ancestorIds(id): readonly PathId[]` — using `lookupSegments(id)`, for each shrinking prefix (`segments.slice(0,k).join('.')`, k from length-1 down to 1) look up `this._map.get(prefix)` (a **plain read**, never force-interns) and collect the ids that already exist; memoize per id in a parallel array. **Do not** auto-intern missing intermediate prefixes — this must not change `.size` for any existing path (see plan.md Risks). In `container.ts`'s `_refineAncestorMarks` (`:290-343`): replace the `prefixes: string[]` collection + `startsWith` scan (`:298-334`) with: build `targetIds = new Set<PathId>()` from `interner.ancestorTargetId(id)` for each ancestor-watch id in `roughSet`; for each `skelId` in the skeleton, `descends = interner.ancestorIds(skelId).some(a => targetIds.has(a))`; on a match, read via `getAtSegments(prev/next, interner.lookupSegments(skelId))` (folds in S1's cache) instead of `getAt(prev/next, skelPath)`. | `path-interner.ts`, `container.ts` | sequential | S1 | quick-build (opus/high) | sync final response | Same marks as before on every existing `_refineAncestorMarks`/`patch()` test case (array-replace, class-instance-replace, mixed plain+atomic patch); zero `startsWith` calls remain in `_refineAncestorMarks`; `interner.size` unchanged for every existing fixture (spot-check the exact asserted counts in `diff.test.ts:214,238`, `path-interner.test.ts:45,76-77`, `container.test.ts:460` still pass). |
| S3 | **P5** — replace `_recomputeSkeleton` (`:263-267`) with incremental refcounting. Add `private readonly _pathRefCounts = new Map<PathId, number>()`, `private _allPathsConsumers = 0`, and a live `private readonly _skeletonSet = new Set<PathId>()` backing `_skeleton`. Add `private _applyRefDelta(prev: PathSet \| undefined, next: PathSet \| undefined): void` that decrements every id in `prev` (deleting from `_skeletonSet` when a count hits 0; decrementing `_allPathsConsumers` if `prev === ALL_PATHS`) then increments every id in `next` (adding to `_skeletonSet` on the 0→1 transition; incrementing `_allPathsConsumers` if `next === ALL_PATHS`), then sets `this._skeleton = this._allPathsConsumers > 0 ? ALL_PATHS : this._skeletonSet`. Rewrite `registerConsumerPaths` (`:233-239`) to call `this._applyRefDelta(prev, paths)` after the existing `pathSetEquals` fast-path skip. Rewrite `unregisterConsumer` (`:241-243`) to call `this._applyRefDelta(prev, undefined)` only when a consumer actually existed. Keep `pathSetUnion`/`_recomputeSkeleton` machinery removed (no dead code) unless still referenced elsewhere — check with `rg -n '_recomputeSkeleton\|pathSetUnion' packages/dirtytalk-structural/src` first. | `container.ts` | sequential | S1, S2 | quick-build (opus/high) | sync final response | For any sequence of register/unregister calls, the resulting `_skeleton` is set-equal (`pathSetEquals`) to a from-scratch union of all currently-registered consumers' paths — verified by a property test (S5) with randomized sequences including duplicate paths across consumers, re-registration with changed paths, and an `ALL_PATHS`-interest consumer mixed with concrete-path consumers. |
| S4 | **T9 doc-only** — add a one-line JSDoc addition to `PathInterner.get size()` (`:96-98`) cross-referencing it as the leak/growth diagnostic surface for unbounded dynamic-key state (e.g. "Exposed for devtools/leak diagnostics — see review-889 T9: per-class interners are append-only and shared across instances; watch this for state shapes with unbounded dynamic keys."). No behavior change. | `path-interner.ts` | sequential | — | quick-build (opus/high) | sync final response | Doc comment present on `size`; no functional diff to the getter. |
| S5 | **Tests** — extend `diff.test.ts` (segment-cache correctness: repeated `diffAlongSkeleton` calls on the same interner give identical results; `getAt` behavior unchanged for empty-path/missing-intermediate cases), `path-interner.test.ts` (`lookupSegments` memoization returns `===`-stable arrays on repeat calls for the same id; `ancestorIds`/`ancestorTargetId` correctness; `.size` unchanged by the new lookups), and `container.test.ts` (P4b: `_refineAncestorMarks` produces identical marks pre/post for array-replace + mixed patches; P5: the mandatory property test from S3's done-check). | `diff.test.ts`, `path-interner.test.ts`, `container.test.ts` | sequential | S1–S4 | quick-build (opus/high) | sync final response | New cases exist for P4a/P4b/P5/T9; `import { ... } from 'vite-plus/test'`. |

## Sanity check (phase exit — orchestrator, best-effort)

- `git diff --stat` limited to `packages/dirtytalk-structural/src/{diff,path-interner,container}.ts` + the three test files.
- `rg -n 'path\.split' packages/dirtytalk-structural/src/diff.ts` → only inside `getAt`'s delegation to `getAtSegments` and `lookupSegments`'s first-compute branch, not in `diffAlongSkeleton`'s loop.
- `rg -n 'startsWith' packages/dirtytalk-structural/src/container.ts` → no hit in `_refineAncestorMarks`.
- `rg -n '_recomputeSkeleton' packages/dirtytalk-structural/src/container.ts` → removed (or confirm still referenced if S3 kept it for a reason — flag if so).
- Confirm `dirty-channel.ts`/engine files untouched by this phase (owned by Phase 2).

## Commit (orchestrator)

`perf(structural): cache path segments, integer ancestor lookup, refcount skeleton`
(fold T9 doc line into the same commit). Subagent does not commit.

## Done-check

- [ ] P4: `diffAlongSkeleton` and `_refineAncestorMarks` no longer split/startsWith per emit; identical marks to before.
- [ ] P5: register/unregister maintain `_skeleton` incrementally; property-test-verified identical to from-scratch union.
- [ ] T9: doc cross-reference added; deeper mitigation explicitly deferred (see `open-questions.md`).
- [ ] `interner.size` assertions in existing tests unchanged.
