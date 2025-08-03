# State Management

## Why State Management is the Heart of Every Application

Let's be honest: state management is one of the hardest problems in software engineering. It's not just about storing values—it's about orchestrating the complex dance between user interactions, business logic, data persistence, and UI updates. Get it wrong, and your application becomes a tangled mess of bugs, performance issues, and unmaintainable code.

Every successful application eventually faces the same fundamental questions:

- Where does this piece of state live?
- Who can modify it?
- How do changes propagate through the system?
- How do we test state transitions?
- How do we debug when things go wrong?

These questions become exponentially harder as applications grow. What starts as a simple `useState` call evolves into a complex web of interdependencies that can bring even experienced teams to their knees.

## The Real Cost of Poor State Management

### 1. **Bugs That Multiply**

When state management is ad-hoc, bugs don't just appear—they multiply. A simple state update in one component can have cascading effects throughout your application. Race conditions emerge. Data gets out of sync. Users see stale information. And the worst part? These bugs are often intermittent and nearly impossible to reproduce consistently.

### 2. **Development Velocity Grinds to a Halt**

As your codebase grows, adding new features becomes increasingly dangerous. Developers spend more time understanding existing state interactions than building new functionality. Simple changes require touching multiple files, and every modification carries the risk of breaking something elsewhere.

### 3. **Testing Becomes a Nightmare**

When business logic is intertwined with UI components, testing becomes nearly impossible. You can't test a calculation without rendering components. You can't verify state transitions without mocking entire component trees. Your test suite becomes brittle, slow, and provides little confidence.

### 4. **Performance Degrades Invisibly**

Poor state management leads to unnecessary re-renders, memory leaks, and sluggish UIs. But these issues creep in slowly. What feels fast with 10 items becomes unusable with 1,000. By the time you notice, refactoring requires a complete rewrite.

## The Fundamental Problem: Mixing Concerns

Let's look at how state management typically evolves in a React application:

### Stage 1: The Honeymoon Phase

```tsx
function TodoItem() {
  const [isComplete, setIsComplete] = useState(false);

  return (
    <div>
      <input
        type="checkbox"
        checked={isComplete}
        onChange={(e) => setIsComplete(e.target.checked)}
      />
      <span>Buy milk</span>
    </div>
  );
}
```

This looks clean! State is colocated with the component that uses it. But then requirements change...

### Stage 2: Growing Complexity

```tsx
function TodoList() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const addTodo = async (text) => {
    setIsLoading(true);
    setError(null);

    try {
      // Optimistic update
      const tempId = Date.now();
      const newTodo = { id: tempId, text, completed: false, userId: user?.id };
      setTodos([...todos, newTodo]);

      // Analytics
      trackEvent('todo_added', { userId: user?.id });

      // API call
      const savedTodo = await api.createTodo(newTodo);

      // Replace temp with real
      setTodos(todos.map((t) => (t.id === tempId ? savedTodo : t)));
      setLastSync(new Date());
    } catch (err) {
      // Rollback
      setTodos(todos.filter((t) => t.id !== tempId));
      setError(err.message);

      // Retry logic
      if (err.code === 'NETWORK_ERROR') {
        queueForRetry(newTodo);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTodo = async (id) => {
    // Similar complexity...
  };

  const deleteTodo = async (id) => {
    // And more complexity...
  };

  // Component has become a 500+ line monster mixing:
  // - UI rendering
  // - Business logic
  // - API calls
  // - Error handling
  // - Analytics
  // - Performance optimizations
  // - State synchronization
}
```

### Stage 3: The Breaking Point

Your component now has multiple responsibilities:

- **Presentation**: Rendering UI elements
- **State Management**: Tracking multiple pieces of state
- **Business Logic**: Validation, calculations, transformations
- **Side Effects**: API calls, analytics, logging
- **Error Handling**: Retry logic, rollback mechanisms
- **Performance**: Memoization, debouncing, virtualization

This violates every principle of good software design. It's untestable, unreusable, and unmaintainable.

## How BlaC Solves the Root Problem

BlaC isn't just another state management library—it's an architectural pattern that enforces proper separation of concerns and clean code principles.

### 1. **Separation of Concerns Through Layered Architecture**

Inspired by the BLoC pattern, BlaC enforces a clear separation between layers:

```typescript
// Business Logic Layer - Pure, testable, reusable
class TodoCubit extends Cubit<TodoState> {
  constructor(
    private todoRepository: TodoRepository,
    private analytics: AnalyticsService,
    private errorReporter: ErrorReporter
  ) {
    super({
      todos: [],
      filter: 'all',
      isLoading: false,
      error: null
    });
  }

  addTodo = async (text: string) => {
    this.patch({ isLoading: true, error: null });

    try {
      const todo = await this.todoRepository.create({ text });
      this.patch({
        todos: [...this.state.todos, todo],
        isLoading: false
      });

      this.analytics.track('todo_added');
    } catch (error) {
      this.errorReporter.log(error);
      this.patch({
        error: error.message,
        isLoading: false
      });
    }
  };
}

// Presentation Layer - Simple, focused, declarative
function TodoList() {
  const [state, cubit] = useBloc(TodoCubit);

  return (
    <div>
      {state.isLoading && <Spinner />}
      {state.error && <ErrorMessage error={state.error} />}
      {state.todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
```

### 2. **Dependency Injection for Testability**

BlaC encourages dependency injection, making your business logic completely testable:

```typescript
// Easy to test with mock dependencies
describe('TodoCubit', () => {
  it('should add todo successfully', async () => {
    const mockRepo = {
      create: jest.fn().mockResolvedValue({ id: 1, text: 'Test' }),
    };
    const mockAnalytics = { track: jest.fn() };

    const cubit = new TodoCubit(mockRepo, mockAnalytics, mockErrorReporter);
    await cubit.addTodo('Test');

    expect(cubit.state.todos).toHaveLength(1);
    expect(mockAnalytics.track).toHaveBeenCalledWith('todo_added');
  });
});
```

### 3. **Event-Driven Architecture for Complex Flows**

For complex scenarios, BlaC's Bloc pattern provides event-driven state management:

```typescript
// Events represent user intentions
class UserAuthenticated {
  constructor(public readonly user: User) {}
}

class DataRefreshRequested {}

class NetworkStatusChanged {
  constructor(public readonly isOnline: boolean) {}
}

// Bloc orchestrates complex state transitions
class AppBloc extends Bloc<AppState, AppEvent> {
  constructor(dependencies: AppDependencies) {
    super(initialState);

    // Clear event flow
    this.on(UserAuthenticated, this.handleUserAuthenticated);
    this.on(DataRefreshRequested, this.handleDataRefresh);
    this.on(NetworkStatusChanged, this.handleNetworkChange);
  }

  private handleUserAuthenticated = async (
    event: UserAuthenticated,
    emit: (state: AppState) => void,
  ) => {
    // Complex orchestration logic
    emit({ ...this.state, user: event.user, isAuthenticated: true });

    // Trigger cascading events
    this.add(new DataRefreshRequested());
    this.add(new UserPreferencesLoaded());
    this.add(new NotificationServiceInitialized());
  };
}
```

### 4. **Instance Management That Mirrors Your Mental Model**

BlaC provides flexible instance management that matches how you think about state:

```typescript
// Global state - shared across the app
class AuthCubit extends Cubit<AuthState> {
  static keepAlive = true; // Persists even without consumers
}

// Feature state - shared within a feature
class ShoppingCartCubit extends Cubit<CartState> {
  // Default behavior - shared instance per class
}

// Component state - isolated per component
class FormCubit extends Cubit<FormState> {
  static isolated = true; // Each form gets its own instance
}

// Keyed state - multiple named instances
const [state, cubit] = useBloc(ChatCubit, {
  instanceId: `chat-${roomId}`, // Separate instance per chat room
});
```

## The Architectural Benefits

### 1. **Clear Mental Model**

With BlaC, you always know where to look:

- **Business Logic**: In Cubits/Blocs
- **UI Logic**: In Components
- **Data Access**: In Repositories
- **Side Effects**: In Services

### 2. **Predictable Data Flow**

State changes follow a unidirectional flow:

```
User Action → Cubit/Bloc Method → State Update → UI Re-render
```

This makes debugging straightforward—you can trace any state change back to its origin.

### 3. **Incremental Adoption**

You don't need to rewrite your entire app. Start with one feature:

```typescript
// Start small
class SettingsCubit extends Cubit<Settings> {
  toggleTheme = () => {
    this.patch({ darkMode: !this.state.darkMode });
  };
}

// Gradually expand
class AppCubit extends Cubit<AppState> {
  constructor() {
    super(computeInitialState());

    // Compose state from multiple sources
    this.subscribeToSubstates();
  }
}
```

### 4. **Performance by Default**

BlaC's proxy-based dependency tracking means components only re-render when the specific data they use changes:

```typescript
function UserAvatar() {
  const [state] = useBloc(UserCubit);
  // Only re-renders when state.user.avatarUrl changes
  return <img src={state.user.avatarUrl} />;
}

function UserStats() {
  const [state] = useBloc(UserCubit);
  // Only re-renders when state.stats changes
  return <div>{state.stats.postsCount} posts</div>;
}
```

## Real-World Patterns

### Repository Pattern for Data Access

```typescript
interface TodoRepository {
  getAll(): Promise<Todo[]>;
  create(data: CreateTodoDto): Promise<Todo>;
  update(id: string, data: UpdateTodoDto): Promise<Todo>;
  delete(id: string): Promise<void>;
}

class TodoCubit extends Cubit<TodoState> {
  constructor(private repository: TodoRepository) {
    super(initialState);
  }

  // Clean separation of concerns
  loadTodos = async () => {
    this.patch({ isLoading: true });
    try {
      const todos = await this.repository.getAll();
      this.patch({ todos, isLoading: false });
    } catch (error) {
      this.patch({ error: error.message, isLoading: false });
    }
  };
}
```

### Service Layer for Business Operations

```typescript
class CheckoutService {
  constructor(
    private payment: PaymentGateway,
    private inventory: InventoryService,
    private shipping: ShippingService,
  ) {}

  async processOrder(cart: Cart): Promise<Order> {
    // Complex business logic orchestration
    await this.inventory.reserve(cart.items);
    const payment = await this.payment.charge(cart.total);
    const shipping = await this.shipping.schedule(cart);

    return new Order({ cart, payment, shipping });
  }
}

class CheckoutCubit extends Cubit<CheckoutState> {
  constructor(private checkout: CheckoutService) {
    super(initialState);
  }

  processCheckout = async () => {
    this.emit({ status: 'processing' });

    try {
      const order = await this.checkout.processOrder(this.state.cart);
      this.emit({ status: 'completed', order });
    } catch (error) {
      this.emit({ status: 'failed', error: error.message });
    }
  };
}
```

## The Bottom Line

State management is hard because it touches every aspect of your application. It's not just about storing values—it's about:

- **Architecture**: How you structure your code
- **Testability**: How you verify behavior
- **Maintainability**: How you evolve your application
- **Performance**: How you scale to thousands of users
- **Developer Experience**: How quickly new team members can contribute

BlaC addresses all these concerns by providing:

1. **Clear architectural patterns** that separate business logic from UI
2. **Dependency injection** that makes testing trivial
3. **Event-driven architecture** for complex state flows
4. **Flexible instance management** that matches your mental model
5. **Automatic performance optimization** without manual work
6. **TypeScript-first design** with zero boilerplate

Most importantly, BlaC helps you write code that is easy to understand, easy to test, and easy to change. Because at the end of the day, the best state management solution is the one that gets out of your way and lets you focus on building great applications.

## Getting Started

Ready to bring structure to your state management? Start with:

1. [Cubits](/concepts/cubits) - Simple, direct state updates
2. [Blocs](/concepts/blocs) - Event-driven state management
3. [Instance Management](/concepts/instance-management) - Control state lifecycle
4. [Testing Patterns](/patterns/testing) - Write bulletproof tests

Remember: good architecture isn't about following rules—it's about making your code easier to understand, test, and change. BlaC gives you the tools; how you use them is up to you.
