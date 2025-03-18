# blac

A lightweight, powerful state management library inspired by the BLoC pattern but with a minimalist, JavaScript/TypeScript-first approach.

## The Philosophy Behind blac

Blac was born from the necessity for a state management solution that is powerful and predictable, yet flexible and lightweight. The core philosophy of blac revolves around these principles:

### 1. Separation of Concerns

Blac enforces a strict separation between UI and business logic. A BLoC (Business Logic Component) or Cubit handles all business logic, data operations, and state transitions. UI components simply send events to the BLoC and receive state updates for rendering.

- BLoCs/Cubits are the only place that should access external data sources (APIs, databases, etc.)
- UI components should be pure renderers that react to state changes
- Business logic stays isolated and manageable in dedicated classes

### 2. Testability by Design

When business logic is isolated in BLoCs/Cubits, testing becomes dramatically simpler:

- Unit test business logic without mocking complex UI interactions and lifecycles
- Test state transitions directly by sending events and asserting on state changes
- Achieve higher test coverage with more performant tests
- Reduce testing complexity by focusing on pure business logic

### 3. Automatic State Management

State management should be automatic and require minimal configuration:

- Focus on writing business logic, not state boilerplate
- State distribution and updates happen automatically
- Fine-grained updates through intelligent dependency tracking
- No complex setup or configuration required

### 4. Simplicity Without Sacrifice

Blac embraces simplicity in its API design without sacrificing power or flexibility. We believe that state management should be straightforward to learn and implement, but still capable of handling complex application needs.

### 5. Unidirectional Data Flow

Following proven patterns, blac implements a unidirectional data flow that makes state changes predictable and traceable. State transitions happen in a controlled manner, making applications easier to debug and reason about.

## The Blac Way of Thinking

The "blac way of thinking" is a mental model for approaching state management that emphasizes:

### State Encapsulation

Think of state not as global values, but as encapsulated units with well-defined interfaces. Each bloc should have a single responsibility and manage a specific slice of your application state.

```typescript
// A counter bloc manages only counter state and operations
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
  
  increment() {
    this.emit(this.state + 1);
  }
  
  decrement() {
    this.emit(this.state - 1);
  }
}
```

### Intent-Driven Modifications

State should never be modified directly. Instead, express intentions to modify state through clearly named methods or actions:

```typescript
// Don't do this:
counterCubit.state++; // ❌ Direct state modification

// Do this instead:
counterCubit.increment(); // ✅ Intent-driven modification
```

### Smart Instance Management

Different features have different state scoping needs. Blac accommodates this through flexible instance management:

- **Shared instances** (default): When state should be shared across components
- **Isolated instances**: When components need their own state
- **Keep-alive instances**: When state should persist even without active consumers

### Pure UI Components

UI components should be pure renderers that focus solely on presentation and user interaction. They should not contain business logic or manage state directly:

```tsx
function Counter() {
  // UI components use blocs but don't implement state logic
  const [count, counterCubit] = useBloc(CounterCubit);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterCubit.increment()}>+</button>
      <button onClick={() => counterCubit.decrement()}>-</button>
    </div>
  );
}
```

### Data Access Through BLoCs

Blocs/Cubits should be the only components that interact with external data sources:

```typescript
class UserCubit extends Cubit<UserState> {
  constructor(private userApi: UserApi) {
    super({ isLoading: false, user: null, error: null });
  }
  
  async fetchUser(id: string) {
    this.emit({ ...this.state, isLoading: true });
    
    try {
      // BLoC handles API calls, not the UI
      const user = await this.userApi.getUser(id);
      this.emit({ isLoading: false, user, error: null });
    } catch (error) {
      this.emit({ isLoading: false, user: null, error });
    }
  }
}
```

### Event-Driven Architecture

Complex state transitions are often better represented through an event-driven architecture, which blac supports through the Bloc class:

```typescript
type CounterEvent = { type: 'increment' } | { type: 'decrement' };

class CounterBloc extends Bloc<number, CounterEvent> {
  constructor() {
    super(0);
  }
  
  reducer(event: CounterEvent, state: number): number {
    switch (event.type) {
      case 'increment': return state + 1;
      case 'decrement': return state - 1;
    }
  }
}
```

### Effortless Testing

Testing business logic becomes straightforward with blac:

```typescript
test('counter should increment', () => {
  const counter = new CounterCubit();
  expect(counter.state).toBe(0);
  
  counter.increment();
  expect(counter.state).toBe(1);
});

test('fetching user updates state correctly', async () => {
  const mockApi = { getUser: jest.fn() };
  mockApi.getUser.mockResolvedValue({ id: '1', name: 'Test User' });
  
  const userCubit = new UserCubit(mockApi);
  expect(userCubit.state.isLoading).toBe(false);
  
  const promise = userCubit.fetchUser('1');
  expect(userCubit.state.isLoading).toBe(true);
  
  await promise;
  expect(userCubit.state.isLoading).toBe(false);
  expect(userCubit.state.user).toEqual({ id: '1', name: 'Test User' });
});
```

## Core Components

Blac consists of two main packages:

- **blac-next**: The core state management library
- **@blac/react**: React bindings for blac

## Getting Started

```bash
```

Check the [blac core documentation](packages/blac-next/README.md) to learn more about blac.
Check the [blac react documentation](packages/blac-react/README.md) to learn more about how to use blac in your react projects.

## License

MIT
