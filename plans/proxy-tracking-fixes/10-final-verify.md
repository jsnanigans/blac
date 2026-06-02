---
task: 10-final-verify
phase: 4
parallel_safe: false
model: sonnet
effort: low
depends_on:
  - 01-getvalueatpath-null
  - 02-adapter-null-state
  - 03-resolve-deps-cycle-key
  - 04-array-index-tracking
  - 05-commit-tracked-getters
  - 06-bound-functions-cache
  - 07-pathcache-trim
  - 08-stale-proxy-cache
  - 09-active-tracker-per-consumer
files:
  - (none — verification only)
---

# 10 — Final cross-package verification

Once tasks 01-09 are committed, this task confirms the whole stack still typechecks and the targeted tests pass together. No new code; a verification-only commit if the task file needs its checklist filled in.

## Run

In order, halt on first failure:

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- tracking/
pnpm --filter @blac/adapter typecheck
pnpm --filter @blac/adapter test
pnpm --filter @blac/react typecheck
pnpm --filter @blac/preact typecheck
```

If `@blac/react` or `@blac/preact` has a fast, focused test suite for `useBloc`, run it too:

```sh
pnpm --filter @blac/react test -- useBloc
pnpm --filter @blac/preact test -- useBloc
```

(Do **not** run the entire monorepo test suite. Per the project's "Targeted Validation Only" rule.)

## Smoke-check the audit findings

For each numbered bug in `README.md` (1–9), confirm:

- The test added by the corresponding task is present and passing.
- A `grep` for the old anti-pattern shows no remaining sites:
  - `grep -rn "boundFunctionsCache.get(" packages/blac-core/src` — must not show the old single-key-by-fn pattern.
  - `grep -rn "activeTrackerMap\|blocProxyCache" packages/` — must be empty after task 09.
  - `grep -rn "Type.name" packages/blac-core/src/tracking` — only test files may reference (asserting fix).

## Report

If any check fails, **stop and open an issue task file** describing what's broken; don't try to patch it ad-hoc in this verification commit.

If everything passes, fill the completion block below and commit only the task-file update:

```
chore(plans): mark proxy-tracking-fixes verification complete
```

## Checklist

- [ ] `@blac/core` typecheck passes.
- [ ] `@blac/core` tracking tests pass.
- [ ] `@blac/adapter` typecheck + tests pass.
- [ ] `@blac/react` typecheck passes.
- [ ] `@blac/preact` typecheck passes.
- [ ] Old anti-pattern greps are clean.
- [ ] All nine task files have their `## Completion` blocks filled.
- [ ] Committed.

## Completion

**Commit SHA:** (to be filled after commit — this commit closes the plan)

**Typecheck results:**

- `@blac/core`: pass
- `@blac/adapter`: pass
- `@blac/react`: pass
- `@blac/preact`: pass

**Test results (final, post-task-11):**

- `@blac/core`: 528/528 pass
- `@blac/adapter`: 34/34 pass
- `@blac/react`: 184/184 pass
- `@blac/preact`: 10/10 pass

**Anti-pattern greps:** clean

- `activeTrackerMap` / `blocProxyCache`: 0 hits in `packages/*/src` (removed by task 09)
- `boundFunctionsCache.get(` only matches the new per-target form `state.boundFunctionsCache.get(target)` in `tracking-proxy.ts:96` (task 06)
- `Type.name` in `packages/blac-core/src/tracking`: 0 hits (task 03)

**Notes:**

- Task 10 originally stopped at 38 `@blac/react` failures after task 09 landed. Task 11 (`f1ec4a22`) rewrote 13 identity-on-proxy tests to compare raw bloc identity and fixed three real lifecycle bugs the per-consumer refactor exposed (`useBloc` effect deps, snapshot-time commit timing, double-commit re-entry guards). All four packages green afterwards.
- Cross-cutting outcome: per-consumer proxy + getter tracker is now the load-bearing design; each `useBloc` consumer re-renders only on changes to state/getters _it_ used.
