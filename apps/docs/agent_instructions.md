# Introduction to BlaC: Business Logic as Components

BlaC is a predictable state management library for TypeScript and React applications, inspired by the BLoC pattern from Flutter. It provides a clean separation between business logic and UI components through two complementary patterns: **Cubit** for simple state management and **Bloc** for complex event-driven scenarios.

## Core Concepts

### Philosophy

BlaC embraces three fundamental principles:

1. **Predictability**: State changes only through explicit emissions, making debugging straightforward
2. **Testability**: Business logic is completely decoupled from UI, enabling easy unit testing
3. **Type Safety**: Full TypeScript support with automatic type inference

### The Two Patterns

#### Cubit: Direct State Management

Cubit is perfect for simple state containers where you want direct control over state changes:

```typescript
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}
```

#### Bloc: Event-Driven State Management

Bloc excels when you need to handle complex business logic with multiple event types:

```typescript
import { Bloc, Emitter } from '@blac/core';

// Define events as classes
class TodoAdded {
  constructor(public readonly title: string) {}
}

class TodoToggled {
  constructor(public readonly id: string) {}
}

class TodosFiltered {
  constructor(public readonly filter: 'all' | 'active' | 'completed') {}
}

interface TodosState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

class TodosBloc extends Bloc<TodoEvent, TodosState> {
  constructor() {
    super({ todos: [], filter: 'all' });

    // Register event handlers
    this.on(TodoAdded, this.handleTodoAdded);
    this.on(TodoToggled, this.handleTodoToggled);
    this.on(TodosFiltered, this.handleTodosFiltered);
  }

  private handleTodoAdded = (event: TodoAdded, emit: Emitter<TodosState>) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      title: event.title,
      completed: false,
    };
    emit({
      ...this.state,
      todos: [...this.state.todos, newTodo],
    });
  };

  private handleTodoToggled = (
    event: TodoToggled,
    emit: Emitter<TodosState>,
  ) => {
    emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === event.id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  };

  private handleTodosFiltered = (
    event: TodosFiltered,
    emit: Emitter<TodosState>,
  ) => {
    emit({ ...this.state, filter: event.filter });
  };
}
```

## React Integration

### Basic Usage with useBloc Hook

The `useBloc` hook provides seamless integration with React components:

```tsx
import { useBloc } from '@blac/react';

function Counter() {
  const { state, bloc } = useBloc(CounterCubit);

  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={bloc.increment}>Increment</button>
      <button onClick={bloc.decrement}>Decrement</button>
      <button onClick={bloc.reset}>Reset</button>
    </div>
  );
}
```

### Working with Bloc Events

```tsx
function TodoList() {
  const { state, bloc } = useBloc(TodosBloc);

  const visibleTodos = state.todos.filter((todo) => {
    if (state.filter === 'active') return !todo.completed;
    if (state.filter === 'completed') return todo.completed;
    return true;
  });

  return (
    <div>
      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            bloc.add(new TodoAdded(e.currentTarget.value));
            e.currentTarget.value = '';
          }
        }}
        placeholder="Add todo..."
      />

      <div>
        <button onClick={() => bloc.add(new TodosFiltered('all'))}>All</button>
        <button onClick={() => bloc.add(new TodosFiltered('active'))}>
          Active
        </button>
        <button onClick={() => bloc.add(new TodosFiltered('completed'))}>
          Completed
        </button>
      </div>

      {visibleTodos.map((todo) => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => bloc.add(new TodoToggled(todo.id))}
          />
          <span>{todo.title}</span>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

### 1. Choose the Right Pattern

**Use Cubit when:**

- State logic is straightforward
- You need direct method calls
- State changes are synchronous or simple async

**Use Bloc when:**

- Multiple actors can trigger state changes
- You need event replay or logging
- Complex business logic requires event-driven architecture

### 2. State Management Patterns

#### Shared State (Default)

All components using the same Bloc/Cubit class share the same instance:

```typescript
// Both components will see the same counter value
function ComponentA() {
  const { state } = useBloc(CounterCubit);
  return <div>A: {state.count}</div>;
}

function ComponentB() {
  const { state, bloc } = useBloc(CounterCubit);
  return <button onClick={bloc.increment}>B: Increment</button>;
}
```

#### Isolated State

Each component gets its own instance:

```typescript
class FormCubit extends Cubit<FormState> {
  static isolated = true; // Magic property

  constructor() {
    super({ email: '', password: '' });
  }

  updateEmail = (email: string) => {
    this.emit({ ...this.state, email });
  };

  updatePassword = (password: string) => {
    this.emit({ ...this.state, password });
  };
}

// Each form component has independent state
function LoginForm() {
  const { state, bloc } = useBloc(FormCubit);
  // This instance is unique to this component
}
```

#### Persistent State

State persists even when no components are using it:

```typescript
class AuthCubit extends Cubit<AuthState> {
  static keepAlive = true; // Prevents disposal

  constructor() {
    super({ user: null, isAuthenticated: false });
  }

  login = async (credentials: Credentials) => {
    const user = await authService.login(credentials);
    this.emit({ user, isAuthenticated: true });
  };

  logout = () => {
    this.emit({ user: null, isAuthenticated: false });
  };
}
```

### 3. Async Operations

Handle async operations with proper loading and error states:

```typescript
interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

class DataBloc<T> extends Bloc<DataEvent, DataState<T>> {
  constructor() {
    super({ data: null, loading: false, error: null });

    this.on(LoadData, async (event, emit) => {
      emit({ ...this.state, loading: true, error: null });

      try {
        const data = await this.fetchData();
        emit({ data, loading: false, error: null });
      } catch (error) {
        emit({
          ...this.state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  protected abstract fetchData(): Promise<T>;
}
```

### 4. Computed Properties

Use getters for derived state:

```typescript
class ShoppingCartCubit extends Cubit<CartState> {
  constructor() {
    super({ items: [], taxRate: 0.08 });
  }

  get subtotal() {
    return this.state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get tax() {
    return this.subtotal * this.state.taxRate;
  }

  get total() {
    return this.subtotal + this.tax;
  }

  addItem = (item: CartItem) => {
    this.emit({ ...this.state, items: [...this.state.items, item] });
  };
}

// React component can use computed properties
function Cart() {
  const { state, bloc } = useBloc(ShoppingCartCubit);

  return (
    <div>
      <p>Subtotal: ${bloc.subtotal.toFixed(2)}</p>
      <p>Tax: ${bloc.tax.toFixed(2)}</p>
      <p>Total: ${bloc.total.toFixed(2)}</p>
    </div>
  );
}
```

## Critical Rules

### 1. Always Use Arrow Functions

This is **mandatory** for proper `this` binding in React:

```typescript
// ✅ CORRECT - Arrow function preserves this binding
class MyCubit extends Cubit<State> {
  myMethod = () => {
    this.emit(newState); // 'this' is correctly bound
  };
}

// ❌ WRONG - Regular method loses this binding
class MyCubit extends Cubit<State> {
  myMethod() {
    this.emit(newState); // 'this' will be undefined when called from React!
  }
}
```

### 2. Never Mutate State

Always create new state objects:

```typescript
// ✅ CORRECT - Create new state
this.emit({
  ...this.state,
  items: [...this.state.items, newItem],
});

// ❌ WRONG - Mutating existing state
this.state.items.push(newItem);
this.emit(this.state);
```

### 3. Events Must Be Classes

For Bloc pattern, events must be class instances:

```typescript
// ✅ CORRECT - Events as classes
class UserLoggedIn {
  constructor(public readonly userId: string) {}
}

bloc.add(new UserLoggedIn('123'));

// ❌ WRONG - Events as plain objects or strings
bloc.add({ type: 'USER_LOGGED_IN', userId: '123' }); // Won't work!
bloc.add('USER_LOGGED_IN'); // Won't work!
```

### 4. Register Event Handlers in Constructor

```typescript
// ✅ CORRECT - Register in constructor
class MyBloc extends Bloc<Event, State> {
  constructor() {
    super(initialState);
    this.on(MyEvent, this.handleMyEvent);
  }

  private handleMyEvent = (event: MyEvent, emit: Emitter<State>) => {
    // Handle event
  };
}

// ❌ WRONG - Handler defined but not registered
class MyBloc extends Bloc<Event, State> {
  handleMyEvent = (event: MyEvent, emit: Emitter<State>) => {
    // This won't be called unless registered with this.on()!
  };
}
```

## Testing

### Unit Testing Cubits

```typescript
import { describe, it, expect } from 'vitest';

describe('CounterCubit', () => {
  it('should increment count', () => {
    const cubit = new CounterCubit();

    expect(cubit.state.count).toBe(0);

    cubit.increment();
    expect(cubit.state.count).toBe(1);

    cubit.increment();
    expect(cubit.state.count).toBe(2);
  });

  it('should reset count', () => {
    const cubit = new CounterCubit();

    cubit.increment();
    cubit.increment();
    expect(cubit.state.count).toBe(2);

    cubit.reset();
    expect(cubit.state.count).toBe(0);
  });
});
```

### Testing Async Blocs

```typescript
import { waitFor } from '@blac/core/testing';
import { vi } from 'vitest';

describe('UserBloc', () => {
  it('should load user data', async () => {
    const mockApi = {
      getUser: vi.fn().mockResolvedValue({ id: '1', name: 'John' }),
    };

    const bloc = new UserBloc(mockApi);

    bloc.add(new LoadUser('1'));

    // Initial loading state
    expect(bloc.state.loading).toBe(true);

    // Wait for async operation
    await waitFor(() => {
      expect(bloc.state.loading).toBe(false);
      expect(bloc.state.user).toEqual({ id: '1', name: 'John' });
    });
  });

  it('should handle errors', async () => {
    const mockApi = {
      getUser: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    const bloc = new UserBloc(mockApi);

    bloc.add(new LoadUser('1'));

    await waitFor(() => {
      expect(bloc.state.loading).toBe(false);
      expect(bloc.state.error).toBe('Network error');
    });
  });
});
```

### Testing React Integration

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BlacProvider } from '@blac/react';

describe('Counter Component', () => {
  it('should increment when button clicked', () => {
    render(
      <BlacProvider>
        <Counter />
      </BlacProvider>
    );

    expect(screen.getByText('Count: 0')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Increment'));

    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

## Advanced Patterns

### Plugin System

Extend functionality with plugins:

```typescript
import { BlacPlugin } from '@blac/core';

// Logging plugin
const loggingPlugin: BlacPlugin = {
  onStateChange: (bloc, prevState, newState) => {
    console.log(`[${bloc.constructor.name}]`, { prevState, newState });
  },
  onEvent: (bloc, event) => {
    console.log(`[${bloc.constructor.name}] Event:`, event);
  },
};

// Persistence plugin
const persistencePlugin: BlacPlugin = {
  onCreate: (bloc) => {
    const saved = localStorage.getItem(bloc.constructor.name);
    if (saved) {
      bloc.emit(JSON.parse(saved));
    }
  },
  onStateChange: (bloc, prevState, newState) => {
    localStorage.setItem(bloc.constructor.name, JSON.stringify(newState));
  },
};

// Apply globally
Blac.use(loggingPlugin);
Blac.use(persistencePlugin);
```

### Dependency Injection

```typescript
class TodosBloc extends Bloc<TodoEvent, TodosState> {
  constructor(private api: TodosAPI) {
    super({ todos: [], loading: false });

    this.on(LoadTodos, async (event, emit) => {
      emit({ ...this.state, loading: true });
      const todos = await this.api.fetchTodos();
      emit({ todos, loading: false });
    });
  }
}

// In your app
const api = new TodosAPI();
const bloc = new TodosBloc(api);

// For testing
const mockApi = { fetchTodos: vi.fn() };
const testBloc = new TodosBloc(mockApi);
```

## Summary

BlaC provides a robust foundation for state management in TypeScript and React applications. By following these patterns and best practices, you'll build applications that are:

- **Predictable**: State changes are explicit and traceable
- **Testable**: Business logic is decoupled from UI
- **Type-safe**: Full TypeScript support catches errors at compile time
- **Scalable**: Clear patterns that work from simple to complex applications

Remember the key principles:

1. Use arrow functions for all methods
2. Choose Cubit for simple state, Bloc for complex events
3. Never mutate state directly
4. Test your business logic independently
5. Leverage TypeScript for type safety

With BlaC, your business logic becomes a first-class citizen in your application architecture, leading to more maintainable and robust applications.
