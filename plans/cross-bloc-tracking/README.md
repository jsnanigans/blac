# Cross-bloc getter auto-tracking — implementation plan

## Goal

Let a bloc getter that reads **another bloc's state** (and that other bloc's
getters) auto-wake the React consumer when the other bloc changes — without the
consumer having to manually `useBloc(Other)`. Surface chosen by the user:
an explicit **`.track()`** on the dependency handle returned by `this.depend()`.

```ts
class CartBloc extends Cubit<{ qty: number }> {
  private price = this.depend(PriceBloc);
  get total() {
    const v = this.state.qty;              // own state (already tracked)
    const [s, bloc] = this.price.track();  // opt-in cross-bloc tracking
    return v * s.amount + bloc.someGetter;  // dep state + dep getter both tracked
  }
}
// Consumer:  const [, c] = useBloc(CartBloc);  <span>{c.total}</span>
// PriceBloc emits -> consumer re-renders, no useBloc(PriceBloc) needed.
```

`.track()` is render-aware: inside a tracked consumer render it records interest
and subscribes the consumer to the dep's channel; **outside a render** (called
from a method) it degrades to live values with no subscription — safe everywhere.

## Why this shape (the hard constraint)

Tracking is **per-consumer** and lives in the React layer. A hook cannot bracket
the component render body the way MobX's `observer()` does, so a global "active
session" would cross-contaminate sibling renders. The only clean hook is the
per-consumer `thisProxy` that `useBloc` already builds — so the dep MUST be
reached through `this.<handle>` for the consumer's session to thread in. A free
`otherInstance.state.x` (module-captured) is intentionally **not** trackable.
This is why the API hangs off `this.depend(...)`'s handle.

## Architecture (what changes)

**Core (`@blac/core`)** — `depend()` returns a *branded callable handle* instead
of a bare resolver. `handle()` keeps resolving the live instance (back-compat).
`handle.track()` base impl (no active session) returns `[instance.state, instance]`
live. Core stays framework-agnostic; it does NOT subscribe.

**React (`@blac/react`)** — the meaty part:
- Extract the proxy-builder in `useBloc` into a reusable `buildTrackedProxy`.
- Per-consumer **session**: `Map<container, {paths, trackingProxy}>`.
- `thisProxy` detects a branded handle and returns a per-consumer wrapper whose
  `.track()` records into the session (when armed) and returns a tracked
  state + tracked instance proxy (so the dep's getters track too).
- Generalize the layout-effect reconcile: subscribe/`registerConsumerPaths`/
  `acquire`-ref for every container in the session; diff vs the previous render
  to unsubscribe + release dropped deps; release all on unmount.
- The primary bloc becomes "the first entry in the session" — one code path.

Reference points (verify before editing — line numbers drift):
- `packages/blac-core/src/core/StateContainer.ts` — `depend()` ~267-277; `dependencies` getter ~248; `_dependencies` field ~229.
- `packages/blac-core/src/core/StateContainerRegistry.ts` — `ensure()` ~415 (= `acquire(..., {countRef:false})`); `acquire`/`release` for refcounted refs.
- `packages/blac-react/src/useBloc.ts` — proxy builder ~156-201; `trackedStateRef` ~230; channel subscribe effect ~232-283; snapshot + `trackRender` ~309-336; layout-effect reconcile + `expandWithAncestors` ~347-428.
- `packages/blac-react/src/__tests__/useBloc.cross-bloc-getter-tracking.test.tsx` — the characterization suite; `[GAP]` tests are the spec to flip.

## Phase DAG

```
01-core-dep-handle  ─┐
  (parallel-safe)    ├──> 03-react-wiring ──> 04-tests-and-docs
02-react-extract-proxy ┘      (sequential)        (sequential)
  (parallel-safe)
```

- **01** and **02** touch disjoint packages/files → run **in parallel**.
- **03** requires **01 + 02** committed.
- **04** requires **03** committed.

| Task | File | Depends on | Parallel with | Model | Thinking effort |
|------|------|-----------|---------------|-------|-----------------|
| 01 Core dep handle | `01-core-dep-handle.md` | — | 02 | **Sonnet 4.6** | high (branded-callable generics) |
| 02 Extract proxy builder | `02-react-extract-proxy.md` | — | 01 | **Sonnet 4.6** | medium (mechanical refactor) |
| 03 React wiring | `03-react-wiring.md` | 01, 02 | — | **Opus 4.8** | high (stateful + concurrency-sensitive) |
| 04 Tests + docs | `04-tests-and-docs.md` | 03 | — | **Sonnet 4.6** | high (semantics-driven tests) |

Model rationale: 01/02 are well-specified and contained → Sonnet is the
cost-effective fit (escalate 01 to Opus only if generic typing fights back).
03 is the genuinely hard, concurrency-sensitive change → Opus. 04 needs to reason
about the reactive semantics to write meaningful tests → Sonnet high.

## Branch & one-time setup (orchestrator, before launching agents)

```fish
git switch -c feat/cross-bloc-getter-tracking
```
All agents commit to this branch. (PR base is `v1` per repo convention.)

## Agent protocol — every task is a self-contained cycle

Each agent runs **check → implement → verify → test → commit**. Hard rules
(from the repo's developer guidelines — non-negotiable):

1. **CHECK**: read this README + your task file + the referenced source. Confirm
   your dependency tasks are committed (`git log --oneline -5`). Re-locate line
   numbers (they drift).
2. **IMPLEMENT**: only the files your task lists. Match surrounding code style.
3. **VERIFY** (targeted only — never whole-repo):
   - `cd <package>; pnpm typecheck`  (package-scoped tsc --noEmit)
   - `cd <package>; pnpm exec vp lint src`
   - `cd <package>; pnpm exec vp fmt "." --check`  ← required; oxfmt is not caught by lint
4. **TEST**: run ONLY the test files your task names, e.g.
   `cd packages/blac-react; pnpm exec vp test run src/__tests__/<file>.test.tsx`
5. **COMMIT**:
   - Stage only your task's files (`git add <paths>`), never `git add -A`.
   - Conventional format: `<type>(<scope>): <subject>` (branch has no ticket).
   - **No** `--no-verify` / hook-skipping flags.
   - **No** `Co-Authored-By` / self-attribution.
   - Never `git stash`, `git push`, `git rebase`, `git merge`, `git pull`.

Vitest import style: `import { describe, it, expect } from 'vite-plus/test';`
(bare globals fail lint). RTL: `import { render, act, screen } from '@testing-library/react';`.

## Done = all of

- [ ] 01–04 committed on `feat/cross-bloc-getter-tracking`
- [ ] every `[GAP]` test in the characterization suite flipped to passing
- [ ] new tests (transitive getter, conditional dep, mutual cycle, lifecycle) green
- [ ] no regressions in existing `useBloc.cross-bloc-*` suites
- [ ] core + react packages typecheck/lint/format clean

See `TODO.md` for the live checklist.
