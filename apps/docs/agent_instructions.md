# Agent Instructions for BlaC

This guide helps coding agents correctly implement BlaC state management on the first try.

## Critical Rules

### 1. ALWAYS Use Arrow Functions
```typescript
// ✅ CORRECT - Arrow functions maintain proper this binding
class CounterBloc extends Bloc<CounterEvent, CounterState> {
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

// ❌ WRONG - Regular methods lose this binding when called from React
class CounterBloc extends Bloc<CounterEvent, CounterState> {
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}
```

### 2. Event-Driven Pattern for Blocs
```typescript
// Define event classes
class Increment {}
class Decrement {}
class Reset {
  constructor(public value: number) {}
}

// Register handlers in constructor
class CounterBloc extends Bloc<CounterEvent, CounterState> {
  constructor() {
    super({ count: 0 });
    
    this.on(Increment, (event, emit) => {
      emit({ count: this.state.count + 1 });
    });
    
    this.on(Decrement, (event, emit) => {
      emit({ count: this.state.count - 1 });
    });
    
    this.on(Reset, (event, emit) => {
      emit({ count: event.value });
    });
  }
}

// Dispatch events
bloc.add(new Increment());
bloc.add(new Reset(0));
```

### 3. Cubit Pattern (Simpler Alternative)
```typescript
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
}
```

## React Integration

### Basic Usage
```tsx
import { useBloc } from '@blac/react';

function Counter() {
  const { state, bloc } = useBloc(CounterCubit);
  
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={bloc.increment}>+</button>
      <button onClick={bloc.decrement}>-</button>
    </div>
  );
}
```

### With Bloc Pattern
```tsx
function Counter() {
  const { state, bloc } = useBloc(CounterBloc);
  
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => bloc.add(new Increment())}>+</button>
      <button onClick={() => bloc.add(new Decrement())}>-</button>
      <button onClick={() => bloc.add(new Reset(0))}>Reset</button>
    </div>
  );
}
```

## Common Patterns

### 1. Async Operations
```typescript
class TodosBloc extends Bloc<TodosEvent, TodosState> {
  constructor() {
    super({ todos: [], loading: false, error: null });
    
    this.on(LoadTodos, async (event, emit) => {
      emit({ ...this.state, loading: true, error: null });
      
      try {
        const todos = await api.fetchTodos();
        emit({ todos, loading: false, error: null });
      } catch (error) {
        emit({ ...this.state, loading: false, error: error.message });
      }
    });
  }
}
```

### 2. Isolated State (Component-Specific)
```typescript
class FormCubit extends Cubit<FormState> {
  static isolated = true; // Each component gets its own instance
  
  constructor() {
    super({ name: '', email: '' });
  }
  
  updateName = (name: string) => {
    this.emit({ ...this.state, name });
  };
}
```

### 3. Persistent State
```typescript
class AuthCubit extends Cubit<AuthState> {
  static keepAlive = true; // Persists even when no components use it
  
  constructor() {
    super({ user: null, token: null });
  }
}
```

### 4. Computed Values
```typescript
class CartCubit extends Cubit<CartState> {
  get total() {
    return this.state.items.reduce((sum, item) => sum + item.price, 0);
  }
  
  get itemCount() {
    return this.state.items.length;
  }
}

// In React
function Cart() {
  const { state, bloc } = useBloc(CartCubit);
  
  return <div>Total: ${bloc.total}</div>;
}
```

## Testing

### Basic Test Structure
```typescript
import { describe, it, expect } from 'vitest';
import { CounterCubit } from './counter-cubit';

describe('CounterCubit', () => {
  it('should increment count', () => {
    const cubit = new CounterCubit();
    
    cubit.increment();
    
    expect(cubit.state.count).toBe(1);
  });
});
```

### Testing Async Blocs
```typescript
import { waitFor } from '@blac/core/testing';

it('should load todos', async () => {
  const bloc = new TodosBloc();
  
  bloc.add(new LoadTodos());
  
  await waitFor(() => {
    expect(bloc.state.loading).toBe(false);
    expect(bloc.state.todos).toHaveLength(3);
  });
});
```

## Common Mistakes to Avoid

### 1. Using Regular Methods
```typescript
// ❌ WRONG - this binding breaks
increment() {
  this.emit({ count: this.state.count + 1 });
}

// ✅ CORRECT - arrow function preserves this
increment = () => {
  this.emit({ count: this.state.count + 1 });
};
```

### 2. Mutating State Directly
```typescript
// ❌ WRONG - mutating state
this.state.count++;
this.emit(this.state);

// ✅ CORRECT - creating new state
this.emit({ count: this.state.count + 1 });
```

### 3. Forgetting Event Registration
```typescript
// ❌ WRONG - handler not registered
class TodosBloc extends Bloc<TodosEvent, TodosState> {
  handleAddTodo = (event: AddTodo, emit: Emitter<TodosState>) => {
    // This won't work!
  };
}

// ✅ CORRECT - register in constructor
constructor() {
  super(initialState);
  this.on(AddTodo, this.handleAddTodo);
}
```

### 4. Accessing Bloc State in React Without Hook
```typescript
// ❌ WRONG - no reactivity
const bloc = new CounterBloc();
return <div>{bloc.state.count}</div>;

// ✅ CORRECT - use hook for reactivity
const { state } = useBloc(CounterBloc);
return <div>{state.count}</div>;
```

## Quick Reference

### Creating a Cubit
```typescript
class NameCubit extends Cubit<StateType> {
  constructor() {
    super(initialState);
  }
  
  methodName = () => {
    this.emit(newState);
  };
}
```

### Creating a Bloc
```typescript
class NameBloc extends Bloc<EventType, StateType> {
  constructor() {
    super(initialState);
    this.on(EventClass, handler);
  }
}
```

### Using in React
```tsx
const { state, bloc } = useBloc(BlocOrCubitClass);
```

### State Options
```typescript
static isolated = true;  // Component-specific instance
static keepAlive = true; // Persist when unused
```

## Remember

1. **Arrow functions** for all methods
2. **Events are classes** (not strings)
3. **Emit new state objects** (don't mutate)
4. **Use useBloc hook** for React integration
5. **Register handlers in constructor** for Blocs