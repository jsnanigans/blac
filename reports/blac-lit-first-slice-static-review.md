# Blac Lit first-slice static review

Scope: read-only review of the current P0.1, P0.2, and P1.1 implementation.
No tests, builds, type checks, linters, benchmarks, or servers were run.

## Verdict

The shared binding session implements the intended two-sided protocol correctly
in the normal single-source case: it retains unexpanded leaf paths for the
source skeleton, expands only subscription interest, replaces source ownership
on rebinding, refreshes dynamic reads, and closes the read-to-subscribe gap.
The component directive also fixes the formerly stale factory/key/reconnect
paths in its normal lifecycle.

There is one concrete TypeScript blocker in the migrated demo. Fix that before
considering this slice a buildable base. After that fix, this is safe to
continue building on for the stated single-container P0.1/P0.2/P1.1 scope,
provided focused lifecycle/routing coverage is added before performance work.
It is not yet safe to claim full Blac reactive semantics: tracked cross-bloc
`depend().track()` remains the explicitly deferred P0.3 work.

## Blocker

### `ctx.use()` is typed as a raw bloc, while the demo now uses its runtime `$` view

`Ctx.use()` promises `InstanceType<T>` (`packages/blac-lit/src/component.ts:23-26`),
whose public type has no `$` member. `MarketRow` receives `m` through precisely
that API (`apps/lit-demo/src/market/market.ui.ts:14`) and now passes
`m.$.ratePerSec` to `model` (`apps/lit-demo/src/market/market.ui.ts:61`). This
should be a TypeScript error even though `acquireView()` currently returns a
proxy with `$` at runtime (`packages/blac-lit/src/component.ts:227-259`) and
`makeHandle()` supplies it (`:59-68`).

This prematurely depends on the P2.1 `BlocView` typing work. Either keep the
demo on `model(select(m, ...), ...)` for this slice, or land a small, deliberate
public/interim view type at the same time. Do not solve it by casting in the
demo: the mismatch is exactly the DX inconsistency P2.1 is meant to remove.

## Follow-up issues

### Pure-component structural identity has observable collisions

`pureArgsKey()` treats any value that `JSON.stringify` accepts as structural
props (`packages/blac-lit/src/component.ts:94-117`). `Map`, `Set`, symbols, and
many class instances stringify indistinguishably (for example, distinct Maps
become `{}`). Two different prop values can therefore retain the first
component result at one Lit part, despite the stated goal that unsupported props
fall back to reference identity (`:70-74`).

This is an API-correctness issue rather than a current demo failure. Restrict
structural serialization to plain JSON data (and reject undefined/non-finite
or otherwise lossy values), or use a proven structural-key routine with an
explicit unsupported-value fallback. Add cases for `Map`, `Set`, symbols,
functions, dates/classes, cyclic data, and changed top-level props.

### Coarse effect can double-run for an update in its connection window

`startConnection()` installs an `ALL_PATHS` subscription and then immediately
runs the effect (`packages/blac-lit/src/component.ts:331-337`). If a mutation
lands after subscribe but before that immediate call, the immediate run observes
the new state and the queued channel callback runs it again. This is not a
subscription leak and preserves eventual correctness, but the public wording
"runs now and re-runs on any change" (`:31-32`) is ambiguous for effectful
callbacks.

Document the coarse effect as at-least-once around connection, or give it a
snapshot/version policy if exactly-once-per-observed-commit is intended. The
planned binding-based `effect(binding, fn)` needs an explicit rerun/cleanup
contract before being added.

### Errors from async directive lifecycle callbacks need browser-level coverage

The directive deliberately rethrows aggregated errors from `disconnected()`
and `reconnected()` (`packages/blac-lit/src/component.ts:262-282`, `:340-354`),
and binding recomputation lets selector/apply errors escape the channel callback
(`packages/blac-lit/src/internal/binding-session.ts:124-127`). Local rollback
is careful: `teardownIdentity()` releases refs in `finally` (`component.ts:356-371`),
and binding failure clears unsubscribe/registration flags before cleanup
(`binding-session.ts:151-190`). Still, verify Lit's lifecycle-error propagation
with targeted tests. The failure path must not leave a partially committed
template nor turn a later reconnect into an unhandled callback exception.

### Forms retain pre-existing P0.4 hazards

The new session correctly disconnects/unregisters its source
(`packages/blac-lit/src/forms.ts:52-65`), but `model` still attaches both
`input` and `change` (`:28-34`) and keeps the first element forever (`:26-34`).
The roadmap intentionally assigns default-event selection and element-part
validation to P0.4. Do not interpret the shared-session migration as completion
of forms correctness.

### Cross-bloc tracking remains absent by design

`trackedBloc()` redirects only the primary bloc's `state`
(`packages/blac-lit/src/internal/track.ts:87-96`). It does not recognize
`DEP_BRAND` or reconcile dependency containers, unlike the React protocol
(`packages/blac-react/src/buildTrackedProxy.ts:64-73`; `useBloc.ts:588-640`).
Thus a selector/getter based solely on `depend(...).track()` will not subscribe
to the dependency. This is the known P0.3 gap, not a regression introduced by
this slice; keep it visibly deferred and avoid using that pattern in the demo.

## Confirmed protocol and lifecycle details

- `BindingSession` uses a stable consumer ID (`binding-session.ts:12-27`),
  registers normal tracked leaves (`:103-109`, `:144-149`), and expands only
  channel interest (`:103-105`). This matches the React split between
  registration and ancestor-watch subscriptions (`useBloc.ts:365-385`,
  `:577-585`) and P1.1.
- Source replacement first removes the previous channel subscription and
  consumer registration (`binding-session.ts:42-47`, `:151-173`). Disconnect
  does the same (`:69-73`). The structural registry itself replaces a consumer
  path set atomically and ref-counts the skeleton (`dirtytalk-structural/src/container.ts:265-275`,
  `:295-330`).
- Dynamic selectors refresh registered leaves after each successful callback
  compute (`binding-session.ts:103-110`); the subscription's interest thunk is
  deliberately read lazily (`:121-128`).
- A throwing selector disarms synchronously in `finally` and detaches reactive
  state (`binding-session.ts:86-101`, `:181-190`). The attach path is also
  transactional (`:118-141`).
- The source snapshot is read before tracking, subscription is installed, and
  state identity is checked afterward (`binding-session.ts:82-84`, `:121-135`).
  That covers the read-to-subscribe gap under the same immutable state identity
  assumption used by React (`useBloc.ts:376-380`).
- Component identity compares both the factory token and resolved identity on
  every render (`component.ts:147-163`), caches repeated `ctx.use()` acquisitions
  by `{Bloc,key}` (`:227-259`), and reacquires released refs on reconnect while
  rebuilding DOM only if object identity changed (`:262-320`).
- Connection cleanup executes all mount/legacy/effect cleanups and then releases
  acquired refs in `finally` (`component.ts:340-419`). The migrated market and
  HUD now use returned mount cleanups (`apps/lit-demo/src/market/market.ui.ts:45-49`,
  `apps/lit-demo/src/dev/hud.ui.ts:15-48`), consistent with P0.1.
- Route rendering now relies on component factory identity rather than wrapper
  element identity (`apps/lit-demo/src/app.ts:21-31`), which is the intended
  P0.1 demo migration.

## Likely TypeScript status

- The `m.$` mismatch above is the only clear compile failure found by static
  inspection.
- `AggregateError` is available with this package's ESNext lib/ES2021 target,
  so `throwCollected()` is plausible (`packages/blac-lit/tsconfig.json:3-5`,
  `component.ts:120-124`).
- The new `Trackable` required methods correspond to inherited
  `StructuralContainer` APIs (`packages/blac-lit/src/internal/track.ts:15-26`,
  `packages/dirtytalk-structural/src/container.ts:265-275`). The cast remains
  intentional internal plumbing, not a new declaration incompatibility.

## Recommended next action

1. Resolve the `ctx.use`/`$` demo type mismatch without silently weakening
   types.
2. Add narrow tests for sibling routing, dynamic paths, source replacement,
   disconnect/reconnect, thrown reads, and the component identity/reacquire
   cases; include a Lit lifecycle-error case.
3. Complete P0.3 before advertising composed getters, then proceed to the
   P1.3 normalized benchmark state and instrumentation-separated measurement.
