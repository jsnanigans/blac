# Your First Bloc

While Cubits are perfect for simple state management, Blocs shine when you need more structure and traceability. Let's explore event-driven state management.

## Cubit vs Bloc

Choose based on your needs:

**Use Cubit when:**
- State logic is straightforward
- You prefer direct method calls
- You want minimal boilerplate

**Use Bloc when:**
- State transitions are complex
- You want a clear audit trail of events
- Multiple actions lead to similar state changes
- You need better debugging and logging

## Understanding Events

In Bloc, state changes are triggered by events. Events are:
- Plain classes (not strings or objects)
- Immutable and contain data
- Processed by registered handlers

## Creating an Authentication Bloc

Let's build an authentication system using Bloc:

```typescript
// src/blocs/auth/auth.events.ts
// Define event classes
export class LoginRequested {}

export class LogoutRequested {}

export class AuthCheckRequested {}

export class TokenRefreshRequested {
  constructor(public readonly refreshToken: string) {}
}

export class EmailChanged {
  constructor(public readonly email: string) {}
}

export class PasswordChanged {
  constructor(public readonly password: string) {}
}
```

```typescript
// src/blocs/auth/auth.state.ts
// Define the state
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  // Form state
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
```

```typescript
// src/blocs/auth/AuthBloc.ts
import { Bloc } from '@blac/core';
import { AuthState } from './auth.state';
import {
  LoginRequested,
  LogoutRequested,
  AuthCheckRequested,
  TokenRefreshRequested,
  EmailChanged,
  PasswordChanged
} from './auth.events';

// Union type for all events (optional but helpful)
type AuthEvent = 
  | LoginRequested 
  | LogoutRequested 
  | AuthCheckRequested 
  | TokenRefreshRequested
  | EmailChanged
  | PasswordChanged;

export class AuthBloc extends Bloc<AuthState, AuthEvent> {
  constructor() {
    // Initial state
    super({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      email: '',
      password: ''
    });
    
    // Register event handlers
    this.on(LoginRequested, this.handleLogin);
    this.on(LogoutRequested, this.handleLogout);
    this.on(AuthCheckRequested, this.handleAuthCheck);
    this.on(TokenRefreshRequested, this.handleTokenRefresh);
    this.on(EmailChanged, this.handleEmailChanged);
    this.on(PasswordChanged, this.handlePasswordChanged);
  }
  
  // Event handlers
  private handleLogin = async (event: LoginRequested, emit: (state: AuthState) => void) => {
    // Start loading
    emit({
      ...this.state,
      isLoading: true,
      error: null
    });
    
    try {
      // Simulate API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.state.email,
          password: this.state.password
        })
      });
      
      if (!response.ok) {
        throw new Error('Invalid credentials');
      }
      
      const { user, token } = await response.json();
      
      // Store token (in real app, use secure storage)
      localStorage.setItem('authToken', token);
      
      // Emit success state
      emit({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null
      });
    } catch (error) {
      // Emit error state
      emit({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error instanceof Error ? error.message : 'Login failed'
      });
    }
  };
  
  private handleLogout = async (_event: LogoutRequested, emit: (state: AuthState) => void) => {
    // Clear token
    localStorage.removeItem('authToken');
    
    // Optional: Call logout API
    await fetch('/api/auth/logout', { method: 'POST' });
    
    // Reset to initial state
    emit({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null
    });
  };
  
  private handleAuthCheck = async (_event: AuthCheckRequested, emit: (state: AuthState) => void) => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      emit({
        ...this.state,
        isAuthenticated: false,
        user: null
      });
      return;
    }
    
    emit({ ...this.state, isLoading: true });
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Invalid token');
      
      const user = await response.json();
      
      emit({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null
      });
    } catch (error) {
      // Token invalid, clear it
      localStorage.removeItem('authToken');
      
      emit({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null
      });
    }
  };
  
  private handleTokenRefresh = async (event: TokenRefreshRequested, emit: (state: AuthState) => void) => {
    // Implementation for token refresh
    // Similar pattern to login
  };
  
  private handleEmailChanged = (event: EmailChanged, emit: (state: AuthState) => void) => {
    emit({
      ...this.state,
      email: event.email,
      error: null
    });
  };
  
  private handlePasswordChanged = (event: PasswordChanged, emit: (state: AuthState) => void) => {
    emit({
      ...this.state,
      password: event.password,
      error: null
    });
  };
  
  // Helper methods for dispatching events
  login = () => {
    this.add(new LoginRequested());
  };
  
  logout = () => {
    this.add(new LogoutRequested());
  };
  
  checkAuth = () => {
    this.add(new AuthCheckRequested());
  };
  
  setEmail = (email: string) => {
    this.add(new EmailChanged(email));
  };
  
  setPassword = (password: string) => {
    this.add(new PasswordChanged(password));
  };
  
  // Handle form submission
  handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    this.login();
  };
}
```

## Using the Bloc in React

```tsx
// src/components/LoginForm.tsx
import { useBloc } from '@blac/react';
import { AuthBloc } from '../blocs/auth/AuthBloc';

export function LoginForm() {
  const [state, authBloc] = useBloc(AuthBloc);
  
  if (state.isAuthenticated) {
    return (
      <div>
        <h2>Welcome, {state.user?.name}!</h2>
        <button onClick={authBloc.logout}>Logout</button>
      </div>
    );
  }
  
  return (
    <form onSubmit={authBloc.handleSubmit} aria-label="Login form">
      <h2>Login</h2>
      
      {state.error && (
        <div role="alert" aria-live="polite" className="error">
          {state.error}
        </div>
      )}
      
      <input
        type="email"
        placeholder="Email"
        value={state.email}
        onChange={(e) => authBloc.setEmail(e.target.value)}
        disabled={state.isLoading}
        required
        aria-label="Email address"
        aria-invalid={!!state.error}
        aria-describedby={state.error ? "error-message" : undefined}
      />
      
      <input
        type="password"
        placeholder="Password"
        value={state.password}
        onChange={(e) => authBloc.setPassword(e.target.value)}
        disabled={state.isLoading}
        required
        aria-label="Password"
        aria-invalid={!!state.error}
      />
      
      <button 
        type="submit" 
        disabled={state.isLoading}
        aria-busy={state.isLoading}
      >
        {state.isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Key Concepts Explained

### 1. Event Classes
Events are simple classes that carry data:

```typescript
// Simple event with no data
class Increment {}

// Event with data
class SetCounter {
  constructor(public readonly value: number) {}
}

// Event with multiple properties
class UpdateUser {
  constructor(
    public readonly id: string,
    public readonly updates: Partial<User>
  ) {}
}
```

### 2. Event Registration
Register handlers in the constructor using `this.on()`:

```typescript
constructor() {
  super(initialState);
  
  // Register handlers
  this.on(EventClass, this.handlerMethod);
  this.on(AnotherEvent, (event, emit) => {
    // Inline handler
    emit(newState);
  });
}
```

### 3. Event Handlers
Handlers receive the event and an emit function:

```typescript
private handleEvent = (event: EventType, emit: (state: State) => void) => {
  // Access current state with this.state
  const currentValue = this.state.someValue;
  
  // Use event data
  const newValue = event.data + currentValue;
  
  // Emit new state
  emit({
    ...this.state,
    someValue: newValue
  });
};
```

### 4. Dispatching Events
Use `this.add()` to dispatch events:

```typescript
// Inside the Bloc
this.add(new SomeEvent(data));

// From helper methods
increment = () => this.add(new Increment());

// With parameters
setValue = (value: number) => this.add(new SetValue(value));
```

## Benefits of Event-Driven Architecture

### 1. Debugging
Every state change has a corresponding event:

```typescript
// You can log all events
constructor() {
  super(initialState);
  
  // Override add to log events
  const originalAdd = this.add.bind(this);
  this.add = (event) => {
    console.log('Event dispatched:', event.constructor.name, event);
    originalAdd(event);
  };
}
```

### 2. Time Travel
Events make it possible to replay state changes:

```typescript
// Store event history
private eventHistory: AuthEvent[] = [];

// In your event handler
this.add = (event) => {
  this.eventHistory.push(event);
  // ... normal processing
};
```

### 3. Testing
Events make testing more explicit:

```typescript
it('should login successfully', async () => {
  const bloc = new AuthBloc();
  
  bloc.add(new LoginRequested('user@example.com', 'password'));
  
  // Wait for async processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  expect(bloc.state.isAuthenticated).toBe(true);
  expect(bloc.state.user).toBeDefined();
});
```

## Advanced Patterns

### Composing Events
Handle related events with shared logic:

```typescript
// Base event
abstract class CounterEvent {}

// Specific events
class Increment extends CounterEvent {
  constructor(public readonly by: number = 1) {
    super();
  }
}

class Decrement extends CounterEvent {
  constructor(public readonly by: number = 1) {
    super();
  }
}

// Shared handler logic
this.on(Increment, (event, emit) => {
  emit({ count: this.state.count + event.by });
});

this.on(Decrement, (event, emit) => {
  emit({ count: this.state.count - event.by });
});
```

### Event Transformations
Process events before they reach handlers:

```typescript
class SearchBloc extends Bloc<SearchState, SearchEvent> {
  constructor() {
    super({ query: '', results: [], isLoading: false });
    
    // Debounced search
    let debounceTimer: NodeJS.Timeout;
    
    this.on(SearchQueryChanged, (event, emit) => {
      clearTimeout(debounceTimer);
      
      emit({ ...this.state, query: event.query });
      
      debounceTimer = setTimeout(() => {
        this.add(new SearchExecute(event.query));
      }, 300);
    });
    
    this.on(SearchExecute, this.handleSearch);
  }
}
```

## What's Next?

- [Core Concepts](/concepts/state-management) - Deep dive into BlaC architecture
- [Testing Blocs](/patterns/testing) - Testing strategies for Blocs
- [Advanced Patterns](/patterns/advanced) - Complex state management patterns
- [API Reference](/api/core/bloc) - Complete Bloc API