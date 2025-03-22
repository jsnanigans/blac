# Advanced Patterns

This section demonstrates advanced patterns for using Blac in real-world applications.

## Fine-Grained Dependency Tracking

Blac automatically provides fine-grained dependency tracking, meaning components only re-render when the specific pieces of state they use change.

### Basic Dependency Tracking

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import UserBloc from './UserBloc';

// State shape
// {
//   name: string;
//   email: string;
//   isLoading: boolean;
//   posts: Post[];
//   comments: Comment[];
// }

function UserName() {
  // This component only re-renders when state.name changes
  const [{ name }] = useBloc(UserBloc);
  
  return <h1>{name}</h1>;
}

function UserEmailDisplay() {
  // This component only re-renders when state.email changes
  const [{ email }] = useBloc(UserBloc);
  
  return <p>Email: {email}</p>;
}

function UserPostsCount() {
  // This component only re-renders when state.posts.length changes
  const [{ posts }] = useBloc(UserBloc);
  
  return <div>Number of posts: {posts.length}</div>;
}
```

### Custom Dependency Selection

For more advanced cases, you can explicitly specify which state changes should trigger re-renders:

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import TodoBloc from './TodoBloc';

function TodoStats() {
  // This component only re-renders when the specified values change
  const [state] = useBloc(TodoBloc, {
    dependencySelector: (state) => [
      state.todos.length,
      state.todos.filter(todo => todo.completed).length,
      state.filter
    ]
  });
  
  const totalTodos = state.todos.length;
  const completedTodos = state.todos.filter(todo => todo.completed).length;
  const incompleteTodos = totalTodos - completedTodos;
  
  return (
    <div className="todo-stats">
      <h3>Todo Stats</h3>
      <p>Total: {totalTodos}</p>
      <p>Completed: {completedTodos}</p>
      <p>Incomplete: {incompleteTodos}</p>
      <p>Current Filter: {state.filter}</p>
    </div>
  );
}
```

## Props & Dependency Injection

You can pass configuration to blocs during initialization, enabling better testability and reusability.

### Bloc with Props

```tsx
import { Cubit } from 'blac-next';

// Define props interface
interface ApiServiceProps {
  baseUrl: string;
  apiKey: string;
}

// API service cubit that takes configuration props
class ApiServiceCubit extends Cubit<{ isLoading: boolean; data: any[] }, ApiServiceProps> {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(props: ApiServiceProps) {
    super({ isLoading: false, data: [] });
    
    // Store props values
    this.baseUrl = props.baseUrl;
    this.apiKey = props.apiKey;
  }
  
  fetchData = async (endpoint: string) => {
    try {
      this.patch({ isLoading: true });
      
      const url = `${this.baseUrl}${endpoint}?apiKey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      this.patch({ isLoading: false, data });
    } catch (error) {
      this.patch({ isLoading: false });
      console.error(error);
    }
  };
}

// Usage in component
function DataComponent() {
  const [state, bloc] = useBloc(ApiServiceCubit, {
    props: {
      baseUrl: 'https://api.example.com/',
      apiKey: 'your-api-key'
    }
  });
  
  React.useEffect(() => {
    bloc.fetchData('users');
  }, []);
  
  if (state.isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <h2>Data</h2>
      <ul>
        {state.data.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Bloc Communication

Sometimes blocs need to communicate with each other. Here are patterns for handling bloc-to-bloc communication.

### Event-Based Communication

```tsx
import { Cubit } from 'blac-next';

// Shared event bus
const eventBus = {
  listeners: new Map<string, Function[]>(),
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  },
  
  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
};

// First bloc that emits events
class AuthBloc extends Cubit<{
  isAuthenticated: boolean;
  user: { id: string; name: string } | null;
}> {
  constructor() {
    super({
      isAuthenticated: false,
      user: null
    });
  }
  
  login = async (username: string, password: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update state
      const user = { id: '123', name: username };
      this.patch({
        isAuthenticated: true,
        user
      });
      
      // Emit event for other blocs
      eventBus.emit('auth:login', user);
    } catch (error) {
      console.error(error);
    }
  };
  
  logout = () => {
    this.patch({
      isAuthenticated: false,
      user: null
    });
    
    // Emit event for other blocs
    eventBus.emit('auth:logout', null);
  };
}

// Second bloc that listens for events
class CartBloc extends Cubit<{
  items: { id: string; name: string; price: number }[];
}> {
  private unsubscribeAuth: (() => void) | null = null;
  
  constructor() {
    super({ items: [] });
    
    // Subscribe to auth events
    this.unsubscribeAuth = eventBus.on('auth:logout', () => {
      // Clear cart when user logs out
      this.clearCart();
    });
  }
  
  addItem = (item: { id: string; name: string; price: number }) => {
    this.patch({
      items: [...this.state.items, item]
    });
  };
  
  clearCart = () => {
    this.patch({ items: [] });
  };
  
  // Clean up subscriptions
  dispose = () => {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
  };
}
```

### Bloc Composition

Another approach is to compose blocs, where one bloc depends on another:

```tsx
import { Cubit } from 'blac-next';
import AuthBloc from './AuthBloc';
import { getBlocInstance } from '@blac/react';

class ProfileBloc extends Cubit<{
  isLoading: boolean;
  profile: any;
  error: string | null;
}> {
  private authBloc: AuthBloc;
  private unsubscribeAuth: (() => void) | null = null;
  
  constructor() {
    super({
      isLoading: false,
      profile: null,
      error: null
    });
    
    // Get instance of AuthBloc
    this.authBloc = getBlocInstance(AuthBloc);
    
    // Subscribe to auth state changes
    this.unsubscribeAuth = this.authBloc.on((authState) => {
      // Clear profile when user logs out
      if (!authState.isAuthenticated) {
        this.patch({
          profile: null,
          error: null
        });
      }
      // Load profile when user logs in
      else if (authState.isAuthenticated && authState.user && !this.state.profile) {
        this.loadProfile(authState.user.id);
      }
    });
  }
  
  loadProfile = async (userId: string) => {
    try {
      this.patch({ isLoading: true, error: null });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const profile = {
        userId,
        name: 'John Doe',
        bio: 'Full-stack developer',
        location: 'San Francisco'
      };
      
      this.patch({ isLoading: false, profile });
    } catch (error) {
      this.patch({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load profile'
      });
    }
  };
  
  // Clean up subscriptions
  dispose = () => {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
  };
}
```

## Advanced Performance Optimizations

### Memoizing Computed Values

For expensive calculations, use memoization to avoid recalculating values unnecessarily:

```tsx
import { Cubit } from 'blac-next';

class TodoListBloc extends Cubit<{
  todos: { id: string; text: string; completed: boolean }[];
  filter: 'all' | 'active' | 'completed';
}> {
  constructor() {
    super({
      todos: [],
      filter: 'all'
    });
  }
  
  // Computed value cache
  private filteredTodosCache: {
    todos: any[];
    filter: string;
    result: any[];
  } | null = null;
  
  // Get filtered todos with memoization
  getFilteredTodos = () => {
    const { todos, filter } = this.state;
    
    // Check if cached result is valid
    if (
      this.filteredTodosCache &&
      this.filteredTodosCache.todos === todos &&
      this.filteredTodosCache.filter === filter
    ) {
      return this.filteredTodosCache.result;
    }
    
    // Calculate new result
    let result;
    if (filter === 'active') {
      result = todos.filter(todo => !todo.completed);
    } else if (filter === 'completed') {
      result = todos.filter(todo => todo.completed);
    } else {
      result = todos;
    }
    
    // Cache result
    this.filteredTodosCache = {
      todos,
      filter,
      result
    };
    
    return result;
  };
  
  // Methods to update state
  addTodo = (text: string) => {
    this.patch({
      todos: [
        ...this.state.todos,
        { id: Date.now().toString(), text, completed: false }
      ]
    });
  };
  
  toggleTodo = (id: string) => {
    this.patch({
      todos: this.state.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    });
  };
  
  setFilter = (filter: 'all' | 'active' | 'completed') => {
    this.patch({ filter });
  };
}

// In component
function TodoList() {
  const [state, bloc] = useBloc(TodoListBloc);
  
  // Get filtered todos using memoized method
  const filteredTodos = bloc.getFilteredTodos();
  
  return (
    <div>
      <div className="filters">
        <button onClick={() => bloc.setFilter('all')}>All</button>
        <button onClick={() => bloc.setFilter('active')}>Active</button>
        <button onClick={() => bloc.setFilter('completed')}>Completed</button>
      </div>
      
      <ul>
        {filteredTodos.map(todo => (
          <li
            key={todo.id}
            style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
            onClick={() => bloc.toggleTodo(todo.id)}
          >
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Bonus: Debugging Blocs

Here's a simple middleware for debugging Blac state changes:

```tsx
import { BlocBase } from 'blac-next';

// Debugging middleware for Blac
function createBlocDebugger<S>(bloc: BlocBase<S>, name: string = bloc.constructor.name) {
  // Subscribe to state changes
  bloc.on((state) => {
    console.group(`[BLOC] ${name} - State Change`);
    console.log('New state:', state);
    console.groupEnd();
  });
  
  // Return the bloc instance
  return bloc;
}

// Usage
class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

// Create a debuggable bloc instance
const counterBloc = createBlocDebugger(new CounterBloc());
```

These advanced patterns demonstrate the flexibility and power of Blac for building complex applications with clean, maintainable state management. 