# watch

`useBloc` connects a bloc to a React component. But state often needs to reach code that has no component to render: a logger, an analytics pipeline, a `localStorage` sync, a `<canvas>` driven by an imperative library, or a test assertion. `watch` is the escape hatch for those cases — it observes one or more blocs **outside of React** and runs a callback whenever their state changes.

```ts
import { watch } from '@blac/core';

const stop = watch(UserCubit, (user) => {
  console.log('User state changed:', user.state.name);
});
```

::: info watch fires on every change, not only on what you read
Unlike `useBloc`, `watch` does **not** auto-track which properties your callback reads. It subscribes to the bloc's full state and invokes your callback on *every* change (and once immediately). If you need to react only to a specific field, compare it yourself inside the callback, or use the lower-level `channel.subscribe(interest, cb)` API. Auto-tracking is a React render-time feature — see [Tracking](/core/tracked).
:::

## Signature

```ts
// Single bloc
watch<T>(
  bloc: T | BlocRef<T>,
  callback: (bloc: InstanceType<T>) => void | typeof watch.STOP,
): () => void;

// Multiple blocs
watch<T extends readonly BlocInput[]>(
  blocs: T,
  callback: (blocs: ExtractInstances<T>) => void | typeof watch.STOP,
): () => void;
```

| Parameter | Description |
| --- | --- |
| `bloc` / `blocs` | A bloc class (resolves to the default instance), a [`instance(Class, id)`](#watching-a-named-instance) reference, or a `readonly` array of either. |
| `callback` | Runs once immediately with the current instance(s), then on every subsequent change. Return `watch.STOP` to tear down. |
| returns | A `stop()` function. Idempotent — calling it more than once is safe. |

```ts
import { watch } from '@blac/core';

// Watch several blocs at once; the callback fires when any of them changes.
const stop = watch([UserCubit, SettingsCubit] as const, ([user, settings]) => {
  syncToServer(user.state, settings.state.theme);
});
```

## How it works

1. `watch` resolves each input from the registry via `ensure` — creating the instance if it does not exist yet. **It does not hold a ref**: `watch` will not keep an otherwise-unused bloc alive, and a bloc it created can be disposed if nothing else references it.
2. It subscribes to each bloc's channel for **all** state changes.
3. It invokes your callback **once immediately** with the current state, then again after every change.
4. Notifications are coalesced per microtask flush — several synchronous mutations produce a single callback run — so callbacks land asynchronously after `emit()`. See [System Events](/core/system-events) for the batching model.

## Stopping a watch

A watch lives until you stop it. There are two ways, and forgetting both is the most common `watch` bug.

### Call the returned stop function

```ts
const stop = watch(UserCubit, (user) => {
  console.log(user.state.name);
});

// later — e.g. in a cleanup, useEffect teardown, or on teardown of your module:
stop();
```

### Return `watch.STOP` from the callback

For one-shot or self-terminating watches, return the `watch.STOP` sentinel and the subscription tears itself down:

```ts
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
useEffect(() => {
  const stop = watch(AuthCubit, (auth) => persistToken(auth.state.token));
  return stop; // tear down on unmount
}, []);
```
:::

## Watching a named instance

By default `watch(SomeCubit, ...)` resolves the **default** instance. To watch a specific keyed instance, wrap it with `instance(Class, id)`:

```ts
import { watch, instance } from '@blac/core';

const stop = watch(instance(UserCubit, 'user-123'), (user) => {
  console.log(user.state.name);
});
```

`instance(Class, id)` produces a lightweight reference (`BlocRef`) that tells `watch` which keyed instance to resolve — the same `id` you would pass as `instanceId` to `useBloc`.

## When to use watch

| Scenario | Use |
| --- | --- |
| A React component needs state | [`useBloc`](/react/use-bloc) |
| Non-React side effects (logging, analytics, syncing) | `watch` |
| Bridging a bloc to imperative / non-React UI | `watch` |
| Test assertions on state over time | `watch` |
| You need selective, path-scoped observation | `container.channel.subscribe(interest, cb)` |

## Examples

### Logging state changes

```ts
import { watch } from '@blac/core';

const stop = watch(CartCubit, (cart) => {
  logger.info('cart changed', {
    itemCount: cart.state.items.length,
    total: cart.total, // getters work here too
  });
});
```

### Bridging to non-React code

Drive an imperative library (a chart, a map, a canvas) from bloc state without a React wrapper:

```ts
import { watch } from '@blac/core';

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

## watch vs subscribe

Both observe a single container outside React; both fire once per microtask flush. The differences:

- **`watch`** gives you the **instance** (so getters and methods are available), accepts multiple blocs, supports `instance()` references and the `watch.STOP` sentinel, and fires once immediately on setup.
- **`subscribe`** is the lower-level legacy listener on a container; it gives you the raw **state** value and is single-bloc only. New code should prefer `watch`, or `container.channel.subscribe(interest, cb)` when you need path-scoped interest.

```ts
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
