# Cubit Class

The `Cubit` class is a simple state container that extends `BlocBase`. It provides direct state emission methods, making it perfect for straightforward state management scenarios.

## Import

```typescript
import { Cubit } from '@blac/core';
```

## Class Definition

```typescript
abstract class Cubit<S, P = null> extends BlocBase<S, P>
```

### Type Parameters

| Parameter | Description |
|-----------|-------------|
| `S` | The state type that this Cubit manages |
| `P` | Optional props type for initialization (defaults to `null`) |

## Constructor

```typescript
constructor(initialState: S)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `initialState` | `S` | The initial state value |

### Example

```typescript
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 }); // Initial state is 0
  }
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      user: null,
      isLoading: false,
      error: null
    });
  }
}
```

## Instance Methods

### emit()

Replaces the entire state with a new value.

```typescript
protected emit(state: S): void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `S` | The new state value |

#### Example

```typescript
class ThemeCubit extends Cubit<{ theme: 'light' | 'dark' }> {
  constructor() {
    super({ theme: 'light' });
  }
  
  toggleTheme = () => {
    this.emit({ theme: this.state.theme === 'light' ? 'dark' : 'light' });
  };
  
  setTheme = (theme: 'light' | 'dark') => {
    this.emit({ theme });
  };
}
```

### patch()

Updates specific properties of an object state. Only available when state is an object.

```typescript
protected patch(
  statePatch: S extends object ? Partial<S> : S,
  ignoreChangeCheck?: boolean
): void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `statePatch` | `Partial<S>` or `S` | Partial state object (if S is object) or full state |
| `ignoreChangeCheck` | `boolean` | Skip equality check and force update (default: `false`) |

#### Example

```typescript
interface FormState {
  name: string;
  email: string;
  age: number;
  errors: Record<string, string>;
}

class FormCubit extends Cubit<FormState> {
  constructor() {
    super({
      name: '',
      email: '',
      age: 0,
      errors: {}
    });
  }
  
  // Update single field
  updateName = (name: string) => {
    this.patch({ name });
  };
  
  // Update multiple fields
  updateContact = (email: string, age: number) => {
    this.patch({ email, age });
  };
  
  // Force update even if values are same
  forceRefresh = () => {
    this.patch({}, true);
  };
}
```

## Inherited from BlocBase

### Properties

#### state

The current state value.

```typescript
get state(): S
```

Example:
```typescript
class CounterCubit extends Cubit<{ count: number }> {
  logState = () => {
    console.log('Current count:', this.state.count);
  };
}
```

#### props

Props passed during instance creation.

```typescript
get props(): P | null
```

Example:
```typescript
interface TodoProps {
  userId: string;
  filter: 'all' | 'active' | 'completed';
}

class TodoCubit extends Cubit<TodoState, TodoProps> {
  loadUserTodos = async () => {
    const todos = await api.getTodos(this.props.userId);
    this.emit({ todos });
  };
}
```

#### lastUpdate

Timestamp of the last state update.

```typescript
get lastUpdate(): number
```

Example:
```typescript
class DataCubit extends Cubit<DataState> {
  get isStale() {
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - this.lastUpdate > fiveMinutes;
  }
}
```

### Static Properties

#### isolated

When `true`, each component gets its own instance.

```typescript
static isolated: boolean = false
```

Example:
```typescript
class FormCubit extends Cubit<FormState> {
  static isolated = true; // Each form component gets its own instance
  
  constructor() {
    super({ fields: {} });
  }
}
```

#### keepAlive

When `true`, instance persists even with no consumers.

```typescript
static keepAlive: boolean = false
```

Example:
```typescript
class SessionCubit extends Cubit<SessionState> {
  static keepAlive = true; // Never dispose this instance
  
  constructor() {
    super({ user: null });
  }
}
```

### Methods

#### on()

Subscribe to state changes or BlaC events.

```typescript
on(
  event: BlacEvent | BlacEvent[],
  listener: StateListener<S>,
  signal?: AbortSignal
): () => void
```

##### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `BlacEvent` or `BlacEvent[]` | Event(s) to listen for |
| `listener` | `StateListener<S>` | Callback function |
| `signal` | `AbortSignal` | Optional abort signal for cleanup |

##### BlacEvent Enum

```typescript
enum BlacEvent {
  StateChange = 'StateChange',
  Error = 'Error',
  Action = 'Action'
}
```

##### Example

```typescript
class PersistentCubit extends Cubit<State> {
  constructor() {
    super(initialState);
    
    // Save to localStorage on state change
    this.on(BlacEvent.StateChange, (newState) => {
      localStorage.setItem('state', JSON.stringify(newState));
    });
    
    // Log errors
    this.on(BlacEvent.Error, (error) => {
      console.error('Cubit error:', error);
    });
  }
}

// External subscription
const cubit = new CounterCubit();
const unsubscribe = cubit.on(BlacEvent.StateChange, (state) => {
  console.log('Count changed to:', state.count);
});

// Cleanup
unsubscribe();
```

#### onDispose()

Override to perform cleanup when the instance is disposed.

```typescript
protected onDispose(): void
```

Example:
```typescript
class WebSocketCubit extends Cubit<ConnectionState> {
  private ws?: WebSocket;
  
  connect = () => {
    this.ws = new WebSocket('wss://api.example.com');
    // ... setup WebSocket
  };
  
  onDispose = () => {
    this.ws?.close();
    console.log('WebSocket connection closed');
  };
}
```

## Complete Examples

### Counter Example

```typescript
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  
  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
  reset = () => this.emit({ count: 0 });
  
  incrementBy = (amount: number) => {
    this.emit({ count: this.state.count + amount });
  };
}
```

### Async Data Fetching

```typescript
interface DataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

class DataCubit<T> extends Cubit<DataState<T>> {
  constructor() {
    super({
      data: null,
      isLoading: false,
      error: null
    });
  }
  
  fetch = async (fetcher: () => Promise<T>) => {
    this.emit({ data: null, isLoading: true, error: null });
    
    try {
      const data = await fetcher();
      this.emit({ data, isLoading: false, error: null });
    } catch (error) {
      this.emit({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  reset = () => {
    this.emit({ data: null, isLoading: false, error: null });
  };
}
```

### Form Management

```typescript
interface FormField {
  value: string;
  error?: string;
  touched: boolean;
}

interface FormState {
  fields: Record<string, FormField>;
  isSubmitting: boolean;
  submitError?: string;
}

class FormCubit extends Cubit<FormState> {
  static isolated = true; // Each form instance is independent
  
  constructor(private validator: FormValidator) {
    super({
      fields: {},
      isSubmitting: false
    });
  }
  
  setField = (name: string, value: string) => {
    const error = this.validator.validateField(name, value);
    
    this.patch({
      fields: {
        ...this.state.fields,
        [name]: {
          value,
          error,
          touched: true
        }
      }
    });
  };
  
  submit = async (onSubmit: (values: Record<string, string>) => Promise<void>) => {
    // Validate all fields
    const errors = this.validator.validateAll(this.state.fields);
    if (Object.keys(errors).length > 0) {
      this.patch({
        fields: Object.entries(this.state.fields).reduce((acc, [name, field]) => ({
          ...acc,
          [name]: { ...field, error: errors[name] }
        }), {})
      });
      return;
    }
    
    // Submit
    this.patch({ isSubmitting: true, submitError: undefined });
    
    try {
      const values = Object.entries(this.state.fields).reduce((acc, [name, field]) => ({
        ...acc,
        [name]: field.value
      }), {});
      
      await onSubmit(values);
      
      // Reset form on success
      this.emit({
        fields: {},
        isSubmitting: false
      });
    } catch (error) {
      this.patch({
        isSubmitting: false,
        submitError: error instanceof Error ? error.message : 'Submit failed'
      });
    }
  };
  
  get isValid() {
    return Object.values(this.state.fields).every(field => !field.error);
  }
  
  get isDirty() {
    return Object.values(this.state.fields).some(field => field.touched);
  }
}
```

## Testing

Cubits are easy to test:

```typescript
describe('CounterCubit', () => {
  let cubit: CounterCubit;
  
  beforeEach(() => {
    cubit = new CounterCubit();
  });
  
  it('should start with initial state', () => {
    expect(cubit.state).toEqual({ count: 0 });
  });
  
  it('should increment', () => {
    cubit.increment();
    expect(cubit.state).toEqual({ count: 1 });
  });
  
  it('should emit state changes', () => {
    const listener = jest.fn();
    cubit.on(BlacEvent.StateChange, listener);
    
    cubit.increment();
    
    expect(listener).toHaveBeenCalledWith({ count: 1 });
  });
});
```

## Best Practices

### 1. Use Arrow Functions

Always use arrow functions for methods to maintain proper `this` binding:

```typescript
// ✅ Good
increment = () => this.emit(this.state + 1);

// ❌ Bad - loses 'this' context
increment() {
  this.emit(this.state + 1);
}
```

### 2. Keep State Immutable

Always create new state objects:

```typescript
// ✅ Good
this.patch({ items: [...this.state.items, newItem] });

// ❌ Bad - mutating state
this.state.items.push(newItem);
this.emit(this.state);
```

### 3. Handle All States

Consider loading, error, and success states:

```typescript
type AsyncState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
```

### 4. Cleanup Resources

Use `onDispose` for cleanup:

```typescript
onDispose = () => {
  this.subscription?.unsubscribe();
  this.timer && clearInterval(this.timer);
};
```

## Summary

Cubit provides:
- **Simple API**: Just `emit()` and `patch()` for state updates
- **Type Safety**: Full TypeScript support with generics
- **Flexibility**: From simple counters to complex forms
- **Testability**: Easy to unit test in isolation
- **Lifecycle Management**: Automatic creation and disposal

For more complex event-driven scenarios, consider using [Bloc](/api/core/bloc) instead.