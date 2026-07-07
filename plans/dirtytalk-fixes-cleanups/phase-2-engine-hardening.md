# Phase 2 — Engine error hardening + engine cleanup (Unit C)

**Goal:** `DirtyChannel` accepts an opt-in `onError` seam; the three deferred
scheduler drains isolate per-fn throws; unused `Signal`/`Observable` are
de-barreled and engine packaging nits fixed.

**Parallel:** runs ∥ Phase 1 (disjoint package). **Blocks Phase 3** (B forwards the
`onError` option this phase adds). One agent, tasks sequential.

**Owner:** quick-build, **sonnet/high**. Do **not** commit; do **not** run
tests/typecheck/lint/build. Extend existing tests, don't rewrite.

## Verify (phase entry — orchestrator)

- `rg -n 'onError' packages/dirtytalk-engine/src/dirty-channel.ts` → none (E2 open).
- Confirm E1 slot→Set already done (`rg -n '#pending' packages/dirtytalk-engine/src/scheduler.ts`) — do not undo it; E1b only *adds* per-fn isolation to the drains.

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent (model/effort) | Report-back | Done-check |
|---|------|-------|-----------|-----------|---------------------|-------------|------------|
| C1 | **E2** — add optional 3rd ctor arg `options?: { onError?: (err: unknown) => void }` to `DirtyChannel` (`dirty-channel.ts:36`). In `#flush`, when `onError` is set route each collected error to it and **do not rethrow**; when unset, preserve the exact current behavior (single throw / `AggregateError` at `:128-134`). Applies to both the interest-thunk catch (`:101`) and callback catch (`:111`). | `dirty-channel.ts` | sequential | — | quick-build (sonnet/high) | sync final response | With `onError` set, a throwing callback calls `onError(err)` and flush does not throw; with it unset, existing rethrow behavior is byte-identical. |
| C2 | **E1b** — in `ManualScheduler.pump` (`:34`), `MicrotaskScheduler.#drain` (`:64`), `RAFScheduler.#drain` (`:118`), wrap each `fn()` in try/catch, collect throws, and after the loop rethrow the single error or an `AggregateError` (mirror `dirty-channel.ts:128-134`). A throwing flush must not prevent remaining pending flushes from running. | `scheduler.ts` | sequential | — | quick-build (sonnet/high) | sync final response | Two pending fns where the first throws: the second still runs; the throw surfaces after the loop. |
| C3 | **Cleanup** — remove `Signal` + `Observable` exports from `index.ts:1-2` (leave `primitives.ts` source intact). Scrub the "insomni" codename in `space.ts`'s doc comment → neutral phrasing (e.g. "a canvas renderer"). In engine `package.json`: resolve the `files:["LICENSE"]` entry (add MIT `LICENSE` file). | `index.ts`, `space.ts`, `package.json`, `LICENSE` | sequential | — | quick-build (sonnet/high) | sync final response | `Signal`/`Observable` absent from `index.ts`; no "insomni" in `space.ts`; engine `LICENSE` file exists. |
| C4 | **Tests** — extend `dirty-channel.test.ts` (onError routes errors + suppresses rethrow; unset preserves rethrow) and `scheduler.test.ts` (per-fn isolation: first-of-two throws, second still runs). | `dirty-channel.test.ts`, `scheduler.test.ts` | sequential | C1,C2 | quick-build (sonnet/high) | sync final response | New cases exist for E2 + E1b; `import { ... } from 'vite-plus/test'`. |

## Sanity check (phase exit — orchestrator, best-effort)

- `git diff --stat` limited to `packages/dirtytalk-engine/src/*` + `package.json` + `LICENSE`.
- `rg -n 'Signal|Observable' packages/dirtytalk-engine/src/index.ts` → no hit.
- `rg -n 'onError' packages/dirtytalk-engine/src/dirty-channel.ts` → present.
- Confirm `MicrotaskScheduler`/`RAFScheduler.cancel` and `#pending` Set logic untouched except the drain try/catch.

## Commit (orchestrator)

One `fix(engine): add DirtyChannel onError seam + isolate scheduler drains`
(+ fold cleanup, or a separate `chore(engine)`). Subagent does not commit.

## Done-check

- [ ] E2: `onError` opt-in routes errors; default rethrow unchanged.
- [ ] E1b: throwing drain fn no longer starves remaining pending flushes.
- [ ] `Signal`/`Observable` de-barreled; `space.ts` "insomni" gone; LICENSE added.
