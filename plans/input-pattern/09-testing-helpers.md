---
task: 09-testing-helpers
phase: 4
parallel_safe: true
serial_group: null
model: sonnet
effort: medium
depends_on:
  - 08-react-dev-warnings
files:
  - packages/blac-core/src/testing.ts
  - packages/blac-react/src/testing.ts
  - packages/blac-core/src/__tests__-or-colocated  # add a test exercising helpers with args/deps
---

# 09 — Testing helpers: `args` / `deps` support

## Goal

Update the test utilities so blocs that require `args` (and optionally `deps`) can be rendered/stubbed without boilerplate. Today `renderWithBloc`/`createCubitStub`/`registerOverride` (`blac-react/src/testing.ts:19-82`, plus core `testing.ts`) have no notion of `args`/`deps`.

## Approach
1. **core `testing.ts`**: `createCubitStub`/`withBlocState`/`registerOverride` — allow supplying `args` so the stub runs `init(args)` (or accept a pre-seeded state). Add an optional `deps` to pre-populate `bloc.deps` via the core `[APPLY_DEPS]` symbol under a synthetic owner id.
2. **react `testing.ts`**: `renderWithBloc(ui, { bloc, instanceKey?, args?, deps? })` — forward `args`/`deps` so the rendered tree's `useBloc` resolves the same instance and the helper can pre-wire deps.
3. Keep the registry-swap + restore behavior intact (`renderWithBloc` swaps in a fresh `StateContainerRegistry` and restores on unmount).

### Subtleties
- If a bloc REQUIRES args, `renderWithBloc` without `args` should error clearly (or the type should require it). Prefer type-level requirement mirroring `UseBlocOptions`.
- `deps` in the helper should go through the same core merge path, not a back door, so `onDepsChanged` fires in tests too.

## Check (before editing)
```fish
grep -n "renderWithBloc\|createCubitStub\|registerOverride\|withBlocState" packages/blac-react/src/testing.ts packages/blac-core/src/testing.ts
```
Confirm no `args`/`deps` params yet.

## Implement
1. Add `args`/`deps` to core stub helpers (run `init`, pre-wire deps via `[APPLY_DEPS]`).
2. Add `args`/`deps` to `renderWithBloc`.

## Test
Add a test that renders a component using a bloc requiring args via `renderWithBloc(ui, { bloc, args })` and asserts state is seeded; and one pre-wiring a dep and asserting `onDepsChanged` ran.

## Verify
```fish
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- testing
pnpm --filter @blac/react typecheck
pnpm --filter @blac/react test -- testing
pnpm --filter @blac/core lint && pnpm --filter @blac/react lint
```

## Commit
```
feat(testing): args/deps support in test helpers
```
Body: `renderWithBloc` and core stub helpers accept `args` (runs init) and `deps` (pre-wires via the core merge), so args-required blocs are testable without boilerplate.

## Checklist
- [ ] core stub helpers accept args/deps
- [ ] `renderWithBloc` accepts args/deps
- [ ] tests pass in both packages; typecheck & lint clean
- [ ] committed with Completion filled

## Completion
**Commit SHA:** (filled post-commit)
**Files touched:** 5
- `packages/blac-core/src/core/StateContainerRegistry.ts` — added `insertInstance` public method
- `packages/blac-core/src/testing.ts` — `CubitStubOptions` gets `args`/`deps`; `createCubitStub` runs `init` + pre-wires deps; `registerOverride` simplified to use `insertInstance`
- `packages/blac-core/src/testing.args-deps.test.ts` — new test file (8 tests)
- `packages/blac-react/src/testing.ts` — no interface change needed (inherits via `CubitStubOptions`)
- `packages/blac-react/src/__tests__/renderWithBloc.testing.test.tsx` — new test file (4 tests)
- `plans/input-pattern/09-testing-helpers.md` — this file
**Typecheck result:** clean (both @blac/core and @blac/react)
**Test result:** core 602 passed (0 new failures); react 199 passed, 5 pre-existing proxy-WIP failures ignored
