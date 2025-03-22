# Key Methods

Blac provides several key methods for managing state and handling actions. This reference details these methods and their usage.

## State Update Methods

### emit(state)

The `emit` method completely replaces the current state with a new state object.

#### Signature

```tsx
emit(state: S): void
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `state` | `S` | The new state object that will replace the current state |

#### Example

```tsx
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  // Using emit to replace the entire state
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}
```

### patch(partialState)

The `patch` method updates specific properties of the state while preserving others.

#### Signature

```tsx
patch(partialState: Partial<S>): void
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `partialState` | `Partial<S>` | An object containing the properties to update |

#### Example

```tsx
class UserCubit extends Cubit<{
  name: string;
  email: string;
  isLoading: boolean;
  error: string | null;
}> {
  constructor() {
    super({
      name: '',
      email: '',
      isLoading: false,
      error: null
    });
  }

  // Using patch to update only specific properties
  startLoading = () => {
    this.patch({ isLoading: true, error: null });
  };

  updateName = (name: string) => {
    this.patch({ name });
  };

  setError = (error: string) => {
    this.patch({ isLoading: false, error });
  };
}
```

## Action Handling

### add(action)

The `add` method dispatches an action to the reducer function in a Bloc.

#### Signature

```tsx
add(action: A): void
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `action` | `A` | The action to dispatch to the reducer |

#### Example

```tsx
// Define actions
type TodoAction = 
  | { type: 'add', payload: { text: string } }
  | { type: 'toggle', payload: { id: number } }
  | { type: 'delete', payload: { id: number } };

class TodoBloc extends Bloc<TodoState, TodoAction> {
  constructor() {
    super({ todos: [] });
  }

  // Implement the reducer
  reducer = (state: TodoState, action: TodoAction) => {
    switch (action.type) {
      case 'add':
        return this.handleAdd(action)
      case 'toggle':
        return this.handleToggle(action)
      case 'delete':
        return this.handleDelete(action)
      default:
        return state;
    }
  };

  // Reducer methods
  handleAdd = (state: TodoState, action: TodoAction) => {
    return {
      todos: [...state.todos, { id: Date.now(), text: action.payload.text, completed: false }]
    };
  };

  handleToggle = (state: TodoState, action: TodoAction) => {
    return {
      todos: state.todos.map((todo) =>
        todo.id === action.payload.id
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    };
  };

  handleDelete = (state: TodoState, action: TodoAction) => {
    return {
      todos: state.todos.filter((todo) => todo.id !== action.payload.id)  
    };
  };

  // Helper methods to dispatch actions from the UI layer
  addTodo = (text: string) => {
    this.add({ type: 'add', payload: { text } });
  };

  toggleTodo = (id: number) => {
    this.add({ type: 'toggle', payload: { id } });
  };

  deleteTodo = (id: number) => {
    this.add({ type: 'delete', payload: { id } });
  };
}
```

## Subscription Management

### on(listener)

The `on` method subscribes to state changes and returns an unsubscribe function.

#### Signature

```tsx
on(event: BlacEvent, listener: StateListener<S>, signal?: AbortSignal): () => void
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `event` | `BlacEvent` | The event to listen to |
| `listener` | `StateListener<S>` | A function that will be called when the state changes |
| `signal` | `AbortSignal` | An optional signal to abort the subscription |

#### Returns

A function that, when called, unsubscribes the listener.

#### Example 1

```tsx
const counterBloc = new CounterBloc();

// Subscribe to state changes
const unsubscribe = counterBloc.on((state) => {
  console.log('State changed:', state);
});

// Later, unsubscribe to prevent memory leaks
unsubscribe();
```

#### Example 2

```tsx
const counterBloc = new CounterBloc();
const abortController = new AbortController();

// Subscribe to state changes
counterBloc.on(BlacEvent.StateChange, (state) => {
  console.log('State changed:', state);
}, abortController.signal);

// Abort the subscription
abortController.abort();
```

## Choosing Between emit() and patch()

- Use `emit()` when you want to replace the entire state object, typically for simple states
- Use `patch()` when you want to update specific properties without touching others, ideal for complex states

## Choosing Between Bloc and Cubit  

- Use `Bloc` for event-driven state management
- Use `Cubit` for simple state management