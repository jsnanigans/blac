# Your First Cubit

In this guide, we'll create a feature-complete todo list using a Cubit. This will introduce you to core BlaC concepts while building something practical.

## What is a Cubit?

A Cubit is a simple state container that:
- Holds a single piece of state
- Provides methods to update that state
- Notifies listeners when state changes
- Lives outside your React components

Think of it as a self-contained box of logic that your UI can connect to.

## Building a Todo List

Let's build a todo list step by step to understand how Cubits work in practice.

### Step 1: Define the State

First, let's define what our state looks like:

```typescript
// src/state/todo/todo.types.ts
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  inputText: string;
}
```

### Step 2: Create the Cubit

Now let's create a Cubit to manage this state:

```typescript
// src/state/todo/todo.cubit.ts
import { Cubit } from '@blac/core';
import { Todo, TodoState } from './todo.types';

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      todos: [],
      filter: 'all',
      inputText: ''
    });
  }

  // Add a new todo
  addTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date()
    };

    this.patch({
      todos: [...this.state.todos, newTodo]
    });
  };

  // Toggle todo completion
  toggleTodo = (id: string) => {
    this.patch({
      todos: this.state.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    });
  };

  // Delete a todo
  deleteTodo = (id: string) => {
    this.patch({
      todos: this.state.todos.filter(todo => todo.id !== id)
    });
  };

  // Update filter
  setFilter = (filter: TodoState['filter']) => {
    this.patch({ filter });
  };

  // Clear completed todos
  clearCompleted = () => {
    this.patch({
      todos: this.state.todos.filter(todo => !todo.completed)
    });
  };

  // Set input text for the form
  setInputText = (text: string) => {
    this.patch({ inputText: text });
  };

  // Handle form submission to add a todo
  handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedText = this.state.inputText.trim();
    if (!trimmedText) return;
    this.addTodo(trimmedText);
    this.setInputText('');
  }

  // Computed values (getters)
  get filteredTodos() {
    const { todos, filter } = this.state;

    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }

  get activeTodoCount() {
    return this.state.todos.filter(todo => !todo.completed).length;
  }
}
```

### Key Concepts

Let's break down what's happening:

1. **State Initialization**: The constructor calls `super()` with the initial state
2. **Arrow Functions**: All methods use arrow function syntax to maintain proper `this` binding when used outside the Cubit
3. **patch() Method**: Updates only the specified properties, leaving others unchanged
4. **Computed Properties**: Getters derive values from the current state

### Step 3: Use the Cubit in React

Now let's create components that use our TodoCubit:

```tsx
// src/components/TodoList.tsx
import { useBloc } from '@blac/react';
import { TodoCubit } from '../state/todo/todo.cubit';
import { useState } from 'react';

export function TodoList() {
  const [state, todoCubit] = useBloc(TodoCubit);

  return (
    <div className="todo-app">
      <h1>Todo List</h1>

      {/* Add Todo Form */}
      <form onSubmit={todoCubit.handleFormSubmit}>
        <input
          type="text"
          value={state.inputText}
          onChange={(e) => todoCubit.setInputText(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>

      {/* Filter Buttons */}
      <div className="filters">
        <button
          className={state.filter === 'all' ? 'active' : ''}
          onClick={() => todoCubit.setFilter('all')}
        >
          All
        </button>
        <button
          className={state.filter === 'active' ? 'active' : ''}
          onClick={() => todoCubit.setFilter('active')}
        >
          Active ({todoCubit.activeTodoCount})
        </button>
        <button
          className={state.filter === 'completed' ? 'active' : ''}
          onClick={() => todoCubit.setFilter('completed')}
        >
          Completed
        </button>
      </div>

      {/* Todo Items */}
      <ul>
        {todoCubit.filteredTodos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => todoCubit.toggleTodo(todo.id)}
            />
            <span className={todo.completed ? 'completed' : ''}>
              {todo.text}
            </span>
            <button onClick={() => todoCubit.deleteTodo(todo.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* Clear Completed */}
      {state.todos.some(todo => todo.completed) && (
        <button onClick={todoCubit.clearCompleted}>
          Clear Completed
        </button>
      )}
    </div>
  );
}
```

### Step 4: Understanding the Flow

Here's what happens when a user interacts with the todo list:

1. **User clicks "Add"** → `todoCubit.addTodo()` is called
2. **Cubit updates state** → `patch()` merges new todos array
3. **React re-renders** → `useBloc` detects state change
4. **UI updates** → New todo appears in the list

This unidirectional flow makes debugging easy and state changes predictable.

## Advanced: Persisting State

Let's add local storage persistence to our todo list:

```typescript
// src/state/todo/todo.cubit.ts
import { Cubit } from '@blac/core';
import { Todo, TodoState } from './todo.types';

const STORAGE_KEY = 'blac_todos';

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    // Load from localStorage or use default
    const stored = localStorage.getItem(STORAGE_KEY);
    const initialState = stored
      ? JSON.parse(stored)
      : { todos: [], filter: 'all' };

    super(initialState);

    // Save to localStorage whenever state changes
    this.on('StateChange', (state) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  // ... rest of the methods remain the same
}
```

## Best Practices

### 1. Keep Cubits Focused
Each Cubit should manage a single feature or domain:
```typescript
// ✅ Good: Focused on todos
class TodoCubit extends Cubit<TodoState> { }

// ❌ Bad: Trying to manage everything
class AppCubit extends Cubit<{ todos: [], user: {}, settings: {} }> { }
```

### 2. Use TypeScript
Define interfaces for your state to catch errors early:
```typescript
interface CounterState {
  count: number;
  lastUpdated: Date | null;
}

class CounterCubit extends Cubit<CounterState> {
  // TypeScript ensures you can't emit invalid state
}
```

### 3. Avoid Direct State Mutation
Always create new objects/arrays:
```typescript
// ✅ Good: Creating new array
this.patch({
  todos: [...this.state.todos, newTodo]
});

// ❌ Bad: Mutating existing array
this.state.todos.push(newTodo); // Don't do this!
this.patch({ todos: this.state.todos });
```

### 4. Use Computed Properties
Derive values instead of storing them:
```typescript
// ✅ Good: Computed from state
get completedCount() {
  return this.state.todos.filter(t => t.completed).length;
}

// ❌ Avoid: Storing derived values
interface TodoState {
  todos: Todo[];
  completedCount: number; // This can get out of sync
}
```

## What You've Learned

Congratulations! You've now:
- ✅ Created your first Cubit
- ✅ Managed complex state with multiple operations
- ✅ Connected a Cubit to React components
- ✅ Implemented computed properties
- ✅ Added state persistence

## What's Next?

Ready to level up? Learn about Blocs for event-driven state management:

<div style="margin-top: 48px;">
  <a href="/getting-started/first-bloc" style="
    display: inline-block;
    padding: 12px 24px;
    background: var(--vp-c-brand-3);
    color: white;
    border-radius: 24px;
    text-decoration: none;
    font-weight: 500;
  ">
    Learn About Blocs →
  </a>
</div>
