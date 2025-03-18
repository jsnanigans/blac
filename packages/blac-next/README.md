# !!UNDER CONSTRUCTION!!

# blac-next

A lightweight, flexible state management library for JavaScript/TypeScript applications focusing on predictable state transitions.

## Features

- 🔄 Predictable unidirectional data flow
- 🧩 Modular architecture with Blocs and Cubits
- 🔍 Fine-grained dependency tracking for optimal rendering
- 🔌 Plugin system for extensibility
- 🚀 Framework agnostic core with React bindings
- 🔒 Isolated state instances when needed
- 🧠 Smart re-rendering with automatic dependency detection

## Installation

```bash
```

For React applications:

```bash
```

## Core Concepts

### Blocs and Cubits

**Cubit**: A simple state container with methods to emit new states.

```typescript
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state
  }

  increment() {
    this.emit(this.state + 1);
  }

  decrement() {
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

  reducer(action: CounterAction, state: number): number {
    switch (action.type) {
      case 'increment':
        return state + action.amount;
      case 'decrement':
        return state - action.amount;
    }
  }

  increment(amount = 1) {
    this.add({ type: 'increment', amount });
  }

  decrement(amount = 1) {
    this.add({ type: 'decrement', amount });
  }
}
```

### State Management Patterns

#### Shared State (Default)

By default, bloc instances are shared across all consumers:

```typescript
class GlobalCounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
  
  increment() {
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
  
  increment() {
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
  
  increment() {
    this.emit(this.state + 1);
  }
}
```

## Using with React

```tsx
import { useBloc } from 'blac-react';
import { CounterCubit } from './counter-cubit';

function Counter() {
  const [count, counterCubit] = useBloc(CounterCubit);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterCubit.increment()}>Increment</button>
      <button onClick={() => counterCubit.decrement()}>Decrement</button>
    </div>
  );
}
```

### Optimizing Renders with Dependency Selection

```tsx
import { useBloc } from 'blac-react';
import { TodoListCubit } from './todo-list-cubit';

function CompletedCount() {
  const [todoState, todoListCubit] = useBloc(TodoListCubit, {
    // Only re-render when completedCount changes
    dependencySelector: (state) => [[state.completedCount]]
  });
  
  return <div>Completed: {todoState.completedCount}</div>;
}
```

## Advanced Usage

### Custom Plugins

Create plugins to add functionality like logging, persistence, or analytics:

```typescript
import { BlacPlugin, BlacLifecycleEvent, BlocBase } from 'blac-next';

class LoggerPlugin implements BlacPlugin {
  name = 'LoggerPlugin';
  
  onEvent(event: BlacLifecycleEvent, bloc: BlocBase, params?: any) {
    if (event === BlacLifecycleEvent.STATE_CHANGED) {
      console.log(`[${bloc._name}] State changed:`, bloc.state);
    }
  }
}

// Add the plugin to Blac
import { Blac } from 'blac-next';
Blac.addPlugin(new LoggerPlugin());
```

### Using Props with Blocs

```typescript
// Define props type
type ThemeProps = {
  defaultTheme: 'light' | 'dark'
};

class ThemeCubit extends Cubit<string, ThemeProps> {
  constructor(props: ThemeProps) {
    super(props.defaultTheme);
  }
  
  toggle() {
    this.emit(this.state === 'light' ? 'dark' : 'light');
  }
}

// Using with props in React
const [theme, themeCubit] = useBloc(ThemeCubit, {
  props: { defaultTheme: 'light' }
});
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

MIT