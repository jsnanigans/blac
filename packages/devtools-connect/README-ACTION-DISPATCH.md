# Action Dispatch from Redux DevTools

This document explains how to use the Action Dispatch feature to control Blocs and Cubits from Redux DevTools UI.

## Overview

The Action Dispatch feature allows you to control your state directly from the Redux DevTools interface, without clicking UI buttons or writing test code.

### What You Can Do

**For Both Blocs AND Cubits:**

- **Update state directly** with `emit` (replace entire state)
- **Partially update state** with `patch` (merge properties)
- **Test edge cases** with unusual state values
- **Rapid prototyping** without code changes

**For Blocs Only (Event-Based):**

- **Dispatch custom events** to test event handlers
- **Reproduce event sequences** for debugging
- **Test async flows** and side effects

This is extremely useful for:

- Testing without UI interaction
- Debugging complex state issues
- Reproducing bugs with specific state/events
- Learning the API interactively

## Quick Start

### Option A: Direct State Updates (Works for Both Blocs & Cubits)

No setup needed! Just dispatch `emit` or `patch` actions:

#### Using `emit` - Replace Entire State

```json
// For a simple counter (number state)
{
  "type": "[CounterCubit] emit",
  "payload": { "state": 42 }
}

// For an object state
{
  "type": "[UserCubit] emit",
  "payload": {
    "state": {
      "name": "Alice",
      "age": 30,
      "email": "alice@example.com"
    }
  }
}
```

#### Using `patch` - Merge Partial State

```json
// Update only specific fields
{
  "type": "[UserCubit] patch",
  "payload": {
    "state": {
      "age": 31
    }
  }
}

// Update multiple fields
{
  "type": "[TodoCubit] patch",
  "payload": {
    "state": {
      "filter": "completed",
      "loading": false
    }
  }
}
```

**When to use:**

- ✅ Quick testing of different state values
- ✅ Testing UI with edge case states
- ✅ Debugging state-specific issues
- ✅ Works with **both** Blocs and Cubits

---

### Option B: Custom Events (Blocs Only - Requires Registration)

For Blocs, you can also dispatch custom registered events:

#### 1. Register Your Events

You can register events in two ways:

#### Option A: Manual Registration (Recommended)

Explicitly register events using the `EventRegistry`:

```typescript
import { Bloc } from '@blac/core';
import { EventRegistry } from '@blac/devtools-connect';

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

// Use events in your Bloc
class CounterBloc extends Bloc<
  number,
  IncrementEvent | DecrementEvent | ResetEvent
> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });

    this.on(ResetEvent, (event, emit) => {
      emit(0);
    });
  }
}
```

#### Option B: Using @DevToolsEvent() Decorator

Use the `@DevToolsEvent()` decorator (requires `experimentalDecorators` enabled):

```typescript
import { Bloc } from '@blac/core';
import { DevToolsEvent } from '@blac/devtools-connect';

// Register event with parameter names
@DevToolsEvent({ params: ['amount'] })
class IncrementEvent {
  constructor(public amount: number = 1) {}
}

@DevToolsEvent({ params: ['amount'] })
class DecrementEvent {
  constructor(public amount: number = 1) {}
}

@DevToolsEvent()
class ResetEvent {}

// Use events in your Bloc
class CounterBloc extends Bloc<
  number,
  IncrementEvent | DecrementEvent | ResetEvent
> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });

    this.on(ResetEvent, (event, emit) => {
      emit(0);
    });
  }
}
```

#### 2. Dispatch Events from Redux DevTools

Open Redux DevTools in your browser, then:

1. Click the **"Dispatcher"** button in the bottom bar
2. Enter your action in the JSON format:

```json
{
  "type": "[CounterBloc] IncrementEvent",
  "payload": {
    "amount": 5
  }
}
```

3. Click **"Dispatch"** to trigger the event

The format is always: `[BlocName] EventName`

**When to use custom events vs emit/patch:**

- **Custom events:** Test business logic, side effects, async flows (Blocs only)
- **emit/patch:** Quick state changes, testing UI with different states (Both Blocs & Cubits)

## Examples

### Built-In State Actions (Blocs & Cubits)

#### Counter Cubit

```typescript
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
}
```

**Dispatch from DevTools:**

```json
// Set counter to 100
{ "type": "[CounterCubit] emit", "payload": { "state": { "count": 100 } } }

// Set to -42
{ "type": "[CounterCubit] emit", "payload": { "state": { "count": -42 } } }

// Set to 0 (reset)
{ "type": "[CounterCubit] emit", "payload": { "state": { "count": 0 } } }
```

#### Object State Cubit

```typescript
interface UserState {
  name: string;
  age: number;
  email: string;
  isActive: boolean;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      name: '',
      age: 0,
      email: '',
      isActive: false,
    });
  }

  updateProfile = (name: string, age: number) => {
    this.patch({ name, age });
  };
}
```

**Dispatch from DevTools:**

```json
// Replace entire state
{
  "type": "[UserCubit] emit",
  "payload": {
    "state": {
      "name": "Alice Smith",
      "age": 30,
      "email": "alice@example.com",
      "isActive": true
    }
  }
}

// Update just the name
{
  "type": "[UserCubit] patch",
  "payload": {
    "state": { "name": "Bob Jones" }
  }
}

// Update age and email
{
  "type": "[UserCubit] patch",
  "payload": {
    "state": {
      "age": 25,
      "email": "bob@example.com"
    }
  }
}

// Toggle active status
{
  "type": "[UserCubit] patch",
  "payload": {
    "state": { "isActive": false }
  }
}
```

#### Testing Edge Cases

```json
// Empty name
{ "type": "[UserCubit] patch", "payload": { "state": { "name": "" } } }

// Negative age
{ "type": "[UserCubit] patch", "payload": { "state": { "age": -5 } } }

// Very long name
{ "type": "[UserCubit] patch", "payload": { "state": { "name": "A".repeat(1000) } } }

// Invalid email
{ "type": "[UserCubit] patch", "payload": { "state": { "email": "not-an-email" } } }
```

---

### Custom Events (Blocs Only)

#### Simple Event (No Parameters)

```typescript
@DevToolsEvent()
class RefreshEvent {}

// Dispatch from DevTools:
{
  "type": "[DataBloc] RefreshEvent"
}
```

### Event with Single Parameter

```typescript
@DevToolsEvent({ params: ['userId'] })
class LoadUserEvent {
  constructor(public userId: string) {}
}

// Dispatch from DevTools:
{
  "type": "[UserBloc] LoadUserEvent",
  "payload": {
    "userId": "user-123"
  }
}
```

### Event with Multiple Parameters

```typescript
@DevToolsEvent({ params: ['id', 'title', 'completed'] })
class UpdateTodoEvent {
  constructor(
    public id: number,
    public title: string,
    public completed: boolean
  ) {}
}

// Dispatch from DevTools:
{
  "type": "[TodoBloc] UpdateTodoEvent",
  "payload": {
    "id": 42,
    "title": "Buy groceries",
    "completed": false
  }
}
```

### Event with Complex Objects (Custom Deserializer)

For events with complex objects, provide a custom deserializer:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

@DevToolsEvent({
  params: ['user'],
  deserialize: (payload) => {
    // Reconstruct complex objects from JSON
    const user: User = {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
    };
    return new LoginEvent(user);
  }
})
class LoginEvent {
  constructor(public user: User) {}
}

// Dispatch from DevTools:
{
  "type": "[AuthBloc] LoginEvent",
  "payload": {
    "user": {
      "id": "123",
      "name": "Alice",
      "email": "alice@example.com"
    }
  }
}
```

## API Reference

### `@DevToolsEvent()` Decorator

Registers an event class for Redux DevTools action dispatch.

```typescript
@DevToolsEvent(options?: {
  // Parameter names matching constructor signature
  params?: string[];

  // Custom name (defaults to class name)
  name?: string;

  // Custom deserializer for complex events
  deserialize?: (payload: any) => any;
})
```

**Options:**

- **`params`**: Array of parameter names that match the constructor signature. Used to map JSON payload properties to constructor arguments.
- **`name`**: Custom name for the event (defaults to the class name). Useful if you want a different display name in DevTools.
- **`deserialize`**: Custom deserializer function for complex events with nested objects or special construction logic.

### `EventRegistry`

Global registry for managing registered events.

```typescript
import { EventRegistry } from '@blac/devtools-connect';

// Check if event is registered
EventRegistry.has('IncrementEvent'); // true

// Get event metadata
const metadata = EventRegistry.get('IncrementEvent');

// Get all registered events
const events = EventRegistry.getRegisteredEvents();

// Deserialize event manually (usually not needed)
const event = EventRegistry.deserializeEvent('IncrementEvent', { amount: 5 });

// Clear registry (useful for testing)
EventRegistry.clear();
```

## Error Handling

The Action Dispatch feature provides helpful error messages:

### Event Not Registered

```
[ReduxDevToolsAdapter] Event "IncrementEvent" is not registered.
Available events: none

To register an event, use the @DevToolsEvent() decorator:

@DevToolsEvent({ params: ['amount'] })
class IncrementEvent {
  constructor(public amount: number = 1) {}
}
```

### Bloc Not Found

```
[ReduxDevToolsAdapter] Bloc "CounterBloc" not found.
Available blocs: UserBloc, TodoBloc
```

### Invalid Action Format

```
[ReduxDevToolsAdapter] Invalid action type format: "IncrementEvent".
Expected format: "[BlocName] EventName"
```

### Cubit (Not Bloc)

```
[ReduxDevToolsAdapter] Bloc "CounterCubit" does not support events.
Only Bloc instances (not Cubits) can dispatch events.
```

## Best Practices

### 1. Choose Your Registration Approach

```typescript
// ✅ Good - Manual registration (works everywhere)
class IncrementEvent {
  constructor(public amount: number = 1) {}
}
EventRegistry.register('IncrementEvent', IncrementEvent, {
  parameterNames: ['amount'],
});

// ✅ Also Good - Decorator (requires build config)
@DevToolsEvent({ params: ['amount'] })
class IncrementEvent {
  constructor(public amount: number = 1) {}
}

// ❌ Bad - Event not registered (won't work with DevTools dispatch)
class IncrementEvent {
  constructor(public amount: number = 1) {}
}
```

### 2. Match Parameter Names to Constructor

```typescript
// ✅ Good - Parameter names match constructor
@DevToolsEvent({ params: ['userId', 'name'] })
class UpdateUserEvent {
  constructor(
    public userId: string,
    public name: string,
  ) {}
}

// ❌ Bad - Parameter names don't match
@DevToolsEvent({ params: ['id', 'title'] })
class UpdateUserEvent {
  constructor(
    public userId: string, // Should be 'userId', not 'id'
    public name: string, // Should be 'name', not 'title'
  ) {}
}
```

### 3. Use Custom Deserializers for Complex Objects

```typescript
// ✅ Good - Custom deserializer handles complex objects
@DevToolsEvent({
  params: ['user'],
  deserialize: (payload) => new LoginEvent(User.fromJSON(payload.user)),
})
class LoginEvent {
  constructor(public user: User) {}
}

// ⚠️ Okay but limited - May not reconstruct properly
@DevToolsEvent({ params: ['user'] })
class LoginEvent {
  constructor(public user: User) {}
}
```

### 4. Provide Default Values for Optional Parameters

```typescript
// ✅ Good - Default value makes dispatch easier
@DevToolsEvent({ params: ['amount'] })
class IncrementEvent {
  constructor(public amount: number = 1) {}
}

// Dispatch with default:
{ "type": "[CounterBloc] IncrementEvent" }

// Dispatch with custom value:
{ "type": "[CounterBloc] IncrementEvent", "payload": { "amount": 5 } }
```

## Debugging Tips

### 1. Check Registered Events

Open browser console and check registered events:

```javascript
window.Blac.instance.plugins.plugins.forEach((plugin) => {
  if (plugin.name === 'ReduxDevToolsAdapter') {
    console.log('Registered events:', EventRegistry.getRegisteredEvents());
  }
});
```

### 2. Check Available Blocs

```javascript
// From Redux DevTools state view, you can see all active Bloc names
```

### 3. Listen for Custom Events

```typescript
// Listen for successful dispatches
window.addEventListener('blac-devtools-action-dispatched', (e) => {
  console.log('Action dispatched:', e.detail);
});
```

## Limitations

1. **Events must be registered** using `@DevToolsEvent()` decorator
2. **Only works with Bloc** (not Cubit, since Cubits don't have events)
3. **Complex objects** may require custom deserializers
4. **Async constructors** are not supported (use custom deserializer)
5. **Side effects** in constructors may cause issues (keep constructors pure)

## Build Configuration

### Using Decorators (Optional)

If you prefer the decorator syntax, you need to enable decorator support:

#### TypeScript Configuration

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

#### Vite Configuration

If using Vite, you need to use a plugin that supports decorators. Replace the default React plugin with SWC:

```bash
pnpm add -D @vitejs/plugin-react-swc
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // Use SWC instead

export default defineConfig({
  plugins: [react()],
});
```

#### Webpack/Babel Configuration

If using Webpack with Babel, install the decorator plugin:

```bash
pnpm add -D @babel/plugin-proposal-decorators
```

```json
{
  "plugins": [["@babel/plugin-proposal-decorators", { "version": "2023-05" }]]
}
```

### Manual Registration (No Build Config Needed)

If you want to avoid build configuration complexity, use manual registration instead:

```typescript
import { EventRegistry } from '@blac/devtools-connect';

class MyEvent {
  constructor(public value: number) {}
}

// Register manually (no decorator needed)
EventRegistry.register('MyEvent', MyEvent, {
  parameterNames: ['value'],
});
```

This approach works everywhere without any build configuration changes.

## See Also

- [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
- [BlaC Core Documentation](../blac/README.md)
- [Redux DevTools Adapter](./src/integrations/ReduxDevToolsAdapter.ts)
