import { PlaygroundFile, createFile } from '@/lib/types';

interface MultiFileDemo {
  files: Array<{
    name: string;
    content: string;
  }>;
}

// Multi-file demo exports for complex demos
const multiFileDemos: Record<string, MultiFileDemo> = {
  'emit-patch': {
    files: [
      {
        name: 'App.tsx',
        content: `import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { EmitPatchCubit } from './EmitPatchCubit';

export function App() {
  const [state, cubit] = useBloc(EmitPatchCubit);
  const [lastOperation, setLastOperation] = useState<string>('');

  const handleEmit = () => {
    cubit.emitComplete();
    setLastOperation('emit() - Replaced entire state');
  };

  const handlePatch = () => {
    cubit.patchPartial();
    setLastOperation('patch() - Merged with existing state');
  };

  const handlePatchNested = () => {
    cubit.patchNestedCorrect();
    setLastOperation('patch() - Updated nested field correctly');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Emit vs Patch Demo</h1>
      
      {lastOperation && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">
          Last operation: {lastOperation}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Current State</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Operations</h3>
            
            <div className="space-y-2">
              <button
                onClick={handleEmit}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                emit() - Replace Entire State
              </button>
              
              <button
                onClick={handlePatch}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                patch() - Update User Only
              </button>
              
              <button
                onClick={handlePatchNested}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                patch() - Update Nested Theme
              </button>
              
              <button
                onClick={cubit.reset}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Reset to Initial State
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p className="mb-2"><strong>emit():</strong> Replaces the entire state object</p>
            <p><strong>patch():</strong> Shallow merges with existing state</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-sm">
          <strong>⚠️ Remember:</strong> patch() only does a shallow merge. 
          For nested objects, use the spread operator to preserve other fields.
        </p>
      </div>
    </div>
  );
}`,
      },
      {
        name: 'EmitPatchCubit.ts',
        content: `import { Cubit } from '@blac/core';

export interface DemoState {
  user: {
    name: string;
    age: number;
    role: string;
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  stats: {
    visits: number;
    lastVisit: string;
  };
}

export class EmitPatchCubit extends Cubit<DemoState> {
  constructor() {
    super({
      user: {
        name: 'Alice',
        age: 28,
        role: 'Developer'
      },
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en'
      },
      stats: {
        visits: 42,
        lastVisit: '2024-01-15'
      }
    });
  }

  // EMIT - replaces entire state
  emitComplete = () => {
    this.emit({
      user: {
        name: 'Bob',
        age: 35,
        role: 'Manager'
      },
      settings: {
        theme: 'dark',
        notifications: false,
        language: 'es'
      },
      stats: {
        visits: 100,
        lastVisit: '2024-01-20'
      }
    });
  };

  // PATCH - shallow merge with existing state
  patchPartial = () => {
    this.patch({
      user: {
        name: 'Charlie',
        age: 30,
        role: 'Designer'
      }
      // settings and stats remain unchanged
    });
  };

  // CORRECT way to patch nested objects
  patchNestedCorrect = () => {
    this.patch({
      settings: {
        ...this.state.settings,
        theme: this.state.settings.theme === 'light' ? 'dark' : 'light'
      }
    });
  };

  // Reset to initial state
  reset = () => {
    this.emit({
      user: {
        name: 'Alice',
        age: 28,
        role: 'Developer'
      },
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en'
      },
      stats: {
        visits: 42,
        lastVisit: '2024-01-15'
      }
    });
  };
}`,
      },
    ],
  },

  counter: {
    files: [
      {
        name: 'App.tsx',
        content: `import React from 'react';
import { useBloc } from '@blac/react';
import { CounterCubit } from './CounterCubit';

export function App() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Counter Demo
      </h1>
      
      <div className="text-center mb-8">
        <div className="text-6xl font-bold text-blue-600">
          {state.count}
        </div>
        <p className="text-gray-600 mt-2">
          Current count value
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={cubit.decrement}
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Decrement
        </button>
        
        <button
          onClick={cubit.reset}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
        >
          Reset
        </button>
        
        <button
          onClick={cubit.increment}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          Increment
        </button>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-700">
          This demo shows basic Cubit usage with increment, decrement, and reset operations.
          Notice how all methods use arrow functions for proper React binding.
        </p>
      </div>
    </div>
  );
}`,
      },
      {
        name: 'CounterCubit.ts',
        content: `import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

export class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  // Arrow functions are REQUIRED for proper React binding
  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}`,
      },
    ],
  },

  todo: {
    files: [
      {
        name: 'App.tsx',
        content: `import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { TodoBloc } from './TodoBloc';
import { TodoItem } from './TodoItem';

export function App() {
  const [state, bloc] = useBloc(TodoBloc);
  const [newTodoText, setNewTodoText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      bloc.addTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  const activeTodos = state.todos.filter(t => !t.completed).length;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Todo List (Bloc Pattern)</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Add Todo
        </button>
      </form>

      <div className="space-y-2 mb-6">
        {bloc.filteredTodos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={bloc.toggleTodo}
            onRemove={bloc.removeTodo}
          />
        ))}
      </div>

      {state.todos.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{activeTodos} item{activeTodos !== 1 ? 's' : ''} left</span>
          
          <div className="flex gap-2">
            {(['all', 'active', 'completed'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => bloc.setFilter(filter)}
                className={\`px-3 py-1 rounded \${
                  state.filter === filter
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }\`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {state.todos.some(t => t.completed) && (
            <button
              onClick={bloc.clearCompleted}
              className="text-red-600 hover:underline"
            >
              Clear completed
            </button>
          )}
        </div>
      )}
    </div>
  );
}`,
      },
      {
        name: 'TodoBloc.ts',
        content: `import { Vertex } from '@blac/core';
import { Todo, TodoState } from './types';
import {
  AddTodoEvent,
  ToggleTodoEvent,
  RemoveTodoEvent,
  SetFilterEvent,
  ClearCompletedEvent,
  TodoEvents
} from './TodoEvents';

const initialState: TodoState = {
  todos: [
    { id: 1, text: 'Learn BlaC patterns', completed: true },
    { id: 2, text: 'Build an app', completed: false },
    { id: 3, text: 'Write tests', completed: false }
  ],
  filter: 'all',
  nextId: 4
};

export class TodoBloc extends Vertex<TodoState, TodoEvents> {
  constructor() {
    super(initialState);

    // Register event handlers
    this.on(AddTodoEvent, this.handleAddTodo);
    this.on(ToggleTodoEvent, this.handleToggleTodo);
    this.on(RemoveTodoEvent, this.handleRemoveTodo);
    this.on(SetFilterEvent, this.handleSetFilter);
    this.on(ClearCompletedEvent, this.handleClearCompleted);
  }

  // Event handlers - all use arrow functions
  private handleAddTodo = (event: AddTodoEvent, emit: (state: TodoState) => void) => {
    if (!event.text.trim()) return;
    
    emit({
      ...this.state,
      todos: [
        ...this.state.todos,
        { id: this.state.nextId, text: event.text, completed: false }
      ],
      nextId: this.state.nextId + 1
    });
  };

  private handleToggleTodo = (event: ToggleTodoEvent, emit: (state: TodoState) => void) => {
    emit({
      ...this.state,
      todos: this.state.todos.map(todo =>
        todo.id === event.id
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    });
  };

  private handleRemoveTodo = (event: RemoveTodoEvent, emit: (state: TodoState) => void) => {
    emit({
      ...this.state,
      todos: this.state.todos.filter(todo => todo.id !== event.id)
    });
  };

  private handleSetFilter = (event: SetFilterEvent, emit: (state: TodoState) => void) => {
    emit({
      ...this.state,
      filter: event.filter
    });
  };

  private handleClearCompleted = (_event: ClearCompletedEvent, emit: (state: TodoState) => void) => {
    emit({
      ...this.state,
      todos: this.state.todos.filter(todo => !todo.completed)
    });
  };

  // Public methods for dispatching events
  addTodo = (text: string) => this.add(new AddTodoEvent(text));
  toggleTodo = (id: number) => this.add(new ToggleTodoEvent(id));
  removeTodo = (id: number) => this.add(new RemoveTodoEvent(id));
  setFilter = (filter: 'all' | 'active' | 'completed') => this.add(new SetFilterEvent(filter));
  clearCompleted = () => this.add(new ClearCompletedEvent());

  // Getter for filtered todos
  get filteredTodos(): Todo[] {
    switch (this.state.filter) {
      case 'active':
        return this.state.todos.filter(todo => !todo.completed);
      case 'completed':
        return this.state.todos.filter(todo => todo.completed);
      default:
        return this.state.todos;
    }
  }
}`,
      },
      {
        name: 'TodoEvents.ts',
        content: `// Event classes for TodoBloc
export class AddTodoEvent {
  constructor(public readonly text: string) {}
}

export class ToggleTodoEvent {
  constructor(public readonly id: number) {}
}

export class RemoveTodoEvent {
  constructor(public readonly id: number) {}
}

export class SetFilterEvent {
  constructor(public readonly filter: 'all' | 'active' | 'completed') {}
}

export class ClearCompletedEvent {}

// Union type for all events
export type TodoEvents =
  | AddTodoEvent
  | ToggleTodoEvent
  | RemoveTodoEvent
  | SetFilterEvent
  | ClearCompletedEvent;`,
      },
      {
        name: 'TodoItem.tsx',
        content: `import React from 'react';
import { Todo } from './types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onRemove }: TodoItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="w-5 h-5"
      />
      <span
        className={\`flex-1 \${
          todo.completed ? 'line-through text-gray-500' : ''
        }\`}
      >
        {todo.text}
      </span>
      <button
        onClick={() => onRemove(todo.id)}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
      >
        Remove
      </button>
    </div>
  );
}`,
      },
      {
        name: 'types.ts',
        content: `export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  nextId: number;
}`,
      },
    ],
  },

  async: {
    files: [
      {
        name: 'App.tsx',
        content: `import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { ApiCubit } from './ApiCubit';

export function App() {
  const [state, cubit] = useBloc(ApiCubit);
  const [shouldFail, setShouldFail] = useState(false);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Async Operations Demo</h1>

      <div className="mb-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shouldFail}
            onChange={(e) => setShouldFail(e.target.checked)}
          />
          <span>Simulate API failure</span>
        </label>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => cubit.fetchData(shouldFail)}
          disabled={state.loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {state.loading ? 'Loading...' : 'Fetch Data'}
        </button>
        
        <button
          onClick={() => cubit.fetchWithRetry(3)}
          disabled={state.loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Fetch with Retry
        </button>
        
        <button
          onClick={cubit.reset}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Reset
        </button>
      </div>

      {state.error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          Error: {state.error}
        </div>
      )}

      {state.data && (
        <div className="p-4 bg-green-100 rounded mb-4">
          <h3 className="font-semibold mb-2">Success!</h3>
          <pre className="text-sm">{JSON.stringify(state.data, null, 2)}</pre>
        </div>
      )}

      <div className="text-sm text-gray-600">
        Success: {state.successCount} | Errors: {state.errorCount}
      </div>
    </div>
  );
}`,
      },
      {
        name: 'ApiCubit.ts',
        content: `import { Cubit } from '@blac/core';

interface ApiState {
  data: any | null;
  loading: boolean;
  error: string | null;
  successCount: number;
  errorCount: number;
}

export class ApiCubit extends Cubit<ApiState> {
  constructor() {
    super({
      data: null,
      loading: false,
      error: null,
      successCount: 0,
      errorCount: 0,
    });
  }

  // Simulated API call
  fetchData = async (shouldFail: boolean = false) => {
    this.emit({ ...this.state, loading: true, error: null });

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (shouldFail) {
        throw new Error('Network request failed');
      }

      const data = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        message: 'Data fetched successfully',
        value: Math.floor(Math.random() * 100),
      };

      this.emit({
        data,
        loading: false,
        error: null,
        successCount: this.state.successCount + 1,
        errorCount: this.state.errorCount,
      });
    } catch (error) {
      this.emit({
        ...this.state,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCount: this.state.errorCount + 1,
      });
    }
  };

  // Retry with exponential backoff
  fetchWithRetry = async (maxRetries: number = 3) => {
    let retryCount = 0;

    while (retryCount < maxRetries) {
      this.emit({
        ...this.state,
        loading: true,
        error: retryCount > 0 ? \`Retry attempt \${retryCount}/\${maxRetries}...\` : null,
      });

      try {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount))
        );

        // 50% chance of success for demo
        if (Math.random() > 0.5) {
          const data = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            message: \`Success after \${retryCount + 1} attempt(s)\`,
            value: Math.floor(Math.random() * 100),
          };

          this.emit({
            data,
            loading: false,
            error: null,
            successCount: this.state.successCount + 1,
            errorCount: this.state.errorCount,
          });
          return;
        } else {
          throw new Error(\`Attempt \${retryCount + 1} failed\`);
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          this.emit({
            ...this.state,
            loading: false,
            error: \`Failed after \${maxRetries} attempts\`,
            errorCount: this.state.errorCount + 1,
          });
        }
      }
    }
  };

  reset = () => {
    this.emit({
      data: null,
      loading: false,
      error: null,
      successCount: 0,
      errorCount: 0,
    });
  };
}`,
      },
    ],
  },

  stream: {
    files: [
      {
        name: 'App.tsx',
        content: `import React, { useEffect, useState } from 'react';
import { StreamCubit } from './StreamCubit';

export function App() {
  const [cubit] = useState(() => new StreamCubit());
  const [state, setState] = useState(cubit.state);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to state changes
    const subscription = cubit.stream.subscribe((newState) => {
      setState(newState);
      setLogs(prev => [...prev, \`State updated: count = \${newState.count}\`]);
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
      cubit.dispose();
    };
  }, [cubit]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Stream API Demo</h1>
      
      <div className="mb-6">
        <div className="text-4xl font-bold text-center mb-4">
          {state.count}
        </div>
        
        <div className="flex justify-center gap-2">
          <button
            onClick={cubit.increment}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Increment
          </button>
          <button
            onClick={cubit.decrement}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Decrement
          </button>
          <button
            onClick={cubit.reset}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-semibold mb-2">Stream Log:</h3>
        <div className="text-sm space-y-1 max-h-40 overflow-auto">
          {logs.map((log, i) => (
            <div key={i} className="text-gray-600">{log}</div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 rounded">
        <p className="text-sm">
          This demo shows direct subscription to state changes using the Stream API,
          bypassing React hooks for cases where you need more control.
        </p>
      </div>
    </div>
  );
}`,
      },
      {
        name: 'StreamCubit.ts',
        content: `import { Cubit } from '@blac/core';

interface StreamState {
  count: number;
  lastUpdate: string;
}

export class StreamCubit extends Cubit<StreamState> {
  constructor() {
    super({
      count: 0,
      lastUpdate: new Date().toISOString()
    });
  }

  increment = () => {
    this.patch({
      count: this.state.count + 1,
      lastUpdate: new Date().toISOString()
    });
  };

  decrement = () => {
    this.patch({
      count: this.state.count - 1,
      lastUpdate: new Date().toISOString()
    });
  };

  reset = () => {
    this.emit({
      count: 0,
      lastUpdate: new Date().toISOString()
    });
  };
}`,
      },
    ],
  },
};

export function getDemoFiles(demoId: string): PlaygroundFile[] | null {
  const demo = multiFileDemos[demoId];
  if (!demo) return null;

  return demo.files.map((file) => createFile(file.name, file.content));
}
