# DevTools Improvements — Plan Overview

Follow-up to the per-consumer watched-paths + re-render attribution feature. This
plan covers the remaining flagged improvements **plus** vetted easy wins found by
auditing `packages/devtools-ui` and `packages/devtools-connect`.

Each task file is a **self-contained brief** for one subagent. An agent runs a
full **check → implement → verify → test → commit** cycle and stops.

---

## Scope

**Originally flagged improvements**
1. Path churn heatmap → **Phase 3**
2. Select-mode / `all`-watcher over-render flagging → **Phase 1E** (insight)
3. Stack-trace → component name → **Phase 1A** (backend) + **Phase 2** (display)
4. Consumer vs ref-holder count distinction → **Phase 2**

**Easy wins added after audit** (no TODO/FIXME debt exists — codebase is clean)
- Copy-to-clipboard buttons (state / getters / consumer paths) → **Phase 2**
- Collapse-all / Expand-all in the state tree → **Phase 2**
- `createdFrom` stack trace is captured but never rendered → **Phase 2** (Debug Info)
- `refHolders` stack traces captured but never rendered → **Phase 2** (Ref Holders section)
- Instance list: sort dropdown + quick-filter toggles + copy-id → **Phase 1C**
- Logs: group/fold consecutive events + expand callstack + copy → **Phase 1D**

**Explicitly out of scope** (too large for an easy-win pass — revisit later)
- Cross-bloc dependency graph / `deps-changed` diff panel (force-directed DAG, ~200+ lines)
- Consumer "impact dry-run" modal

---

## Phase / lane map

```
Phase 0  Contracts & shared primitives        [BLOCKS all of Phase 1+]   1 agent
            │
            ▼
Phase 1  ┌─ 1A Backend: component labels       (plugin only)          ─┐
         ├─ 1C Instance list: sort/filter/copy (list + its blocs)      │  run in
         ├─ 1D Logs: group/expand/copy         (LogsView + LogsBloc)   │  PARALLEL
         └─ 1E Insights: over-render flags      (computeInsights)      ─┘
            │
            ▼
Phase 2  Detail-panel integration (StateViewer + CurrentStateView)     1 agent
            │   (owns StateViewer; consumes 0 + 1A)
            ▼
Phase 3  Path churn heatmap (new bloc + routing + StateViewer insert)  1 agent
            (sequential after P2 because it also edits StateViewer)
```

**Why this shape:** `StateViewer.tsx`, `DevToolsLayoutBloc.ts`, and the shared
type files are high-contention. Phase 0 takes sole ownership of every **type**
and **layout-bloc-state** edit and creates shared components, so Phase 1 lanes
only ever touch their own view/logic files. Phases 2 and 3 both edit
`StateViewer.tsx`, so they are serialized.

### Parallelization matrix (file ownership — verified disjoint)

| Task | Primary files (writes) |
|------|------------------------|
| **0**  | `components/CopyButton.tsx` (new), `utils/clipboard.ts` (new), `types.ts`, `blocs/DevToolsLayoutBloc.ts`, devtools-connect `types/index.ts`, extension `panel/comm.ts` |
| **1A** | `devtools-connect/src/plugin/DevToolsBrowserPlugin.ts` |
| **1C** | `components/InstanceList.tsx`, `components/InstanceListItem.tsx`, `blocs/DevToolsInstancesBloc.ts`, `blocs/DevToolsSearchBloc.ts` |
| **1D** | `components/LogsView.tsx`, `blocs/DevToolsLogsBloc.ts` |
| **1E** | `components/computeInsights.ts` (+ `.test.ts`) |
| **2**  | `components/StateViewer.tsx`, `components/CurrentStateView.tsx`, `components/EditableJsonTree.tsx` |
| **3**  | `blocs/DevToolsChurnBloc.ts` (new), `components/PathChurnView.tsx` (new), `StateViewer.tsx`, `panel/index.tsx`, `DraggableOverlay.tsx` |

1A / 1C / 1D / 1E touch strictly disjoint files → safe to run concurrently.

---

## Shared agent protocol (every task follows this)

> Read this once; each task file references it. Do **not** deviate.

**Branch (one-time setup, before any agent runs):**
```fish
git checkout -b feat/devtools-improvements
```
All agents commit to this single branch. **Do not create git worktrees. Do not
push, pull, merge, rebase, or stash.**

**The cycle:**

1. **CHECK** — Read every file listed in your task's "Files" section and confirm
   the current code matches what the brief describes (line numbers drift; match
   on content). If reality contradicts the brief, stop and report rather than
   guessing.
2. **IMPLEMENT** — Make only the changes in your task. Match surrounding code
   style (these files use inline-style objects + the `T` theme tokens from
   `packages/devtools-ui/src/theme.ts`, `FC` components, `@blac/react` `useBloc`).
3. **VERIFY** (scoped to your package(s) — never the whole repo):
   ```fish
   # devtools-ui example — substitute your package name
   pnpm --filter @blac/devtools-ui format        # oxfmt write
   pnpm --filter @blac/devtools-ui format:check   # must pass
   pnpm --filter @blac/devtools-ui lint           # oxlint, must pass
   pnpm --filter @blac/devtools-ui typecheck       # tsc --noEmit, must pass
   ```
   Run `format` before `format:check` — committing unformatted code is the #1
   avoidable failure here.
4. **TEST** — `pnpm --filter <pkg> test`. Add/adjust tests where the task says so.
   For pure logic (e.g. 1E) a unit test is **required**; for view-only changes a
   passing existing suite is enough.
5. **COMMIT** — Stage **only your own files by explicit path** (never `git add .`
   or `-A` — parallel siblings may have unstaged work in the same tree):
   ```fish
   git add packages/devtools-ui/src/components/LogsView.tsx ...
   git commit -m "feat(devtools-ui): <subject>"
   ```
   - Commit message: `<type>(<scope>): <subject>`, imperative, ≤50 char subject
     (matches `git log`; this branch carries no Jira ticket).
   - **Never** pass `--no-verify` or any hook-skipping flag.
   - **Changeset:** if your task edits a *published* package, add one:
     ```fish
     # published: @blac/devtools-connect, @blac/devtools-ui, @dirtytalk/structural
     # NOT published (no changeset): @blac/devtools-extension (the panel/comm app)
     ```
     Create `.changeset/devtools-<short-name>.md`:
     ```markdown
     ---
     "@blac/devtools-ui": patch
     ---

     <one-line summary of the user-facing change>
     ```
     Commit the changeset together with the code.

**Model & effort** are specified per task. Use the named model; "effort" is your
thinking budget (low = mostly mechanical, high = design judgment needed).

---

## Tooling reference (from repo audit)

- Monorepo: pnpm workspaces + `vite-plus` (`vp`). Linter **oxlint**, formatter **oxfmt**.
- Per-package scripts exist: `format`, `format:check`, `lint`, `lint:fix`, `test`
  (`vp test run`), `typecheck` (`tsc --noEmit`).
- Scope to one package: `pnpm --filter <pkgName> <script>`.
- Run one test file: `cd packages/<pkg> && vp test run src/foo.test.ts`.
- Test imports: `import { describe, it, expect, vi } from 'vite-plus/test'`.
- No husky/pre-commit hook (Vite+ `staged: { '*': 'vp check --fix' }` is advisory).
- Changesets in `.changeset/`; `baseBranch: main`; extension/examples/perf/docs ignored.

See `TODO.md` for the live checklist.
