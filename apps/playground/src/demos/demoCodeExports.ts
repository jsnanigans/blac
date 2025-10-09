/**
 * Clean demo code exports for the playground
 * This provides self-contained code snippets without UI dependencies
 */

export const demoCodeExports = {
  counter: {
    title: 'Basic Counter',
    description: 'A simple counter demonstrating basic Cubit usage',
    code: `import React from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

// Counter state interface
interface CounterState {
  count: number;
}

// Counter Cubit for state management
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}

// React component using the Cubit
export function Counter() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl font-bold mb-2">{state.count}</div>
        <p className="text-gray-600">
          Click the buttons to change the counter
        </p>
      </div>

      <div className="flex justify-center gap-2">
        <button 
          onClick={cubit.decrement}
          className="px-4 py-2 border rounded hover:bg-gray-100"
        >
          Decrement
        </button>
        <button 
          onClick={cubit.reset}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Reset
        </button>
        <button 
          onClick={cubit.increment}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Increment
        </button>
      </div>
    </div>
  );
}

// Export as App for the playground
export { Counter as App };`,
  },

  'emit-patch': {
    title: 'Emit vs Patch',
    description: 'Understanding the difference between emit and patch',
    code: `import React from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

interface DemoState {
  user: {
    name: string;
    age: number;
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class EmitPatchCubit extends Cubit<DemoState> {
  constructor() {
    super({
      user: { name: 'Alice', age: 28 },
      settings: { theme: 'light', notifications: true }
    });
  }

  // EMIT - replaces entire state
  emitNewState = () => {
    this.emit({
      user: { name: 'Bob', age: 35 },
      settings: { theme: 'dark', notifications: false }
    });
  };

  // PATCH - merges with existing state
  patchUser = () => {
    this.patch({
      user: { name: 'Charlie', age: 30 }
    });
    // settings remain unchanged
  };

  toggleTheme = () => {
    this.patch({
      settings: {
        ...this.state.settings,
        theme: this.state.settings.theme === 'light' ? 'dark' : 'light'
      }
    });
  };
}

export function EmitPatchDemo() {
  const [state, cubit] = useBloc(EmitPatchCubit);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Emit vs Patch Demo</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">User</h3>
          <p>Name: {state.user.name}</p>
          <p>Age: {state.user.age}</p>
        </div>
        
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Settings</h3>
          <p>Theme: {state.settings.theme}</p>
          <p>Notifications: {state.settings.notifications ? 'On' : 'Off'}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={cubit.emitNewState}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Emit (Replace All)
        </button>
        <button
          onClick={cubit.patchUser}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Patch User Only
        </button>
        <button
          onClick={cubit.toggleTheme}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Toggle Theme
        </button>
      </div>
    </div>
  );
}

export { EmitPatchDemo as App };`,
  },

  'isolated-counter': {
    title: 'Isolated Counter',
    description: 'Each component instance gets its own Cubit instance',
    code: `import React from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class IsolatedCounterCubit extends Cubit<number> {
  // Mark as isolated - each component gets its own instance
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
}

function IsolatedCounter({ label }: { label: string }) {
  const [count, cubit] = useBloc(IsolatedCounterCubit);

  return (
    <div className="border rounded p-4">
      <h3 className="font-semibold mb-2">{label}</h3>
      <div className="text-2xl font-bold mb-2">{count}</div>
      <div className="flex gap-2">
        <button
          onClick={cubit.decrement}
          className="px-3 py-1 border rounded hover:bg-gray-100"
        >
          -
        </button>
        <button
          onClick={cubit.increment}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function IsolatedCounterDemo() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Isolated Counters</h2>
      <p className="mb-4 text-gray-600">
        Each counter below has its own isolated Cubit instance.
        Changes to one don't affect the others.
      </p>
      
      <div className="grid grid-cols-3 gap-4">
        <IsolatedCounter label="Counter A" />
        <IsolatedCounter label="Counter B" />
        <IsolatedCounter label="Counter C" />
      </div>
    </div>
  );
}

export { IsolatedCounterDemo as App };`,
  },

  todo: {
    title: 'Todo List',
    description: 'A todo list using Bloc pattern with events',
    code: `import React, { useState } from 'react';
import { Bloc } from '@blac/core';
import { useBloc } from '@blac/react';

// Todo model
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

// Events
class AddTodo {
  constructor(public text: string) {}
}

class ToggleTodo {
  constructor(public id: string) {}
}

class RemoveTodo {
  constructor(public id: string) {}
}

class SetFilter {
  constructor(public filter: 'all' | 'active' | 'completed') {}
}

type TodoEvent = AddTodo | ToggleTodo | RemoveTodo | SetFilter;

// Bloc
class TodoBloc extends Bloc<TodoState, TodoEvent> {
  constructor() {
    super({
      todos: [],
      filter: 'all'
    });

    this.on(AddTodo, (event, emit) => {
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: event.text,
        completed: false
      };
      emit({
        ...this.state,
        todos: [...this.state.todos, newTodo]
      });
    });

    this.on(ToggleTodo, (event, emit) => {
      emit({
        ...this.state,
        todos: this.state.todos.map(todo =>
          todo.id === event.id
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      });
    });

    this.on(RemoveTodo, (event, emit) => {
      emit({
        ...this.state,
        todos: this.state.todos.filter(todo => todo.id !== event.id)
      });
    });

    this.on(SetFilter, (event, emit) => {
      emit({
        ...this.state,
        filter: event.filter
      });
    });
  }

  get filteredTodos() {
    switch (this.state.filter) {
      case 'active':
        return this.state.todos.filter(t => !t.completed);
      case 'completed':
        return this.state.todos.filter(t => t.completed);
      default:
        return this.state.todos;
    }
  }
}

export function TodoDemo() {
  const [state, bloc] = useBloc(TodoBloc);
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      bloc.add(new AddTodo(input.trim()));
      setInput('');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Todo List (Bloc Pattern)</h2>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Todo
          </button>
        </div>
      </form>

      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'completed'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => bloc.add(new SetFilter(filter))}
            className={\`px-3 py-1 rounded \${
              state.filter === filter
                ? 'bg-blue-500 text-white'
                : 'border hover:bg-gray-100'
            }\`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {bloc.filteredTodos.map(todo => (
          <div
            key={todo.id}
            className="flex items-center gap-2 p-2 border rounded"
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => bloc.add(new ToggleTodo(todo.id))}
              className="w-4 h-4"
            />
            <span
              className={\`flex-1 \${
                todo.completed ? 'line-through text-gray-500' : ''
              }\`}
            >
              {todo.text}
            </span>
            <button
              onClick={() => bloc.add(new RemoveTodo(todo.id))}
              className="px-2 py-1 text-red-500 hover:bg-red-50 rounded"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        {state.todos.length} total, {bloc.filteredTodos.length} shown
      </div>
    </div>
  );
}

export { TodoDemo as App };`,
  },
};

// Helper to get demo code by ID
export function getDemoCode(demoId: string): string | undefined {
  return demoCodeExports[demoId as keyof typeof demoCodeExports]?.code;
}
