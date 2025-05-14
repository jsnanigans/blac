# @blac/core

A lightweight, flexible state management library for JavaScript/TypeScript applications focusing on predictable state transitions.

## Features

- 🔄 Predictable unidirectional data flow
- 🧩 Modular architecture with Blocs and Cubits
- 🧪 Unit test friendly
- 🔒 Isolated state instances when needed
- 🔌 Plugin system for extensibility

## Installation

Install `@blac/core` using your favorite package manager:

```bash
# pnpm
pnpm add @blac/core

# yarn
yarn add @blac/core

# npm
npm install @blac/core
```

## Core Concepts

### Blocs and Cubits

**Cubit**: A simple state container with methods to emit new states.

```typescript
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state
  }

  increment = () => {
    this.emit(this.state + 1);
  }

  decrement = () => {
    this.emit(this.state - 1);
  }
}
```

**Bloc**: More powerful state container with a reducer pattern for action-based state transitions.

```typescript
// Define actions
type CounterAction = 
  | { type: 'increment', amount: number }
  | { type: 'decrement', amount: number };

class CounterBloc extends Bloc<number, CounterAction> {
  constructor() {
    super(0); // Initial state
  }

  reducer = (action: CounterAction, state: number): number => {
    switch (action.type) {
      case 'increment':
        return state + action.amount;
      case 'decrement':
        return state - action.amount;
    }
  }

  increment = (amount = 1) => {
    this.add({ type: 'increment', amount });
  }

  decrement = (amount = 1) => {
    this.add({ type: 'decrement', amount });
  }
}
```

### Important: Arrow Functions Required

All methods in Bloc or Cubit classes must use arrow function syntax (`method = () => {}`) instead of the traditional method syntax (`method() {}`). This is because arrow functions automatically bind `this` to the class instance. Without this binding, methods called from React components would lose their context and could not access instance properties like `this.state` or `this.emit()`.

### State Management Patterns

#### Shared State (Default)

By default, bloc instances are shared across all consumers:

```typescript
class GlobalCounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
  
  increment = () => {
    this.emit(this.state + 1);
  }
}
```

#### Isolated State

When each consumer needs its own state instance:

```typescript
class LocalCounterCubit extends Cubit<number> {
  static isolated = true; // Each consumer gets its own instance
  
  constructor() {
    super(0);
  }
  
  increment = () => {
    this.emit(this.state + 1);
  }
}
```

#### Persistent State

Keep state alive even when no consumers are using it:

```typescript
class PersistentCounterCubit extends Cubit<number> {
  static keepAlive = true; // State persists even when no consumers
  
  constructor() {
    super(0);
  }
  
  increment = () => {
    this.emit(this.state + 1);
  }
}
```

## Advanced Usage

### Custom Plugins

Create plugins to add functionality like logging, persistence, or analytics:

```typescript
import { BlacPlugin, BlacLifecycleEvent, BlocBase } from '@blac/core';

class LoggerPlugin implements BlacPlugin {
  name = 'LoggerPlugin';
  
  onEvent(event: BlacLifecycleEvent, bloc: BlocBase, params?: any) {
    if (event === BlacLifecycleEvent.STATE_CHANGED) {
      console.log(`[${bloc._name}] State changed:`, bloc.state);
    }
  }
}

// Add the plugin to Blac
import { Blac } from '@blac/core';
Blac.addPlugin(new LoggerPlugin());
```

### Using Props with Blocs

Blocs can be designed to accept properties through their constructor, allowing for configurable instances. Here's an example of a `UserProfileBloc` that takes a `userId` prop:

```typescript
import { Bloc } from '@blac/core'; // Or your specific import path

// Define props interface (optional, but good practice)
interface UserProfileProps {
  userId: string;
}

// Define state interface
interface UserProfileState {
  loading: boolean;
  userData: { id: string; name: string; bio?: string } | null;
  error: string | null;
}

// Define actions (if any, for this example we'll focus on constructor and an async method)
type UserProfileAction = { type: 'dataLoaded', data: any } | { type: 'error', error: string };

class UserProfileBloc extends Bloc<UserProfileState, UserProfileAction> {
  private userId: string;

  // The Blac library or its React bindings (like @blac/react)
  // might provide a way to pass these props during instantiation.
  // For example, `useBloc(UserProfileBloc, { props: { userId: '123' } })`
  constructor(props: UserProfileProps) {
    super({ loading: true, userData: null, error: null }); // Initial state
    this.userId = props.userId;
    // Optional: Set a dynamic name for easier debugging with multiple instances
    this._name = `UserProfileBloc_${this.userId}`; 
    this.fetchUserProfile();
  }

  // Example reducer
  reducer = (action: UserProfileAction, state: UserProfileState): UserProfileState => {
    switch (action.type) {
      case 'dataLoaded':
        return { ...state, loading: false, userData: action.data, error: null };
      case 'error':
        return { ...state, loading: false, error: action.error };
      default:
        return state;
    }
  }

  fetchUserProfile = async ()_ => {
    this.emit({ ...this.state, loading: true }); // Set loading true before fetch
    try {
      // Simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockUserData = { id: this.userId, name: `User ${this.userId}`, bio: 'Loves Blac states!' };
      // Dispatch an action or directly emit a new state
      this.add({ type: 'dataLoaded', data: mockUserData });
    } catch (e:any) {
      this.add({ type: 'error', error: e.message || 'Failed to fetch user profile' });
    }
  }
}
```

## API Reference

### Core Classes

- `BlocBase<S, P>`: Base class for state containers
- `Cubit<S, P>`: Simple state container with `emit()` and `patch()`
- `Bloc<S, A, P>`: Action-based state container with a reducer pattern
- `Blac`: Singleton manager for all Bloc instances

### React Hooks

- `useBloc<B>(BlocClass, options?)`: Connect a component to a Bloc

### Lifecycle Events

- `BLOC_CREATED`: When a new Bloc is instantiated
- `BLOC_DISPOSED`: When a Bloc is disposed
- `LISTENER_ADDED`: When a state listener is added
- `LISTENER_REMOVED`: When a state listener is removed
- `STATE_CHANGED`: When state is updated
- `BLOC_CONSUMER_ADDED`: When a new consumer starts using a Bloc
- `BLOC_CONSUMER_REMOVED`: When a consumer stops using a Bloc

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.