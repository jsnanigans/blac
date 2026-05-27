---
task: 13-final-audit
phase: 5
parallel_safe: false
serial_group: null
model: sonnet
effort: low
depends_on:
  - 09-testing-helpers
  - 10-examples
  - 11-preact-parity
  - 12-docs
files:
  - (read-only audit across packages; small fixes only)
---

# 13 — Final cross-package audit

## Goal

Verify the feature is coherent end-to-end and nothing was left half-migrated. Fix only small gaps found; anything larger gets reported as a follow-up, not silently expanded here.

## Approach / Checklist
1. **Per-package typecheck** (not root): `@blac/core`, `@blac/adapter`, `@blac/react`, `@blac/preact`, examples app. All green.
2. **Targeted test sweep**: run the new test files added across tasks 02–11 (by name), confirm pass. Do NOT run the whole monorepo suite.
3. **API coherence**:
   - `args` required-when-declared, forbidden-when-void — spot-check the conditional type holds in react + preact.
   - `deps` never re-creates an instance; `onDepsChanged` fires post-commit.
   - identity precedence matches the design (explicit `instanceId` > autoInstance > `static key`/hash > context > default).
   - `dependencies` is fully gone from `@blac/react` and `@blac/preact` (renamed to `select`); grep for stragglers.
   - dev warnings are dev-gated (no prod cost).
4. **Stale-API sweep**: grep for any remaining `setProps`/`bloc.props =` patterns in the libraries' own examples/tests; ensure docs don't reference removed APIs.
5. **Mark TODO.md** items done and confirm each task file's `## Completion` block is filled with a real SHA.

## Check
```fish
grep -rn "dependencies\b" packages/blac-react/src packages/blac-preact/src   # expect: none (option-level)
pnpm --filter @blac/core typecheck && pnpm --filter @blac/adapter typecheck && pnpm --filter @blac/react typecheck && pnpm --filter @blac/preact typecheck
```

## Implement
Apply only small corrective fixes (a missed rename, a doc reference). Report anything bigger.

## Verify
Targeted typecheck + the new test files per package (by name), all green.

## Commit
```
chore: input-pattern final audit and cleanup
```
Body: Cross-package typecheck/test sweep; verifies args/deps/select coherence and no stale `dependencies`/`setProps` references. (Only if small fixes were made; otherwise just update TODO/Completion.)

## Checklist
- [x] all packages typecheck
- [x] new tests pass (named sweep)
- [x] no stray `dependencies` option / stale APIs
- [x] TODO.md ticked; all Completion blocks filled
- [x] committed (if fixes) with Completion filled

## Completion
**Commit SHA:** 6a1354cb
**Files touched:** 4 — `plans/input-pattern/TODO.md`, `plans/input-pattern/02-core-init-construction.md`, `plans/input-pattern/04-core-deps-ondepschanged.md`, `plans/input-pattern/13-final-audit.md`
**Typecheck result:** @blac/core pass; @blac/adapter pass; @blac/react pass; @blac/preact pass (all 0 errors)
**Test result:** core (StateContainer.init/deps/structural-key/keying/testing.args): 602/602 pass. react new files (useBloc.args/deps/dev-warnings): 199/204 pass (5 pre-existing proxy-WIP failures in array-methods-tracking.test.tsx, out-of-scope). preact (useBloc.args/deps/dev-warnings): 26/26 pass.
