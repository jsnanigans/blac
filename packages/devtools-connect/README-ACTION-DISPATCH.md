# Action Dispatch from Redux DevTools

This document explains how to use the Action Dispatch feature to control Cubits from Redux DevTools UI.

## Overview

The Action Dispatch feature allows you to control your state directly from the Redux DevTools interface, without clicking UI buttons or writing test code.

### What You Can Do

- **Update state directly** with `emit` (replace entire state)
- **Partially update state** with `patch` (merge properties)
- **Test edge cases** with unusual state values
- **Rapid prototyping** without code changes

This is extremely useful for:

- Testing without UI interaction
- Debugging complex state issues
- Reproducing bugs with specific states
- Learning the API interactively

## Quick Start

### Direct State Updates

No setup needed! Just dispatch `emit` or `patch` actions:

#### Using `emit` - Replace Entire State

```json
// For a Cubit with object state
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

// For a Cubit with primitive state
{
  "type": "[CounterCubit] emit",
  "payload": {
    "state": 42
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

- Quick testing of different state values
- Testing UI with edge case states
- Debugging state-specific issues

## Examples

### Counter Cubit

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
}
```

**Dispatch from DevTools:**

```json
// Set counter to 100
{ "type": "[CounterCubit] emit", "payload": { "state": 100 } }

// Set to -42
{ "type": "[CounterCubit] emit", "payload": { "state": -42 } }

// Set to 0 (reset)
{ "type": "[CounterCubit] emit", "payload": { "state": 0 } }
```

### Object State Cubit

```typescript
import { Cubit } from '@blac/core';

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

---

### Testing Edge Cases

```json
// Empty name
{ "type": "[UserCubit] patch", "payload": { "state": { "name": "" } } }

// Negative age
{ "type": "[UserCubit] patch", "payload": { "state": { "age": -5 } } }

// Invalid email
{ "type": "[UserCubit] patch", "payload": { "state": { "email": "not-an-email" } } }
```

## Error Handling

The Action Dispatch feature provides helpful error messages:

### State Container Not Found

```
[ReduxDevToolsAdapter] State container "CounterCubit" not found.
Available: UserCubit, TodoCubit
```

### Invalid Action Format

```
[ReduxDevToolsAdapter] Invalid action type format: "emit".
Expected format: "[ContainerName] action"
```

## Debugging Tips

### 1. Check Available State Containers

From Redux DevTools state view, you can see all active state container names in the state tree.

### 2. Listen for Dispatches

```typescript
// Listen for successful dispatches
window.addEventListener('blac-devtools-action-dispatched', (e) => {
  console.log('Action dispatched:', e.detail);
});
```

## See Also

- [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
- [BlaC Core Documentation](../blac/README.md)
- [Redux DevTools Adapter](./src/integrations/ReduxDevToolsAdapter.ts)
