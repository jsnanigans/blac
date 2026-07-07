# Plan — dirtytalk fixes & cleanups (review-889 remaining set)

Close the still-open dirtytalk findings from `review-889` + recon. The three
highest (T1, E1 slot→Set, T6 mount-gap) already shipped and are **excluded**
(verified in source). Decisions from `open-questions.md` accepted at **recommended
defaults**.

## Goals — the findings this plan closes

| ID | Sev | Package | File | One-line |
|----|-----|---------|------|----------|
| T2 | high | structural | `tracker.ts` | proxy cache keyed by target only → aliased subtree records wrong path → silent stale UI |
| T3 | high | structural | `tracker.ts` | tracked read of a frozen object throws (Proxy `[[Get]]` invariant) |
| T4 | med | structural | `tracker.ts` | object key enumeration (`Object.keys`/`in`/`for..in`) records nothing → record-shaped state never wakes |
| T5 | med | structural | `tracker.ts` | sub-proxies leak into `===` callbacks & derived arrays → silent mismatch/stale reads |
| P1 | perf | structural | `container.ts` | single-consumer `ALL_PATHS` shortcut wakes on every change (common topology) |
| E2 | med | engine | `dirty-channel.ts` | flush rethrows into scheduler ctx; no error seam |
| E1b | low | engine | `scheduler.ts` | drain loop lacks per-fn isolation — one throw starves remaining pending flushes |
| — | cleanup | engine+structural | barrels, pkg | de-barrel unused `Signal`/`Observable`, `pathsFromPatch`; A8 packaging nits |

## Decisions (open-questions.md — defaults accepted)

- **Q1 → spatial out of scope** (leave as-is; unused + beta). Non-goal.
- **Q2 → de-barrel only:** remove `Signal`/`Observable` + `pathsFromPatch` from
  barrels (keep source; `@internal` on `pathsFromPatch`). **Keep** `/react` subpath.
- **Q3 → T5 = `raw()` helper** + `proxy→target` WeakMap + doc hazards. No auto-unwrap.
- **Q4 → fix P1 now.**
- **Q5 → onError seam:** `DirtyChannel` ctor option + per-fn drain isolation +
  forward via `StructuralContainerOptions`. No blac/spatial wiring.

## Non-goals

- **All of spatial** (S1–S9, A7, spatial pkg A8) — untouched.
- blac `configureBlac({ onError })` wiring (review-884 F9) — separate work.
- `useStructural`/`react` subpath deletion; deleting `Signal`/`pathsFromPatch`
  source files (de-barrel only).
- T7 (dead binding branch), T8 (dotted-key asserts), T9 (interner growth), A3/A5
  design notes, P2–P8 (P1 is the only perf item in scope), E3/E4.
- No new deps, no `useSyncExternalStore` migration, no public API beyond `raw()` +
  the additive `onError` options.

## Execution mode — **Workflow**

3 mostly-disjoint impl units + an adversarial verify gate — same shape as the prior
`reliability-fixes` run. A deterministic script holds the one ordering constraint
(Unit B forwards the `onError` option added by Unit C) and runs the rest concurrently.

**File-conflict map (drives parallelism):**

- **Unit A** (structural tracker+barrel): `tracker.ts`, `index.ts`, `diff.ts`,
  `package.json`, `README.md`, `tracker.test.ts`
- **Unit C** (engine): `dirty-channel.ts`, `scheduler.ts`, `index.ts`, `space.ts`,
  `package.json`, `dirty-channel.test.ts`, `scheduler.test.ts`
- **Unit B** (structural container): `container.ts`, `container.test.ts`

A ∥ C (different packages). **B depends on C** (needs `DirtyChannel`'s `onError`
option type). A vs B touch disjoint structural files → no conflict.
→ **No worktree** — default "here", sequential commits on current branch.

### Phases

| Phase | File | Unit | Parallel |
|-------|------|------|----------|
| 1 | `phase-1-structural-tracker.md` | A (T2,T3,T4,T5 + structural cleanup) | ∥ with 2 |
| 2 | `phase-2-engine-hardening.md` | C (E2, E1b + engine cleanup) | ∥ with 1; blocks 3 |
| 3 | `phase-3-structural-container.md` | B (P1 + onError forward) | after 2 |
| 4 | verify + commits (this file) | all | after impl |

### Model assignment

| Unit | Agent | Model/effort | Why |
|------|-------|--------------|-----|
| A | quick-build | **opus/high** | interacting proxy-trap semantics (compound key, frozen leaf, new traps, identity) |
| C | quick-build | sonnet/high | bounded: additive option + try/catch drains + barrel |
| B | quick-build | sonnet/high | touches just-fixed `emit()`; small but careful |
| Verify (each) | investigator | sonnet/high | adversarial refute of each unit |

## Communication contract

- **Implementation** (quick-build): durable edits to disjoint files + test
  extensions. Each returns a **structured summary** (files changed, what/where,
  done-check status) as its final response — captured in a workflow script var;
  orchestrator reads the workflow result. Agents **do not commit, do not run
  tests/typecheck/lint/build**.
- **Adversarial verify** (investigator, read-only): returns `{id, holds, issues[]}`
  via schema; orchestrator reads verdicts from the workflow result.
- **Commits:** orchestrator (main) commits after verify passes — batched as: one
  `fix(structural)` (A+B), one `fix(engine)` (C), plus a `chore` for cleanups if
  cleaner. Current branch, repo format.
- **Final validation:** orchestrator runs targeted commands itself (or via
  `test-runner`), reported **inline in the final response**. Never fire-and-forget.

## Workflow script sketch

```js
export const meta = {
  name: 'dirtytalk-fixes-cleanups',
  description: 'Close T2,T3,T4,T5,P1,E2,E1b + de-barrel cleanups in dirtytalk structural/engine',
  phases: [{ title: 'Implement' }, { title: 'Verify' }],
}

const VERDICT = { type:'object', required:['id','holds','issues'],
  properties:{ id:{type:'string'}, holds:{type:'boolean'},
    issues:{type:'array', items:{type:'string'}} } }

// Briefs = the Tasks table from each phase file, pasted verbatim + the
// "do not commit / do not run tests" footer.
const impl = await parallel([
  () => agent(UNIT_A_BRIEF, { agentType:'quick-build', model:'opus', effort:'high',
        label:'fix:A-tracker', phase:'Implement' }),
  async () => {                                   // C then B (B needs C's onError type)
    const c = await agent(UNIT_C_BRIEF, { agentType:'quick-build', effort:'high',
          label:'fix:C-engine', phase:'Implement' })
    const b = await agent(UNIT_B_BRIEF, { agentType:'quick-build', effort:'high',
          label:'fix:B-container', phase:'Implement' })
    return [c, b]
  },
])

const CLUSTERS = [
  { id:'A', files:'dirtytalk-structural/src/{tracker,index,diff}.ts' },
  { id:'C', files:'dirtytalk-engine/src/{dirty-channel,scheduler,index}.ts' },
  { id:'B', files:'dirtytalk-structural/src/container.ts' },
]
const verdicts = await parallel(CLUSTERS.map(c => () =>
  agent(`Read the working-tree diff for ${c.files}. Adversarially prove the `+
        `${c.id} findings still reproduce OR the fix is incorrect/incomplete/`+
        `regressive. Cite each finding's failure scenario from `+
        `plans/dirtytalk-fixes-cleanups/phase-*.md and check the diff closes it. `+
        `Return {id:"${c.id}", holds, issues}.`,
    { agentType:'investigator', effort:'high', label:`verify:${c.id}`,
      phase:'Verify', schema:VERDICT })))

return { impl, verdicts }
```

Orchestrator after workflow: read `verdicts`; for any `holds:false`, re-brief the
owning quick-build with the issues before committing. Then commit (batched) and run
final validation.

## Risks & assumptions

- **P1 changes single-consumer wake semantics.** A lone auto-track consumer now
  wakes only on its tracked paths (not every change); the root-sentinel branch keeps
  ALL_PATHS subscribers (blac bridge, plugins, watch) waking. Regression: a
  blac-react test may assume a single consumer re-renders on any change — run
  blac-react tests in validation and add a "single consumer + untracked change →
  no wake, bridge wakes" case.
- **T2 compound key must preserve same-path identity** (`value.user === value.user`
  within one render). Key by `(target, prefix)`; same `(target,prefix)` → same proxy.
- **T3 frozen-leaf coarsens** tracking under a frozen nested object (returns raw,
  records the object as a leaf). Acceptable — frozen means immutable; a reference
  swap still wakes via the recorded leaf path.
- **T4 traps add `ownKeys`/`has`** — must not break existing spread/`Object.values`
  paths (those already `get` each key); the new traps only add coarse pin + `has`.
- **E2 `onError` is opt-in**: unset preserves the current rethrow contract exactly,
  so existing channel/scheduler error tests stay green.
- Assumption: no in-repo consumer relies on the de-barreled exports (grep confirmed:
  `Signal`/`Observable`, `pathsFromPatch` have zero non-test/non-doc callers).

## Final validation (orchestrator, after all commits — targeted only)

Run from repo root; report inline in the final response.

```fish
# Targeted tests — touched packages + blac consumers (P1 behavior)
pnpm --filter @dirtytalk/structural exec vp test run
pnpm --filter @dirtytalk/engine     exec vp test run
pnpm --filter @blac/core            exec vp test run
pnpm --filter @blac/react           exec vp test run

# Typecheck touched packages
pnpm --filter @dirtytalk/structural exec tsc --noEmit
pnpm --filter @dirtytalk/engine     exec tsc --noEmit

# Format + lint gate (memory: run format:check before commit; no --no-verify)
pnpm format:check
pnpm lint
```

Narrow to changed test files (`vp test run <path>`) if a package run is too broad;
no whole-repo suite. Test files must `import { ... } from 'vite-plus/test'`.
