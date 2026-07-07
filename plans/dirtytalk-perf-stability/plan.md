# Plan — dirtytalk perf & stability pass (review-889 P4, P5, T9, E3)

Bounded follow-on to `plans/dirtytalk-fixes-cleanups/` (shipped). Closes the
remaining perf findings on the emit hot path plus one engine lifecycle gap.

## Goals — the findings this plan closes

| ID | Sev | Package | File | One-line |
|----|-----|---------|------|----------|
| P4 | perf | structural | `diff.ts`, `container.ts` | emit-side diff re-derives path segments per emit; `_refineAncestorMarks` string-scans the whole skeleton per array patch |
| P5 | perf | structural | `container.ts` | consumer (un)registration re-unions ALL consumers from scratch → O(N²·paths) mount/unmount |
| T9 | low/stability | structural | `container.ts`, `path-interner.ts` | per-class interner grows unbounded; **discovery: the proposed minimal fix (`interner.size` getter) already ships** — see Decisions |
| E3 | low/stability | engine | `dirty-channel.ts` | no `dispose()`; a scheduled flush pins channel→space→subscriber closures forever |

## Decisions

- **P4 → fix now.** Cache segment arrays on `PathInterner` (`lookupSegments`)
  and add an id-based ancestor lookup so `_refineAncestorMarks` stops
  string-`startsWith`-scanning the skeleton. No behavior change — same marks,
  fewer allocations/string ops.
- **P5 → fix now.** Refcount per `PathId`, incrementally maintained on
  register/unregister. Must produce a **byte-identical** skeleton `PathSet` to
  the old from-scratch union (verified by a property test), just computed in
  `O(Δpaths)`.
- **T9 → already satisfied, verify + document, no code required for the
  minimal ask.** `PathInterner.get size()` has existed since the original
  scaffold (`git log`: commit `252069f8`, "implement PathInterner") and is
  already exercised by `path-interner.test.ts:45`, `diff.test.ts:214`,
  `container.test.ts:460`. The review's "minimal, reversible fix" is done.
  The only remaining fork — per-instance interners / LRU / compaction — is
  **DEFERRED** (see `open-questions.md` OQ1). This pass adds a one-line
  cross-reference doc comment only.
- **E3 → fix now.** Add `DirtyChannel.dispose()`: cancels any pending
  scheduler flush (`scheduler.cancel?.()`), clears `#subscribers` and
  `#accumulated`, and guards `mark()`/`#flush()` post-dispose so a stale
  scheduler request (schedulers without `cancel()`, e.g. `ManualScheduler`,
  `SyncScheduler`) can't resurrect or fire the channel. Idempotent.
- **E3-forward → yes, add it** (see `open-questions.md` OQ3). `StructuralContainer`
  has no teardown path today; add a minimal additive `dispose()` that forwards
  to `this.channel.dispose()`. One method, no behavior change when unused.

**Risk Level (overall): Medium** — P4/P5 touch a hot, already-hardened path
(`emit`, `_refineAncestorMarks`) with subtle invariants (refcount correctness,
skeleton identity); E3/forward are low-risk additive lifecycle methods.

## Non-goals

- P1–P3, P6–P8 (P1 already shipped in the prior plan; P2/P3/P7 are spatial,
  out of scope; P6 is a "measure first" tracker allocation note, not this pass).
- T1–T8 (already shipped or separately scoped per the prior plan) — only T9
  is in this pass, and only its minimal ask.
- E1, E1b, E2, E4 (E1/E1b/E2 shipped in the prior plan; E4 is `Signal`, which
  is unused and out of scope).
- All of `@dirtytalk/spatial` (S1–S9, A7/A8) — untouched.
- T9's deeper mitigation (per-instance interners, LRU/compaction of
  `PathInterner`) — explicitly deferred, see `open-questions.md` OQ1.
- No new deps, no public API beyond: the already-existing `interner.size`
  (doc-only touch), `DirtyChannel.dispose()`, and `StructuralContainer.dispose()`.
  No `useSyncExternalStore` migration, no scheduler API changes beyond what
  `dispose()` calls (`cancel()` already exists).

## Execution mode — **Workflow**

Same shape as `dirtytalk-fixes-cleanups`: deterministic script, `phase()`
groups, `quick-build` implements, `investigator` adversarially verifies via
`{id, holds, issues}`.

**File-conflict map (drives parallelism):**

- **Unit S** (structural perf): `diff.ts`, `path-interner.ts`, `container.ts`
  (P4a/P4b/P5/T9-doc only), `diff.test.ts`, `path-interner.test.ts`,
  `container.test.ts`.
- **Unit X** (engine dispose): `dirty-channel.ts`, `dirty-channel.test.ts`.
- **Unit F** (structural forward): `container.ts` (adds `dispose()` only),
  `container.test.ts`.

P4, P5, and T9 **all live in `container.ts`/`path-interner.ts`** → one
sequential structural unit (S), not split further. E3 is engine-only
(`dirty-channel.ts`) → disjoint from S, runs in parallel. **Unit F depends on
both S and X**: it edits `container.ts` (same file as S → must apply after S)
and calls `channel.dispose()` (must exist in engine source → after X).
→ **No worktree** — default "here", sequential commits on current branch.

### Phases

| Phase | File | Unit | Parallel |
|-------|------|------|----------|
| 1 | `phase-1-structural-perf.md` | S (P4, P5, T9-doc) | ∥ with 2 |
| 2 | `phase-2-engine-dispose.md` | X (E3) | ∥ with 1; blocks 3 |
| 3 | `phase-3-structural-forward.md` | F (container.dispose() forward) | after 1 and 2 |
| 4 | verify + commits (this file) | all | after impl |

### Model assignment

| Unit | Agent | Model/effort | Why |
|------|-------|--------------|-----|
| S | quick-build | **opus/high** | refcount + ancestor-index invariants are subtle; must produce an identical skeleton to the old code |
| X | quick-build | sonnet/high | bounded: additive `dispose()` + two guard checks |
| F | quick-build | sonnet/high | one-line forward, small surface |
| Verify (each cluster) | investigator | sonnet/high | adversarial refute |

## Communication contract

- **Implementation** (quick-build): durable edits to disjoint/sequenced files
  + test extensions. Each returns a **structured summary** (files changed,
  what/where with line refs, done-check status) as its final response —
  captured by the workflow script. Agents **do not commit, do not run
  tests/typecheck/lint/build**.
- **Adversarial verify** (investigator, read-only): returns `{id, holds,
  issues[]}` via schema.
- **Commits:** orchestrator (main) commits after verify passes — batched as:
  `perf(structural)` (Unit S: P4 + P5 + T9 doc note), `feat(engine)` (Unit X:
  `dispose()`), `feat(structural)` (Unit F: container forward). Current
  branch.
- **Final validation:** orchestrator runs targeted commands itself, reported
  inline in the final response. Never fire-and-forget.

## Workflow script sketch

```js
export const meta = {
  name: 'dirtytalk-perf-stability',
  description: 'P4 (diff/ancestor perf), P5 (refcount skeleton), T9 (doc), E3 (DirtyChannel.dispose + forward)',
  phases: [{ title: 'Implement S+X' }, { title: 'Implement F' }, { title: 'Verify' }],
}

const VERDICT = { type:'object', required:['id','holds','issues'],
  properties:{ id:{type:'string'}, holds:{type:'boolean'},
    issues:{type:'array', items:{type:'string'}} } }

phase('Implement S+X')
const [s, x] = await parallel([
  () => agent(UNIT_S_BRIEF, { agentType:'quick-build', model:'opus', effort:'high',
        label:'perf:S-structural', phase:'Implement S+X' }),
  () => agent(UNIT_X_BRIEF, { agentType:'quick-build', effort:'high',
        label:'feat:X-engine-dispose', phase:'Implement S+X' }),
])

// Orchestrator note: engine BUILD is required before F's forward is
// validated (not before F is written — F only needs X's source to exist,
// which it does after this phase). Build happens in final validation.

phase('Implement F')
const f = await agent(UNIT_F_BRIEF, { agentType:'quick-build', effort:'high',
      label:'feat:F-container-forward', phase:'Implement F' })

phase('Verify')
const CLUSTERS = [
  { id:'structural', files:'dirtytalk-structural/src/{diff,path-interner,container}.ts + tests',
    findings:'P4 (segment-cache + integer ancestor lookup, identical marks), P5 (refcount skeleton, identical to full-recompute), T9 (size getter already correct, doc-only), F (container.dispose() forwards to channel.dispose())' },
  { id:'engine', files:'dirtytalk-engine/src/dirty-channel.ts + dirty-channel.test.ts',
    findings:'E3 (dispose cancels pending flush, clears subscribers, guards mark()/#flush() post-dispose, idempotent)' },
]
const verdicts = await parallel(CLUSTERS.map(c => () =>
  agent(`Read the working-tree diff for ${c.files} in /Users/brendanmullins/Projects/blac. ` +
        `Adversarially prove the ${c.id} findings (${c.findings}) are correctly and completely fixed, ` +
        `or find where they aren't. Cross-check against plans/dirtytalk-perf-stability/phase-*.md done-checks. ` +
        `Specifically probe: does the refcount skeleton ever diverge from a from-scratch union (double-decrement, ` +
        `negative counts, ALL_PATHS consumer count)? Does the ancestor-index change produce different marks than ` +
        `the old startsWith scan on any array-patch shape? Does dispose() leave a scheduler able to resurrect the ` +
        `channel? Do NOT run tests. Return {id:"${c.id}", holds, issues}.`,
    { agentType:'investigator', effort:'high', label:`verify:${c.id}`,
      phase:'Verify', schema:VERDICT })))

return { s, x, f, verdicts }
```

## Risks & assumptions

- **P5's refcount must exactly mirror `pathSetUnion`'s ALL_PATHS-dominance
  rule**: if any registered consumer's interest is `ALL_PATHS`, the skeleton
  must be `ALL_PATHS` (not just the unioned concrete ids) — a separate
  `_allPathsConsumers` counter carries this, decremented/incremented in
  lockstep with registration. A property test comparing incremental vs.
  from-scratch union across randomized register/unregister sequences is
  mandatory (see Phase 1 tasks), not optional polish.
- **P4's ancestor-index must not change `PathInterner.size` semantics.**
  Several tests assert exact `interner.size` counts
  (`diff.test.ts:214,238`, `path-interner.test.ts:45,76-77`,
  `container.test.ts:460`). The design deliberately never auto-interns a
  parent path that wasn't already interned by an existing call site — it only
  does `Map.get` lookups against already-interned prefixes, memoized per id.
- **E3 dispose() vs. schedulers without `cancel()`** (`ManualScheduler`,
  `SyncScheduler`): dispose() best-effort cancels when the scheduler exposes
  `cancel()`; for the two that don't, a stale scheduler-side reference to
  `#boundFlush` can outlive `dispose()` until the scheduler's own queue
  drains — mitigated by the `#disposed` guard in `mark()`/`#flush()` so the
  stale entry does nothing when it fires. Document this in the dispose()
  docstring; don't silently assume full reference release.
- **Critical lesson from the last run (bake into validation, not skip):**
  `@dirtytalk/structural` consumes `@dirtytalk/engine` via its **built**
  `dist/` (`workspace:^`, `types: ./dist/index.d.ts`), not source. Unit F's
  `container.ts` calls `this.channel.dispose()` — invisible to structural's
  `tsc`/tests until `@dirtytalk/engine` is rebuilt. **Final validation MUST
  run `pnpm --filter @dirtytalk/engine build` before any structural
  tsc/test command.**

## Final validation (orchestrator, after all commits — targeted only)

Run from repo root; report inline in the final response.

```fish
# Build engine FIRST — structural imports engine's built dist/index.d.ts,
# not source. Unit F's container.ts references the new DirtyChannel.dispose()
# — invisible to structural's tsc/tests until this runs (repeat of the
# B/C engine-build gap from dirtytalk-fixes-cleanups).
pnpm --filter @dirtytalk/engine build

# Targeted tests — touched packages + blac consumers (P4/P5 are on the emit
# hot path blac-react/blac-core depend on)
pnpm --filter @dirtytalk/structural exec vp test run
pnpm --filter @dirtytalk/engine     exec vp test run
pnpm --filter @blac/core            exec vp test run
pnpm --filter @blac/react           exec vp test run

# Typecheck touched packages
pnpm --filter @dirtytalk/structural exec tsc --noEmit
pnpm --filter @dirtytalk/engine     exec tsc --noEmit

# Format + lint gate
pnpm format:check
pnpm lint
```

Narrow to changed test files (`vp test run <path>`) if a package run is too
broad; no whole-repo suite. Test files must `import { ... } from 'vite-plus/test'`.
