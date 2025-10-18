---
'@blac/core': major
'@blac/react': patch
---

**BREAKING CHANGE**: Schema validation is now explicit instead of automatic

## What Changed

- `emit()` and `patch()` no longer validate automatically
- Added `emitValidated()` for explicit validation
- Added `patchValidated()` for explicit partial updates
- Constructor still validates initial state (unchanged)

## Migration Guide

### Before (automatic validation)

```typescript
class UserCubit extends Cubit<User> {
  static schema = UserSchema;

  loadFromAPI = async () => {
    const data = await fetch('/api/user').then(r => r.json());
    this.emit(data); // Was validated automatically
  };
}
```

### After (explicit validation)

```typescript
class UserCubit extends Cubit<User> {
  static schema = UserSchema;

  loadFromAPI = async () => {
    const data = await fetch('/api/user').then(r => r.json());
    this.emitValidated(data); // Explicit validation
  };
}
```

## Why This Change?

Automatic validation added overhead on **every** state change, even for internal transitions that TypeScript already guarantees are correct. The new approach:

- ✅ Better performance (validate only when needed)
- ✅ More explicit (clear where validation happens)
- ✅ Follows best practice (validate at boundaries)

## When to Use

- **`emitValidated()`** - Use for external data (APIs, forms, localStorage, WebSocket)
- **`emit()`** - Use for internal transitions (computed values, counters, toggles)
- **`patchValidated()`** - Use for partial external updates
- **`patch()`** - Use for internal partial updates

## Key Points

- Constructor still validates initial state (no change needed)
- Helper methods (`validate()`, `isValid()`, `parse()`, `safeParse()`) still work the same
- Schema property is still required for validation methods
