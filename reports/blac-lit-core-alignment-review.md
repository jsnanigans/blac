# Blac/Lit core-alignment review

Scope: the Blac/Structural/DirtyChannel primitives used by `packages/blac-lit`,
and the ways `apps/lit-demo` exercises them. This was a static review only; no
tests, builds, type checks, servers, or benchmarks were run.

## Executive conclusion

Blac's strongest idea is not merely "a proxy notices reads." It is a two-sided
system: a consumer records leaf paths, registers those paths into a shared
source-side skeleton, and subscribes with the corresponding channel interest.
The source then diffs only the observed skeleton and the channel wakes only
intersecting consumers. Updates are microtask-coalesced, and keyed registry
ownership gives every consumer deterministic lifetime.

`@blac/lit` currently implements only half of that contract. It records paths
and creates a path-scoped channel subscription, but never calls
`registerConsumerPaths` or `unregisterConsumer`. Consequently the source always
sees zero registered consumers and emits `ALL_PATHS`; every non-empty Lit
binding wakes and recomputes. The DOM remains visually fine-grained because Lit
rejects unchanged part values, but Blac's source routing and compute isolation
are defeated. This is the highest-confidence explanation for the screenshot's
poor update/swap times.

The next blockers are: cross-bloc `depend().track()` is not integrated; a
component directive silently ignores changed identity/args and has unsafe
reconnection semantics; and the public types erase the core's state/args
inference. The benchmark also measures substantial diagnostic overhead while
counting DOM patches and component-body executions but not reactive-hole
computations, the hot work currently being repeated.

## Blac's intended mental model and distinctive strengths

1. **Observed-skeleton reactivity.** A `StructuralContainer` keeps a
   ref-counted union of registered consumer paths, diffs `emit` only along that
   skeleton, and refines atomic array/object replacements against observed
   descendants (`packages/dirtytalk-structural/src/container.ts:65-74`,
   `:92-103`, `:164-200`, `:215-246`, `:295-330`, `:333-407`). This is Blac's
   main advantage over store-wide selectors.
2. **Maximal-leaf dependency capture.** The tracker drops parent paths as
   deeper reads occur, preserving sibling-leaf isolation; array iteration can
   record length/index/field paths; non-structural values such as `Map` and
   class instances intentionally remain atomic leaves
   (`packages/dirtytalk-structural/src/tracker.ts:210-245`, `:436-504`).
3. **Numeric, shared path vocabulary.** Per-class `PathInterner`s turn dotted
   paths and ancestor-watch lanes into stable numeric IDs, including cached
   segments and ancestor relations (`packages/dirtytalk-structural/src/container.ts:78-89`,
   `packages/dirtytalk-structural/src/path-interner.ts:30-50`, `:79-121`).
4. **Batching without a framework scheduler.** `DirtyChannel.mark` unions all
   dirtiness before one scheduled flush, then evaluates each live interest
   against the union (`packages/dirtytalk-engine/src/dirty-channel.ts:54-68`,
   `:87-139`). `MicrotaskScheduler` coalesces pending flush functions
   (`packages/dirtytalk-engine/src/scheduler.ts:52-93`).
5. **Explicit identity, ownership, and disposal.** Registry acquisition derives
   identity from args/static keys and takes a named ref; release is paired and
   disposes the instance when the last ref leaves, including orphan dependency
   cleanup (`packages/blac-core/src/registry/acquire.ts:7-27`,
   `packages/blac-core/src/core/StateContainerRegistry.ts:439-525`).
6. **Getter and cross-bloc composition.** The primary proxy can make getters
   track their actual `this.state` reads, while branded dependency handles
   distinguish reactive `.track()` from imperative `.untracked()`
   (`packages/blac-core/src/core/StateContainer.ts:287-339`).

The Lit adapter's render-once, self-updating DOM-hole model is a good fit for
these strengths. The problems below are bridge omissions, not a mismatch in
the underlying architecture.

## Findings and recommendations

### P0 — Lit never registers consumer paths, disabling source-side precision

**Confirmed.** `BindDirective.compute()` captures and expands paths, while
`subscribe()` only calls `channel.subscribe` (`packages/blac-lit/src/live.ts:42-59`).
The internal `Trackable` type even declares optional
`registerConsumerPaths`, but no Lit code calls it and it does not declare
`unregisterConsumer` (`packages/blac-lit/src/internal/track.ts:15-25`). The form
directive repeats the same pattern (`packages/blac-lit/src/forms.ts:50-79`).

With no registered consumer, both `emit` and `patch` intentionally skip path
diffing and mark `ALL_PATHS` (`packages/dirtytalk-structural/src/container.ts:169-175`,
`:230-237`). `ALL_PATHS` intersects every non-empty set interest
(`packages/dirtytalk-structural/src/path-set.ts:41-50`), so all bindings on the
container recompute.

**Recommendation.** Give each directive a stable consumer ID. After every
tracked compute, register the *unexpanded leaf set* with
`container.registerConsumerPaths(id, tracked.paths)` and keep the expanded set
only for the channel subscription. On disconnect, unsubscribe and
`unregisterConsumer(id)`; on reconnect, recompute, register, then subscribe.
Keep leaf and expanded sets separate exactly as the React bridge does
(`packages/blac-react/src/useBloc.ts:369-385`, `:577-585`). Apply the same
primitive to `model` rather than maintaining two subtly different bridges.

This change should precede other performance work. Targeted proof cases should
cover sibling fields, atomic array replacement, dynamic selector paths, and
disconnect cleanup.

### P0 — Cross-bloc tracked dependencies are advertised but not reactive in Lit

**Confirmed.** Core explicitly says base `DepHandle.track()` resolves live
state but does not subscribe; framework adapters must replace it per consumer
(`packages/blac-core/src/core/StateContainer.ts:38-47`, `:287-301`). Lit's
`trackedBloc` redirects only the primary bloc's `state` and returns branded dep
handles unchanged (`packages/blac-lit/src/internal/track.ts:81-95`). The design
nevertheless says native `depend()` continues to work inside Lit bloc getters
(`packages/blac-lit/DESIGN.md:381`). It works as a read, but a Lit binding will
not wake when only the dependency changes.

**Recommendation.** Make one binding computation produce a multi-container
tracking session. Intercept `DEP_BRAND` in the getter receiver, wrap
`.track()` so it tracks the resolved dependency's state, and reconcile
subscribe/register/unregister plus ownership for every container in the
session. The React bridge already contains the required protocol
(`packages/blac-react/src/buildTrackedProxy.ts:53-85`,
`packages/blac-react/src/useBloc.ts:588-630`). Share a framework-neutral helper
instead of maintaining another bespoke implementation.

### P0 — Component identity and reconnection violate the ownership contract

**Confirmed.** Once `started` is true, `ComponentDirective.render` returns the
old result without examining `Bloc`, render function, args, or forced key
(`packages/blac-lit/src/component.ts:44-64`). The demo documents a real stale
route bug and wraps each case in a distinct template solely to force teardown
(`apps/lit-demo/src/app.ts:21-38`). This is API friction leaking directly into
application code.

On disconnect, refs and effects are released (`packages/blac-lit/src/component.ts:123-130`).
On reconnect, the directive re-acquires but discards the returned instance and
does not rebuild the result (`:108-121`). If the old instance was the last-owned
one, core release disposes it (`packages/blac-core/src/core/StateContainerRegistry.ts:501-509`),
so existing bindings and event handlers still close over a disposed instance.
Mount callbacks are also not retained after the initial connected render, and
effects are cleared but never recreated.

**Recommendation.** Define component identity explicitly (factory identity +
resolved bloc key/local key), and remount transactionally whenever it changes:
run cleanup, release, acquire, rerun body once, and replace the result. A Lit
`keyed` boundary is a simple option. For reconnect of unchanged identity,
retain/re-run mount registrations and rebuild if reacquisition returns a
different instance. Prefer `onMount(() => cleanup)` over separately paired
`onMount`/`onUnmount`; it is simpler and naturally repeatable.

### P0 — `ctx.effect` passes an instance to a constructor-only core API

**Confirmed.** `Ctx.effect` accepts a `StateContainer`, then casts that instance
to `any` and passes it to `watch` (`packages/blac-lit/src/component.ts:18-28`,
`:67-74`). Core `watch` accepts only a constructor or `BlocRef`, resolves the
input as a class, and acquires it (`packages/blac-core/src/watch/watch.ts:63-83`,
`:121-153`). The cast bypasses a real incompatibility; using this API is
expected to fail when the registry attempts to construct the instance value.

**Recommendation.** For an already acquired instance, subscribe directly to
its channel (coarse `ALL_PATHS` if that is the documented behavior), fire once,
and tie unsubscribe to component cleanup. Alternatively change the public API
to accept a constructor/ref, but do not cast away the core contract.

### P1 — One channel subscriber per DOM hole leaves O(N) fan-out

**Confirmed.** Every `BindDirective` owns a separate channel subscription
(`packages/blac-lit/src/live.ts:25-31`, `:54-59`). DirtyChannel snapshots and
tests every subscriber on each non-empty flush, even if few interests match
(`packages/dirtytalk-engine/src/dirty-channel.ts:102-131`). Registering consumer
paths will eliminate irrelevant recomputation, but 10,000 rows with multiple
holes still incur tens of thousands of interest checks and a fresh subscriber
snapshot per update.

**Recommendation.** After the P0 fix, profile a per-container Lit binding hub:
one channel subscription, ref-counted path-to-directive buckets, and one
aggregate registered skeleton. Dispatch precise dirty IDs through the buckets.
This preserves Blac's numeric-path advantage and changes sparse update routing
from scanning every hole toward work proportional to dirty paths. Keep the
first implementation direct and add the hub only with measured evidence.

Also add a static path-binding fast path for `bloc.$.a.b`: its dependency is
known without `trackRender`, but the current implementation constructs dynamic
bindings/proxies for every path segment (`packages/blac-lit/src/live.ts:110-139`)
and allocates a new getter proxy on every compute (`:42-51`). Reserve dynamic
tracking for `select` and getters.

### P1 — Keyed collection usage defeats sparse row updates

**Confirmed.** `each` reads the whole array binding, then invokes Lit `repeat`
inside the projection (`packages/blac-lit/src/control-flow.ts:16-26`). Thus the
list binding is interested in the parent array reference, so immutable element
updates rerun full keyed reconciliation. In the benchmark every row label also
reads a newly rebuilt `Map` (`apps/lit-demo/src/benchmark/benchmark.ui.ts:43-60`;
`apps/lit-demo/src/benchmark/benchmark.bloc.ts:10-13`, `:33-39`). Structural
tracking deliberately treats `Map` as one atomic leaf
(`packages/dirtytalk-structural/src/tracker.ts:134-147`, `:485-491`), so every
new `indexById` map wakes every row-label binding. Likewise every row class
reads the same `selected` path, producing selector fan-out across all rows
(`apps/lit-demo/src/benchmark/benchmark.ui.ts:48-51`).

**Recommendation.** Model benchmark state around stable identity:
`order: id[]` plus `byId: Record<id, row>`. The list subscribes to order/key
membership; rows subscribe to `byId[id].label`; selection can update the old
and new row-specific flags if the benchmark is intended to demonstrate truly
sparse work. Alternatively add a keyed-collection helper whose key projection
runs while tracking is armed, so label-only changes do not wake the outer
`repeat`. Document that `Map#get` is coarse by design.

### P1 — Public typing erases Blac's type-safety advantage

**Confirmed.** The bound render receives `bloc: any`, `makeHandle` returns
`any`, and `Ctx` defaults to/uses `any` (`packages/blac-lit/src/component.ts:18-35`,
`:142-150`). `ReadFn` takes `state: any, bloc: any`; `select`'s generic state is
caller-chosen rather than inferred from its bloc; `reactive` returns `any`
(`packages/blac-lit/src/live.ts:14-23`, `:96-101`, `:115`). The demo consequently
annotates `BenchmarkState`, `MarketState`, and `TodoState` repeatedly, with no
compiler proof that those annotations match the passed bloc.

**Recommendation.** Export a typed `LitBloc<T>` handle:
`InstanceType<T> & { $: ReactiveState<ExtractState<T>> }`. Infer both callback
arguments in `select<B extends StateContainer<any,...>, R>(bloc: B,
(state: StateOf<B>, bloc: B) => R)`. Make `Binding<T>` retain its bloc type,
make `model<T>` require `(value: T) => void`, and use conditional tuples so
factories with required args cannot be called without them. Return the same
typed handle from `ctx.use`, eliminating the current inconsistency where bound
components get `$` but `ctx.use` returns a raw instance.

## Benchmark interpretation

The screenshot is evidence of poor end-to-end behavior, but not a clean Blac
runtime measurement:

- `measureEndToEnd` always waits for `requestAnimationFrame` plus `setTimeout`,
  introducing a phase-dependent floor and variance (`apps/lit-demo/src/benchmark/timing.ts:1-20`).
- Each benchmark row installs a `MutationObserver`-based pulse
  (`apps/lit-demo/src/benchmark/benchmark.ui.ts:54-60`;
  `apps/lit-demo/src/dev/pulse.ts:22-55`). Creation therefore includes 1,000 or
  10,000 observers, and updates may start Web Animations.
- Every component-body and patch increment synchronously notifies HUD listeners
  (`apps/lit-demo/src/dev/devStats.ts:9-19`), whose callback writes HUD DOM text
  (`apps/lit-demo/src/dev/hud.ui.ts:15-27`). Creating 1,000 row components thus
  adds 1,000 diagnostic notifications and HUD writes.
- "Body execs" counts only the demo's `component` wrapper
  (`apps/lit-demo/src/dev/component.ts:17-27`). It does not count
  `BindDirective.compute`, so a zero body delta currently hides thousands of
  repeated selector computations.

Keep this visual demo, but add an instrumentation-off benchmark mode, a no-op
baseline, warmups and median samples, and counters for source-routed bindings,
binding computes, subscriber checks, and actual Lit part changes. Compare
production-mode results. Until then, do not use the screenshot's absolute
milliseconds as a framework score.

## Recommended sequence

1. Register/unregister leaf consumer paths in one shared binding primitive and
   make reconnect recompute.
2. Add focused routing/lifecycle tests and measure binding-compute counts with
   instrumentation disabled.
3. Fix component identity/reconnect and `ctx.effect` contracts.
4. Restore inferred public types and make `ctx.use` return the same handle.
5. Add multi-container sessions for `depend().track()`.
6. Normalize the demo's benchmark state/keyed list behavior.
7. Only then evaluate a per-container binding hub and static `$` fast path.

