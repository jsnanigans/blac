# `@blac/lit` DX and API review

Date: 2026-07-10  
Scope: read-only review of `packages/blac-lit`, with targeted traces into
`@blac/core` and `apps/lit-demo` where they expose adapter semantics. No tests,
builds, typechecks, linters, servers, or benchmarks were run.

## Executive conclusion

The core idea is strong: a render-once functional shell plus Blac-owned,
path-scoped DOM holes is a much cleaner fit than adapting Blac to a framework
render loop. The small public vocabulary (`component`, `$`, `select`, `each`,
`when`, `match`, `model`, `mount`) is also directionally right.

The current implementation is not ready to make that simplicity promise,
however. There are correctness failures in component identity, reconnection,
effects, changing binding sources, and cleanup. The type surface then hides the
best ergonomic idea behind `any`: the bound component receives an untyped proxy,
while `ctx.use()` returns a different, non-reactive shape. The demo visibly works
around both problems.

Recommended order:

1. Fix directive identity, ownership/reconnection, cleanup, and `effect` before
   tuning or expanding the API.
2. Make one typed `BlocView<T>` shape the result of both the bound component and
   `ctx.use()`; infer selector state from the bloc instance.
3. Keep `$` as the fast, common state-path API and `select` as the explicit
   computed/getter escape hatch. Add a static-path fast path internally.
4. Make lifecycle cleanup colocated (`onMount(() => cleanup)`), make required
   args actually required, and narrow `Binding`'s public surface.
5. Correct the documentation and benchmark claims, then add focused lifecycle,
   type, and directive-reuse coverage before treating the design draft as a
   shipped contract.

## Ranked findings

| Rank | Severity | Finding | Primary effect |
| --- | --- | --- | --- |
| 1 | Critical | A reused component directive ignores a new component definition and all new args | Stale/wrong UI; routing needs a template-identity workaround |
| 2 | Critical | Disconnect can dispose an instance; reconnect reacquires but keeps rendering and invoking the disposed instance | Dead actions and stale bindings after Lit cache/move/reconnect |
| 3 | Critical | `ctx.effect(bloc, fn)` passes an instance to a core API that only accepts constructors/`BlocRef`s | The advertised effect API fails at runtime |
| 4 | High | Disconnect/reconnect callbacks and cleanup are asymmetric and not exception-safe | Leaked refs/subscriptions and resources not restarted |
| 5 | High | The main authoring types erase the bloc and state to `any`; `ctx.use()` returns a different shape | No `$` after `use`, repetitive annotations/casts, poor discovery |
| 6 | High | `BindDirective` and `ModelDirective` do not move subscriptions when their binding's bloc changes | Updates arrive from the old bloc and not the new one |
| 7 | High | `model` has duplicate-event, unsupported-control, placement, and typing footguns | Duplicate actions and surprising form values |
| 8 | High | Public documentation makes multiple claims the shipped API does not satisfy | Developers learn invalid syntax and inaccurate performance semantics |
| 9 | Medium-high | `$` and `Binding` expose/collide with implementation fields; selectors are more weakly typed and ceremonious than necessary | State keys can be inaccessible; abstractions leak |
| 10 | Medium-high | Required args are optional, args are silently immutable, and bloc identity is coupled to UI args | Runtime assertions/casts and stale component inputs |
| 11 | Medium | Control-flow helpers over-promise granularity and underspecify exhaustiveness/keying | Easy to write unexpectedly broad work and incomplete matches |
| 12 | Medium | Error paths can leave tracking armed or ownership partially initialized | Secondary failures and hard-to-diagnose leaks |
| 13 | Medium | Empty configuration and low-level exports add surface without a coherent use case | Noise and premature compatibility burden |
| 14 | Medium | `mount` has weak root ownership/options semantics | One stale handle can clear a newer render; Lit options are unavailable |

## Detailed findings and recommendations

### 1. Component directive reuse returns the first component forever

`ComponentDirective.render()` returns its stored result whenever `started` is
true, without comparing the component factory/render function, bloc type,
resolved key, or args (`packages/blac-lit/src/component.ts:57-64`). Every factory
uses the same `componentDirective` class (`component.ts:134-163`), and Lit reuses
a directive instance at a stable expression position when the directive class is
unchanged.

This is already a known application bug: routing must wrap every page in a
distinct `html` template because returning the bare `Page()` reuses the first
component forever (`apps/lit-demo/src/app.ts:21-38`). The benchmark also documents
that row args are ignored after first mount (`apps/lit-demo/src/benchmark/benchmark.ui.ts:39-46`).

Recommendation:

- Give every `component()` factory a stable definition token.
- On update, compare at least definition token and resolved instance key.
- If either changes, run a complete, exception-safe teardown and initialize the
  new definition. Do not rely on callers manufacturing distinct Lit templates.
- Choose and document an explicit args rule. A useful render-once rule is:
  definition/key changes remount; same-key args are immutable and produce a dev
  warning if structurally different. Pure components need either remount-on-args
  or a documented immutable-props contract.

Before:

```ts
// Must manufacture different template identities to avoid stale Page().
match(route, {
  home: () => html`<div>${Home()}</div>`,
  settings: () => html`<section>${Settings()}</section>`,
});
```

After:

```ts
match(route, {
  home: () => Home(),
  settings: () => Settings(),
});
```

Compatibility: fixing cross-factory reuse is a bug fix. Defining same-factory
args behavior can change code that accidentally depends on stale first-render
args, so warn in the current minor and enforce/remount in the next major if
necessary.

### 2. Reconnection can leave the DOM bound to a disposed instance

On disconnect, the component releases every acquired ref
(`packages/blac-lit/src/component.ts:123-130`). Core release disposes a
non-`keepAlive` instance as soon as its last ref disappears
(`packages/blac-core/src/core/StateContainerRegistry.ts:439-442` and
`:498-509`). On reconnect, the adapter reacquires each key but discards the
returned instance (`component.ts:108-118`). The stored template, event handlers,
bindings, and handle still close over the original instance because the body is
not rebuilt.

This violates Lit `AsyncDirective`'s temporary disconnection model (for example,
cached/moved trees): reacquiring registry ownership is not enough if acquisition
created a replacement object.

Recommendation: make connection a small state machine. On reconnect, if every
reacquired instance is object-identical, reconnect subscriptions and mount
resources. If any instance was recreated, tear down the stale render and rerun
the component body against the new handle, then `setValue()` the new template.
An alternative is retaining ownership while cached, but the directive cannot in
general know whether a disconnect is temporary, so that risks permanent leaks.

Compatibility: this is a correctness fix. A body may execute again after a
disconnect that destroyed its instance; document the invariant as “once per
connected instance lifetime,” not literally once forever.

### 3. `ctx.effect` calls `watch` with the wrong kind of value

The context accepts a `StateContainer` instance and invokes
`watch(bloc as any, ...)` (`packages/blac-lit/src/component.ts:18-28` and
`:72-74`). Core `watch` accepts a constructor or `BlocRef`, not an instance
(`packages/blac-core/src/watch/watch.ts:76-107`). Its target conversion treats a
non-`BlocRef` input as a constructor (`watch.ts:121-135`) and later tries to
acquire it. The cast suppresses precisely the type error that would catch this.

There are also three conflicting descriptions:

- Current type: `effect(bloc, fn)` (`component.ts:26-27`).
- Early design example: `ctx.effect(() => ...)`
  (`packages/blac-lit/DESIGN.md:151-162`).
- Shipped-status note: coarse `effect(bloc, fn)` via core `watch`
  (`DESIGN.md:575-583`).

Recommendation:

1. Immediately make the existing overload subscribe directly to the supplied
   instance's channel (or pass its constructor/key through a correctly typed
   core API); remove the `any` cast.
2. Add a fine-grained, typed binding overload that capitalizes on Blac:

```ts
ctx.effect(cart.$.total, (total) => {
  analytics.setCartTotal(total);
});
```

Keep coarse `ctx.effect(cart, fn)` temporarily, label it coarse, and deprecate it
if the binding form proves sufficient. An effect callback should be able to
return cleanup.

Compatibility: the runtime repair is a bug fix. The binding overload is
additive. Removing the coarse overload is major-version work.

### 4. Lifecycle is asymmetric and cleanup exceptions leak ownership

`onMount` callbacks are local to the first `render()` call and run immediately or
once from `pendingMount` (`packages/blac-lit/src/component.ts:66-85`). They are
not retained for later reconnections (`component.ts:108-121`). In contrast,
`onUnmount` callbacks remain in an array and run on every disconnect
(`component.ts:53-55`, `:123-126`). Effects are disposed on disconnect and never
recreated on reconnect (`component.ts:123-126`).

The demo demonstrates the resulting ceremony: the market splits start/stop
across two registrations (`apps/lit-demo/src/market/market.ui.ts:45-47`), while
the HUD registers `onUnmount` from inside `onMount`
(`apps/lit-demo/src/dev/hud.ui.ts:15-47`). After a reconnect, its subscription and
animation are not restarted, while the old cleanup can run again.

Cleanup uses sequential `forEach` calls before registry release
(`component.ts:123-130`). If one user callback or disposer throws, the later
disposers and every release are skipped.

Recommendation:

```ts
ctx.onMount(() => {
  market.start();
  return () => market.stop();
});
```

Retain mount functions, store their returned cleanups per connection, invoke all
cleanups with per-callback error isolation, and put registry releases in a
`finally`. Either remove `onUnmount` in a major or keep it as deprecated sugar.
Define ordering (recommended: user cleanup while bloc is alive, binding/effect
unsubscribe, then ref release) and aggregate/report errors after all cleanup has
run.

Compatibility: accepting cleanup returns is additive. Re-running mount on
reconnect and isolating callback errors are bug fixes. Removing `onUnmount` is
breaking.

### 5. The best authoring surface is erased to `any`, and `ctx.use` is inconsistent

The bound render callback's bloc is `any` in both the internal and public
overloads (`packages/blac-lit/src/component.ts:30-31` and `:142-150`).
`makeHandle()` also returns `any` (`component.ts:33-41`). Conversely, `Ctx.use()`
claims `InstanceType<T>` (`component.ts:20-23`) and returns the raw acquired
instance (`component.ts:69`, `:90-105`), so it does not have `$` at runtime.

The design examples incorrectly use `${user.$.name}` after `ctx.use(UserBloc)`
(`packages/blac-lit/DESIGN.md:151-159`). The actual demo explicitly calls out the
absence of `$` and repeats typed selectors
(`apps/lit-demo/src/market/market.ui.ts:10-21`). Its local tracing wrapper has to
copy the `any` overloads (`apps/lit-demo/src/dev/component.ts:10-20`).

`select` also cannot infer the state or second-argument bloc type from its first
argument: both default to or use `any` (`packages/blac-lit/src/live.ts:14-15` and
`:96-102`). This is why the demo repeatedly annotates `TodoState`, `MarketState`,
and `BenchmarkState` at call sites.

Recommendation: introduce and export a single typed view:

```ts
type ReactiveState<S> = {
  readonly [K in keyof S]: Binding<S[K]> & ReactiveChildren<S[K]>;
};

type BlocView<T extends StateContainerConstructor> = InstanceType<T> & {
  readonly $: ReactiveState<ExtractState<T>>;
};
```

Both `component(Bloc, (bloc) => ...)` and `ctx.use(Bloc)` should return
`BlocView<T>`. Type `select` from the instance:

```ts
select(market, (state, bloc) => bloc.visible);
// state is inferred MarketState; bloc is inferred MarketBloc/BlocView.
```

Internally cache one view per acquired instance within the component so repeated
`ctx.use()` of the same resolved key neither adds duplicate refs nor creates
different proxy identities.

Compatibility: returning a proxy view from `ctx.use` is runtime-additive because
all existing instance members forward unchanged, but proxy identity and strict
equality are observable; ship with release notes. Stronger inference is
source-compatible for correct code but may reveal currently hidden type errors.
Treat the final public type cleanup as a major if the project promises strict
TypeScript compatibility.

### 6. Bindings do not resubscribe when their source bloc changes

`BindDirective.render()` overwrites `this.bloc` but only subscribes when
`this.unsub` is absent (`packages/blac-lit/src/live.ts:25-39`). The existing
subscription closure remains attached to the old bloc (`live.ts:54-58`). A Lit
part reused with `select(otherBloc, ...)` therefore computes once from the new
bloc, then listens to the old one.

`ModelDirective` has the same problem: it replaces `this.binding`, but an
existing subscription prevents `subscribe()` and remains attached to the old
binding's bloc (`packages/blac-lit/src/forms.ts:30-46`, `:74-78`).

Recommendation: track the subscribed instance separately. When the bloc object
changes, unsubscribe before replacing it, compute interest, and subscribe to the
new channel. Do the same for element/listener changes if the directive is ever
reused across parts.

Compatibility: pure bug fix.

### 7. `model` is under-specified and can dispatch duplicate writes

The directive attaches both `input` and `change` listeners and both invoke the
same setter (`packages/blac-lit/src/forms.ts:38-44`). Controls such as checkboxes
normally emit both for one interaction, so one edit can call a bloc action twice.
Only `type === 'checkbox'` is special-cased; radios, multi-select, number/range,
date, and file inputs all fall through to strings (`forms.ts:63-71`). The public
setter is `(value: any) => void` (`forms.ts:100-102`), forcing annotations such as
the demo's `(v: string)` (`apps/lit-demo/src/market/market.ui.ts:54-60`).

The directive also casts any `ElementPart` element to a supported form element
without validating placement/type (`forms.ts:15-17`, `:30-43`), so incorrect use
fails later with a property/method error rather than an actionable message.

Recommendation: keep one plain helper but make conversion explicit:

```ts
model(bloc.$.ratePerSec, bloc.setRate, {
  event: 'input',
  parse: (el) => el.valueAsNumber,
});
```

Provide safe defaults by element kind (text/range: `input`; checkbox/select:
one appropriate event), support `checked`/`valueAsNumber` explicitly, and reject
unsupported controls/part positions with a development error. Infer the setter
input from the binding only when the default DOM conversion truly produces that
type; otherwise require `parse`.

Compatibility: stopping duplicate writes is a bug fix. Default numeric coercion
would change behavior, so add options first and reserve changed defaults for a
major. Tightened setter types can expose errors and need migration notes.

### 8. Documentation is simultaneously too short and inaccurate

The published README ends after the counter (`packages/blac-lit/README.md:1-46`),
leaving lifecycle, args/identity, `ctx.use`, selectors/getters, control flow,
forms, local instances, direct Lit directive imports, and limitations to a draft
design document.

The design document contains stale claims:

- It lists unshipped `classes` and `styles` as imports
  (`packages/blac-lit/DESIGN.md:56-74`) and shows their use (`DESIGN.md:138-149`),
  although the status section calls them deferred (`DESIGN.md:587-591`).
- It shows multi-bloc `select([a.$.x, b.$.y], ...)`
  (`DESIGN.md:96-105`) but later calls it deferred (`DESIGN.md:587-590`).
- It says `$` reads getters (`DESIGN.md:85-95`) but later says `$` is state-only
  (`DESIGN.md:587-592`), matching the implementation
  (`packages/blac-lit/src/live.ts:110-120`).
- It says each Binding releases a registry ref (`DESIGN.md:45-50`), but refs are
  owned by components; `BindDirective` only subscribes/unsubscribes
  (`packages/blac-lit/src/live.ts:25-67`).
- It claims `each` “only re-renders items whose keyed slice changed”
  (`DESIGN.md:109-126`). The implementation re-runs `repeat` over the selected
  array whenever that binding wakes (`packages/blac-lit/src/control-flow.ts:16-26`).
  Keys preserve/move DOM identity; they do not create per-item Blac selectors.
- It calls `.local()` mount-private (`DESIGN.md:164-175`), but the key is allocated
  per factory call (`packages/blac-lit/src/component.ts:14-16`, `:162-163`).
  Reusing one returned renderable in two parts shares that key.

Recommendation: make README the supported contract and clearly label DESIGN as
historical/proposal. Include a compact “reactive vs one-shot reads” table, exact
component/args identity rules, connection lifecycle, getter syntax, form value
types, keyed-list semantics, and a “use official Lit directives directly” example
(the demo imports `ref` directly at
`apps/lit-demo/src/benchmark/benchmark.ui.ts:4-5`).

Compatibility: documentation-only. Correct misleading claims immediately.

### 9. `Binding` leaks internals and `$` reserves ordinary state names

The public `Binding` exposes its bloc and raw read function plus a string brand
(`packages/blac-lit/src/live.ts:17-23`). Control-flow helpers depend on those
fields (`packages/blac-lit/src/control-flow.ts:5-13`, `:16-26`, `:29-38`).
`isBinding` trusts the forgeable public string (`live.ts:104-107`).

The `$` proxy must special-case Lit internals plus `__blacBinding`, `bloc`, `read`,
and `map` (`live.ts:115-137`). Those names cannot be traversed as ordinary state
keys. `.map` is convenient, but it also conflates transforming a binding with a
state property named `map`.

Recommendation:

- Store binding metadata in a private `WeakMap`/symbol and use a `WeakSet` for
  identity. Public `Binding<T>` should expose only the renderable contract and
  intentional transformations.
- Add an external transform with no path collision, for example
  `derive(binding, value => ...)`; retain `.map` as deprecated compatibility
  sugar until a major.
- Reduce proxy-reserved names to Lit's unavoidable directive protocol and
  document them. In development, produce a useful error if a reserved state key
  is accessed through `$`; `select` remains the escape hatch.
- Keep `bind` internal or move it to an explicitly advanced export; ordinary
  users should not need raw read/project metadata.

Compatibility: internal metadata is a bug-resistant refactor if no consumer
relies on undocumented fields, but those fields are currently public types.
Deprecate in one release and remove in a major. `derive` is additive.

### 10. Args are optional in types, silently stale, and overloaded as identity

`Ctx.args` is always `A | undefined`, and both factory call signatures accept
optional args regardless of `A` (`packages/blac-lit/src/component.ts:18-23`,
`:136-140`). The demo consequently uses casts/non-null assertions even when it
declares required component args (`apps/lit-demo/src/todo.ui.ts:12-15` and
`apps/lit-demo/src/market/market.ui.ts:12-19`).

For a bloc-bound component, one value serves three roles: bloc construction args,
registry identity, and static view args (`component.ts:57-80`, `:95-104`). That is
simple when they align, but it makes it impossible to pass view-only data while
sharing the default bloc without changing composition shape. Combined with the
started guard, updated args are silently ignored.

Recommendation:

```ts
const Row = component<{ id: number }>((ctx) => {
  ctx.args.id; // non-optional
});

Row();         // type error
Row({ id: 1 });
```

Use conditional tuples so `void` args remain optional and required args are
required. Consider renaming pure component args to `props` while reserving
`args` for Blac instance identity, or offer an object-form component definition
only if real examples require separating them. Do not add a large options DSL
preemptively.

Compatibility: requiredness/type narrowing can break TypeScript builds and is
best in a major. Runtime validation/dev warnings can be added first. Splitting
props from bloc args is a major conceptual change; keep the current simple rule
unless use cases justify it.

### 11. Control flow needs honest semantics and stronger types

`when` accepts any `Binding`, not `Binding<boolean>`
(`packages/blac-lit/src/control-flow.ts:5-13`). `match` is limited to string or
number, accepts a partial record, and cannot communicate exhaustiveness
(`control-flow.ts:29-38`). `each` makes keying optional and uses index identity in
that case (`control-flow.ts:16-26`), a dangerous default for mutable lists.

More importantly, `each` is a reactive wrapper around Lit `repeat`, not a
per-item selector primitive. When the selected array wakes, `repeat` sees the
whole array and invokes the template mapping. The benchmark avoids rerunning row
bodies by nesting one component per row and then doing additional id-based
selectors (`apps/lit-demo/src/benchmark/benchmark.ui.ts:39-66`, `:157-161`). This
is valid composition, but it creates substantial ownership/directive machinery
and should not be hidden behind the claim that keyed `each` itself provides
fine-grained row reads.

Recommendation:

- Type `when(condition: Binding<boolean>, ...)`.
- Provide an exhaustive `match` overload for finite unions, with an explicit
  `.otherwise`/fallback form for partial matching.
- Require a key by default for object lists; offer a clearly named index-based
  helper/option for append-only lists.
- Document normalized state (`ids` plus `byId`) and per-row `select` as the
  current high-performance pattern. Consider a future first-class keyed row
  binding only after profiling proves the extra API pays for itself.

Compatibility: stricter types/key requirements are breaking; add overloads and
development warnings first, then tighten in a major. Documentation correction is
immediate.

### 12. Error paths are not exception-safe

Both reactive read implementations schedule `tracked.disarm` only after the read
returns (`packages/blac-lit/src/live.ts:42-51` and
`packages/blac-lit/src/forms.ts:50-59`). If a user selector/getter throws, the
disarm is never scheduled. The component marks itself started before acquisition
and user render (`packages/blac-lit/src/component.ts:62-80`); a render error can
leave a partial acquisition recorded and subsequent updates returning `nothing`.

Mount and unmount callback loops also stop at the first throw
(`component.ts:84-85`, `:119-130`). There is no contextual error wrapping for a
selector, component body, invalid model placement, or lifecycle callback.

Recommendation: use `try/finally` around every tracking session and ownership
transition; roll back newly acquired refs if render initialization fails. Run all
cleanup even when one callback fails. In development, attach component/bloc/key
context to rethrown errors without swallowing the original cause.

Compatibility: bug fix. Error messages/stacks change beneficially.

### 13. Configuration and low-level exports create premature surface

`BlacLitConfig` is empty and `configureBlacLit` only merges empty objects
(`packages/blac-lit/src/config.ts:1-17`), yet both are public
(`packages/blac-lit/src/index.ts:17-18`). `bind` and `isBinding` are also promoted
next to the primary selector (`index.ts:8-10`) even though the design calls the
directive mostly internal (`packages/blac-lit/DESIGN.md:603-606`).

Recommendation: stop advertising empty configuration. Deprecate the no-op now
and remove it in a major, or leave it unmentioned until a real option exists.
Move raw binding machinery to an advanced subpath only if there is a demonstrated
extension use case.

Compatibility: removing exports is breaking. Deprecation and documentation
changes are safe now.

### 14. `mount` needs root ownership and useful Lit options

`mount` returns a handle that unconditionally disconnects and clears the whole
container (`packages/blac-lit/src/mount.ts:7-18`). If code calls `mount` twice into
one root, the old handle can later clear the newer tree. It also exposes none of
Lit render's useful options (for example host/render-before/connection state),
which makes the wrapper a narrowing rather than a transparent bootstrap helper.

Recommendation: associate a generation token with the container; an old handle's
`unmount()` should be an idempotent no-op or a clear development error after a
new mount takes ownership. Accept and forward a typed subset/all of Lit's render
options.

Compatibility: adding options and idempotence is additive/bug-fixing. Refusing a
stale unmount changes edge-case behavior intentionally and should be documented.

## DX-oriented performance opportunities

These are source-level hypotheses, not benchmark results; validate them with the
targeted benchmark harness after correctness work.

1. **Give `$` a true static-path fast path.** `bloc.$.a.b` already knows its path,
   but currently every compute still creates/runs a tracking session and a
   tracked bloc proxy (`packages/blac-lit/src/live.ts:42-51`, `:115-139`). Intern
   the known path/ancestor interests once and read the raw path directly. Keep
   dynamic tracking only for `select`.
2. **Disarm Lit selectors synchronously in `finally`.** Unlike React's hook,
   `select` owns the complete read callback; reads after it returns should not
   belong to the selector. The current queued microtask per compute
   (`live.ts:49`, `forms.ts:57`) adds work and lengthens the tracking session.
   Confirm no deliberate Lit-part read depends on the escaped proxy before
   changing this.
3. **Avoid creating a tracked bloc proxy when the selector does not use it.** A
   fresh proxy is created for every compute (`live.ts:45-48` and
   `packages/blac-lit/src/internal/track.ts:81-95`). A state-only selector should
   not pay that cost. Prefer an API/internal representation that marks state-only
   path selectors instead of relying solely on `Function.length` heuristics.
4. **Deduplicate component acquisitions/views.** Every `ctx.use()` adds a ref and
   acquired record (`component.ts:69`, `:90-105`). Cache by constructor/resolved
   key within a component. This matters for row-heavy composition and makes
   reference diagnostics easier to understand.
5. **Be explicit about subscription cardinality.** Every rendered `Binding` owns
   an `AsyncDirective`, `ProxyCache`, and channel subscription
   (`live.ts:25-39`, `:54-67`). The benchmark creates an outer array binding plus
   multiple selectors/components per row
   (`apps/lit-demo/src/benchmark/benchmark.ui.ts:43-66`, `:157-161`). A later
   internal per-bloc dispatcher/component aggregator could reduce channel
   subscriber count without changing the public API, but profile channel scan,
   DOM creation, registry events, and dev instrumentation separately first.
6. **Do not mistake keyed `repeat` for fine-grained item state.** Keying prevents
   unnecessary DOM replacement during reorder; it does not prevent the list
   mapping from seeing all items when the array binding wakes
   (`control-flow.ts:16-26`). Normalize benchmark state and keep row selectors
   keyed by id, or design a measured row-binding primitive.

## Proposed minimal public shape

This keeps the current vocabulary and avoids adding a second reactivity system:

```ts
import {
  component,
  derive,
  each,
  html,
  match,
  model,
  mount,
  select,
  when,
  type Binding,
  type BlocView,
} from '@blac/lit';

const Price = component(PriceBloc, (price, ctx) => {
  const currency = ctx.use(CurrencyBloc); // also BlocView<CurrencyBloc>

  ctx.onMount(() => {
    price.start();
    return () => price.stop();
  });

  ctx.effect(price.$.value, (value) => analytics.record(value));

  return html`
    <output>
      ${derive(price.$.value, (value) => format(value))}
      ${currency.$.symbol}
    </output>
  `;
});
```

The important property is consistency: a bloc acquired by any component API has
the same typed actions, one-shot `state`, reactive `$`, and explicit `select`
behavior. Lifecycle is connection-safe and cleanup is colocated.

## Suggested migration sequence

### Patch/minor correctness release

- Repair directive definition/key comparison and binding source changes.
- Repair `effect`, reconnect behavior, tracking `finally`, and cleanup isolation.
- Add dev warnings for ignored same-key args, duplicate acquisitions, invalid
  `model` placement/control, and stale root handles.
- Correct README/design claims.

### Additive ergonomic release

- Add typed `BlocView<T>` and return it from both acquisition paths.
- Infer `select` state/bloc types.
- Add mount-cleanup returns, fine-grained binding effects, `derive`, model parsing
  options, and exhaustive match overloads.
- Implement `$`'s static-path fast path behind the same API.

### Next major

- Make non-void component args required and finalize same-key args semantics.
- Remove/deprecate `onUnmount`, `.map`, public binding metadata/raw `bind`, and
  empty `configureBlacLit` according to adoption data.
- Decide whether object-list keys become mandatory.

## Missing validation coverage to add later

No test files are present under `packages/blac-lit` in the reviewed tree. Highest
value cases are:

- same expression switches between two component factories;
- same component receives changed key and changed same-key args;
- last-ref disconnect disposes, then reconnect recreates and rerenders;
- keep-alive/shared reconnect preserves the same instance;
- mount callback cleanup ordering, repeated reconnects, and one cleanup throwing;
- `ctx.effect` immediate run/change/disconnect/reconnect behavior;
- a binding/model part switches from bloc A to bloc B;
- selector/render/model errors always disarm and release;
- checkbox produces one write; numeric/radio/select conversion is explicit;
- compile-time inference for bound handles, `ctx.use`, selectors, required args,
  getter selection, and nested `$` paths;
- state keys named `map`, `read`, `bloc`, or `values` have a documented escape;
- stale mount handle cannot clear a newer root.

