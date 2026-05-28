# blac-core migration onto `@dirtytalk/structural` — implementation plan

Plan for migrating `@blac/core` (and `@blac/react`) to run on top of the path-based dirty-tracking primitives in `@dirtytalk/structural`, and for deleting `@blac/adapter` whose tracker becomes redundant.

Spec source: [`dirtytalk/03-blac.md`](../../dirtytalk/03-blac.md). Building block: [`packages/dirtytalk-structural/`](../../packages/dirtytalk-structural/) (landed via [`plans/dirtytalk-structural/`](../dirtytalk-structural/README.md)).

> **One folder, one task file per agent unit.** Each task file is self-contained: a single agent can be handed exactly one file, run `check → implement → verify → test → commit`, and exit. Owned write sets are disjoint within a phase — siblings are safe to run concurrently on the same checkout (no worktrees).

---

## Locked decisions

| Item | Decision |
|------|----------|
| Adoption strategy | Rewrite `@blac/core` internals. `StateContainer<S>` **extends `StructuralContainer<S>`**, then layers registry / plugin / decorator / lifecycle on top. Composition is fine where inheritance fights the existing API (`depend()`). |
| Public API compatibility | **Breaking changes OK.** Apps in this repo are updated as part of the plan. Renames where the new model is clearer. |
| `@blac/adapter` | **Deleted.** Subsumed by `@dirtytalk/structural`'s `trackRender` + `useStructural`. |
| `@blac/compat` | **Source untouched.** Smoke-tested in Phase G; fix only on failure. |
| `@blac/react` | Rewritten. `useBloc` wraps `useStructural`, layering registry acquire/release + `BlocProvider` context. |
| Plugins (`logging-plugin`, `plugin-persist`, `devtools-connect`, `devtools-ui`) | In scope. New plugin event payload carries `PathSet`. |
| Apps (`examples`, `devtools-extension`, `perf`, `docs`) | Updated as needed. `apps/perf` is the win-measurement target. |
| `apps/preact-examples` | Currently broken (depends on non-existent `@blac/preact`). **Phase A's first task** decides: fix or delete. Blocks `vp install`. |
| Branch | Single feature branch off `main`. Commits land sequentially; final merge bundles them. |
| Versioning | Major bump on `@blac/core` and `@blac/react`. No publish until plan completes. |

### Phase B — open-item resolutions (provisional; edit before Phase C runs)

These were "open" in the scope doc. Locked here so Phase C task files can stand alone. **Review and override** in this README before kicking off a Phase C agent — once locked, every C/D/E/F/G task file references back to this table.

| # | Item | Decision | Note |
|---|------|----------|------|
| 1 | `StateContainer` vs `StructuralContainer` | **Extends.** | Composition fallback only if `depend()` proves intractable in C0. |
| 2 | Per-class `PathInterner` | **Hoist to per-class static.** | Landed in Phase A1 inside `@dirtytalk/structural`. |
| 3 | `useBloc({ dependencies })` | **Renamed to `select`.** | Aligns with `@dirtytalk/structural` semantics. Codemod note for downstream apps. |
| 4 | Standalone `tracked()` API | **Deleted.** | `trackRender` covers it; no external consumer audited. Verified in A2. |
| 5 | `watch()` API | **Kept.** | Re-implemented as `container.subscribe(ALL_PATHS, cb)` wrapper. Same signature. |
| 6 | `BlacPlugin` event payload | **`(prev, next, paths: PathSet \| undefined)`.** | `paths` is `undefined` for events not tied to a state change (e.g. construction). Breaking but minimal. |
| 7 | `onSystemEvent('stateChanged')` semantics | **Once per flush** (microtask-coalesced). | Add `'stateMutated'` only if a downstream consumer needs per-emit; default off. |
| 8 | Manual deps array on `useBloc` | **Dropped.** | Replaced by `select`. App audit (A2) confirms migration paths. |
| 9 | `BlocProvider` / `instanceId` | **Kept.** | Per-component instance mode maps to structural's per-consumer `useId`. |
| 10 | DevTools event shape | **One rich event per flush** with `paths`. | Coordinated with devtools-ui rewrite (F3). |
| 11 | Compat smoke test scope | **Existing `packages/blac-compat/src/__tests__` is the gate.** | If they pass, compat ships. If they fail, patch compat. |
| 12 | `apps/perf` benchmark scenario | **List of 100 items sharing one Cubit.** Measure emit→commit latency and ops/sec. | Defined in G3. |

---

## Phase graph

```
              ┌───────────────────────────────┐
              │ A0  apps/preact-examples fix  │  (Phase A0 — sequential, must commit first)
              │ Sonnet 4.6 · low              │
              └────────────────┬──────────────┘
                               │
        ┌──────────────┬───────┴───────┬──────────────┐
        ▼              ▼               ▼              ▼
   A1 interner    A2 usage audit  A3 patch type   (Phase A — parallel)
   hoist          (read-only)     DeepPartial
   Sonnet · med   Haiku · low     Sonnet · low

                               │
                               ▼
              ┌───────────────────────────────┐
              │ B — Decisions table (above)   │  (this README; no agent runs)
              └────────────────┬──────────────┘
                               │
              ┌───────────────────────────────┐
              │ C0  StateContainer on         │  (Phase C0 — sequential keystone)
              │     StructuralContainer       │
              │ Opus 4.7 · high               │
              └────────────────┬──────────────┘
                               │
        ┌──────────────┬───────┴────────┬──────────────┐
        ▼              ▼                ▼              ▼
   C1 registry    C2 plugin events  C3 watch + tracked  C4 decorator + config
   Sonnet · med   Opus · high       Sonnet · med        Sonnet · low
                               │
                               ▼
              ┌───────────────────────────────┐
              │ C5  core tests port           │  (Phase C5 — sequential)
              │ Sonnet 4.6 · med              │
              └────────────────┬──────────────┘
                               │
                               ▼
              ┌───────────────────────────────┐
              │ D0  useBloc on useStructural  │  (Phase D0 — sequential)
              │ Opus 4.7 · high               │
              └────────────────┬──────────────┘
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
            D1 BlocProvider           D2 react tests port
            Sonnet · low              Sonnet · med
                               │
                               ▼
              ┌───────────────────────────────┐
              │ E0  delete @blac/adapter      │  (Phase E0 — sequential)
              │ Sonnet 4.6 · low              │
              └────────────────┬──────────────┘
                               │
        ┌──────────────┬───────┴────────┬──────────────┐
        ▼              ▼                ▼              ▼
   F0 logging     F1 persist       F2 devtools-      F3 devtools-ui
   plugin         plugin           connect           Sonnet · med
   Sonnet · med   Sonnet · med     Sonnet · med
                               │
                               ▼
        ┌──────┬──────┬───────┴──────┬──────┐
        ▼      ▼      ▼              ▼      ▼
   G0 ex   G1 docs G2 devtools-ext G3 perf  G4 compat smoke
   Sonnet  Sonnet  Sonnet · med    Opus     Sonnet · low
   · low   · low   (depends F2+F3) · high
```

**Sequencing rules:**
- A0 must commit before any A1/A2/A3 starts (workspace unblock).
- A1/A2/A3 are parallel-safe (disjoint write sets).
- B is a README review — no agent. User reviews/edits the decision table; then C0 runs.
- C0 must commit before C1/C2/C3/C4 start.
- C1/C2/C3/C4 are parallel-safe; all must commit before C5.
- C5 must commit before D0.
- D0 must commit before D1/D2; D1/D2 parallel-safe.
- D2 must commit before E0.
- E0 must commit before F0/F1/F2/F3.
- F0/F1 parallel-safe with each other. F3 needs F2's commit first (devtools-ui consumes devtools-connect events).
- All F's must commit before G0..G4. G0/G1/G4 are parallel-safe. G2 needs F2+F3 commits. G3 runs last.

---

## Model & effort guide

Effort is advisory — used to pick fast-mode vs default in the Claude Code harness.

| Task | Model | Effort | Why |
|------|-------|--------|-----|
| A0-preact-examples-fix | Sonnet 4.6 | low | Either delete a directory + workspace entry, or wire it to `@blac/react`. Mechanical. |
| A1-interner-hoist | Sonnet 4.6 | medium | Touches `@dirtytalk/structural` internals; per-class static registry needs care. |
| A2-blac-usage-audit | Haiku 4.5 | low | Read-only grep + Markdown output. No code edits. |
| A3-deep-partial-patch | Sonnet 4.6 | low | TypeScript helper type + signature update; minor test additions. |
| C0-state-container | Opus 4.7 | high | Keystone rewrite. Extends `StructuralContainer`, port lifecycle, `depend()`, hydration, `_state` accessors. |
| C1-registry | Sonnet 4.6 | medium | Registry surface stays; ensure refcount + identity work over the new container. |
| C2-plugin-system | Opus 4.7 | high | Event payload contract change; plugin authoring API; coordination with devtools/logging/persist. |
| C3-watch-and-tracked | Sonnet 4.6 | medium | `watch()` rewire + `tracked()` deletion. Includes removing the `tracking/` directory. |
| C4-decorator-and-config | Sonnet 4.6 | low | `@blac` decorator + `configureBlac` + static-prop helpers. Mostly preserves existing behavior. |
| C5-core-tests-port | Sonnet 4.6 | medium | Port or rewrite the 35 existing tests against the new internals. Decide-per-test. |
| D0-useBloc | Opus 4.7 | high | React adapter subtleties: StrictMode, `select`, registry acquire/release, dispose ordering. |
| D1-blocProvider | Sonnet 4.6 | low | Mostly unchanged; verify context flow + `instanceId` works with structural consumers. |
| D2-react-tests-port | Sonnet 4.6 | medium | Port or rewrite the 29 react tests against the new hook. |
| E0-remove-adapter | Sonnet 4.6 | low | Delete `packages/blac-adapter`; remove from `pnpm-workspace.yaml`; purge import sites. |
| F0-logging-plugin | Sonnet 4.6 | medium | Adapt to new plugin event payload (`paths: PathSet`). |
| F1-plugin-persist | Sonnet 4.6 | medium | Same as F0; persist only changed paths (perf win). |
| F2-devtools-connect | Sonnet 4.6 | medium | Forward new event shape to devtools UI. |
| F3-devtools-ui | Sonnet 4.6 | medium | Display changed paths in UI; coordinate with F2's event shape. |
| G0-examples-update | Sonnet 4.6 | low | Mechanical: rename `dependencies` → `select` where used; verify each demo runs. |
| G1-docs-update | Sonnet 4.6 | low | Update prose + code samples in `apps/docs`. |
| G2-devtools-extension-update | Sonnet 4.6 | medium | Wire into the new devtools-connect; smoke-test in the browser extension shell. |
| G3-perf-benchmark | Opus 4.7 | high | Define + run benchmark. Record before/after. Analyze. |
| G4-compat-smoke-test | Sonnet 4.6 | low | Run `packages/blac-compat`'s existing tests against the new core; patch only on failure. |

---

## File ownership matrix

Each task owns a disjoint write set within its phase. Parallel siblings never touch the same file.

| Task | Owned files |
|------|-------------|
| A0-preact-examples-fix | `apps/preact-examples/**` (delete or rewire), `pnpm-workspace.yaml` (only if removing) |
| A1-interner-hoist | `packages/dirtytalk-structural/src/path-interner.ts`, `src/path-interner.test.ts`, `src/container.ts` (interner accessor wiring only) |
| A2-blac-usage-audit | `plans/blac-core-migration/_audit.md` (new) |
| A3-deep-partial-patch | `packages/dirtytalk-structural/src/container.ts` (patch signature only), `src/container.test.ts` |
| C0-state-container | `packages/blac-core/src/core/StateContainer.ts`, `core/Cubit.ts`, `core/symbols.ts`, `core/StateContainerRegistry.ts` (signature only), `src/index.ts` (barrel) |
| C1-registry | `packages/blac-core/src/registry/**`, `src/core/StateContainerRegistry.ts` (body) |
| C2-plugin-system | `packages/blac-core/src/plugin/**` |
| C3-watch-and-tracked | `packages/blac-core/src/watch/**`, `src/watch-entry.ts`, `src/tracking/**` (delete), `src/tracking.ts` (delete) |
| C4-decorator-and-config | `packages/blac-core/src/decorators/**`, `src/config.ts`, `src/utils/static-props.ts`, `src/constants.ts` |
| C5-core-tests-port | `packages/blac-core/src/__tests__/**`, `src/*.test.ts` |
| D0-useBloc | `packages/blac-react/src/useBloc.ts`, `src/types.ts`, `src/config.ts` |
| D1-blocProvider | `packages/blac-react/src/BlocProvider.tsx`, `src/index.ts` |
| D2-react-tests-port | `packages/blac-react/src/**/*.test.ts*`, `packages/blac-react/src/__tests__/**` |
| E0-remove-adapter | `packages/blac-adapter/**` (delete), `pnpm-workspace.yaml`, any file importing `@blac/adapter` |
| F0-logging-plugin | `packages/logging-plugin/src/**` |
| F1-plugin-persist | `packages/plugin-persist/src/**` |
| F2-devtools-connect | `packages/devtools-connect/src/**` |
| F3-devtools-ui | `packages/devtools-ui/src/**` |
| G0-examples-update | `apps/examples/src/**`, `apps/examples/package.json` (if version bumps needed) |
| G1-docs-update | `apps/docs/src/**`, content/MDX files |
| G2-devtools-extension-update | `apps/devtools-extension/src/**` |
| G3-perf-benchmark | `apps/perf/src/**`, `plans/blac-core-migration/_perf-results.md` (new) |
| G4-compat-smoke-test | None (read-only; run existing tests). If a fix is needed, escalate as a fresh task. |

---

## Driving an agent

For each task, spawn an agent with the literal task file as its prompt. Example:

```ts
Agent({
  subagent_type: "general-purpose",  // or "quick-build" for low/med effort
  description: "blac-migration: C0 state container",
  prompt: <contents of plans/blac-core-migration/C0-state-container.md>,
})
```

Each task file contains:
- Goal + acceptance criteria
- Inputs (files to read first)
- **Owned files** (exclusive write set)
- **Do-not-touch list** (other parallel agents' files)
- Concrete check → implement → verify → test → commit cycle
- Commit message format (`<type>(<scope>): <subject>`, no co-author)
- Pitfalls

**Branch:** all agents work on the current branch. No worktrees, no branching. If `git status` is dirty at start, the agent must stop and report.

**Parallel safety:** the ownership matrix above is the contract. Concurrent agents on the same checkout don't conflict as long as they respect their owned set.

**Pre-existing workspace breakage:** Phase A0 fixes the `apps/preact-examples` → `@blac/preact` broken ref. Until A0 commits, `vp install` at repo root fails. Agents must run scoped `vp run` commands from the relevant package directory.

---

## Acceptance criteria for the plan as a whole

- [ ] All files listed in the ownership matrix exist with the intended state (or are deleted where the matrix says delete).
- [ ] `vp run typecheck`, `lint`, `format:check`, `test`, `build`, `verify` pass for every modified package.
- [ ] `@blac/adapter` no longer exists in the workspace.
- [ ] `@blac/compat`'s existing tests pass against the new core without source edits.
- [ ] `apps/perf` benchmarks show emit→commit latency improvement for N≥10 consumers sharing one Cubit (G3 records the numbers).
- [ ] `apps/devtools-extension` opens and shows live blocs with path-level change annotations.
- [ ] No `@blac/adapter` import remains anywhere in the workspace.
- [ ] `apps/preact-examples` either works or is removed (`pnpm-workspace.yaml` reflects reality).

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `@blac/compat` breaks despite "untouched" decision | medium | G4 smoke test is the gate; if it fails, file a follow-up task. |
| DevTools regressions from event-shape change | medium | F2+F3 coordinate; G2 verifies in extension shell. |
| Per-class interner forces breaking signature on `StructuralContainer` | low | A1 lands the hoist before C0 starts. |
| Microtask coalescing changes test timing assumptions | medium | Tests opt into `SyncScheduler` (per Decision 7). C5 / D2 codify this. |
| Apps depend on internal `@blac/core` exports beyond the public API | low | A2 audit surfaces this; C0 plans the migration of `EMIT`/`APPLY_DEPS`/`REMOVE_DEPS_OWNER`. |
| `depend()` cross-bloc subscription doesn't fit `StructuralContainer` cleanly | medium | C0 owns the call; can fall back to composition. |
| `apps/preact-examples` workaround drags on | medium | A0 is the very first agent task. |

---

## Open items (deliberately deferred)

- Whether to release `@blac/core@2.x` as a separate major or fold into a workspace-wide bump. Decide near ship.
- Whether `@blac/compat` should eventually be retired. Out of scope.
- Non-React framework adapters (Preact, Vue). Tracked once `apps/preact-examples` is either fixed or deleted in A0.

---

## Status board (update as phases land)

- [ ] Phase A0 — `apps/preact-examples` resolved
- [ ] Phase A1 — Interner hoisted to per-class
- [ ] Phase A2 — Usage audit committed at `_audit.md`
- [ ] Phase A3 — `DeepPartial<S>` patch type landed in structural
- [ ] Phase B — Decision table (above) reviewed and locked
- [ ] Phase C0 — `StateContainer` on `StructuralContainer`
- [ ] Phase C1–C4 — Registry / plugins / watch / decorator
- [ ] Phase C5 — Core tests ported
- [ ] Phase D0 — `useBloc` on `useStructural`
- [ ] Phase D1–D2 — Provider + React tests
- [ ] Phase E0 — `@blac/adapter` deleted
- [ ] Phase F0–F3 — Plugins + devtools updated
- [ ] Phase G0–G4 — Apps + perf + compat smoke
