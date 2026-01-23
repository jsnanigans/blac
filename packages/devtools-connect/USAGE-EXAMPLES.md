# Redux DevTools Action Dispatch - Usage Examples

## Quick Reference

### Built-In Actions

```json
// Replace entire state
{ "type": "[CounterCubit] emit", "payload": { "state": 42 } }

// Merge partial state (object states only)
{ "type": "[UserCubit] patch", "payload": { "state": { "name": "Alice" } } }
```

## Complete Counter Example

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = (amount = 1) => this.emit(this.state + amount);
  decrement = (amount = 1) => this.emit(this.state - amount);
  reset = () => this.emit(0);
}
```

### Test from Redux DevTools:

```json
// Set count to 1
{ "type": "[CounterCubit] emit", "payload": { "state": 1 } }

// Reset to 0
{ "type": "[CounterCubit] emit", "payload": { "state": 0 } }
```

## User Profile Example (Complex Objects)

```typescript
import { Cubit } from '@blac/core';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      user: null,
      loading: false,
      error: null,
    });
  }

  loadUser = async (userId: string) => {
    this.emit({ ...this.state, loading: true, error: null });

    try {
      const user = await this.fetchUser(userId);
      this.emit({ ...this.state, user, loading: false });
    } catch (error) {
      this.emit({
        ...this.state,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  private async fetchUser(userId: string): Promise<User> {
    // Mock API call
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };
  }

  updateUser = (user: Partial<User>) => {
    if (this.state.user) {
      this.emit({
        ...this.state,
        user: { ...this.state.user, ...user },
      });
    }
  };

  clearUser = () => {
    this.emit({ user: null, loading: false, error: null });
  };
}
```

### Test from Redux DevTools:

```json
// Set user directly
{
  "type": "[UserCubit] emit",
  "payload": {
    "state": {
      "user": { "id": "user-123", "name": "John Doe", "email": "john@example.com", "age": 30 },
      "loading": false,
      "error": null
    }
  }
}

// Update user name (partial state)
{
  "type": "[UserCubit] patch",
  "payload": {
    "state": {
      "user": { "id": "user-123", "name": "Jane Doe", "email": "john@example.com", "age": 30 }
    }
  }
}

// Clear user
{
  "type": "[UserCubit] emit",
  "payload": {
    "state": { "user": null, "loading": false, "error": null }
  }
}
```

## Shopping Cart Example

```typescript
import { Cubit } from '@blac/core';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

class CartCubit extends Cubit<CartState> {
  constructor() {
    super({ items: [], total: 0 });
  }

  private calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  addItem = (id: string, name: string, price: number) => {
    const existingItem = this.state.items.find((item) => item.id === id);

    let newItems: CartItem[];
    if (existingItem) {
      newItems = this.state.items.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    } else {
      newItems = [
        ...this.state.items,
        { id, name, price, quantity: 1 },
      ];
    }

    const total = this.calculateTotal(newItems);
    this.emit({ items: newItems, total });
  };

  removeItem = (id: string) => {
    const newItems = this.state.items.filter((item) => item.id !== id);
    const total = this.calculateTotal(newItems);
    this.emit({ items: newItems, total });
  };

  updateQuantity = (id: string, quantity: number) => {
    const newItems = this.state.items
      .map((item) => (item.id === id ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);

    const total = this.calculateTotal(newItems);
    this.emit({ items: newItems, total });
  };

  clearCart = () => {
    this.emit({ items: [], total: 0 });
  };
}
```

### Test from Redux DevTools:

```json
// Set cart state with items
{
  "type": "[CartCubit] emit",
  "payload": {
    "state": {
      "items": [
        { "id": "item-1", "name": "Laptop", "price": 999.99, "quantity": 1 },
        { "id": "item-2", "name": "Mouse", "price": 29.99, "quantity": 2 }
      ],
      "total": 1059.97
    }
  }
}

// Clear cart
{
  "type": "[CartCubit] emit",
  "payload": {
    "state": { "items": [], "total": 0 }
  }
}
```

## Tips & Tricks

### 1. Find Available State Containers

Look at the Redux DevTools state tree to see all active state container names:

```
State:
├─ TodoCubit
├─ CounterCubit
├─ UserCubit
└─ CartCubit
```

### 2. Test State Transitions

Use `emit` to test state transitions directly:

```json
// Test loading state
{
  "type": "[UserCubit] emit",
  "payload": {
    "state": { "user": null, "loading": true, "error": null }
  }
}

// Test success state
{
  "type": "[UserCubit] emit",
  "payload": {
    "state": {
      "user": { "id": "1", "name": "Test User", "email": "test@example.com", "age": 25 },
      "loading": false,
      "error": null
    }
  }
}

// Test error state
{
  "type": "[UserCubit] emit",
  "payload": {
    "state": { "user": null, "loading": false, "error": "Network error" }
  }
}
```

### 3. Use Patch for Partial Updates

For object states, use `patch` to update specific fields:

```json
// Only update loading status
{
  "type": "[UserCubit] patch",
  "payload": {
    "state": { "loading": false }
  }
}
```

### 4. Test Edge Cases

```json
// Empty array
{ "type": "[CartCubit] emit", "payload": { "state": { "items": [], "total": 0 } } }

// Large quantity
{
  "type": "[CartCubit] emit",
  "payload": {
    "state": {
      "items": [{ "id": "1", "name": "Item", "price": 10, "quantity": 1000 }],
      "total": 10000
    }
  }
}
```

## Common Issues

### State Container Not Found

**Error:**

```
[ReduxDevToolsAdapter] State container "MyCubit" not found.
```

**Solution:**
Ensure the state container is instantiated and mounted in a React component using `useBloc()`.

### Invalid State Shape

**Issue:** State doesn't update as expected

**Solution:** Make sure the payload state shape matches your state type exactly:

```typescript
// Your Cubit state type
interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// DevTools dispatch - must match exact shape
{
  "type": "[UserCubit] emit",
  "payload": {
    "state": {
      "user": null,
      "loading": false,
      "error": null  // All fields required for emit
    }
  }
}
```
