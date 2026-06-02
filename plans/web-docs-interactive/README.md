# web-docs Interactive Demos — Subagent Execution Plan

Add interactivity to the **Astro Starlight** docs at `apps/web-docs` using a
three-tier model decided in design discussion:

- **Twoslash** (have it — keep): build-time typechecked reference snippets.
- **Islands** (new): real, non-editable `@blac/react` demos as Astro React
  islands. Run `workspace:*` blac → fail the build if the API breaks. The
  **default** interactive primitive. Defends the library's *claims*.
- **Sandpack** (new, sparing): editable in-browser playgrounds. Run a
  *published* blac version (accepted drift). Enables reader *play*. **≤4 pages.**

> This is a **separate** initiative from `plans/docs-revamp/*`, which targets the
> legacy VitePress `apps/docs` with `sandpack-vue3`. This plan targets the Astro
> site `apps/web-docs` and uses the **React** Sandpack
> (`@codesandbox/sandpack-react`). Do not cross-wire the two.

- Live checklist: [`TODO.md`](./TODO.md)
- Phases: [Phase 0](./phase-0-foundation.md) · [Phase 1](./phase-1-islands.md) ·
  [Phase 2](./phase-2-sandpack.md) · [Phase 3](./phase-3-polish.md)

---

## Current state (as of this plan, 2026-06-02)

- `apps/web-docs` = Astro 6 + Starlight 0.38.3, topic-switcher IA (blac /
  blac-core / blac-react / dirtytalk). Content pages exist as `.md`.
- Code story today is **Twoslash only** via `expressive-code-twoslash`. Unlike
  the VitePress site, **JSX is configured** (`jsxImportSource: react`,
  `@types/react` present) — `ts twoslash` fences may include JSX here.
- **No React renderer is wired in** (`@astrojs/react` is NOT a dependency).
  Phase 0 adds it. Until then, no islands and no Sandpack can mount.

---

## Build & format oracle

- **Build (the typecheck oracle):** `pnpm -F @blac/web-docs build`. This runs
  `scripts/check-snippets.mjs`, a strict wrapper that exits non-zero if any
  `ts twoslash` snippet soft-fails (plain `astro build` swallows those).
  This is the single authority — "looks fine in isolation" is not.
- **Type-only check (faster, no dist):** `pnpm -F @blac/web-docs typecheck`
  (`astro check`). Use during iteration; the build above is the gate.
- **Format:** `vp run format:check` (covers `apps/*`). Run `vp fmt <files>`
  first to autofix. Only your own files must be clean.

---

## Model & effort policy

Pick the **cheapest model that reliably clears the task's correctness bar.** The
build is a hard typecheck oracle, so authoring has a safety net — Sonnet is the
default workhorse. Reserve Opus for cross-cutting design; Haiku for pure wiring.

| Tier         | Model      | Effort | Use for                                                                 |
| ------------ | ---------- | ------ | ----------------------------------------------------------------------- |
| **Heavy**    | Opus 4.8   | high   | Cross-cutting contracts every later task inherits (demo infra, Sandpack wrapper). |
| **Standard** | Sonnet 4.6 | high   | Demos whose correctness *is* the headline claim (render-counter, dependency-tracking, tutorial). |
| **Standard-**| Sonnet 4.6 | medium | Demos/pages where the build catches type errors (inputs, async, quick-start). |
| **Light**    | Haiku 4.5  | medium | Pure mechanics: nav wiring, `.md`→`.mdx` renames, copy moves.            |

Every task states its model + effort and the rationale.

---

## Hard rules every subagent must follow

Embed these verbatim in each agent brief (they override default behavior):

1. **Build is the only oracle.** The single authority is
   `pnpm -F @blac/web-docs build` exiting `0`. Run it before every commit.
2. **Islands run real `workspace:*` blac.** Import from `@blac/core` /
   `@blac/react` (already workspace deps). Never pin/vendor a version in an
   island — that's Sandpack's job, not islands'.
3. **Components need `.mdx`.** Starlight renders `.md` without component
   support. A page that embeds an island/Sandpack must be renamed `.md`→`.mdx`.
   Keep frontmatter identical; the route is unchanged.
4. **Hydrate lazily.** Islands use `client:visible` (or `client:idle`), never
   `client:load`, to keep TTI low. Sandpack is heavy → `client:visible` only.
5. **Sandpack is client-only + version-pinned.** Mount only through the
   `<BlacSandpack>` wrapper from Phase 2; never top-level import
   `@codesandbox/sandpack-react` into a page. Pin `@blac/core`/`@blac/react` to
   the latest *published* version in `customSetup` (Phase 2.1 sets the constant).
6. **Do NOT edit shared files unless your task owns them.** Shared files:
   `apps/web-docs/astro.config.mjs` (nav/integrations), `package.json`,
   `tsconfig.json`. Integration/nav edits are dedicated **serial** tasks
   (0.1, 2.1, 2.4). Content agents only touch their own pages + demo components.
7. **Verify before commit:** `pnpm -F @blac/web-docs build` (exit 0) **and**
   `vp run format:check` on your files (`vp fmt <files>` first). Only your own
   files must be clean — ignore pre-existing failures elsewhere.
8. **Commit format:** `<type>(<scope>): <subject>` — branch is the shared
   feature branch (see Execution), no ticket. Imperative, ≤50 chars, body wraps
   at 72. `<type>` ∈ feat/fix/refactor/docs/chore/test/style/perf/ci/build.
   Most work here is `feat(web-docs):` (new demos) or `docs(web-docs):`.
9. `git add` **only your own paths** — never `git add -A`/`.`.
10. **Never** add Co-Authored-By/self as co-author. **Never** pass
    `--no-verify`. **Never** run git side-effects (`push`/`pull`/`merge`/
    `rebase`/`stash`). `git stash` is banned — use commits.
11. Shell is **fish**. Use fish syntax for one-liners.

---

## Parallelism map

| Phase | Group        | Tasks               | Can run in parallel?                         |
| ----- | ------------ | ------------------- | -------------------------------------------- |
| 0     | Serial gate  | 0.1                 | No — gates everything                        |
| 1     | P1 islands   | 1.A, 1.B, 1.C, 1.D  | Yes — each owns disjoint demos + pages        |
| 2     | Serial gate  | 2.1                 | No — gates 2.2–2.4                           |
| 2     | P2 sandpack  | 2.2, 2.3            | Yes — disjoint pages                          |
| 2     | Nav (serial) | 2.4                 | No — owns `astro.config.mjs`                 |
| 3     | Closeout     | 3.1, 3.2            | Yes — disjoint                               |

### No-worktree execution note (important)

The user requires **no git worktrees**, so every agent shares one working tree
and one git index. "Parallel" here means **dependency-free and order-independent**
— not necessarily simultaneous. Two safe ways to run a parallel group:

- **Recommended — serial dispatch:** run the group's agents back-to-back in any
  order. Each is a self-contained `check→implement→verify→test→commit` cycle, so
  ordering doesn't matter and there's zero index contention.
- **Concurrent (advanced):** only if each agent `git add`s strictly its own
  paths and the orchestrator serializes the *commit* step. Risk: interleaved
  working-tree state + index-lock contention. Avoid unless you're confident the
  file ownership is truly disjoint (it is, by design, but builds will collide).

When in doubt, serialize. The parallelism map is about *independence*, which
keeps briefs clean and lets you re-run any single task in isolation.

---

## Execution — how to start

1. **Create the shared branch once** (orchestrator, before Phase 0):
   `git switch -c feat/web-docs-interactive`. All agents commit here. No
   worktrees; agents do not create branches.
2. Dispatch **Phase 0 (0.1)** alone. It gates everything — do not start Phase 1
   until 0.1 is committed and the build is green with the proof island.
3. Dispatch **Phase 1** (1.A–1.D) per the execution note above.
4. Dispatch **Phase 2.1** alone (gate), then 2.2/2.3, then 2.4 (nav).
5. Dispatch **Phase 3** closeout.
6. Each agent brief is self-contained: paste the task section + the Hard Rules.
   The agent runs its own check→implement→verify→test→commit and reports back.
