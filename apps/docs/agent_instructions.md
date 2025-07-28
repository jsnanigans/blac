# Agent Instructions for BlaC Implementation

This document provides clear, copy-paste ready instructions for AI coding agents to correctly implement BlaC state management on the first attempt.

## Critical Rules - MUST FOLLOW

### 1. **Arrow Functions are MANDATORY**
All methods in Bloc/Cubit classes MUST use arrow function syntax. Regular methods will break when called from React components.

```typescript
// ✅ CORRECT - Arrow function
class CounterCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  }
}

// ❌ WRONG - Regular method (will lose 'this' context)
class CounterCubit extends Cubit<number> {
  increment() {
    this.emit(this.state + 1);
  }
}
```

### 2. **State Must Be Serializable**
Never put functions, class instances, or Dates directly in state.

```typescript
// ✅ CORRECT - Serializable state
interface UserState {
  name: string;
  joinedTimestamp: number; // Use timestamp instead of Date
  isActive: boolean;
}

// ❌ WRONG - Non-serializable state
interface UserState {
  name: string;
  joinedDate: Date; // Dates are not serializable
  logout: () => void; // Functions don't belong in state
}
```

## Quick Start Templates

### Basic Cubit Template

```typescript
import { Cubit } from '@blac/core';

interface MyState {
  // Define your state shape here
  count: number;
  loading: boolean;
  error: string | null;
}

export class MyCubit extends Cubit<MyState> {
  constructor() {
    super({
      // Initial state
      count: 0,
      loading: false,
      error: null
    });
  }

  // All methods MUST be arrow functions
  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  // Use patch() for partial updates
  setLoading = (loading: boolean) => {
    this.patch({ loading });
  };

  // Async operations
  fetchData = async () => {
    this.patch({ loading: true, error: null });
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      this.patch({ count: data.count, loading: false });
    } catch (error) {
      this.patch({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };
}
```

### Basic Bloc Template (Event-Driven)

```typescript
import { Bloc } from '@blac/core';

// Define event classes (NOT interfaces or types)
class Increment {
  constructor(public readonly amount: number = 1) {}
}

class Decrement {
  constructor(public readonly amount: number = 1) {}
}

class Reset {}

// Union type for all events (optional but recommended)
type CounterEvent = Increment | Decrement | Reset;

interface CounterState {
  count: number;
}

export class CounterBloc extends Bloc<CounterState, CounterEvent> {
  constructor() {
    super({ count: 0 });

    // Register event handlers in constructor
    this.on(Increment, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });

    this.on(Decrement, (event, emit) => {
      emit({ count: this.state.count - event.amount });
    });

    this.on(Reset, (event, emit) => {
      emit({ count: 0 });
    });
  }

  // Helper methods to dispatch events (optional)
  increment = (amount = 1) => {
    this.add(new Increment(amount));
  };

  decrement = (amount = 1) => {
    this.add(new Decrement(amount));
  };

  reset = () => {
    this.add(new Reset());
  };
}
```

### React Component Template

```tsx
import { useBloc } from '@blac/react';
import { MyCubit } from './cubits/MyCubit';

export function MyComponent() {
  const [state, cubit] = useBloc(MyCubit);

  return (
    <div>
      <p>Count: {state.count}</p>
      {state.loading && <p>Loading...</p>}
      {state.error && <p>Error: {state.error}</p>}
      
      <button onClick={cubit.increment}>Increment</button>
      <button onClick={cubit.fetchData}>Fetch Data</button>
    </div>
  );
}
```

## Common Patterns

### 1. Form State Management

```typescript
interface FormState {
  values: {
    email: string;
    password: string;
  };
  errors: {
    email?: string;
    password?: string;
  };
  isSubmitting: boolean;
}

export class LoginFormCubit extends Cubit<FormState> {
  constructor() {
    super({
      values: { email: '', password: '' },
      errors: {},
      isSubmitting: false
    });
  }

  updateField = (field: keyof FormState['values'], value: string) => {
    this.patch({
      values: { ...this.state.values, [field]: value },
      errors: { ...this.state.errors, [field]: undefined }
    });
  };

  submit = async () => {
    // Validate
    const errors: FormState['errors'] = {};
    if (!this.state.values.email) errors.email = 'Email is required';
    if (!this.state.values.password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      this.patch({ errors });
      return;
    }

    this.patch({ isSubmitting: true, errors: {} });
    try {
      // API call here
      await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify(this.state.values)
      });
      // Handle success
    } catch (error) {
      this.patch({ 
        isSubmitting: false,
        errors: { email: 'Login failed' }
      });
    }
  };
}
```

### 2. List Management with Loading States

```typescript
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoListState {
  items: TodoItem[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'active' | 'completed';
}

export class TodoListCubit extends Cubit<TodoListState> {
  constructor() {
    super({
      items: [],
      loading: false,
      error: null,
      filter: 'all'
    });
  }

  loadTodos = async () => {
    this.patch({ loading: true, error: null });
    try {
      const response = await fetch('/api/todos');
      const items = await response.json();
      this.patch({ items, loading: false });
    } catch (error) {
      this.patch({ 
        loading: false, 
        error: 'Failed to load todos' 
      });
    }
  };

  addTodo = (text: string) => {
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text,
      completed: false
    };
    this.patch({ items: [...this.state.items, newTodo] });
  };

  toggleTodo = (id: string) => {
    this.patch({
      items: this.state.items.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    });
  };

  setFilter = (filter: TodoListState['filter']) => {
    this.patch({ filter });
  };

  // Computed getter
  get filteredTodos() {
    const { items, filter } = this.state;
    switch (filter) {
      case 'active':
        return items.filter(item => !item.completed);
      case 'completed':
        return items.filter(item => item.completed);
      default:
        return items;
    }
  }
}
```

### 3. Isolated State (Component-Specific)

```typescript
// Each component instance gets its own state
export class ModalCubit extends Cubit<{ isOpen: boolean; data: any }> {
  static isolated = true; // IMPORTANT: Makes each usage independent

  constructor() {
    super({ isOpen: false, data: null });
  }

  open = (data?: any) => {
    this.patch({ isOpen: true, data });
  };

  close = () => {
    this.patch({ isOpen: false, data: null });
  };
}

// Usage: Each Modal component has its own state
function Modal() {
  const [state, cubit] = useBloc(ModalCubit);
  // This instance is unique to this component
}
```

### 4. Shared State with Custom IDs

```typescript
// Multiple instances of same bloc type
function ChatRoom({ roomId }: { roomId: string }) {
  // Each room gets its own ChatBloc instance
  const [state, bloc] = useBloc(ChatBloc, { 
    id: `chat-${roomId}`,
    props: { roomId }
  });

  return (
    <div>
      {state.messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}
```

## Configuration Options

### Global Configuration

```typescript
import { Blac } from '@blac/core';

// Configure before app starts
Blac.setConfig({
  // Disable automatic re-render optimization
  proxyDependencyTracking: false,
  
  // Enable debugging
  exposeBlacInstance: true
});

// Enable logging
Blac.enableLog = true;
```

### Manual Dependencies (Performance Optimization)

```typescript
// Only re-render when specific fields change
const [state, bloc] = useBloc(UserBloc, {
  dependencies: (bloc) => [
    bloc.state.name,
    bloc.state.email
  ]
});
```

## Common Mistakes to Avoid

### 1. **Forgetting Arrow Functions**
```typescript
// ❌ WRONG - Will break
class MyCubit extends Cubit<State> {
  doSomething() {
    this.emit(newState); // 'this' will be undefined
  }
}

// ✅ CORRECT
class MyCubit extends Cubit<State> {
  doSomething = () => {
    this.emit(newState);
  };
}
```

### 2. **Mutating State**
```typescript
// ❌ WRONG - Mutating state
updateItems = () => {
  this.state.items.push(newItem); // NO!
  this.emit(this.state);
};

// ✅ CORRECT - Create new state
updateItems = () => {
  this.emit({
    ...this.state,
    items: [...this.state.items, newItem]
  });
};
```

### 3. **Using emit() in Bloc Event Handlers**
```typescript
// ❌ WRONG - Using this.emit in Bloc
this.on(MyEvent, (event) => {
  this.emit(newState); // NO! Use the emit parameter
});

// ✅ CORRECT - Use emit parameter
this.on(MyEvent, (event, emit) => {
  emit(newState);
});
```

### 4. **Forgetting to Handle Loading/Error States**
```typescript
// ❌ INCOMPLETE
interface State {
  data: any[];
}

// ✅ COMPLETE
interface State {
  data: any[];
  loading: boolean;
  error: string | null;
}
```

## Testing Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Blac } from '@blac/core';
import { MyCubit } from './MyCubit';

describe('MyCubit', () => {
  let cubit: MyCubit;

  beforeEach(() => {
    Blac.resetInstance();
    cubit = new MyCubit();
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should have initial state', () => {
    expect(cubit.state).toEqual({
      count: 0,
      loading: false,
      error: null
    });
  });

  it('should increment count', () => {
    cubit.increment();
    expect(cubit.state.count).toBe(1);
  });

  it('should handle async operations', async () => {
    const promise = cubit.fetchData();
    
    // Check loading state
    expect(cubit.state.loading).toBe(true);
    
    await promise;
    
    // Check final state
    expect(cubit.state.loading).toBe(false);
    expect(cubit.state.error).toBeNull();
  });
});
```

## Installation Commands

```bash
# For React projects
npm install @blac/react
# or
yarn add @blac/react
# or
pnpm add @blac/react

# For non-React projects (rare)
npm install @blac/core
```

## File Structure Recommendation

```
src/
├── blocs/           # For event-driven state (Bloc)
│   ├── UserBloc.ts
│   └── CartBloc.ts
├── cubits/          # For simple state (Cubit)
│   ├── ThemeCubit.ts
│   └── SettingsCubit.ts
├── components/
│   └── MyComponent.tsx
└── App.tsx
```

## Quick Checklist for Implementation

- [ ] All methods use arrow functions (`method = () => {}`)
- [ ] State is serializable (no functions, Dates, or class instances)
- [ ] Loading and error states are handled
- [ ] Using `patch()` for partial updates in Cubits
- [ ] Using event classes (not strings) for Blocs
- [ ] Registering event handlers in Bloc constructor with `this.on()`
- [ ] Using `emit` parameter (not `this.emit`) in Bloc event handlers
- [ ] Testing that methods maintain correct `this` context

## Need Help?

If implementing complex patterns, remember:
1. Start with a Cubit (simpler) before moving to Bloc
2. Use `static isolated = true` for component-specific state
3. Use custom IDs for multiple instances of shared state
4. Enable logging with `Blac.enableLog = true` for debugging