# TODO — Proxy Tracking Fixes

Quick checklist mirror of the task index. See [`README.md`](./README.md) for execution order, dispatch rules, and model/effort guidance.

## Phase 1 — parallel (different files)

Launch these three agents **in the same tool-call message** so they run concurrently.

- [ ] **01** `getValueAtPath` nullable distinction — `path-utils.ts` — sonnet / low
- [ ] **02** Adapter re-renders on null↔object — `adapter/index.ts` — sonnet / low
- [ ] **03** `resolveDependencies` cycle key — `resolve-dependencies.ts` — haiku / low

## Phase 2 — serial (all touch `tracking-proxy.ts`)

Run one at a time. Each must commit before the next starts.

- [ ] **04** Array index path always tracked — haiku / low
- [ ] **05** `commitTrackedGetters` always replaces — haiku / low
- [ ] **06** Bound function cache per-target — sonnet / medium
- [ ] **07** `pathCache` trim on capture — sonnet / medium
- [ ] **08** Drop nested proxy cache on state swap — sonnet / medium

## Phase 3 — depends on Phase 2

- [ ] **09** Per-consumer active tracker — opus / high

## Phase 4 — final

- [ ] **10** Cross-package verification — sonnet / low

---

## Dispatch reminder

- **Wave 1:** parallel — three `Agent` blocks in one message (`01`, `02`, `03`).
- **Wave 2:** serial — `04 → 05 → 06 → 07 → 08`, one at a time.
- **Wave 3:** `09` after Wave 2 finished.
- **Wave 4:** `10`.

Every task is self-contained: check → implement → verify → test → commit. No worktrees. No `--no-verify`. No co-author. No cross-package `pnpm test`.
