---
title: subscribe and consume
description: The lowest-level ways to observe a bloc — subscribe to every change, or consume a set of paths and be woken only when one of them changes. For plugins, devtools, and infrastructure.
---

The lowest-level ways to observe a bloc. Every container inherits two methods from `StructuralContainer` (the structural layer under every `Cubit`):

- `subscribe(cb)` — run `cb` after every change.
- `consume(cb)` — register a path-scoped consumer. It watches nothing until you call `setPaths`, then `cb` runs only when one of those paths changed value.

Almost no application code needs these. They exist for plugins, devtools, and infrastructure that must compose observation directly on a container. If you are inside a React component, use [`useBloc`](/docs/react/use-bloc); if you are outside React, use [`watch`](/docs/core/watch). `watch` is itself a thin wrapper around `container.subscribe(...)`.

:::note[Where this sits in the stack]
Containers no longer expose their `DirtyChannel`. The channel from the DirtyTalk engine is the internal notification core; `subscribe` and `consume` are the public surface on top of it.
:::

## Stability

`ALL_PATHS` and the `PathSet` type are **public** — `@blac/core` re-exports `ALL_PATHS` (value) and `PathSet` (type). The `PathInterner` and its numeric `PathId`s are reachable through `container.interner`, but the representation of ids can change between releases. Treat them as opaque: intern a path string through the container's own interner and pass the result back, rather than storing or comparing ids across classes.

## Signatures

```ts
subscribe(cb: (dirty: PathSet) => void): () => void
consume(cb: (dirty: PathSet) => void): Consumer
flush(): void

interface Consumer {
  readonly paths: PathSet;
  setPaths(paths: PathSet): void;
  dispose(): void;
}
```

| Member                 | Description                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscribe(cb)`        | Listens to every change. Returns an unsubscribe function. Equivalent to `consume(cb)` followed by `setPaths(ALL_PATHS)`.                                          |
| `consume(cb)`          | Registers a consumer that watches nothing until `setPaths` is called.                                                                                             |
| `consumer.setPaths(p)` | Replaces the watched paths. Pass a `Set<PathId>` for specific fields, or `ALL_PATHS` for every change. Can be called again whenever the paths change.             |
| `consumer.dispose()`   | Removes the consumer.                                                                                                                                             |
| `flush()`              | Delivers pending changes now instead of waiting for the microtask.                                                                                                |
| `consumers()`          | The live consumers (`subscribe` listeners included), for inspection and devtools. `consumerCount` is their number.                                               |

## The PathSet shape

```ts
const ALL_PATHS: unique symbol;
type AllPaths = typeof ALL_PATHS;
type PathSet = Set<PathId> | AllPaths;
type PathId = number;
```

A `PathSet` is either the **`ALL_PATHS`** sentinel ("every change") or a `Set<PathId>` of interned path ids. You get ids from the container's interner: `bloc.interner.intern('user.name')`.

The `dirty` value passed to your callback is always a `Set<PathId>` — never `ALL_PATHS`. It holds the changed ids among the paths any consumer on the container watches. When no watched path changed (for example, an `ALL_PATHS` subscriber woken by a change nobody reads), it holds only the root id, for which `interner.lookup(id) === ''`.

## The callback contract

- **Coalesced, asynchronous.** The container uses a microtask scheduler by default, so several synchronous `emit`/`patch`/`update` calls fold into a **single** flush. Your callback fires once per flush, after the current tick. See [System Events](/docs/core/system-events) for the batching model.
- **Path-scoped.** A `consume` callback runs only when one of its watched paths changed value. The new state is already applied when it runs — read `container.state` inside the callback.
- **No immediate fire.** Unlike `watch`, neither method invokes the callback on setup. If you need the current value immediately, read `container.state` yourself.
- **No work without consumers.** With no consumers, a mutation only replaces the state — no diff, no flush.
- **`patch` is `emit` of a merge.** `patch(p)` is exactly `emit(deepMerge(state, p))`, so both go through the same diff against the watched paths. Unchanged references are pruned: a patch that replaces an array with equal contents wakes readers of the whole array, but not readers of unchanged children.
- **Errors are collected, not swallowed silently.** A throw from your callback is recorded; after all consumers run, a single error re-throws as-is, and multiple throw as an `AggregateError`.

## Unsubscribe and dispose

`subscribe` returns an unsubscribe function; `consume` returns a `Consumer` whose `dispose()` does the same job. Forgetting to call either leaks the consumer for the life of the bloc.

```ts twoslash
import { Cubit } from '@blac/core';
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

// Every change.
const unsubscribe = counter.subscribe((dirty) => {
  // `dirty` is the changed PathSet; the new state is already applied.
  console.log('counter changed ->', counter.state.count);
});

counter.increment();
counter.increment(); // both fold into ONE coalesced flush next microtask

unsubscribe();
```

### Path-scoped consumer

```ts twoslash
import { Cubit, ensure } from '@blac/core';

class UserCubit extends Cubit<{ user: { name: string; email: string } }> {
  constructor() {
    super({ user: { name: 'Ada', email: 'ada@x.io' } });
  }
  rename(name: string) {
    this.patch({ user: { name } });
  }
}

const user = ensure(UserCubit);

const consumer = user.consume(() => {
  console.log('name ->', user.state.user.name);
});
consumer.setPaths(new Set([user.interner.intern('user.name')]));

user.rename('Grace'); // wakes the consumer
user.patch({ user: { email: 'g@x.io' } }); // does not

consumer.dispose();
```

:::caution[No JSX here]
This is the vanilla, outside-React surface. Do not reach for `consume` inside a component — use [`useBloc`](/docs/react/use-bloc), which records the paths your render reads and calls `setPaths` for you.
:::

## Inside React vs outside React

`subscribe` and `consume` are the floor of a three-tier API. Pick the highest tier that fits:

| Where you are                                       | Use                               | What you get                                                             |
| --------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| Inside a React component                            | [`useBloc`](/docs/react/use-bloc) | Auto-tracked, path-scoped re-renders; lifecycle tied to mount.           |
| Outside React (logging, sync, imperative UI, tests) | [`watch`](/docs/core/watch)       | The bloc **instance**, fires once immediately, multi-bloc, `watch.STOP`. |
| Building a plugin / devtools / infra                | `subscribe` / `consume`           | Raw `PathSet` deltas, no instance sugar, no immediate fire.              |

In short: **inside React → `useBloc`; outside React → `watch`** for almost everything, and **`subscribe` / `consume`** only when you are composing on the container itself. `watch` is `container.subscribe(...)` plus instance resolution, an immediate fire, and a `STOP` sentinel.

## See also

- [watch](/docs/core/watch) — the outside-React wrapper around `subscribe`; prefer it unless you need raw container access
- [Tracking](/docs/core/tracked) — how `useBloc` records the paths a render reads and passes them to `setPaths`
- [System Events](/docs/core/system-events) — the microtask flush and coalescing model behind every callback
- [DirtyTalk](https://dirtytalk.42.dog/) — the underlying channel and the `Space`/`Scheduler` model it is built on
