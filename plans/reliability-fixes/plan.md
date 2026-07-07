# Plan — Reliability fixes (review-884 + review-889 recommended set)

Fix the seven confirmed findings the reviews flagged as most impactful. All were
re-verified against source by recon (`reports/recon-*.md`). Decisions from
`open-questions.md` are **accepted at recommended defaults**.

## Goals

Close, with regression tests, the seven bugs below:

| ID | Sev | Package | One-line |
|----|-----|---------|----------|
| R1/T1 | critical | structural | `emit()` drops changes outside the consumer skeleton → watch/select/plugins/system-events never wake |
| R2/T6 | high | react + structural | Passive-effect subscription with no post-subscribe recheck → mount-window emits lost |
| R3 | high | react | Memo re-acquires same refId while release effect doesn't re-key → ref leak |
| R4 | high | react | `acquire(countRef:true)` in render phase leaks on abandoned renders |
| R5 | high | core | `watch()` drops args (`init(undefined)`), leaks (zero-ref), goes silent on external dispose |
| R6 | high | core | `onHydrationChange` plugin hook documented but never dispatched |
| E1 | high (latent) | engine | Shared scheduler's single flush slot deadlocks the loser channel |

## Decisions (from open-questions.md, defaults accepted)

- **Q1 → Option B (unified R3+R4):** render only `ensure`s (no ref); ownership ref
  taken in a `useLayoutEffect`; deps acquired in reconcile. R3 becomes moot.
- **Q2 → recheck-after-subscribe:** compare live state vs render snapshot after
  `subscribe`, `force()` if advanced. Applies to `useBloc` + `useStructural`.
- **Q3 → full-ref `watch()`:** real ref for the watcher's lifetime + `disposed`
  resubscribe. **Behavior change: `watch()` now keeps its target alive.**
- **Q4 → wire up `onHydrationChange`:** 3-file mirror of `depsChanged`.
- **Q5 → include E1:** `Set<()=>void>` drain-all in schedulers.

## Non-goals

- No `useSyncExternalStore` migration (Q2 option not taken); no tearing fix beyond R2.
- No fixes for R7–R22, S1–S9, performance (P*), or architecture (A*) items — separate work.
- No public API surface changes beyond what each fix strictly needs (R5 adds `args`
  plumbing to `watch`'s internal `BlocRef`/`resolveBloc`; R6 adds a registry
  lifecycle event — both internal/additive).
- No dependency, config, or new-pattern introduction. No `ROOT_SENTINEL` reuse
  outside `emit`'s empty-diff branch.

## Execution mode — **Workflow**

Chosen because there are 5 mostly-disjoint delegated units, a clear parallel
fan-out, and a quality gate (adversarial verify per fix). A deterministic script
holds the ordering constraint (R5 → R6 share `StateContainerRegistry.ts`) and runs
the rest concurrently. Script sketch below.

**File-conflict map (drives parallelism):**

- P1 structural: `container.ts`, `path-interner.ts`, `path-set.ts`, `diff.ts` (+ tests)
- P2 engine: `scheduler.ts` (+ `scheduler.test.ts`)
- P3 react+structural: `blac-react/src/useBloc.ts`, `dirtytalk-structural/src/react-hook.ts` (+ tests)
- P4 core: `watch/watch.ts` (+ `BlocRef`/`resolveBloc` therein), tests
- P5 core: `core/StateContainer.ts`, `core/StateContainerRegistry.ts`, `plugin/PluginManager.ts` (+ tests)

P1/P2/P3/P4 touch disjoint files → run concurrently in one working tree.
**P5 must follow P4** (both may touch `StateContainerRegistry.ts`; P5 definitely does).
→ **No worktree needed** (disjoint files in the live tree don't conflict); default "here".

### Phases

| Phase | File | Units | Parallel |
|-------|------|-------|----------|
| 1 | `phase-1-structural-emit.md` | R1/T1 | ∥ with 2,3,4 |
| 2 | `phase-2-engine-scheduler.md` | E1 | ∥ with 1,3,4 |
| 3 | `phase-3-react-usebloc.md` | R2/T6, R3, R4 | ∥ with 1,2,4 |
| 4 | `phase-4-core-watch.md` | R5 | ∥ with 1,2,3; **before 5** |
| 5 | `phase-5-core-hydration.md` | R6 | after 4 |
| 6 | validation (this file) | all | after commits |

### Model assignment

| Unit | Agent | Model/effort | Why |
|------|-------|--------------|-----|
| R1/T1 | quick-build | sonnet/high | sentinel-id + interner decode edge |
| E1 | quick-build | sonnet/medium | mechanical Set swap + test update |
| R2/R3/R4 | quick-build | **opus/high** | concurrent-React ownership refactor; subtle |
| R5 | quick-build | sonnet/high | args plumbing + dispose resubscribe |
| R6 | quick-build | sonnet/high | 3-file event mirror |
| Verify (each) | investigator | sonnet/high | adversarial refute of each fix |

## Communication contract

- **Implementation** (quick-build): durable edits to disjoint files. Each returns a
  **structured summary** (files changed, what/where, done-check status) as its final
  response — the workflow script captures it in a script var; the orchestrator reads
  the workflow result. Agents **do not commit, do not run tests/typecheck/lint/build**.
- **Adversarial verify** (investigator, read-only): returns
  `{id, holds:boolean, issues[]}` via schema. The orchestrator reads verdicts from
  the workflow result.
- **Commits:** orchestrator (main) commits per phase (or batches) after the workflow,
  in repo format, on the current branch. See per-phase Commit lines.
- **Final validation:** orchestrator runs targeted commands itself (or via
  `test-runner`), result reported **inline in the final response**. Never
  fire-and-forget.

## Workflow script sketch

```js
export const meta = {
  name: 'reliability-fixes',
  description: 'Fix R1/T1,R2/T6,R3,R4,R5,R6,E1 across structural/engine/react/core',
  phases: [{ title: 'Implement' }, { title: 'Verify' }],
}

const VERDICT = { type:'object', required:['id','holds','issues'],
  properties:{ id:{type:'string'}, holds:{type:'boolean'},
    issues:{type:'array', items:{type:'string'}} } }

// Briefs are the Tasks tables from each phase file, pasted verbatim + "do not
// commit / do not run tests" footer.
const impl = await parallel([
  () => agent(P1_BRIEF, { agentType:'quick-build', effort:'high',  label:'fix:R1-emit',      phase:'Implement' }),
  () => agent(P2_BRIEF, { agentType:'quick-build',                 label:'fix:E1-scheduler', phase:'Implement' }),
  () => agent(P3_BRIEF, { agentType:'quick-build', model:'opus', effort:'high', label:'fix:R2R3R4-useBloc', phase:'Implement' }),
  async () => {                                    // core chain: R5 before R6 (shared registry.ts)
    const r5 = await agent(P4_BRIEF, { agentType:'quick-build', effort:'high', label:'fix:R5-watch', phase:'Implement' })
    const r6 = await agent(P5_BRIEF, { agentType:'quick-build', effort:'high', label:'fix:R6-hydration', phase:'Implement' })
    return [r5, r6]
  },
])

const CLUSTERS = [
  { id:'R1',  files:'dirtytalk-structural/src/{container,path-interner,path-set,diff}.ts' },
  { id:'E1',  files:'dirtytalk-engine/src/scheduler.ts' },
  { id:'R2R3R4', files:'blac-react/src/useBloc.ts, dirtytalk-structural/src/react-hook.ts' },
  { id:'R5',  files:'blac-core/src/watch/watch.ts' },
  { id:'R6',  files:'blac-core/src/{core/StateContainer,core/StateContainerRegistry,plugin/PluginManager}.ts' },
]
const verdicts = await parallel(CLUSTERS.map(c => () =>
  agent(`Read the working-tree diff for ${c.files}. Adversarially try to prove the `+
        `${c.id} bug still reproduces OR the fix is incorrect/incomplete/regressive. `+
        `Cite the exact review finding's failure scenario and check the diff closes it. `+
        `Return {id:"${c.id}", holds, issues}.`,
    { agentType:'investigator', effort:'high', label:`verify:${c.id}`, phase:'Verify', schema:VERDICT })))

return { impl, verdicts }
```

Orchestrator after workflow: read `verdicts`; for any `holds:false`, re-brief the
owning quick-build with the issues before committing that phase. Then commit per
phase and run final validation.

## Risks & assumptions

- **R2/R3/R4 in one file (`useBloc.ts`) by one agent, sequentially.** Highest-risk
  unit; opus/high. R4's ensure-in-render + acquire-in-`useLayoutEffect` narrows but
  does not eliminate a 0-ref window between render and layout effect — acceptable
  (layout effect is sync, pre-paint). Regression test must cover StrictMode double-invoke
  and an abandoned-render simulation.
- **R5 changes observable lifecycle** (watch keeps target alive). Update/adjust any
  existing watch test asserting the target is disposed while watched.
- **E1 test update required:** `scheduler.test.ts` "request→request→pump runs once
  (two distinct fns)" encodes the old single-slot semantics — must flip to expect
  both fns run; add a same-fn dedup case.
- **R1 sentinel decode:** adding a root-sentinel PathId must not be mis-decoded by
  the existing `'\0a:'` ancestor-prefix logic in `path-interner.ts`/`path-set.ts` —
  add an explicit guard (see phase 1).
- Assumption: no other in-repo consumers rely on the buggy behaviors (recon found
  none; spatial package is the only zero-consumer surface and is untouched here).

## Final validation (orchestrator, after all commits — targeted only)

Run from repo root. Report results inline in the final response (or `SendMessage`
to named main/lead if delegated to `test-runner` async).

```fish
# Targeted tests per touched package (test-runner haiku, or inline)
pnpm --filter @dirtytalk/structural exec vp test run
pnpm --filter @dirtytalk/engine     exec vp test run
pnpm --filter @blac/react           exec vp test run
pnpm --filter @blac/core            exec vp test run

# Typecheck the four touched packages
pnpm --filter @dirtytalk/structural exec tsc --noEmit
pnpm --filter @dirtytalk/engine     exec tsc --noEmit
pnpm --filter @blac/react           exec tsc --noEmit
pnpm --filter @blac/core            exec tsc --noEmit

# Format + lint gate (memory: run format:check before commit)
pnpm format:check
pnpm lint
```

If any package's full test run is too broad, narrow to the changed test files
(`vp test run <path>`); do not run a whole-repo suite beyond these four packages.
