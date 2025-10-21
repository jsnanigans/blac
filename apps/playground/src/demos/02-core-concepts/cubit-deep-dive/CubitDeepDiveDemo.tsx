import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import {
  ArticleSection,
  SectionHeader,
} from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import {
  ConceptCallout,
  TipCallout,
  WarningCallout,
  InfoCallout,
} from '@/components/shared/ConceptCallout';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { useState } from 'react';

// ============= Basic Counter Cubit =============
interface CounterState {
  count: number;
  lastAction: string;
}

class BasicCounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, lastAction: 'initialized' });
  }

  increment = () => {
    this.patch({
      count: this.state.count + 1,
      lastAction: 'incremented',
    });
  };

  decrement = () => {
    this.patch({
      count: this.state.count - 1,
      lastAction: 'decremented',
    });
  };

  reset = () => {
    this.emit({ count: 0, lastAction: 'reset' });
  };

  setCount = (value: number) => {
    this.patch({
      count: value,
      lastAction: `set to ${value}`,
    });
  };
}

// ============= User Profile Cubit (Nested State) =============
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
    followingCount: number;
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
        followingCount: 75,
      },
    });
  }

  updateName = (name: string) => {
    this.patch({ name });
  };

  updatePreferences = (preferences: Partial<UserProfile['preferences']>) => {
    this.patch({
      preferences: {
        ...this.state.preferences,
        ...preferences,
      },
    });
  };

  toggleTheme = () => {
    this.patch({
      preferences: {
        ...this.state.preferences,
        theme: this.state.preferences.theme === 'light' ? 'dark' : 'light',
      },
    });
  };

  incrementPostsCount = () => {
    this.patch({
      stats: {
        ...this.state.stats,
        postsCount: this.state.stats.postsCount + 1,
      },
    });
  };
}

// ============= Todo Cubit (Computed Properties) =============
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      todos: [
        { id: '1', text: 'Learn BlaC', completed: true, createdAt: new Date() },
        {
          id: '2',
          text: 'Build an app',
          completed: false,
          createdAt: new Date(),
        },
        {
          id: '3',
          text: 'Deploy to production',
          completed: false,
          createdAt: new Date(),
        },
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
      createdAt: new Date(),
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

// ============= API Cubit (Async Pattern) =============
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

class ApiCubit<T> extends Cubit<ApiState<T>> {
  constructor() {
    super({
      data: null,
      loading: false,
      error: null,
    });
  }

  fetch = async (fetcher: () => Promise<T>) => {
    this.emit({ data: null, loading: true, error: null });

    try {
      const data = await fetcher();
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

// Mock API for demo
interface User {
  id: number;
  name: string;
  email: string;
}

class UserApiCubit extends ApiCubit<User[]> {
  fetchUsers = () => {
    return this.fetch(async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Randomly fail sometimes for demo
      if (Math.random() > 0.7) {
        throw new Error('Network error: Failed to fetch users');
      }

      return [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' },
      ];
    });
  };
}

// ============= Helper Functions =============
const celebrate = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
};

// ============= Interactive Components =============
function BasicCounterDemo() {
  const [state, cubit] = useBloc(BasicCounterCubit);

  const handleIncrement = () => {
    cubit.increment();
    if (state.count === 9) {
      // Will be 10 after increment
      celebrate();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20">
      <motion.div
        key={state.count}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className="text-6xl font-bold text-concept-cubit"
      >
        {state.count}
      </motion.div>

      <p className="text-sm text-muted-foreground">
        Last action: {state.lastAction}
      </p>

      <div className="flex gap-3">
        <Button onClick={cubit.decrement} variant="outline" size="lg">
          Decrement
        </Button>
        <Button onClick={cubit.reset} variant="ghost" size="lg">
          Reset
        </Button>
        <Button onClick={handleIncrement} variant="primary" size="lg">
          Increment
        </Button>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => cubit.setCount(100)} variant="outline" size="sm">
          Set to 100
        </Button>
        <Button onClick={() => cubit.setCount(0)} variant="outline" size="sm">
          Set to 0
        </Button>
      </div>
    </div>
  );
}

function NestedStateDemo() {
  const [state, cubit] = useBloc(UserProfileCubit);

  return (
    <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20">
      <div className="space-y-2">
        <h4 className="font-semibold">User Profile</h4>
        <div className="text-sm space-y-1">
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
      </div>

      <div className="flex flex-wrap gap-2">
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
        <Button onClick={cubit.incrementPostsCount} variant="outline" size="sm">
          New Post
        </Button>
        <Button
          onClick={() =>
            cubit.updatePreferences({
              notifications: !state.preferences.notifications,
            })
          }
          variant="outline"
          size="sm"
        >
          Toggle Notifications
        </Button>
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
      if (cubit.progress === 100) {
        celebrate();
      }
    }
  };

  return (
    <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Todo List</h4>
        <div className="text-sm text-muted-foreground">
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
            className="flex items-center gap-2 p-2 rounded bg-background/50"
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => cubit.toggleTodo(todo.id)}
              className="w-4 h-4"
            />
            <span
              className={
                todo.completed ? 'line-through text-muted-foreground' : ''
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
          className="flex-1 px-3 py-2 text-sm rounded border bg-background"
        />
        <Button onClick={handleAddTodo} variant="primary" size="sm">
          Add
        </Button>
      </div>
    </div>
  );
}

function AsyncOperationsDemo() {
  const [state, cubit] = useBloc(UserApiCubit);

  return (
    <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Async Data Fetching</h4>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-concept-cubit"></div>
        </div>
      )}

      {state.error && (
        <div className="p-4 rounded bg-semantic-danger-light/30 border border-semantic-danger text-semantic-danger-dark text-sm">
          Error: {state.error}
        </div>
      )}

      {state.data && (
        <div className="space-y-2">
          {state.data.map((user) => (
            <div key={user.id} className="p-3 rounded bg-background/50">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          ))}
        </div>
      )}

      {!state.loading && !state.error && !state.data && (
        <p className="text-center text-muted-foreground py-8">
          Click "Fetch Users" to load data
        </p>
      )}
    </div>
  );
}

// ============= Demo Metadata =============
const demoMetadata = {
  id: 'cubit-deep-dive',
  title: 'Cubit Deep Dive',
  description:
    'Master advanced Cubit patterns including nested state, computed properties, async operations, and performance optimization.',
  category: '02-core-concepts',
  difficulty: 'intermediate' as const,
  tags: ['cubit', 'advanced', 'patterns', 'computed', 'async'],
  estimatedTime: 15,
  learningPath: {
    previous: 'instance-management',
    next: 'bloc-deep-dive',
    sequence: 1,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
};

// ============= Main Demo Component =============
export function CubitDeepDiveDemo() {
  return (
    <DemoArticle
      metadata={demoMetadata}
      showBlocGraph={true}
      hideNavigation={true}
    >
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Mastering Cubits</h2>
          <p>
            You've learned the basics of Cubits, but there's so much more! In
            this deep dive, we'll explore advanced patterns that will make you a{' '}
            <strong>Cubit expert</strong>.
          </p>
          <p>
            We'll cover <strong>nested state management</strong>,{' '}
            <strong>computed properties</strong>,
            <strong>async operations</strong>, and{' '}
            <strong>performance optimizations</strong>. Each pattern builds on
            the fundamentals, showing you how to handle real-world scenarios.
          </p>
        </Prose>
      </ArticleSection>

      {/* Basic Review */}
      <ArticleSection id="basic-review">
        <SectionHeader>Quick Review: Basic Patterns</SectionHeader>
        <Prose>
          <p>
            Let's start with a quick review of basic Cubit patterns. This
            enhanced counter demonstrates <code>patch()</code> vs{' '}
            <code>emit()</code>, and custom state setters.
          </p>
        </Prose>

        <div className="my-8">
          <BasicCounterDemo />
        </div>

        <div className="my-8">
          <StateViewer bloc={BasicCounterCubit} title="Counter State" />
        </div>

        <CodePanel
          code={`class BasicCounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, lastAction: 'initialized' });
  }

  // GOOD: Use patch() for partial updates
  increment = () => {
    this.patch({
      count: this.state.count + 1,
      lastAction: 'incremented'
    });
  };

  // GOOD: Use emit() for complete replacement
  reset = () => {
    this.emit({ count: 0, lastAction: 'reset' });
  };

  // GOOD: Custom setters for specific use cases
  setCount = (value: number) => {
    this.patch({
      count: value,
      lastAction: \`set to \${value}\`
    });
  };
}`}
          language="typescript"
          title="BasicCounterCubit.ts"
          showLineNumbers={true}
          highlightLines={[7, 8, 9, 14, 20]}
          lineLabels={{
            7: 'patch() merges partial state',
            14: 'emit() replaces entire state',
            20: 'Custom setters provide flexibility',
          }}
        />
      </ArticleSection>

      {/* Nested State Management */}
      <ArticleSection theme="neutral" id="nested-state">
        <SectionHeader>Nested State Management</SectionHeader>
        <Prose>
          <p>
            Real applications often have{' '}
            <strong>complex, nested state structures</strong>. Managing these
            properly is crucial for maintainability and performance.
          </p>
        </Prose>

        <div className="my-8">
          <NestedStateDemo />
        </div>

        <div className="my-8">
          <StateViewer
            bloc={UserProfileCubit}
            title="User Profile State"
            maxDepth={3}
          />
        </div>

        <CodePanel
          code={`interface UserProfile {
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  stats: {
    postsCount: number;
    followersCount: number;
  };
}

class UserProfileCubit extends Cubit<UserProfile> {
  // BAD: Mutating nested objects
  toggleThemeBad = () => {
    this.state.preferences.theme = 'dark'; // NO!
    this.emit(this.state); // Won't trigger update
  };

  // GOOD: Create new nested objects
  toggleTheme = () => {
    this.patch({
      preferences: {
        ...this.state.preferences,
        theme: this.state.preferences.theme === 'light' ? 'dark' : 'light',
      },
    });
  };

  // GOOD: Helper for partial nested updates
  updatePreferences = (preferences: Partial<UserProfile['preferences']>) => {
    this.patch({
      preferences: {
        ...this.state.preferences,
        ...preferences,
      },
    });
  };
}`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[15, 16, 21, 22, 23, 31, 32, 33]}
          lineLabels={{
            15: 'BAD: Direct mutation',
            16: 'BAD: Same reference, no update',
            21: 'GOOD: Create new object',
            23: 'GOOD: Spread existing, then override',
            31: 'GOOD: Flexible partial updates',
          }}
        />

        <TipCallout title="Pro Tip: Immutability is Key">
          <p>
            Always create new objects when updating nested state. Direct
            mutations won't trigger React re-renders because the object
            reference remains the same.
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Computed Properties */}
      <ArticleSection theme="cubit" id="computed-properties">
        <SectionHeader>Computed Properties with Getters</SectionHeader>
        <Prose>
          <p>
            Cubits can have <strong>computed properties</strong> using
            TypeScript getters. These derive values from state without storing
            redundant data.
          </p>
        </Prose>

        <div className="my-8">
          <ComputedPropertiesDemo />
        </div>

        <div className="my-8">
          <StateViewer bloc={TodoCubit} title="Todo State" maxDepth={2} />
        </div>

        <CodePanel
          code={`class TodoCubit extends Cubit<TodoState> {
  // Computed properties (getters)
  get filteredTodos(): Todo[] {
    const { todos, filter } = this.state;
    if (filter === 'active') return todos.filter(t => !t.completed);
    if (filter === 'completed') return todos.filter(t => t.completed);
    return todos;
  }

  get completedCount(): number {
    return this.state.todos.filter(t => t.completed).length;
  }

  get progress(): number {
    const total = this.state.todos.length;
    if (total === 0) return 0;
    return Math.round((this.completedCount / total) * 100);
  }
}

// Usage in component
function TodoList() {
  const [state, cubit] = useBloc(TodoCubit);

  return (
    <div>
      <p>Progress: {cubit.progress}%</p>
      <p>Completed: {cubit.completedCount}</p>
      {cubit.filteredTodos.map(todo => ...)}
    </div>
  );
}`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[3, 10, 14, 26, 27, 28]}
          lineLabels={{
            3: 'Getter derives from state',
            10: 'Computed value, not stored',
            14: 'Complex calculations cached',
            26: 'Access computed via instance',
            28: 'Use like normal properties',
          }}
        />

        <InfoCallout title="Performance Note">
          <p>
            Getters are recalculated on every access. For expensive
            computations, consider memoization or storing calculated values in
            state during updates.
          </p>
        </InfoCallout>
      </ArticleSection>

      {/* Async Operations */}
      <ArticleSection theme="neutral" id="async-operations">
        <SectionHeader>Async Operations Pattern</SectionHeader>
        <Prose>
          <p>
            Handling <strong>asynchronous operations</strong> is a common
            requirement. Here's a reusable pattern for managing loading states,
            errors, and data.
          </p>
        </Prose>

        <div className="my-8">
          <AsyncOperationsDemo />
        </div>

        <div className="my-8">
          <StateViewer bloc={UserApiCubit} title="API State" />
        </div>

        <CodePanel
          code={`// Generic API state pattern
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

class ApiCubit<T> extends Cubit<ApiState<T>> {
  constructor() {
    super({ data: null, loading: false, error: null });
  }

  fetch = async (fetcher: () => Promise<T>) => {
    // Set loading state
    this.emit({ data: null, loading: true, error: null });

    try {
      const data = await fetcher();
      // Success state
      this.emit({ data, loading: false, error: null });
    } catch (error) {
      // Error state
      this.emit({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };
}

// Extend for specific use cases
class UserApiCubit extends ApiCubit<User[]> {
  fetchUsers = () => {
    return this.fetch(async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    });
  };
}`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[2, 3, 4, 14, 19, 23, 34, 35, 36]}
          lineLabels={{
            2: 'Standard API state shape',
            14: 'Loading state',
            19: 'Success state',
            23: 'Error state with message',
            34: 'Reusable fetch pattern',
          }}
        />

        <WarningCallout title="Remember: Cleanup">
          <p>
            For long-running operations, consider implementing cancellation
            logic to prevent state updates after component unmounts.
          </p>
        </WarningCallout>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Always maintain immutability</strong>: Create new objects
              for nested state updates
            </li>
            <li>
              <strong>Use patch() vs emit() appropriately</strong>: patch() for
              partial updates, emit() for complete replacement
            </li>
            <li>
              <strong>Leverage getters for computed values</strong>: Derive data
              instead of storing redundant state
            </li>
            <li>
              <strong>Standardize async patterns</strong>: Use consistent
              loading/error/data states
            </li>
            <li>
              <strong>Create reusable base classes</strong>: Extract common
              patterns like ApiCubit
            </li>
            <li>
              <strong>Type everything</strong>: TypeScript ensures type safety
              throughout your state management
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="info" id="next-steps">
        <SectionHeader>Next Steps</SectionHeader>
        <Prose>
          <p>
            You've mastered advanced Cubit patterns! You now understand how to
            handle complex state structures, computed properties, and async
            operations.
          </p>
          <p>
            Next, you'll learn about <strong>Blocs</strong> - the event-driven
            cousin of Cubits that provides even more structure for complex
            business logic.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}
