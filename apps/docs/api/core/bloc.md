# Bloc Class API

The `Bloc` class provides event-driven state management by processing event instances through registered handlers. It extends `BlocBase` for a more structured approach than `Cubit`.

## Class Definition

```typescript
abstract class Bloc<S, A extends BlocEventConstraint = BlocEventConstraint> extends BlocBase<S>
```

**Type Parameters:**

- `S` - The state type
- `A` - The base action/event type with proper constraints (must be class instances)

## Constructor

```typescript
constructor(initialState: S)
```

**Parameters:**

- `initialState` - The initial state value

**Example:**

```typescript
// Define events
class Increment {}
class Decrement {}
type CounterEvent = Increment | Decrement;

// Create Bloc
class CounterBloc extends Bloc<number, CounterEvent> {
  constructor() {
    super(0); // Initial state

    // Register handlers - can use inline arrow functions for simple cases
    this.on(Increment, (event, emit) => emit(this.state + 1));
    this.on(Decrement, (event, emit) => emit(this.state - 1));
  }

  // For complex handlers, use arrow function class methods:
  // private handleIncrement = (event: Increment, emit: (state: number) => void) => {
  //   emit(this.state + 1);
  // };
}
```

## Properties

### state

The current state value (inherited from BlocBase).

```typescript
get state(): S
```

### lastUpdate

Timestamp of the last state update (inherited from BlocBase).

```typescript
get lastUpdate(): number
```

## Methods

### on (Event Registration)

Register a handler for a specific event class.

```typescript
on<T extends E>(
  eventConstructor: new (...args: any[]) => T,
  handler: (event: T, emit: (newState: S) => void) => void | Promise<void>
): void
```

**Parameters:**

- `eventConstructor` - The event class constructor
- `handler` - Function to handle the event

**Handler Parameters:**

- `event` - The event instance
- `emit` - Function to emit new state

**Example:**

```typescript
class TodoBloc extends Bloc<TodoState, TodoEvent> {
  constructor() {
    super({ items: [], filter: 'all' });

    // Sync handler
    this.on(AddTodo, (event, emit) => {
      const newTodo = { id: Date.now(), text: event.text, done: false };
      emit({
        ...this.state,
        items: [...this.state.items, newTodo],
      });
    });

    // Async handler
    this.on(LoadTodos, async (event, emit) => {
      emit({ ...this.state, isLoading: true });

      try {
        const todos = await api.getTodos();
        emit({ items: todos, isLoading: false, error: null });
      } catch (error) {
        emit({ ...this.state, isLoading: false, error: error.message });
      }
    });
  }
}
```

### add

Dispatch an event to be processed by its registered handler. Events are processed sequentially - if multiple events are added, they will be queued and processed one at a time.

```typescript
add(event: A): Promise<void>
```

**Parameters:**

- `event` - The event instance to process

**Returns:**

A Promise that resolves when the event has been processed.

**Example:**

```typescript
const bloc = new TodoBloc();

// Dispatch events
bloc.add(new AddTodo('Learn BlaC'));
bloc.add(new ToggleTodo(todoId));
bloc.add(new LoadTodos());

// Helper methods pattern
class TodoBloc extends Bloc<TodoState, TodoEvent> {
  // ... constructor ...

  // Helper methods for cleaner API
  addTodo = (text: string) => this.add(new AddTodo(text));
  toggleTodo = (id: number) => this.add(new ToggleTodo(id));
  loadTodos = () => this.add(new LoadTodos());
}
```

## Inherited from BlocBase

### Properties

#### state

The current state value.

```typescript
get state(): S
```

#### lastUpdate

Timestamp of the last state update.

```typescript
get lastUpdate(): number
```

#### subscriptionCount

Get the current number of active subscriptions.

```typescript
get subscriptionCount(): number
```

### Methods

#### subscribe()

Subscribe to state changes.

```typescript
subscribe(callback: (state: S) => void): () => void
```

**Example:**

```typescript
const bloc = new CounterBloc();
const unsubscribe = bloc.subscribe((state) => {
  console.log('State changed to:', state);
});

// Later: cleanup
unsubscribe();
```

#### subscribeWithSelector()

Subscribe with a selector for optimized updates.

```typescript
subscribeWithSelector<T>(
  selector: (state: S) => T,
  callback: (value: T) => void,
  equalityFn?: (a: T, b: T) => boolean
): () => void
```

**Example:**

```typescript
// Only notified when todos length changes
const unsubscribe = bloc.subscribeWithSelector(
  (state) => state.todos.length,
  (count) => console.log('Todo count:', count),
);
```

### Static Properties

#### isolated

When `true`, each component gets its own instance.

```typescript
static isolated: boolean = false
```

#### keepAlive

When `true`, instance persists even with no consumers.

```typescript
static keepAlive: boolean = false
```

#### plugins

Array of plugins to automatically attach to this Bloc class.

```typescript
static plugins?: BlocPlugin<any, any>[]
```

### onDispose

Override this method to perform cleanup when the Bloc is disposed. This is called automatically when the last consumer unsubscribes and `keepAlive` is false.

```typescript
onDispose?: () => void
```

**Example:**

```typescript
class DataBloc extends Bloc<DataState, DataEvent> {
  private subscription?: Subscription;

  constructor() {
    super(initialState);
    this.setupHandlers();
    this.subscription = dataStream.subscribe((data) => {
      this.add(new DataReceived(data));
    });
  }

  onDispose = () => {
    this.subscription?.unsubscribe();
    console.log('DataBloc cleaned up');
  };
}
```

## Event Classes

Events are plain classes that carry data:

### Simple Events

```typescript
// No data
class RefreshRequested {}

// With data
class UserSelected {
  constructor(public readonly userId: string) {}
}

// Multiple parameters
class FilterChanged {
  constructor(
    public readonly category: string,
    public readonly sortBy: 'name' | 'date' | 'price',
  ) {}
}
```

### Event Inheritance

```typescript
// Base event for common properties
abstract class TodoEvent {
  constructor(public readonly timestamp: Date = new Date()) {}
}

// Specific events
class AddTodo extends TodoEvent {
  constructor(public readonly text: string) {
    super();
  }
}

class RemoveTodo extends TodoEvent {
  constructor(public readonly id: string) {
    super();
  }
}
```

### Complex Events

```typescript
interface SearchOptions {
  includeArchived: boolean;
  limit: number;
  offset: number;
}

class SearchRequested {
  constructor(
    public readonly query: string,
    public readonly options: SearchOptions = {
      includeArchived: false,
      limit: 20,
      offset: 0,
    },
  ) {}
}
```

## Event Processing

### Sequential Processing

Events are processed one at a time in order:

```typescript
class SequentialBloc extends Bloc<State, Event> {
  constructor() {
    super(initialState);

    this.on(SlowEvent, async (event, emit) => {
      console.log('Processing started');
      await sleep(1000);
      console.log('Processing finished');
      emit(newState);
    });
  }
}

// Events queued
bloc.add(new SlowEvent()); // Starts immediately
bloc.add(new SlowEvent()); // Waits for first to complete
bloc.add(new SlowEvent()); // Waits for second to complete
```

### Error Handling

Errors in handlers are caught and logged:

```typescript
this.on(RiskyEvent, async (event, emit) => {
  try {
    const data = await riskyOperation();
    emit({ ...this.state, data });
  } catch (error) {
    // Handle error gracefully
    emit({ ...this.state, error: error.message });

    // Or re-throw to stop processing
    throw error;
  }
});
```

### Event Transformation

Transform events before processing:

```typescript
class DebouncedSearchBloc extends Bloc<SearchState, SearchEvent> {
  private debounceTimer?: NodeJS.Timeout;

  constructor() {
    super({ query: '', results: [] });

    this.on(QueryChanged, (event, emit) => {
      // Clear previous timer
      clearTimeout(this.debounceTimer);

      // Update query immediately
      emit({ ...this.state, query: event.query });

      // Debounce the search
      this.debounceTimer = setTimeout(() => {
        this.add(new ExecuteSearch(event.query));
      }, 300);
    });

    this.on(ExecuteSearch, this.handleSearch);
  }
}
```

## Complete Examples

### Authentication Bloc

```typescript
// Events
class LoginRequested {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

class LogoutRequested {}

class SessionRestored {
  constructor(public readonly user: User) {}
}

type AuthEvent = LoginRequested | LogoutRequested | SessionRestored;

// State
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// Bloc
class AuthBloc extends Bloc<AuthState, AuthEvent> {
  constructor() {
    super({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    });

    this.on(LoginRequested, this.handleLogin);
    this.on(LogoutRequested, this.handleLogout);
    this.on(SessionRestored, this.handleSessionRestored);

    // Check for existing session
    this.checkSession();
  }

  private handleLogin = async (
    event: LoginRequested,
    emit: (state: AuthState) => void,
  ) => {
    emit({ ...this.state, isLoading: true, error: null });

    try {
      const { user, token } = await api.login(event.email, event.password);
      localStorage.setItem('token', token);

      emit({
        isAuthenticated: true,
        user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      emit({
        ...this.state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  };

  private handleLogout = async (
    _: LogoutRequested,
    emit: (state: AuthState) => void,
  ) => {
    localStorage.removeItem('token');
    await api.logout();

    emit({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    });
  };

  private handleSessionRestored = (
    event: SessionRestored,
    emit: (state: AuthState) => void,
  ) => {
    emit({
      isAuthenticated: true,
      user: event.user,
      isLoading: false,
      error: null,
    });
  };

  private checkSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const user = await api.getCurrentUser();
      this.add(new SessionRestored(user));
    } catch {
      localStorage.removeItem('token');
    }
  };

  // Helper methods
  login = (email: string, password: string) => {
    this.add(new LoginRequested(email, password));
  };

  logout = () => this.add(new LogoutRequested());
}
```

### Shopping Cart Bloc

```typescript
// Events
abstract class CartEvent {}

class AddItem extends CartEvent {
  constructor(
    public readonly product: Product,
    public readonly quantity: number = 1,
  ) {
    super();
  }
}

class RemoveItem extends CartEvent {
  constructor(public readonly productId: string) {
    super();
  }
}

class UpdateQuantity extends CartEvent {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
  ) {
    super();
  }
}

class ApplyCoupon extends CartEvent {
  constructor(public readonly code: string) {
    super();
  }
}

// State
interface CartState {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  coupon: Coupon | null;
  isApplyingCoupon: boolean;
  error: string | null;
}

// Bloc
class CartBloc extends Bloc<CartState, CartEvent> {
  constructor() {
    super({
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      coupon: null,
      isApplyingCoupon: false,
      error: null,
    });

    this.on(AddItem, this.handleAddItem);
    this.on(RemoveItem, this.handleRemoveItem);
    this.on(UpdateQuantity, this.handleUpdateQuantity);
    this.on(ApplyCoupon, this.handleApplyCoupon);
  }

  private handleAddItem = (
    event: AddItem,
    emit: (state: CartState) => void,
  ) => {
    const existing = this.state.items.find(
      (item) => item.product.id === event.product.id,
    );

    let newItems: CartItem[];
    if (existing) {
      newItems = this.state.items.map((item) =>
        item.product.id === event.product.id
          ? { ...item, quantity: item.quantity + event.quantity }
          : item,
      );
    } else {
      newItems = [
        ...this.state.items,
        {
          product: event.product,
          quantity: event.quantity,
        },
      ];
    }

    emit(this.calculateTotals({ ...this.state, items: newItems }));
  };

  private handleApplyCoupon = async (
    event: ApplyCoupon,
    emit: (state: CartState) => void,
  ) => {
    emit({ ...this.state, isApplyingCoupon: true, error: null });

    try {
      const coupon = await api.validateCoupon(event.code);
      emit(
        this.calculateTotals({
          ...this.state,
          coupon,
          isApplyingCoupon: false,
        }),
      );
    } catch (error) {
      emit({
        ...this.state,
        isApplyingCoupon: false,
        error: 'Invalid coupon code',
      });
    }
  };

  private calculateTotals(state: CartState): CartState {
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    let discount = 0;
    if (state.coupon) {
      discount =
        state.coupon.type === 'percentage'
          ? subtotal * (state.coupon.value / 100)
          : state.coupon.value;
    }

    return {
      ...state,
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
    };
  }
}
```

## Testing

```typescript
describe('Bloc', () => {
  let bloc: CounterBloc;

  beforeEach(() => {
    bloc = new CounterBloc();
  });

  test('processes events', () => {
    bloc.add(new Increment());
    expect(bloc.state).toBe(1);

    bloc.add(new Decrement());
    expect(bloc.state).toBe(0);
  });

  test('handles async events', async () => {
    const dataBloc = new DataBloc();

    dataBloc.add(new LoadData());
    expect(dataBloc.state.isLoading).toBe(true);

    await waitFor(() => {
      expect(dataBloc.state.isLoading).toBe(false);
      expect(dataBloc.state.data).toBeDefined();
    });
  });

  test('queues events', async () => {
    const events: string[] = [];

    bloc.on(ProcessStart, async (event, emit) => {
      events.push('start');
      await sleep(10);
      events.push('end');
      emit(state);
    });

    bloc.add(new ProcessStart());
    bloc.add(new ProcessStart());

    await waitFor(() => {
      expect(events).toEqual(['start', 'end', 'start', 'end']);
    });
  });
});
```

## See Also

- [Blocs Concept](/concepts/blocs) - Conceptual overview
- [BlocBase API](/api/core/bloc-base) - Parent class reference
- [Cubit API](/api/core/cubit) - Simpler alternative
- [useBloc Hook](/api/react/hooks#usebloc) - Using Blocs in React
