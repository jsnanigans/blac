# Plan — blac perf easy-wins (hot-path allocation batch)

Mechanical, low-risk perf wins on blac's runtime hot path. Every blac state
change flows through `@dirtytalk/structural` (tracker + container emit/patch) and
`@dirtytalk/engine` (channel flush) before reaching `@blac/core`/`@blac/react`, so
"perf for blac" = those hot paths. Follows the proven `dirtytalk-perf-stability`
shape: workflow, `quick-build` implements, `investigator` adversarially verifies.

Source of truth: `reports/perf-opportunities-dirtytalk.md`, `reports/perf-opportunities-blac.md`.
Line refs verified against current HEAD (`aa4616ae`).

## Goals — the items this plan ships

| ID | Pkg | File:line | One-line | Effort | Risk |
|----|-----|-----------|----------|--------|------|
| **PN1** | structural | `path-set.ts:12-17` | `pathSetUnion` empty-operand fast-path (return the other Set) — fires on **every** mutation | S | low* |
| **PN2** | structural | `container.ts:339-390` | `_refineAncestorMarks`: drop per-leaf `.some(closure)` (plain inner loop) + single `roughSet` pass | S | low |
| **PN5** | structural | `tracker.ts:150-232` | memoize `interner.intern(prefix)` **lazily** once per `wrap` (dedupe 2-3 sites) | S | low* |
| **PN6** | structural | `container.ts:270-278` | memoize the `_equalsFn` closure as a lazily-built field (only bites w/ custom equality) | S | low |
| **PN10** | structural | `container.ts:215` | replace `Object.keys(partial).length===0` emptiness test with a `for..in` early-out | S | low |
| **PN3a** | engine | `dirty-channel.ts:106` | allocate `#flush` `errors` array lazily on first catch | S | low |
| **BC1** | blac-core | `PluginManager.ts:308-352` | build `PluginContext` once per dispatch (hoist/lazy), not per plugin | S | low |
| **BR3** | blac-react | `useBloc.ts:130-141` | `Object.is` fast-path before `JSON.stringify` of args each render | S | v.low |
| **BR2** | blac-react | `useBloc.ts:485-554` | short-circuit the dep-reconcile layout effect when session+paths unchanged | S/M | **med** |

\* PN1: safe **only** because `emit`/`patch`/`mark` never retain or mutate the Set
handed to `mark` — the verify pass must confirm this. PN5: safe **only** if
interning stays lazy (same timing as today) — eager interning at `wrap()` would
change `interner.size`/memo-invalidation timing.

## Non-goals (explicitly out — not easy wins)

- **P6 / PN4** (tracker shared Proxy handler + WeakMap state) — the single biggest
  allocation prize, but M-L, needs a benchmark to prove the per-`get` lookup cost
  doesn't eat the win + a design decision. Separate measurement-first pass.
- **BR1** (memoized ancestor-watch-id cache for `expandWithAncestors`) — M, edits
  structural, and touches the same ancestor-cache machinery that just shipped an
  invalidation bug. Needs the same care → its own pass.
- **BC2** (`watch()` global disposed-listener) — needs a new public API; design
  decision.
- **PN9** (surgical `_ancestorIds` invalidation vs full clear) — design decision.
- **PN3b** (subscriber-snapshot skip) — needs re-entrancy design.
- **All `@dirtytalk/spatial`** (P2/P3/P7/P8) — zero blac hot-path involvement.
- No new deps, no public API changes, no behavior changes (BR2 is a guarded
  behavior-preserving short-circuit).

## Execution mode — **Workflow**

Deterministic script; 4 file-disjoint clusters implement in parallel, then
adversarial verify. Orchestrator commits + validates.

**File-conflict map (drives parallelism — all 4 clusters are source-independent;
none calls a new API added by another):**

| Cluster | Pkg | Files | Items |
|---------|-----|-------|-------|
| **A** | structural | `path-set.ts`, `container.ts`, `tracker.ts` + their `.test.ts` | PN1, PN2, PN5, PN6, PN10 |
| **B** | engine | `dirty-channel.ts` + `.test.ts` | PN3a |
| **C** | blac-core | `plugin/PluginManager.ts` + its test | BC1 |
| **D** | blac-react | `useBloc.ts` + its test | BR3, BR2 |

→ **No worktree** — default "here", sequential commits on current branch (OQ4).

### Phases

| Phase | File | What | Parallel |
|-------|------|------|----------|
| 1 | `phase-1-implement.md` | Clusters A/B/C/D implement | all 4 ∥ |
| 2 | `phase-2-verify.md` | Adversarial verify (4 lenses; BR2 gets a dedicated correctness probe) | ∥ after 1 |
| 3 | plan.md (this file) | orchestrator commits + final validation | after 2 |

### Model assignment

| Cluster | Agent | Model/effort | Why |
|---------|-------|--------------|-----|
| A | quick-build | **opus/high** | PN1 alias-safety, PN2 identical-marks, PN5 intern-timing invariants |
| B | quick-build | sonnet/high | one-liner lazy alloc |
| C | quick-build | sonnet/high | hoist a call out of a loop |
| D | quick-build | sonnet/high | BR3 trivial; BR2 correctness-sensitive |
| Verify A, D | investigator-opus | (default) | the two risk-bearing clusters (alias-safety, reconcile correctness) |
| Verify B, C | investigator | high | bounded |

## Communication contract

- **Implementation** (quick-build): durable edits to disjoint files + test
  extensions; **do not commit, do not run tests/typecheck/lint/build**. Each
  returns a structured summary (files, per-item what/where with line refs,
  done-check status) as its final response — captured by the workflow.
- **Verify** (investigator/-opus, read-only): returns `{id, holds, issues[]}` via
  schema. Do NOT run tests.
- **Commits:** orchestrator (main), after verify passes, per package:
  `perf(structural)` (A), `perf(engine)` (B), `perf(core)` (C),
  `perf(react)` (D) — batching is fine where cleaner. Current branch.
- **Final validation:** orchestrator runs targeted commands itself (or via a
  synchronous `test-runner`), reported inline. Never fire-and-forget.

## Workflow script sketch

```js
export const meta = {
  name: 'blac-perf-easy-wins',
  description: 'Hot-path allocation wins: PN1/PN2/PN5/PN6/PN10 (structural), PN3a (engine), BC1 (core), BR3/BR2 (react)',
  phases: [{ title: 'Implement' }, { title: 'Verify' }],
}

const VERDICT = { type:'object', required:['id','holds','issues'],
  properties:{ id:{type:'string'}, holds:{type:'boolean'},
    issues:{type:'array', items:{type:'string'}} } }

phase('Implement')
const [a, b, c, d] = await parallel([
  () => agent(CLUSTER_A_BRIEF, { agentType:'quick-build', model:'opus', effort:'high', label:'perf:A-structural', phase:'Implement' }),
  () => agent(CLUSTER_B_BRIEF, { agentType:'quick-build', effort:'high', label:'perf:B-engine', phase:'Implement' }),
  () => agent(CLUSTER_C_BRIEF, { agentType:'quick-build', effort:'high', label:'perf:C-core', phase:'Implement' }),
  () => agent(CLUSTER_D_BRIEF, { agentType:'quick-build', effort:'high', label:'perf:D-react', phase:'Implement' }),
])

phase('Verify')
const CLUSTERS = [
  { id:'structural', at:'investigator-opus',
    files:'packages/dirtytalk-structural/src/{path-set,container,tracker}.ts + tests',
    probe:'PN1: is returning an operand Set from pathSetUnion alias-safe — do emit/patch/mark ever retain or mutate the Set handed to mark? PN2: identical marks to the old two-pass+.some() on every refine fixture? PN5: is prefix interning still LAZY (same interner.size + memo-invalidation timing as before) or now eager at wrap()? PN6: does the cached closure read _equalsByPathId live? PN10: identical empty/non-empty behavior?' },
  { id:'engine', at:'investigator',
    files:'packages/dirtytalk-engine/src/dirty-channel.ts + test',
    probe:'PN3a: single-error still throws the bare error, multi still AggregateError, zero-error path allocates nothing; pre-existing flush/error tests unchanged.' },
  { id:'core', at:'investigator',
    files:'packages/blac-core/src/plugin/PluginManager.ts + test',
    probe:'BC1: context built at most once per dispatch, zero builds when no enabled plugin has the hook, identical ctx contents; no plugin relies on per-callback ctx identity.' },
  { id:'react', at:'investigator-opus',
    files:'packages/blac-react/src/useBloc.ts + test',
    probe:'BR2 (CRITICAL): can the short-circuit ever skip a needed re-subscribe / registerConsumerPaths / interest refresh? Probe dep add, drop, re-register with changed paths, args change, and primary path change. BR3: Object.is fast-path returns the same key JSON.stringify would.' },
]
const verdicts = await parallel(CLUSTERS.map(cl => () =>
  agent(`Read the working-tree diff (git diff) for ${cl.files} in /Users/brendanmullins/Projects/blac. `+
        `Adversarially prove the ${cl.id} perf edits are correct AND behavior-preserving, or find where they aren't. `+
        `Cross-check plans/blac-perf-easy-wins/phase-1-implement.md done-checks. Specifically probe: ${cl.probe} `+
        `Do NOT run tests. Return {id:"${cl.id}", holds, issues}.`,
    { agentType: cl.at, effort:'high', label:`verify:${cl.id}`, phase:'Verify', schema:VERDICT })))

return { a, b, c, d, verdicts }
```

## Risks & assumptions

- **PN1 alias-safety is the top risk.** Returning `b` (or `a`) by reference from
  `pathSetUnion` means `#accumulated` can alias the Set built by `diffAlongSkeleton`
  and handed to `mark`. Safe iff no caller retains/mutates that Set after `mark`,
  and the engine treats `#accumulated` as replace-not-mutate (it resets to
  `empty()` each flush). Verify must confirm at `container.emit`/`patch` +
  `dirty-channel.mark`. If any retained-mutation path exists → keep the copy for
  that operand or STOP.
- **BR2 is a correctness-sensitive short-circuit.** A wrong skip drops a
  re-subscribe → stale/missed updates. Only short-circuit when the session map is
  provably identical (same dep set, same paths, same primary interest) to last
  commit; when in doubt, do the full reconcile. Dedicated opus verify lens.
- **PN5 must stay lazy.** Compute `prefixId` at most once per `wrap` via a closure
  memo used only at the existing intern sites (`:152`, `:228`); do NOT intern at
  `wrap()` entry (would eagerly intern paths for never-read proxies, changing
  `interner.size` and the `_ancestorIds` memo-clear cadence).
- **Build-order (repeat of the dirtytalk-perf-stability lesson):** blac-core/react
  type-check + test against `@dirtytalk/structural`'s **built** `dist`, and
  structural against `@dirtytalk/engine`'s built `dist`. PN1 changes runtime union
  behavior blac exercises → **rebuild engine then structural before blac tests.**

## Final validation (orchestrator, after all commits — targeted only)

Run from repo root; report inline. Fish shell.

```fish
# Build bottom-up FIRST — downstream packages consume built dist/, not source.
pnpm --filter @dirtytalk/engine     build
pnpm --filter @dirtytalk/structural build

# Targeted tests — every touched package + blac consumers of the changed hot path
pnpm --filter @dirtytalk/structural exec vp test run
pnpm --filter @dirtytalk/engine     exec vp test run
pnpm --filter @blac/core            exec vp test run
pnpm --filter @blac/react           exec vp test run

# Typecheck touched packages
pnpm --filter @dirtytalk/structural exec tsc --noEmit
pnpm --filter @dirtytalk/engine     exec tsc --noEmit
pnpm --filter @blac/core            exec tsc --noEmit
pnpm --filter @blac/react           exec tsc --noEmit

# Optional perf confirmation against the existing baseline (structural hot path)
pnpm --filter @dirtytalk/structural exec vp bench run src/hotpath.bench.ts

# Format + lint gate (touched files only if a narrower invocation exists)
pnpm format:check
pnpm lint
```

Report-back: inline/synchronous final response (or `test-runner` → SendMessage to
main). Narrow to changed test files if a package run is too broad; no whole-repo
suite. Test files import from `vite-plus/test`.
