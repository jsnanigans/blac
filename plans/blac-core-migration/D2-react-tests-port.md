# D2 — Port `@blac/react` tests to the new `useBloc`

**Phase:** D (parallel after D0; safe alongside D1)
**Model:** Sonnet 4.6
**Effort:** medium (29 test files; many will be straightforward, some need select rewrites)
**Estimated touch:** ~29 test files

---

## Goal

Get every test in `packages/blac-react/` green against D0's rewritten `useBloc`. Decide per test: keep, adjust, or delete.

Same rubric as C5; see that file for the per-test decision framework.

This gate proves the React adapter migration didn't regress. E0 (adapter delete) cannot run until D2 commits with a fully green suite.

---

## Inputs — read these first

1. `packages/blac-react/src/__tests__/**` and any `.test.tsx` files.
2. `packages/blac-react/src/useBloc.ts` (after D0).
3. `packages/blac-react/src/BlocProvider.tsx` (after D1 — possibly unchanged).
4. The D0 commit message — lists deferred test failures.
5. `plans/blac-core-migration/README.md` — Decision table (especially #3 select, #7 flush, #8 manual deps drop).
6. `~/.claude/CLAUDE.md` — commit format.

---

## Decision rubric (same shape as C5)

| Test asserts | Verdict |
|--------------|---------|
| `useBloc(C)` returns `[state, bloc]` and re-renders on emit | **Keep.** |
| `dependencies` option behavior | **Rewrite as `select`.** Per Decision 8 the option is gone. |
| `onMount`/`onUnmount` lifecycle | **Keep.** |
| `BlocProvider` context propagation | **Keep.** |
| `instanceId` per-component instances | **Keep.** |
| StrictMode double-invoke | **Keep.** `useStructural` handles it; verify your tests still pass. |
| Internal `@blac/adapter` behavior | **Delete.** Adapter is gone in E0. |
| Manual deps array passed to `useBloc` | **Delete or rewrite.** Migrate to `select`. |
| Renders-per-update count | **Adjust.** Microtask coalescing may reduce render counts. Update expectations to reflect the new model. |

---

## Scheduler injection

React-rendering tests need the channel to flush synchronously, otherwise assertions race the microtask queue. Two paths:

**Path 1 — inject `SyncScheduler` per test bloc:**

```ts
class TestCubit extends StateContainer<S> {
  constructor() {
    super(initial, { scheduler: new SyncScheduler() });
  }
}
```

**Path 2 — flush inside `act`:**

```ts
import { act } from '@testing-library/react';

await act(async () => {
  cubit.emit(next);
  await Promise.resolve();  // drain microtasks
});
```

Pick Path 1 for unit-style tests, Path 2 only for integration tests that actually want microtask semantics.

---

## Owned files (write set)

```
packages/blac-react/src/**/*.test.ts
packages/blac-react/src/**/*.test.tsx
packages/blac-react/src/__tests__/**
```

**Do not touch:** `useBloc.ts` (D0), `BlocProvider.tsx` (D1), `types.ts`, `config.ts`, `index.ts`.

If a real bug surfaces in `useBloc.ts`, **stop and report**. Fix in a follow-up to D0, not here.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - D0 and D1 have committed.
   - `vp run typecheck` from `packages/blac-react/` passes.

2. **Implement.**
   - Run `vp run test` once to get baseline failures.
   - Walk file by file. Use the rubric.
   - Wrap React rendering in `act(...)`. Don't rely on synchronous render after `emit`.

3. **Verify.**
   - `vp run typecheck`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test` — **must be 100% green**. No skips, no `.todo`.

5. **Commit.**

   ```
   test(blac-react): port test suite to rewritten useBloc
   ```

   Body (required):
   ```
   - <N> tests rewritten from `dependencies` to `select`.
   - <N> tests deleted (manual deps, @blac/adapter internals, <other>).
   - <N> tests adjusted for microtask flush semantics.
   - Final result: <X>/<X> passing.
   ```

---

## Acceptance criteria

- [ ] `vp run test` from `packages/blac-react/` is fully green.
- [ ] No skipped or `.todo` tests.
- [ ] Commit body lists rewrites and deletions.
- [ ] No source files outside the test directory were modified.

---

## Pitfalls

- **`react-dom/test-utils`** is deprecated. Use `@testing-library/react`'s `act` — already a devDep on structural (the Phase 4 prep commit `8b99a73d` added it; it should be in `@blac/react` too, otherwise add it).
- **`getByText` race**. After `emit`, the DOM updates on next microtask. Use `findByText` (async) or wrap the `emit` in `await act(async () => { ... })`.
- **`useId` and SSR snapshots.** If any test uses `renderToString`, the IDs are deterministic but the consumer ID changes between server and hydration. `useStructural` handles this; if a test breaks on hydration mismatch, that's a real bug — report.
- **Don't use `vi.useFakeTimers()`** for microtasks.
- **Re-render count assertions.** If a test asserted "renders exactly twice after two emits", microtask coalescing may make it render *once*. That's a win, not a regression — update the assertion.
- **`select` reference stability in tests.** If a test passes `select={(s) => [s.foo]}` inline (new function each render), the hook may resubscribe each render. Wrap with `useCallback` or define outside the component.
