# Core Classes

Blac provides three primary classes for state management:

## BlocBase<S>

`BlocBase` is the abstract base class for all state containers in Blac.

### Type Parameters

- `S` - The state type

### Properties

| Name                | Type     | Description                               |
| ------------------- | -------- | ----------------------------------------- |
| `state`             | `S`      | The current state of the container        |
| `lastUpdate`        | `number` | Timestamp when the state was last updated |
| `subscriptionCount` | `number` | Number of active subscriptions            |

### Static Properties

| Name        | Type           | Default     | Description                                                           |
| ----------- | -------------- | ----------- | --------------------------------------------------------------------- |
| `isolated`  | `boolean`      | `false`     | When true, every consumer will receive its own unique instance        |
| `keepAlive` | `boolean`      | `false`     | When true, the instance persists even when no components are using it |
| `plugins`   | `BlocPlugin[]` | `undefined` | Array of plugins to automatically attach to instances                 |

### Methods

| Name                    | Parameters                                                                                      | Return Type  | Description                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| `subscribe`             | `callback: (state: S) => void`                                                                  | `() => void` | Subscribes to state changes and returns an unsubscribe function |
| `subscribeWithSelector` | `selector: (state: S) => T, callback: (value: T) => void, equalityFn?: (a: T, b: T) => boolean` | `() => void` | Subscribe with a selector for optimized updates                 |
| `onDispose`             | Optional method                                                                                 | `void`       | Override to perform cleanup when the instance is disposed       |

## Cubit<S>

`Cubit` is a simple state container that extends `BlocBase`. It's ideal for simpler state management needs.

### Type Parameters

- `S` - The state type

### Constructor

```tsx
constructor(initialState: S)
```

### Methods

| Name    | Parameters                                                                   | Return Type | Description                              |
| ------- | ---------------------------------------------------------------------------- | ----------- | ---------------------------------------- |
| `emit`  | `state: S`                                                                   | `void`      | Replaces the entire state                |
| `patch` | `statePatch: S extends object ? Partial<S> : S, ignoreChangeCheck?: boolean` | `void`      | Updates specific properties of the state |

### Example

```tsx
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  // IMPORTANT: Always use arrow functions for React compatibility
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };

  // Using patch to update specific properties
  reset = () => {
    this.patch({ count: 0 });
  };
}
```

## Bloc<S, A extends BlocEventConstraint>

`Bloc` is a more sophisticated state container that uses an event-handler pattern. It extends `BlocBase` and manages state transitions by registering handlers for specific event classes.

### Type Parameters

- `S` - The state type
- `A` - The base type or union of event classes that this Bloc can process (must be class instances, not plain objects)

### Constructor

```tsx
constructor(initialState: S)
```

### Methods

| Name  | Parameters                                                                                                               | Return Type     | Description                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------- |
| `on`  | `eventConstructor: new (...args: any[]) => E, handler: (event: E, emit: (newState: S) => void) => void \| Promise<void>` | `void`          | Registers an event handler for a specific event class. Protected method called in constructor. |
| `add` | `event: A`                                                                                                               | `Promise<void>` | Dispatches an event instance to its registered handler. Events are processed sequentially.     |

### Example

```tsx
// Define event classes
class IncrementEvent {
  constructor(public readonly value: number = 1) {}
}
class DecrementEvent {}
class ResetEvent {}

// Union type for all possible event classes (optional but can be useful)
type CounterEvent = IncrementEvent | DecrementEvent | ResetEvent;

class CounterBloc extends Bloc<{ count: number }, CounterEvent> {
  constructor() {
    super({ count: 0 });

    // Register event handlers
    this.on(IncrementEvent, this.handleIncrement);
    this.on(DecrementEvent, this.handleDecrement);
    this.on(ResetEvent, this.handleReset);
  }

  // IMPORTANT: Always use arrow functions for proper this binding
  private handleIncrement = (
    event: IncrementEvent,
    emit: (state: { count: number }) => void,
  ) => {
    emit({ count: this.state.count + event.value });
  };

  private handleDecrement = (
    event: DecrementEvent,
    emit: (state: { count: number }) => void,
  ) => {
    emit({ count: this.state.count - 1 });
  };

  private handleReset = (
    event: ResetEvent,
    emit: (state: { count: number }) => void,
  ) => {
    emit({ count: 0 });
  };

  // Helper methods to dispatch events (optional but common)
  increment = (value?: number) => this.add(new IncrementEvent(value));
  decrement = () => this.add(new DecrementEvent());
  reset = () => this.add(new ResetEvent());
}
```

## Choosing Between Cubit and Bloc

- Use **Cubit** for simpler state logic where direct state emission (`emit`, `patch`) is sufficient.
- Use **Bloc** for more complex state logic, when you want to process distinct event types with dedicated handlers, or when you need a more formal event-driven approach to manage state transitions.
