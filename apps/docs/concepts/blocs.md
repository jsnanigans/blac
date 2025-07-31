# Blocs

Blocs provide event-driven state management for complex scenarios. While Cubits offer direct state updates, Blocs use events and handlers for more structured, traceable state transitions.

## What is a Bloc?

A Bloc (Business Logic Component) is a state container that:

- Processes events through registered handlers
- Maintains a clear separation between events and logic
- Provides better debugging through event history
- Scales well for complex state management

## Bloc vs Cubit

### When to use Cubit:

- Simple state with straightforward updates
- Direct method calls are sufficient
- Quick prototyping
- Small, focused features

### When to use Bloc:

- Complex business logic with many state transitions
- Need for event history and debugging
- Multiple triggers for the same state change
- Team collaboration benefits from explicit events

## Creating a Bloc

### Basic Structure

```typescript
import { Bloc } from '@blac/core';

// 1. Define your events as classes
class CounterIncremented {
  constructor(public readonly amount: number = 1) {}
}

class CounterDecremented {
  constructor(public readonly amount: number = 1) {}
}

class CounterReset {}

// 2. Create a union type of all events (optional but helpful)
type CounterEvent = CounterIncremented | CounterDecremented | CounterReset;

// 3. Create your Bloc
class CounterBloc extends Bloc<number, CounterEvent> {
  constructor() {
    super(0); // Initial state

    // Register event handlers
    this.on(CounterIncremented, this.handleIncrement);
    this.on(CounterDecremented, this.handleDecrement);
    this.on(CounterReset, this.handleReset);
  }

  // Event handlers
  private handleIncrement = (
    event: CounterIncremented,
    emit: (state: number) => void,
  ) => {
    emit(this.state + event.amount);
  };

  private handleDecrement = (
    event: CounterDecremented,
    emit: (state: number) => void,
  ) => {
    emit(this.state - event.amount);
  };

  private handleReset = (
    _event: CounterReset,
    emit: (state: number) => void,
  ) => {
    emit(0);
  };

  // Public methods for convenience
  increment = (amount = 1) => this.add(new CounterIncremented(amount));
  decrement = (amount = 1) => this.add(new CounterDecremented(amount));
  reset = () => this.add(new CounterReset());
}
```

## Event Design

### Event Classes

Events should be:

- **Immutable**: Use `readonly` properties
- **Descriptive**: Name indicates what happened
- **Data-carrying**: Include all necessary information

```typescript
// ✅ Good event design
class UserLoggedIn {
  constructor(
    public readonly userId: string,
    public readonly timestamp: Date,
    public readonly sessionId: string,
  ) {}
}

class ProductAddedToCart {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly price: number,
  ) {}
}

// ❌ Poor event design
class UpdateUser {
  constructor(public data: any) {} // Too generic
}

class Event {
  type: string; // Stringly typed
  payload: unknown; // No type safety
}
```

### Event Naming

Use past tense to indicate something that happened:

```typescript
// ✅ Good naming
class OrderPlaced {}
class PaymentProcessed {}
class UserRegistered {}

// ❌ Poor naming
class PlaceOrder {} // Sounds like a command
class ProcessPayment {} // Not clear if it happened
class RegisterUser {} // Ambiguous
```

## Complex Example: Shopping Cart

Let's build a full-featured shopping cart to showcase Bloc patterns:

```typescript
// Events
class ItemAddedToCart {
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly price: number,
    public readonly quantity: number = 1,
  ) {}
}

class ItemRemovedFromCart {
  constructor(public readonly productId: string) {}
}

class QuantityUpdated {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
  ) {}
}

class CartCleared {}

class DiscountApplied {
  constructor(
    public readonly code: string,
    public readonly percentage: number,
  ) {}
}

class DiscountRemoved {}

class CheckoutStarted {}

class CheckoutCompleted {
  constructor(public readonly orderId: string) {}
}

// State
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  discount: {
    code: string;
    percentage: number;
  } | null;
  status: 'shopping' | 'checking-out' | 'completed';
  orderId?: string;
}

// Bloc
class CartBloc extends Bloc<CartState, CartEvent> {
  constructor(private api: CartAPI) {
    super({
      items: [],
      discount: null,
      status: 'shopping',
    });

    // Register handlers
    this.on(ItemAddedToCart, this.handleItemAdded);
    this.on(ItemRemovedFromCart, this.handleItemRemoved);
    this.on(QuantityUpdated, this.handleQuantityUpdated);
    this.on(CartCleared, this.handleCartCleared);
    this.on(DiscountApplied, this.handleDiscountApplied);
    this.on(DiscountRemoved, this.handleDiscountRemoved);
    this.on(CheckoutStarted, this.handleCheckoutStarted);
    this.on(CheckoutCompleted, this.handleCheckoutCompleted);
  }

  // Handlers
  private handleItemAdded = (
    event: ItemAddedToCart,
    emit: (state: CartState) => void,
  ) => {
    const existingItem = this.state.items.find(
      (item) => item.productId === event.productId,
    );

    if (existingItem) {
      // Update quantity if item exists
      emit({
        ...this.state,
        items: this.state.items.map((item) =>
          item.productId === event.productId
            ? { ...item, quantity: item.quantity + event.quantity }
            : item,
        ),
      });
    } else {
      // Add new item
      emit({
        ...this.state,
        items: [
          ...this.state.items,
          {
            productId: event.productId,
            name: event.name,
            price: event.price,
            quantity: event.quantity,
          },
        ],
      });
    }

    // Save to backend
    this.api.saveCart(this.state.items);
  };

  private handleItemRemoved = (
    event: ItemRemovedFromCart,
    emit: (state: CartState) => void,
  ) => {
    emit({
      ...this.state,
      items: this.state.items.filter(
        (item) => item.productId !== event.productId,
      ),
    });
  };

  private handleQuantityUpdated = (
    event: QuantityUpdated,
    emit: (state: CartState) => void,
  ) => {
    if (event.quantity <= 0) {
      // Remove item if quantity is 0 or less
      this.add(new ItemRemovedFromCart(event.productId));
      return;
    }

    emit({
      ...this.state,
      items: this.state.items.map((item) =>
        item.productId === event.productId
          ? { ...item, quantity: event.quantity }
          : item,
      ),
    });
  };

  private handleDiscountApplied = async (
    event: DiscountApplied,
    emit: (state: CartState) => void,
  ) => {
    try {
      // Validate discount code
      const isValid = await this.api.validateDiscount(event.code);

      if (isValid) {
        emit({
          ...this.state,
          discount: {
            code: event.code,
            percentage: event.percentage,
          },
        });
      }
    } catch (error) {
      // Handle invalid discount
      console.error('Invalid discount code:', error);
    }
  };

  private handleCheckoutStarted = async (
    _event: CheckoutStarted,
    emit: (state: CartState) => void,
  ) => {
    emit({
      ...this.state,
      status: 'checking-out',
    });

    try {
      const orderId = await this.api.createOrder(this.state);
      this.add(new CheckoutCompleted(orderId));
    } catch (error) {
      // Revert to shopping status on error
      emit({
        ...this.state,
        status: 'shopping',
      });
      throw error;
    }
  };

  private handleCheckoutCompleted = (
    event: CheckoutCompleted,
    emit: (state: CartState) => void,
  ) => {
    emit({
      items: [],
      discount: null,
      status: 'completed',
      orderId: event.orderId,
    });
  };

  // Computed values
  get subtotal() {
    return this.state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }

  get discountAmount() {
    if (!this.state.discount) return 0;
    return this.subtotal * (this.state.discount.percentage / 100);
  }

  get total() {
    return this.subtotal - this.discountAmount;
  }

  get itemCount() {
    return this.state.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Public methods
  addItem = (product: Product, quantity = 1) => {
    this.add(
      new ItemAddedToCart(product.id, product.name, product.price, quantity),
    );
  };

  removeItem = (productId: string) => {
    this.add(new ItemRemovedFromCart(productId));
  };

  updateQuantity = (productId: string, quantity: number) => {
    this.add(new QuantityUpdated(productId, quantity));
  };

  applyDiscount = (code: string, percentage: number) => {
    this.add(new DiscountApplied(code, percentage));
  };

  checkout = () => {
    if (this.state.items.length === 0) {
      throw new Error('Cannot checkout with empty cart');
    }
    this.add(new CheckoutStarted());
  };
}
```

## Advanced Patterns

### Event Transformation

Transform one event into another:

```typescript
class DataBloc extends Bloc<DataState, DataEvent> {
  constructor() {
    super(initialState);

    this.on(RefreshRequested, this.handleRefresh);
    this.on(DataFetched, this.handleDataFetched);
  }

  private handleRefresh = (
    event: RefreshRequested,
    emit: (state: DataState) => void,
  ) => {
    // Transform refresh into fetch
    this.add(new DataFetched(event.force));
  };
}
```

### Debouncing Events

Prevent rapid event firing:

```typescript
class SearchBloc extends Bloc<SearchState, SearchEvent> {
  private searchDebounce?: NodeJS.Timeout;

  constructor() {
    super({ query: '', results: [], isSearching: false });

    this.on(SearchQueryChanged, this.handleQueryChanged);
    this.on(SearchExecuted, this.handleSearchExecuted);
  }

  private handleQueryChanged = (
    event: SearchQueryChanged,
    emit: (state: SearchState) => void,
  ) => {
    emit({ ...this.state, query: event.query });

    // Debounce search execution
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    this.searchDebounce = setTimeout(() => {
      this.add(new SearchExecuted(event.query));
    }, 300);
  };
}
```

### Event Logging

Track all events for debugging:

```typescript
class LoggingBloc<S, E> extends Bloc<S, E> {
  constructor(initialState: S) {
    super(initialState);

    // Log all events
    this.on('Action', (event) => {
      console.log(`[${this.constructor.name}]`, {
        event: event.constructor.name,
        data: event,
        timestamp: new Date().toISOString(),
      });
    });
  }
}
```

### Async Event Sequences

Handle complex async flows:

```typescript
class FileUploadBloc extends Bloc<FileUploadState, FileUploadEvent> {
  constructor() {
    super({ files: [], uploading: false, progress: 0 });

    this.on(FilesSelected, this.handleFilesSelected);
    this.on(UploadStarted, this.handleUploadStarted);
    this.on(UploadProgress, this.handleUploadProgress);
    this.on(UploadCompleted, this.handleUploadCompleted);
    this.on(UploadFailed, this.handleUploadFailed);
  }

  private handleFilesSelected = async (
    event: FilesSelected,
    emit: (state: FileUploadState) => void,
  ) => {
    emit({ ...this.state, files: event.files });

    // Start upload automatically
    this.add(new UploadStarted());
  };

  private handleUploadStarted = async (
    event: UploadStarted,
    emit: (state: FileUploadState) => void,
  ) => {
    emit({ ...this.state, uploading: true, progress: 0 });

    try {
      for (let i = 0; i < this.state.files.length; i++) {
        const file = this.state.files[i];

        // Upload with progress
        await this.uploadFile(file, (progress) => {
          this.add(new UploadProgress(progress));
        });
      }

      this.add(new UploadCompleted());
    } catch (error) {
      this.add(new UploadFailed(error.message));
    }
  };
}
```

## Testing Blocs

Blocs are highly testable due to their event-driven nature:

```typescript
describe('CartBloc', () => {
  let bloc: CartBloc;
  let mockApi: jest.Mocked<CartAPI>;

  beforeEach(() => {
    mockApi = createMockCartAPI();
    bloc = new CartBloc(mockApi);
  });

  describe('adding items', () => {
    it('should add new item to empty cart', async () => {
      // Arrange
      const product = {
        id: '123',
        name: 'Test Product',
        price: 29.99,
      };

      // Act
      bloc.add(new ItemAddedToCart(product.id, product.name, product.price, 1));

      // Assert
      expect(bloc.state.items).toHaveLength(1);
      expect(bloc.state.items[0]).toEqual({
        productId: '123',
        name: 'Test Product',
        price: 29.99,
        quantity: 1,
      });
    });

    it('should increase quantity for existing item', async () => {
      // Arrange - add item first
      bloc.add(new ItemAddedToCart('123', 'Test', 10, 1));

      // Act - add same item again
      bloc.add(new ItemAddedToCart('123', 'Test', 10, 2));

      // Assert
      expect(bloc.state.items).toHaveLength(1);
      expect(bloc.state.items[0].quantity).toBe(3);
    });
  });

  describe('checkout flow', () => {
    it('should complete checkout successfully', async () => {
      // Arrange
      bloc.add(new ItemAddedToCart('123', 'Test', 10, 1));
      mockApi.createOrder.mockResolvedValue('order-123');

      // Act
      bloc.add(new CheckoutStarted());

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(bloc.state.status).toBe('completed');
      expect(bloc.state.orderId).toBe('order-123');
      expect(bloc.state.items).toHaveLength(0);
    });
  });
});
```

## Best Practices

### 1. Keep Events Simple

Events should only carry data, not logic:

```typescript
// ✅ Good
class TodoAdded {
  constructor(public readonly text: string) {}
}

// ❌ Bad
class TodoAdded {
  constructor(public readonly text: string) {
    if (!text) throw new Error('Text required'); // Logic in event
  }
}
```

### 2. Handler Purity

Handlers should be pure functions (except for emit):

```typescript
// ✅ Good
private handleIncrement = (event: Increment, emit: (state: State) => void) => {
  emit({ count: this.state.count + event.amount });
};

// ❌ Bad
private handleIncrement = (event: Increment, emit: (state: State) => void) => {
  localStorage.setItem('count', this.state.count); // Side effect!
  window.alert('Incremented!'); // Side effect!
  emit({ count: this.state.count + event.amount });
};
```

### 3. Event Granularity

Create specific events rather than generic ones:

```typescript
// ✅ Good
class UserEmailUpdated {
  constructor(public readonly email: string) {}
}

class UserPasswordChanged {
  constructor(public readonly hashedPassword: string) {}
}

// ❌ Bad
class UserUpdated {
  constructor(public readonly updates: Partial<User>) {}
}
```

### 4. Error Handling

Handle errors gracefully within handlers:

```typescript
private handleLogin = async (event: LoginRequested, emit: (state: AuthState) => void) => {
  emit({ ...this.state, isLoading: true, error: null });

  try {
    const user = await this.api.login(event.credentials);
    emit({ user, isLoading: false, error: null });
  } catch (error) {
    emit({
      user: null,
      isLoading: false,
      error: error.message
    });
  }
};
```

## Summary

Blocs provide powerful event-driven state management:

- **Structured**: Clear separation of events and handlers
- **Traceable**: Every state change has an associated event
- **Testable**: Easy to test with event-based assertions
- **Scalable**: Handles complex business logic elegantly

Choose Blocs when you need structure, traceability, and scalability. For simpler cases, [Cubits](/concepts/cubits) might be more appropriate.
