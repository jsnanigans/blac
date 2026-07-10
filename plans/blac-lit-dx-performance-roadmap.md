# `@blac/lit` DX and performance roadmap

Date: 2026-07-10

Scope: `packages/blac-lit` and `apps/lit-demo`, with the minimum supporting
changes needed to honor existing `@blac/core`/Dirtytalk contracts. This plan
synthesizes the three static reviews in `reports/`; no tests, builds, type
checks, servers, or benchmarks were run.

## Executive diagnosis

The architecture is sound: a component body establishes ownership and static
DOM once, while Blac-owned bindings update individual Lit parts. This matches
Blac's strongest capability: tracked leaf paths feed a source-side observed
skeleton, and numeric dirty paths wake only intersecting consumers.

The adapter currently implements only the subscription half of that protocol.
It tracks paths and subscribes with them, but never registers them with the
source skeleton (`packages/blac-lit/src/live.ts:42-58`,
`packages/blac-lit/src/forms.ts:50-78`). With zero registered consumers,
`StructuralContainer.emit`/`patch` deliberately produce `ALL_PATHS`
(`packages/dirtytalk-structural/src/container.ts:164-199`, `:215-246`). The
result is visually fine-grained DOM output after Lit rejects equal values, but
nearly every binding can still recompute. This is the highest-confidence
runtime explanation for poor sparse-update behavior in the screenshot.

The screenshot is not a framework benchmark. Its timer includes application
data generation, Blac scheduling, selector work, Lit work, observer/HUD work,
frame wait, layout, and paint (`apps/lit-demo/src/benchmark/timing.ts:1-20`).
The displayed patch count sees only MutationObserver records inside label
cells, not row moves, row classes, removals, or property writes
(`apps/lit-demo/src/benchmark/benchmark.ui.ts:48-62`,
`apps/lit-demo/src/dev/pulse.ts:39-56`). Absolute milliseconds and the relative
cost of each subsystem remain unmeasured.

### Confirmed defects

| Area | Evidence | Consequence |
| --- | --- | --- |
| Component identity | `ComponentDirective.render` returns the first result after `started` without checking factory, key, or args (`component.ts:57-64`) | A stable Lit expression can show the wrong component; the router works around it in `apps/lit-demo/src/app.ts:21-38`. |
| Reconnection/ownership | Disconnect releases refs; reconnect discards reacquired instances and does not rebuild (`component.ts:108-130`) | Existing handlers/bindings can retain a disposed instance. Mount resources/effects are not restarted. |
| Effects | `ctx.effect` casts an instance into constructor/ref-only `watch` (`component.ts:72-74`; `packages/blac-core/src/watch/watch.ts:76-135`) | Advertised API is expected to fail at runtime. |
| Cleanup | Lifecycle loops stop on the first throw; acquisition/render is not transactional (`component.ts:62-85`, `:123-130`) | Refs and later cleanups can leak; partial initialization can remain armed. |
| Binding source changes | `BindDirective` and `ModelDirective` overwrite the source but retain the old subscription (`live.ts:33-39`; `forms.ts:30-46`) | Values compute from the new bloc once, then updates arrive from the old bloc. |
| Tracking cleanup | Both tracked reads queue `disarm` only after a successful read (`live.ts:42-51`; `forms.ts:50-59`) | A throwing selector can leave tracking armed; every Lit read can disarm synchronously in `finally`. |
| Path routing | Bind/model never call `registerConsumerPaths` or `unregisterConsumer` (`live.ts:54-67`; `forms.ts:74-95`; `internal/track.ts:15-25`) | The source emits `ALL_PATHS`; sparse fanout is defeated. |
| Cross-bloc getters | Lit leaves branded `depend().track()` handles unchanged (`internal/track.ts:81-95`) | Reads work, but changes in the dependency do not wake the Lit binding despite the design claim. |
| Types/DX | Bound handles, `select`, and `reactive` erase state/bloc types; `ctx.use` returns a raw instance (`component.ts:18-41`, `:142-150`; `live.ts:14-23`, `:96-115`) | The demo repeats annotations and cannot use `$` after `ctx.use`. |
| Forms | `model` attaches both `input` and `change`, casts every element, and accepts `any` (`forms.ts:15-24`, `:30-44`, `:100-102`) | Common controls can write twice; unsupported values fail unclearly. |
| Demo correctness | Unknown row ID uses `findIndex === -1` without a guard (`benchmark.bloc.ts:46-53`) | It duplicates most of the data and introduces duplicate Lit keys. |
| Benchmark instrumentation | One observer per row, synchronous HUD writes per count, animations, and an FPS rAF all run with the sample (`pulse.ts:22-77`; `devStats.ts:9-20`; `hud.ui.ts:15-47`) | Large fixed overhead and variance are included in the reported duration. |

### Suspected or unquantified

- The fraction of the screenshot caused by all-binding recomputation versus
  per-row components, instrumentation, Lit reconciliation, GC, table layout,
  and paint. All exist; their shares require a production browser trace.
- The value of a per-container subscription hub. DirtyChannel still scans one
  subscriber per DOM hole after routing is fixed, but the crossover point and
  savings are not measured (`packages/dirtytalk-engine/src/dirty-channel.ts:88-141`).
- The size of the `$` static-path fast-path win. It removes known allocations
  and tracking work, but should be benchmarked after correctness/routing.
- The exact benefit of borrowed row ownership, table CSS changes, containment,
  or a different DOM shape. These are plausible and browser-dependent.

## Target mental model and public API

Keep the vocabulary small. Do not introduce a Lit-specific state system.

1. `component` owns Blac instances and executes once per **connected instance
   lifetime**. It can execute again when identity changes or a disconnected
   last-owned instance was disposed and recreated.
2. A `BlocView<T>` is the one shape returned by both a bound `component` and
   `ctx.use(T)`: normal actions/getters, one-shot `.state`, and reactive `.$`.
3. `view.$.path` is the cheap common case for a static state path. `select(view,
   fn)` is the explicit escape hatch for getters, dynamic paths, and composed
   reads. Both produce a renderable `Binding<T>`.
4. Components own lifecycle; bindings own their subscriptions and registered
   paths. Cleanup is colocated with setup.
5. `each` is honest keyed Lit reconciliation, not a promise of per-row state
   isolation. Normalize state or add row bindings when sparse row work matters.
6. Lit remains Lit: use official Lit directives directly when no Blac-aware
   behavior is needed.

Target authoring shape:

```ts
const Price = component(PriceBloc, (price, ctx) => {
  const currency = ctx.use(CurrencyBloc); // same BlocView shape

  ctx.onMount(() => {
    price.start();
    return () => price.stop();
  });

  ctx.effect(price.$.value, (value) => {
    analytics.record(value);
  });

  return html`
    <output>${derive(price.$.value, formatPrice)}</output>
    <span>${currency.$.symbol}</span>
  `;
});
```

```ts
export type BlocView<T extends StateContainerConstructor> =
  InstanceReadonlyState<T> & {
    readonly $: ReactiveState<ExtractState<T>>;
  };

select(price, (state, bloc) => bloc.formattedValue);
// state and bloc are inferred; no `PriceState` annotation.
```

Lifecycle/effect invariants:

- `onMount(setup)` runs once per connection and may return cleanup. Cleanup
  runs at most once for that connection, while owned blocs are still alive.
- All user cleanups run even if one throws; subscriptions/effects then stop;
  refs release in `finally`; errors are aggregated/reported afterward.
- `effect(binding, fn)` runs with the current value on connection, reruns only
  when that binding wakes, runs the prior returned cleanup before rerun, and
  cleans up on disconnect. Keep coarse `effect(bloc, fn)` temporarily for
  compatibility, implemented directly against the acquired instance and
  documented as coarse.

Component identity recommendation:

- Every `component()` factory gets a stable definition token.
- Bound identity is definition token + resolved Blac instance key. Pure
  identity is definition token + a structural props key.
- An identity change transactionally cleans up and remounts.
- In the compatibility release, warn when same-identity construction args are
  observably different. In the next major, make the rule explicit: construction
  args/props changes change identity and remount. Do not silently keep old args.

Before/after:

```ts
// Before: distinct wrappers are needed to prevent stale routing.
match(route, {
  home: () => html`<div>${Home()}</div>`,
  settings: () => html`<section>${Settings()}</section>`,
});

// After: factory identity is sufficient.
match(route, { home: () => Home(), settings: () => Settings() });
```

```ts
// Before
const market = ctx.use(MarketBloc);
select(market, (s: MarketState) => s.ratePerSec);

// After
const market = ctx.use(MarketBloc);
market.$.ratePerSec;
select(market, (_state, bloc) => bloc.formattedRate);
```

## Phase P0 — correctness and lifecycle

P0 is a release gate. No benchmark work should normalize known stale UI,
disposed-instance use, or leaks.

### P0.1 Component identity and transactional lifecycle

Files/symbols:

- `packages/blac-lit/src/component.ts`: `ComponentDirective`, `component`,
  `ComponentFactory`, `Ctx`, `makeHandle`, `acquire`.
- `apps/lit-demo/src/app.ts`: remove route template-identity workaround after
  the adapter fix.
- `apps/lit-demo/src/market/market.ui.ts` and `src/dev/hud.ui.ts`: migrate paired
  mount/unmount setup to returned cleanup.
- Add focused coverage under `packages/blac-lit/src/component.test.ts`.

Implementation:

1. Pass a factory definition token into `componentDirective`; compare token and
   resolved identity on every `render` call.
2. Replace `started` with explicit initialize/teardown/connection state. Record
   the acquired instance alongside `{Bloc,key,refId,args}`.
3. If definition/key changes, tear down the old identity completely, acquire,
   execute the new body, and replace the Lit value. If initialization throws,
   roll back all acquisitions made during that attempt.
4. On reconnect, reacquire each ref and compare object identity. Reuse the DOM
   only if all instances are identical; otherwise rebuild the body and call
   `setValue` with bindings/handlers closed over the new instances.
5. Retain mount setup functions, not only pending callbacks. Store returned
   cleanup per connection. Keep `onUnmount` as deprecated compatibility sugar
   through the next major.
6. Cache `ctx.use` acquisitions/views by resolved `{Bloc,key}` within a
   component. A repeated use returns the same view and does not increment refs.

Invariants:

- Every successful counted acquire has exactly one release.
- A rendered handler/binding never closes over a disposed bloc.
- Different component factories at one Lit part never reuse the first result.
- One throwing cleanup cannot prevent later cleanup or ref release.

Compatibility: identity/reconnect/rollback are bug fixes. Returned cleanup is
additive. Re-executing after a recreated instance is intentional and should be
documented as “once per connected instance lifetime.” Removing `onUnmount` is
major-only.

### P0.2 Repair current `effect`, binding/model reuse, and error paths

Files/symbols:

- `packages/blac-lit/src/component.ts`: `Ctx.effect`, component cleanup.
- `packages/blac-lit/src/live.ts`: `BindDirective.render/compute/subscribe`.
- `packages/blac-lit/src/forms.ts`: `ModelDirective.update/readValue/subscribe`.
- `packages/blac-lit/src/internal/track.ts`: make the required lifecycle
  surface explicit, including `unregisterConsumer` for P1.

Implementation:

- Implement existing coarse `effect(bloc, fn)` against the supplied instance's
  channel with `ALL_PATHS`; run once initially and recreate it per connection.
  Remove the invalid `watch(bloc as any, ...)` path.
- Track the subscribed source separately. If a Lit directive receives another
  bloc/binding, unsubscribe and detach from the old source before computing and
  subscribing to the new one.
- Wrap selector/model reads in `try/finally` and disarm synchronously. A Lit
  directive owns the complete synchronous read, unlike React JSX tracking,
  which must remain armed until commit.
- On reconnect, recompute before subscribing so paths and displayed value use
  current state. Do not blindly reuse old interest.

Compatibility: bug fixes only. The precise coarse effect timing should be
documented because the previous implementation was unusable.

### P0.3 Cross-bloc dependency correctness

Files/symbols:

- `packages/blac-lit/src/internal/track.ts`: `trackedBloc`; add a
  multi-container tracking session.
- `packages/blac-react/src/buildTrackedProxy.ts:28-88` and
  `packages/blac-react/src/useBloc.ts:577-640`: protocol reference, not a
  dependency from Lit.
- `packages/blac-lit/DESIGN.md`: remove the claim until implementation lands,
  then document exact `.track()` ownership.

Implementation:

- Detect `DEP_BRAND` when a getter reads a dependency handle. Replace `.track()`
  with a per-binding wrapper that tracks the resolved dependency's state.
- One compute returns a session keyed by container. Reconcile added, surviving,
  and dropped dependency containers; pair ownership, subscriptions, registered
  paths, and releases for each.
- `.untracked()` remains imperative and creates no reactive interest.
- Prefer extracting the proven React proxy/session mechanics into a
  framework-neutral internal helper only if that can be done without changing
  React behavior. Otherwise port the protocol into Lit first and deduplicate in
  a later refactor.

Invariant: a dependency-only change wakes the binding exactly once, and dropping
the getter branch removes both interest and ownership.

Compatibility: fulfills an advertised behavior. No new public vocabulary.

### P0.4 Forms, mount ownership, and demo data guard

Files/symbols:

- `packages/blac-lit/src/forms.ts`: listener selection, placement validation,
  element changes, reconnect idempotence.
- `packages/blac-lit/src/mount.ts`: `mount`, `MountHandle`.
- `apps/lit-demo/src/benchmark/benchmark.bloc.ts`: `BenchmarkBloc.remove`.

Implementation:

- Use one default event per supported element kind; do not attach both `input`
  and `change` for the same default write. Validate `ElementPart` placement and
  supported controls in development. Keep current string/checkbox conversion
  for compatibility until typed parsing lands in P2.
- Give each root mount a generation/owner token. `unmount()` is idempotent and a
  stale handle cannot clear a newer render. Forward typed Lit render options.
- Return early for `remove(id)` when `findIndex` is negative and show an invalid
  ID result in the demo rather than corrupting state.

## Phase P1 — path routing and measured runtime improvements

### P1.1 Complete Blac's two-sided consumer protocol

Files/symbols:

- Add `packages/blac-lit/src/internal/binding-session.ts` (or equivalently one
  shared internal primitive) for tracked compute/reconcile/disconnect.
- `packages/blac-lit/src/live.ts`: make `BindDirective` delegate to it.
- `packages/blac-lit/src/forms.ts`: make `ModelDirective` use the same primitive.
- `packages/blac-lit/src/internal/track.ts`: require
  `registerConsumerPaths(id, paths)` and `unregisterConsumer(id)`.

Protocol:

1. Give each directive/session a stable consumer ID.
2. Track **normal leaf paths** during the read.
3. Register those unexpanded leaves with `registerConsumerPaths`; they define
   the source diff skeleton.
4. Separately expand leaves with ancestor-watch IDs and use that expanded set
   only as the channel subscription interest.
5. Re-register when dynamic reads change; unregister on source replacement and
   disconnect. Recompute/register/subscribe on reconnect.
6. Handle a state-advance gap between read and subscribe by comparing the state
   snapshot and recomputing once if needed.

This leaf/expanded separation is not optional: the established React adapter
registers leaves at `packages/blac-react/src/useBloc.ts:369-385` and `:577-585`,
then expands only subscription interest. Registering ancestor-watch IDs into
the skeleton would mix source-diff and wakeup vocabularies.

Expected impact: **very high**, high confidence, for sparse update/select/swap
and the live market. It should reduce selector callbacks from “nearly every
binding” to intersecting bindings. It is not expected to make initial creation
cheap because every requested DOM node/binding still has to be built.

Measure without timing bias: use deterministic unit/integration callback
counters to prove routing first. For 1,000 normalized rows, assert the number
of selector computes for update-100/swap/select; do not put observer/HUD work in
that proof. Then profile production browser samples per P3.

### P1.2 Static `$` path fast path

Files/symbols:

- `packages/blac-lit/src/live.ts`: `reactive`, `makeBinding`, binding internals,
  `BindDirective.compute`.
- `packages/blac-lit/src/internal/track.ts`: path/interner helpers.

Represent bindings internally as either:

- static path: bloc + interned leaf path + raw path reader; or
- tracked selector: bloc + read callback + tracking session.

For `bloc.$.a.b`, intern/register the known leaf, precompute expanded channel
interest, and read the raw path directly. Do not allocate a tracking proxy,
tracked bloc proxy, or disarm microtask per compute. Keep `select` dynamic and
getter-aware.

Expected impact: **medium**, medium-high confidence for binding-heavy tables;
exact time is unknown. Validate semantic parity for null branches, arrays,
atomic parent replacement, and state-key collisions before comparing allocation
profiles and selector throughput.

### P1.3 Fix demo state shape to demonstrate sparse identity

Files/symbols:

- `apps/lit-demo/src/benchmark/benchmark.bloc.ts`: replace `data + indexById`
  in the fine-grained scenario.
- `apps/lit-demo/src/benchmark/benchmark.ui.ts`: row/list bindings.

For the Blac-strength scenario use stable identity:

```ts
type BenchmarkState = {
  order: number[];
  rows: Record<number, { id: number; label: string; selected: boolean }>;
};
```

- List/reorder reads `order`.
- A row reads `rows[id].label` and `rows[id].selected`.
- Swap replaces/reorders only `order`.
- Label update patches only affected `rows[id].label` leaves.
- Selection patches the old and new row-specific flags rather than making every
  row depend on one global `selected` scalar.

Remove `indexById`: rebuilding a `Map` is O(n), and Map is intentionally an
atomic tracking leaf, so replacing it wakes every label reader
(`benchmark.bloc.ts:10-39`; `benchmark.ui.ts:55-59`). Keep IDs bounded/reset in
repeated runs because the per-class path interner is append-only.

Expected impact: **high after P1.1**, high confidence for swap/update. This is a
Blac-specific sparse scenario, not a fair substitute for a standard array-based
framework benchmark; P3 must keep both workloads clearly labeled.

## Phase P2 — API and type ergonomics

### P2.1 One inferred `BlocView`

Files/symbols:

- Add types in `packages/blac-lit/src/types.ts` or colocate initially in
  `component.ts`/`live.ts`: `BlocView`, `ReactiveState`, `StateOfInstance`.
- `packages/blac-lit/src/component.ts`: `Ctx`, `BoundRender`, `makeHandle`,
  `ComponentFactory` overloads.
- `packages/blac-lit/src/live.ts`: generic `Binding`, `ReadFn`, `select`,
  `reactive`.
- `packages/blac-lit/src/index.ts`: export only the intentional public types.
- Demo call sites in `todo.ui.ts`, `market/market.ui.ts`, and
  `benchmark/benchmark.ui.ts`: remove redundant state annotations and casts.

Requirements:

- Bound component and `ctx.use` return the same `BlocView<T>` at type and
  runtime.
- `select<B extends StateContainer<...>, R>(bloc: B, read: (state:
  StateOfInstance<B>, bloc: B) => R): Binding<R, B>` infers both arguments.
- Views are cached per acquired instance. Document that `ctx.use` now returns a
  proxy view; members forward unchanged, but strict identity with a separately
  acquired raw instance is not promised.
- `Ctx.args` is non-optional when the declared component args are required. Use
  conditional tuples so no-arg components remain callable without an argument
  and required components are not.

Compatibility: stronger inference is additive for correct code but can expose
hidden errors. `ctx.use` proxy identity is observable; release-note it. Required
args and final type tightening belong in a major release.

### P2.2 Keep `Binding` plain and collision-resistant

Files/symbols:

- `packages/blac-lit/src/live.ts`: `Binding`, `makeBinding`, `isBinding`,
  `reactive`.
- `packages/blac-lit/src/control-flow.ts`: stop reading public `.bloc/.read`.
- `packages/blac-lit/src/index.ts`: deprecate raw `bind`/`isBinding` from the
  primary surface unless an extension use case is demonstrated.

Move source/read metadata into a private symbol/WeakMap and use a WeakSet for
identity. Public `Binding<T>` exposes only the Lit-renderable contract and
intentional transformations. Add collision-free `derive(binding, fn)`; keep
`.map` as deprecated sugar until a major. `select` remains the escape hatch for
state keys colliding with unavoidable Lit protocol properties.

Compatibility: internalizing currently public fields and removing `.map`, raw
`bind`, or `isBinding` is major-only. Adding `derive` is safe.

### P2.3 Typed forms and honest control flow

Files/symbols:

- `packages/blac-lit/src/forms.ts`: `model` overloads and `ModelOptions<T>`.
- `packages/blac-lit/src/control-flow.ts`: `when`, `match`, `each`.

Target form API:

```ts
model(form.$.name, form.setName); // string default
model(form.$.enabled, form.setEnabled); // checkbox boolean default
model(form.$.rate, form.setRate, {
  event: 'input',
  parse: (el) => (el as HTMLInputElement).valueAsNumber,
});
```

- Infer the setter value from the binding when the default DOM conversion is
  type-safe. Require `parse` for numeric/date/file/custom values. Do not silently
  change current numeric strings to numbers in a minor release.
- Type `when` as `Binding<boolean>`.
- Add an exhaustive `match` overload for finite unions and an explicit fallback
  form for partial cases.
- Warn when object lists omit a key; make keys required for object lists only in
  a later major. Continue describing `each` as keyed reconciliation, not
  per-item tracking.

### P2.4 Contract documentation and surface cleanup

Files:

- `packages/blac-lit/README.md`: make this the supported contract.
- `packages/blac-lit/DESIGN.md`: label historical/proposed sections and remove
  shipped claims for `classes`, `styles`, multi-binding `select`, getter `$`,
  per-binding registry refs, per-item `each` isolation, and mount-private
  `.local` where they are false.
- `packages/blac-lit/src/config.ts` and `src/index.ts`: stop advertising empty
  `configureBlacLit`; deprecate now, remove in a major unless a real option
  appears.

README must include a compact reactive-vs-one-shot table, component identity and
args rules, connection lifecycle, `ctx.use`, getter/dynamic selection, form
types, keyed-list semantics, direct Lit directive imports, and performance
claims that match tested behavior.

## Phase P3 — benchmark redesign

The visual explainer and performance harness must be separate execution modes,
not a pulse toggle inside one timed workload.

### P3.1 Two modes and two workload contracts

Files:

- `apps/lit-demo/src/benchmark/benchmark.ui.ts`: mode controls and scenarios.
- Add `apps/lit-demo/src/benchmark/benchmark.harness.ts`: isolated setup,
  warmups, samples, statistics, in-flight guard, raw export.
- `apps/lit-demo/src/benchmark/data.ts`: seeded deterministic data and reset.
- `apps/lit-demo/src/dev/pulse.ts`, `devStats.ts`, `hud.ui.ts`: explain mode
  only; coalesce HUD updates to at most one per frame.
- `apps/lit-demo/src/styles.css`: isolate timing/log UI from measured root and
  provide minimal fixed-layout benchmark CSS.

Modes:

1. **Explain:** optional root MutationObserver, pulses, body/binding compute
   counters, and descriptive labels. Call them `MutationObserver records`,
   `component body executions`, and `binding computes`; never “DOM patches.”
2. **Benchmark:** no HUD, observer, animation, FPS loop, counter notification,
   or growing log inside the measured root.

Workloads:

- **Standard keyed full DOM:** array data and equivalent operation/DOM/CSS
  contract suitable for comparison with established framework benchmarks.
- **Blac sparse:** normalized `order/byId` state showing observed-skeleton
  routing. Label it as an architecture demonstration, not a cross-framework
  score.

Keep virtualization as a separate production data-grid example. Do not use it
to improve a benchmark whose contract requires 10,000 real rows.

### P3.2 Three explicit measurement boundaries

Replace `measureEndToEnd` in `apps/lit-demo/src/benchmark/timing.ts` with:

1. **Application mutation:** time only the state operation. Prebuild input when
   renderer cost is the question; report data generation/index maintenance
   separately.
2. **Reactive commit:** state write through scheduler drain and Lit directive
   commits, using a controllable benchmark scheduler/settled hook rather than a
   guessed timer.
3. **Visual latency:** a documented paint-oriented double-rAF boundary with a
   separately reported no-op baseline. Call it frame-quantized visual latency,
   not framework JS time.

Protocol:

- Production build, fixed browser/version, foreground tab, fixed viewport,
  deterministic initial state, warmups, isolated reset per iteration, and one
  in-flight run.
- Many samples; publish raw values plus median, p95, and min/max. Randomize or
  interleave baseline/candidate order to reduce thermal/JIT drift.
- Keep diagnostics out of timed code. Use work-count assertions in tests and
  browser performance traces for scripting/style/layout/paint attribution.
- Compare equal DOM/state/workload contracts. Never compare the sparse model to
  a standard array result without disclosing the model difference.

## Optional later optimizations — evidence required

1. **Per-container binding hub.** One channel subscription, aggregate registered
   skeleton, and numeric-path buckets could avoid O(number of holes) subscriber
   scans. Prototype only after P1/P3 profiles show DirtyChannel scan cost is
   material. Expected impact medium-to-high at 10k sparse holes; confidence
   medium.
2. **Borrowed/inherited bloc views for row scopes.** Avoid 1,000 duplicate
   registry refs when a parent already owns the same bloc. Preserve explicit
   ownership at the component boundary. Expected create/memory/teardown impact
   medium-high; timing confidence medium.
3. **First-class keyed row binding.** Consider only if normalized state plus
   normal Lit `repeat` remains too ceremonious. It must not obscure Lit keying
   or silently retain stale items.
4. **CSS/layout tuning.** Standardize `table-layout: fixed`, containment, and
   animation-free benchmark CSS after traces show layout/paint is material.
5. **Framework-neutral tracking-session extraction.** Deduplicate React/Lit
   dependency tracking after both adapters have passing parity coverage.

## Targeted validation matrix (not run)

Run only these scopes after explicit authorization; avoid repo-wide checks.

| Slice | Proposed coverage | Acceptance signal |
| --- | --- | --- |
| Component identity | `packages/blac-lit/src/component.test.ts`: switch two factories at one part; same factory with new key/args | Correct body/result replaces stale one; old refs released once. |
| Reconnect | Last-ref instance disposed/recreated; shared/keepAlive instance preserved | Recreated instance rebuilds body; preserved instance does not; handlers target live object. |
| Lifecycle/errors | Repeat disconnect/reconnect; setup/cleanup returns; one cleanup throws; render throws after acquire | Exact cleanup/ref counts; no later cleanup skipped; no leaked acquisition. |
| Effects | Coarse instance effect and binding effect: initial/change/reconnect/disconnect/returned cleanup | Correct callback and cleanup sequence; no `watch(instance)` path. |
| Binding routing | `live.test.ts`: sibling fields, atomic array replacement, dynamic path changes, disconnect, bloc A→B reuse | Only intersecting read callbacks run; registered consumer paths update and are removed. |
| Cross-bloc | Primary getter conditionally calls dependency `.track()` | Dependency-only changes wake once; branch removal unsubscribes/unregisters/releases; `.untracked()` stays silent. |
| Static `$` parity | Nested objects, arrays, null parent, atomic replacement, reserved keys | Same values/wakeups as `select`; no tracker allocation on the static path. |
| Model | `forms.test.ts`: text, checkbox, select, parsed number, unsupported placement, A→B source, reconnect | One user action equals one setter call; correct value type; no duplicate listeners. |
| Mount | Two mounts in one root; stale and repeated unmount; render options | Stale handle cannot clear current tree; current unmount is idempotent. |
| Types | `types.test.ts` using `expectTypeOf`/`@ts-expect-error` | Bound/`ctx.use` views infer state/actions/`$`; selectors infer both args; required args fail when omitted. |
| Control flow | Boolean `when`, exhaustive/partial `match`, keyed `each` warnings | Compile-time and development behavior match docs. |
| Demo correctness | Targeted `BenchmarkBloc.remove` cases | Unknown ID is a no-op/error result; no duplicate keys/data. |
| Work counts | 1k normalized rows: select, swap, update 100, remove, clear | Binding compute counts match affected paths, independent of wall clock. |
| Harness | Seed/reset, in-flight lock, warmup/sample series, raw export, no-op baseline | Same seed produces same workload; no overlap; metrics contain boundary and mode metadata. |
| Browser profile | Production benchmark-mode trace for create/update/swap/select | Scripting vs style/layout/paint attributed; no HUD/observer/animation tasks in sample. |

Avoid brittle wall-clock assertions in unit tests. Performance gates should
prefer callback/subscriber/allocation counts and distribution comparisons from
the isolated harness.

## Compatibility and release sequence

1. **Patch/minor correctness:** P0 bug fixes, P1.1 routing, dev warnings,
   documentation corrections, invalid-remove guard, root ownership fix.
2. **Additive ergonomic minor:** `BlocView`, inferred `select`, returned mount
   cleanup, binding effect, `derive`, model parse options, match overloads,
   static `$` internal fast path.
3. **Benchmark/demo release:** split modes and publish the new protocol/results;
   do not present old numbers as a before-baseline without rerunning the same
   harness on the old adapter.
4. **Next major:** required non-void args; final args/remount semantics; remove or
   narrow `onUnmount`, `.map`, public binding metadata/raw `bind`, empty config;
   optionally require keys for object lists.

## Explicit non-goals and deferrals

- Do not add a component rerender loop, virtual DOM, or another observable
  system. The render-once/DOM-hole model is the product strength.
- Do not optimize DirtyChannel/core scheduling before adapter path registration
  and browser traces identify a core bottleneck.
- Do not build the subscription hub, borrowed ownership, or a keyed-row DSL in
  P0/P1.1; all add lifecycle complexity and need evidence.
- Do not ship `classes`, `styles`, multi-binding `select`, or wrappers around the
  rest of Lit merely because the design draft mentioned them.
- Do not silently coerce numeric/date form values in a compatibility release.
- Do not call MutationObserver records “DOM patches,” and do not use the current
  screenshot as a performance acceptance threshold.
- Do not virtualize the standardized full-DOM benchmark. Recommend
  virtualization separately for real 10k-row applications.
- Do not split bloc construction args from view props with a large definition
  DSL until real use cases justify the extra concept.

## Report disagreements and resolutions

1. **Registered path set.** The performance review recommends registering the
   expanded set; the core-alignment review recommends normal leaves for the
   source skeleton and expanded ancestor-watch paths only for channel interest.
   The latter is correct and matches the established React implementation
   (`packages/blac-react/src/useBloc.ts:369-385`, `:577-585`). This roadmap uses
   leaf registration + expanded subscription.
2. **First priority.** The DX review puts component identity/lifecycle before
   tuning; the performance/core reviews put path registration first. Both are
   release blockers. Implement the shared binding-session slice first because
   it can fix source replacement/error cleanup and path registration together,
   then complete component identity/reconnection before publishing any release
   or benchmark result.
3. **Benchmark state solution.** One report allows updateable keyed component
   args as an alternative to normalized state; the core review favors
   `order/byId`. Use normalized state for the explicitly Blac-sparse scenario,
   and retain a standard array scenario for comparison. Do not make component
   prop remount behavior a benchmark-specific optimization.
4. **Tracking disarm timing.** Existing Lit code copied React's microtask
   disarm. React must span JSX evaluation; Lit invokes the entire selector
   inside the directive compute. Synchronous `finally` is the appropriate Lit
   invariant, subject to focused getter/dependency parity coverage.

## Open decisions

- Whether construction args changing under the same apparent component should
  always remount in the next major or require an explicit view key. Recommended:
  structural args/props key participates in identity; no silent stale props.
- Whether coarse `ctx.effect(bloc, fn)` remains long-term. Recommended: repair
  and deprecate only after binding effects cover real usages.
- Whether proxy identity from `ctx.use` is acceptable as the public contract.
  Recommended: promise forwarded behavior, not raw-instance strict equality.
- Whether to extract a shared React/Lit tracking helper immediately.
  Recommended: establish Lit parity first unless extraction is demonstrably
  mechanical.
- Whether a binding hub is needed. No decision until P1/P3 measurements.

## Recommended first implementation slice

Create the internal binding-session primitive and migrate `BindDirective` to
it: source replacement, synchronous `finally` disarm, stable consumer ID, leaf
registration, expanded subscription interest, reconnect recompute, and full
disconnect cleanup. Add only the targeted routing/lifecycle cases listed above,
then extend the same primitive to `ModelDirective`. This is the smallest slice
that fixes a confirmed correctness issue and the highest-confidence performance
failure without changing the public API.
