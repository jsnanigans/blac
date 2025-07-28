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

## Configuration

BlaC provides global configuration options to customize its behavior:

```typescript
import { Blac } from '@blac/core';

// Configure BlaC before using it
Blac.setConfig({
  // Enable/disable automatic dependency tracking for optimized re-renders
  proxyDependencyTracking: true, // default: true
  
  // Expose Blac instance globally for debugging
  exposeBlacInstance: false // default: false
});

// Read current configuration
const config = Blac.config;
console.log(config.proxyDependencyTracking); // true
```

### Configuration Options

- **`proxyDependencyTracking`**: When enabled (default), BlaC automatically tracks which state properties your components access and only triggers re-renders when those specific properties change. Disable this for simpler behavior where any state change triggers re-renders.

- **`exposeBlacInstance`**: When enabled, exposes the BlaC instance globally (useful for debugging). Not recommended for production.

## Testing

Blac provides comprehensive testing utilities to make testing your state management logic simple and powerful:

```typescript
import { BlocTest, MockCubit, MemoryLeakDetector } from '@blac/core';

describe('Counter Tests', () => {
  beforeEach(() => BlocTest.setUp());
  afterEach(() => BlocTest.tearDown());

  it('should increment counter', async () => {
    const counter = BlocTest.createBloc(CounterCubit);
    
    counter.increment();
    
    expect(counter.state.count).toBe(1);
  });

  it('should track state history', () => {
    const mockCubit = new MockCubit({ count: 0 });
    
    mockCubit.emit({ count: 1 });
    mockCubit.emit({ count: 2 });
    
    const history = mockCubit.getStateHistory();
    expect(history).toHaveLength(3); // Initial + 2 emissions
  });

  it('should detect memory leaks', () => {
    const detector = new MemoryLeakDetector();
    
    // Create and use blocs...
    
    const result = detector.checkForLeaks();
    expect(result.hasLeaks).toBe(false);
  });
});
```

**[📚 View Complete Testing Documentation](./docs/testing.md)**

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

**Bloc**: More powerful state container that uses an event-handler pattern for type-safe, event-driven state transitions. Events (instances of classes) are dispatched via `this.add()`, and handlers are registered using `this.on(EventClass, handler)`.

```typescript
// Define event classes
class IncrementEvent { constructor(public readonly amount: number = 1) {} }
class DecrementEvent { constructor(public readonly amount: number = 1) {} }

// Optional: Union type for all events
type CounterEvent = IncrementEvent | DecrementEvent;

class CounterBloc extends Bloc<number, CounterEvent> {
  constructor() {
    super(0); // Initial state

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });
  }

  // Helper methods to dispatch event instances (optional)
  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  }

  decrement = (amount = 1) => {
    this.add(new DecrementEvent(amount));
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

// Define Event Classes for UserProfileBloc
class UserProfileFetchEvent {}
class UserProfileDataLoadedEvent { constructor(public readonly data: any) {} }
class UserProfileErrorEvent { constructor(public readonly error: string) {} }

type UserProfileEvents = UserProfileFetchEvent | UserProfileDataLoadedEvent | UserProfileErrorEvent;

class UserProfileBloc extends Bloc<UserProfileState, UserProfileEvents, UserProfileProps> {
  private userId: string;

  constructor(props: UserProfileProps) {
    super({ loading: true, userData: null, error: null }); // Initial state
    this.userId = props.userId;
    this._name = `UserProfileBloc_${this.userId}`;

    // Register event handlers
    this.on(UserProfileFetchEvent, this.handleFetchUserProfile);
    this.on(UserProfileDataLoadedEvent, (event, emit) => {
      emit({ ...this.state, loading: false, userData: event.data, error: null });
    });
    this.on(UserProfileErrorEvent, (event, emit) => {
      emit({ ...this.state, loading: false, error: event.error });
    });

    // Initial fetch
    this.add(new UserProfileFetchEvent());
  }

  private handleFetchUserProfile = async (_event: UserProfileFetchEvent, emit: (state: UserProfileState) => void) => {
    // Emit loading state directly if not already covered by initial state or another event
    // For this example, constructor sets loading: true, so an immediate emit here might be redundant
    // unless an event handler could set loading to false before this runs.
    // emit({ ...this.state, loading: true }); // Ensure loading is true
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      const mockUserData = { id: this.userId, name: `User ${this.userId}`, bio: 'Loves Blac states!' };
      this.add(new UserProfileDataLoadedEvent(mockUserData));
    } catch (e:any) {
      this.add(new UserProfileErrorEvent(e.message || 'Failed to fetch user profile'));
    }
  }
  
  // Public method to re-trigger fetch if needed
  refetchUserProfile = () => {
    this.add(new UserProfileFetchEvent());
  }
}
```

## API Reference

### Core Classes

- `BlocBase<S, P>`: Base class for state containers
- `Cubit<S, P>`: Simple state container with `emit()` and `patch()`
- `Bloc<S, E, P>`: Event-driven state container with `on(EventClass, handler)` and `add(eventInstance)` methods.
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