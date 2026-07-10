# blac-lit review findings: current status (2026-07-10)

Verified against current source, not the stale report text. `8895b6bd` and
`d1efdd85` fixed more than their commit messages imply — a new
`internal/binding-session.ts` (shared by `live.ts`/`forms.ts`/`control-flow.ts`)
and a rewritten `component.ts`/`mount.ts` close most P0/Critical items.

## Summary table

| # | Finding | Severity | Status | Type | Fix size |
|---|---|---|---|---|---|
| DX-1 | Component directive reuse ignores new def/args | Critical | FIXED | — | — |
| DX-2 | Reconnect can leave DOM bound to disposed instance | Critical | FIXED | — | — |
| DX-3 | `ctx.effect` misuses `watch()` | Critical | FIXED | — | — |
| DX-4 | Lifecycle asymmetric / cleanup not exception-safe | High | FIXED | — | — |
| DX-5 | Bound render `any`; `ctx.use` inconsistent with `$` | High | PARTIAL | DX/types | S |
| DX-6 | Bindings don't resubscribe when bloc source changes | High | FIXED | — | — |
| DX-7 | `model` duplicate writes / weak coercion | High | PARTIAL | DX (coercion), fixed (dup writes) | S |
| DX-8 | Docs inaccurate/incomplete | Medium-high | STILL-OPEN | DX/docs | S |
| DX-9 | `Binding`/`$` leak internals, reserve names | Medium-high | STILL-OPEN | DX/API | M |
| DX-10 | Args optional in types / silently stale | Medium-high | STILL-OPEN | DX/types | M |
| DX-11 | Control-flow weak typing/exhaustiveness/keying | Medium | STILL-OPEN | DX/types | M |
| DX-12 | Error paths not exception-safe | Medium | FIXED | — | — |
| DX-13 | Empty config / low-level exports as surface | Medium | STILL-OPEN | DX/API surface | S |
| DX-14 | `mount` root ownership / Lit options | Medium | FIXED | — | — |
| CA-P0-1 | Lit never registers consumer paths (ALL_PATHS fallback) | P0 | FIXED | — | — |
| CA-P0-2 | Cross-bloc `depend().track()` not reactive in Lit | P0 | STILL-OPEN | **CORRECTNESS** | L |
| CA-P0-3 | Component identity/reconnection ownership violation | P0 | FIXED | — | — |
| CA-P0-4 | `ctx.effect` passes instance to constructor-only `watch` | P0 | FIXED | — | — |
| CA-P1-1 | One channel subscriber per DOM hole (O(N) fan-out) | P1 | STILL-OPEN | Optimization | L |
| CA-P1-2 | Keyed collection defeats sparse row updates | P1 | STILL-OPEN | Optimization | M/L |
| CA-P1-3 | Public typing erases type safety | P1 | PARTIAL | DX/types | S/M |

## Detail

**DX-1 (FIXED)** — `component.ts:152-164` `render()` now compares
`this.definition?.token === definition.token && this.identity === identity`
before returning the cached result; each `component()` call gets a unique
`Symbol('blac-lit.component')` token (`component.ts:487`), and identity is
`resolveInstanceKey`/`pureArgsKey` (`component.ts:166-175`). A changed
factory or key now runs `teardownIdentity()` + `initialize()`
(`component.ts:161-162`).

**DX-2 / CA-P0-3 (FIXED)** — `reconnected()` (`component.ts:266-290`) calls
`reacquire()` (`component.ts:293-337`), which reports whether any reacquired
instance is object-different from the stored one. If so, `executeBody()` is
rerun and `setValue(this.result)` replaces the stale DOM
(`component.ts:270-276`), rather than silently reconnecting to a disposed
instance's closures.

**DX-3 / CA-P0-4 (FIXED)** — `component.ts` no longer imports `watch` at
all. `ctx.effect` (`component.ts:220,348-357`) subscribes directly to
`effect.bloc.channel.subscribe(() => ALL_PATHS, ...)` — the exact
recommendation in the report ("subscribe directly to its channel"). No cast
to a constructor-only API remains.

**DX-4 / DX-12 (FIXED)** — `startConnection()`/`stopConnection()`
(`component.ts:339-426`) run mount setups and effect setups every time a
connection (re)starts, not just on first render; cleanups run in per-callback
try/catch and aggregate via `throwCollected`/`AggregateError`
(`component.ts:120-124`, `394-426`); `releaseAcquired()` always runs in a
`finally` (`component.ts:360-374`). `BindingSession.computeCurrent()` wraps
the read in `try/finally` to always call `tracked.disarm()`
(`internal/binding-session.ts:86-101`), and `attach()`/`detachAfterFailure()`
roll back partial subscribe/register state
(`internal/binding-session.ts:113-142,181-191`).

**DX-5 (PARTIAL)** — The *public* overloads are now typed:
`component<T>(Bloc, render: (bloc: BlocView<T>, ctx: Ctx<...>) => ...)` and
`ctx.use<T>(Bloc): BlocView<T>` (`component.ts:23-26,477-480`), backed by a
real `BlocView<T>` type (`live.ts:34-37`). Still open: `select`'s state/bloc
params are not inferred from the bloc argument — `select<S = any, T =
unknown>(bloc: StateContainer, readFn: (state: S, bloc: any) => T)`
(`live.ts:91-95`) — and internal `makeHandle`/`reactive` still return `any`
(`component.ts:60`, `live.ts:109`). DX/types, small (mostly generic
signature work on `select`).

**DX-6 (FIXED)** — Both `BindDirective.render()` and `ModelDirective.update()`
now delegate to `BindingSession.compute(bloc, reader)`
(`live.ts:46-54`, `forms.ts:77`), whose `compute()` detects `this.source !==
source`, calls `detachSource()` (unsubscribe + `unregisterConsumer`), and
resets interest before rebinding (`internal/binding-session.ts:42-51`). A
part reused with a new bloc no longer keeps listening to the old one.

**DX-7 (PARTIAL)** — Duplicate writes are fixed: `writeEventFor()`
(`forms.ts:38-46`) attaches exactly one event (`change` for
select/checkbox/radio, `input` otherwise), and only that one listener is
ever added (`attachListener`, `forms.ts:92-96`). Still open: the listener
still coerces everything but checkboxes to `element.value` (string)
(`forms.ts:56-61`), so numeric/range/date inputs still fall through to
strings, and the setter type is still `(value: any) => void`
(`forms.ts:52`). DX/typing gap, small.

**DX-8 (STILL-OPEN)** — `README.md` is unchanged (46 lines, ends after the
counter example). `DESIGN.md:582` still documents `effect(bloc, fn) (coarse
— re-runs on any change to the given bloc, via core watch)` — inaccurate now
that `effect` subscribes directly to the channel rather than calling core
`watch`. Doc-only, small but should be done alongside DX-3's fix so the docs
don't actively mislead.

**DX-9 (STILL-OPEN)** — `Binding<T>` in `live.ts:15-20` is unchanged: it
still publicly exposes `__blacBinding`, `bloc`, `read`. `reactive()`'s proxy
in `live.ts:117-127` still special-cases `__blacBinding`, `bloc`, `read`,
`map`, `values` as reserved names that can't be read as ordinary state keys.

**DX-10 (STILL-OPEN)** — `Ctx.args` is still `A | undefined`
(`component.ts:22`), and `ComponentFactory<A>`'s call signature is still
`(args?: A) => unknown` regardless of whether `A` is required
(`component.ts:471-474,498-501`).

**DX-11 (STILL-OPEN)** — `when(condition: Binding, ...)` still accepts any
`Binding`, not `Binding<boolean>` (`control-flow.ts:10-14`). `match` is
still `Partial<Record<K, () => unknown>>` with no exhaustiveness signal
(`control-flow.ts:126-130`). `each`'s `key` param is still optional
(`control-flow.ts:112-116`), defaulting to Lit's index-based `repeat` when
omitted.

**DX-13 (STILL-OPEN)** — `config.ts:1-8` `BlacLitConfig` is still an empty
interface, `configureBlacLit` still just merges `{}` into `{}`, and both are
still exported publicly (`index.ts:26`). `bind`/`isBinding` are still
exported at the top level next to `select` (`index.ts:9-16`).

**DX-14 (FIXED)** — `mount.ts` now has an `owners: WeakMap<Container,
Map<RootKey, symbol>>` keyed by `renderBefore` root, assigns a per-`mount()`
`owner` symbol, and every `unmount()` call checks `owns(container, key,
owner)` before disconnecting or clearing (`mount.ts:15-35,61-76`) — a stale
handle from an earlier `mount()` into the same root is now a no-op. `mount`
also accepts and forwards a full `RenderOptions` object to `litRender`
(`mount.ts:38-56`), addressing the "no Lit options" half of the finding too.

**CA-P0-1 (FIXED)** — `BindingSession` now calls both halves of the
contract: `registerPaths()` calls `asTrackable(source).registerConsumerPaths
(this.consumerId, this.paths)` before subscribing
(`internal/binding-session.ts:113-122,144-149`), and `detachSource()` calls
`unregisterConsumer(this.consumerId)` symmetrically
(`internal/binding-session.ts:151-173`). `internal/track.ts:15-26`'s
`Trackable` interface now declares both methods as required (not optional).
`leak.test.ts:129-235` directly asserts `consumerCount` returns to baseline
across create/clear cycles, which would fail if registration were still a
no-op.

**CA-P0-2 (STILL-OPEN, CORRECTNESS)** — `internal/track.ts:87-97`
`trackedBloc()` still only intercepts the `state` property getter on the
proxy; there is no interception of `DEP_BRAND` (`packages/blac-core/src/core/StateContainer.ts:26,52,332`)
to redirect `.track()` on a cross-bloc dependency handle into the current
binding's tracking/subscription session. A Lit binding that reads through
`this.depend(Other).track()` inside a getter will get a live read but will
not re-run when only `Other`'s state changes — silent staleness, matching
the original report's description exactly. No test in
`component.test.ts`/`leak.test.ts` exercises `depend()`. Large: needs a
multi-container tracking session (register/subscribe/unregister per
container in one binding), mirroring `blac-react/src/buildTrackedProxy.ts`.

**CA-P0-3** — see DX-2 above (same finding, same fix).

**CA-P0-4** — see DX-3 above (same finding, same fix).

**CA-P1-1 (STILL-OPEN, optimization)** — Every `BindDirective`/`EachDirective`/
`ModelDirective` still owns its own `BindingSession` with its own
`channel.subscribe` call (`live.ts:42`, `control-flow.ts:40`, `forms.ts:63`).
No per-container subscriber hub exists. This was explicitly deferred by the
original report pending measurement, so its still-open status is expected,
not a regression.

**CA-P1-2 (STILL-OPEN, optimization)** — `EachDirective.render()`/`apply()`
still read the *whole* array via one `readFn` per compute and hand it to
`repeat` (`control-flow.ts:44-59,61-75`); there is still no per-row/per-id
selector primitive, so any array-reference-level change reruns the full
keyed reconciliation pass.

**CA-P1-3 (PARTIAL)** — Overlaps DX-5: `BlocView<T>` typing landed for
`component`/`ctx.use`, but `ReadFn<S = any, T = unknown>` and `select`'s
untyped generics (`live.ts:11`, `91-95`) still erase inference, and
`model`'s setter is still `(value: any) => void` (`forms.ts:131`).

## Recommended fix order

### Still-open correctness bugs (fix first)

1. **CA-P0-2 — cross-bloc `depend().track()` doesn't wake Lit bindings.**
   `packages/blac-lit/src/internal/track.ts:87-97` (`trackedBloc`) needs
   `DEP_BRAND` interception so `.track()` on a dependency handle joins the
   current `BindingSession`'s multi-container register/subscribe set,
   mirroring `packages/blac-react/src/buildTrackedProxy.ts:53-85`. This is
   the only remaining finding that produces silently wrong runtime behavior
   (a rendered value never updates when it should).

No other still-open finding causes incorrect output; the rest are
performance/ergonomics/typing/docs gaps against otherwise-correct behavior.

### Optimization / DX (fix after, roughly in impact order)

2. **CA-P1-1 — one channel subscriber per binding (O(N) fan-out).**
   `packages/blac-lit/src/internal/binding-session.ts:26-39` — needs a
   per-container binding hub before large keyed lists scale well. Large,
   profile first.
3. **CA-P1-2 — `each` rereads the whole array per row update.**
   `packages/blac-lit/src/control-flow.ts:44-59` — needs a normalized
   `ids`/`byId` pattern or a keyed row-binding primitive.
4. **DX-5 / CA-P1-3 — `select`/`ReadFn` generics still `any`.**
   `packages/blac-lit/src/live.ts:11,91-95` — infer `S`/`bloc` from the
   passed `StateContainer` type parameter.
5. **DX-9 — `Binding` leaks internals / reserves state-key names.**
   `packages/blac-lit/src/live.ts:15-20,117-127` — move `bloc`/`read`
   metadata to a `WeakMap`, narrow the public `Binding<T>` surface.
6. **DX-10 — required args are optional in types.**
   `packages/blac-lit/src/component.ts:22,471-474` — conditional-tuple call
   signature so non-`void` `A` is required.
7. **DX-7 — `model` numeric/date coercion still stringifies.**
   `packages/blac-lit/src/forms.ts:56-61,131` — add `parse`/`valueAsNumber`
   support, type the setter from the binding.
8. **DX-11 — `when`/`match`/`each` weak typing.**
   `packages/blac-lit/src/control-flow.ts:10-14,112-116,126-130`.
9. **DX-13 — empty `BlacLitConfig`, `bind`/`isBinding` promoted to top level.**
   `packages/blac-lit/src/config.ts:1-8`, `packages/blac-lit/src/index.ts:9-16,26`.
10. **DX-8 — README/DESIGN.md stale claims** (e.g. `DESIGN.md:582` still
    describes `effect` as going through core `watch`, which is no longer
    true). Doc-only, do last or opportunistically alongside each code fix.
