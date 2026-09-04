# 04 — Architecture

This file describes the structural changes that turn the current design into
one that is fast, safe under concurrent React, scalable to large state and
many instances, and pleasant to write blocs for. Each section states the
problem, the target design, and a migration path.

The engine (`@dirtytalk/engine` + `@dirtytalk/structural`) is not the problem
and is not changed here. The changes are all in `StateContainer`, the
registry, and `useBloc`.

---

## 1. `useSyncExternalStore` with a per-consumer version snapshot

### Problem

`useBloc` reads `bloc.state` directly in render and re-renders via
`useReducer`. React does not know the read is external, so concurrent renders
can tear, and the hook carries compensating code: `renderStateRef` + the R2
mount-gap check, `rebindNonce` + the `live !== bloc` handoff check,
`prevBlocRef` + selection reseeding.

### Target

```ts
function useBloc(BlocClass, options) {
  const c = useConsumer(BlocClass, options); // one lazily-created object
  useSyncExternalStore(c.subscribe, c.getSnapshot, c.getServerSnapshot);
  return c.render(); // trackRender + return tuple
}
```

- `c.getSnapshot()` returns a **version number** that the consumer bumps in
  its channel callback _only when the dirty region intersects its interest_.
  Path filtering stays exactly where it is today (interest thunk + intersect);
  the only change is that the wake-up calls `onStoreChange` instead of
  `force()`.
- `c.subscribe(onStoreChange)` subscribes the channel, registers consumer
  paths, and takes the ownership ref. Its cleanup unsubscribes and releases.
  `useSyncExternalStore` guarantees subscribe/unsubscribe pairing even across
  StrictMode double-invoke and discarded renders, so the manual
  acquire/release pairing logic (R3/R4) goes away.
- `c.render()` runs `trackRender` on the current state and returns
  `[trackedState, trackedBloc]`. Because uSES re-renders synchronously when
  the snapshot changed between render and subscribe, the mount gap is closed
  by React.
- `getServerSnapshot` returns `0`; server renders read state without
  subscribing.

### Why a version and not the state object

Auto-tracking means "did anything I read change" cannot be answered by
comparing two state references; a sibling-leaf change produces a new root
object that this consumer must ignore. A per-consumer counter that only
advances on an intersecting flush is the correct snapshot.

### Migration

Rewrite `useBloc.ts` around a `Consumer` class (see [02 §6](./02-performance.md#6-per-consumer-hook-cost)).
Keep `select` mode as a second `Consumer` strategy that computes the selection
in the subscribe callback and bumps the version on change. The public
signature does not change. Expect the file to shrink from ~940 lines to
~350.

---

## 2. Activation lifecycle and a pure render

### Problem

Instance creation and `init()` run in render (see [01 §6](./01-correctness.md#6-instance-creation-and-init-side-effects-run-inside-render)).
Blocs have no hook that runs "when the first consumer actually commits" or
"when the last consumer leaves"; `dispose()` is the only teardown and it is
terminal.

### Target

Add two lifecycle hooks on `StateContainer`, driven by the registry's ref
count:

```ts
protected onActivate(signal: AbortSignal): void | (() => void) {}
protected onDeactivate(): void {}
```

- `onActivate` fires on the **0 → 1** transition of `refs.size + dependents.size`.
  The `AbortSignal` is aborted on deactivate, so `fetch(url, { signal })` and
  event listeners get cancellation for free. A returned function is called on
  deactivate too.
- `onDeactivate` fires on **1 → 0**. For non-keepAlive blocs `dispose()`
  follows immediately, as today. For `keepAlive` blocs this is the hook that
  was missing: pause polling, close sockets, keep state.
- `init(args)` stays synchronous and is documented as _seed state only_.

With this, the render path only needs to _construct_ the instance (cheap and
side-effect free), and the registry can safely sweep instances that were
constructed but never activated:

```ts
acquire(Type, key, { countRef: false }) {
  // ...create...
  if (!countRef && !dependent) this.scheduleSweep(Type, key);
}
private scheduleSweep(Type, key) {
  queueMicrotask(() => {           // or requestIdleCallback in browsers
    const e = this.instancesByConstructor.get(Type)?.get(key);
    if (e && this.isUnowned(Type, e)) { e.instance.dispose(); /* delete */ }
  });
}
```

This is the Recoil/Jotai atom-effects model. It fixes discarded-render leaks,
SSR leaks (nothing activates on the server, everything sweeps), and double
fetches (activation happens once per ownership span, in commit, never in
render).

### Migration

1. Add the hooks and the transition logic in `acquire`/`release`/`_releaseDependent`.
2. Add the sweep for ref-less creates.
3. Update docs and examples: move `void this.load()` from `init` to
   `onActivate`.
4. Keep `init()` behaviour unchanged so existing blocs keep working; only the
   recommendation moves.

---

## 3. Tracking override instead of a `this`-Proxy

### Problem

Getter auto-tracking works by calling the getter with a Proxy receiver whose
`state` returns the render's tracking proxy (`buildTrackedProxy.ts`). That
forbids `#private` in user classes ([01 §4](./01-correctness.md#4-user-blocs-cannot-use-es-private-fields-or-methods)),
forbids `#private` in `StateContainer`/`meta.ts` (the banner comment), needs
a second Proxy per acquisition, and makes every method call from a component
run with `this` = Proxy.

### Target

Put a single override slot on the real instance and have the `state` getter
honour it:

```ts
// StructuralContainer (or StateContainer)
private _stateOverride: S | undefined;
get state(): S { return this._stateOverride ?? this._state; }

/** @internal */
[WITH_TRACKED_STATE]<R>(tracked: S, fn: () => R): R {
  const prev = this._stateOverride;
  this._stateOverride = tracked;
  try { return fn(); } finally { this._stateOverride = prev; }
}
```

`buildTrackedProxy` becomes one Proxy whose `get` trap, for getter keys,
does:

```ts
if (desc?.get) {
  const tracked = trackedStateRef.current;
  return tracked == null
    ? desc.get.call(target)
    : target[WITH_TRACKED_STATE](tracked, () => desc.get!.call(target));
}
const v = Reflect.get(target, key, target); // receiver = real instance
return typeof v === 'function' ? v.bind(target) : v; // or leave unbound
```

Properties:

- Getters run with `this` = the real instance. `#private` works everywhere.
- Getter → getter chains keep tracking because the override is still set for
  the duration of the outer call.
- Re-entrancy is safe: JS is single-threaded and the slot is restored in
  `finally`. Two consumers rendering in the same tick cannot interleave
  inside a synchronous getter call.
- Dep handles: `onDepHandle` detection moves into the same trap, checking the
  returned value for `DEP_BRAND` exactly as today.
- `thisProxy`, its allocation, and the `meta.ts` no-`#private` constraint are
  all deleted.

One caveat: a getter that _stores_ `this.state` somewhere for later would
capture the tracking proxy. That is already true today and is what
`untracked()` exists for.

---

## 4. One ownership model

### Problem

Ownership is split across `refs: Map<string, number>` and
`dependents?: Set<StateContainer>`, and the two dispose paths disagree
([01 §2](./01-correctness.md#2-release-disposes-a-dependency-that-a-live-owner-still-uses)).
Public `ensure()` creates instances with neither, which are leaks by design.
`watch()` takes a real ref, `useBloc` takes a real ref, `depend()` takes a
dependent edge, `borrow()` takes nothing.

### Target

One concept: an **owner**. An owner is anything that keeps an instance alive:
a component (`useBloc`), a `watch()` subscription, or another bloc
(`depend()`). Store owners in one `Set<OwnerToken>` where
`OwnerToken = string | StateContainer`. An instance is disposable when the
set is empty and the class is not `keepAlive`.

```ts
interface InstanceEntry {
  instance;
  key;
  owners: Set<string | StateContainer>;
  args?;
}
```

- `acquire(..., { owner })` adds; `release(..., { owner })` removes;
  `_handleDisposed(owner)` removes the owner from every entry it owns (via a
  reverse `WeakMap<StateContainer, Set<InstanceEntry>>`).
- `ensure()` becomes `acquire(Type, { owner })` and is removed from the public
  barrel, or kept only as `ensure(Type, { args, owner })`. A ref-less lookup
  is `borrow()`.
- `getRefCount` → `owners.size`; `getRefIds` → owner labels (components are
  strings, blocs are `$blac.id`). Devtools gets a richer graph for free.

### Migration

The refcount-per-refId `Map<string, number>` exists to support paired
acquire/release with the same id. With uSES doing pairing, a `Set` suffices.
Keep the count if you want to support explicit nested acquires.

---

## 5. Registry scoping through context

### Problem

`getRegistry()` is a module global mutated by `setRegistry`. Tests, SSR, and
micro-frontends all fight over it. `BlocProvider` provides args only.

### Target

```tsx
<BlacProvider registry={createRegistry()}>
  {' '}
  // optional; defaults to global
  <App />
</BlacProvider>
```

`useBloc` resolves `useContext(RegistryContext) ?? getRegistry()`. Testing
helpers render inside a `BlacProvider` instead of swapping the global. SSR
frameworks create one registry per request in the root layout and dispose it
after streaming. The `AsyncLocalStorage` recipe in the SSR guide becomes
unnecessary for React consumers; core-only consumers can still use it.

`watch()` and `acquire()` called outside React keep using the global, which
is the correct default for a client SPA.

---

## 6. Emit ordering and plugin hooks

Reorder `created` after `init()` ([01 §1](./01-correctness.md#1-persisted-state-is-discarded-for-blocs-that-seed-state-in-init)).
While touching it, tighten the plugin contract:

- `onCreated(ctx)` fires after `init()`; `ctx.container.state` is the seeded
  state.
- `onActivate(ctx)` / `onDeactivate(ctx)` mirror the new lifecycle so persist
  can start hydration on first activation rather than construction.
- `onStateChange(ctx, prev, next, paths)` is the _only_ state event; the
  registry's `stateChanged` listener API is implemented on top of it
  ([02 §2](./02-performance.md#2-three-notification-pipelines-per-emit)).

---

## 7. Scaling large state

Per-index array tracking and an append-only per-class interner are the two
places the design is O(state size) rather than O(paths read). See
[02 §7](./02-performance.md#7-per-index-array-tracking-has-a-size-cliff) for
the threshold-based coarsening and the wildcard-segment idea. The engine's
`Space` abstraction already allows a different region representation; a
`PathSet` that stores `items.*.title` as one id plus a bitmap of touched
indices would keep precision for medium lists without unbounded interning.

---

## 8. What not to change

- `DirtyChannel` + `Space` + schedulers. Small, correct, well tested.
- `PathInterner` ancestor-watch lane and the `\0` sentinel trick. Clever and
  necessary for the sibling-isolation guarantee.
- `StructuralContainer.emit/patch` diff strategy and `deepMerge` (including
  the `__proto__` guard).
- The args / deps / events three-lane model. It is the right split; it just
  needs a public API for deps ([05 §4](./05-api-and-types.md#4-the-deps-lane-has-no-public-api)).
