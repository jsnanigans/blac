# dirtytalk-structural — implementation plan

Plan for landing `@dirtytalk/structural`: the **path-based dirty-tracking** instantiation of `@dirtytalk/engine` as a new monorepo package.

Spec source: [`dirtytalk/03-blac.md`](../../dirtytalk/03-blac.md). Cross-cutting overview: [`dirtytalk/00-overview.md`](../../dirtytalk/00-overview.md). Sibling plan: [`plans/dirtytalk-spatial/`](../dirtytalk-spatial/README.md).

> **Why the name?** The space the engine operates over here is _structural_ — paths through an object tree. Sister package `@dirtytalk/spatial` operates over rects in 2D. Both name the algebra, not the host project. The existing `@blac/core` remains untouched; a separate migration plan flips it onto this package later.

---

## Package decision (locked unless you say otherwise)

| Item           | Decision                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Package name   | `@dirtytalk/structural`                                                                                             |
| Path           | `packages/dirtytalk-structural/`                                                                                    |
| Layout         | One package. Subpath exports: `.` (full surface incl. React adapter) and `./core` (no-React core).                  |
| Build template | Copy from `packages/dirtytalk-engine/` (vite-plus + tsc -p tsconfig.build.json + `.d.cts` dup).                     |
| Test env       | `vitest` via `vite-plus`, `environment: 'node'` for core tests; `environment: 'jsdom'` for the React adapter tests. |
| Runtime deps   | `@dirtytalk/engine` (workspace `*`). Optional peer: `react` `>=18` for the adapter.                                 |
| Internal deps  | `@dirtytalk/engine` only. **Must not import** `@blac/core`, `@blac/react`, or `@dirtytalk/spatial`.                 |
| Versioning     | `0.0.1`, no changeset, no publish.                                                                                  |

If any of these need to change, edit this README and the affected task file. Don't let agents guess.

---

## Scope

In scope:

- `PathInterner` (per-class string→ID interning).
- `PathSet` representation + helpers (`Set<number>`-backed, with an `ALL_PATHS` sentinel) and `PathSetSpace` (`Space<PathSet>` impl).
- Proxy-based per-consumer path recorder (`trackRender`).
- `diffAlongSkeleton`, `pathsFromPatch`, `getAt`.
- `StructuralContainer<S>` — the Bloc-equivalent base class: holds state, owns a `DirtyChannel<PathSet>`, maintains the observed skeleton, exposes `emit`/`patch`/`update`.
- React adapter: `useStructural(Container, options?)` hook with per-consumer tracking + dirty-channel subscription.
- One cross-unit integration test proving the pieces compose.

Out of scope (separate plans):

- Migrating `@blac/core` and `@blac/react` callers onto this package.
- Devtools / plugin events upgrade (would land alongside the migration).
- Per-path custom equality config (spec'd in `03-blac.md` Decision 3 — flag here, design in migration plan).
- Bitset-backed `PathSet` perf upgrade (spec'd Decision 1 — defer to post-MVP).

---

## Phase graph

```
                         ┌────────────────────┐
                         │  00-scaffold       │  (sequential, must commit first)
                         │  Sonnet 4.6 · low  │
                         └────────┬───────────┘
                                  │
            ┌────────────────┬────┴────┬──────────────────┐
            ▼                ▼         ▼                  ▼
     01-path-interner   01-path-set   01-readme           (Phase 1 parallel)
     Haiku 4.5 · low    Sonnet · low  Haiku 4.5 · low
            └────────────────┴────┬────┴──────────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
            02-tracker                       02-diff               (Phase 2 parallel)
            Opus 4.7 · high                  Opus 4.7 · high
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │  03-container      │  (Phase 3 sequential)
                         │  Opus 4.7 · high   │
                         └────────┬───────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │  04-react-adapter  │  (Phase 4 sequential)
                         │  Sonnet 4.6 · med  │
                         └────────┬───────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │  05-integration    │  (Phase 5 sequential)
                         │  Sonnet 4.6 · med  │
                         └────────────────────┘
```

**Phase 0** must complete (committed) before any Phase 1 agent starts.
**Phases 1 and 2** each contain parallel tasks with disjoint write sets — safe to run concurrently on the same checkout (no worktrees).
**Phases 3, 4, 5** are sequential — each depends on the prior phase's commit landing.

---

## Model & effort guide

| Task             | Model      | Effort | Why                                                                                                                                                               |
| ---------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00-scaffold      | Sonnet 4.6 | low    | Mechanical copy of engine package skeleton; lay down empty type-stub files.                                                                                       |
| 01-path-interner | Haiku 4.5  | low    | `Map<string,number>` + monotonic counter + `lookup`. Trivial.                                                                                                     |
| 01-path-set      | Sonnet 4.6 | low    | Set ops + a sentinel value that short-circuits `intersects`. Care needed; complexity is bounded.                                                                  |
| 01-readme        | Haiku 4.5  | low    | Prose.                                                                                                                                                            |
| 02-tracker       | Opus 4.7   | high   | Proxy semantics: recursive wrapping, identity preservation across nested reads, dynamic-access coarsening (`.find`), iteration, primitives short-circuit. Subtle. |
| 02-diff          | Opus 4.7   | high   | `diffAlongSkeleton` correctness against `getAt`; nested patch → dotted paths; `Object.is` default + future per-path equality hook. Easy to under-deliver.         |
| 03-container     | Opus 4.7   | high   | State machine: state field, channel, skeleton, consumer registry, scheduler injection, single-consumer-skip, register/unregister recompute. The keystone.         |
| 04-react-adapter | Sonnet 4.6 | medium | `useStructural` hook: `useId`, `useReducer(force)`, `useEffect(subscribe)`, `useRef(paths)`, StrictMode double-invoke. Spec is concrete enough.                   |
| 05-integration   | Sonnet 4.6 | medium | Toolchain pass + one cross-unit integration test.                                                                                                                 |

Effort is advisory — Claude Code surfaces it via fast-mode vs default. If scripting, hand the agent the task file and let it choose.

---

## File ownership matrix

Each task owns a disjoint write set. Parallel tasks within a phase are safe to run concurrently because their owned files don't overlap. Sequential tasks may freely extend the package's `src/index.ts` barrel only inside their own commit (no agent touches the barrel during Phase 1 or 2 — Phase 0 stubs it, Phase 3 finalises it, Phase 4 adds the React surface, Phase 5 audits).

| Task             | Owned files (read+write)                                                                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00-scaffold      | `packages/dirtytalk-structural/{package.json,tsconfig.json,tsconfig.build.json,vite.config.ts,README.md,.gitignore}`, `src/{index.ts,react.ts,types.ts,path-interner.ts,path-set.ts,tracker.ts,diff.ts,container.ts,react-hook.ts}` (all stubs only). |
| 01-path-interner | `src/path-interner.ts`, `src/path-interner.test.ts`                                                                                                                                                                                                   |
| 01-path-set      | `src/path-set.ts`, `src/path-set.test.ts`                                                                                                                                                                                                             |
| 01-readme        | `README.md`                                                                                                                                                                                                                                           |
| 02-tracker       | `src/tracker.ts`, `src/tracker.test.ts`                                                                                                                                                                                                               |
| 02-diff          | `src/diff.ts`, `src/diff.test.ts`                                                                                                                                                                                                                     |
| 03-container     | `src/container.ts`, `src/container.test.ts`, `src/index.ts` (barrel update only)                                                                                                                                                                      |
| 04-react-adapter | `src/react-hook.ts`, `src/react-hook.test.ts`, `src/react.ts` (barrel update only)                                                                                                                                                                    |
| 05-integration   | `src/integration.test.ts`; `src/index.ts` / `src/react.ts` only if exports are missing                                                                                                                                                                |

`src/types.ts` is written exclusively in Phase 0 and **must not** be touched after.

---

## Driving an agent

For each task, spawn an agent (`general-purpose` or `quick-build`) with the literal task file as its prompt. Example:

```ts
Agent({
  subagent_type: "quick-build",
  description: "structural: scaffold package",
  prompt: <contents of plans/dirtytalk-structural/00-scaffold.md>,
})
```

Each task file contains:

- Goal + acceptance criteria
- Inputs (files to read first)
- **Owned files** (exclusive write set)
- **Do-not-touch list** (other parallel agents' files)
- Concrete check → implement → verify → test → commit cycle
- Commit message format (per `~/.claude/CLAUDE.md`: `<type>(<scope>): <subject>`, no co-author)

**Branch:** all agents work on the current branch. No worktrees, no branching. If `git status` is dirty at start, the agent must stop and report.

**Parallel safety:** the ownership matrix above is the contract. Concurrent agents on the same checkout don't conflict as long as they respect their owned set.

---

## Acceptance criteria for the plan as a whole

- [ ] `packages/dirtytalk-structural/` builds, typechecks, lints, formats, and tests green via `vp run {build,typecheck,lint,format:check,test,verify}`.
- [ ] Public surface (in `dist/index.d.ts`): `StructuralContainer`, `PathInterner`, `PathSet`, `PathSetSpace`, `ALL_PATHS`, `pathSetUnion`, `pathSetEquals`, `trackRender`, `diffAlongSkeleton`, `pathsFromPatch`.
- [ ] React surface (in `dist/react.d.ts`): `useStructural`.
- [ ] One end-to-end integration test exercises container + tracker + diff + channel together.
- [ ] No imports from `@blac/*` or `@dirtytalk/spatial` anywhere in the package.

---

## Open items to decide before starting

None. The package decision is locked, phase graph is locked, every task file owns its own write set. Hand `00-scaffold.md` to an agent and go.
