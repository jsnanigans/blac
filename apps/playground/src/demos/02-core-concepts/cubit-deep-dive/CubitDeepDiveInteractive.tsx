import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { motion } from 'framer-motion';
import { useState } from 'react';

// ============= Nested State Example =============
interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  stats: {
    postsCount: number;
    followersCount: number;
  };
}

class UserProfileCubit extends Cubit<UserProfile> {
  constructor() {
    super({
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en',
      },
      stats: {
        postsCount: 42,
        followersCount: 150,
      },
    });
  }

  updateName = (name: string) => {
    this.patch({ name });
  };

  toggleTheme = () => {
    this.patch({
      preferences: {
        ...this.state.preferences,
        theme: this.state.preferences.theme === 'light' ? 'dark' : 'light',
      },
    });
  };

  toggleNotifications = () => {
    this.patch({
      preferences: {
        ...this.state.preferences,
        notifications: !this.state.preferences.notifications,
      },
    });
  };

  incrementPosts = () => {
    this.patch({
      stats: {
        ...this.state.stats,
        postsCount: this.state.stats.postsCount + 1,
      },
    });
  };
}

// ============= Computed Properties Example =============
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      todos: [
        { id: '1', text: 'Learn BlaC', completed: true },
        { id: '2', text: 'Build an app', completed: false },
        { id: '3', text: 'Deploy to production', completed: false },
      ],
      filter: 'all',
    });
  }

  // Computed properties (getters)
  get filteredTodos(): Todo[] {
    const { todos, filter } = this.state;
    if (filter === 'active') return todos.filter((t) => !t.completed);
    if (filter === 'completed') return todos.filter((t) => t.completed);
    return todos;
  }

  get completedCount(): number {
    return this.state.todos.filter((t) => t.completed).length;
  }

  get activeCount(): number {
    return this.state.todos.filter((t) => !t.completed).length;
  }

  get progress(): number {
    const total = this.state.todos.length;
    if (total === 0) return 0;
    return Math.round((this.completedCount / total) * 100);
  }

  addTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
    };
    this.patch({
      todos: [...this.state.todos, newTodo],
    });
  };

  toggleTodo = (id: string) => {
    this.patch({
      todos: this.state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  };

  setFilter = (filter: TodoState['filter']) => {
    this.patch({ filter });
  };
}

// ============= Async Pattern Example =============
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface User {
  id: number;
  name: string;
  email: string;
}

class UserApiCubit extends Cubit<ApiState<User[]>> {
  constructor() {
    super({
      data: null,
      loading: false,
      error: null,
    });
  }

  fetchUsers = async () => {
    this.emit({ data: null, loading: true, error: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Randomly fail sometimes for demo
      if (Math.random() > 0.7) {
        throw new Error('Network error: Failed to fetch users');
      }

      const data = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' },
      ];

      this.emit({ data, loading: false, error: null });
    } catch (error) {
      this.emit({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  reset = () => {
    this.emit({ data: null, loading: false, error: null });
  };
}

// ============= Interactive Components =============
function NestedStateDemo() {
  const [state, cubit] = useBloc(UserProfileCubit);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-cyan-500/15 opacity-90" />
      <div className="relative space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          User Profile (Nested State)
        </h4>
        <div className="space-y-2 text-sm">
          <p>
            Name: <strong>{state.name}</strong>
          </p>
          <p>
            Email: <strong>{state.email}</strong>
          </p>
          <p>
            Theme: <strong>{state.preferences.theme}</strong>
          </p>
          <p>
            Notifications:{' '}
            <strong>{state.preferences.notifications ? 'On' : 'Off'}</strong>
          </p>
          <p>
            Posts: <strong>{state.stats.postsCount}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={cubit.toggleTheme} variant="outline" size="sm">
            Toggle Theme
          </Button>
          <Button
            onClick={() => cubit.updateName('Jane Doe')}
            variant="outline"
            size="sm"
          >
            Change Name
          </Button>
          <Button onClick={cubit.incrementPosts} variant="outline" size="sm">
            New Post
          </Button>
          <Button
            onClick={cubit.toggleNotifications}
            variant="outline"
            size="sm"
          >
            Toggle Notifications
          </Button>
        </div>
      </div>
    </div>
  );
}

function ComputedPropertiesDemo() {
  const [state, cubit] = useBloc(TodoCubit);
  const [newTodoText, setNewTodoText] = useState('');

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      cubit.addTodo(newTodoText);
      setNewTodoText('');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-400/10 via-transparent to-fuchsia-500/15 opacity-90" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Todo List (Computed Properties)
          </h4>
          <div className="text-xs text-muted-foreground">
            Progress: {cubit.progress}% ({cubit.completedCount}/
            {state.todos.length})
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => cubit.setFilter('all')}
            variant={state.filter === 'all' ? 'primary' : 'outline'}
            size="sm"
          >
            All ({state.todos.length})
          </Button>
          <Button
            onClick={() => cubit.setFilter('active')}
            variant={state.filter === 'active' ? 'primary' : 'outline'}
            size="sm"
          >
            Active ({cubit.activeCount})
          </Button>
          <Button
            onClick={() => cubit.setFilter('completed')}
            variant={state.filter === 'completed' ? 'primary' : 'outline'}
            size="sm"
          >
            Completed ({cubit.completedCount})
          </Button>
        </div>

        <div className="space-y-2">
          {cubit.filteredTodos.map((todo) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 rounded bg-background/50 p-2"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => cubit.toggleTodo(todo.id)}
                className="h-4 w-4"
              />
              <span
                className={
                  todo.completed ? 'text-muted-foreground line-through' : ''
                }
              >
                {todo.text}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
            placeholder="Add a new todo..."
            className="flex-1 rounded border bg-background px-3 py-2 text-sm"
          />
          <Button onClick={handleAddTodo} variant="primary" size="sm">
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function AsyncOperationsDemo() {
  const [state, cubit] = useBloc(UserApiCubit);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-teal-500/15 opacity-90" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Async Data Fetching
          </h4>
          <div className="flex gap-2">
            <Button
              onClick={cubit.fetchUsers}
              variant="primary"
              size="sm"
              disabled={state.loading}
            >
              {state.loading ? 'Loading...' : 'Fetch Users'}
            </Button>
            <Button onClick={cubit.reset} variant="outline" size="sm">
              Reset
            </Button>
          </div>
        </div>

        {state.loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand"></div>
          </div>
        )}

        {state.error && (
          <div className="rounded border border-red-500 bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            Error: {state.error}
          </div>
        )}

        {state.data && (
          <div className="space-y-2">
            {state.data.map((user) => (
              <div key={user.id} className="rounded bg-background/50 p-3">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            ))}
          </div>
        )}

        {!state.loading && !state.error && !state.data && (
          <p className="py-8 text-center text-muted-foreground">
            Click "Fetch Users" to load data
          </p>
        )}
      </div>
    </div>
  );
}

// ============= Main Interactive Component for MDX =============
export function CubitDeepDiveInteractive() {
  return (
    <div className="my-8 space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Nested State Management</h3>
        <NestedStateDemo />
        <StateViewer
          bloc={UserProfileCubit}
          title="User Profile State"
          maxDepth={3}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Computed Properties</h3>
        <ComputedPropertiesDemo />
        <StateViewer bloc={TodoCubit} title="Todo State" maxDepth={2} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Async Operations Pattern</h3>
        <AsyncOperationsDemo />
        <StateViewer bloc={UserApiCubit} title="API State" />
      </div>
    </div>
  );
}
