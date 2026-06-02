# dirtytalk engine — implementation plan

Plan for landing the engine described in `dirtytalk/01-engine.md` as a new monorepo package.

This folder holds **one task file per agent unit**. Each task file is self-contained: a single agent can be handed exactly one file, run `check → implement → verify → test → commit`, and exit. Multiple files within the same phase are designed so their owned files are disjoint — they're safe to run concurrently on the same checkout (no worktrees needed).

---

## Package decision (locked unless you say otherwise)

| Item            | Decision                                                                                                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package name    | `@dirtytalk/engine`                                                                                                                                                                                                                                                                                                                         |
| Path            | `packages/dirtytalk-engine/`                                                                                                                                                                                                                                                                                                                |
| Layout          | **One** package with two subpath exports: `.` (everything) and `./primitives` (just `Signal`/`Observable`).                                                                                                                                                                                                                                 |
| Why one not two | The 01-engine.md spec calls for `@reactive/primitives` + `@reactive/dirty-channel`. We collapse to one package now (single repo unit, single publish) but keep a `./primitives` subpath so small consumers can still import just the primitives. Splitting later is a `vp pack` entry change + `package.json` exports tweak — non-blocking. |
| Build template  | Copy from `packages/blac-core/` (vite-plus + tsc -p tsconfig.build.json + .d.cts dup pattern).                                                                                                                                                                                                                                              |
| Test env        | `vitest` via `vite-plus`, `environment: 'node'` — engine has no DOM dependency.                                                                                                                                                                                                                                                             |
| Runtime deps    | **None.** The engine is zero-dependency.                                                                                                                                                                                                                                                                                                    |
| Workspace deps  | None. (`@blac/core` and `insomni` will depend on this later; this package depends on nothing internal.)                                                                                                                                                                                                                                     |

If any of these need to change, edit this README and the affected task file. Don't let agents guess.

---

## Phase graph

```
                    ┌──────────────────────┐
                    │  00-scaffold         │  (sequential, must be committed first)
                    │  Sonnet 4.6 · low    │
                    └──────────┬───────────┘
                               │
       ┌──────────────┬────────┼────────┬──────────────┐
       │              │        │        │              │
       ▼              ▼        ▼        ▼              ▼
  01-signal      01-schedulers     01-dirty-channel    01-readme
  Haiku 4.5      Sonnet 4.6 · med  Opus 4.7 · high     Haiku 4.5
                                                       (parallel with all above)
       └──────────────┴────────┬────────┴──────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  02-integration      │
                    │  Sonnet 4.6 · med    │
                    └──────────────────────┘
```

**Phase 0** must complete (and be committed) before any Phase 1 agent starts. Phase 0 creates all interface stubs so Phase 1 agents only fill bodies in disjoint files.

**Phase 1**: four tasks. Spawn together — each owns a non-overlapping write set. They may finish in any order; commits land on `main` in finish order.

**Phase 2**: integration. Single agent. Runs full typecheck/lint/test and adds one cross-unit smoke test.

---

## Model & effort guide

| Task             | Model      | Reasoning effort | Why                                                                                                                                                                                                                                                                    |
| ---------------- | ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00-scaffold      | Sonnet 4.6 | low              | Mostly mechanical (copy build config, write interface stubs). Care matters more than depth.                                                                                                                                                                            |
| 01-signal        | Haiku 4.5  | low              | One field, one `Set`, equality short-circuit. Smallest unit in the engine.                                                                                                                                                                                             |
| 01-schedulers    | Sonnet 4.6 | medium           | Four implementations. The `MicrotaskScheduler` and `RAFScheduler` have subtle re-entrancy traps (don't queue if a flush is already in flight; don't lose a `request` made _during_ the flush). Easy to get 80% right, hard to get fully right — Sonnet earns its keep. |
| 01-dirty-channel | Opus 4.7   | high             | The hardest piece: snapshot semantics, lazy interest thunks, subscribe/unsubscribe during flush, `AggregateError` on subscriber throws, re-entrant `mark` deferred to next flush. Worth Opus.                                                                          |
| 01-readme        | Haiku 4.5  | low              | Prose.                                                                                                                                                                                                                                                                 |
| 02-integration   | Sonnet 4.6 | medium           | Run the toolchain, fix any cross-cutting issues, write one tiny end-to-end test.                                                                                                                                                                                       |

(Effort is advisory — Claude Code surfaces it via "fast mode" vs default. If you're scripting, hand the agent the task file and let it choose its own depth.)

---

## Driving an agent

For each task, spawn an agent (`general-purpose` or `quick-build`) with the literal task file as its prompt. Example:

```
Agent({
  subagent_type: "quick-build",
  description: "dirtytalk: scaffold package",
  prompt: <contents of plans/dirtytalk-engine/00-scaffold.md>
})
```

Each task file already contains:

- Goal + acceptance criteria
- Inputs (files to read first)
- **Owned files** (its exclusive write set)
- **Do-not-touch list** (files other parallel agents own)
- Concrete check/implement/verify/test/commit cycle
- Commit message format (per `~/.claude/CLAUDE.md` rules: `<type>(<scope>): <subject>`, no co-author)

**Branch:** all agents work on the current branch (`main` at plan time). No worktrees, no branching. If `git status` is dirty at the start of a task, the agent must stop and report.

**Parallel safety:** the file-ownership matrix in each task file is the contract. As long as agents respect their owned set, concurrent runs on the same checkout don't conflict.

---

## File ownership matrix (Phase 1)

| Task             | Writes                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| 01-signal        | `packages/dirtytalk-engine/src/primitives.ts`, `packages/dirtytalk-engine/src/primitives.test.ts`       |
| 01-schedulers    | `packages/dirtytalk-engine/src/scheduler.ts`, `packages/dirtytalk-engine/src/scheduler.test.ts`         |
| 01-dirty-channel | `packages/dirtytalk-engine/src/dirty-channel.ts`, `packages/dirtytalk-engine/src/dirty-channel.test.ts` |
| 01-readme        | `packages/dirtytalk-engine/README.md`                                                                   |

No overlap. `src/index.ts`, `src/space.ts`, `package.json`, `tsconfig*.json`, `vite.config.ts` are written by Phase 0 and **must not be modified** by Phase 1 agents.

---

## Phase 2 special rules

`02-integration` is the only task that may touch any file. It runs after all Phase 1 commits land. It may edit `src/index.ts` if exports need reshuffling, and adds `src/integration.test.ts`.

---

## Out of scope (don't add to the plan)

- Splitting into `@dirtytalk/primitives` + `@dirtytalk/dirty-channel` (deferred — see decision table above).
- Concrete `Space` implementations (rects, path sets) — those belong to the consuming libraries (insomni, blac), not the engine.
- Adapter packages or any consumer integration. Insomni and blac wiring are separate plans.
- `package.json` `version` bumps, changesets, publishing. Leave at `0.0.1`, no changeset.

---

## Open items to decide before starting

None. The package decision is locked, the phase graph is locked, every task file owns its own write set. Hand `00-scaffold.md` to an agent and go.
