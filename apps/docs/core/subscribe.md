# channel.subscribe

The lowest-level way to observe a bloc. Every container owns a `channel` — a `DirtyChannel<PathSet>` from the DirtyTalk engine — and `channel.subscribe(interest, cb)` registers a callback that fires when the channel flushes a dirty region that overlaps your declared interest.

Almost no application code needs this. It exists for plugins, devtools, and infrastructure that must compose path-scoped subscriptions directly on a container. If you are inside a React component, use [`useBloc`](/react/use-bloc); if you are outside React, use [`watch`](/core/watch). `watch` is itself a thin wrapper around `channel.subscribe(() => ALL_PATHS, ...)`.

::: info Where this sits in the stack
`channel` is inherited from `StructuralContainer` (the structural layer under every `Cubit`). The same `subscribe` shape is also exposed one level up as a pass-through `container.channel.subscribe(...)`. This page documents the channel method directly, because that is the surface plugins compose against.
:::

## Stability

`channel`, `ALL_PATHS`, and the `PathSet` type are **public** — `@blac/core` re-exports `ALL_PATHS` (value) and `PathSet` (type) specifically so plugins can compose channel subscriptions. The mechanism for minting a _specific_ `PathSet` (the `PathInterner` and its numeric `PathId`s) is **`@internal`**: it is not re-exported from `@blac/core` and its representation can change between releases. In practice that means the only stable, portable interest you can construct from outside the framework is `ALL_PATHS` (observe everything). Path-scoped interests are an internal optimization that `useBloc`'s render tracker builds for itself.

## Signature

```ts
// On the channel (DirtyChannel<PathSet>), from packages/dirtytalk-engine/src/dirty-channel.ts:58
subscribe(interest: () => Region, cb: (dirty: Region) => void): () => void
```

For a bloc's channel, `Region` is instantiated as `PathSet`:

```ts
// container.channel is DirtyChannel<PathSet>, so subscribe reads as:
subscribe(interest: () => PathSet, cb: (dirty: PathSet) => void): () => void
```

| Parameter  | Type                       | Description                                                                                                                                                                                                                                    |
| ---------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interest` | `() => PathSet`            | A thunk returning the region this subscriber cares about. Re-evaluated lazily, once per flush per subscriber — **not** snapshotted at subscribe time. Skipped entirely on empty-dirty flushes. Return `ALL_PATHS` to be woken by every change. |
| `cb`       | `(dirty: PathSet) => void` | Invoked with the accumulated dirty region whenever it intersects `interest()`. The bloc's _new_ state is already applied when this runs — read `container.state` inside the callback.                                                          |
| returns    | `() => void`               | An idempotent unsubscribe closure. Safe to call more than once, and safe to call from inside the callback mid-flush.                                                                                                                           |

## The interest / PathSet shape

```ts
// packages/dirtytalk-structural/src/path-set.ts
const ALL_PATHS: unique symbol;
type AllPaths = typeof ALL_PATHS;
type PathSet = Set<PathId> | AllPaths;

// packages/dirtytalk-structural/src/types.ts
type PathId = number;
```

A `PathSet` is either:

- the **`ALL_PATHS`** sentinel — "every path", i.e. wake on any change; or
- a `Set<PathId>` of interned path ids — a specific set of fields.

`PathId`s are interned per container **class** by an internal `PathInterner`; you do not construct them by hand, and the interner is not part of the public `@blac/core` surface. Because of that, the portable interest from application/plugin code is `ALL_PATHS`. The `Set<PathId>` form is what `useBloc`'s render tracker assembles internally to get fine-grained re-renders — see [Tracking](/core/tracked).

## The callback contract

- **Coalesced, asynchronous.** The channel uses a microtask scheduler by default, so several synchronous `emit`/`patch`/`update` calls fold into a **single** flush. Your callback does not fire once per mutation; it fires once per flush, after the current tick. See [System Events](/core/system-events) for the batching model.
- **Interest is a thunk, re-run each flush.** The channel calls `interest()` lazily on every non-empty flush, then delivers only if `intersects(interest(), dirty)` is true. It is not captured once at subscribe time.
- **No immediate fire.** Unlike `watch`, `channel.subscribe` does **not** invoke the callback once on setup. It only runs on the next flush after a matching change. If you need the current value immediately, read `container.state` yourself.
- **Errors are collected, not swallowed silently.** A throw from your callback (or your interest thunk) is recorded; after all subscribers run, a single error re-throws as-is, and multiple throw as an `AggregateError`.

## Unsubscribe

`subscribe` returns an unsubscribe function. Calling it marks the subscriber dead and removes it from the channel. The closure is **idempotent** — calling it twice is a no-op — and is safe to call from inside the callback (e.g. for one-shot subscriptions). Forgetting to call it leaks the subscription for the life of the bloc.

```ts twoslash
import { Cubit, ALL_PATHS } from '@blac/core';
import { ensure } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.patch({ count: this.state.count + 1 });
  }
}

const counter = ensure(CounterCubit);

// Subscribe to ALL changes on this bloc's channel.
const unsubscribe = counter.channel.subscribe(
  () => ALL_PATHS, // interest thunk: re-run each flush
  (dirty) => {
    // `dirty` is the PathSet that changed; the new state is already applied.
    console.log('counter changed ->', counter.state.count);
  },
);

counter.increment();
counter.increment(); // both fold into ONE coalesced flush next microtask

// Later — tear down. Idempotent.
unsubscribe();
unsubscribe(); // safe no-op
```

::: warning No JSX here
This is the vanilla, outside-React surface. Do not reach for `channel.subscribe` inside a component — use [`useBloc`](/react/use-bloc), which builds a path-scoped interest for you and re-renders only on the fields you read.
:::

## Inside React vs outside React

`channel.subscribe` is the floor of a three-tier API. Pick the highest tier that fits:

| Where you are                                       | Use                          | What you get                                                             |
| --------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| Inside a React component                            | [`useBloc`](/react/use-bloc) | Auto-tracked, path-scoped re-renders; lifecycle tied to mount.           |
| Outside React (logging, sync, imperative UI, tests) | [`watch`](/core/watch)       | The bloc **instance**, fires once immediately, multi-bloc, `watch.STOP`. |
| Building a plugin / devtools / infra                | `channel.subscribe`          | Raw `PathSet` deltas, no instance sugar, no immediate fire.              |

In short: **inside React → `useBloc`; outside React → `watch`** for almost everything, and **`channel.subscribe`** only when you are composing on the channel itself. `watch` exists precisely so you rarely touch the channel directly — it is `channel.subscribe(() => ALL_PATHS, ...)` plus instance resolution, an immediate fire, and a `STOP` sentinel.

## See also

- [watch](/core/watch) — the outside-React wrapper around this method; prefer it unless you need raw channel access
- [Tracking](/core/tracked) — how `useBloc` builds a fine-grained `Set<PathId>` interest so it re-renders only on the fields you read
- [System Events](/core/system-events) — the microtask flush and coalescing model behind every channel callback
- [DirtyTalk engine: DirtyChannel](/dirtytalk/engine/api-reference#dirtychannel-region) — the underlying channel, its flush semantics, and the `Space`/`Scheduler` it is built on
