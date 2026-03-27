# System Events

System events are lifecycle hooks within a state container instance. Use them to react to state changes, disposal, or hydration status inside your class.

```ts
class MyCubit extends Cubit<MyState> {
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

## Available events

### `stateChanged`

Fired after every state change via `emit`, `update`, or `patch`.

```ts
this.onSystemEvent('stateChanged', ({ state, previousState }) => {
  // state: the new state
  // previousState: the state before the change
});
```

### `dispose`

Fired when the instance is disposed (ref count reaches zero or `dispose()` is called directly).

```ts
this.onSystemEvent('dispose', () => {
  // clean up timers, subscriptions, etc.
});
```

### `hydrationChanged`

Fired when the hydration status changes. Relevant when using the [Persistence plugin](/plugins/persistence).

```ts
this.onSystemEvent(
  'hydrationChanged',
  ({ status, previousStatus, error, changedWhileHydrating }) => {
    // status: 'idle' | 'hydrating' | 'hydrated' | 'error'
    // previousStatus: the status before the change
    // error: Error object if status is 'error'
    // changedWhileHydrating: true if state was modified before hydration completed
  },
);
```

## Unsubscribing

`onSystemEvent` returns an unsubscribe function:

```ts
const unsub = this.onSystemEvent('stateChanged', handler);
// later:
unsub();
```

## System events vs plugins

|              | System events                           | Plugins                                    |
| ------------ | --------------------------------------- | ------------------------------------------ |
| **Scope**    | Single instance                         | All instances                              |
| **Access**   | Inside the class (`this.onSystemEvent`) | Global via `getPluginManager()`            |
| **Use case** | Instance-specific side effects          | Cross-cutting concerns (logging, devtools) |

Use system events for cleanup logic, derived computations, or side effects that belong to one specific instance. Use [plugins](/core/plugins) for behavior that applies across all state containers.

See also: [Plugins](/core/plugins), [Persistence](/plugins/persistence)
