# Core Classes

Blac provides three primary classes for state management:

## BlocBase&lt;S, P&gt;

`BlocBase` is the abstract base class for all state containers in Blac.

### Type Parameters

- `S` - The state type
- `P` - The props type (optional)

### Properties

| Name | Type | Description |
|------|------|-------------|
| `state` | `S` | The current state of the container |
| `props` | `P \| null` | Props passed during Bloc instance creation (can be null) |
| `lastUpdate` | `number` | Timestamp when the state was last updated |

### Static Properties

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `isolated` | `boolean` | `false` | When true, every consumer will receive its own unique instance |
| `keepAlive` | `boolean` | `false` | When true, the instance persists even when no components are using it |

### Methods

| Name | Parameters | Return Type | Description |
|------|------------|-------------|-------------|
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

| Name | Parameters | Return Type | Description |
|------|------------|-------------|-------------|
| `emit` | `state: S` | `void` | Replaces the entire state |
| `patch` | `statePatch: S extends object ? Partial<S> : S, ignoreChangeCheck?: boolean` | `void` | Updates specific properties of the state |

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

## Bloc&lt;S, A, P&gt;

`Bloc` is a more sophisticated state container that follows the reducer pattern. It extends `BlocBase` and adds action handling.

### Type Parameters

- `S` - The state type
- `A` - The action type
- `P` - The props type (optional)

### Constructor

```tsx
constructor(initialState: S)
```

### Methods

| Name | Parameters | Return Type | Description |
|------|------------|-------------|-------------|
| `add` | `action: A` | `void` | Dispatches an action to the reducer |
| `reducer` | `action: A, state: S` | `S` | Determines how state changes in response to actions (must be implemented) |

### Example

```tsx
// Define actions
type CounterAction = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' };

class CounterBloc extends Bloc<{ count: number }, CounterAction> {
  constructor() {
    super({ count: 0 });
  }

  // Implement the reducer method
  reducer = (action: CounterAction, state: { count: number }) => {
    switch (action.type) {
      case 'increment':
        return { count: state.count + 1 };
      case 'decrement':
        return { count: state.count - 1 };
      case 'reset':
        return { count: 0 };
      default:
        return state;
    }
  };

  // Helper methods to dispatch actions
  increment = () => this.add({ type: 'increment' });
  decrement = () => this.add({ type: 'decrement' });
  reset = () => this.add({ type: 'reset' });
}
```

## BlacEvent

`BlacEvent` is an enum that defines the different events that can be dispatched by Blac.

| Event | Description |
|-------|-------------|
| `StateChange` | Triggered when a state changes |
| `Error` | Triggered when an error occurs |
| `Action` | Triggered when an action is dispatched |

## Choosing Between Cubit and Bloc

- Use **Cubit** when you have simple state logic and don't need the reducer pattern
- Use **Bloc** when you have complex state transitions, want to leverage the reducer pattern, or need a more formal action-based approach 