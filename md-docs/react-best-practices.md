# React + BlaC: Best Practices & Patterns

A curated guide of production-tested patterns for using BlaC with React.

---

## Quick Reference: When to Use What

```typescript
// ✅ Local component state → Use isolated Cubit
class FormStateCubit extends Cubit<FormState> {
  static isolated = true;
  static disposalTimeout = 0;
}

// ✅ Feature-level state → Use shared Cubit
class ShoppingCartCubit extends Cubit<CartState> {
  // Shared by default
}

// ✅ Complex async flows → Use Bloc with events
class AuthBloc extends Bloc<AuthState, AuthEvent> {
  // Event-driven state machine
}

// ✅ Critical app state → Use keepAlive
class AppConfigCubit extends Cubit<Config> {
  static keepAlive = true; // Never auto-dispose
}
```

---

## Pattern 1: Form State Management

### Problem: Form state with validation

```typescript
interface FormState {
  values: {
    email: string;
    password: string;
  };
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

class LoginFormCubit extends Cubit<FormState> {
  static isolated = true; // Each form instance is independent
  static disposalTimeout = 0; // Clean up immediately

  constructor() {
    super({
      values: { email: '', password: '' },
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  }

  updateField = (field: keyof FormState['values'], value: string) => {
    this.emit({
      ...this.state,
      values: { ...this.state.values, [field]: value },
      touched: { ...this.state.touched, [field]: true },
    });

    // Validate on change
    this.validate();
  };

  private validate = () => {
    const errors: Record<string, string> = {};

    if (!this.state.values.email.includes('@')) {
      errors.email = 'Invalid email';
    }

    if (this.state.values.password.length < 8) {
      errors.password = 'Password too short';
    }

    this.emit({ ...this.state, errors });
  };

  submit = async () => {
    this.validate();

    if (Object.keys(this.state.errors).length > 0) {
      return;
    }

    this.emit({ ...this.state, isSubmitting: true });

    try {
      await api.login(this.state.values);
      // Success handled elsewhere
    } catch (error) {
      this.emit({
        ...this.state,
        isSubmitting: false,
        errors: { submit: 'Login failed' },
      });
    }
  };

  reset = () => {
    this.emit({
      values: { email: '', password: '' },
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  };
}

// Component
function LoginForm() {
  const [state, form] = useBloc(LoginFormCubit);

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.submit(); }}>
      <input
        type="email"
        value={state.values.email}
        onChange={(e) => form.updateField('email', e.target.value)}
      />
      {state.touched.email && state.errors.email && (
        <span>{state.errors.email}</span>
      )}

      <input
        type="password"
        value={state.values.password}
        onChange={(e) => form.updateField('password', e.target.value)}
      />
      {state.touched.password && state.errors.password && (
        <span>{state.errors.password}</span>
      )}

      <button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Logging in...' : 'Login'}
      </button>

      {state.errors.submit && <span>{state.errors.submit}</span>}
    </form>
  );
}
```

**Why this pattern:**

- Isolated: Each form is independent
- Immediate disposal: No lingering form state
- Validation co-located with state
- Type-safe field updates

---

## Pattern 2: Data Fetching with Cache

### Problem: Fetch data, cache it, handle loading/error states

```typescript
interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

class UserDataBloc extends Bloc<DataState<User>, UserEvent> {
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(private userId: string) {
    super({
      data: null,
      loading: false,
      error: null,
      lastFetched: null,
    });

    this._name = `UserDataBloc_${userId}`;

    this.on(LoadUserEvent, async (event, emit) => {
      // Check cache
      if (this.isCacheValid() && !event.forceRefresh) {
        return; // Use cached data
      }

      emit({ ...this.state, loading: true, error: null });

      try {
        const data = await api.fetchUser(this.userId);
        emit({
          data,
          loading: false,
          error: null,
          lastFetched: Date.now(),
        });
      } catch (error) {
        emit({
          ...this.state,
          loading: false,
          error: error.message,
        });
      }
    });

    this.on(RefreshUserEvent, async (event, emit) => {
      this.add(new LoadUserEvent({ forceRefresh: true }));
    });

    // Auto-load on creation
    this.add(new LoadUserEvent({ forceRefresh: false }));
  }

  private isCacheValid(): boolean {
    if (!this.state.lastFetched) return false;
    return Date.now() - this.state.lastFetched < this.cacheTimeout;
  }
}

// Events
class LoadUserEvent {
  constructor(public readonly options: { forceRefresh: boolean }) {}
}

class RefreshUserEvent {}

// Component with automatic refresh
function UserProfile({ userId }: Props) {
  const [state, bloc] = useBloc(UserDataBloc, {
    staticProps: userId,
    instanceId: userId, // One instance per user
    onMount: (bloc) => {
      // Refresh when component mounts
      if (bloc.state.lastFetched) {
        bloc.add(new LoadUserEvent({ forceRefresh: false }));
      }
    },
  });

  if (state.loading && !state.data) {
    return <Spinner />;
  }

  if (state.error) {
    return (
      <ErrorMessage>
        {state.error}
        <button onClick={() => bloc.add(new RefreshUserEvent())}>
          Retry
        </button>
      </ErrorMessage>
    );
  }

  return (
    <div>
      <UserCard user={state.data} />
      <button onClick={() => bloc.add(new RefreshUserEvent())}>
        Refresh
      </button>
    </div>
  );
}
```

**Why this pattern:**

- Cache prevents unnecessary API calls
- Instance per user ID (each user cached separately)
- Loading states handled gracefully
- Easy retry mechanism

---

## Pattern 3: Optimistic UI Updates

### Problem: Update UI immediately, rollback on error

```typescript
interface TodoState {
  todos: Todo[];
  optimisticUpdates: Map<string, Todo>; // Track pending updates
}

class TodoBloc extends Bloc<TodoState, TodoEvent> {
  constructor() {
    super({
      todos: [],
      optimisticUpdates: new Map(),
    });

    this.on(AddTodoEvent, async (event, emit) => {
      const tempId = `temp-${Date.now()}`;
      const optimisticTodo: Todo = {
        id: tempId,
        text: event.text,
        completed: false,
      };

      // Optimistic update
      emit({
        todos: [...this.state.todos, optimisticTodo],
        optimisticUpdates: new Map(this.state.optimisticUpdates).set(
          tempId,
          optimisticTodo
        ),
      });

      try {
        const savedTodo = await api.addTodo(event.text);

        // Replace temp with real
        emit({
          todos: this.state.todos.map(todo =>
            todo.id === tempId ? savedTodo : todo
          ),
          optimisticUpdates: (() => {
            const map = new Map(this.state.optimisticUpdates);
            map.delete(tempId);
            return map;
          })(),
        });
      } catch (error) {
        // Rollback optimistic update
        emit({
          todos: this.state.todos.filter(todo => todo.id !== tempId),
          optimisticUpdates: (() => {
            const map = new Map(this.state.optimisticUpdates);
            map.delete(tempId);
            return map;
          })(),
        });

        // Show error
        this.add(new ShowErrorEvent(error.message));
      }
    });

    this.on(ToggleTodoEvent, async (event, emit) => {
      const todo = this.state.todos.find(t => t.id === event.id);
      if (!todo) return;

      // Optimistic update
      emit({
        ...this.state,
        todos: this.state.todos.map(t =>
          t.id === event.id ? { ...t, completed: !t.completed } : t
        ),
      });

      try {
        await api.toggleTodo(event.id);
        // Success - optimistic update was correct
      } catch (error) {
        // Rollback
        emit({
          ...this.state,
          todos: this.state.todos.map(t =>
            t.id === event.id ? todo : t // Restore original
          ),
        });
      }
    });
  }
}

// Component
function TodoList() {
  const [state, bloc] = useBloc(TodoBloc);

  return (
    <div>
      {state.todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={() => bloc.add(new ToggleTodoEvent(todo.id))}
          isPending={state.optimisticUpdates.has(todo.id)}
        />
      ))}
    </div>
  );
}

function TodoItem({ todo, onToggle, isPending }: Props) {
  return (
    <div style={{ opacity: isPending ? 0.5 : 1 }}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
      />
      <span>{todo.text}</span>
      {isPending && <Spinner size="small" />}
    </div>
  );
}
```

**Why this pattern:**

- Instant feedback (no waiting for API)
- Graceful rollback on error
- Visual indication of pending updates
- Prevents race conditions with temp IDs

---

## Pattern 4: Global State with Persistence

### Problem: Persist state to localStorage, sync across tabs

```typescript
import { BlocPlugin } from '@blac/core';

// Persistence plugin (reusable)
class LocalStoragePlugin<S> implements BlocPlugin<S, any> {
  name = 'LocalStoragePlugin';

  constructor(
    private storageKey: string,
    private serialize: (state: S) => string = JSON.stringify,
    private deserialize: (str: string) => S = JSON.parse,
  ) {}

  onAttach(bloc: BlocBase<S>): void {
    // Load from localStorage on attach
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const state = this.deserialize(stored);
        bloc.emit(state);
      } catch (error) {
        console.error('Failed to load state from localStorage:', error);
      }
    }
  }

  onStateChange(bloc: BlocBase<S>, oldState: S, newState: S): void {
    // Save to localStorage on every state change
    try {
      const serialized = this.serialize(newState);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }
}

// Settings cubit with persistence
interface SettingsState {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: boolean;
}

class SettingsCubit extends Cubit<SettingsState> {
  static keepAlive = true; // Never dispose
  static plugins = [
    new LocalStoragePlugin<SettingsState>('app-settings'),
  ];

  constructor() {
    super({
      theme: 'light',
      fontSize: 16,
      notifications: true,
    });

    // Listen for changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'app-settings' && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          this.emit(newState);
        } catch (error) {
          console.error('Failed to sync settings from other tab:', error);
        }
      }
    });
  }

  setTheme = (theme: SettingsState['theme']) => {
    this.emit({ ...this.state, theme });
  };

  setFontSize = (fontSize: number) => {
    this.emit({ ...this.state, fontSize });
  };

  toggleNotifications = () => {
    this.emit({
      ...this.state,
      notifications: !this.state.notifications,
    });
  };
}

// Use anywhere in the app
function SettingsPanel() {
  const [settings, settingsCubit] = useBloc(SettingsCubit);

  return (
    <div>
      <select
        value={settings.theme}
        onChange={(e) => settingsCubit.setTheme(e.target.value as any)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>

      <input
        type="range"
        min={12}
        max={24}
        value={settings.fontSize}
        onChange={(e) => settingsCubit.setFontSize(Number(e.target.value))}
      />

      <label>
        <input
          type="checkbox"
          checked={settings.notifications}
          onChange={settingsCubit.toggleNotifications}
        />
        Enable notifications
      </label>
    </div>
  );
}
```

**Why this pattern:**

- State persists across sessions
- Syncs across browser tabs
- Reusable plugin pattern
- Type-safe state management

---

## Pattern 5: Computed Derived State

### Problem: Expensive calculations based on state

```typescript
interface ProductState {
  products: Product[];
  filters: {
    category: string | null;
    minPrice: number;
    maxPrice: number;
    searchQuery: string;
  };
  sortBy: 'price' | 'name' | 'rating';
}

class ProductCatalogBloc extends Bloc<ProductState, ProductEvent> {
  constructor() {
    super({
      products: [],
      filters: {
        category: null,
        minPrice: 0,
        maxPrice: Infinity,
        searchQuery: '',
      },
      sortBy: 'name',
    });
  }

  // Computed getter - automatically tracked by proxy
  get filteredProducts(): Product[] {
    return this.state.products
      .filter(p => {
        // Category filter
        if (this.state.filters.category && p.category !== this.state.filters.category) {
          return false;
        }

        // Price filter
        if (p.price < this.state.filters.minPrice || p.price > this.state.filters.maxPrice) {
          return false;
        }

        // Search filter
        if (this.state.filters.searchQuery) {
          const query = this.state.filters.searchQuery.toLowerCase();
          return p.name.toLowerCase().includes(query) ||
                 p.description.toLowerCase().includes(query);
        }

        return true;
      });
  }

  get sortedProducts(): Product[] {
    return [...this.filteredProducts].sort((a, b) => {
      switch (this.state.sortBy) {
        case 'price':
          return a.price - b.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
      }
    });
  }

  get priceRange(): { min: number; max: number } {
    if (this.filteredProducts.length === 0) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.min(...this.filteredProducts.map(p => p.price)),
      max: Math.max(...this.filteredProducts.map(p => p.price)),
    };
  }

  setFilter = (filterKey: keyof ProductState['filters'], value: any) => {
    this.emit({
      ...this.state,
      filters: { ...this.state.filters, [filterKey]: value },
    });
  };

  setSortBy = (sortBy: ProductState['sortBy']) => {
    this.emit({ ...this.state, sortBy });
  };
}

// Component only re-renders when displayed products change
function ProductList() {
  const [state, bloc] = useBloc(ProductCatalogBloc);

  // Proxy tracking means this only re-renders when sortedProducts changes
  const products = bloc.sortedProducts;

  return (
    <div>
      <FilterPanel bloc={bloc} />
      <div>
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

// This component doesn't re-render when products change, only when filters change
function FilterPanel({ bloc }: { bloc: ProductCatalogBloc }) {
  const [state] = useBloc(ProductCatalogBloc, {
    dependencies: (b) => [b.state.filters, b.state.sortBy], // Manual dependencies
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search..."
        value={state.filters.searchQuery}
        onChange={(e) => bloc.setFilter('searchQuery', e.target.value)}
      />

      <select onChange={(e) => bloc.setSortBy(e.target.value as any)}>
        <option value="name">Sort by Name</option>
        <option value="price">Sort by Price</option>
        <option value="rating">Sort by Rating</option>
      </select>
    </div>
  );
}
```

**Why this pattern:**

- Expensive calculations cached until dependencies change
- Automatic proxy tracking for getters
- Clean separation of concerns
- Type-safe computed properties

---

## Pattern 6: Multi-Step Wizard State

### Problem: Complex multi-step form with validation

```typescript
interface WizardState {
  currentStep: number;
  steps: {
    personal: PersonalInfo;
    address: AddressInfo;
    payment: PaymentInfo;
  };
  completedSteps: Set<number>;
  canProceed: boolean;
}

class CheckoutWizardBloc extends Bloc<WizardState, WizardEvent> {
  constructor() {
    super({
      currentStep: 0,
      steps: {
        personal: { firstName: '', lastName: '', email: '' },
        address: { street: '', city: '', zipCode: '' },
        payment: { cardNumber: '', cvv: '', expiry: '' },
      },
      completedSteps: new Set(),
      canProceed: false,
    });

    this.on(UpdateStepEvent, (event, emit) => {
      emit({
        ...this.state,
        steps: {
          ...this.state.steps,
          [event.stepKey]: { ...this.state.steps[event.stepKey], ...event.data },
        },
      });

      // Validate current step
      this.validateCurrentStep();
    });

    this.on(NextStepEvent, (event, emit) => {
      if (!this.state.canProceed) return;

      const completedSteps = new Set(this.state.completedSteps);
      completedSteps.add(this.state.currentStep);

      emit({
        ...this.state,
        currentStep: this.state.currentStep + 1,
        completedSteps,
        canProceed: false, // Reset for next step
      });

      this.validateCurrentStep();
    });

    this.on(PreviousStepEvent, (event, emit) => {
      emit({
        ...this.state,
        currentStep: Math.max(0, this.state.currentStep - 1),
      });

      this.validateCurrentStep();
    });

    this.on(SubmitWizardEvent, async (event, emit) => {
      if (this.state.currentStep !== 2 || !this.state.canProceed) return;

      try {
        await api.submitOrder(this.state.steps);
        // Success - navigate away
      } catch (error) {
        // Handle error
      }
    });
  }

  private validateCurrentStep() {
    const { currentStep, steps } = this.state;

    let isValid = false;

    switch (currentStep) {
      case 0: // Personal info
        isValid = !!(
          steps.personal.firstName &&
          steps.personal.lastName &&
          steps.personal.email.includes('@')
        );
        break;

      case 1: // Address
        isValid = !!(
          steps.address.street &&
          steps.address.city &&
          steps.address.zipCode.match(/^\d{5}$/)
        );
        break;

      case 2: // Payment
        isValid = !!(
          steps.payment.cardNumber.match(/^\d{16}$/) &&
          steps.payment.cvv.match(/^\d{3}$/) &&
          steps.payment.expiry.match(/^\d{2}\/\d{2}$/)
        );
        break;
    }

    this.emit({ ...this.state, canProceed: isValid });
  }

  get progress(): number {
    return (this.state.completedSteps.size / 3) * 100;
  }
}

// Component
function CheckoutWizard() {
  const [state, bloc] = useBloc(CheckoutWizardBloc, {
    onUnmount: (bloc) => {
      // Save to localStorage on unmount
      localStorage.setItem('checkout-draft', JSON.stringify(bloc.state));
    },
  });

  return (
    <div>
      <ProgressBar progress={bloc.progress} />

      {state.currentStep === 0 && <PersonalInfoStep bloc={bloc} />}
      {state.currentStep === 1 && <AddressStep bloc={bloc} />}
      {state.currentStep === 2 && <PaymentStep bloc={bloc} />}

      <div>
        {state.currentStep > 0 && (
          <button onClick={() => bloc.add(new PreviousStepEvent())}>
            Back
          </button>
        )}

        {state.currentStep < 2 && (
          <button
            disabled={!state.canProceed}
            onClick={() => bloc.add(new NextStepEvent())}
          >
            Next
          </button>
        )}

        {state.currentStep === 2 && (
          <button
            disabled={!state.canProceed}
            onClick={() => bloc.add(new SubmitWizardEvent())}
          >
            Submit Order
          </button>
        )}
      </div>
    </div>
  );
}
```

**Why this pattern:**

- Complex state machine managed centrally
- Validation per step
- Progress tracking
- Draft saving on unmount

---

## Performance Optimization Tips

### 1. Selective Re-rendering with Dependencies

```typescript
// Component only cares about user's name
function UserName() {
  const [state] = useBloc(UserBloc, {
    dependencies: (bloc) => [bloc.state.name], // Only re-render on name change
  });

  return <div>{state.name}</div>;
}

// Component only cares about loading state
function LoadingIndicator() {
  const [state] = useBloc(UserBloc, {
    dependencies: (bloc) => [bloc.state.loading],
  });

  return state.loading ? <Spinner /> : null;
}
```

### 2. Disable Proxy for Large Objects

```typescript
// For very large state objects, manual dependencies can be faster
Blac.setConfig({ proxyDependencyTracking: false });

const [state] = useBloc(LargeDataBloc, {
  dependencies: (bloc) => [bloc.state.criticalField],
});
```

### 3. Batch Updates

```typescript
class TodoBloc extends Bloc<TodoState, TodoEvent> {
  bulkAddTodos = (todos: Todo[]) => {
    // Single state update instead of multiple
    this.emit({
      ...this.state,
      todos: [...this.state.todos, ...todos],
    });
  };
}
```

### 4. Memoize Expensive Getters

```typescript
class DataBloc extends Bloc<DataState, DataEvent> {
  private cachedComputed: ComputedValue | null = null;
  private lastStateHash: string | null = null;

  get expensiveComputation(): ComputedValue {
    const currentHash = JSON.stringify(this.state.relevantData);

    if (this.lastStateHash !== currentHash) {
      this.cachedComputed = this.computeExpensiveValue();
      this.lastStateHash = currentHash;
    }

    return this.cachedComputed!;
  }

  private computeExpensiveValue(): ComputedValue {
    // Expensive calculation here
  }
}
```

---

## Testing Patterns

### Unit Testing Blocs

```typescript
describe('TodoBloc', () => {
  let bloc: TodoBloc;

  beforeEach(() => {
    bloc = new TodoBloc();
  });

  afterEach(() => {
    bloc.dispose();
  });

  it('should add todo', async () => {
    const states: TodoState[] = [];
    bloc.subscribe((state) => states.push(state));

    bloc.add(new AddTodoEvent('Test todo'));

    await waitFor(() => states.length > 0);

    expect(states[0].todos).toHaveLength(1);
    expect(states[0].todos[0].text).toBe('Test todo');
  });

  it('should handle error gracefully', async () => {
    vi.spyOn(api, 'addTodo').mockRejectedValue(new Error('API error'));

    bloc.add(new AddTodoEvent('Test todo'));

    await waitFor(() => bloc.state.error !== null);

    expect(bloc.state.error).toBe('API error');
    expect(bloc.state.todos).toHaveLength(0); // Rolled back
  });
});
```

### Integration Testing with React

```typescript
describe('TodoList Component', () => {
  beforeEach(() => {
    Blac.resetInstance(); // Clean state
  });

  it('should add todo when button clicked', async () => {
    const { getByText, getByPlaceholderText } = render(<TodoList />);

    const input = getByPlaceholderText('Add todo...');
    const button = getByText('Add');

    await userEvent.type(input, 'Test todo');
    await userEvent.click(button);

    await waitFor(() => {
      expect(getByText('Test todo')).toBeInTheDocument();
    });
  });
});
```

### Mocking Blocs in Tests

```typescript
// Create mock bloc
class MockTodoBloc extends TodoBloc {
  constructor() {
    super();
    this.emit({
      todos: [{ id: '1', text: 'Mock todo', completed: false }],
    });
  }

  add = vi.fn(); // Mock event dispatch
}

// Inject mock
beforeEach(() => {
  const mockBloc = new MockTodoBloc();
  Blac.getInstance().registerBlocInstance(mockBloc);
});
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting Arrow Functions

```typescript
// ❌ WRONG
class MyCubit extends Cubit<number> {
  increment() {
    this.emit(this.state + 1); // Error: 'this' is undefined
  }
}

// ✅ CORRECT
class MyCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };
}
```

### Pitfall 2: Mutating State

```typescript
// ❌ WRONG
class TodoBloc extends Bloc<TodoState, TodoEvent> {
  addTodo = (text: string) => {
    this.state.todos.push({ text }); // Mutates state!
    this.emit(this.state); // React won't detect change
  };
}

// ✅ CORRECT
class TodoBloc extends Bloc<TodoState, TodoEvent> {
  addTodo = (text: string) => {
    this.emit({
      ...this.state,
      todos: [...this.state.todos, { text }], // New array
    });
  };
}
```

### Pitfall 3: Expecting Component-Local State

```typescript
// ❌ WRONG EXPECTATION
function ComponentA() {
  const [state, bloc] = useBloc(CounterCubit);
  bloc.increment(); // count = 1
}

function ComponentB() {
  const [state] = useBloc(CounterCubit);
  // Expect count = 0, but actually = 1 (same instance!)
}

// ✅ SOLUTION: Use isolated
class CounterCubit extends Cubit<number> {
  static isolated = true; // Each component gets own instance
}
```

### Pitfall 4: Memory Leaks with External Subscriptions

```typescript
// ❌ WRONG - Subscription never cleaned up
class MyBloc extends Bloc<MyState, MyEvent> {
  constructor() {
    super(initialState);

    // External subscription
    socket.on('message', this.handleMessage);
  }

  handleMessage = (msg: string) => {
    this.emit({ ...this.state, message: msg });
  };
}

// ✅ CORRECT - Clean up in onDispose
class MyBloc extends Bloc<MyState, MyEvent> {
  constructor() {
    super(initialState);
    socket.on('message', this.handleMessage);
  }

  handleMessage = (msg: string) => {
    this.emit({ ...this.state, message: msg });
  };

  onDispose = () => {
    socket.off('message', this.handleMessage); // Clean up!
  };
}
```

---

## Migration Checklist

When migrating from useState to useBloc:

- [ ] Change method syntax to arrow functions
- [ ] Decide: shared or isolated instance?
- [ ] Set disposal timeout (0 for immediate, 100+ for persistence)
- [ ] Move business logic from components to bloc
- [ ] Add type definitions for state and events
- [ ] Implement error handling
- [ ] Add loading states where needed
- [ ] Write unit tests for bloc logic
- [ ] Update component tests
- [ ] Consider proxy tracking vs manual dependencies
- [ ] Set up persistence if needed
- [ ] Document state shape and available methods

---

## Summary

**Core Principles:**

1. Arrow functions for all bloc methods
2. Immutable state updates
3. Choose shared vs isolated based on use case
4. Use events for complex flows
5. Leverage computed properties for derived state
6. Test blocs independently from UI

**When to Use:**

- ✅ Complex business logic
- ✅ Cross-component state
- ✅ Async operations
- ✅ State machines
- ✅ Persistence needs

**When Not to Use:**

- ❌ Simple component-local state (use useState)
- ❌ Rarely-changing state (use Context)
- ❌ Server state (use React Query / SWR)

---

**Last Updated:** 2025-10-07  
**BlaC Version:** `@blac/react@2.0.0-rc.1`
