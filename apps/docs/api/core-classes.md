# Core Classes

Blac provides three primary classes for state management:

## BlocBase<S, P>

`BlocBase` is the abstract base class for all state containers in Blac.

### Type Parameters

- `S` - The state type
- `P` - The props type (optional)

### Properties

| Name | Type | Description |
|------|------|-------------|
| `state` | `S` | The current state of the container |

### Methods

| Name | Parameters | Return Type | Description |
|------|------------|-------------|-------------|
| `emit` | `state: S` | `void` | Replaces the entire state |
| `patch` | `partialState: Partial<P extends Record<string, any> ? P : S>` | `void` | Updates specific properties of the state |
| `on` | `listener: StateListener<S>` | `() => void` | Subscribes to state changes and returns an unsubscribe function |

## Cubit<S, P>

`Cubit` is a simple state container that extends `BlocBase`. It's ideal for simpler state management needs.

### Type Parameters

- `S` - The state type
- `P` - The props type (optional)

### Constructor

```tsx
constructor(initialState: S)
```

### Static Properties

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `keepAlive` | `boolean` | `false` | When true, the instance persists even when no components are using it |

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

## Bloc<S, A, P>

`Bloc` is a more sophisticated state container that follows the reducer pattern. It extends `BlocBase` and adds action handling.

### Type Parameters

- `S` - The state type
- `A` - The action type
- `P` - The props type (optional)

### Constructor

```tsx
constructor(initialState: S)
```

### Static Properties

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `keepAlive` | `boolean` | `false` | When true, the instance persists even when no components are using it |

### Methods

| Name | Parameters | Return Type | Description |
|------|------------|-------------|-------------|
| `add` | `action: A` | `void` | Dispatches an action to the reducer |
| `reducer` | `state: S, action: A` | `S` | Determines how state changes in response to actions (must be implemented) |

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
  reducer = (state: { count: number }, action: CounterAction) => {
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

## Choosing Between Cubit and Bloc

- Use **Cubit** when you have simple state logic and don't need the reducer pattern
- Use **Bloc** when you have complex state transitions, want to leverage the reducer pattern, or need a more formal action-based approach 