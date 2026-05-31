# System events

System events are lifecycle hooks **inside a single state container instance**. Use them to react to that instance's own state changes, disposal, or hydration status — from within the class, without any external wiring. Every signature on this page is quoted from the `@blac/core` source.

**Why they exist:** sometimes a bloc needs to do something in response to its own lifecycle — tear down a timer when it's disposed, kick off a derived computation when its state settles, log a transition. `onSystemEvent` is the in-class hook for exactly that. It is the per-instance counterpart to [plugins](/core/plugins), which observe the same kinds of events but across _every_ instance (see [the comparison below](#system-events-vs-plugins)).

## Available events

```ts twoslash
type SystemEvent = 'stateChanged' | 'dispose' | 'hydrationChanged';
```

## `onSystemEvent(event, handler)`

Register a handler for a lifecycle event on this instance.

```ts
protected onSystemEvent = <E extends SystemEvent>(
  event: E,
  handler: SystemEventHandler<S, E>,
): (() => void)
```

| Parameter | Type                       | Required | Description                                                                            |
| --------- | -------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `event`   | `SystemEvent`              | yes      | The event name: `'stateChanged'`, `'dispose'`, or `'hydrationChanged'`.                |
| `handler` | `SystemEventHandler<S, E>` | yes      | Callback receiving the event payload. The payload shape differs per event (see below). |

**Returns:** `() => void` — an unsubscribe function. Call it to remove the handler before the instance is disposed. For handlers that should live as long as the instance, you can discard the return value — all handlers are torn down automatically on `dispose`.

**Behavior.** A protected method — only callable inside the class. Handlers added for the same event are fired in registration order. Registering in the constructor (or in `init`) ensures handlers are wired before the instance starts emitting. `dispose` tears down all registered handlers automatically, so no manual cleanup is needed for instance-lifetime handlers.

::: tip Where to register handlers
Register handlers in the constructor (or in `init`) so they're wired before the instance starts emitting. For handlers with a lifetime shorter than the instance (e.g. conditional subscriptions), hold onto the returned unsubscribe function and call it when done.
:::

```ts twoslash
import { Cubit } from '@blac/core';

class MyCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });

    this.onSystemEvent('stateChanged', ({ state, previousState }) => {
      console.log('State changed:', previousState, '->', state);
    });

    this.onSystemEvent('dispose', () => {
      console.log('Instance disposed');
    });
  }
}
```

## Event payloads

The handler argument differs by event. The payload types are:

```ts
interface SystemEventPayloads<S> {
  stateChanged: { state: S; previousState: S };
  dispose: void;
  hydrationChanged: {
    status: HydrationStatus;
    previousStatus: HydrationStatus;
    error?: Error;
    changedWhileHydrating: boolean;
  };
}
```

### `stateChanged`

Fired once per **microtask flush** after state changes via `emit`, `update`, or `patch`. Multiple synchronous mutations are coalesced — the handler receives the final state once, not once per call.

| Payload field   | Type | Description                                   |
| --------------- | ---- | --------------------------------------------- |
| `state`         | `S`  | The final state after the flush.              |
| `previousState` | `S`  | The state before any mutations in this flush. |

::: info Why once-per-flush?
A single user action often triggers several `emit`/`patch` calls in a row. If `stateChanged` fired on each one, every handler (and every subscriber and plugin downstream) would run multiple times for one logical change, with `previousState` pointing at transient in-between values nobody cares about. BlaC instead **coalesces** all synchronous mutations into one flush on the next microtask: `previousState` is the state before the _first_ mutation, `state` is the state after the _last_. That keeps handlers cheap and consistent, and it's the same batching model plugins' `onStateChange` and [`watch`](/core/watch) callbacks ride on. The trade-off: your handler runs **asynchronously**, just after the current synchronous code finishes — not inside the `emit` call.
:::

```ts twoslash
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });

    this.onSystemEvent('stateChanged', ({ state, previousState }) => {
      // state: the final state after the flush
      // previousState: the state before any mutations in this flush
      console.log(`count: ${previousState.count} -> ${state.count}`);
    });
  }

  increment = () => this.update((s) => ({ count: s.count + 1 }));
}
```

### `dispose`

Fired when the instance is disposed (ref count reaches zero or `dispose()` is called directly). This is your hook to release anything the instance set up that the registry can't clean up for you.

**Payload:** `void` — no payload; the instance is already disposed when this fires.

::: tip The dispose hook is your `componentWillUnmount`
If a bloc starts a `setInterval`, opens a WebSocket, or subscribes to something external in its constructor/`init`, the `dispose` event is where you stop it. The registry disposes the instance the moment its last consumer releases (see [Instance Management](/core/instance-management)); without a `dispose` handler, those external resources keep running after the bloc is gone.
:::

```ts twoslash
import { Cubit } from '@blac/core';

class PollingCubit extends Cubit<{ data: string | null }> {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({ data: null });

    this.timer = setInterval(() => {
      this.patch({ data: new Date().toISOString() });
    }, 1000);

    this.onSystemEvent('dispose', () => {
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    });
  }
}
```

### `hydrationChanged`

Fired when the hydration status changes. Relevant when using the [Persistence plugin](/plugins/persistence).

| Payload field           | Type                   | Description                                                             |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `status`                | `HydrationStatus`      | The new status: `'idle'` \| `'hydrating'` \| `'hydrated'` \| `'error'`. |
| `previousStatus`        | `HydrationStatus`      | The status before the change.                                           |
| `error`                 | `Error` \| `undefined` | Present when `status` is `'error'`.                                     |
| `changedWhileHydrating` | `boolean`              | `true` if state was modified before hydration completed.                |

**Returns:** `void`.

`changedWhileHydrating` is the signal that the bloc emitted real state _while_ async hydration was in flight — the persistence layer uses it to decide whether the just-loaded persisted state is stale and should be discarded. See [Persistence](/plugins/persistence) for the full hydration lifecycle.

```ts twoslash
import { Cubit } from '@blac/core';

class StoredCubit extends Cubit<{ value: string }> {
  constructor() {
    super({ value: '' });

    this.onSystemEvent(
      'hydrationChanged',
      ({ status, previousStatus, error, changedWhileHydrating }) => {
        if (status === 'error' && error) {
          console.error('Hydration failed:', error.message);
        }
        if (changedWhileHydrating) {
          console.warn(
            'State changed before hydration finished — persisted state may be stale',
          );
        }
        console.log(`${previousStatus} -> ${status}`);
      },
    );
  }
}
```

## Unsubscribing

`onSystemEvent` returns an unsubscribe function:

```ts twoslash
import { Cubit } from '@blac/core';

class ExampleCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });

    const unsub = this.onSystemEvent('stateChanged', ({ state }) => {
      console.log(state);
    });
    // Call unsub() to remove the handler early — before the instance is disposed.
    // For instance-lifetime handlers you can discard the return value.
    unsub();
  }
}
```

You only need to call this for handlers with a lifetime shorter than the instance (e.g. one registered conditionally). Handlers that should live for the whole instance need no manual cleanup — `dispose` tears them all down.

## System events vs plugins

Both observe lifecycle, and they share the same coalesced-flush model — the difference is **scope** and **where the code lives**:

|              | System events                           | Plugins                                    |
| ------------ | --------------------------------------- | ------------------------------------------ |
| **Scope**    | Single instance                         | All instances                              |
| **Access**   | Inside the class (`this.onSystemEvent`) | Global via `getPluginManager()`            |
| **Use case** | Instance-specific side effects          | Cross-cutting concerns (logging, devtools) |

Use system events for cleanup logic, derived computations, or side effects that belong to **one specific instance**. Use [plugins](/core/plugins) for behavior that applies **across all** state containers.

A useful way to see the relationship: a `stateChanged` system handler and a plugin's `onStateChange` hook fire off the _same_ underlying flush. The system event is the narrow, in-class view (this instance only, payload `{ state, previousState }`); the plugin hook is the broad, external view (every instance, plus the changed `paths` and a rich `PluginContext`). Reach for whichever scope matches the job — don't install a plugin to do one instance's cleanup, and don't try to make a system handler observe the whole app.

::: warning Common mistakes
**Don't emit from inside a `stateChanged` handler.** Mutating this bloc's state inside its own `stateChanged` handler schedules another flush, which fires the handler again — an unbounded feedback loop. (BlaC's dev-only emit-rate breaker will eventually `console.warn`, but the loop is still a bug.) Derive values without emitting, or move the write behind a guard that can't re-trigger.

**Don't do heavy synchronous work in `stateChanged`.** It runs on every flush; expensive work there compounds with frequent updates. Debounce, or move the work into the action that caused the change.

**Don't rely on `stateChanged` firing synchronously.** It's microtask-deferred, so code reading a side effect immediately after `emit()` won't see it yet. If you need the value right away, read `this.state` directly instead of waiting on the event.
:::

## See also

- [Plugins](/core/plugins) — the same lifecycle hooks observed across all instances
- [watch](/core/watch) — observe a bloc's changes from outside the class (rides the same flush)
- [Instance Management](/core/instance-management) — what triggers the `dispose` event
- [Persistence](/plugins/persistence) — the real-world consumer of `hydrationChanged`
