# C5 — Port `@blac/core` tests to the new container

**Phase:** C5 (sequential — runs **after** C1, C2, C3, C4 all commit)
**Model:** Sonnet 4.6
**Effort:** medium (35 test files; most need only minor changes)
**Estimated touch:** ~35 test files

---

## Goal

Make every test in `packages/blac-core/` green against the rewritten internals. C0–C4 deferred test fixes to here. Decide per test: **keep**, **adjust**, or **delete**.

This is the gate that proves the core migration didn't regress behavior. D0/D1/D2 cannot start until this commits with a fully green suite.

---

## Inputs — read these first

1. `packages/blac-core/src/core/__tests__/` — 13 test files.
2. `packages/blac-core/src/core/Cubit.test.ts`, `Cubit.edge-cases.test.ts`, `StateContainer.test.ts`.
3. `packages/blac-core/src/testing.ts`, `testing.args-deps.test.ts` (if present).
4. `packages/blac-core/src/plugin/PluginManager*.test.ts` (already covered by C2, but you re-run them).
5. `packages/blac-core/src/watch/*.test.ts` (already covered by C3, but you re-run).
6. The C0–C4 commit messages — they list deferred failures.
7. `plans/blac-core-migration/README.md` — Decision table (especially #5, #7, #8 — affect test rewrites).
8. `~/.claude/CLAUDE.md` — commit format.

---

## Decision rubric per test

For each test file, classify:

| Test asserts | Verdict |
|--------------|---------|
| Public API behavior (emit, state, dispose, depend, watch, registry) | **Keep.** Update imports if symbol locations moved. |
| `onSystemEvent('stateChanged')` fires once-per-flush | **Adjust.** May have asserted once-per-emit before; update to flush-coalesced expectation. Inject `SyncScheduler` for synchronous determinism. |
| Manual deps array (`useBloc` deps option) | **Delete.** Decision 8 dropped the API. |
| `tracked()` standalone | **Delete.** Decision 4. |
| `shallowEqualState` | **Delete or keep** per C4's decision. |
| Internal-only behavior (`EMIT` symbol dispatch, tracking internals) | **Delete or rewrite.** These tested the old internals. |
| Circuit breaker | **Delete** if C1 removed circuit breaker. Keep if C1 kept it. |
| Performance (`StateContainer.perf.test.ts`) | **Adjust expectations.** Microtask coalescing changes timing. Update budgets, don't delete. |

When in doubt: keep + adjust. Deletion requires a one-line note in the commit body justifying it.

---

## Scheduler injection pattern for tests

Microtask flushing is async, which makes tests harder. Use `SyncScheduler`:

```ts
import { SyncScheduler } from '@dirtytalk/engine';
import { StateContainer } from '@blac/core';

class TestCubit extends StateContainer<MyState> {
  constructor(initial: MyState) {
    super(initial, { scheduler: new SyncScheduler() });
  }
}
```

Or, if construction is via decorator + registry, accept that some tests need a `await flushMicrotasks()` helper:

```ts
const flush = () => new Promise<void>(r => queueMicrotask(r));
await flush();
```

Pick one strategy per test file. `SyncScheduler` is cleaner; flush helper is universal.

---

## Owned files (write set)

```
packages/blac-core/src/core/__tests__/**
packages/blac-core/src/core/Cubit*.test.ts
packages/blac-core/src/core/StateContainer*.test.ts
packages/blac-core/src/testing.ts
packages/blac-core/src/testing.args-deps.test.ts
packages/blac-core/src/__tests__/**         (if it exists at top level)
```

**Do not touch:** source files in `core/`, `registry/`, `plugin/`, `watch/`, `decorators/`. If you find a real bug, **stop and report** — fix in a follow-up commit, not by editing C0–C4 territory.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - C0, C1, C2, C3, C4 have committed. `git log --oneline | head -10` shows all five commits.
   - `vp run typecheck` from `packages/blac-core/` passes.

2. **Implement.**
   - Run `vp run test` once to get the baseline failure list.
   - Work file-by-file. For each failure: classify (rubric above), keep/adjust/delete.
   - Inject `SyncScheduler` or `await flush()` where microtask coalescing matters.
   - Update import paths if any symbol moved (e.g. `ALL_PATHS` now from `@dirtytalk/structural`).

3. **Verify.**
   - `vp run typecheck`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test` — **must be 100% green**. No skipped tests, no `.todo` markers.

5. **Commit.**

   ```
   test(blac-core): port test suite to rewritten StateContainer
   ```

   Body (required — list non-trivial changes):
   ```
   - <N> tests adjusted for microtask flush semantics (SyncScheduler injected).
   - <N> tests deleted (manual deps, tracked(), <other reasons>).
   - <N> tests unchanged.
   - Final result: <X>/<X> passing.
   ```

---

## Acceptance criteria

- [ ] `vp run test` from `packages/blac-core/` is fully green.
- [ ] No skipped or `.todo` tests.
- [ ] Commit body lists deleted tests and the reason for each.
- [ ] No source files in `core/`, `registry/`, `plugin/`, `watch/`, `decorators/` were modified.

---

## Pitfalls

- **`SyncScheduler` test isolation.** If you use a module-level scheduler, tests share state. Inject per-instance.
- **`onSystemEvent('stateChanged')` once-per-flush.** A test that calls `emit` three times synchronously and expects three `stateChanged` events will fail under microtask coalescing. Update to expect **one**. If the test wanted three, it's testing `emit` count, not `stateChanged` count — rewrite to assert on a different signal.
- **`StateContainer.perf.test.ts`**. Update budgets, don't delete. If the new model is *slower* for the tested case, escalate — don't loosen the budget.
- **Don't add `vi.useFakeTimers()`** as a workaround for microtask coalescing. Microtasks aren't timers; fake timers don't help. Use `await Promise.resolve()` or inject `SyncScheduler`.
- **Don't move tests around the directory.** Keep names so blame is clean. New tests for the new behavior live in new files (e.g. `StateContainer.path-events.test.ts`).
- **`testing.ts`** — this is `@blac/core`'s test-helper module. Update its helpers to use the new container; don't delete unless audit shows no consumer.
