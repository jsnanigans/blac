# Core Concepts

Understanding the fundamental concepts of BlaC will help you build robust and maintainable applications.

## State Containers

BlaC provides two main types of state containers:

### Cubit

A **Cubit** is the simplest form of state management in BlaC. It directly emits new states:

```typescript
class CounterCubit extends Cubit<{ count: number; show: boolean }> {
  constructor() {
    super(0); // Initial state
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  hide = () => {
    this.patch({ show: false });
  };

  reset = () => {
    this.emit({ count: 0, show: true });
  };
}
```

**Use Cubits when:**

- State changes are simple and direct
- The business logic is straightforward

### Bloc

A **Bloc** is an event-driven state container that handles events through registered event handlers:

```typescript
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class CounterBloc extends Bloc<number, IncrementEvent> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });
  }

  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };
}
```

**Use Blocs when:**

- You have complex business logic
- Multiple events affect the same state
- You need event transformation or composition
- You want clear separation between events and state changes
- You require traceability of state changes through events

## State Flow

### Unidirectional Data Flow

```
┌─────────┐
│  Event  │ (user interaction)
└────┬────┘
     │
     ▼
┌─────────────┐
│    Bloc     │ (business logic)
└─────┬───────┘
      │
      ▼
┌─────────────┐
│    State    │ (new state emitted)
└─────┬───────┘
      │
      ▼
┌─────────────┐
│     UI      │ (re-render)
└─────────────┘
```

## Instance Management

BlaC provides three instance management patterns:

### Shared (Default)

A single instance is shared across all consumers:

```typescript
class SharedCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
}

// Both components share the same instance
function ComponentA() {
  const [state] = useBloc(SharedCubit);
  return <div>{state}</div>;
}

function ComponentB() {
  const [state] = useBloc(SharedCubit);
  return <div>{state}</div>; // Same state as ComponentA
}
```

### Isolated

Each consumer gets its own instance:

```typescript
class IsolatedCubit extends Cubit<number> {
  static isolated = true; // Enable isolated mode

  constructor() {
    super(0);
  }
}

// Each component has its own instance
function ComponentA() {
  const [state] = useBloc(IsolatedCubit);
  return <div>{state}</div>;
}

function ComponentB() {
  const [state] = useBloc(IsolatedCubit);
  return <div>{state}</div>; // Different state from ComponentA
}
```

### Persistent (Keep Alive)

Instance stays alive even without consumers:

```typescript
class PersistentCubit extends Cubit<number> {
  static keepAlive = true; // Keep instance alive

  constructor() {
    super(0);
  }
}
```

## Lifecycle

Every Bloc/Cubit has a well-defined lifecycle:

```
┌───────────┐
│  CREATED  │
└─────┬─────┘
      │
      ▼
┌───────────┐
│  ACTIVE   │ ◄──┐
└─────┬─────┘    │
      │          │
      │ (no consumers + not keepAlive)
      │          │
      ▼          │
┌───────────────┐│
│ DISPOSAL_     ││
│ REQUESTED     ││
└─────┬─────────┘│
      │          │
      │ (new consumer)
      ├──────────┘
      │
      ▼
┌───────────┐
│ DISPOSING │
└─────┬─────┘
      │
      ▼
┌───────────┐
│ DISPOSED  │
└───────────┘
```

Override lifecycle methods to add custom behavior:

```typescript
class DataCubit extends Cubit<Data> {
  constructor(private api: ApiClient) {
    super(null);
  }

  onMount = () => {
    console.log('Cubit mounted');
    this.loadData();
  };

  onDispose = () => {
    console.log('Cubit disposed');
    this.cleanup();
  };

  loadData = async () => {
    const data = await this.api.fetch();
    this.emit(data);
  };
}
```

## Arrow Function Methods

::: danger IMPORTANT
All methods in Bloc/Cubit classes **must** use arrow function syntax for proper `this` binding in React:

```typescript
// ✅ Correct
class MyCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };
}

// ❌ Incorrect - will break in React
class MyCubit extends Cubit<number> {
  increment() {
    this.emit(this.state + 1);
  }
}
```

:::

## State Immutability

Always emit new state objects, never mutate existing state:

```typescript
// ✅ Correct - creates new object
updateUser = (name: string) => {
  this.emit({ ...this.state, name });
};

// ❌ Incorrect - mutates state
updateUser = (name: string) => {
  this.state.name = name; // DON'T DO THIS
  this.emit(this.state);
};
```

## Next Steps

- Learn about [Cubit](/core/cubit) in detail
- Explore [Bloc](/core/bloc) event-driven patterns
- Understand [State Management](/core/state-management) best practices
