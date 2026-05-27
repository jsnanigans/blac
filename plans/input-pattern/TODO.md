# Input Pattern — TODO

Status mirror of the task index. Tick a box when its commit lands.

## Phase 1 — Core (serial: 01 → 02 → 03 → 04)
- [ ] **01** `<S, Args, Deps>` generics + utility types — core — opus / high
- [ ] **02** `init(args)` lifecycle + construction threading — core — sonnet / medium
- [ ] **03** identity keying: `static key` + structural hasher — core — sonnet / medium
- [ ] **04** `deps` storage + per-owner merge + `onDepsChanged` — core — opus / high

## Phase 2 — Adapter (after 04)
- [ ] **05** adapter type passthrough for new generics — adapter — sonnet / low

## Phase 3 — React (serial: 06 → 07 → 08, after 05)
- [ ] **06** `useBloc` `args` option: typing + threading + keying precedence — react — sonnet / medium
- [ ] **07** `useBloc` `deps` lane: per-consumer merge + cleanup — react — opus / high
- [ ] **08** dev warnings + `dependencies`→`select` rename — react — sonnet / medium

## Phase 4 — Parallel (after 08)
- [ ] **09** testing helpers: `args`/`deps` support — core+react — sonnet / medium
- [ ] **10** example app: args + deps + onDepsChanged demo — examples — sonnet / medium
- [ ] **11** `@blac/preact` parity — preact — sonnet / medium
- [ ] **12** docs: core + react READMEs — docs — haiku / low

## Phase 5 — Final
- [ ] **13** final cross-package audit — all — sonnet / low

## Dispatch reminder
- Waves 1 & 3 are **strictly serial** (shared files, no worktrees): wait for each commit before launching the next.
- Wave 4 (`09`/`10`/`11`/`12`) launches **in parallel** — one message, four `Agent` blocks.
