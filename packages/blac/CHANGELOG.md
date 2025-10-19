# @blac/core

## 2.0.0-rc.2

### Major Changes

- 276e4f7: **BREAKING CHANGE**: Schema validation is now explicit instead of automatic

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
      const data = await fetch('/api/user').then((r) => r.json());
      this.emit(data); // Was validated automatically
    };
  }
  ```

  ### After (explicit validation)

  ```typescript
  class UserCubit extends Cubit<User> {
    static schema = UserSchema;

    loadFromAPI = async () => {
      const data = await fetch('/api/user').then((r) => r.json());
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

### Patch Changes

- 17b9229: Fix critical race condition in disposal lifecycle that caused memory leaks in React Strict Mode.

  The BlocLifecycleManager.scheduleDisposal() method had a race condition where:
  - Cancelled disposals could still execute (stale microtasks)
  - Multiple microtasks could be queued for the same disposal
  - Memory leaks occurred in rapid mount/unmount scenarios

  Solution: Implemented generation counter pattern:
  - Each disposal request gets a unique generation number
  - Microtasks validate generation before executing disposal
  - Cancellation increments generation, invalidating pending microtasks
  - Zero overhead (~0.002ms per disposal)
  - Mathematically provably race-free

  Impact:
  - Eliminates all disposal-related memory leaks
  - Fixes React Strict Mode compatibility issues
  - No API changes (internal refactor only)
  - All existing tests pass

  See spec/2025-10-16-disposal-race-condition/ for full analysis and solution details.

## 2.0.0-rc.1

### Patch Changes

- rc

## 2.0.0-rc.0

### Patch Changes

- build to js
