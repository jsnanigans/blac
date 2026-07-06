# `depend()` has no reactive `.onChange` with owner-scoped auto-cleanup

**Impact: Medium** — v2 ships full non-render subscription support, so a
plain Cubit reacting to another Cubit's state changes outside any component
is fully possible today. The residual gap is narrower than we first framed
it: those subscription primitives aren't integrated with `depend()`'s handle,
and neither they nor `depend()` itself offer owner-scoped auto-cleanup — so
every "coordinator" Cubit still hand-rolls its own subscribe/unsubscribe
bookkeeping, just via a documented API instead of a private one.

## Correcting the premise

We previously described this as "no supported way to use `depend()`" for the
"react to another Cubit's changes outside React" case. That's not accurate —
v2 ships two first-class, documented ways to do exactly this:

- **`watch(BlocClass | instance(BlocClass, key), callback)`** — the README's
  own "Watch — Observe state changes outside of a UI framework" section:
  ```ts
  const stop = watch(CounterCubit, (c) => {
    if (c.state.count >= 10) return watch.STOP;
  });
  ```
  It also supports a specific keyed instance (`watch(instance(CounterCubit,
  'counter-1'), cb)`) and multiple Cubits at once
  (`watch([BlocA, BlocB], (a, b) => ...)`). Returns an unsubscribe function.
- **`container.onSystemEvent(event, handler)`** — every `StateContainer`
  exposes this publicly for `'stateChanged' | 'dispose' | 'hydrationChanged'`,
  with the `stateChanged` payload shaped as `{ state, previousState }`, also
  returning an unsubscribe function. There's also `this.channel.subscribe(interest,
  cb)` for path-scoped subscription.

So "react to another Cubit's changes, outside of any component" is fully
supported and documented — not a dead end.

## The real gap

Two narrower things are still missing:

**1. These subscriptions aren't wired through `depend()`'s handle.** A Cubit
that already called `this.depend(OtherCubit)` to resolve another Cubit still
has to reach for a *separate*, unrelated call (`watch` or `onSystemEvent`) to
react to it — the handle itself has no subscribe method:

```ts
type DepHandle<T> = {
  track(options?): [state, instance];  // React render subscription
  untracked(options?): instance;        // one-shot read
  // no onChange — reactivity outside React means reaching for watch()/
  // onSystemEvent() on the resolved instance separately
};
```

**2. Neither `watch()` nor `onSystemEvent()` bind their unsubscribe to the
calling Cubit's own lifecycle.** The owning Cubit must store the returned
stop function itself and call it in its own `dispose()`, or the subscription
leaks for the owner's lifetime:

```ts
class UrlSyncCubit extends Cubit<UrlSyncState> {
  private stopWatching: (() => void) | null = null;

  init = () => {
    const manager = this.depend(WorkspaceManagerCubit).untracked();
    // watch()/onSystemEvent() work fine here — the gap is that nothing
    // ties this subscription's lifetime to UrlSyncCubit's own disposal.
    this.stopWatching = manager.onSystemEvent("stateChanged", () => {
      this.onManagerChange();
    });
  };

  _dispose(): void {
    this.stopWatching?.(); // easy to forget — see report #6
    super._dispose();
  }
}
```

This pattern recurs independently across several Cubits in our codebase —
each one correctly using a documented v2 primitive, but each one hand-rolling
its own bookkeeping and its own `_dispose()` override just to unwind it.

## Suggested API

Add a subscribe method to the dependency handle itself, implemented on the
same primitive `watch`/`onSystemEvent` already use, but tracked per-owner so
the *owning* Cubit's `dispose()` sweeps it automatically — the same way it
already sweeps its own dependencies:

```ts
class UrlSyncCubit extends Cubit<UrlSyncState> {
  private managerDep = this.depend(WorkspaceManagerCubit);

  init = () => {
    // fires fn(state, instance) on every state change; auto-unsubscribed
    // when `this` (UrlSyncCubit) is disposed — no manual _dispose()
    // override needed just for this.
    this.managerDep.onChange((state, instance) => this.onManagerChange(state, instance));
  };

  private onManagerChange = (state: WorkspaceManagerState, manager: WorkspaceManagerCubit) => {
    // ...
  };
}
```

Minimal shape:

```ts
interface DepHandle<T> {
  track(options?): [state, instance];
  untracked(options?): instance;
  onChange(fn: (state, instance: T) => void): () => void; // returns unsubscribe
}
```

## Why this is worth prioritizing

The building blocks already exist and are solid — `watch`, `onSystemEvent`,
and the `depend()` handle are each independently well-designed. This is
purely about connecting them: exposing the existing subscription primitive
through the handle a Cubit already holds, and giving it the same
owner-scoped auto-disposal that `depend()`'s other resolution paths already
benefit from. Shipping it would let "coordinator" Cubits (URL sync,
analytics, cross-cubit cache invalidation) use `depend()` end-to-end instead
of pairing it with a second, separately-managed subscription call.
