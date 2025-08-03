# Agent Instructions for BlaC State Management

This guide helps coding agents correctly implement BlaC state management on the first try.

## 🚨 Critical Rules - MUST READ

### 1. ALWAYS Use Arrow Functions for Methods

```typescript
// ✅ CORRECT - Arrow functions maintain proper this binding
class CounterCubit extends Cubit<CounterState> {
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

// ❌ WRONG - Regular methods lose this binding when called from React
class CounterCubit extends Cubit<CounterState> {
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}
```

### 2. State Must Be Immutable

```typescript
// ❌ WRONG - Mutating state
this.state.count++;
this.emit(this.state);

// ✅ CORRECT - Creating new state
this.emit({ count: this.state.count + 1 });

// ✅ CORRECT - Using spread for objects
this.emit({ ...this.state, count: this.state.count + 1 });

// ✅ CORRECT - Using patch for partial updates
this.patch({ count: this.state.count + 1 });
```

### 3. Event Classes for Bloc Pattern

```typescript
// Define event classes (not plain objects or strings!)
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class CounterBloc extends Bloc<CounterState, CounterEvent> {
  constructor() {
    super({ count: 0 });

    // Register handlers in constructor
    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });
  }

  // Helper method using arrow function
  increment = (amount?: number) => {
    this.add(new IncrementEvent(amount));
  };
}
```

## Core Patterns

### Cubit Pattern (Simple State)

Use Cubit for straightforward state management:

```typescript
interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ user: null, loading: false, error: null });
  }

  loadUser = async (userId: string) => {
    this.emit({ ...this.state, loading: true, error: null });

    try {
      const user = await api.fetchUser(userId);
      this.emit({ user, loading: false, error: null });
    } catch (error) {
      this.emit({
        ...this.state,
        loading: false,
        error: error.message,
      });
    }
  };

  updateName = (name: string) => {
    if (!this.state.user) return;

    // Using patch for partial updates
    this.patch({
      user: { ...this.state.user, name },
    });
  };

  logout = () => {
    this.emit({ user: null, loading: false, error: null });
  };
}
```

### Bloc Pattern (Event-Driven)

Use Bloc for complex event-driven state:

```typescript
// Event classes
class LoadTodos {}
class AddTodo {
  constructor(public readonly text: string) {}
}
class ToggleTodo {
  constructor(public readonly id: string) {}
}
class DeleteTodo {
  constructor(public readonly id: string) {}
}

type TodoEvent = LoadTodos | AddTodo | ToggleTodo | DeleteTodo;

interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
}

class TodoBloc extends Bloc<TodoState, TodoEvent> {
  constructor() {
    super({ todos: [], loading: false, error: null });

    this.on(LoadTodos, this.onLoadTodos);
    this.on(AddTodo, this.onAddTodo);
    this.on(ToggleTodo, this.onToggleTodo);
    this.on(DeleteTodo, this.onDeleteTodo);
  }

  private onLoadTodos = async (_: LoadTodos, emit: Emitter<TodoState>) => {
    emit({ ...this.state, loading: true });

    try {
      const todos = await api.fetchTodos();
      emit({ todos, loading: false, error: null });
    } catch (error) {
      emit({ ...this.state, loading: false, error: error.message });
    }
  };

  private onAddTodo = (event: AddTodo, emit: Emitter<TodoState>) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: event.text,
      completed: false,
    };

    emit({
      ...this.state,
      todos: [...this.state.todos, newTodo],
    });
  };

  private onToggleTodo = (event: ToggleTodo, emit: Emitter<TodoState>) => {
    emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === event.id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  };

  private onDeleteTodo = (event: DeleteTodo, emit: Emitter<TodoState>) => {
    emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => todo.id !== event.id),
    });
  };

  // Public API methods
  loadTodos = () => this.add(new LoadTodos());
  addTodo = (text: string) => this.add(new AddTodo(text));
  toggleTodo = (id: string) => this.add(new ToggleTodo(id));
  deleteTodo = (id: string) => this.add(new DeleteTodo(id));
}
```

## React Integration

### Basic Hook Usage

```tsx
import { useBloc } from '@blac/react';

function TodoList() {
  // Returns tuple: [state, blocInstance]
  const [state, bloc] = useBloc(TodoBloc);

  useEffect(() => {
    bloc.loadTodos();
  }, [bloc]);

  if (state.loading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error}</div>;

  return (
    <div>
      {state.todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={() => bloc.toggleTodo(todo.id)}
          onDelete={() => bloc.deleteTodo(todo.id)}
        />
      ))}
    </div>
  );
}
```

### Selector Pattern (Optimized Re-renders)

```tsx
function TodoStats() {
  // Only re-render when these specific values change
  const [state] = useBloc(TodoBloc, {
    selector: (state) => ({
      total: state.todos.length,
      completed: state.todos.filter((t) => t.completed).length,
      active: state.todos.filter((t) => !t.completed).length,
    }),
  });

  return (
    <div>
      <p>Total: {state.total}</p>
      <p>Active: {state.active}</p>
      <p>Completed: {state.completed}</p>
    </div>
  );
}
```

### Computed Values

```typescript
class ShoppingCartCubit extends Cubit<CartState> {
  // Computed properties use getters
  get totalPrice() {
    return this.state.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
  }

  get totalItems() {
    return this.state.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  }

  get isEmpty() {
    return this.state.items.length === 0;
  }
}

// In React
function CartSummary() {
  const [state, cart] = useBloc(ShoppingCartCubit);

  return (
    <div>
      <p>Items: {cart.totalItems}</p>
      <p>Total: ${cart.totalPrice.toFixed(2)}</p>
      {cart.isEmpty && <p>Your cart is empty</p>}
    </div>
  );
}
```

## Instance Management

### Shared Instance (Default)

```typescript
// All components share the same instance
class AppStateCubit extends Cubit<AppState> {
  // Default behavior - shared across all consumers
}
```

### Isolated Instance

```typescript
// Each component gets its own instance
class FormCubit extends Cubit<FormState> {
  static isolated = true;

  constructor() {
    super({ name: '', email: '', message: '' });
  }
}

// Each form has independent state
function ContactForm() {
  const [state, form] = useBloc(FormCubit);
  // This instance is unique to this component
}
```

### Keep Alive Instance

```typescript
// Instance persists even when no components use it
class AuthCubit extends Cubit<AuthState> {
  static keepAlive = true;

  constructor() {
    super({ user: null, token: null });
  }
}
```

### Named Instances

```tsx
// Multiple shared instances with different IDs
function GameScore() {
  const [teamA] = useBloc(ScoreCubit, { instanceId: 'team-a' });
  const [teamB] = useBloc(ScoreCubit, { instanceId: 'team-b' });

  return (
    <div>
      <TeamScore team="A" instanceId="team-a" />
      <TeamScore team="B" instanceId="team-b" />
    </div>
  );
}
```

### Props-Based Instances

```typescript
interface ChatRoomProps {
  roomId: string;
}

class ChatRoomCubit extends Cubit<ChatState, ChatRoomProps> {
  constructor(props: ChatRoomProps) {
    super({ messages: [], typing: [] });
    this._name = `ChatRoom_${props.roomId}`;
    this.connectToRoom(props.roomId);
  }

  private connectToRoom = (roomId: string) => {
    // Connect to specific room
  };
}

// Usage
function ChatRoom({ roomId }: { roomId: string }) {
  const [state, chat] = useBloc(ChatRoomCubit, {
    props: { roomId }
  });

  return <div>{/* Chat UI */}</div>;
}
```

## Advanced Patterns

### Services Pattern

```typescript
// Shared services accessed by multiple blocs
class ApiService {
  async fetchUser(id: string): Promise<User> {
    // API implementation
  }
}

class AuthService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  getHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }
}

// Inject services into blocs
class UserProfileCubit extends Cubit<UserProfileState> {
  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {
    super({ user: null, posts: [], loading: false });
  }

  loadProfile = async (userId: string) => {
    this.emit({ ...this.state, loading: true });

    try {
      const headers = this.auth.getHeaders();
      const user = await this.api.fetchUser(userId, headers);
      this.emit({ ...this.state, user, loading: false });
    } catch (error) {
      // Handle error
    }
  };
}
```

### Plugin System

```typescript
import { BlacPlugin, BlacLifecycleEvent } from '@blac/core';

// Create custom plugin
class LoggerPlugin implements BlacPlugin {
  name = 'LoggerPlugin';

  onEvent(event: BlacLifecycleEvent, bloc: BlocBase, params?: any) {
    switch (event) {
      case BlacLifecycleEvent.STATE_CHANGED:
        console.log(`[${bloc._name}] State:`, bloc.state);
        break;
      case BlacLifecycleEvent.EVENT_DISPATCHED:
        console.log(`[${bloc._name}] Event:`, params);
        break;
    }
  }
}

// Register globally
Blac.addPlugin(new LoggerPlugin());

// Or per-instance
class DebugCubit extends Cubit<any> {
  constructor() {
    super({});
    this.addPlugin(new LoggerPlugin());
  }
}
```

### Persistence Plugin

```typescript
import { PersistencePlugin } from '@blac/plugin-persistence';

class SettingsCubit extends Cubit<SettingsState> {
  constructor() {
    super({
      theme: 'light',
      language: 'en',
      notifications: true,
    });

    // Add persistence
    this.addPlugin(
      new PersistencePlugin({
        key: 'app-settings',
        storage: localStorage, // or sessionStorage
        serialize: JSON.stringify,
        deserialize: JSON.parse,
      }),
    );
  }

  setTheme = (theme: 'light' | 'dark') => {
    this.patch({ theme });
  };
}
```

## Testing

### Basic Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { BlocTest } from '@blac/core/testing';

describe('CounterCubit', () => {
  beforeEach(() => {
    BlocTest.setUp();
  });

  afterEach(() => {
    BlocTest.tearDown();
  });

  it('should increment counter', () => {
    const cubit = BlocTest.create(CounterCubit);

    expect(cubit.state.count).toBe(0);

    cubit.increment();
    expect(cubit.state.count).toBe(1);

    cubit.increment();
    expect(cubit.state.count).toBe(2);
  });
});
```

### Testing Async Operations

```typescript
import { waitFor } from '@blac/core/testing';

it('should load user data', async () => {
  const mockUser = { id: '1', name: 'John' };
  api.fetchUser = vi.fn().mockResolvedValue(mockUser);

  const cubit = BlocTest.create(UserCubit);

  cubit.loadUser('1');

  // Wait for loading state
  expect(cubit.state.loading).toBe(true);

  // Wait for loaded state
  await waitFor(() => {
    expect(cubit.state.loading).toBe(false);
    expect(cubit.state.user).toEqual(mockUser);
  });
});
```

### Testing Bloc Events

```typescript
it('should handle todo events', () => {
  const bloc = BlocTest.create(TodoBloc);

  // Add todo
  bloc.add(new AddTodo('Test todo'));
  expect(bloc.state.todos).toHaveLength(1);
  expect(bloc.state.todos[0].text).toBe('Test todo');

  // Toggle todo
  const todoId = bloc.state.todos[0].id;
  bloc.add(new ToggleTodo(todoId));
  expect(bloc.state.todos[0].completed).toBe(true);

  // Delete todo
  bloc.add(new DeleteTodo(todoId));
  expect(bloc.state.todos).toHaveLength(0);
});
```

## Common Mistakes to Avoid

### 1. Using Regular Methods Instead of Arrow Functions

```typescript
// ❌ WRONG
class CounterCubit extends Cubit<State> {
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

// ✅ CORRECT
class CounterCubit extends Cubit<State> {
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}
```

### 2. Mutating State

```typescript
// ❌ WRONG
this.state.items.push(newItem);
this.emit(this.state);

// ✅ CORRECT
this.emit({
  ...this.state,
  items: [...this.state.items, newItem],
});
```

### 3. Not Registering Event Handlers

```typescript
// ❌ WRONG
class TodoBloc extends Bloc<State, Event> {
  handleAddTodo = (event: AddTodo, emit: Emitter<State>) => {
    // This won't work - handler not registered!
  };
}

// ✅ CORRECT
class TodoBloc extends Bloc<State, Event> {
  constructor() {
    super(initialState);
    this.on(AddTodo, this.handleAddTodo);
  }

  private handleAddTodo = (event: AddTodo, emit: Emitter<State>) => {
    // Now it works!
  };
}
```

### 4. Using Strings as Events

```typescript
// ❌ WRONG
bloc.add('increment'); // Events must be class instances

// ✅ CORRECT
bloc.add(new IncrementEvent());
```

### 5. Not Using useBloc Hook

```typescript
// ❌ WRONG - No reactivity
const cubit = new CounterCubit();
return <div>{cubit.state.count}</div>;

// ✅ CORRECT - Reactive updates
const [state, cubit] = useBloc(CounterCubit);
return <div>{state.count}</div>;
```

## Quick Reference

### Creating a Cubit

```typescript
class NameCubit extends Cubit<StateType> {
  constructor() {
    super(initialState);
  }

  methodName = () => {
    this.emit(newState);
    // or
    this.patch(partialState);
  };
}
```

### Creating a Bloc

```typescript
class NameBloc extends Bloc<StateType, EventType> {
  constructor() {
    super(initialState);
    this.on(EventClass, this.handleEvent);
  }

  private handleEvent = (event: EventClass, emit: Emitter<StateType>) => {
    emit(newState);
  };
}
```

### Using in React

```tsx
// Basic usage
const [state, bloc] = useBloc(BlocOrCubitClass);

// With options
const [state, bloc] = useBloc(BlocOrCubitClass, {
  instanceId: 'unique-id',
  props: {
    /* props */
  },
  selector: (state) => state.someValue,
});
```

### Configuration Options

```typescript
// Instance options
static isolated = true;   // Each consumer gets own instance
static keepAlive = true;  // Persist when no consumers

// Global config
Blac.setConfig({
  proxyDependencyTracking: true,  // Auto dependency tracking
  enableLogging: false             // Development logging
});
```

## Remember

1. **Arrow functions** for ALL methods (this is critical!)
2. **Event classes** for Bloc pattern (not strings or plain objects)
3. **Immutable state** (always create new objects)
4. **useBloc hook** for React integration
5. **Register handlers** in constructor for Blocs
6. **Test business logic** separately from UI
7. **Use TypeScript** for full type safety

## When to Use What

- **Cubit**: Simple state, direct updates, synchronous logic
- **Bloc**: Complex flows, event sourcing, async operations
- **Isolated**: Form state, modals, component-specific state
- **KeepAlive**: Auth state, app settings, global cache
- **Named instances**: Multiple instances of same logic (e.g., multiple counters)
- **Props-based**: State tied to specific data (e.g., user profile, chat room)

## Get Help

- Check `/apps/docs/examples/` for complete examples
- Run tests with `pnpm test` to verify behavior
- Use TypeScript for autocomplete and type checking
- Enable logging during development for debugging
