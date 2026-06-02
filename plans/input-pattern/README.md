# Input Pattern — `args` · `deps` · identity keying (major version)

Implements the design in [`projects-analysis/2026-05-27/04-input-pattern-design.md`](../../projects-analysis/2026-05-27/04-input-pattern-design.md). Gives blocs a safe, ergonomic way to receive external data, replacing the hand-rolled `setProps` anti-pattern.

This is a **breaking, major-version** change. There is **no backwards-compat requirement** — old APIs are removed in place, no deprecation aliases, no compat shims. Consumers will migrate. `@blac/compat` (the v1 shim) is **out of scope — do not touch it.**

## The three lanes (locked design)

| Lane       | Purpose                                                 | Keys identity?                                    | Lifetime                                   |
| ---------- | ------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| **`args`** | serializable identity + construction data               | **yes** — `static key(args)` else structural hash | once, at `init(args)`                      |
| **`deps`** | non-serializable handles (refs, callbacks, controllers) | **never**                                         | live, per-consumer merged, `onDepsChanged` |
| **events** | values that change over time / late-bound               | n/a                                               | ordinary methods called from one effect    |

Key mechanics: zero-arg `new Type()` stays; framework calls **`init(args)`** once before first snapshot. Identity = `static key(args)` or structural hash of `args` (distinct args ⇒ distinct instance; same-key arg mismatch ⇒ **dev-warn**). `deps` are read lazily (`this.deps.x`) and merged per consumer; **`onDepsChanged(next, prev)`** fires post-merge for wait-for-handle init (canvas, RTE controller).

## Naming decisions (locked for this plan)

- New injected-handles option: **`deps`**.
- The existing manual re-render selector `dependencies` is **renamed to `select`** (avoids `deps`/`dependencies` confusion). Breaking — fine.
- Generics: `StateContainer<S, Args = void, Deps = {}>`, `Cubit<S, Args = void, Deps = {}>`.
- Lifecycle: `init(args)` and `onDepsChanged(next, prev)` on `StateContainer`.
- New static prop: `static key = (args) => string`.
- Identity precedence (explicit beats derived): explicit `instanceId` → `autoInstance`/`static isolated` → `static key(args)`/hash → `<BlocProvider>` context → `'default'`.

## Scope

| #   | Task                                                            | Package / files                                                                                                             | Phase | Model / effort  |
| --- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----- | --------------- |
| 01  | `<S, Args, Deps>` generics + utility types                      | core: `StateContainer.ts`, `Cubit.ts`, `types/utilities.ts`                                                                 | 1     | opus / high     |
| 02  | `init(args)` lifecycle + construction threading                 | core: `StateContainer.ts`, `StateContainerRegistry.ts`, `registry/*.ts`                                                     | 1     | sonnet / medium |
| 03  | identity keying: `static key` + structural hasher               | core: `constants.ts`, `static-props.ts`, `decorators/blac.ts`, `utils/structural-key.ts` (new), `StateContainerRegistry.ts` | 1     | sonnet / medium |
| 04  | `deps` storage + per-owner merge + `onDepsChanged`              | core: `StateContainer.ts`, `core/symbols.ts`                                                                                | 1     | opus / high     |
| 05  | adapter type passthrough for new generics                       | adapter: `src/index.ts`                                                                                                     | 2     | sonnet / low    |
| 06  | `useBloc` `args` option: typing + threading + keying precedence | react: `types.ts`, `useBloc.ts`                                                                                             | 3     | sonnet / medium |
| 07  | `useBloc` `deps` lane: per-consumer merge + cleanup             | react: `types.ts`, `useBloc.ts`                                                                                             | 3     | opus / high     |
| 08  | dev warnings + `dependencies`→`select` rename                   | react: `types.ts`, `useBloc.ts`, `config.ts`                                                                                | 3     | sonnet / medium |
| 09  | testing helpers: `args`/`deps` support                          | core: `testing.ts`; react: `testing.ts`                                                                                     | 4     | sonnet / medium |
| 10  | example app: args + deps + onDepsChanged demo                   | `apps/examples/**`                                                                                                          | 4     | sonnet / medium |
| 11  | `@blac/preact` parity                                           | preact: `src/**`                                                                                                            | 4     | sonnet / medium |
| 12  | docs: core + react READMEs                                      | `packages/blac-{core,react}/README.md`                                                                                      | 4     | haiku / low     |
| 13  | final cross-package audit                                       | all                                                                                                                         | 5     | sonnet / low    |

## Ground rules for every agent

Every task file is a **self-contained cycle**:

1. **Check** — read the listed files, run the task's `## Check` grep/ls, confirm the starting state matches the task's assumptions. If it doesn't match (someone already changed it, line numbers drifted), **stop and report** — don't guess.
2. **Implement** — apply the change as described. Breaking changes are expected; remove old code in place.
3. **Verify** — targeted commands ONLY (project's "Targeted Validation Only" rule):
   - `pnpm --filter <pkg> typecheck`
   - `pnpm --filter <pkg> test -- <relevant file>` (NOT the whole suite, NOT root `pnpm test`)
   - `pnpm --filter <pkg> lint` if you touched non-test source
4. **Test** — add at least one test that exercises the new behavior (co-locate per "Test conventions"). It must pass.
5. **Commit** — one commit per task, conventional format (`type(scope): subject`), scope = `core`/`react`/`adapter`/`preact`/`examples`/`docs`. Commit the updated task-file `## Completion` block **in the same commit**. No Claude co-author. No `--no-verify`.

**Do not**: run `pnpm test` at the root; push/pull/merge/rebase/stash; add compat shims or deprecation aliases; touch `@blac/compat`; create git worktrees.

Branch: commit to the current branch following the existing-plan convention (no ticket prefix). The operator may create one feature branch for the whole effort beforehand.

## Execution order

```
Phase 1 — CORE (serial chain; all touch StateContainer.ts / registry → no worktrees → serialize)
──────────────────────────────────────────────────────────────────────────────────────────────
01 generics  →  02 init+construction  →  03 identity keying  →  04 deps + onDepsChanged
(opus/high)     (sonnet/medium)          (sonnet/medium)         (opus/high)

Phase 2 — ADAPTER (after Phase 1)
─────────────────────────────────
05 adapter type passthrough            (sonnet/low)

Phase 3 — REACT (serial chain; all touch useBloc.ts / types.ts; after Phase 2)
──────────────────────────────────────────────────────────────────────────────
06 args option  →  07 deps lane  →  08 dev warnings + rename
(sonnet/medium)    (opus/high)       (sonnet/medium)

Phase 4 — PARALLEL (after Phase 3; different files/packages)
─────────────────────────────────────────────────────────────
09 testing helpers   10 examples   11 preact parity   12 docs
(sonnet/medium)      (sonnet/med)  (sonnet/medium)    (haiku/low)

Phase 5 — FINAL
────────────────
13 cross-package audit                 (sonnet/low)
```

**Dispatch waves:**

- Wave 1: `01` → `02` → `03` → `04`, strictly serial (each commit lands before the next launches).
- Wave 2: `05` after `04` is committed.
- Wave 3: `06` → `07` → `08`, strictly serial.
- Wave 4: `09`, `10`, `11`, `12` in **parallel** (single message, four `Agent` blocks).
- Wave 5: `13` after everything else.

## Model & effort guide

| Model                 | When                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `haiku` (Haiku 4.5)   | Mechanical, exact-spec edits (docs).                                                                                           |
| `sonnet` (Sonnet 4.6) | The workhorse: multi-file wiring, new tests, careful but specified edits.                                                      |
| `opus` (Opus 4.7)     | Type-level / behavioral design surface: `01` generics, `04` deps merge, `07` react deps wiring (StrictMode-correct lifecycle). |

Effort (`low`/`medium`/`high`) is informational; pass it through in the agent prompt.

## Agent dispatch

Use the `Agent` tool. `subagent_type: "quick-build"` for low/medium; `subagent_type: "claude"` for high (opus). Pass `model` from the task front matter. Paste the task file content verbatim into the prompt and add: _"Read the front matter. Do all of: check → implement → verify → test → commit. The plan is approved; don't ask for confirmation."_ Parallel launches go in one message; serial launches wait for the prior commit.

See [`AGENT-INSTRUCTIONS.md`](./AGENT-INSTRUCTIONS.md) for the full dispatch reference.

## Test conventions

- `@blac/core`: co-locate in `packages/blac-core/src/core/*.test.ts` (e.g. `StateContainer.args.test.ts`, `StateContainer.deps.test.ts`) and `packages/blac-core/src/registry/*` / `utils/*.test.ts` for keying.
- `@blac/react`: `packages/blac-react/src/__tests__/useBloc.args.test.tsx`, `useBloc.deps.test.tsx`.
- `@blac/adapter`: `packages/blac-adapter/src/__tests__/`.
- `@blac/preact`: mirror its existing test location.
- Use `vitest`; don't add test infra.

## Completion tracking

Each task file ends with `## Checklist` + `## Completion`. The agent fills Completion with: Commit SHA, files touched (count + list), typecheck result, test result (names that now pass). Commit the task-file update **in the implementation commit** — no separate doc commit.

## Task index

1. [`01-core-generics.md`](./01-core-generics.md) — Phase 1, serial — opus / high
2. [`02-core-init-construction.md`](./02-core-init-construction.md) — Phase 1, serial — sonnet / medium
3. [`03-core-identity-keying.md`](./03-core-identity-keying.md) — Phase 1, serial — sonnet / medium
4. [`04-core-deps-ondepschanged.md`](./04-core-deps-ondepschanged.md) — Phase 1, serial — opus / high
5. [`05-adapter-typecompat.md`](./05-adapter-typecompat.md) — Phase 2 — sonnet / low
6. [`06-react-args.md`](./06-react-args.md) — Phase 3, serial — sonnet / medium
7. [`07-react-deps.md`](./07-react-deps.md) — Phase 3, serial — opus / high
8. [`08-react-dev-warnings.md`](./08-react-dev-warnings.md) — Phase 3, serial — sonnet / medium
9. [`09-testing-helpers.md`](./09-testing-helpers.md) — Phase 4, parallel — sonnet / medium
10. [`10-examples.md`](./10-examples.md) — Phase 4, parallel — sonnet / medium
11. [`11-preact-parity.md`](./11-preact-parity.md) — Phase 4, parallel — sonnet / medium
12. [`12-docs.md`](./12-docs.md) — Phase 4, parallel — haiku / low
13. [`13-final-audit.md`](./13-final-audit.md) — Phase 5 — sonnet / low
