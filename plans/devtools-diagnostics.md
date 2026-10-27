# DevTools diagnostics: consumers, refs, tracking, renders, issues

Status: **design / not started** (2026-10-27)

Goal: dev-only insight into who uses each bloc, what they track, why they
re-render, and automatic detection of common misuse — surfaced in devtools.
Hard constraints: observation never changes runtime behaviour; production
builds contain none of it.

## Findings (current state)

- `IS_DEV` (`blac-core/src/constants.ts`) is computed at module load through
  `readNodeEnv()` (function + try/catch). In `dist/` it stays a runtime
  boolean, so dev branches **ship in prod bundles** as dead-but-present code;
  minifiers can't fold through the call. Fine for a few warns, not for a
  diagnostics layer.
- Core already emits `refAcquired`/`refReleased`/deps events and
  `BlacPlugin` has `onRefAcquired`/`onRefReleased`/`onDepsChanged`, but
  `DevToolsAgent` ignores them. Protocol v1 only has instances + state history.
- Per-consumer path interest already exists in core
  (`registerConsumerPaths(consumerId, paths)`), keyed by `useBloc-N`.
- React consumer (`useBloc.ts` `Consumer`) holds everything needed: mode,
  `paths`, `DepSession` entries, `primaryRefId`, `version`. No component name.
- Existing dev warns (emit rate, args mismatch, dispose-mutation, deps
  collision, changed-while-hydrating) are console-only and one-shot.

## Design

### 1. Zero prod cost

- Replace `IS_DEV` with a compile-time `__DEV__` and ship two builds per
  entry via conditional exports:
  `"development": ./dist/index.dev.js`, `"production"`/`"default"`:
  `./dist/index.js` (`__DEV__=false`, DCE'd). Vite, webpack 5, esbuild,
  rolldown resolve these conditions. Default = prod, so unknown envs stay safe
  (matches today's "unknown ⇒ prod" rule). No `process` access needed.
- All diagnostic logic lives outside core/react. Core/react only have
  emission points: `if (__DEV__) diag?.event(...)`, where `diag` is a single
  module-level slot set via `@blac/core/internal` `setDiagnostics()`.
- CI guard: grep prod dist for a marker string (e.g. `__blacDiag`) → fail;
  `size` must not move.

### 2. Non-interference rules (collector)

- Never acquire/release/borrow, subscribe, emit, or read through tracking
  proxies; read raw `container.state` and decode path ids via `interner`.
- Hold containers in `WeakMap`s / by id only; bounded ring buffers.
- Every hook call wrapped in try/catch; a failing detector disables itself.
- Analysis deferred (`requestIdleCallback`/batched), not in the emit/render
  path; emission points only push small records when `diag` is set.
- Verification: run blac-core + blac-react suites with the collector
  installed (extra vitest project); results must be identical. Perf bench
  dev-with/without for the overhead number.

### 3. Data collected

| Entity | Fields |
| --- | --- |
| Instance | refs by refId + kind (`useBloc`, `dep`, `borrow`, manual), active/keepAlive, deps-lane owners, emit rate |
| Consumer (`useBloc`) | component name, instance, mode (track/select), tracked paths, dep containers + their paths, ref ids |
| Render | consumer, cause: `emit(instance, paths, version)` / `dep-emit` / `rebind` / `commit-catchup` / `parent` (no bump since last render) |

Component name: capture `new Error().stack` once per consumer mount (dev
only) and take the first non-blac frame; optional `debugName` override
option. (React has no public owner API.)

### 4. Detectors (initial set)

| Code | Signal | Hint |
| --- | --- | --- |
| `over-subscribed` | consumer interest = root/`ALL_PATHS` in track mode (spread, `JSON.stringify`, passing whole state down) | read leaves; pass the bloc |
| `unstable-select` | select mode bumps but new selection deep-equals old | return primitives / memoize |
| `render-storm` | consumer renders > N/s | link to causing emits |
| `emit-in-render` | emit while any consumer is mid-render | move to effect/handler |
| `unstable-args` | consumer's instance key churns across renders; create→dispose < X ms | stable args / `static key` |
| `ref-leak` | refs remaining for a consumer id after unmount; refs with no live subscriber | missing `release` |
| `instance-churn` | per-type creates approaching `maxInstancesPerType` | — |
| `in-place-mutation` | emit skipped by equality but a stored shallow snapshot differs | don't mutate state |
| `deps-churn` | `useBlocDeps` slice changes every commit (new fn identity) | `useCallback` |
| `dep-cycle` | cycle in dep graph | — |
| existing warns | emit-rate, args-mismatch, emit-after-dispose, deps collision, hydration | migrate into issues |

Issues are deduped by `(code, instance, consumer)` with count + first/last
seen; also `console.warn`ed once each so they help without devtools.

### 5. DevTools exposure

- Protocol v2 (agent still sends nothing until `hello`): `consumers`,
  `refs`, `render` (streamed only for the watched instance), `issue`.
- Inspector tabs: **State** (path heat: how many consumers track each path;
  changed-but-untracked paths dimmed) · **History** (+ which consumers each
  change re-rendered) · **Consumers** (component, mode, tracked paths via
  `PathChips`, last render causes) · **Refs**.
- Global **Issues** panel with badge, grouped by code, click-through to
  instance/consumer.
- Later: dependency graph (components ↔ instances ↔ deps).

## Phases

1. [ ] Build plumbing: `__DEV__`, dual builds, conditional exports, prod
   marker check. Migrate `IS_DEV` sites.
2. [ ] Agent consumes existing ref/deps hooks → Refs tab (no core change).
3. [ ] Diagnostics slot + React emission points → Consumers tab, render causes.
4. [ ] Detectors + Issues panel; migrate existing warns.
5. [ ] Path heat + dependency graph.

## Open questions

- Dual builds + conditional exports vs. keeping runtime `IS_DEV` (simpler,
  but code ships to prod).
- Collector home: inside `devtools-connect` vs. new `@blac/diagnostics`
  (usable from tests/CLI without the agent).
- Stack-parsed component names vs. requiring `debugName`.
