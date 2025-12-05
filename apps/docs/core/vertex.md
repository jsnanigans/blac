# Vertex

Vertex is an event-driven state container. Use it when you need explicit event handling, audit trails, or complex state flows.

## Basic Structure

```typescript
import { Vertex } from '@blac/core';

// 1. Define events as a discriminated union
type CounterEvent =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

// 2. Create Vertex with handler map
class CounterVertex extends Vertex<{ count: number }, CounterEvent> {
  constructor() {
    super({ count: 0 });

    // Register all handlers - TypeScript ensures exhaustive coverage
    this.createHandlers({
      increment: (event, emit) => {
        emit({ count: this.state.count + event.amount });
      },
      decrement: (event, emit) => {
        emit({ count: this.state.count - event.amount });
      },
      reset: (_, emit) => {
        emit({ count: 0 });
      },
    });
  }

  // 3. Public methods dispatch events
  increment = (amount = 1) => {
    this.add({ type: 'increment', amount });
  };

  decrement = (amount = 1) => {
    this.add({ type: 'decrement', amount });
  };

  reset = () => {
    this.add({ type: 'reset' });
  };
}
```

## Discriminated Union Events

Events are defined as a TypeScript discriminated union with a `type` property:

```typescript
type AuthEvent =
  | { type: 'login'; email: string; password: string }
  | { type: 'loginSuccess'; user: User }
  | { type: 'loginFailed'; error: string }
  | { type: 'logout' };
```

Benefits over class-based events:
- **Exhaustive checking**: TypeScript errors if you miss a handler
- **Type narrowing**: Event payload types are automatically narrowed in handlers
- **Autocomplete**: Full IDE support for event types and payloads
- **Minification safe**: Uses string literals, not class names

## Event Handlers

Register handlers with `createHandlers()` in the constructor:

```typescript
class AuthVertex extends Vertex<AuthState, AuthEvent> {
  constructor() {
    super({ user: null, isLoading: false, error: null });

    this.createHandlers({
      login: (event, emit) => {
        // event is narrowed to { type: 'login'; email: string; password: string }
        emit({ ...this.state, isLoading: true, error: null });
      },
      loginSuccess: (event, emit) => {
        // event is narrowed to { type: 'loginSuccess'; user: User }
        emit({ user: event.user, isLoading: false, error: null });
      },
      loginFailed: (event, emit) => {
        emit({ user: null, isLoading: false, error: event.error });
      },
      logout: (_, emit) => {
        emit({ user: null, isLoading: false, error: null });
      },
    });
  }
}
```

The handler receives:
- `event` - The dispatched event with narrowed type
- `emit` - Function to emit new state

## Dispatching Events

Use `add()` to dispatch events:

```typescript
class AuthVertex extends Vertex<AuthState, AuthEvent> {
  // Public methods dispatch events
  login = async (email: string, password: string) => {
    this.add({ type: 'login', email, password });

    try {
      const user = await api.login(email, password);
      this.add({ type: 'loginSuccess', user });
    } catch (error) {
      this.add({ type: 'loginFailed', error: error.message });
    }
  };

  logout = () => {
    this.add({ type: 'logout' });
  };
}
```

## Event Processing

Events are processed synchronously in order:

```typescript
const counter = CounterVertex.create();
counter.add({ type: 'increment', amount: 1 }); // Processed immediately
console.log(counter.state.count); // 1
```

If an event is added during processing, it's queued:

```typescript
this.createHandlers({
  batch: (event, emit) => {
    for (const item of event.items) {
      this.add({ type: 'processItem', item }); // Queued
    }
    emit(this.state);
  },
  processItem: (event, emit) => {
    // Processed after batch handler completes
  },
});
```

## Error Handling

Override `onEventError()` to handle errors:

```typescript
class MyVertex extends Vertex<State, MyEvent> {
  protected onEventError(event: EventWithMetadata<MyEvent>, error: Error): void {
    console.error(`Error processing ${event.type}:`, error);
    // Optionally dispatch an error event
    this.add({ type: 'error', message: error.message });
  }
}
```

## Example: Authentication Flow

```typescript
// Events
type AuthEvent =
  | { type: 'loginStart'; email: string }
  | { type: 'loginSuccess'; user: User }
  | { type: 'loginFailed'; error: string }
  | { type: 'logout' };

// State
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// Vertex
class AuthVertex extends Vertex<AuthState, AuthEvent> {
  constructor() {
    super({ user: null, isLoading: false, error: null });

    this.createHandlers({
      loginStart: (_, emit) => {
        emit({ user: null, isLoading: true, error: null });
      },
      loginSuccess: (event, emit) => {
        emit({ user: event.user, isLoading: false, error: null });
      },
      loginFailed: (event, emit) => {
        emit({ user: null, isLoading: false, error: event.error });
      },
      logout: (_, emit) => {
        emit({ user: null, isLoading: false, error: null });
      },
    });
  }

  login = async (email: string, password: string) => {
    this.add({ type: 'loginStart', email });

    try {
      const user = await api.login(email, password);
      this.add({ type: 'loginSuccess', user });
    } catch (error) {
      this.add({ type: 'loginFailed', error: error.message });
    }
  };

  logout = () => {
    this.add({ type: 'logout' });
  };
}
```

## When to Use Vertex

Use Vertex over Cubit when you need:

- **Audit trail**: Events can be logged/stored
- **Undo/redo**: Replay events to restore state
- **Complex flows**: Multi-step processes with explicit transitions
- **Event sourcing**: Rebuild state from events
- **Debugging**: See exactly what events led to current state

For simple state management, use [Cubit](/core/cubit) instead.

## See Also

- [Cubit](/core/cubit) - Simpler alternative
- [Configuration](/core/configuration) - `@blac()` decorator options
- [System Events](/core/system-events) - Lifecycle events
