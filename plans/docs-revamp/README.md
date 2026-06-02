# BlaC Docs Revamp — Subagent Execution Plan

Master orchestration doc for finishing the docs initiative defined in
`/DOCS_IMPROVEMENT_PLAN.md`. This folder breaks the **remaining** work into
phases, each phase into self-contained agent tasks, and tells the orchestrator
which model/effort to use and what can run in parallel.

- Plan source of truth (the "why"): `/DOCS_IMPROVEMENT_PLAN.md`
- Live progress checklist: [`TODO.md`](./TODO.md)
- Phases: [Phase 1](./phase-1-sandpack-closeout.md) ·
  [Phase 2](./phase-2-content-trust.md) ·
  [Phase 3](./phase-3-reference-template.md) ·
  [Phase 4](./phase-4-visual-interactive.md) ·
  [Phase 5](./phase-5-tier3-differentiators.md)

---

## Current state (as of this plan, 2026-05-31)

**Committed & build-green** (`git log`: `a48797b7`, `a7e775a7`, `bb61c38e`):

- **Tier 0** guardrails: Twoslash, `size-limit`, link-check, `lastUpdated`.
- **Tier 1** quick wins: `useSyncExternalStore` claim corrected, `logo.svg`
  shipped, `tracked.md` surfaced in sidebar.
- **Phase 0.5 Sandpack spike** — scaffolded **and browser-verified** at
  `/sandpack-spike` (renders, CDN-installs `@blac@2.0.15`, per-consumer
  re-render payoff confirmed).
- **Tier 2 content shipped**: 2.1 `<BlacSandpack>` wrapper, 2.4 Comparison,
  2.5 TypeScript + `core/types.md`, 2.6 SSR/isolation, 2.7 Async.

**Remaining** (this plan): 2.2, 2.8–2.15, all of Tier 3.
**Deferred**: 2.3 Mermaid (plugin is VitePress-1.x-only — revisit only via a
custom client-only `<Mermaid>` component, not the plugin).

---

## Model & effort policy

Pick the **cheapest model that reliably clears the task's correctness bar.** The
docs build (`pnpm -F @blac/docs build`) is a hard type-check oracle, so authoring
tasks have a safety net — Sonnet is the default workhorse. Reserve Opus for
source-archaeology and design judgment; use Haiku for mechanical edits.

| Tier          | Model      | Effort | Use for                                                                                                                                                 |
| ------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Heavy**     | Opus 4.8   | high   | Subtle source-verified correctness, API design, long narrative with internal consistency (template design, low-level `subscribe`, tutorial, internals). |
| **Standard**  | Sonnet 4.6 | high   | Most page authoring where the build catches type errors (recipes, troubleshooting, changelog, versioning, compat fix, integrations, coming-from).       |
| **Standard-** | Sonnet 4.6 | medium | Mechanical-but-judgment authoring: reference-template rollout per page, recipes catalog entries.                                                        |
| **Light**     | Haiku 4.5  | medium | Pure mechanics: move/delete files, sidebar/nav wiring, `llms.txt` aggregation, snippet relocation.                                                      |

Every task below states its model + effort and the rationale.

---

## Hard rules every subagent must follow

Embed these verbatim in each agent brief (they override default behavior):

1. **Build is the only oracle.** "Validating twoslash in isolation" is
   unreliable — a block that passes alone has still broken the real build. The
   single authority is `pnpm -F @blac/docs build` exiting `0`.
2. **Twoslash + JSX limitation.** The docs typecheck has **no `@types/react`**
   and no JSX config. Use ` ```ts twoslash ` (NO JSX) for type-checked blocks;
   use plain ` ```tsx ` (unchecked) for any JSX/React component snippet.
   `<button>`/`<div>` inside a `twoslash` fence fails the build.
3. **Sandpack stays client-only.** `sandpack-vue3` is browser-only. Never add a
   top-level `import ... from 'sandpack-vue3'`; only via
   `defineAsyncComponent(() => import('sandpack-vue3'))` inside `<ClientOnly>`.
   Pin `@blac/core`/`@blac/react` to `2.0.15` in Sandpack `customSetup`.
4. **Do NOT edit shared files unless your task owns them.** Shared files are
   `apps/docs/.vitepress/config.ts`, `apps/docs/.vitepress/theme/index.ts`,
   `apps/docs/package.json`. Nav/sidebar wiring is a dedicated **serial**
   integration task per phase — content agents create orphan pages and leave
   wiring to it (orphan pages still build green; only broken links fail).
5. **Verify before commit:** run `pnpm -F @blac/docs build` (exit 0) **and**
   `vp run format:check` on your files (run `vp fmt <files>` first to autofix).
   The pre-existing format failures in `apps/perf/src/migration-bench/*` are NOT
   yours — ignore them; only your own files must be clean.
6. **Commit format:** `<type>(<scope>): <subject>` — branch is `main`, no
   ticket. Subject imperative, ≤50 chars. Body wraps at 72. `<type>` ∈
   feat/fix/refactor/docs/chore/test/style/perf/ci/build. Most docs work is
   `docs:` or `build(docs):`.
7. **Never** add a Co-Authored-By/self as co-author. **Never** pass
   `--no-verify`. **Never** run git side-effects (`push`/`pull`/`merge`/
   `rebase`/`stash`). `git stash` is banned outright — use commits.
8. `git add` **only your own paths** — never `git add -A`/`.`.
9. Shell is **fish**. Use fish syntax for any one-liners.

---

## Parallelism & the no-worktree constraint

We run in **one working tree, no git worktrees** (per maintainer). Therefore:

- A task is **`parallel-safe`** only if its file set is **disjoint** from every
  other task launched alongside it and it touches no shared file (rule 4).
- The orchestrator may launch a parallel group together for authoring, but the
  **commit step is a serialized critical section**: gate commits one at a time
  (each agent `git add`s only its own new paths, so sequential commits are
  clean). In practice: launch the group, await all, then let each commit in
  turn — or have each commit its own paths and accept git's sequential index.
- Each phase ends with a single **serial integration task** (one agent) that
  edits `config.ts` to wire nav/sidebar for all of that phase's new pages, runs
  the full build, and commits the wiring. This eliminates `config.ts` conflicts.
- The docs build reads the whole tree; if a parallel build fails spuriously
  because another agent's file is mid-write, re-run after that agent commits.

---

## How to launch a task agent

Use the `Agent` tool (subagent_type `general-purpose` unless the task says
otherwise), one tool call per task; send a parallel group as multiple tool
calls in a single message. Prompt template:

```
You are executing task <ID> from plans/docs-revamp/<phase-file>.md.

Read first, in order:
  1. plans/docs-revamp/README.md  (§ "Hard rules every subagent must follow")
  2. plans/docs-revamp/<phase-file>.md  (your task block)
  3. The "Context to read" files listed in your task.

Then run the task's full cycle: CHECK → IMPLEMENT → VERIFY → COMMIT.
Do not deviate from the listed file ownership. Do not touch shared files.
Report back: files changed, build result (exit code), commit SHA + subject.
```

Set the agent's model via the `model` param and note the effort in the prompt.

---

## Phase order & dependencies

```
Phase 1  Sandpack close-out            (do first; unblocks landing-page payoff)
Phase 2  Content & trust pages         (parallelizable; highest trust/effort)
Phase 3  Reference template + rollout  (template gates rollout; rollout parallel)
Phase 4  Visual / interactive          (needs human in-browser/screenshot verify)
Phase 5  Tier 3 differentiators        (largest; mostly independent)
```

Phases are mostly sequential, but Phase 2 and Phase 3's _template-design_ task
can overlap. Phase 4 has human-gated steps (screenshots, browser checks) — slot
those whenever a human is available; the authoring halves can proceed earlier.
