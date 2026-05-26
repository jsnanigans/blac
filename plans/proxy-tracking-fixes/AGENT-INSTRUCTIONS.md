# How to dispatch agents for this plan

This file is the operator's reference: how to launch agents, in what order, and what to pass them. The agents themselves should read their own task file from `plans/proxy-tracking-fixes/`.

## Prereqs

- Working tree on `main`, clean.
- `pnpm install` has run recently.
- No other agent is currently editing `packages/blac-core/src/tracking/` or `packages/blac-adapter/src/`.

## Universal agent prompt template

For every task, the prompt to the agent should be:

```
Read plans/proxy-tracking-fixes/<task-file>.md. The plan is already approved.
Do the full self-contained cycle described in the file:

  1. Check (run the grep listed; confirm symptom still present)
  2. Implement (apply the edit)
  3. Verify (run the targeted typecheck/test commands listed; do NOT run cross-package or full-suite tests)
  4. Test (add the regression tests described)
  5. Commit (one commit, exact conventional message from the task file)

Then fill in the `## Completion` block at the bottom of the task file
with: commit SHA, files touched, typecheck result, test result. Commit
that update **as part of** the implementation commit — no separate
doc commit.

If the Check step reveals the symptom no longer matches (e.g. someone
already fixed it), STOP and report. Do not guess.
```

The task file itself is the spec. Don't paraphrase it.

## Phase 1 — parallel dispatch (Wave 1)

Three agents, **one message**, three `Agent` tool blocks. They touch three different files, so they can't conflict.

| Task | subagent_type | model  |
| ---- | ------------- | ------ |
| 01   | `quick-build` | sonnet |
| 02   | `quick-build` | sonnet |
| 03   | `quick-build` | haiku  |

`subagent_type: "quick-build"` because each task ships a planned diff with tests; the agent's job is precise execution, not exploration.

Wait for all three to report back before starting Phase 2.

## Phase 2 — serial dispatch (Wave 2)

All five touch `tracking-proxy.ts`. Run one at a time. After each agent reports a commit SHA:

1. `git log --oneline -1` (just for the operator to sanity-check the commit landed).
2. Launch the next agent.

| Task | subagent_type | model  |
| ---- | ------------- | ------ |
| 04   | `quick-build` | haiku  |
| 05   | `quick-build` | haiku  |
| 06   | `quick-build` | sonnet |
| 07   | `quick-build` | sonnet |
| 08   | `quick-build` | sonnet |

## Phase 3 — single agent (Wave 3)

Task 09 is the architectural change. Use `claude` (or `quick-build` if confident in the spec), opus model. It touches three packages, so don't run anything else while it's executing.

| Task | subagent_type | model |
| ---- | ------------- | ----- |
| 09   | `claude`      | opus  |

## Phase 4 — verification (Wave 4)

| Task | subagent_type | model  |
| ---- | ------------- | ------ |
| 10   | `quick-build` | sonnet |

## Things to watch for

- **Conflict on `tracking-proxy.ts`:** without worktrees, parallel edits to this file will collide. The plan strictly serializes Phase 2 to prevent this. If a Phase 2 agent reports "file changed since I read it", the operator likely violated the serial rule — restart the agent after the conflicting commit lands.
- **Task 09 prerequisites:** it depends on the cache changes in 06/07/08. If 09 runs before those, the diff conflicts. Front-matter `depends_on` lists this explicitly; respect it.
- **Test scope discipline:** `pnpm --filter @blac/core test` runs everything in that package. Always pass `-- <file>` to narrow. The "Targeted Validation Only" rule in `~/.claude/CLAUDE.md` applies.
- **Commit messages:** the task files dictate the exact message. No `[ticket]` prefix because branch is `main`. No Claude co-author. No `--no-verify`.

## If something goes wrong

- A failing test after a fix → the fix is wrong; the agent should not "fix" the test to pass. Stop and report.
- A typecheck failure unrelated to the change → pre-existing, mention in the completion block but don't fix in this task.
- A new bug surfaces during testing → add a follow-up task file (`11-…md`), don't fold it into the current task's commit.
