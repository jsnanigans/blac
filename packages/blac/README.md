# @blac/core

Core state management library implementing the BloC pattern for TypeScript applications.

## Installation

```bash
npm install @blac/core
# or
pnpm add @blac/core
# or
yarn add @blac/core
```

## Core Concepts

### Cubit

Simple state container with direct state emission. Use when you need straightforward state updates.

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.emit({ count: this.state.count + 1 });
  }

  decrement() {
    this.update((state) => ({ count: state.count - 1 }));
  }

  reset() {
    this.patch({ count: 0 });
  }
}
```

### Vertex

Event-driven state container using discriminated union events. Use when you need structured event handling with type-safe exhaustive checking.

```typescript
import { Vertex } from '@blac/core';

type CounterEvent =
  | { type: 'increment'; amount: number }
  | { type: 'decrement' }
  | { type: 'reset' };

class CounterVertex extends Vertex<{ count: number }, CounterEvent> {
  constructor() {
    super({ count: 0 });
    this.createHandlers({
      increment: (event, emit) => {
        emit({ count: this.state.count + event.amount });
      },
      decrement: (_, emit) => {
        emit({ count: this.state.count - 1 });
      },
      reset: (_, emit) => {
        emit({ count: 0 });
      },
    });
  }

  increment = (amount = 1) => this.add({ type: 'increment', amount });
  decrement = () => this.add({ type: 'decrement' });
  reset = () => this.add({ type: 'reset' });
}
```

### StatelessCubit & StatelessVertex

Stateless containers for services that don't need state tracking. Use for actions-only functionality like analytics, API calls, or navigation.

```typescript
import { StatelessCubit } from '@blac/core';

class AnalyticsService extends StatelessCubit {
  trackEvent(name: string, data?: Record<string, unknown>) {
    // Send to analytics provider
  }
}
```

## Registry API

Manage state container instances with the registry functions:

```typescript
import { acquire, release, borrow, hasInstance, clear } from '@blac/core';

// Acquire an instance (creates if needed, increments ref count)
const counter = acquire(CounterCubit);

// Release when done (decrements ref count, disposes when 0)
release(CounterCubit);

// Borrow without affecting ref count
const instance = borrow(CounterCubit);

// Check if instance exists
if (hasInstance(CounterCubit)) {
  // ...
}

// Clear a specific class
clear(CounterCubit);

// Clear all instances
clearAll();
```

## Decorators

Use the `@blac` decorator to configure container behavior:

```typescript
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true }) // Each consumer gets its own instance
class FormCubit extends Cubit<FormState> {}

@blac({ keepAlive: true }) // Never auto-dispose
class AuthCubit extends Cubit<AuthState> {}

@blac({ excludeFromDevTools: true }) // Hide from DevTools
class InternalCubit extends Cubit<State> {}
```

## Utilities

### waitUntil

Wait for a specific state condition:

```typescript
import { waitUntil } from '@blac/core';

const counter = acquire(CounterCubit);

// Wait until count reaches 10
await waitUntil(counter, (state) => state.count >= 10);

// With timeout
await waitUntil(counter, (state) => state.count >= 10, {
  timeout: 5000,
});
```

### watch

Create computed values that react to state changes:

```typescript
import { watch, instance } from '@blac/core';

class DashboardCubit extends Cubit<DashboardState> {
  constructor() {
    super({ items: [] });

    // Watch another bloc's state
    watch(
      instance(UserCubit),
      (userState) => userState.preferences,
      (preferences) => this.onPreferencesChanged(preferences),
    );
  }
}
```

## Plugins

Extend functionality with plugins:

```typescript
import { getPluginManager, type BlacPlugin } from '@blac/core';

const loggingPlugin: BlacPlugin = {
  name: 'logging',
  onStateChange: (container, prevState, newState) => {
    console.log(`[${container.constructor.name}]`, prevState, '->', newState);
  },
};

getPluginManager().register(loggingPlugin);
```

## Configuration

Configure global behavior:

```typescript
import { configureBlac } from '@blac/core';

configureBlac({
  devMode: import.meta.env.DEV,
});
```

## API Reference

### State Containers

| Class                | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `Cubit<S, P>`        | Simple state container with `emit()`, `update()`, `patch()` |
| `Vertex<S, E, P>`    | Event-driven container with `add()` and `createHandlers()`  |
| `StatelessCubit`     | Stateless service container                                 |
| `StatelessVertex<E>` | Stateless event-driven container                            |

### Registry Functions

| Function                         | Description                                 |
| -------------------------------- | ------------------------------------------- |
| `acquire(Class, key?, options?)` | Get or create instance, increment ref count |
| `release(Class, key?)`           | Decrement ref count, dispose when 0         |
| `borrow(Class, key?)`            | Get instance without affecting ref count    |
| `borrowSafe(Class, key?)`        | Borrow or return undefined                  |
| `ensure(Class, key?, options?)`  | Acquire without incrementing ref count      |
| `hasInstance(Class, key?)`       | Check if instance exists                    |
| `getRefCount(Class, key?)`       | Get current reference count                 |
| `clear(Class)`                   | Remove all instances of a class             |
| `clearAll()`                     | Remove all instances                        |

### Exports

```typescript
// Core classes
export { Cubit, Vertex, StatelessCubit, StatelessVertex } from '@blac/core';

// Registry
export {
  acquire,
  release,
  borrow,
  ensure,
  hasInstance,
  clear,
  clearAll,
} from '@blac/core';

// Utilities
export { waitUntil, watch, instance } from '@blac/core';

// Decorators
export { blac } from '@blac/core';

// Plugin system
export { getPluginManager, type BlacPlugin } from '@blac/core';

// Configuration
export { configureBlac, getBlacConfig, isDevMode } from '@blac/core';
```

## License

MIT
