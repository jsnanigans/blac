# Agent Dispatch Instructions — Input Pattern

Operator reference for running this plan with subagents.

## Prerequisites
- Working tree clean enough to commit per task (the plan commits to the current branch). Optionally create one feature branch for the whole effort first.
- Read [`README.md`](./README.md) for the design and ground rules. The authoritative design rationale is [`../../projects-analysis/2026-05-27/04-input-pattern-design.md`](../../projects-analysis/2026-05-27/04-input-pattern-design.md).

## Universal agent prompt template

For each task, launch an `Agent` with the model from the task's front matter and this prompt:

```
You are implementing one task from plans/input-pattern. The plan is APPROVED — do not ask for confirmation.

Read the task file at plans/input-pattern/<NN-task>.md and its front matter. Also read README.md in
that folder for the ground rules and the locked design decisions.

Do the FULL self-contained cycle:
  1. Check  — run the task's `## Check` commands; confirm the starting state matches. If it doesn't, STOP and report.
  2. Implement — apply the change. This is a breaking major version: remove old code in place, no compat shims, no deprecation aliases. Do not touch @blac/compat.
  3. Verify — targeted only: `pnpm --filter <pkg> typecheck` and `pnpm --filter <pkg> test -- <file>`, plus `pnpm --filter <pkg> lint` if you changed source. Never run root `pnpm test`.
  4. Test  — add the regression/behavior test described in `## Test`. It must pass.
  5. Commit — one conventional commit (scope per the task), INCLUDING the filled-in `## Completion` block of the task file. No co-author. No --no-verify. No push/pull/merge/rebase/stash.

Report back: commit SHA, files touched, typecheck + test results.
```

Set `subagent_type: "quick-build"` for low/medium effort, `subagent_type: "claude"` for high effort. Set `model` to the task's front-matter model.

## Dispatch order

| Wave | Tasks | Mode | subagent_type / model |
|---|---|---|---|
| 1 | 01 → 02 → 03 → 04 | **serial** (wait for each commit) | claude/opus, quick-build/sonnet, quick-build/sonnet, claude/opus |
| 2 | 05 | after 04 | quick-build/sonnet |
| 3 | 06 → 07 → 08 | **serial** | quick-build/sonnet, claude/opus, quick-build/sonnet |
| 4 | 09, 10, 11, 12 | **parallel** (one message) | quick-build (sonnet ×3), quick-build/haiku |
| 5 | 13 | after all | quick-build/sonnet |

## Why the serial chains
- **Phase 1** tasks all edit `StateContainer.ts` and/or `StateContainerRegistry.ts`. With no worktrees, concurrent edits collide. 01 (generics) is the foundation; 02–04 build on its types.
- **Phase 3** tasks all edit `useBloc.ts` / `types.ts`. Same reason. 06 (args) lands the option plumbing 07/08 extend.

## Things to watch for
- **`dependencies` vs `deps`**: there is an EXISTING `dependencies` option (manual re-render selector). Task 08 renames it to `select`. Until 08 lands, do not repurpose `dependencies`. The new injected-handles option is `deps`.
- **Zero-arg constructor invariant stays**: the registry still does `new Type()`. `args` reach the bloc via `init(args)`, never the constructor. Don't add constructor params.
- **`init(args)` runs once per instance**, before the first snapshot, NOT per consumer. Same-key second consumer attaches without re-running `init` (dev-warn on arg mismatch).
- **`deps` are merged per consumer and read lazily** — never assume a dep is present at `init`. Guard reads.
- **StrictMode**: construction/`init`/deps-merge must be idempotent (registry dedupes by instanceKey; deps keyed by consumer id).
- **Line numbers** in task files are from the planning snapshot; if a prior task shifted them, locate by symbol, not line.

## If something goes wrong
- A `## Check` mismatch → the agent stops and reports; reconcile the task file against the current code before relaunching.
- A serial task fails verify → fix forward in the same task; do not launch the next until it's green and committed.
- Cross-package type breakage after a core task → expected to surface in Phase 2 (adapter) and Phase 3 (react); that's why those phases follow. If it blocks earlier, note it in the task Completion.
