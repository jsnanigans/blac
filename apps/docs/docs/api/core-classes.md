# Core Classes

Blac provides three primary classes for state management:

## BlocBase&lt;S, P&gt;

`BlocBase` is the abstract base class for all state containers in Blac.

### Type Parameters

- `S` - The state type
- `P` - The props type (optional)

### Properties

| Name         | Type        | Description                                              |
| ------------ | ----------- | -------------------------------------------------------- |
| `state`      | `S`         | The current state of the container                       |
| `props`      | `P \| null` | Props passed during Bloc instance creation (can be null) |
| `lastUpdate` | `number`    | Timestamp when the state was last updated                |

### Static Properties

| Name        | Type      | Default | Description                                                           |
| ----------- | --------- | ------- | --------------------------------------------------------------------- |
| `isolated`  | `boolean` | `false` | When true, every consumer will receive its own unique instance        |
| `keepAlive` | `boolean` | `false` | When true, the instance persists even when no components are using it |

### Methods

| Name | Parameters                                                           | Return Type  | Description                                                     |
| ---- | -------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| `on` | `event: BlacEvent, listener: StateListener<S>, signal?: AbortSignal` | `() => void` | Subscribes to state changes and returns an unsubscribe function |

## Cubit&lt;S, P&gt;

`Cubit` is a simple state container that extends `BlocBase`. It's ideal for simpler state management needs.

### Type Parameters

- `S` - The state type
- `P` - The props type (optional, defaults to null)

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

## Bloc&lt;S, E, P&gt;

`Bloc` is a more sophisticated state container that uses an event-handler pattern. It extends `BlocBase` and manages state transitions by registering handlers for specific event classes.

### Type Parameters

- `S` - The state type
- `E` - The base type or union of event classes that this Bloc can process.
- `P` - The props type (optional)

### Constructor

```tsx
constructor(initialState: S)
```

### Methods

| Name  | Parameters                                                                                                                                  | Return Type | Description                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `on`  | `eventConstructor: new (...args: any[]) => E, handler: (event: InstanceType<typeof eventConstructor>, emit: (newState: S) => void) => void` | `void`      | Registers an event handler for a specific event class.                                                             |
| `add` | `event: E`                                                                                                                                  | `void`      | Dispatches an event instance to its registered handler. The handler is looked up based on the event's constructor. |

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
    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.value });
    });

    this.on(DecrementEvent, (_event, emit) => {
      emit({ count: this.state.count - 1 });
    });

    this.on(ResetEvent, (_event, emit) => {
      emit({ count: 0 });
    });
  }

  // Helper methods to dispatch events (optional but common)
  increment = (value?: number) => this.add(new IncrementEvent(value));
  decrement = () => this.add(new DecrementEvent());
  reset = () => this.add(new ResetEvent());
}
```

## BlacEvent

`BlacEvent` is an enum that defines the different events that can be dispatched by Blac.

| Event         | Description                                            |
| ------------- | ------------------------------------------------------ |
| `StateChange` | Triggered when a state changes                         |
| `Error`       | Triggered when an error occurs                         |
| `Action`      | Triggered when an event is dispatched via `bloc.add()` |

## Choosing Between Cubit and Bloc

- Use **Cubit** for simpler state logic where direct state emission (`emit`, `patch`) is sufficient.
- Use **Bloc** for more complex state logic, when you want to process distinct event types with dedicated handlers, or when you need a more formal event-driven approach to manage state transitions.
