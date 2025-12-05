# Vertex

Vertex is an event-driven state container. Use it when you need explicit event handling, audit trails, or complex state flows.

## Basic Structure

```typescript
import { Vertex, BaseEvent } from '@blac/core';

// 1. Define events
class IncrementEvent implements BaseEvent {
  readonly type = 'increment';
  readonly timestamp = Date.now();
  constructor(public readonly amount: number = 1) {}
}

// 2. Create Vertex with handlers
class CounterVertex extends Vertex<{ count: number }> {
  constructor() {
    super({ count: 0 });

    // Register handlers in constructor
    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });
  }

  // 3. Public methods dispatch events
  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };
}
```

## BaseEvent Interface

All events must implement `BaseEvent`:

```typescript
interface BaseEvent {
  readonly type: string;      // Event identifier
  readonly timestamp: number; // When event was created
  readonly source?: string;   // Optional source identifier
}
```

Example events:

```typescript
class LoginEvent implements BaseEvent {
  readonly type = 'login';
  readonly timestamp = Date.now();
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {}
}

class LogoutEvent implements BaseEvent {
  readonly type = 'logout';
  readonly timestamp = Date.now();
}

class UpdateProfileEvent implements BaseEvent {
  readonly type = 'updateProfile';
  readonly timestamp = Date.now();
  constructor(public readonly profile: Partial<Profile>) {}
}
```

## Event Handlers

Register handlers with `on()` in the constructor:

```typescript
class AuthVertex extends Vertex<AuthState> {
  constructor() {
    super({ user: null, isLoading: false, error: null });

    this.on(LoginEvent, (event, emit) => {
      // emit() sets the new state
      emit({ ...this.state, isLoading: true, error: null });

      // Async work should be done before dispatching
      // or in the public method that calls add()
    });

    this.on(LogoutEvent, (_, emit) => {
      emit({ user: null, isLoading: false, error: null });
    });
  }
}
```

The handler receives:
- `event` - The dispatched event with all its data
- `emit` - Function to emit new state

## Dispatching Events

Use `add()` to dispatch events:

```typescript
class AuthVertex extends Vertex<AuthState> {
  // Public methods dispatch events
  login = async (email: string, password: string) => {
    this.add(new LoginStartEvent());

    try {
      const user = await api.login(email, password);
      this.add(new LoginSuccessEvent(user));
    } catch (error) {
      this.add(new LoginFailedEvent(error.message));
    }
  };

  logout = () => {
    this.add(new LogoutEvent());
  };
}
```

## Event Processing

Events are processed synchronously in order:

```typescript
class CounterVertex extends Vertex<{ count: number }> {
  constructor() {
    super({ count: 0 });

    this.on(IncrementEvent, (_, emit) => {
      console.log('Processing increment');
      emit({ count: this.state.count + 1 });
    });
  }
}

const counter = CounterVertex.resolve();
counter.add(new IncrementEvent()); // Logs immediately
console.log(counter.state.count);  // 1
```

If an event is added during processing, it's queued:

```typescript
this.on(BatchEvent, (event, emit) => {
  for (const item of event.items) {
    this.add(new ProcessItemEvent(item)); // Queued
  }
  emit(this.state);
});
```

## Error Handling

Override `onEventError()` to handle errors:

```typescript
class MyVertex extends Vertex<State> {
  protected onEventError(event: BaseEvent, error: Error): void {
    console.error(`Error processing ${event.type}:`, error);

    // Optionally emit error state
    this.add(new ErrorEvent(error.message));
  }
}
```

## Example: Authentication Flow

```typescript
// Events
class LoginStartEvent implements BaseEvent {
  readonly type = 'loginStart';
  readonly timestamp = Date.now();
  constructor(public readonly email: string) {}
}

class LoginSuccessEvent implements BaseEvent {
  readonly type = 'loginSuccess';
  readonly timestamp = Date.now();
  constructor(public readonly user: User) {}
}

class LoginFailedEvent implements BaseEvent {
  readonly type = 'loginFailed';
  readonly timestamp = Date.now();
  constructor(public readonly error: string) {}
}

class LogoutEvent implements BaseEvent {
  readonly type = 'logout';
  readonly timestamp = Date.now();
}

// State
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// Vertex
class AuthVertex extends Vertex<AuthState> {
  constructor() {
    super({ user: null, isLoading: false, error: null });

    this.on(LoginStartEvent, (_, emit) => {
      emit({ user: null, isLoading: true, error: null });
    });

    this.on(LoginSuccessEvent, (event, emit) => {
      emit({ user: event.user, isLoading: false, error: null });
    });

    this.on(LoginFailedEvent, (event, emit) => {
      emit({ user: null, isLoading: false, error: event.error });
    });

    this.on(LogoutEvent, (_, emit) => {
      emit({ user: null, isLoading: false, error: null });
    });
  }

  login = async (email: string, password: string) => {
    this.add(new LoginStartEvent(email));

    try {
      const user = await api.login(email, password);
      this.add(new LoginSuccessEvent(user));
    } catch (error) {
      this.add(new LoginFailedEvent(error.message));
    }
  };

  logout = () => {
    this.add(new LogoutEvent());
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
