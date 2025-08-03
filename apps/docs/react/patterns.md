# React Patterns

Learn best practices and common patterns for using BlaC effectively in your React applications.

## Component Organization

### Component Splitting for Performance

Split your UI into focused components that each use `useBloc` directly. This eliminates prop drilling and provides automatic performance optimization:

```typescript
// Main container component
function TodoApp() {
  return (
    <div className="todo-app">
      <h1>Todo List</h1>
      <AddTodoForm />
      <FilterButtons />
      <TodoList />
      <ClearCompletedButton />
    </div>
  );
}

// Each component accesses only the state it needs
function AddTodoForm() {
  const [state, todoCubit] = useBloc(TodoCubit);

  return (
    <form onSubmit={todoCubit.handleSubmit}>
      <input
        value={state.inputText}
        onChange={(e) => todoCubit.setInputText(e.target.value)}
        placeholder="What needs to be done?"
      />
      <button type="submit">Add</button>
    </form>
  );
}

function FilterButtons() {
  const [state, todoCubit] = useBloc(TodoCubit);

  return (
    <div role="radiogroup" aria-label="Filter todos">
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
  );
}

function TodoList() {
  const [state, todoCubit] = useBloc(TodoCubit);

  return (
    <ul>
      {todoCubit.filteredTodos.map(todo => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => todoCubit.toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
          <button onClick={() => todoCubit.deleteTodo(todo.id)}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

function ClearCompletedButton() {
  const [state, todoCubit] = useBloc(TodoCubit);
  const hasCompletedTodos = state.todos.some(todo => todo.completed);

  if (!hasCompletedTodos) {
    return null;
  }

  return (
    <button onClick={todoCubit.clearCompleted}>
      Clear Completed
    </button>
  );
}
```

**Benefits of this pattern:**

1. **Automatic Performance Optimization**: Each component only re-renders when the specific state or getters it uses change
2. **No Prop Drilling**: Components directly access what they need via `useBloc`
3. **Better Maintainability**: Components are self-contained and can be moved around easily
4. **Cleaner Code**: No need to pass callbacks or state through multiple component layers

For example:

- `AddTodoForm` only re-renders when `inputText` changes
- `FilterButtons` only re-renders when `filter` or `activeTodoCount` changes
- `TodoList` only re-renders when `filteredTodos` changes
- `ClearCompletedButton` only re-renders when the presence of completed todos changes

### Feature-Based Structure

Organize by feature rather than file type:

```
src/
├── features/
│   ├── auth/
│   │   ├── AuthBloc.ts
│   │   ├── AuthGuard.tsx
│   │   ├── LoginForm.tsx
│   │   └── useAuth.ts
│   ├── todos/
│   │   ├── TodoCubit.ts
│   │   ├── TodoList.tsx
│   │   ├── TodoItem.tsx
│   │   └── useTodos.ts
│   └── settings/
│       ├── SettingsCubit.ts
│       ├── SettingsPanel.tsx
│       └── useSettings.ts
```

## Custom Hooks

### Basic Custom Hook

Encapsulate BlaC usage in custom hooks:

```typescript
// hooks/useCounter.ts
export function useCounter(instanceId?: string) {
  const [count, cubit] = useBloc(CounterCubit, { instanceId });

  const increment = useCallback(() => cubit.increment(), [cubit]);
  const decrement = useCallback(() => cubit.decrement(), [cubit]);
  const reset = useCallback(() => cubit.reset(), [cubit]);

  return {
    count,
    increment,
    decrement,
    reset,
    isEven: count % 2 === 0
  };
}

// Usage
function Counter() {
  const { count, increment, isEven } = useCounter();

  return (
    <div>
      <p>Count: {count} {isEven && '(even)'}</p>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

### Advanced Hook with Effects

```typescript
export function useUserProfile(userId: string) {
  const [state, cubit] = useBloc(UserCubit, {
    instanceId: `user-${userId}`,
    staticProps: { userId },
  });

  // Load user on mount and userId change
  useEffect(() => {
    cubit.load(userId);
  }, [userId, cubit]);

  // Refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        cubit.refresh();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [cubit]);

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    refresh: cubit.refresh,
  };
}
```

### Combining Multiple Blocs

```typescript
export function useAppState() {
  const auth = useAuth();
  const theme = useTheme();
  const notifications = useNotifications();

  return {
    isReady: auth.isAuthenticated && !auth.isLoading,
    currentUser: auth.user,
    isDarkMode: theme.mode === 'dark',
    unreadCount: notifications.unread.length,

    // Combined actions
    logout: () => {
      auth.logout();
      notifications.clear();
      theme.reset();
    },
  };
}
```

## State Sharing Patterns

### Global Singleton

Default behavior - one instance shared everywhere:

```typescript
// Shared across entire app
class AppSettingsCubit extends Cubit<Settings> {
  // No special configuration needed
}

// Both components share the same instance
function Header() {
  const [settings] = useBloc(AppSettingsCubit);
}

function Footer() {
  const [settings] = useBloc(AppSettingsCubit);
}
```

### Isolated Instances

Each component gets its own instance:

```typescript
class FormCubit extends Cubit<FormState> {
  static isolated = true; // Each usage gets unique instance
}

// Independent instances
function FormA() {
  const [state] = useBloc(FormCubit); // Instance A
}

function FormB() {
  const [state] = useBloc(FormCubit); // Instance B
}
```

### Scoped Instances

Share within a specific component tree:

```typescript
function FeatureRoot() {
  const featureId = useId();

  return (
    <FeatureContext.Provider value={featureId}>
      <FeatureHeader />
      <FeatureContent />
    </FeatureContext.Provider>
  );
}

function FeatureComponent() {
  const featureId = useContext(FeatureContext);
  const [state] = useBloc(FeatureCubit, { instanceId: featureId });
  // All components in this feature share the same instance
}
```

## Performance Patterns

### Optimized Re-renders

BlaC automatically tracks dependencies:

```typescript
function TodoItem({ id }: { id: string }) {
  const [state] = useBloc(TodoCubit);

  // Only re-renders when this specific todo changes
  const todo = state.todos.find(t => t.id === id);

  if (!todo) return null;

  return <div>{todo.text}</div>;
}
```

### Memoized Selectors

For expensive computations:

```typescript
function TodoStats() {
  const [state] = useBloc(TodoCubit);

  const stats = useMemo(() => {
    const completed = state.todos.filter(t => t.completed);
    const active = state.todos.filter(t => !t.completed);

    return {
      total: state.todos.length,
      completed: completed.length,
      active: active.length,
      percentComplete: state.todos.length > 0
        ? Math.round((completed.length / state.todos.length) * 100)
        : 0
    };
  }, [state.todos]);

  return <StatsDisplay {...stats} />;
}
```

### Lazy Initialization

Defer expensive initialization:

```typescript
class ExpensiveDataCubit extends Cubit<DataState> {
  constructor() {
    super({ data: null, isInitialized: false });
  }

  initialize = once(async () => {
    const data = await this.loadExpensiveData();
    this.patch({ data, isInitialized: true });
  });
}

function DataComponent() {
  const [state, cubit] = useBloc(ExpensiveDataCubit);

  useEffect(() => {
    cubit.initialize();
  }, [cubit]);

  if (!state.isInitialized) return <Loading />;
  return <DataView data={state.data} />;
}
```

## Form Patterns

### Controlled Forms

```typescript
class ContactFormCubit extends Cubit<ContactFormState> {
  constructor() {
    super({
      values: { name: '', email: '', message: '' },
      errors: {},
      touched: {},
      isSubmitting: false
    });
  }

  updateField = (field: keyof FormValues, value: string) => {
    this.patch({
      values: { ...this.state.values, [field]: value },
      touched: { ...this.state.touched, [field]: true }
    });
    this.validateField(field, value);
  };

  validateField = (field: string, value: string) => {
    const errors = { ...this.state.errors };

    switch (field) {
      case 'email':
        errors.email = !value.includes('@') ? 'Invalid email' : undefined;
        break;
      case 'name':
        errors.name = !value.trim() ? 'Required' : undefined;
        break;
    }

    this.patch({ errors });
  };
}

function ContactForm() {
  const [state, form] = useBloc(ContactFormCubit);

  return (
    <form onSubmit={e => { e.preventDefault(); form.submit(); }}>
      <Field
        name="name"
        value={state.values.name}
        error={state.errors.name}
        touched={state.touched.name}
        onChange={value => form.updateField('name', value)}
      />
      {/* More fields */}
    </form>
  );
}
```

### Multi-Step Forms

```typescript
class WizardCubit extends Cubit<WizardState> {
  constructor() {
    super({
      currentStep: 0,
      steps: ['personal', 'contact', 'review'],
      data: {},
      errors: {},
    });
  }

  nextStep = () => {
    if (this.validateCurrentStep()) {
      this.patch({ currentStep: this.state.currentStep + 1 });
    }
  };

  previousStep = () => {
    this.patch({ currentStep: Math.max(0, this.state.currentStep - 1) });
  };

  updateStepData = (data: Partial<FormData>) => {
    this.patch({
      data: { ...this.state.data, ...data },
    });
  };
}
```

## Error Handling Patterns

### Error Boundaries

```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <this.props.fallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <AppContent />
    </ErrorBoundary>
  );
}
```

### Global Error Handling

```typescript
class GlobalErrorCubit extends Cubit<ErrorState> {
  constructor() {
    super({ errors: [] });
  }

  addError = (error: AppError) => {
    const id = Date.now();
    this.patch({
      errors: [...this.state.errors, { ...error, id }]
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.removeError(id);
    }, 5000);
  };

  removeError = (id: number) => {
    this.patch({
      errors: this.state.errors.filter(e => e.id !== id)
    });
  };
}

// Global error display
function ErrorToasts() {
  const [{ errors }] = useBloc(GlobalErrorCubit);

  return (
    <div className="error-toasts">
      {errors.map(error => (
        <Toast key={error.id} error={error} />
      ))}
    </div>
  );
}
```

## Testing Patterns

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CounterCubit } from './CounterCubit';

// Mock the Cubit
jest.mock('./CounterCubit');

describe('Counter Component', () => {
  let mockCubit: jest.Mocked<CounterCubit>;

  beforeEach(() => {
    mockCubit = {
      state: 0,
      increment: jest.fn(),
      decrement: jest.fn()
    } as any;

    (CounterCubit as any).mockImplementation(() => mockCubit);
  });

  test('renders count and handles clicks', () => {
    render(<Counter />);

    expect(screen.getByText('Count: 0')).toBeInTheDocument();

    fireEvent.click(screen.getByText('+'));
    expect(mockCubit.increment).toHaveBeenCalled();
  });
});
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

test('useCounter hook', () => {
  const { result } = renderHook(() => useCounter());

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
  expect(result.current.isEven).toBe(false);
});
```

## Advanced Patterns

### Middleware Pattern

```typescript
function withLogging<T extends BlocBase<any>>(
  BlocClass: new (...args: any[]) => T,
): new (...args: any[]) => T {
  return class extends BlocClass {
    constructor(...args: any[]) {
      super(...args);

      // Use subscribe to listen for state changes
      this.subscribe((state) => {
        console.log(`[${this.constructor.name}] State changed:`, state);
      });
    }
  };
}

// Usage
const LoggedCounterCubit = withLogging(CounterCubit);
```

### Plugin System

```typescript
interface CubitPlugin<S> {
  onInit?: (cubit: Cubit<S>) => void;
  onStateChange?: (state: S, previousState: S) => void;
  onDispose?: () => void;
}

class PluggableCubit<S> extends Cubit<S> {
  private plugins: CubitPlugin<S>[] = [];
  private previousState: S;

  constructor(initialState: S) {
    super(initialState);
    this.previousState = initialState;

    // Subscribe to state changes
    this.subscribe((state) => {
      this.plugins.forEach((p) => 
        p.onStateChange?.(state, this.previousState)
      );
      this.previousState = state;
    });
  }

  use(plugin: CubitPlugin<S>) {
    this.plugins.push(plugin);
    plugin.onInit?.(this);
  }

  dispose() {
    this.plugins.forEach((p) => p.onDispose?.());
    super.dispose();
  }
}
```

## Best Practices

1. **Keep Components Focused**: Each component should have a single responsibility
2. **Use Custom Hooks**: Encapsulate complex BlaC usage in custom hooks
3. **Prefer Composition**: Compose smaller Cubits/Blocs rather than creating large ones
4. **Test Business Logic**: Test Cubits/Blocs separately from components
5. **Handle Loading States**: Always provide feedback during async operations
6. **Error Boundaries**: Use error boundaries to catch and handle errors gracefully
7. **Type Everything**: Leverage TypeScript for better developer experience

## See Also

- [React Hooks](/react/hooks) - Hook API reference
- [Testing](/patterns/testing) - Testing strategies
- [Performance](/patterns/performance) - Performance optimization
- [Examples](/examples/) - Complete examples
