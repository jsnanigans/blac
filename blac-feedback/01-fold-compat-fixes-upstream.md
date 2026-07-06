# Ship a typed cross-cutting event bus (the one real v2 gap behind the compat shim)

**Impact: Medium** — a compat shim exists in our monorepo, but three of the
four things we originally attributed to it patching "v2 gaps" turn out to be
either already shipped natively or a deliberate v1-mental-model shim rather
than a v2 bug. The one genuine gap is a typed cross-cutting event bus, which
several of our Cubits depend on for global-reset behavior with no native v2
equivalent.

## Correcting the premise

Our compat shim's own module header states its purpose plainly, and it's
narrower than we first characterized it:

```ts
// packages/blac-compat/src/index.ts (paraphrased from the real file)
// Compatibility shim exposing v0 and v1 API surfaces backed by v2 internals.
// Seams where v0/v1 behavior can't be expressed with the v2 API as shipped
// are tagged V2-DRIFT, so they can be revisited when v2 gains parity.
```

That's a **v0/v1 API-compatibility layer for unmigrated code**, not primarily
a v2-bug patch layer. Most of what it re-implements turns out to be emulating
an *old* mental model that v2 intentionally replaced, not covering something
v2 is missing. Walking through what we originally listed as four "gaps":

### (a) Render-loop / stable-selector fix — already ships

We previously described a stable-selector wrapper in the shim as a fix for a
real `useBloc` render-loop bug. It is real, but v2 already ships the fix
natively as `useBloc(MyCubit, { select: (state) => [state.count] })`. The
residual issue here is a documentation/default-ergonomics gap, not a missing
feature — see report #8 for the full writeup; we won't re-argue it here.

### (b) Single-shot `props`/`initWithProps` semantics — not a v2 gap

v1 supported constructing a Cubit once with `props` and never re-applying
them on remount. v2 doesn't need an equivalent guard, because it deliberately
replaced v1 "props" with **args-as-identity plus the `Deps` lane**: `init(args)`
is guaranteed to run exactly once per resolved instance (the registry
constructs-then-caches; the same args resolve the same instance on every
subsequent call), and non-serializable per-mount values go through
`this.deps`, not through parameter reapplication. The shim's `WeakSet`-guarded
idempotency check is emulating a v1 problem that v2's identity model doesn't
have in the first place.

### (c) Per-mount "isolated" instances — ships as a documented idiom

v1's `{ isolated: true }` gave each mount its own private instance instead of
sharing the registry singleton for a key. v2 ships this today as the
documented idiom `useBloc(MyBloc, { args: { _id: useId() } })` — a unique arg
per mount is a unique identity, which is exactly "isolated." The residual gap
is minor DX: there's no named `{ isolated: true }` sugar for this, so every
consumer has to know to reach for `useId()` inside `args` themselves.

### (d) A v0/v1 event bus — genuinely absent

v1 shipped `BlacEvent`, a lightweight typed pub/sub primitive for
cross-cutting concerns like "user logged out → reset all session-scoped
state." **v2 has no built-in equivalent.** `Blac`'s registry-level
`clearAll()` / per-class `clear(Type)` cover part of the "reset on logout"
use case (dispose everything, or everything of one class), but neither is a
general typed event channel — there's no way to broadcast an arbitrary
application event and have arbitrary Cubits react to it without each one
separately wiring up `watch`/`onSystemEvent` against a designated "event"
Cubit as a workaround. Our shim re-implements a real pub/sub bus from
scratch, and several Cubits in our codebase depend on it for this reason (see
report #6 for how event-driven reset interacts with disposal).

## Why this matters

Once (a)-(c) are set aside as already-shipped or not-actually-a-v2-gap, the
compat shim's remaining unique-to-v2 responsibility is small: a typed event
bus. That's a modest, well-scoped ask, not a call to fold "an entire
compatibility layer" upstream — most of the shim exists to serve unmigrated
v0/v1 call sites, which is exactly what it says it's for.

## Suggested fix

Ship a minimal typed event-bus primitive on the core surface, e.g.:

```ts
Blac.emit(event, payload);
const off = Blac.on(eventType, handler); // returns unsubscribe
```

Alternatively, if a first-class bus is out of scope, document a recipe for
this use case built from what already exists (`watch`/`onSystemEvent` plus
`clearAll()`/`clear(Type)`), so consumers aren't pushed toward hand-rolling
one per app.

## Evidence

- Compat shim's own header: "Compatibility shim exposing v0 and v1 API
  surfaces backed by v2 internals," seams tagged `V2-DRIFT`.
- `useBloc`'s shipped `select` option (see report #8) already covers the
  stable-selector case.
- `init(args)` single-construction guarantee + `Deps` lane, per the shipped
  `.d.ts` and README ("Deps: Non-Serializable Handles").
- Documented `useBloc(MyBloc, { args: { _id: useId() } })` per-mount idiom.
- Compat shim's `BlacEvent`/event-bus module, with no `@blac/core`/`@blac/react`
  typed pub/sub equivalent found anywhere in the shipped `dist`.
