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

| Name    | Type | Description                                              |
| ------- | ---- | -------------------------------------------------------- |
| `state` | `S`  | The new state object that will replace the current state |

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
patch(statePatch: S extends object ? Partial<S> : S, ignoreChangeCheck?: boolean): void
```

#### Parameters

| Name                | Type         | Description                                                               |
| ------------------- | ------------ | ------------------------------------------------------------------------- |
| `statePatch`        | `Partial<S>` | An object containing the properties to update                             |
| `ignoreChangeCheck` | `boolean`    | Optional flag to skip checking if values have changed (defaults to false) |

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
      error: null,
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

## Event Handling (Bloc)

### `on(eventConstructor, handler)`

This method is specific to `Bloc` instances and is used to register a handler function for a specific type of event class. It should be called in the constructor.

#### Signature

```tsx
protected on<E extends A>(
  eventConstructor: new (...args: any[]) => E,
  handler: (event: E, emit: (newState: S) => void) => void | Promise<void>
): void
```

#### Parameters

| Name               | Type                                                                 | Description                                                  |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `eventConstructor` | `new (...args: any[]) => E`                                          | The constructor of the event class to listen for.            |
| `handler`          | `(event: InstanceType<EClass>, emit: (newState: S) => void) => void` | A function that processes the event and can emit new states. |

#### Example

```tsx
class MyEvent {
  constructor(public data: string) {}
}
class AnotherEvent {}

class MyBloc extends Bloc<{ value: string }, MyEvent | AnotherEvent> {
  constructor() {
    super({ value: 'initial' });

    this.on(MyEvent, (event, emit) => {
      emit({ value: `Handled MyEvent with: ${event.data}` });
    });

    this.on(AnotherEvent, (_event, emit) => {
      emit({ value: 'Handled AnotherEvent' });
    });
  }
}
```

### `add(event)`

The `add` method dispatches an event instance. The `Bloc` will then look up and execute the handler registered for that event's specific class (constructor).

#### Signature

```tsx
add(event: A): Promise<void> // Where A is the union of event types the Bloc handles
```

#### Parameters

| Name    | Type | Description                     |
| ------- | ---- | ------------------------------- |
| `event` | `E`  | The event instance to dispatch. |

#### Example

```tsx
// Define event classes
class AddTodoEvent {
  constructor(public readonly text: string) {}
}
class ToggleTodoEvent {
  constructor(public readonly id: number) {}
}

// Define state
interface TodoState {
  todos: Array<{ id: number; text: string; completed: boolean }>;
  nextId: number;
}

class TodoBloc extends Bloc<TodoState, AddTodoEvent | ToggleTodoEvent> {
  constructor() {
    super({ todos: [], nextId: 1 });

    this.on(AddTodoEvent, (event, emit) => {
      const newTodo = {
        id: this.state.nextId,
        text: event.text,
        completed: false,
      };
      emit({
        ...this.state,
        todos: [...this.state.todos, newTodo],
        nextId: this.state.nextId + 1,
      });
    });

    this.on(ToggleTodoEvent, (event, emit) => {
      emit({
        ...this.state,
        todos: this.state.todos.map((todo) =>
          todo.id === event.id ? { ...todo, completed: !todo.completed } : todo,
        ),
      });
    });
  }

  // Helper methods to dispatch events from the UI layer (optional)
  addTodo = (text: string) => {
    this.add(new AddTodoEvent(text));
  };

  toggleTodo = (id: number) => {
    this.add(new ToggleTodoEvent(id));
  };
}

// Usage
const todoBloc = new TodoBloc();
todoBloc.addTodo('Learn Blac Events');
todoBloc.toggleTodo(1);
```

## Subscription Management (BlocBase)

### `subscribe(callback)`

The `subscribe` method subscribes to state changes and returns an unsubscribe function.

#### Signature

```tsx
subscribe(callback: (state: S) => void): () => void
```

#### Parameters

| Name       | Type                 | Description                                       |
| ---------- | -------------------- | ------------------------------------------------- |
| `callback` | `(state: S) => void` | A function that will be called when state changes |

#### Returns

A function that, when called, unsubscribes the listener.

#### Example

```tsx
const counterBloc = new CounterBloc();

// Subscribe to state changes
const unsubscribe = counterBloc.subscribe((state) => {
  console.log('State changed:', state);
});

// Later, unsubscribe to prevent memory leaks
unsubscribe();
```

### `subscribeWithSelector(selector, callback, equalityFn?)`

Subscribe to state changes with a selector for optimized updates.

#### Signature

```tsx
subscribeWithSelector<T>(
  selector: (state: S) => T,
  callback: (value: T) => void,
  equalityFn?: (a: T, b: T) => boolean
): () => void
```

#### Parameters

| Name         | Type                      | Description                                            |
| ------------ | ------------------------- | ------------------------------------------------------ |
| `selector`   | `(state: S) => T`         | Function to select specific data from state            |
| `callback`   | `(value: T) => void`      | Function called when selected value changes            |
| `equalityFn` | `(a: T, b: T) => boolean` | Optional custom equality function (default: Object.is) |

#### Example

```tsx
const todoBloc = new TodoBloc();

// Only get notified when the todo count changes
const unsubscribe = todoBloc.subscribeWithSelector(
  (state) => state.todos.length,
  (count) => {
    console.log('Todo count changed:', count);
  },
);
```

## Choosing Between emit() and patch()

- Use `emit()` when you want to replace the entire state object, typically for simple states
- Use `patch()` when you want to update specific properties without touching others, ideal for complex states

## Choosing Between Bloc and Cubit

- Use `Bloc` for more complex state logic where an event-driven approach is beneficial. `Bloc`s process specific event _classes_ through registered _handlers_ (using `this.on(EventType, handler)` and `this.add(new EventType())`) to produce new `State`. This pattern is excellent for managing intricate state transitions and side effects in a structured and type-safe way.
- Use `Cubit` for simpler state management scenarios where state changes can be triggered by direct method calls on the `Cubit` instance. These methods then use `emit()` or `patch()` to update the state. This direct approach is often more concise for straightforward cases.
