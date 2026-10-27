# DevTools diagnostics: consumers, refs, tracking, renders, issues

Status: **design / not started** (2026-10-27, fact-checked against source)

Goal: dev-only insight into who uses each bloc, what they track, why they
re-render, and automatic detection of common misuse — surfaced in devtools.
Hard constraints: observation never changes runtime behaviour; production
builds contain none of it.

## Findings (current state)

- `IS_DEV` (`blac-core/src/constants.ts:55`) is a module-level const computed
  once from `readNodeEnv()` (`process.env.NODE_ENV` inside try/catch). Dev
  branches **ship in prod bundles**. Verified: bundling `dist/index.js` with
  esbuild `--minify --define:process.env.NODE_ENV="production"` folds the read
  to `"production"` but keeps `IS_DEV` as a runtime variable and every
  `if (IS_DEV)` branch. The same check written inline at the call site
  (`typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'`)
  is removed entirely.
- Core emits `refAcquired` (on every acquire, not only the first) and
  `refReleased`/`depsChanged`. `PluginManager` forwards them to the
  `@internal` hooks `onRefAcquired`/`onRefReleased`/`onDepsChanged`, but
  `DevToolsAgent` doesn't implement them. Protocol v1 only covers instances and
  state history. `PluginManager` already wraps plugin hook calls in try/catch.
- Ref ids identify who holds the ref: `useBloc@useBloc-N` (component),
  `useBloc@useBloc-N:dep` (a dependency reached through `.track()`), and for
  manual `acquire` either `_auto_N` or a caller-chosen id. `borrow` takes no
  ref (`countRef: false`).
- Per-consumer path interest already exists in core
  (`registerConsumerPaths(consumerId, paths)`), keyed by `useBloc-N`.
- The React consumer (`useBloc.ts` `Consumer`) holds mode, `paths`, the
  `DepSession`, `primaryRefId`, `version`/`bump` and `rebindNonce`. It has no
  component name.
- The tracking package already has a trace hook, `__setTrackTrace` (exported
  from `@dirtytalk/structural`), that reports every record/pin/`ownKeys`
  decision and every `pass-through` (a proxy read after `disarm`). It is
  documented as test-only, costs one null check when unset, and nothing in
  blac uses it yet.
- React 19 exports `captureOwnerStack()`. It works in dev only, returns
  `null` in prod, and doesn't exist in React 18.
- Existing dev warnings are console-only: emit rate, args mismatch,
  emit/patch after dispose, deps collision, changed-while-hydrating. Only the
  emit-rate warning fires once per instance; the others repeat.
- `maxInstancesPerType` (default 100000) **throws** when exceeded; it does
  not warn.

## Design

### 1. Zero prod cost

- Replace `IS_DEV` with a build-time `__DEV__`. At pack time, tsdown replaces
  it with the inline expression
  `(typeof process !== 'undefined' && process.env.NODE_ENV !== 'production')`.
  The dist stays a single build, and every bundler that defines
  `process.env.NODE_ENV` (Vite, webpack, esbuild, Next) removes the dev
  branches in production builds.
  - Keep the literal `process.env.NODE_ENV` spelling (no `?.`), or bundler
    defines won't match it.
  - One behaviour change from today: a `process` shim without `NODE_ENV` now
    counts as dev. Unbundled Node (SSR, tests) evaluates the expression at
    each call site instead of once at load.
- Fallback if that per-call-site check shows in benchmarks: two builds
  selected through `development`/`default` export conditions. Two caveats:
  - Only Vite and webpack set `development` automatically. esbuild, rollup,
    Node and Jest need it configured, or users silently lose dev warnings.
  - It risks loading two copies of core (one dev, one prod) side by side.
- All diagnostic logic lives outside core/react. Core and react only have
  emission points, `if (__DEV__) diag?.event(...)`. `diag` is a single
  module-level slot set through `setDiagnostics()` in `@blac/core/internal`.
- CI guard: bundle each entry with esbuild `--minify` and a production define,
  and fail if a marker string (e.g. `__blacDiag`) appears. `size-limit` must
  not grow.

### 2. Non-interference rules (collector)

- Never acquire, release, subscribe, emit, or read through tracking proxies.
  Read the raw `container.state` and decode path ids with
  `container.interner.lookup`. Don't use `borrow` either: it takes no ref but
  can throw.
- Hold containers only in `WeakMap`s or by id, and keep history in bounded
  ring buffers.
- Plugin hooks are already guarded by `PluginManager`. The `diag` slot needs
  its own try/catch: a detector that throws disables itself and never reaches
  user code.
- Defer analysis (batched / `requestIdleCallback`), keeping it out of the emit
  and render path. Emission points only push small records, and only when
  `diag` is set.
- Verification:
  - Run the blac-core and blac-react suites with the collector installed (an
    extra vitest project); the results must be identical.
  - Run the perf bench in dev with and without the collector to get the
    overhead number.

### 3. Data collected

| Entity               | Fields                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Instance             | refs with counts, grouped by kind (component, dependency, manual), active/keepAlive, deps-lane owners, emit rate                           |
| Consumer (`useBloc`) | component name, instance, mode (track/select), tracked paths, dependency containers + their paths, ref ids                                 |
| Render               | consumer and cause: `emit(instance, paths, version)` / `dep-emit` / `rebind` / `commit-catchup` / `parent` (no bump since the last render) |

Render causes are recorded where each bump happens: the subscription notify
(`emit`), the `DepSession` notify (`dep-emit`), the rebind
(`rebindNonce++`), and the commit check `state !== renderedState`
(`commit-catchup`).

Component name: use `captureOwnerStack()` on React 19, otherwise fall back to
a dev-only `new Error().stack`, taking the first frame outside blac. Capture
it once per consumer mount. A `debugName` option overrides both.

### 4. Detectors (initial set)

| Code                | Signal                                                                                                                                                                | Hint                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `over-subscribed`   | track-mode interest contains the root id (`interner.rootId()`), pinned by spreading, `Object.keys` or `JSON.stringify` of the whole state, so every change re-renders | read leaves; pass the bloc               |
| `unstable-select`   | select mode bumps but the new selection deep-equals the old one                                                                                                       | return primitives / memoize              |
| `render-storm`      | consumer renders > N/s                                                                                                                                                | link to the emits that caused them       |
| `unstable-args`     | a consumer's instance key changes between renders; create→dispose < X ms                                                                                              | stable args / `static key`               |
| `instance-churn`    | per-type create+dispose rate > N/s (also catches non-React churn)                                                                                                     | —                                        |
| `in-place-mutation` | `emit(next)` where `next === state`, skipped by `Object.is` (`StateContainer.ts:641`); needs an emission point at the skip                                            | don't mutate state                       |
| `escaped-proxy`     | `pass-through` trace events: a tracked proxy read after its render was frozen                                                                                         | unwrap with `raw()` / read during render |
| `ref-leak`          | a `useBloc@…` ref still held a grace period after its consumer unmounted (allows for StrictMode remounts). Manual refs only appear in the Refs tab.                   | missing `release`                        |
| `deps-churn`        | `useBlocDeps` slice changes every commit (new function identity)                                                                                                      | `useCallback`                            |
| `dep-cycle`         | cycle in the dependency graph                                                                                                                                         | —                                        |
| existing warnings   | emit-rate, args-mismatch, emit-after-dispose, deps collision, hydration                                                                                               | move into issues                         |

Not included: `emit-in-render`. React has no render-end hook, and tracking
sessions disarm only at layout commit, so render-phase emits can't be
reliably told apart from emits in layout effects. React's own dev warning
covers updating another component during render.

Issues are deduplicated by `(code, instance, consumer)` and keep a count plus
first/last seen times. Each is also `console.warn`ed once, so they help
without devtools open.

### 5. DevTools exposure

- Protocol v2 (the agent still sends nothing until `hello`): `consumers`,
  `refs`, `render` (streamed only for the watched instance) and `issue`.
  Detectors run in the page against all renders, so filtering the stream
  doesn't hide issues. The panel requires an exact protocol version match, so
  agent and UI ship together.
- Inspector tabs:
  - **State**: path heat — how many consumers track each path.
    Changed-but-untracked paths are dimmed; they come from a prev/next diff,
    because core reports `ALL_PATHS` while no path-scoped consumer exists.
  - **History**: adds which consumers each change re-rendered.
  - **Consumers**: component, mode, tracked paths via `PathChips`, last render
    causes.
  - **Refs**.
- Global **Issues** panel with a badge, grouped by code, with click-through to
  the instance or consumer.
- Later: dependency graph (components ↔ instances ↔ dependencies).

## Phases

1. [ ] Build plumbing: `__DEV__` replaced by the inline expression at pack
       time, migrate the `IS_DEV` sites, add the esbuild prod-bundle marker check.
2. [ ] Agent implements the existing ref/deps hooks to build the Refs tab (no
       core change).
3. [ ] Diagnostics slot + React emission points, to build the Consumers tab
       and render causes.
4. [ ] Detectors (including the `__setTrackTrace` subscriber) + Issues panel;
       migrate the existing warnings.
5. [ ] Path heat + dependency graph.

## Open questions

- Is the per-call-site `process.env` read in unbundled Node acceptable, or
  should we add the dual-build fallback (§1)?
- Collector home: inside `devtools-connect`, or a new `@blac/diagnostics`
  usable from tests/CLI without the agent?
- `__setTrackTrace` fires on every recording decision. Should
  `escaped-proxy` detection be opt-in?
- Not yet verified: whether rolldown (Vite 8) and webpack minify the inline
  expression as well as esbuild. Check this in phase 1.
