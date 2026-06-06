# `$blac` meta namespace migration — implementation plan

Move `StateContainer`'s generic-named public identity/lifecycle members (`name`, `debug`, `instanceId`, `createdAt`, `dependencies`, `isDisposed`, the hydration surface, `initConfig`) under a single reserved instance member:

```ts
readonly $blac: BlacMeta<S> = createMeta(this);
```

This collapses ~12 reserved instance names to **one**, freeing generic names (`name`, `debug`, ...) for userland cubits and eliminating the silent-shadow hazard (a subclass declaring `name: string` today silently breaks devtools/registry).

> **One folder, one task file per agent unit.** Each task file is self-contained: a single agent is handed exactly one file, runs `check → implement → verify → test → commit`, and exits. Owned write sets are disjoint within a wave — siblings are safe to run concurrently on the same checkout (**no worktrees, no branching**).

---

## Locked decisions

| Item | Decision |
| --- | --- |
| What moves under `$blac` | `name`, `debug`, `instanceId` (→ `id`), `createdAt`, `dependencies`, `isDisposed` (→ `disposed`), hydration surface (→ `hydration.{status, error, isHydrated, changedWhileHydrating, begin(), apply(), finish(), fail(), wait()}`) |
| What stays top-level | `state`, `emit`, `patch`, `update`, `args`, `deps`, `depend()`, `subscribe`, `dispose()`, `onSystemEvent`, `channel`. These are the intentional user API; their generics (`Args`, `Deps`) flow naturally where they are. |
| `initConfig` | Becomes **symbol-keyed** `[INIT_CONFIG]` (new `@internal` export from `core/symbols.ts`, same pattern as `APPLY_DEPS`). It is framework-only (registry + testing helpers) — symbol-keying frees the name entirely instead of deprecating it. Legacy `initConfig()` kept as deprecated delegate until M5. |
| Back-compat window | M0 keeps every legacy member as a **deprecated getter/setter pair delegating to `$blac`** (setters needed: `initConfig` historically wrote `name`/`debug`/`instanceId`). All downstream packages keep working unmodified → waves M1–M4 are fully parallel. M5 deletes the legacy surface (breaking, major bump). |
| Deprecation warnings | Dev-only, **once per member per class**, and suppressed when `NODE_ENV === 'test'` (vitest sets it) so the 87 legacy test sites and `console.warn`-spying tests don't break or spam before M3 lands. |
| Proxy safety | `$blac` is an **own data property** assigned in the constructor/field-initializer — `buildTrackedProxy` (blac-react) only intercepts *prototype getters* and invokes them with `thisProxy` as receiver. The meta object's own getters close over the real instance, never over `this`-receiver. **No ES `#private` fields anywhere** — they throw through the tracked proxy. |
| Meta identity & clobber guard | Meta object is allocated once, frozen, branded with a `META_BRAND` symbol. Dev-only check after `[INIT_CONFIG]`: warn if `this.$blac` is not the branded object (a subclass class-field `$blac = ...` would clobber the base's own property, because subclass fields initialize after `super()`). |
| Live values, not snapshots | `[INIT_CONFIG]` rewrites name/debug/id after construction; hydration status mutates. Meta properties are **getters delegating to the container's private `_` fields** (which all stay exactly where they are — this migration touches the public surface only). |
| DTO fields don't migrate | devtools-ui and most of devtools-connect read serialized `InstanceMetadata` DTOs whose *fields* happen to be named `instanceId`/`createdAt`. Those stay. Only reads off **live bloc instances** migrate. The extraction point is `PluginManager.getInstanceMetadata()` (M1). |
| Persist key stability | `IndexedDbPersistPlugin` builds storage keys from `instance.instanceId`. The migration must not change the **key format/value** — `$blac.id` returns the identical string. M2a verifies with the existing persisted-key tests. |
| Branch | All agents work on the **current branch**. No worktrees, no branching, no `git stash`. If `git status` is dirty at start (beyond other agents' in-flight owned files), stop and report. |
| Versioning | M5 is the breaking commit; major bump on `@blac/core` decided at ship time. No publish inside this plan. |

### `BlacMeta` shape (M0 implements; everyone else consumes)

```ts
export interface BlacHydration<S extends object> {
  readonly status: HydrationStatus;
  readonly error: Error | undefined;
  readonly isHydrated: boolean;
  readonly changedWhileHydrating: boolean;
  begin(): void;
  apply(next: S): boolean; // was applyHydratedState
  finish(): void;
  fail(error: Error): void;
  wait(): Promise<void>; // was waitForHydration
}

export interface BlacMeta<S extends object = any> {
  readonly name: string;
  readonly id: string; // was instanceId
  readonly debug: boolean;
  readonly createdAt: number;
  readonly disposed: boolean; // was isDisposed
  readonly dependencies: ReadonlyMap<StateContainerConstructor, string>;
  readonly hydration: BlacHydration<S>;
}
```

---

## Phase graph

```
              ┌────────────────────────────────────┐
              │ M0  $blac meta on StateContainer   │  (Wave 1 — sequential keystone)
              │ Opus 4.8 · high                    │
              └─────────────────┬──────────────────┘
                                │ M0 committed
   ┌───────┬─────────┬─────────┼─────────┬─────────┬─────────┐
   ▼       ▼         ▼         ▼         ▼         ▼         ▼
  M1      M2a       M2b       M2c       M2d       M3        M4      (Wave 2 — ALL parallel)
  core    persist   devtools- devtools- edge      core      apps+
  intern. plugin    connect   ui        pkgs      tests     docs
  Sonnet  Sonnet    Sonnet    Sonnet    Haiku     Sonnet    Sonnet
  · med   · low     · med     · low     · low     · med     · low
   └───────┴─────────┴─────────┴─────────┴─────────┴─────────┘
                                │ all Wave 2 committed
              ┌─────────────────▼──────────────────┐
              │ M5  legacy surface removal (BREAK) │  (Wave 3 — sequential)
              │ Sonnet 4.6 · medium                │
              └────────────────────────────────────┘
```

**Sequencing rules:**

- M0 must commit before any Wave 2 task starts.
- M1, M2a, M2b, M2c, M2d, M3, M4 are **all parallel-safe** (disjoint write sets; legacy getters keep every untouched package green).
- M5 starts only after every Wave 2 task has committed. It is the only breaking commit.

---

## Model & effort guide

Use the most capable model only where ambiguity is high; mechanical ports go to cheaper models. Effort is advisory (harness fast-mode vs default).

| Task | Model | Effort | Why |
| --- | --- | --- | --- |
| M0-core-meta | **Opus 4.8** | high | Keystone API design encoded in code: meta getters over privates, proxy-safety, deprecation plumbing, symbol `INIT_CONFIG`, clobber guard, size-limit. Everything downstream consumes its choices. |
| M1-core-internals-port | Sonnet 4.6 | medium | ~25 sites in registry/PluginManager/watch/testing; mostly mechanical but registry guard semantics and the DTO extraction point need care. |
| M2a-plugin-persist-port | Sonnet 4.6 | low | 2 live-read sites; the only risk is persisted-key stability, covered by existing tests. |
| M2b-devtools-connect-port | Sonnet 4.6 | medium | ~10 sites incl. replacing `(instance as Record<string, any>)` casts with typed `$blac` reads; hydration + time-travel paths. |
| M2c-devtools-ui-port | Sonnet 4.6 | low | Few live-instance sites (SearchBloc reads `instance.name`/`createdAt`); everything else is DTO (no change). |
| M2d-edge-packages-check | Haiku 4.5 | low | Verify logging-plugin/blac-compat need nothing; one-line `INIT_CONFIG` port in `blac-react/src/testing.ts`. Mostly read-only. |
| M3-core-tests-port | Sonnet 4.6 | medium | ~87 mechanical test-site renames, but `console.warn` spies and lifecycle assertions need judgment, not regex. |
| M4-apps-docs-sweep | Sonnet 4.6 | low | Examples (`CanvasCubit.isDisposed`, messenger `instanceId`, persist demo hydration), devtools-extension panel, web-docs prose/snippets. |
| M5-legacy-removal | Sonnet 4.6 | medium | Delete deprecated surface, repo-wide zero-ref verification, size-limit re-check, changeset note. Breaking but well-bounded. |

---

## File ownership matrix

Each task owns a disjoint write set within its wave. Parallel siblings never touch the same file.

| Task | Owned files (write set) |
| --- | --- |
| M0-core-meta | `packages/blac-core/src/core/StateContainer.ts`, `core/meta.ts` (new), `core/symbols.ts`, `core/__tests__/StateContainer.meta.test.ts` (new), `src/index.ts` (barrel), `package.json`/size-limit config (budget bump only if needed) |
| M1-core-internals-port | `packages/blac-core/src/core/StateContainerRegistry.ts`, `src/plugin/PluginManager.ts`, `src/watch/**`, `src/testing.ts`, `src/registry/**`, `src/decorators/**` (if hits) |
| M2a-plugin-persist-port | `packages/plugin-persist/src/**` |
| M2b-devtools-connect-port | `packages/devtools-connect/src/**` |
| M2c-devtools-ui-port | `packages/devtools-ui/src/**` |
| M2d-edge-packages-check | `packages/blac-react/src/testing.ts`, `packages/logging-plugin/src/**` (expected: no changes) — blac-compat is read-only smoke |
| M3-core-tests-port | `packages/blac-core/src/**/*.test.ts`, `packages/blac-core/src/__tests__/**` (except M0's new meta test), `packages/blac-react/src/**/*.test.ts*` |
| M4-apps-docs-sweep | `apps/examples/src/**`, `apps/devtools-extension/src/**`, `apps/perf/src/**` (if hits), `apps/web-docs/src/content/**` |
| M5-legacy-removal | `packages/blac-core/src/core/StateContainer.ts`, `core/symbols.ts` (remove legacy `initConfig` delegate), any straggler call sites found by the zero-ref sweep |

---

## Driving an agent

For each task, spawn an agent with the literal task file contents as its prompt:

```ts
Agent({
  subagent_type: "general-purpose", // or "quick-build" for low-effort mechanical ports
  model: "opus" | "sonnet" | "haiku", // from the model guide above
  description: "blac-meta: M2a plugin-persist port",
  prompt: <contents of plans/blac-meta-namespace/M2a-plugin-persist-port.md>,
})
```

Every task file contains: goal + acceptance criteria, inputs to read first, **owned files** (exclusive write set), **do-not-touch list**, the concrete check → implement → verify → test → commit cycle, the commit message, and pitfalls.

**Agent ground rules (apply to every task; repeated in each file):**

- Work on the current branch. **No worktrees. No new branches. No `git stash`. No `--no-verify` / hook-skipping flags.**
- Commit format `<type>(<scope>): <subject>` (imperative, ≤50 chars). **No co-author trailer.**
- Targeted validation only: run `typecheck` / `lint` / `format:check` / `test` **from the owned package's directory** (`vp run <script>`), never repo-wide.
- `vp run format:check` is part of the verify step in every task (oxfmt drift is not caught by lint).
- Test files import from `'vite-plus/test'` — bare vitest globals fail `vp run lint`.
- Commit **only files inside the owned write set** (`git add <explicit paths>`). If a needed change falls outside the write set, stop and report instead of editing.
- If `git status` shows dirt inside your write set at start, stop and report.

---

## Acceptance criteria for the plan as a whole

- [ ] `StateContainer` exposes `readonly $blac: BlacMeta<S>`; `BlacMeta`/`BlacHydration` exported from `@blac/core`.
- [ ] After M5: no `instanceId` / `isDisposed` / `hydrationStatus` / `createdAt` / `initConfig` / instance-`name`/`debug` member remains on `StateContainer`; the only reserved instance names are `$blac` + the intentional API (`state`, `emit`, `patch`, `update`, `args`, `deps`, `depend`, `subscribe`, `dispose`, `onSystemEvent`, `channel`).
- [ ] `vp run typecheck`, `lint`, `format:check`, `test`, `build` pass in every modified package; `vp run size` within budget for `@blac/core`.
- [ ] Persisted IndexedDB key format byte-identical before/after (M2a test evidence).
- [ ] DevTools extension panel still lists live blocs with name/id/createdAt/disposed (M2b/M4 verify).
- [ ] `@blac/compat` tests pass without source edits (M2d smoke; if they fail, escalate as a fresh task).
- [ ] A subclass declaring `name` / `debug` / `deps`-adjacent members no longer collides after M5; dev warning fires if a subclass clobbers `$blac` itself.

---

## Risk register

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Tracked-proxy regression (getter receiver) from converting own fields → prototype getters | medium | M0 pins behavior with a proxy-focused test (legacy getter + `$blac` read through `buildTrackedProxy`); blac-react tests in M3 re-verify. |
| Deprecation warn-once breaks `console.warn`-spying tests | medium | Warnings suppressed under `NODE_ENV === 'test'` (locked decision). |
| Persist storage keys change → user data "loss" | low | `$blac.id` returns the same string; M2a asserts key equality against a fixture. |
| size-limit (core 6.88 kB) exceeded by dual surface | medium | M0 may bump budget ≤ +0.3 kB with a comment; M5 re-checks and restores/lowers. |
| Subclass class-field `$blac` clobbers base meta | low | Dev-only brand check after `[INIT_CONFIG]` warns loudly. |
| devtools-connect time-travel uses `instanceId` string matching | medium | M2b keeps DTO field names unchanged; only live-instance reads move. |
| Stragglers found at M5 (new code merged during waves) | medium | M5 runs a repo-wide `rg` zero-ref sweep before deleting; ports stragglers itself if trivial, else reports. |

---

## Status board (update as tasks land)

- [x] M0 — `$blac` meta + legacy delegates on `StateContainer` (`293f6d53`)
- [x] M1 — blac-core internals ported (registry, PluginManager, watch, testing) (`9735da94`)
- [x] M2a — plugin-persist ported (`9b34547c`)
- [x] M2b — devtools-connect ported (`a89a3989`; also fixed enumerateGetters BASE_GETTERS for M0's field→getter conversion)
- [x] M2c — devtools-ui ported (`c44f18c2`; one live read in DraggableOverlay, rest DTO)
- [x] M2d — edge packages checked (`4bf0f514`; real initConfig call was in blac-core/src/testing.ts, not blac-react — react file only had a comment; logging-plugin all-DTO no-op; compat 24/24 pass)
- [x] M3 — core + react tests ported off legacy names (`4c47f774`; +legacy-deprecation.test.ts pin file, M5-disposable)
- [x] M4 — apps + web-docs swept (`a1205da7`, `411e4644`)
- [x] M5 — legacy surface removed (breaking) (`a98329a0`; compat green without edits; size 7.57 kB, budget lowered 8 → 7.8 kB; changeset `.changeset/remove-legacy-identity-surface.md`)
