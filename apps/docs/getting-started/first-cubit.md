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
    event.preventDefault();
    const trimmedText = this.state.inputText.trim();
    if (!trimmedText) return;
    this.addTodo(trimmedText);
    this.setInputText('');
  };

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

  get hasCompletedTodos() {
    return this.state.todos.some(todo => todo.completed);
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
          aria-label="New todo input"
        />
        <button type="submit" aria-label="Add new todo">Add</button>
      </form>

      {/* Filter Buttons */}
      <div className="filters" role="radiogroup" aria-label="Filter todos">
        <button
          role="radio"
          aria-checked={state.filter === 'all'}
          onClick={() => todoCubit.setFilter('all')}
        >
          All
        </button>
        <button
          role="radio"
          aria-checked={state.filter === 'active'}
          onClick={() => todoCubit.setFilter('active')}
        >
          Active ({todoCubit.activeTodoCount})
        </button>
        <button
          role="radio"
          aria-checked={state.filter === 'completed'}
          onClick={() => todoCubit.setFilter('completed')}
        >
          Completed
        </button>
      </div>

      {/* Todo List Items */}
      <ul aria-label="Todo items">
        {todoCubit.filteredTodos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => todoCubit.toggleTodo(todo.id)}
              aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.text}
            </span>
            <button
              onClick={() => todoCubit.deleteTodo(todo.id)}
              aria-label={`Delete "${todo.text}"`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* Clear Completed Button */}
      {todoCubit.hasCompletedTodos && (
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
