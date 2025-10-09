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
import { Bloc } from '@blac/core';
import { EventRegistry } from '@blac/devtools-connect';

// Define events
class IncrementEvent {
  constructor(public amount: number = 1) {}
}

class DecrementEvent {
  constructor(public amount: number = 1) {}
}

class ResetEvent {}

// Register events for DevTools dispatch
EventRegistry.register('IncrementEvent', IncrementEvent, {
  parameterNames: ['amount'],
});

EventRegistry.register('DecrementEvent', DecrementEvent, {
  parameterNames: ['amount'],
});

EventRegistry.register('ResetEvent', ResetEvent);

// Define Bloc
type CounterEvent = IncrementEvent | DecrementEvent | ResetEvent;

class CounterBloc extends Bloc<number, CounterEvent> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });

    this.on(ResetEvent, (_event, emit) => {
      emit(0);
    });
  }
}
```

### Test from Redux DevTools:

```json
// Increment by 1 (default)
{ "type": "[CounterBloc] IncrementEvent" }

// Increment by 10
{ "type": "[CounterBloc] IncrementEvent", "payload": { "amount": 10 } }

// Decrement by 5
{ "type": "[CounterBloc] DecrementEvent", "payload": { "amount": 5 } }

// Reset to 0
{ "type": "[CounterBloc] ResetEvent" }
```

## User Profile Example (Complex Objects)

```typescript
import { Bloc } from '@blac/core';
import { EventRegistry } from '@blac/devtools-connect';

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

// Events
class LoadUserEvent {
  constructor(public userId: string) {}
}

class UpdateUserEvent {
  constructor(public user: Partial<User>) {}
}

class ClearUserEvent {}

// Register events
EventRegistry.register('LoadUserEvent', LoadUserEvent, {
  parameterNames: ['userId'],
});

EventRegistry.register('UpdateUserEvent', UpdateUserEvent, {
  parameterNames: ['user'],
});

EventRegistry.register('ClearUserEvent', ClearUserEvent);

// Bloc implementation
type UserEvent = LoadUserEvent | UpdateUserEvent | ClearUserEvent;

class UserBloc extends Bloc<UserState, UserEvent> {
  constructor() {
    super({
      user: null,
      loading: false,
      error: null,
    });

    this.on(LoadUserEvent, async (event, emit) => {
      emit({ ...this.state, loading: true, error: null });

      try {
        // Simulate API call
        const user = await this.fetchUser(event.userId);
        emit({ ...this.state, user, loading: false });
      } catch (error) {
        emit({
          ...this.state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.on(UpdateUserEvent, (event, emit) => {
      if (this.state.user) {
        emit({
          ...this.state,
          user: { ...this.state.user, ...event.user },
        });
      }
    });

    this.on(ClearUserEvent, (_event, emit) => {
      emit({ user: null, loading: false, error: null });
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
}
```

### Test from Redux DevTools:

```json
// Load user
{
  "type": "[UserBloc] LoadUserEvent",
  "payload": { "userId": "user-123" }
}

// Update user name
{
  "type": "[UserBloc] UpdateUserEvent",
  "payload": {
    "user": {
      "name": "Jane Doe"
    }
  }
}

// Update multiple fields
{
  "type": "[UserBloc] UpdateUserEvent",
  "payload": {
    "user": {
      "name": "Bob Smith",
      "email": "bob@example.com",
      "age": 25
    }
  }
}

// Clear user
{ "type": "[UserBloc] ClearUserEvent" }
```

## Shopping Cart Example

```typescript
import { Bloc } from '@blac/core';
import { EventRegistry } from '@blac/devtools-connect';

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

// Events
class AddItemEvent {
  constructor(
    public id: string,
    public name: string,
    public price: number,
  ) {}
}

class RemoveItemEvent {
  constructor(public id: string) {}
}

class UpdateQuantityEvent {
  constructor(
    public id: string,
    public quantity: number,
  ) {}
}

class ClearCartEvent {}

// Register events
EventRegistry.register('AddItemEvent', AddItemEvent, {
  parameterNames: ['id', 'name', 'price'],
});

EventRegistry.register('RemoveItemEvent', RemoveItemEvent, {
  parameterNames: ['id'],
});

EventRegistry.register('UpdateQuantityEvent', UpdateQuantityEvent, {
  parameterNames: ['id', 'quantity'],
});

EventRegistry.register('ClearCartEvent', ClearCartEvent);

// Bloc
type CartEvent =
  | AddItemEvent
  | RemoveItemEvent
  | UpdateQuantityEvent
  | ClearCartEvent;

class CartBloc extends Bloc<CartState, CartEvent> {
  constructor() {
    super({ items: [], total: 0 });

    this.on(AddItemEvent, (event, emit) => {
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
    });

    this.on(RemoveItemEvent, (event, emit) => {
      const newItems = this.state.items.filter((item) => item.id !== event.id);
      const total = this.calculateTotal(newItems);
      emit({ items: newItems, total });
    });

    this.on(UpdateQuantityEvent, (event, emit) => {
      const newItems = this.state.items
        .map((item) =>
          item.id === event.id ? { ...item, quantity: event.quantity } : item,
        )
        .filter((item) => item.quantity > 0);

      const total = this.calculateTotal(newItems);
      emit({ items: newItems, total });
    });

    this.on(ClearCartEvent, (_event, emit) => {
      emit({ items: [], total: 0 });
    });
  }

  private calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}
```

### Test from Redux DevTools:

```json
// Add items
{
  "type": "[CartBloc] AddItemEvent",
  "payload": {
    "id": "item-1",
    "name": "Laptop",
    "price": 999.99
  }
}

{
  "type": "[CartBloc] AddItemEvent",
  "payload": {
    "id": "item-2",
    "name": "Mouse",
    "price": 29.99
  }
}

// Update quantity
{
  "type": "[CartBloc] UpdateQuantityEvent",
  "payload": {
    "id": "item-1",
    "quantity": 2
  }
}

// Remove item
{
  "type": "[CartBloc] RemoveItemEvent",
  "payload": { "id": "item-2" }
}

// Clear cart
{ "type": "[CartBloc] ClearCartEvent" }
```

## Tips & Tricks

### 1. Find Available Blocs

Look at the Redux DevTools state tree to see all active Bloc names:

```
State:
├─ TodoBloc
├─ CounterBloc
├─ UserBloc
└─ CartBloc
```

### 2. Check Registered Events

Open browser console:

```javascript
// List all registered events
import { EventRegistry } from '@blac/devtools-connect';
console.log(EventRegistry.getRegisteredEvents());
```

### 3. Create Event Sequences

Test complex flows by dispatching multiple events:

```json
// Step 1: Add todo
{ "type": "[TodoBloc] AddTodoAction", "payload": { "text": "Buy milk" } }

// Step 2: Add another
{ "type": "[TodoBloc] AddTodoAction", "payload": { "text": "Walk dog" } }

// Step 3: Toggle first
{ "type": "[TodoBloc] ToggleTodoAction", "payload": { "id": 4 } }

// Step 4: Filter to completed
{ "type": "[TodoBloc] SetFilterAction", "payload": { "filter": "completed" } }
```

### 4. Test Edge Cases

```json
// Empty string
{ "type": "[TodoBloc] AddTodoAction", "payload": { "text": "" } }

// Very long text
{ "type": "[TodoBloc] AddTodoAction", "payload": { "text": "A".repeat(1000) } }

// Invalid ID
{ "type": "[TodoBloc] ToggleTodoAction", "payload": { "id": 99999 } }

// Negative quantity
{ "type": "[CartBloc] UpdateQuantityEvent", "payload": { "id": "item-1", "quantity": -5 } }
```

### 5. Debug Async Events

Dispatch async events and watch state transitions:

```json
// This will show: loading: true → loading: false
{ "type": "[UserBloc] LoadUserEvent", "payload": { "userId": "user-123" } }
```

Watch the Redux DevTools timeline to see:

1. Initial dispatch
2. Loading state
3. Success/error state

## Common Issues

### Event Not Registered

**Error:**

```
[ReduxDevToolsAdapter] Event "MyEvent" is not registered.
```

**Solution:**

```typescript
import { EventRegistry } from '@blac/devtools-connect';

EventRegistry.register('MyEvent', MyEvent, {
  parameterNames: ['param1', 'param2'],
});
```

### Bloc Not Found

**Error:**

```
[ReduxDevToolsAdapter] Bloc "MyBloc" not found.
```

**Solution:**
Ensure the Bloc is instantiated and mounted in a React component using `useBloc()`.

### Wrong Parameter Names

**Issue:** Event receives `undefined` values

**Solution:** Check that parameter names match constructor exactly:

```typescript
// Constructor
constructor(public userId: string, public name: string) {}

// Registration - must match!
EventRegistry.register('MyEvent', MyEvent, {
  parameterNames: ['userId', 'name'], // ✅ Correct
  // parameterNames: ['id', 'username'], // ❌ Wrong
});
```
