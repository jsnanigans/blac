# DevTools Cleanup Plan

Goal: focus the BlaC devtools on the high-value debugging surface. Delete demoware and broken features; surface state-size and update-rate warnings inline in the instance list instead of in a separate Performance tab.

## Scope summary

**Delete entirely**

- DependencyGraph view + `@xyflow/react` + `elkjs` dependencies
- `DevToolsDependencyBloc`
- Per-instance `dependencies` / `dependents` edge tracking in `@blac/devtools-connect`
- PictureInPictureDevTools (PiP)
- CallStackView (broken source-map fetch in production)
- Popup (extension popup that just tells the user to press F12)
- PerformancePanel tab + `DevToolsMetricsBloc` (replaced by inline insights)

**Keep**

- Editable JSON tree for the current state view (`EditableJsonTree`)
- Consumer / ref-holder tracking — but surface as a **count only** (no list of which blocs depend on which)

**Add**

- Inline "insights" badges on each row of the instance list: large state size, high update rate, and any other cheap-to-compute warnings. Replaces what PerformancePanel was supposed to surface, but next to the relevant instance.

## Ground rules for every agent

Every agent task below is a **self-contained cycle**:

1. **Check** — read the listed files, confirm the current state matches the brief, and re-scan for any additional references not already listed (`grep` for the symbol).
2. **Implement** — make the edits described in the task file.
3. **Verify** — run targeted typecheck and tests for the touched package(s) **only** (per the project's "Targeted Validation Only" rule). Commands per package:
   - `pnpm --filter @blac/devtools-ui typecheck`
   - `pnpm --filter @blac/devtools-connect typecheck`
   - `pnpm --filter @blac/devtools-connect test`
   - `pnpm --filter @blac/devtools-extension typecheck`
4. **Test** — if the task touches behavior, run/add the relevant test. Pure deletions don't need new tests, but existing tests for the deleted feature must be removed too.
5. **Commit** — one commit per task, conventional format:
   - `chore(devtools-ui): remove PictureInPictureDevTools`
   - `refactor(devtools-connect): drop dependency-edge tracking`
   - `feat(devtools-ui): surface state-size warnings on instance rows`
   - No ticket prefix (branch is `main`). No Claude co-author unless asked. No `--no-verify`.

**Do not** run cross-package builds, dev servers, or watchers. **Do not** push, pull, merge, rebase, or stash. **Do not** add backwards-compat shims or `@deprecated` re-exports — just delete.

## Execution order

```
Lane A (extension, isolated)        Lane B (UI package, sequential)       Lane C (connect package)
─────────────────────────────       ──────────────────────────────       ─────────────────────────
01 delete popup            ──┐      02 delete PictureInPicture            06 strip dep tracking
                             │      03 delete CallStackView                  from devtools-connect
                             │      04 delete DependencyGraph
                             │      05 delete PerformancePanel
                             │           ↓
                             └────►  07 instance insights (depends on 04, 05, 06)
                                          ↓
                                     08 final verify
```

- **Wave 1 (parallel):** `01` (popup), `02`, `03`, `06` — none of these touch each other's files. `02` and `03` both touch UI barrel files (`src/index.tsx`, `src/components/index.ts`); they must serialize within Lane B. So actually run `01` and `06` in parallel, then sequence `02 → 03 → 04 → 05` within Lane B.
- **Recommended dispatch:** kick off `01` and `06` as background agents, then run Lane B serially. Once Lane B and `06` are both done, run `07`, then `08`.

Why no worktrees: the user opted out. That means agents share the working tree, and any task that touches a barrel (`index.tsx`, `components/index.ts`, `blocs/index.ts`, `DevToolsPanel.tsx`, `DevToolsHeader.tsx`) must serialize within its package to avoid merge churn.

## Agent dispatch

Each task file declares its own `model` and `effort` in the front matter. Use those when launching an agent. Suggested mapping:

| Model                 | When to use                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `haiku` (Haiku 4.5)   | Mechanical deletions, barrel updates, dead-code removal. Cheap and fast.                     |
| `sonnet` (Sonnet 4.6) | Cross-file refactors, schema changes, design choices with constraints. The default.          |
| `opus` (Opus 4.7)     | Reserve for tasks with significant design ambiguity. Not expected to be needed in this plan. |

Effort levels (passed to the `quick-build` / `claude` agent, or just used as a hint):

- `low` — single concern, no judgement calls.
- `medium` — multiple files, some local design choices.
- `high` — cross-package, new code, design decisions.

## Tracking

Each task file ends with a checklist. When a task is complete, the agent should:

- Mark the checklist items in the task file as `[x]`.
- Append a `## Completion` block with: commit SHA, files touched count, typecheck result, test result.
- Commit the task-file update **as part of** the implementation commit (same commit, no separate doc commit).

## Task index

1. [`01-delete-popup.md`](./01-delete-popup.md) — Lane A, parallel-safe — haiku/low
2. [`02-delete-pip.md`](./02-delete-pip.md) — Lane B, serial — haiku/low
3. [`03-delete-callstack.md`](./03-delete-callstack.md) — Lane B, serial — haiku/low
4. [`04-delete-dependency-graph.md`](./04-delete-dependency-graph.md) — Lane B, serial — haiku/low
5. [`05-delete-performance-panel.md`](./05-delete-performance-panel.md) — Lane B, serial — haiku/low
6. [`06-strip-dep-tracking-from-connect.md`](./06-strip-dep-tracking-from-connect.md) — Lane C, parallel to Lane B — sonnet/medium
7. [`07-instance-insights.md`](./07-instance-insights.md) — depends on 04, 05, 06 — sonnet/high
8. [`08-final-verify.md`](./08-final-verify.md) — depends on all — sonnet/low
