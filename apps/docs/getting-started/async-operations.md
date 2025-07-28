# Async Operations

Real-world applications need to fetch data, save to APIs, and handle other asynchronous operations. BlaC makes this straightforward while maintaining clean, testable code.

## Loading States Pattern

The key to good async handling is explicit state management. Always track:
- Loading status
- Success data
- Error states

```typescript
// src/cubits/UserCubit.ts
import { Cubit } from '@blac/core';

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      user: null,
      isLoading: false,
      error: null
    });
  }
  
  fetchUser = async (userId: string) => {
    // Start loading
    this.patch({ isLoading: true, error: null });
    
    try {
      // Simulate API call
      const response = await fetch(`/api/users/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      const user = await response.json();
      
      // Success - update state with data
      this.patch({
        user,
        isLoading: false,
        error: null
      });
    } catch (error) {
      // Error - update state with error message
      this.patch({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  clearError = () => {
    this.patch({ error: null });
  };
}
```

## Using Async Cubits in React

```tsx
// src/components/UserProfile.tsx
import { useBloc } from '@blac/react';
import { UserCubit } from '../cubits/UserCubit';
import { useEffect } from 'react';

export function UserProfile({ userId }: { userId: string }) {
  const [state, cubit] = useBloc(UserCubit);
  
  // Fetch user when component mounts or userId changes
  useEffect(() => {
    cubit.fetchUser(userId);
  }, [userId, cubit]);
  
  if (state.isLoading) {
    return <div>Loading user...</div>;
  }
  
  if (state.error) {
    return (
      <div>
        <p>Error: {state.error}</p>
        <button onClick={cubit.clearError}>Dismiss</button>
      </div>
    );
  }
  
  if (!state.user) {
    return <div>No user data</div>;
  }
  
  return (
    <div>
      <h2>{state.user.name}</h2>
      <p>{state.user.email}</p>
    </div>
  );
}
```

## Advanced Patterns

### Cancellation

Prevent race conditions when rapid requests occur:

```typescript
export class SearchCubit extends Cubit<SearchState> {
  private abortController?: AbortController;
  
  search = async (query: string) => {
    // Cancel previous request
    this.abortController?.abort();
    this.abortController = new AbortController();
    
    this.patch({ isLoading: true, error: null });
    
    try {
      const response = await fetch(
        `/api/search?q=${query}`,
        { signal: this.abortController.signal }
      );
      
      const results = await response.json();
      this.patch({ results, isLoading: false });
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      this.patch({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      });
    }
  };
  
  // Clean up on disposal
  dispose() {
    this.abortController?.abort();
    super.dispose();
  }
}
```

### Optimistic Updates

Update UI immediately for better UX:

```typescript
export class TodoCubit extends Cubit<TodoState> {
  toggleTodo = async (id: string) => {
    const todo = this.state.todos.find(t => t.id === id);
    if (!todo) return;
    
    // Optimistic update
    const optimisticTodos = this.state.todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    this.patch({ todos: optimisticTodos });
    
    try {
      // API call
      await fetch(`/api/todos/${id}/toggle`, { method: 'POST' });
      // Success - state already updated
    } catch (error) {
      // Revert on error
      this.patch({ 
        todos: this.state.todos,
        error: 'Failed to update todo'
      });
    }
  };
}
```

### Pagination

Handle paginated data elegantly:

```typescript
interface PaginatedState<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

export class ProductsCubit extends Cubit<PaginatedState<Product>> {
  constructor() {
    super({
      items: [],
      currentPage: 1,
      totalPages: 1,
      isLoading: false,
      error: null
    });
  }
  
  loadPage = async (page: number) => {
    this.patch({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/products?page=${page}`);
      const data = await response.json();
      
      this.patch({
        items: data.items,
        currentPage: page,
        totalPages: data.totalPages,
        isLoading: false
      });
    } catch (error) {
      this.patch({
        isLoading: false,
        error: 'Failed to load products'
      });
    }
  };
  
  nextPage = () => {
    if (this.state.currentPage < this.state.totalPages) {
      this.loadPage(this.state.currentPage + 1);
    }
  };
  
  previousPage = () => {
    if (this.state.currentPage > 1) {
      this.loadPage(this.state.currentPage - 1);
    }
  };
}
```

## Best Practices

### 1. Always Handle All States
Never leave your UI in an undefined state:

```typescript
// ❌ Bad - what if loading or error?
if (state.data) {
  return <div>{state.data.name}</div>;
}

// ✅ Good - handle all cases
if (state.isLoading) return <Loading />;
if (state.error) return <Error message={state.error} />;
if (!state.data) return <Empty />;
return <div>{state.data.name}</div>;
```

### 2. Separate API Logic
Keep API calls separate from your Cubits:

```typescript
// src/api/userApi.ts
export const userApi = {
  async getUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  }
};

// In your Cubit
fetchUser = async (id: string) => {
  this.patch({ isLoading: true });
  try {
    const user = await userApi.getUser(id);
    this.patch({ user, isLoading: false });
  } catch (error) {
    // ...
  }
};
```

### 3. Use TypeScript for API Responses
Define types for your API responses:

```typescript
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
}
```

## Testing Async Operations

Async Cubits are easy to test:

```typescript
import { UserCubit } from './UserCubit';

describe('UserCubit', () => {
  it('should fetch user successfully', async () => {
    const cubit = new UserCubit();
    
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1', name: 'John' })
    });
    
    await cubit.fetchUser('1');
    
    expect(cubit.state).toEqual({
      user: { id: '1', name: 'John' },
      isLoading: false,
      error: null
    });
  });
});
```

## What's Next?

- [First Bloc](/getting-started/first-bloc) - Event-driven async operations
- [Error Handling](/patterns/error-handling) - Advanced error patterns
- [Testing](/patterns/testing) - Testing strategies for async code