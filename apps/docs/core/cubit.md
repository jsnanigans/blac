# Cubit

Cubit is a simple state container with direct state mutation methods. Use it for most state management needs.

## Basic Structure

```typescript
import { Cubit } from '@blac/core';

interface UserState {
  name: string;
  email: string;
  age: number;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ name: '', email: '', age: 0 }); // Initial state
  }

  // Always use arrow functions
  setName = (name: string) => {
    this.patch({ name });
  };

  setEmail = (email: string) => {
    this.patch({ email });
  };
}
```

## State Update Methods

### `emit(newState)`

Replace the entire state:

```typescript
class TodoCubit extends Cubit<{ todos: Todo[]; filter: string }> {
  reset = () => {
    this.emit({ todos: [], filter: 'all' });
  };
}
```

### `update(fn)`

Update state with a function. Use for complex updates:

```typescript
class TodoCubit extends Cubit<{ todos: Todo[]; filter: string }> {
  addTodo = (text: string) => {
    this.update((state) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), text, done: false }],
    }));
  };

  // Use update() for nested object changes
  updateSettings = (theme: string) => {
    this.update((state) => ({
      ...state,
      settings: { ...state.settings, theme },
    }));
  };
}
```

### `patch(partial)`

Shallow merge partial state. Use for simple flat updates:

```typescript
class UserCubit extends Cubit<UserState> {
  setName = (name: string) => {
    this.patch({ name }); // Only updates 'name'
  };

  updateMultiple = (name: string, age: number) => {
    this.patch({ name, age }); // Updates both
  };
}
```

**Warning**: `patch()` is shallow merge only:

```typescript
interface AppState {
  user: { name: string; email: string };
  settings: { theme: string; lang: string };
}

class AppCubit extends Cubit<AppState> {
  // ❌ Wrong - replaces entire settings object
  updateTheme = (theme: string) => {
    this.patch({ settings: { theme } }); // settings.lang is lost!
  };

  // ✅ Correct - use update() for nested changes
  updateTheme = (theme: string) => {
    this.update((state) => ({
      ...state,
      settings: { ...state.settings, theme },
    }));
  };
}
```

## Computed Getters

Use getters for derived values. They're automatically tracked by `useBloc`:

```typescript
class TodoCubit extends Cubit<{ todos: Todo[]; filter: string }> {
  constructor() {
    super({ todos: [], filter: 'all' });
  }

  get visibleTodos() {
    if (this.state.filter === 'active') {
      return this.state.todos.filter((t) => !t.done);
    }
    if (this.state.filter === 'completed') {
      return this.state.todos.filter((t) => t.done);
    }
    return this.state.todos;
  }

  get activeCount() {
    return this.state.todos.filter((t) => !t.done).length;
  }

  get allDone() {
    return this.state.todos.length > 0 && this.state.todos.every((t) => t.done);
  }
}
```

## Arrow Functions Requirement

Always use arrow functions for methods. Regular methods lose `this` context when passed to React:

```typescript
class CounterCubit extends Cubit<{ count: number }> {
  // ✅ Correct - arrow function
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  // ❌ Wrong - loses 'this' when called as event handler
  // 👽 Or bind it in the constructor (not recommended)
  decrement() {
    this.emit({ count: this.state.count - 1 });
  }
}

// In React:
<button onClick={cubit.increment}>+</button>  // ✅ Works
<button onClick={cubit.decrement}>-</button>  // ❌ Breaks
```

## Example: Form State

```typescript
interface FormState {
  values: { email: string; password: string };
  errors: Record<string, string>;
  isSubmitting: boolean;
}

class LoginFormCubit extends Cubit<FormState> {
  constructor() {
    super({
      values: { email: '', password: '' },
      errors: {},
      isSubmitting: false,
    });
  }

  setField = (field: 'email' | 'password', value: string) => {
    this.update((state) => ({
      ...state,
      values: { ...state.values, [field]: value },
      errors: { ...state.errors, [field]: '' },
    }));
  };

  validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!this.state.values.email) {
      errors.email = 'Email required';
    }
    if (!this.state.values.password) {
      errors.password = 'Password required';
    }

    this.patch({ errors });
    return Object.keys(errors).length === 0;
  };

  submit = async () => {
    if (!this.validate()) return;

    this.patch({ isSubmitting: true });

    try {
      await api.login(this.state.values);
    } catch (error) {
      this.patch({ errors: { form: error.message } });
    } finally {
      this.patch({ isSubmitting: false });
    }
  };
}
```

## See Also

- [Vertex](/core/vertex) - Event-driven alternative
- [Configuration](/core/configuration) - `@blac()` decorator options
- [Instance Management](/core/instance-management) - Static methods
