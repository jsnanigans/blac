# Phase 1 — Structural tracker correctness + structural cleanup (Unit A)

**Goal:** `tracker.ts` no longer mis-records aliased subtrees, crashes on frozen
state, or ignores key enumeration; a `raw()` unwrap helper exists; unused
`pathsFromPatch` is de-barreled and structural packaging nits fixed.

**Parallel:** whole phase runs ∥ Phase 2 (disjoint package). All tasks below are
**one agent, sequential** (shared file `tracker.ts` / `index.ts`).

**Owner:** quick-build, **opus/high**. Do **not** commit; do **not** run
tests/typecheck/lint/build. Extend existing tests, don't rewrite.

## Verify (phase entry — orchestrator)

- `rg -n 'proxyByTarget|getOwnPropertyDescriptor|ownKeys|export const raw' packages/dirtytalk-structural/src/tracker.ts`
  → confirms current state: `proxyByTarget` keyed by target only; no descriptor
  check; no `ownKeys`/`has` trap; no `raw`.
- Confirm T1 root-sentinel already present (`rg -n 'rootId' packages/dirtytalk-structural/src/container.ts`) — do not touch it.

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent (model/effort) | Report-back | Done-check |
|---|------|-------|-----------|-----------|---------------------|-------------|------------|
| A1 | **T2** — key the per-render proxy cache by `(target, prefix)`, not target alone. Replace `proxyByTarget: WeakMap<object,unknown>` (`tracker.ts:99`) with a `WeakMap<object, Map<string, unknown>>` (target → prefix → proxy). Same `(target,prefix)` returns the identical proxy (preserve `value.user===value.user`); the same object read via two different paths gets two proxies each recording *its own* prefix. | `tracker.ts` | sequential | — | quick-build (opus/high) | sync final response (summary) | An object reachable at two paths records both leaf paths; same-path repeat read is `===`-identical. Comment updated at `tracker.ts:61`. |
| A2 | **T3** — before recursing into a nested value (`tracker.ts:217-221`), read `Object.getOwnPropertyDescriptor(t, key)`; if `desc && !desc.configurable && !desc.writable`, return the **raw** value (path already recorded above as a coarse leaf) instead of `wrap(...)`. | `tracker.ts` | sequential | A1 | quick-build (opus/high) | sync final response | Reading a nested property of an `Object.freeze`d state no longer throws the Proxy `[[Get]]` TypeError; the frozen object's path is still recorded. |
| A3 | **T4** — add an `ownKeys` trap: pin the object's own entry `prefix` path (coarse, like `pinArrayPath`) so `Object.keys`/`for..in`/spread over the object wakes on add/remove; add a `has` trap that records the queried child path. Skip pinning when `prefix===''` (root). | `tracker.ts` | sequential | A2 | quick-build (opus/high) | sync final response | `Object.keys(state.dict)` records the `dict` path (non-empty set); `'k' in state.dict` records `dict.k`. Existing array `length`/iteration behavior unchanged. |
| A4 | **T5** — add a module-scope-per-call `proxyToTarget = new WeakMap<object,object>()`; register every proxy→target in `wrap` (`tracker.ts:225-226`). Export `raw<T>(v: T): T` from the package barrel that returns the underlying target for a tracked proxy, else `v`. Document the two hazards (identity-`===` callbacks; derived-array escape) in the `trackRender` docstring + README. | `tracker.ts`, `index.ts`, `README.md` | sequential | A3 | quick-build (opus/high) | sync final response | `raw(proxy) === underlyingTarget`; `raw(nonProxy) === nonProxy`; `raw` exported from `index.ts`; docstring lists both hazards. |
| A5 | **Cleanup** — remove `pathsFromPatch` from `index.ts` export list (`index.ts:16`); mark its declaration `@internal` in `diff.ts`. In `package.json`: remove the dead `typesVersions.core` mapping (no `./core` export exists); resolve the `files:["LICENSE"]` entry — add a MIT `LICENSE` file (author already in package.json). | `index.ts`, `diff.ts`, `package.json`, `LICENSE` | sequential | A4 | quick-build (opus/high) | sync final response | `pathsFromPatch` absent from barrel, `@internal` in `diff.ts`; `typesVersions.core` gone; a `LICENSE` file exists in the package dir. |
| A6 | **Tests** — extend `tracker.test.ts`: aliased-subtree records correct path (A1); frozen-state read doesn't throw + path recorded (A2); `Object.keys`/`in` enumeration wakes (A3); `raw()` unwraps proxies and passes through non-proxies (A4). | `tracker.test.ts` | sequential | A1–A4 | quick-build (opus/high) | sync final response | New cases exist for T2/T3/T4/T5; use `import { ... } from 'vite-plus/test'`. |

## Sanity check (phase exit — orchestrator, best-effort)

- `git diff --stat` limited to `packages/dirtytalk-structural/src/{tracker,index,diff}.ts`, `package.json`, `LICENSE`, `tracker.test.ts`.
- `rg -n 'export const raw|export function raw' packages/dirtytalk-structural/src` → `raw` exported.
- `rg -n 'pathsFromPatch' packages/dirtytalk-structural/src/index.ts` → no hit.
- Confirm `container.ts` untouched by this phase (owned by Phase 3).

## Commit (orchestrator)

Batch with Phase 3 into one `fix(structural)` (or split: this phase as
`fix(structural): tracker aliasing/frozen/enumeration + raw() helper`). No commit
by the subagent.

## Done-check

- [ ] T2: aliased subtree records its own path (test green in validation).
- [ ] T3: frozen-state read doesn't throw.
- [ ] T4: object key enumeration wakes consumers.
- [ ] T5: `raw()` exported and unwraps; hazards documented.
- [ ] `pathsFromPatch` de-barreled + `@internal`; packaging nits fixed.
