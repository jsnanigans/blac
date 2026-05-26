# Proxy Tracking — Correctness Fixes

Auto-tracking change detection (the `useBloc`-without-deps path) has multiple confirmed correctness bugs that silently corrupt tracked paths, leak state across components, and miss legitimate re-renders. This plan fixes them in phases.

Original audit: see commit history / chat. Two of the bugs were verified with minimal repros:

- `boundFunctionsCache` collision returns the wrong array bound to `Array.prototype.map`.
- Nested proxies cached by raw target keep the **old path** baked into the trap when the same object appears at a new location in state.

## Scope (in priority order)

| #   | Bug                                                                      | File                                              | Phase |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------- | ----- |
| 1   | `boundFunctionsCache` collision (Array.prototype methods)                | `tracking-proxy.ts`                               | 2     |
| 2   | Stale path baked into cached nested proxy                                | `tracking-proxy.ts`                               | 2     |
| 3   | Global `activeTrackerMap` / `blocProxyCache` — multi-consumer cross-talk | `tracking-proxy.ts`, `adapter/index.ts`           | 3     |
| 4   | `null` state → object transition never re-renders                        | `adapter/index.ts`                                | 1     |
| 5   | `getValueAtPath` collapses null / missing / `undefined`                  | `path-utils.ts`                                   | 1     |
| 6   | `pathCache` grows unboundedly + stale paths fire spurious re-renders     | `tracking-proxy.ts`                               | 2     |
| 7   | Array index access on proxyable values doesn't track its own index       | `tracking-proxy.ts`                               | 2     |
| 8   | `commitTrackedGetters` keeps stale getters when current render has none  | `tracking-proxy.ts`                               | 2     |
| 9   | `resolveDependencies` cycle key uses non-unique `Type.name`              | `tracking/resolve-dependencies.ts`                | 1     |

## Ground rules for every agent

Every task file is a **self-contained cycle**:

1. **Check** — read the file(s) listed, confirm the symptom, run the `grep` listed in the task. If the symptom no longer matches, **stop and report** (don't guess).
2. **Implement** — apply the edit described.
3. **Verify** — targeted commands only (per the project's "Targeted Validation Only" rule):
   - `pnpm --filter @blac/core typecheck`
   - `pnpm --filter @blac/core test -- <relevant test file>` (do **not** run the full suite)
   - For tasks touching `@blac/adapter`: `pnpm --filter @blac/adapter typecheck` + `pnpm --filter @blac/adapter test -- <file>`
4. **Test** — every task adds at least one **regression test** that fails before the fix and passes after. Drop it next to the existing test files for the package (see "Test file conventions" below).
5. **Commit** — one commit per task, conventional format. Branch is `main`, no ticket prefix. No Claude co-author. No `--no-verify`.

**Do not** run `pnpm test` at the root. **Do not** push, pull, merge, rebase, or stash. **Do not** add deprecated re-exports or compat shims — fix in place.

## Execution order

```
Phase 1 — parallel (different files)
────────────────────────────────────
01 getValueAtPath nullable               path-utils.ts            (sonnet / low)
02 adapter null-state re-render          adapter/index.ts         (sonnet / low)
03 resolveDependencies cycle key         resolve-dependencies.ts  (haiku  / low)

Phase 2 — sequential (all touch tracking-proxy.ts; no worktrees → serialize)
────────────────────────────────────────────────────────────────────────────
04 array index tracking                  tracking-proxy.ts        (haiku  / low)
05 commitTrackedGetters always-replace   tracking-proxy.ts        (haiku  / low)
06 boundFunctionsCache per-target        tracking-proxy.ts        (sonnet / medium)
07 pathCache trim on capture             tracking-proxy.ts        (sonnet / medium)
08 stale nested-proxy path               tracking-proxy.ts        (sonnet / medium)

Phase 3 — depends on Phase 2 landing
────────────────────────────────────
09 per-consumer active tracker           tracking-proxy.ts +
                                         adapter/index.ts         (opus   / high)

Phase 4 — final
───────────────
10 verify + audit                        all packages             (sonnet / low)
```

**Dispatch:**

- Wave 1: launch agents `01`, `02`, `03` in **parallel** — three separate files, no overlap.
- Wave 2: run `04 → 05 → 06 → 07 → 08` **serially**. All touch `tracking-proxy.ts`; without worktrees they would conflict on edits. Order is chosen so smaller surgical fixes land first; the more invasive cache rewrites come last.
- Wave 3: run `09` only after Wave 2 commits exist on `main`. It rewrites pieces touched by `06` and `07` and needs them as a baseline.
- Wave 4: run `10` after everything else lands.

## Model & effort guide

Per-task front matter declares the model. Default mapping:

| Model                 | When                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `haiku` (Haiku 4.5)   | Mechanical one-line / one-block fixes with an obvious form. Cheap & fast — use whenever the spec is exact. |
| `sonnet` (Sonnet 4.6) | Multi-line edits, semantic care, new tests. The workhorse here.                                            |
| `opus` (Opus 4.7)     | Architectural refactor (task 09 only): rewires lifetime of shared state across files.                     |

Effort levels (informational; pass through to `quick-build` / `claude` subagent):

- `low` — single concern, no design choice; mechanical implementation of a specified diff.
- `medium` — multiple related edits in one file, requires reading nearby code, may add tests.
- `high` — cross-file, design choice about cache lifetime / ownership.

## Agent dispatch — how to launch

Use the `Agent` tool with `subagent_type: "quick-build"` for low / medium effort tasks and `subagent_type: "claude"` for high effort. Inside the prompt, paste the task file's content verbatim and add: "Read the front matter. Do all of: check, implement, verify, test, commit. Don't ask for confirmation; the plan is approved."

Pass `model` from the front matter via the `model` parameter on the `Agent` call.

**Parallel launches** must be sent in a single tool-call message (multiple `Agent` blocks). Sequential launches: wait for the previous commit to land before launching the next.

## Test file conventions

- `@blac/core` tracking tests live in `packages/blac-core/src/tracking/*.test.ts`. Co-locate new tests with the closest existing file:
  - bug #5 → `path-utils.test.ts`
  - bug #1, #2, #6, #7, #8 → `tracking.edge-cases.test.ts` (or `proxy-tracker.edge-cases.test.ts` for proxy-only behavior)
  - bug #9 → new file `resolve-dependencies.test.ts` if it doesn't already exist; else co-locate.
- `@blac/adapter` tests live in `packages/blac-adapter/src/__tests__/`. Bug #4 → `adapter.edge-cases.test.ts`.
- Use `vitest` (already in scope). Don't add new test infra.

## Completion tracking

Each task file ends with a checklist + a `## Completion` block. The agent fills in:

- Commit SHA
- Files touched (count + list)
- Typecheck result
- Test result (the specific test name(s) that now pass)

Commit the updated task file **as part of** the implementation commit. No separate doc commit.

## Task index

1. [`01-getvalueatpath-null.md`](./01-getvalueatpath-null.md) — Phase 1, parallel — sonnet / low
2. [`02-adapter-null-state.md`](./02-adapter-null-state.md) — Phase 1, parallel — sonnet / low
3. [`03-resolve-deps-cycle-key.md`](./03-resolve-deps-cycle-key.md) — Phase 1, parallel — haiku / low
4. [`04-array-index-tracking.md`](./04-array-index-tracking.md) — Phase 2, serial — haiku / low
5. [`05-commit-tracked-getters.md`](./05-commit-tracked-getters.md) — Phase 2, serial — haiku / low
6. [`06-bound-functions-cache.md`](./06-bound-functions-cache.md) — Phase 2, serial — sonnet / medium
7. [`07-pathcache-trim.md`](./07-pathcache-trim.md) — Phase 2, serial — sonnet / medium
8. [`08-stale-proxy-cache.md`](./08-stale-proxy-cache.md) — Phase 2, serial — sonnet / medium
9. [`09-active-tracker-per-consumer.md`](./09-active-tracker-per-consumer.md) — Phase 3 — opus / high
10. [`10-final-verify.md`](./10-final-verify.md) — Phase 4 — sonnet / low
