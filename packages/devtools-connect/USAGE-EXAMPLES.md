# Redux DevTools Action Dispatch - Usage Examples

## Quick Reference

### Built-In Actions (Work for Both Blocs & Cubits)

```json
// Replace entire state
{ "type": "[CounterCubit] emit", "payload": { "state": 42 } }

// Merge partial state (object states only)
{ "type": "[UserCubit] patch", "payload": { "state": { "name": "Alice" } } }
```

### Custom Events (Blocs Only - Requires Registration)

Once the playground is running, open Redux DevTools and dispatch these actions:

```json
{
  "type": "[TodoBloc] AddTodoAction",
  "payload": { "text": "Test from DevTools" }
}
```

```json
{
  "type": "[TodoBloc] ToggleTodoAction",
  "payload": { "id": 1 }
}
```

```json
{
  "type": "[TodoBloc] RemoveTodoAction",
  "payload": { "id": 2 }
}
```

```json
{
  "type": "[TodoBloc] SetFilterAction",
  "payload": { "filter": "completed" }
}
```

```json
{
  "type": "[TodoBloc] ClearCompletedAction"
}
```

## Complete Counter Example

```typescript
import { Vertex } from '@blac/core';

// Define events as discriminated union
type CounterEvent =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

class CounterVertex extends Vertex<{ count: number }, CounterEvent> {
  constructor() {
    super({ count: 0 });

    // TypeScript enforces exhaustive handling
    this.createHandlers({
      increment: (event, emit) => {
        emit({ count: this.state.count + event.amount });
      },
      decrement: (event, emit) => {
        emit({ count: this.state.count - event.amount });
      },
      reset: (_, emit) => {
        emit({ count: 0 });
      },
    });
  }

  // Convenience methods
  increment = (amount = 1) => this.add({ type: 'increment', amount });
  decrement = (amount = 1) => this.add({ type: 'decrement', amount });
  reset = () => this.add({ type: 'reset' });
}
```

### Test from Redux DevTools:

```json
// Increment by 1 (default)
{ "type": "[CounterVertex] emit", "payload": { "state": { "count": 1 } } }

// Reset to 0
{ "type": "[CounterVertex] emit", "payload": { "state": { "count": 0 } } }
```

## User Profile Example (Complex Objects)

```typescript
import { Vertex } from '@blac/core';

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

// Define events as discriminated union
type UserEvent =
  | { type: 'loadUser'; userId: string }
  | { type: 'updateUser'; user: Partial<User> }
  | { type: 'clearUser' };

class UserVertex extends Vertex<UserState, UserEvent> {
  constructor() {
    super({
      user: null,
      loading: false,
      error: null,
    });

    this.createHandlers({
      loadUser: async (event, emit) => {
        emit({ ...this.state, loading: true, error: null });

        try {
          const user = await this.fetchUser(event.userId);
          emit({ ...this.state, user, loading: false });
        } catch (error) {
          emit({
            ...this.state,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
      updateUser: (event, emit) => {
        if (this.state.user) {
          emit({
            ...this.state,
            user: { ...this.state.user, ...event.user },
          });
        }
      },
      clearUser: (_, emit) => {
        emit({ user: null, loading: false, error: null });
      },
    });
  }

  private async fetchUser(userId: string): Promise<User> {
    // Mock API call
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };
  }

  // Convenience methods
  loadUser = (userId: string) => this.add({ type: 'loadUser', userId });
  updateUser = (user: Partial<User>) => this.add({ type: 'updateUser', user });
  clearUser = () => this.add({ type: 'clearUser' });
}
```

### Test from Redux DevTools:

```json
// Set user directly
{
  "type": "[UserVertex] emit",
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
  "type": "[UserVertex] patch",
  "payload": {
    "state": {
      "user": { "id": "user-123", "name": "Jane Doe", "email": "john@example.com", "age": 30 }
    }
  }
}

// Clear user
{
  "type": "[UserVertex] emit",
  "payload": {
    "state": { "user": null, "loading": false, "error": null }
  }
}
```

## Shopping Cart Example

```typescript
import { Vertex } from '@blac/core';

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

// Define events as discriminated union
type CartEvent =
  | { type: 'addItem'; id: string; name: string; price: number }
  | { type: 'removeItem'; id: string }
  | { type: 'updateQuantity'; id: string; quantity: number }
  | { type: 'clearCart' };

class CartVertex extends Vertex<CartState, CartEvent> {
  constructor() {
    super({ items: [], total: 0 });

    this.createHandlers({
      addItem: (event, emit) => {
        const existingItem = this.state.items.find(
          (item) => item.id === event.id,
        );

        let newItems: CartItem[];
        if (existingItem) {
          newItems = this.state.items.map((item) =>
            item.id === event.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        } else {
          newItems = [
            ...this.state.items,
            {
              id: event.id,
              name: event.name,
              price: event.price,
              quantity: 1,
            },
          ];
        }

        const total = this.calculateTotal(newItems);
        emit({ items: newItems, total });
      },
      removeItem: (event, emit) => {
        const newItems = this.state.items.filter((item) => item.id !== event.id);
        const total = this.calculateTotal(newItems);
        emit({ items: newItems, total });
      },
      updateQuantity: (event, emit) => {
        const newItems = this.state.items
          .map((item) =>
            item.id === event.id ? { ...item, quantity: event.quantity } : item,
          )
          .filter((item) => item.quantity > 0);

        const total = this.calculateTotal(newItems);
        emit({ items: newItems, total });
      },
      clearCart: (_, emit) => {
        emit({ items: [], total: 0 });
      },
    });
  }

  private calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // Convenience methods
  addItem = (id: string, name: string, price: number) =>
    this.add({ type: 'addItem', id, name, price });
  removeItem = (id: string) => this.add({ type: 'removeItem', id });
  updateQuantity = (id: string, quantity: number) =>
    this.add({ type: 'updateQuantity', id, quantity });
  clearCart = () => this.add({ type: 'clearCart' });
}
```

### Test from Redux DevTools:

```json
// Set cart state with items
{
  "type": "[CartVertex] emit",
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
  "type": "[CartVertex] emit",
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
├─ TodoVertex
├─ CounterVertex
├─ UserCubit
└─ CartVertex
```

### 2. Test State Transitions

Use `emit` to test state transitions directly:

```json
// Test loading state
{
  "type": "[UserVertex] emit",
  "payload": {
    "state": { "user": null, "loading": true, "error": null }
  }
}

// Test success state
{
  "type": "[UserVertex] emit",
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
  "type": "[UserVertex] emit",
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
  "type": "[UserVertex] patch",
  "payload": {
    "state": { "loading": false }
  }
}
```

### 4. Test Edge Cases

```json
// Empty array
{ "type": "[CartVertex] emit", "payload": { "state": { "items": [], "total": 0 } } }

// Large quantity
{
  "type": "[CartVertex] emit",
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
[ReduxDevToolsAdapter] State container "MyVertex" not found.
```

**Solution:**
Ensure the state container is instantiated and mounted in a React component using `useBloc()`.

### Invalid State Shape

**Issue:** State doesn't update as expected

**Solution:** Make sure the payload state shape matches your state type exactly:

```typescript
// Your Vertex state type
interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// DevTools dispatch - must match exact shape
{
  "type": "[UserVertex] emit",
  "payload": {
    "state": {
      "user": null,
      "loading": false,
      "error": null  // All fields required for emit
    }
  }
}
```
