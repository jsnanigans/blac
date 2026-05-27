---
task: 11-preact-parity
phase: 4
parallel_safe: true
serial_group: null
model: sonnet
effort: medium
depends_on:
  - 08-react-dev-warnings
files:
  - packages/blac-preact/src/**
  - packages/blac-preact/src/__tests__/  # mirror react tests
---

# 11 — `@blac/preact` parity

## Goal

Bring `@blac/preact` to feature parity with the new `@blac/react` API: `args` option (typed, keying), `deps` lane (per-consumer merge via the core `[APPLY_DEPS]` engine), `onDepsChanged`, the `dependencies`→`select` rename, and the dev warnings. The core engine (tasks 02–04) is framework-agnostic, so this is the same wiring as `@blac/react`, adapted to Preact's hook/effect semantics.

## Approach
1. First read `packages/blac-preact/src/` to learn its current `useBloc` equivalent and how closely it mirrors `@blac/react` (it may already share the adapter). Identify its option type and effect structure.
2. Port, in the same order the React work landed:
   - conditional `args` option + thread into `acquire` + resolution memo + key-from-args (mirror task 06).
   - `deps` per-consumer merge in a commit effect + cleanup on unmount via `[APPLY_DEPS]`/`[REMOVE_DEPS_OWNER]` (mirror task 07), using Preact's `useId`/effect equivalents and its per-consumer id.
   - `dependencies`→`select` rename + dev warnings (mirror task 08).
3. Reuse `@blac/adapter` re-exports (`ExtractArgs`, `APPLY_DEPS`, …) — don't re-import from core directly if the React side goes through the adapter; stay consistent.

### Subtleties
- Preact's effect timing differs subtly from React's; ensure the apply-on-commit / cleanup-before-release ordering holds (deps applied post-commit, withdrawn before `release`).
- If `@blac/preact` shares more code with `@blac/react` than expected, prefer factoring shared logic rather than duplicating — but do NOT block on a refactor; parity is the goal.
- Match the same dev-warning gating.

## Check (before editing)
```fish
ls packages/blac-preact/src
grep -rn "useBloc\|dependencies\|acquire\|useId\|useEffect" packages/blac-preact/src | head -40
```
Confirm preact's `useBloc` lacks `args`/`deps`/`select`. STOP and report if `@blac/preact` doesn't exist or already has parity.

## Implement
Port tasks 06→07→08 to Preact.

## Test
Mirror the React tests (`useBloc.args`, `useBloc.deps`, `useBloc.dev-warnings`) using Preact's testing setup already present in the package.

## Verify
```fish
pnpm --filter @blac/preact typecheck
pnpm --filter @blac/preact test -- useBloc.args
pnpm --filter @blac/preact test -- useBloc.deps
pnpm --filter @blac/preact lint
```

## Commit
```
feat(preact): args/deps/select parity with react
```
Body: Ports the input-pattern API (args keying, deps lane + onDepsChanged, dependencies→select, dev warnings) to @blac/preact over the shared core engine.

## Checklist
- [x] args option + keying
- [x] deps lane + onDepsChanged via core engine
- [x] dependencies→select + dev warnings
- [x] mirrored tests pass; typecheck & lint clean
- [x] committed with Completion filled

## Completion
**Commit SHA:** 289f0b2b
**Files touched:** 7 — packages/blac-preact/src/useBloc.ts, packages/blac-preact/src/types.ts, packages/blac-preact/tsconfig.json, packages/blac-preact/vitest.d.ts, packages/blac-preact/src/__tests__/useBloc.args.test.tsx, packages/blac-preact/src/__tests__/useBloc.deps.test.tsx, packages/blac-preact/src/__tests__/useBloc.dev-warnings.test.tsx
**Typecheck result:** pass (tsc --noEmit, 0 errors)
**Test result:** 26 tests pass (useBloc.args: 4, useBloc.deps: 3, useBloc.dev-warnings: 9, pre-existing: 10)
