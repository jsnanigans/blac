# TODO — `instanceId` → `args` migration

Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

Legend per task: **(Model / Effort)** and `∥` = parallel-safe within its group.

---

## Phase 0 — Prep (serial) → `phase-0-prep.md`

- [ ] 0.1 Land/branch in-flight devtools work onto a separate branch or commit **(Sonnet / low)**
- [ ] 0.2 Create `feat/instanceid-to-args` from a clean tree **(Haiku / low)**
- [ ] 0.3 Confirm baseline green: `pnpm typecheck && pnpm test` snapshot of current failures **(Haiku / low)**

## Phase 1 — Core (serial, BLOCKS ALL) → `phase-1-core.md`

- [ ] 1.1 blac-core: args-only public API + internal key tier + dead-code removal + core tests **(Opus / high)**

## Phase 2 — React (after 1; ∥ Phase 3) → `phase-2-react.md`

- [ ] 2.1 blac-react: remove `instanceId` from `UseBlocOptions`, args-only `useBloc`, args-based `BlocProvider`, react test-utils, react tests **(Sonnet / high)**

## Phase 3 — Compat (after 1; ∥ Phase 2) → `phase-3-compat.md`

- [ ] 3.1 blac-compat: freeze public v1 `id`, rewire internals to internal key tier, compat tests **(Sonnet / medium)**

## Phase 4 — Apps & consumers (after 1 + 2) → `phase-4-apps.md`

- [ ] 4a.1 examples/01-counter **(Haiku / low)** ∥
- [ ] 4a.2 examples/04-form **(Haiku / low)** ∥
- [ ] 4a.3 examples/07-registry **(Haiku / low)** ∥
- [ ] 4a.4 examples/06-db-persist **(Haiku / medium)** ∥
- [ ] 4a.5 examples/10-input-pattern (incl. CanvasView synthetic args) **(Sonnet / medium)** ∥
- [ ] 4a.6 examples/messenger (add `static key` to UserCubit; migrate ChannelBloc + WebSocketMock; remove `[WS DIAG]`) **(Sonnet / medium)** ∥
- [ ] 4b.1 apps/perf benchmarks (string keys → args) **(Haiku / low)** ∥
- [ ] 4c.1 devtools-ui + devtools-extension (`acquire/release(undefined…)` → args-form) **(Haiku / low)** ∥

## Phase 5 — Docs (after 1 + 2 API lock; ∥ Phase 4) → `phase-5-docs.md`

- [ ] 5.1 Primary React docs (use-bloc, getting-started) **(Sonnet / medium)** ∥
- [ ] 5.2 Primary guide docs (inputs, best-practices, patterns, troubleshooting, instance-management) **(Sonnet / medium)** ∥
- [ ] 5.3 Secondary docs (glossary, concepts, mental-model, migration-from-v1, testing/\*, cubit, watch, bloc-communication, persistence, flutter/redux) **(Sonnet / medium)** ∥

## Phase 6 — Verify + cleanup (serial, last) → `phase-6-verify.md`

- [ ] 6.1 Full-workspace typecheck + lint + test + format:check; build packages **(Sonnet / medium)**
- [ ] 6.2 Grep guard: zero residual `instanceId` option / explicit string-key public usage **(Haiku / low)**
- [ ] 6.3 Changeset (major bump for blac-core + blac-react; note compat unchanged surface) **(Sonnet / low)**

---

## Critical-path notes

- 1.1 must be **fully green** before 2.1 / 3.1 start (they import the new core API).
- 4.\* must wait for 2.1 (apps consume `useBloc`).
- 5.\* only needs the **API shape locked** (after 1.1 + 2.1 land); it touches only `apps/docs/**`,
  disjoint from Phase 4, so run them concurrently.
- 6.\* is the only place a **whole-repo** test run is allowed.
