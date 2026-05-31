# watch

`useBloc` connects a bloc to a React component. But state often needs to reach code that has no component to render: a logger, an analytics pipeline, a `localStorage` sync, a `<canvas>` driven by an imperative library, or a test assertion. `watch` is the escape hatch for those cases — it observes one or more blocs **outside of React** and runs a callback whenever their state changes.

::: info watch fires on every change, not only on what you read
Unlike `useBloc`, `watch` does **not** auto-track which properties your callback reads. It subscribes to the bloc's full state and invokes your callback on _every_ change (and once immediately). If you need to react only to a specific field, compare it yourself inside the callback, or use the lower-level `channel.subscribe(interest, cb)` API. Auto-tracking is a React render-time feature — see [Tracking](/core/tracked).
:::

## `watch(bloc, callback)`

Observe one or more blocs outside React and run a callback on every state change.

```ts
// Single bloc
function watch<T extends StateContainerConstructor>(
  bloc: T | BlocRef<T>,
  callback: (bloc: InstanceType<T>) => void | typeof watch.STOP,
): () => void;

// Multiple blocs
function watch<T extends readonly BlocInput[]>(
  blocs: T,
  callback: (blocs: ExtractInstances<T>) => void | typeof watch.STOP,
): () => void;
```

| Parameter        | Type                                                   | Required | Description                                                                                                                                                            |
| ---------------- | ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bloc` / `blocs` | `T \| BlocRef<T>` or `readonly BlocInput[]`            | yes      | A bloc class (resolves to the default instance), an [`instance(Class, id)`](#watching-a-named-instance) reference, or a `readonly` array of either.                    |
| `callback`       | `(bloc: InstanceType<T>) => void \| typeof watch.STOP` | yes      | Runs once immediately with the current instance(s), then on every subsequent state change. Return `watch.STOP` to tear down the subscription from inside the callback. |

**Returns:** a `stop()` function. Calling it unsubscribes and is idempotent — calling it more than once is safe.

**Behavior.** `watch` resolves each input from the registry via `ensure` — creating the instance if it does not exist yet. It does **not** hold a ref: `watch` will not keep an otherwise-unused bloc alive, and a bloc it created can be disposed if nothing else references it. Subscriptions are coalesced per microtask flush — several synchronous mutations produce a single callback run — so callbacks land asynchronously after `emit()`. The callback fires **once immediately** on setup with the current state, then again after every subsequent change.

```ts twoslash
import { watch } from '@blac/core';
import { Cubit } from '@blac/core';

class UserCubit extends Cubit<{ name: string }> {
  constructor() {
    super({ name: 'Alice' });
  }
}

const stop = watch(UserCubit, (user) => {
  console.log('User state changed:', user.state.name);
});

// later — e.g. in a cleanup or on teardown of your module:
stop();
```

## `instance(BlocClass, args?)`

Create a reference to a specific keyed bloc instance for use with `watch`.

```ts
function instance<T extends StateContainerConstructor>(
  BlocClass: T,
  args?: ExtractArgs<T>,
): BlocRef<T>;
```

| Parameter   | Type                                  | Required | Description                                                          |
| ----------- | ------------------------------------- | -------- | -------------------------------------------------------------------- |
| `BlocClass` | `T extends StateContainerConstructor` | yes      | The bloc class to reference.                                         |
| `args`      | `ExtractArgs<T>`                      | no       | The args identifying the instance — the same args you pass to `useBloc`. Resolved to a key via `static key`/structural hash. |

**Returns:** a `BlocRef<T>` — a lightweight reference object that tells `watch` which keyed instance to resolve.

**Behavior.** By default `watch(SomeCubit, ...)` resolves the **default** instance. Wrap with `instance(Class, args)` to target the instance keyed by those args.

```ts twoslash
import { watch, instance } from '@blac/core';
import { Cubit } from '@blac/core';

class UserCubit extends Cubit<{ name: string }, { userId: string }> {
  static key = (a: { userId: string }) => a.userId;
  constructor() {
    super({ name: '' });
  }
}

const stop = watch(instance(UserCubit, { userId: 'user-123' }), (user) => {
  console.log(user.state.name);
});
```

## Stopping a watch

A watch lives until you stop it. There are two ways, and forgetting both is the most common `watch` bug.

### Call the returned stop function

```ts twoslash
import { watch } from '@blac/core';
import { Cubit } from '@blac/core';

class UserCubit extends Cubit<{ name: string }> {
  constructor() {
    super({ name: '' });
  }
}

const stop = watch(UserCubit, (user) => {
  console.log(user.state.name);
});

// later — e.g. in a cleanup, useEffect teardown, or on teardown of your module:
stop();
```

### Return `watch.STOP` from the callback

For one-shot or self-terminating watches, return the `watch.STOP` sentinel and the subscription tears itself down:

```ts twoslash
import { watch } from '@blac/core';
import { Cubit } from '@blac/core';

class UserCubit extends Cubit<{ onboardingComplete: boolean }> {
  constructor() {
    super({ onboardingComplete: false });
  }
}

declare function runOnce(): void;

watch(UserCubit, (user) => {
  if (user.state.onboardingComplete) {
    runOnce();
    return watch.STOP; // stop after the condition is met
  }
});
```

::: danger Common mistake: leaking the watcher
A `watch` you never stop keeps its subscription forever, holding a reference to the bloc and re-running your callback for the life of the process. Always either store and call `stop()`, or return `watch.STOP` once the work is done. Inside React, prefer `useBloc` over `watch`; if you must `watch` from an effect, return `stop` from the effect:

```tsx
import { useEffect } from 'react';
import { watch } from '@blac/core';

// (in a React component)
useEffect(() => {
  // const stop = watch(AuthCubit, (auth) => persistToken(auth.state.token));
  // return stop; // tear down on unmount
}, []);
```

:::

## Watching multiple blocs

Pass a `readonly` array to observe several blocs at once — the callback fires when **any** of them changes.

```ts twoslash
import { watch } from '@blac/core';
import { Cubit } from '@blac/core';

class UserCubit extends Cubit<{ name: string }> {
  constructor() {
    super({ name: '' });
  }
}

class SettingsCubit extends Cubit<{ theme: string }> {
  constructor() {
    super({ theme: 'light' });
  }
}

declare function syncToServer(name: string, theme: string): void;

// Watch several blocs at once; the callback fires when any of them changes.
const stop = watch([UserCubit, SettingsCubit] as const, ([user, settings]) => {
  syncToServer(user.state.name, settings.state.theme);
});
```

## When to use watch

| Scenario                                             | Use                                         |
| ---------------------------------------------------- | ------------------------------------------- |
| A React component needs state                        | [`useBloc`](/react/use-bloc)                |
| Non-React side effects (logging, analytics, syncing) | `watch`                                     |
| Bridging a bloc to imperative / non-React UI         | `watch`                                     |
| Test assertions on state over time                   | `watch`                                     |
| You need selective, path-scoped observation          | `container.channel.subscribe(interest, cb)` |

## Examples

### Logging state changes

```ts twoslash
import { watch } from '@blac/core';
import { Cubit } from '@blac/core';

interface CartItem {
  price: number;
}

class CartCubit extends Cubit<{ items: CartItem[] }> {
  constructor() {
    super({ items: [] });
  }

  get total() {
    return this.state.items.reduce((sum, i) => sum + i.price, 0);
  }
}

declare const logger: { info(msg: string, data: unknown): void };

const stop = watch(CartCubit, (cart) => {
  logger.info('cart changed', {
    itemCount: cart.state.items.length,
    total: cart.total, // getters work here too
  });
});
```

### Bridging to non-React code

Drive an imperative library (a chart, a map, a canvas) from bloc state without a React wrapper:

```ts twoslash
import { watch } from '@blac/core';
import { Cubit } from '@blac/core';

class MetricsCubit extends Cubit<{ series: number[] }> {
  constructor() {
    super({ series: [] });
  }
}

declare function createChart(el: HTMLElement): {
  setData(series: number[]): void;
  destroy(): void;
};

function attachChart(el: HTMLElement) {
  const chart = createChart(el);
  const stop = watch(MetricsCubit, (metrics) => {
    chart.setData(metrics.state.series);
  });
  // hand the caller a teardown that stops the watch and the chart
  return () => {
    stop();
    chart.destroy();
  };
}
```

## `watch` vs `subscribe`

Both observe a single container outside React; both fire once per microtask flush. The differences:

- **`watch`** gives you the **instance** (so getters and methods are available), accepts multiple blocs, supports `instance()` references and the `watch.STOP` sentinel, and fires once immediately on setup.
- **`subscribe`** is the lower-level legacy listener on a container; it gives you the raw **state** value and is single-bloc only. New code should prefer `watch`, or `container.channel.subscribe(interest, cb)` when you need path-scoped interest.

```ts twoslash
import { watch, ensure } from '@blac/core';
import { Cubit } from '@blac/core';

class UserCubit extends Cubit<{ name: string }> {
  constructor() {
    super({ name: '' });
  }
}

// subscribe: raw state, single bloc
const unsub = ensure(UserCubit).subscribe((state) => {
  console.log(state.name);
});

// watch: the instance, fires immediately, supports STOP and multiple blocs
const stop = watch(UserCubit, (user) => {
  console.log(user.state.name);
});
```

## See also

- [System Events](/core/system-events) — the microtask flush and coalescing model behind `watch`
- [Tracking](/core/tracked) — why `watch` does not auto-track, and how `useBloc` does
- [Dependency Tracking](/react/dependency-tracking) — the React side of selective re-renders
