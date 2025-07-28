# Cubits

Cubits are the simplest form of state containers in BlaC. They provide a straightforward way to manage state with direct method calls, making them perfect for most use cases.

## What is a Cubit?

A Cubit (Cube + Bit) is a class that:
- Extends `Cubit<T>` from `@blac/core`
- Holds a single piece of state of type `T`
- Provides methods to update that state
- Notifies listeners when state changes

Think of a Cubit as a "smart" variable that knows how to update itself and tell others when it changes.

## Creating a Cubit

### Basic Cubit

```typescript
import { Cubit } from '@blac/core';

// State can be a primitive
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state
  }
  
  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
}

// Or an object
interface UserState {
  name: string;
  email: string;
  preferences: UserPreferences;
}

class UserCubit extends Cubit<UserState> {
  constructor(initialUser: UserState) {
    super(initialUser);
  }
  
  updateName = (name: string) => {
    this.patch({ name });
  };
  
  updateEmail = (email: string) => {
    this.patch({ email });
  };
}
```

### Key Rules

1. **Always use arrow functions** for methods that access `this`:
```typescript
// ✅ Correct
increment = () => this.emit(this.state + 1);

// ❌ Wrong - loses 'this' context when called from React
increment() {
  this.emit(this.state + 1);
}
```

2. **Call `super()` with initial state**:
```typescript
constructor() {
  super(initialState); // Required!
}
```

## State Updates

Cubits provide two methods for updating state:

### emit()

Replaces the entire state with a new value:

```typescript
class ThemeCubit extends Cubit<'light' | 'dark'> {
  constructor() {
    super('light');
  }
  
  toggleTheme = () => {
    this.emit(this.state === 'light' ? 'dark' : 'light');
  };
  
  setTheme = (theme: 'light' | 'dark') => {
    this.emit(theme);
  };
}
```

### patch()

Updates specific properties of an object state (partial update):

```typescript
interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
}

class FormCubit extends Cubit<FormState> {
  constructor() {
    super({
      name: '',
      email: '',
      phone: '',
      address: ''
    });
  }
  
  // Update single field
  updateField = (field: keyof FormState, value: string) => {
    this.patch({ [field]: value });
  };
  
  // Update multiple fields
  updateContact = (email: string, phone: string) => {
    this.patch({ email, phone });
  };
  
  // Reset form
  reset = () => {
    this.emit({
      name: '',
      email: '',
      phone: '',
      address: ''
    });
  };
}
```

## Advanced Patterns

### Async Operations

Handle asynchronous operations with proper state management:

```typescript
interface DataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

class DataCubit<T> extends Cubit<DataState<T>> {
  constructor() {
    super({
      data: null,
      isLoading: false,
      error: null
    });
  }
  
  fetch = async (fetcher: () => Promise<T>) => {
    this.emit({ data: null, isLoading: true, error: null });
    
    try {
      const data = await fetcher();
      this.patch({ data, isLoading: false });
    } catch (error) {
      this.patch({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      });
    }
  };
  
  retry = () => {
    if (this.lastFetcher) {
      this.fetch(this.lastFetcher);
    }
  };
  
  private lastFetcher?: () => Promise<T>;
}
```

### Computed Properties

Use getters for derived state:

```typescript
interface CartState {
  items: CartItem[];
  taxRate: number;
  discount: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

class CartCubit extends Cubit<CartState> {
  constructor() {
    super({
      items: [],
      taxRate: 0.08,
      discount: 0
    });
  }
  
  // Computed properties
  get subtotal() {
    return this.state.items.reduce(
      (sum, item) => sum + item.price * item.quantity, 
      0
    );
  }
  
  get tax() {
    return this.subtotal * this.state.taxRate;
  }
  
  get total() {
    return this.subtotal + this.tax - this.state.discount;
  }
  
  get itemCount() {
    return this.state.items.reduce(
      (sum, item) => sum + item.quantity, 
      0
    );
  }
  
  // Methods
  addItem = (item: CartItem) => {
    const existing = this.state.items.find(i => i.id === item.id);
    
    if (existing) {
      this.updateQuantity(item.id, existing.quantity + item.quantity);
    } else {
      this.patch({ items: [...this.state.items, item] });
    }
  };
  
  updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      this.removeItem(id);
      return;
    }
    
    this.patch({
      items: this.state.items.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    });
  };
  
  removeItem = (id: string) => {
    this.patch({
      items: this.state.items.filter(item => item.id !== id)
    });
  };
  
  applyDiscount = (discount: number) => {
    this.patch({ discount: Math.max(0, discount) });
  };
  
  clear = () => {
    this.patch({ items: [], discount: 0 });
  };
}
```

### Side Effects

Manage side effects within the Cubit:

```typescript
class NotificationCubit extends Cubit<Notification[]> {
  constructor(private maxNotifications = 5) {
    super([]);
  }
  
  add = (notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString()
    };
    
    // Add notification
    const updated = [newNotification, ...this.state];
    
    // Limit number of notifications
    if (updated.length > this.maxNotifications) {
      updated.pop();
    }
    
    this.emit(updated);
    
    // Auto-dismiss after timeout
    if (notification.autoDismiss !== false) {
      setTimeout(() => {
        this.remove(newNotification.id);
      }, notification.duration || 5000);
    }
  };
  
  remove = (id: string) => {
    this.emit(this.state.filter(n => n.id !== id));
  };
  
  clear = () => {
    this.emit([]);
  };
}
```

### State Validation

Ensure state integrity:

```typescript
interface RegistrationState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  errors: Record<string, string>;
}

class RegistrationCubit extends Cubit<RegistrationState> {
  constructor() {
    super({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      errors: {}
    });
  }
  
  updateField = (field: keyof RegistrationState, value: string) => {
    // Update field
    this.patch({ [field]: value });
    
    // Validate after update
    this.validateField(field, value);
  };
  
  private validateField = (field: string, value: string) => {
    const errors = { ...this.state.errors };
    
    switch (field) {
      case 'username':
        if (value.length < 3) {
          errors.username = 'Username must be at least 3 characters';
        } else {
          delete errors.username;
        }
        break;
        
      case 'email':
        if (!value.includes('@')) {
          errors.email = 'Invalid email address';
        } else {
          delete errors.email;
        }
        break;
        
      case 'password':
        if (value.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else {
          delete errors.password;
        }
        // Check confirm password match
        if (this.state.confirmPassword && value !== this.state.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
        
      case 'confirmPassword':
        if (value !== this.state.password) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
    }
    
    this.patch({ errors });
  };
  
  get isValid() {
    return Object.keys(this.state.errors).length === 0 &&
           this.state.username &&
           this.state.email &&
           this.state.password &&
           this.state.confirmPassword;
  }
  
  submit = async () => {
    if (!this.isValid) return;
    
    // Proceed with registration...
  };
}
```

## Lifecycle & Cleanup

Cubits can perform cleanup when disposed:

```typescript
class WebSocketCubit extends Cubit<ConnectionState> {
  private ws?: WebSocket;
  
  constructor(private url: string) {
    super({ status: 'disconnected' });
  }
  
  connect = () => {
    this.emit({ status: 'connecting' });
    
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      this.emit({ status: 'connected' });
    };
    
    this.ws.onerror = () => {
      this.emit({ status: 'error' });
    };
    
    this.ws.onclose = () => {
      this.emit({ status: 'disconnected' });
    };
  };
  
  disconnect = () => {
    this.ws?.close();
  };
  
  // Called when the last consumer unsubscribes
  onDispose = () => {
    this.disconnect();
  };
}
```

## Testing Cubits

Cubits are easy to test:

```typescript
describe('CounterCubit', () => {
  let cubit: CounterCubit;
  
  beforeEach(() => {
    cubit = new CounterCubit();
  });
  
  it('should start with initial state', () => {
    expect(cubit.state).toBe(0);
  });
  
  it('should increment', () => {
    cubit.increment();
    expect(cubit.state).toBe(1);
    
    cubit.increment();
    expect(cubit.state).toBe(2);
  });
  
  it('should notify listeners on state change', () => {
    const listener = jest.fn();
    cubit.on('StateChange', listener);
    
    cubit.increment();
    
    expect(listener).toHaveBeenCalledWith(1);
  });
});

// Testing async operations
describe('DataCubit', () => {
  it('should handle successful fetch', async () => {
    const cubit = new DataCubit<User>();
    const mockUser = { id: '1', name: 'Test' };
    
    await cubit.fetch(async () => mockUser);
    
    expect(cubit.state).toEqual({
      data: mockUser,
      isLoading: false,
      error: null
    });
  });
  
  it('should handle fetch error', async () => {
    const cubit = new DataCubit<User>();
    
    await cubit.fetch(async () => {
      throw new Error('Network error');
    });
    
    expect(cubit.state).toEqual({
      data: null,
      isLoading: false,
      error: 'Network error'
    });
  });
});
```

## Best Practices

### 1. Single Responsibility
Each Cubit should manage one feature or domain:
```typescript
// ✅ Good
class UserProfileCubit extends Cubit<UserProfile> {}
class UserSettingsCubit extends Cubit<UserSettings> {}

// ❌ Bad
class UserCubit extends Cubit<{ profile: UserProfile, settings: UserSettings }> {}
```

### 2. Immutable Updates
Always create new objects/arrays:
```typescript
// ✅ Good
this.patch({ items: [...this.state.items, newItem] });

// ❌ Bad
this.state.items.push(newItem); // Mutation!
this.emit(this.state);
```

### 3. Meaningful Method Names
Use clear, action-oriented names:
```typescript
// ✅ Good
class AuthCubit {
  signIn = () => {};
  signOut = () => {};
  refreshToken = () => {};
}

// ❌ Bad
class AuthCubit {
  update = () => {};
  change = () => {};
  doThing = () => {};
}
```

### 4. Handle All States
Consider loading, error, and success states:
```typescript
// ✅ Good
type State = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: string };

// ❌ Incomplete
interface State {
  data?: Data;
  // What about loading? Errors?
}
```

## Summary

Cubits provide a simple yet powerful way to manage state in BlaC:
- **Simple API**: Just `emit()` and `patch()`
- **Type Safe**: Full TypeScript support
- **Testable**: Easy to unit test
- **Flexible**: From counters to complex forms

For more complex scenarios with event-driven architecture, check out [Blocs](/concepts/blocs).