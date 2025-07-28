# Best Practices

Follow these best practices to get the most out of Blac in your applications.

## State Container Design

### 1. Separate Business Logic

Keep business logic in Blocs/Cubits and UI logic in components:

```tsx
// ❌ Don't do this - business logic in components
function BadCounter() {
  const [count, setCount] = useState(0);
  
  const fetchCountFromAPI = async () => {
    try {
      const response = await fetch('/api/count');
      const data = await response.json();
      setCount(data.count);
    } catch (error) {
      console.error(error);
    }
  };
  
  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={fetchCountFromAPI}>Fetch Count</button>
    </div>
  );
}

// ✅ Do this - business logic in Cubit, UI in component
class CounterCubit extends Cubit<{ count: number, isLoading: boolean }> {
  constructor() {
    super({ count: 0, isLoading: false });
  }
  
  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
  
  fetchCount = async () => {
    try {
      this.patch({ isLoading: true });
      const response = await fetch('/api/count');
      const data = await response.json();
      this.patch({ count: data.count, isLoading: false });
    } catch (error) {
      console.error(error);
      this.patch({ isLoading: false });
    }
  };
}

function GoodCounter() {
  const [state, bloc] = useBloc(CounterCubit);
  
  return (
    <div>
      <h1>Count: {state.count}</h1>
      {state.isLoading && <p>Loading...</p>}
      <button onClick={bloc.increment}>Increment</button>
      <button onClick={bloc.fetchCount}>Fetch Count</button>
    </div>
  );
}
```

### 2. Use Arrow Functions

Always use arrow functions for methods in Bloc/Cubit classes to preserve the `this` context:

```tsx
class CounterCubit extends Cubit<{ count: number }> {
  // ❌ Don't do this - will lose 'this' context when called from components
  decrement() {
    this.emit({ count: this.state.count - 1 });
  }

  // ✅ Do this - arrow function preserves 'this' context
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}
```

### 3. Make State Serializable

Design your state to be serializable to make debugging easier:

```tsx
// ❌ Don't do this - non-serializable state
class BadUserCubit extends Cubit<{
  user: {
    name: string,
    dateJoined: Date,  // Date objects aren't serializable
    logout: () => void // Functions aren't serializable
  }
}> { /* ... */ }

// ✅ Do this - serializable state
class GoodUserCubit extends Cubit<{
  name: string,
  dateJoinedTimestamp: number, // Use timestamps instead of Date objects
}> {
  logout = () => {
    // Keep methods in the cubit, not in the state
    // ...
  };
}
```

### 4. Flatten State

Flatten state to reduce the number of re-renders, and to make it easier to patch the state with partial updates:

```tsx
// ❌ Don't do this - nested state
class BadUserCubit extends Cubit<{
  user: {
    name: string,
    email: string,
  },
  isLoading: boolean
}> { 
  // ...
  updateName = (name: string) => {
    this.patch({ 
      user: {
        ...this.state.user,
        name 
      } 
    });
  }
}  

// ✅ Do this - flattened state
class GoodUserCubit extends Cubit<{
  name: string,
  email: string,
  isLoading: boolean
}> { 
  // ...
  updateName = (name: string) => {
    this.patch({ name });
  }
}
```

## Component Design

### 1. Keep Components Simple

Components should focus on rendering state and dispatching events:

### 2. Optimize Re-renders with Proxy Tracking

BlaC's automatic proxy dependency tracking optimizes re-renders by default. Understanding how to work with it effectively is crucial:

```tsx
// ✅ Do this - leverage automatic tracking
function UserCard() {
  const [state, bloc] = useBloc(UserBloc);
  
  // Only re-renders when name or avatar change
  return (
    <div>
      <img src={state.avatar} />
      <h3>{state.name}</h3>
    </div>
  );
}

// ✅ Do this - use manual dependencies when needed
function UserStats() {
  const [state, bloc] = useBloc(UserBloc, {
    // Explicitly control dependencies
    dependencies: (bloc) => [
      bloc.state.postCount,
      bloc.state.followerCount
    ]
  });
  
  return (
    <div>
      <p>Posts: {state.postCount}</p>
      <p>Followers: {state.followerCount}</p>
    </div>
  );
}
```

### 3. When to Disable Proxy Tracking

While proxy tracking is beneficial in most cases, there are scenarios where you might want to disable it:

```tsx
// Disable globally when:
// 1. Debugging re-render issues
// 2. Working with third-party libraries that don't play well with proxies
// 3. Preferring simpler mental model over optimization

Blac.setConfig({ proxyDependencyTracking: false });
```

**Consider disabling proxy tracking when:**
- Your state objects are small and simple
- You're experiencing compatibility issues with dev tools
- You prefer explicit control over re-renders
- You're migrating from another state management solution

**Keep proxy tracking enabled when:**
- Working with large state objects
- Building performance-critical applications
- You have components that only use a subset of state
- You want automatic optimization without manual work

```tsx
// ✅ Do this - simple component that renders state and dispatches events
function UserProfile() {
  const [state, bloc] = useBloc(UserBloc);
  
  return (
    <div>
      {state.isLoading ? (
        <Spinner />
      ) : (
        <>
          <h1>{state.name}</h1>
          <p>{state.email}</p>
          <button onClick={bloc.refreshProfile}>Refresh</button>
          <button onClick={bloc.logout}>Logout</button>
        </>
      )}
    </div>
  );
}
```

## Error Handling

### 1. Handle Errors in the Bloc/Cubit

Errors should be handled in the Bloc/Cubit and reflected in the state:

```tsx
class UserBloc extends Cubit<{
  user: User | null,
  isLoading: boolean,
  error: string | null
}> {
  constructor() {
    super({ user: null, isLoading: false, error: null });
  }
  
  fetchUser = async (id: string) => {
    try {
      this.patch({ isLoading: true, error: null });
      const user = await api.getUser(id);
      this.patch({ user, isLoading: false });
    } catch (error) {
      this.patch({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user'
      });
    }
  };
}
```

## Architecture

### 1. Single Responsibility

Each Bloc/Cubit should manage a single aspect of your application state:

```tsx
// ✅ Do this - separate blocs for different concerns
class AuthBloc extends Cubit<AuthState> { /* ... */ }
class ProfileBloc extends Cubit<ProfileState> { /* ... */ }
class SettingsBloc extends Cubit<SettingsState> { /* ... */ }

// ❌ Don't do this - one bloc handling too many concerns
class MegaBloc extends Cubit<{
  auth: AuthState,
  profile: ProfileState,
  settings: SettingsState
}> { /* ... */ }
```

### 2. Choose the Right Instance Pattern

Pick the appropriate state management pattern for each situation:

- Use **Shared State** (default) for global state shared across components
- Use **Isolated State** for component-specific state
- Use **Persistent State** for state that should persist throughout the app lifecycle

## Testing

### 1. Test Blocs/Cubits in Isolation

Test your Blocs/Cubits independently of components:

```tsx
// Example test for a CounterCubit
test('CounterCubit increments count', async () => {
  const cubit = new CounterCubit();
  expect(cubit.state.count).toBe(0);
  
  cubit.increment();
  expect(cubit.state.count).toBe(1);
});

test('CounterCubit fetches count from API', async () => {
  // Mock API
  global.fetch = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue({ count: 42 })
  });
  
  const cubit = new CounterCubit();
  await cubit.fetchCount();
  
  expect(cubit.state.count).toBe(42);
  expect(cubit.state.isLoading).toBe(false);
});
```

### 2. Test with Different Configurations

When testing components that rely on proxy tracking behavior, consider testing with different configurations:

```tsx
import { Blac } from '@blac/core';

describe('UserComponent', () => {
  const originalConfig = { ...Blac.config };
  
  afterEach(() => {
    // Reset configuration after each test
    Blac.setConfig(originalConfig);
    Blac.resetInstance();
  });
  
  test('renders efficiently with proxy tracking', () => {
    Blac.setConfig({ proxyDependencyTracking: true });
    // Test that component only re-renders when accessed properties change
  });
  
  test('handles all updates without proxy tracking', () => {
    Blac.setConfig({ proxyDependencyTracking: false });
    // Test that component re-renders on any state change
  });
});
```

By following these best practices, you'll create more maintainable, testable, and efficient applications with Blac. 