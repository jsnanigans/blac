# Blac State Management Library Documentation

## Introduction

Blac is a lightweight, flexible state management library for JavaScript/TypeScript applications that focuses on predictable state transitions through a unidirectional data flow. It provides a clean separation between UI components and business logic, making applications easier to maintain, test, and reason about.

This documentation explains how the core packages `blac-next` and `@blac/react` work together to provide an elegant state management solution for React applications, as demonstrated in this demo app.

## Core Architecture

Blac consists of two primary packages:

1. **blac-next**: The framework-agnostic core library that implements the state management patterns
2. **@blac/react**: React bindings that connect React components to the Blac state management system

### blac-next

The core library provides the fundamental state management patterns and abstractions:

- **BlocBase**: The abstract base class for all state containers
- **Cubit**: A simple state container that emits new states directly
- **Bloc**: A more powerful state container that uses a reducer pattern with actions
- **Blac**: The singleton manager that handles instance management and plugin system

### @blac/react

The React integration library connects React components to Blac state containers:

- **useBloc**: The primary hook for connecting components to Blac state

## State Management Flow

The unidirectional data flow in Blac follows these steps:

1. **Component Renders**: A React component uses the `useBloc` hook to connect to a state container
2. **User Interaction**: The user interacts with the component, triggering an event
3. **Bloc Method Called**: The component calls a method on the Bloc instance
4. **State Updated**: The Bloc processes the event and emits a new state
5. **Re-render**: Components that depend on the changed state properties re-render

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│                 │        │                 │        │                 │
│  UI Component   │───────▶│  Bloc/Cubit     │───────▶│  New State      │
│                 │  Call  │                 │  Emit  │                 │
└─────────────────┘ Method └─────────────────┘  State └─────────────────┘
        ▲                                               │
        │                                               │
        └───────────────────────────────────────────────┘
                        Re-render Component
```

## Instance Management

Blac provides three instance management patterns:

### 1. Shared State (Default)

By default, all components using the same Bloc class share the same instance, providing a global-like state:

```tsx
class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

// Both components will share the same state
function ComponentA() {
  const [state, bloc] = useBloc(CounterBloc);
  // ...
}

function ComponentB() {
  const [state, bloc] = useBloc(CounterBloc);
  // ...
}
```

### 2. Isolated State

When each component needs its own state, use the `isolated` static property:

```tsx
class IsolatedCounterBloc extends Cubit<{ count: number }> {
  static isolated = true;
  
  constructor() {
    super({ count: 0 });
  }
}

// Each component gets its own instance with separate state
function ComponentA() {
  const [state, bloc] = useBloc(IsolatedCounterBloc);
  // ...
}

function ComponentB() {
  const [state, bloc] = useBloc(IsolatedCounterBloc);
  // ...
}
```

### 3. Persistent State

To keep state alive even when no components are using it, use the `keepAlive` static property:

```tsx
class PersistentCounterBloc extends Cubit<{ count: number }> {
  static keepAlive = true;
  
  constructor() {
    super({ count: 0 });
  }
}
```

## Smart Dependency Tracking

Blac uses a smart dependency tracking system to only re-render components when relevant state changes:

### 1. Automatic Property Access Tracking

By default, Blac tracks which properties of the state are accessed during rendering:

```tsx
function UserProfile() {
  const [state, bloc] = useBloc(UserBloc);
  
  // This component only re-renders when state.name changes
  return <h1>{state.name}</h1>;
}
```

### 2. Custom Dependency Selection

For more control, you can provide a custom dependency selector function:

```tsx
function TodoList() {
  const [state, bloc] = useBloc(TodoBloc, {
    dependencySelector: (state) => [
      state.todos.map(todo => todo.id).join(','), // Re-render when todos change
      state.filter // Re-render when filter changes
    ]
  });
  
  // ...
}
```

## Passing Props to Blocs

To initialize a bloc with specific parameters, use the `props` option:

```tsx
interface ThemeProps {
  defaultTheme: 'light' | 'dark';
}

class ThemeCubit extends Cubit<{ theme: 'light' | 'dark' }, ThemeProps> {
  constructor(props: ThemeProps) {
    super({ theme: props.defaultTheme });
  }
}

function App() {
  const [state, bloc] = useBloc(ThemeCubit, {
    props: { defaultTheme: 'dark' }
  });
  
  // ...
}
```

## Advanced Usage Examples

### 1. PetFinder Application

The PetFinder implementation demonstrates how to handle complex async operations:

```tsx
// Managing loading states
this.patch({
  loadingState: {
    ...this.state.loadingState,
    isInitialLoading: isFirstSearch,
    isPaginationLoading: !isFirstSearch,
  }
});

// Error handling
try {
  // async operations
} catch (error) {
  this.patch({
    loadingState: {
      ...this.state.loadingState,
      isInitialLoading: false,
      isPaginationLoading: false,
    },
    error: error instanceof Error ? error.message : 'An error occurred'
  });
}
```

### 2. Optimized Renders

The TaskBoard example shows how to optimize renders with dependency tracking:

```tsx
// Only re-render when the completed count changes
function CompletedTasksCounter() {
  const [state, bloc] = useBloc(TaskBloc, {
    dependencySelector: (state) => [
      state.tasks.filter(task => task.completed).length
    ]
  });
  
  const completedCount = state.tasks.filter(task => task.completed).length;
  
  return <span>Completed: {completedCount}</span>;
}
```

### 3. Custom ID for Bloc Instances

When you need multiple instances of the same bloc type:

```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  const [state, chatBloc] = useBloc(ChatBloc, {
    id: `chat-${roomId}`, // Custom ID creates separate instance
    props: { roomId }
  });
  
  return (
    <div>
      <h2>Room: {roomId}</h2>
      <div className="messages">
        {state.messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}
```

## Hooks API Reference

### useBloc

The primary hook to connect React components to Blac state containers:

```tsx
const [state, bloc] = useBloc(YourBloc, options);
```

#### Options

- `id?: string` - Custom identifier for the bloc instance
- `props?: InferPropsFromGeneric<B>` - Props to pass to the bloc constructor
- `onMount?: (bloc: B) => void` - Callback when bloc is mounted (similar to useEffect with empty deps)
- `dependencySelector?: (state: BlocState<B>) => any[]` - Custom selector for fine-grained re-renders

## Testing Blocs

Testing Blocs and Cubits is straightforward as they are pure JavaScript classes:

```tsx
describe('CounterBloc', () => {
  let counterBloc: CounterBloc;
  
  beforeEach(() => {
    counterBloc = new CounterBloc();
  });
  
  it('should increment counter', () => {
    expect(counterBloc.state.count).toBe(0);
    
    counterBloc.increment();
    expect(counterBloc.state.count).toBe(1);
  });
  
  it('should decrement counter', () => {
    counterBloc.increment();
    expect(counterBloc.state.count).toBe(1);
    
    counterBloc.decrement();
    expect(counterBloc.state.count).toBe(0);
  });
});
```

## Best Practices

1. **Use Arrow Functions**: Always use arrow functions for methods in Bloc/Cubit classes to maintain `this` context
2. **Single Responsibility**: Each Bloc should manage a specific, focused part of your application state
3. **Explicit State Changes**: Make state changes explicit through well-named methods
4. **Smart Instance Management**: Choose the right instance management pattern based on your needs
5. **Proper Error Handling**: Handle errors gracefully within your Blocs
6. **Testable Design**: Keep Blocs testable by avoiding direct DOM manipulation and side effects
7. **TypeScript Integration**: Leverage TypeScript for better type safety and development experience
8. **State Immutability**: Always treat state as immutable, creating new objects rather than mutating existing ones

## Common Patterns

### 1. Form Management

```tsx
class FormBloc extends Cubit<FormState> {
  updateField = (field: keyof FormState, value: string) => {
    this.patch({ [field]: value });
  }
  
  validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!this.state.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(this.state.email)) {
      errors.email = 'Email is invalid';
    }
    
    this.patch({ errors });
    return Object.keys(errors).length === 0;
  }
  
  submit = async () => {
    if (!this.validateForm()) return;
    
    this.patch({ isSubmitting: true });
    
    try {
      // Submit form logic
      await api.submitForm(this.state);
      this.patch({ isSubmitted: true, isSubmitting: false });
    } catch (error) {
      this.patch({ 
        isSubmitting: false,
        submitError: error instanceof Error ? error.message : 'Submit failed'
      });
    }
  }
}
```

### 2. Pagination

```tsx
class PaginatedListBloc extends Cubit<PaginationState> {
  loadPage = async (page: number) => {
    this.patch({ loading: true, error: null });
    
    try {
      const data = await api.fetchPage(page);
      this.patch({
        loading: false,
        items: data.items,
        currentPage: page,
        totalPages: data.totalPages
      });
    } catch (error) {
      this.patch({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load page'
      });
    }
  }
  
  nextPage = () => {
    if (this.state.currentPage < this.state.totalPages) {
      this.loadPage(this.state.currentPage + 1);
    }
  }
  
  previousPage = () => {
    if (this.state.currentPage > 1) {
      this.loadPage(this.state.currentPage - 1);
    }
  }
}
```

### 3. Authentication

```tsx
type AuthAction = 
  | { type: 'login' }
  | { type: 'login_success', user: User }
  | { type: 'login_error', error: string }
  | { type: 'logout' };

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

class AuthBloc extends Bloc<AuthState, AuthAction> {
  constructor() {
    super({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null
    });
  }
  
  reducer = (action: AuthAction, state: AuthState): AuthState => {
    switch (action.type) {
      case 'login':
        return { ...state, loading: true, error: null };
      case 'login_success':
        return { 
          ...state, 
          loading: false, 
          user: action.user, 
          isAuthenticated: true,
          error: null
        };
      case 'login_error':
        return { 
          ...state, 
          loading: false, 
          error: action.error,
          user: null,
          isAuthenticated: false 
        };
      case 'logout':
        return { 
          loading: false, 
          isAuthenticated: false, 
          user: null, 
          error: null 
        };
    }
  }
  
  login = async (credentials: Credentials) => {
    this.add({ type: 'login' });
    
    try {
      const user = await authService.login(credentials);
      this.add({ type: 'login_success', user });
    } catch (error) {
      this.add({ 
        type: 'login_error', 
        error: error instanceof Error ? error.message : 'Login failed'
      });
    }
  }
  
  logout = () => {
    // Optionally call authService.logout() here if needed
    this.add({ type: 'logout' });
  }
}
```

## Plugin System

Blac includes a plugin system for extending functionality:

```tsx
import { BlacPlugin, BlacLifecycleEvent, BlocBase } from '@blac/core';

class LoggerPlugin implements BlacPlugin {
  name = 'LoggerPlugin';
  
  onEvent(event: BlacLifecycleEvent, bloc: BlocBase, params?: any) {
    if (event === BlacLifecycleEvent.STATE_CHANGED) {
      console.log(`[${bloc.constructor.name}] State changed:`, bloc.state);
    }
  }
}

// Add the plugin
import { Blac } from '@blac/core';
Blac.addPlugin(new LoggerPlugin());
```

## Migration Guides

### From Redux to Blac

1. Replace reducers with Blocs/Cubits
2. Replace action creators with Bloc/Cubit methods
3. Replace `useSelector` and `useDispatch` with `useBloc`
4. Replace middleware with Bloc methods or plugins

### From MobX to Blac

1. Replace observable classes with Blocs/Cubits
2. Replace `@observable` properties with state properties in the constructor
3. Replace `@action` methods with Bloc/Cubit methods using arrow functions
4. Replace `observer` components with components using `useBloc`

### From Context API to Blac

1. Replace context providers with Bloc/Cubit classes
2. Replace context consumers with components using `useBloc`
3. Replace `useContext` with `useBloc`

## FAQ

**Q: When should I use Cubit vs Bloc?**
A: Use Cubit for simpler state management and Bloc when you need a more structured approach with actions and reducers.

**Q: How does Blac compare to Redux?**
A: Blac offers a more object-oriented approach with less boilerplate while maintaining predictable state changes.

**Q: Does Blac work with React Server Components?**
A: Blac works with client components. Server components should fetch data and pass it to client components that use Blac.

**Q: How do I implement optimistic updates?**
A: Update the UI state immediately, then revert if the operation fails:

```tsx
optimisticUpdate = async () => {
  // Store original state
  const originalState = this.state;
  
  // Update UI immediately
  this.patch({ items: updatedItems });
  
  try {
    // Perform actual update
    await api.updateItems(updatedItems);
  } catch (error) {
    // Revert on failure
    this.emit(originalState);
    this.patch({ 
      error: error instanceof Error ? error.message : 'Update failed'
    });
  }
}
```

**Q: Can I use Blac with other frameworks?**
A: Yes, the core `blac-next` package is framework-agnostic. Currently there are React bindings available, but you can create bindings for other frameworks.

**Q: How do I handle complex state shapes?**
A: For complex state, use the `patch()` method to update only specific parts of the state, and consider splitting large state into multiple focused Blocs. 