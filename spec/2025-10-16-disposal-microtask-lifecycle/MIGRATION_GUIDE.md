# Migration Guide: v2.0 Disposal System

**Version:** 2.0.0
**Date:** 2025-01-10
**Status:** Final

---

## Overview

BlaC v2.0 introduces a significantly improved disposal system with **microtask-based disposal scheduling** replacing the previous timeout-based approach. This change provides deterministic, predictable disposal behavior that works seamlessly with React Strict Mode and improves overall reliability.

### Key Benefits

- ⚡ **Faster disposal**: Sub-millisecond disposal instead of 100ms+ delays
- 🎯 **Deterministic behavior**: Predictable microtask-based scheduling
- ✅ **React Strict Mode compatible**: No special configuration needed
- 🔧 **Explicit cleanup**: New lifecycle hooks for resource management
- 📦 **Simpler API**: Removed unnecessary configuration options

---

## Breaking Changes

### 1. Configuration Changes

#### ❌ Removed: `disposalTimeout`

The `disposalTimeout` configuration option has been removed. Disposal now happens on the next microtask after the last subscription is removed.

**Before (v1.x):**
```typescript
import { Blac } from '@blac/core';

Blac.setConfig({
  disposalTimeout: 200, // ❌ No longer supported
});
```

**After (v2.0):**
```typescript
import { Blac } from '@blac/core';

// No disposal timeout configuration needed!
// Disposal happens automatically on the next microtask
Blac.setConfig({
  proxyDependencyTracking: true, // This is the only config option now
});
```

**Migration Steps:**
1. Remove any `disposalTimeout` configuration from your code
2. Remove any custom `static disposalTimeout` properties from your Bloc/Cubit classes
3. No replacement needed - disposal is now automatic and instant

---

#### ❌ Removed: `strictModeCompatibility`

The `strictModeCompatibility` configuration option has been removed. React Strict Mode compatibility is now built-in and always enabled.

**Before (v1.x):**
```typescript
Blac.setConfig({
  strictModeCompatibility: true, // ❌ No longer needed
});
```

**After (v2.0):**
```typescript
// No configuration needed - Strict Mode works by default!
```

**Migration Steps:**
1. Remove any `strictModeCompatibility` configuration from your code
2. Your code will continue to work in React Strict Mode without changes

---

### 2. Disposal Timing Changes

#### Synchronous to Microtask Transition

Disposal now happens on the next microtask instead of after a configurable timeout.

**Impact:**
- **Tests**: Update tests that wait for disposal to use `await Promise.resolve()` instead of `setTimeout`
- **Intervals/Timers**: Blocs with intervals or timers **must** now clean them up explicitly

**Before (v1.x tests):**
```typescript
// ❌ Old pattern - waiting for timeout
const cubit = new MyCubit();
const unsub = cubit.subscribe(() => {});
unsub();

await new Promise(resolve => setTimeout(resolve, 150)); // Wait for disposal timeout
expect(cubit.isDisposed).toBe(true);
```

**After (v2.0 tests):**
```typescript
// ✅ New pattern - waiting for microtask
const cubit = new MyCubit();
const unsub = cubit.subscribe(() => {});
unsub();

await Promise.resolve(); // Flush microtask queue
expect(cubit.isDisposed).toBe(true);
```

---

### 3. Interval/Timer Cleanup Required

Blocs with intervals or timers **must** now implement explicit cleanup using the `onDisposalScheduled` hook.

#### ❌ This Will NOT Work in v2.0

```typescript
class CounterCubit extends Cubit<number> {
  interval: NodeJS.Timeout;

  constructor() {
    super(0);

    // ❌ This will prevent disposal!
    this.interval = setInterval(() => {
      this.emit(this.state + 1);
    }, 100);
  }
}
```

**Problem:** The interval keeps emitting state updates, which prevents the bloc from being disposed.

#### ✅ Correct Pattern in v2.0

```typescript
class CounterCubit extends Cubit<number> {
  interval?: NodeJS.Timeout;

  constructor() {
    super(0);

    // ✅ Clean up in onDisposalScheduled hook
    this.onDisposalScheduled = () => {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = undefined;
      }
    };

    this.interval = setInterval(() => {
      this.emit(this.state + 1);
    }, 100);
  }
}
```

**Why this works:**
- `onDisposalScheduled` is called synchronously when subscriptionCount reaches 0
- The interval is cleared before disposal is scheduled
- No more state emissions can block disposal

---

## New Features

### 1. Lifecycle Hooks

v2.0 introduces two new lifecycle hooks for explicit resource management.

#### `onDisposalScheduled` Hook

Called synchronously when disposal is scheduled (subscriptionCount === 0).

**Use Cases:**
- Clear intervals
- Cancel timers
- Abort pending promises/async operations
- Close connections that might emit state

**Example:**
```typescript
class DataStreamCubit extends Cubit<Data> {
  private interval?: NodeJS.Timeout;
  private abortController = new AbortController();

  constructor() {
    super(initialData);

    // Setup cleanup hook FIRST
    this.onDisposalScheduled = () => {
      // Clear interval
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = undefined;
      }

      // Abort pending requests
      this.abortController.abort();
    };

    // Start polling
    this.interval = setInterval(() => {
      this.fetchData();
    }, 1000);
  }

  private fetchData = async () => {
    try {
      const data = await fetch('/api/data', {
        signal: this.abortController.signal,
      });
      this.emit(await data.json());
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    }
  };
}
```

**Important:**
- Must be **synchronous** (no async/await)
- Errors are logged but don't prevent disposal
- Called **before** disposal microtask is queued
- Cannot prevent disposal (use plugins for that)

---

#### `onDispose` Hook

Called when disposal completes (bloc is fully disposed).

**Use Cases:**
- Close database connections
- Clear caches
- Release resources
- Final cleanup

**Example:**
```typescript
class DatabaseBloc extends Bloc<DbState, DbEvents> {
  constructor(private connection: DbConnection) {
    super(initialState);

    this.onDispose = () => {
      // Close connection when fully disposed
      this.connection.close();
    };
  }
}
```

**Important:**
- Must be **synchronous** (no async/await)
- Errors are logged but don't prevent disposal completion
- Called **after** all subscriptions are cleared

---

### 2. Emission Blocking on Disposal

State emissions are now blocked on non-ACTIVE blocs to prevent disposal issues.

**Before (v1.x):**
```typescript
const cubit = new MyCubit();
const unsub = cubit.subscribe(() => {});
unsub(); // Disposal scheduled

// ⚠️ This would delay disposal in v1.x
cubit.emit(newState);
```

**After (v2.0):**
```typescript
const cubit = new MyCubit();
const unsub = cubit.subscribe(() => {});
unsub(); // Disposal scheduled

// ✅ This is blocked with a helpful error in v2.0
cubit.emit(newState);
// Error: Cannot emit state on DISPOSAL_REQUESTED bloc.
//        If this bloc uses setInterval/setTimeout, clean up in onDisposalScheduled hook.
```

**Migration Impact:**
- Most code unaffected (emissions rarely happen after unsubscribe)
- Intervals/timers will trigger helpful error messages → add cleanup hook
- Error messages guide you to the solution

---

## Migration Checklist

### For Application Code

- [ ] **Remove disposal configuration**
  - [ ] Remove `disposalTimeout` from `Blac.setConfig()`
  - [ ] Remove `strictModeCompatibility` from `Blac.setConfig()`
  - [ ] Remove `static disposalTimeout` from Bloc/Cubit classes

- [ ] **Add cleanup hooks for resource-using Blocs**
  - [ ] Identify Blocs/Cubits with `setInterval()`
  - [ ] Identify Blocs/Cubits with `setTimeout()`
  - [ ] Identify Blocs/Cubits with pending promises
  - [ ] Add `onDisposalScheduled` hook to clear these resources

- [ ] **Add final cleanup hooks (optional)**
  - [ ] Identify Blocs with database connections
  - [ ] Identify Blocs with cache management
  - [ ] Add `onDispose` hook for final cleanup

### For Test Code

- [ ] **Update disposal timing in tests**
  - [ ] Replace `setTimeout(resolve, 100+)` with `Promise.resolve()`
  - [ ] Search for: `setTimeout.*resolve.*\d{3}` (regex)
  - [ ] Replace with: `await Promise.resolve()`

- [ ] **Update test helpers**
  - [ ] Update any test utilities that wait for disposal
  - [ ] Ensure helpers use microtask pattern

- [ ] **Verify test Blocs have cleanup**
  - [ ] Add `onDisposalScheduled` to test Blocs with intervals
  - [ ] Run tests to catch emission blocking errors

### Verification Steps

- [ ] **Run full test suite**
  ```bash
  pnpm test
  ```

- [ ] **Check for errors in console**
  - Look for "Cannot emit state on DISPOSAL_REQUESTED" errors
  - These indicate missing cleanup hooks

- [ ] **Run type checking**
  ```bash
  pnpm typecheck
  ```

- [ ] **Manual testing**
  - Test mounting/unmounting components
  - Verify no memory leaks
  - Check disposal happens promptly

---

## Common Migration Patterns

### Pattern 1: Interval Cleanup

**Before:**
```typescript
class TickerCubit extends Cubit<number> {
  interval = setInterval(() => this.emit(this.state + 1), 1000);
}
```

**After:**
```typescript
class TickerCubit extends Cubit<number> {
  interval?: NodeJS.Timeout;

  constructor() {
    super(0);

    this.onDisposalScheduled = () => {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = undefined;
      }
    };

    this.interval = setInterval(() => this.emit(this.state + 1), 1000);
  }
}
```

---

### Pattern 2: Timer Cleanup

**Before:**
```typescript
class DelayedCubit extends Cubit<string> {
  constructor() {
    super('initial');

    setTimeout(() => {
      this.emit('updated');
    }, 5000);
  }
}
```

**After:**
```typescript
class DelayedCubit extends Cubit<string> {
  private timerId?: NodeJS.Timeout;

  constructor() {
    super('initial');

    this.onDisposalScheduled = () => {
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = undefined;
      }
    };

    this.timerId = setTimeout(() => {
      this.emit('updated');
    }, 5000);
  }
}
```

---

### Pattern 3: Async Operation Cancellation

**Before:**
```typescript
class DataFetcherBloc extends Bloc<DataState, DataEvents> {
  constructor() {
    super(initialState);

    this.on(FetchDataEvent, async (event, emit) => {
      const data = await fetch('/api/data');
      emit({ data: await data.json() });
    });
  }
}
```

**After:**
```typescript
class DataFetcherBloc extends Bloc<DataState, DataEvents> {
  private abortController = new AbortController();

  constructor() {
    super(initialState);

    this.onDisposalScheduled = () => {
      this.abortController.abort();
    };

    this.on(FetchDataEvent, async (event, emit) => {
      try {
        const data = await fetch('/api/data', {
          signal: this.abortController.signal,
        });
        emit({ data: await data.json() });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    });
  }
}
```

---

### Pattern 4: Connection Cleanup

**Before:**
```typescript
class WebSocketBloc extends Bloc<WsState, WsEvents> {
  constructor(private ws: WebSocket) {
    super(initialState);

    this.ws.onmessage = (event) => {
      this.add(new MessageReceivedEvent(event.data));
    };
  }
}
```

**After:**
```typescript
class WebSocketBloc extends Bloc<WsState, WsEvents> {
  constructor(private ws: WebSocket) {
    super(initialState);

    this.onDisposalScheduled = () => {
      // Stop receiving messages
      this.ws.onmessage = null;
    };

    this.onDispose = () => {
      // Close connection when fully disposed
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
    };

    this.ws.onmessage = (event) => {
      this.add(new MessageReceivedEvent(event.data));
    };
  }
}
```

---

## Troubleshooting

### Issue: "Cannot emit state on DISPOSAL_REQUESTED bloc"

**Symptom:**
```
Error: [MyCubit:123] Cannot emit state on DISPOSAL_REQUESTED bloc.
       State update ignored.
       If this bloc uses setInterval/setTimeout, clean up in onDisposalScheduled hook.
```

**Cause:** An interval, timer, or async operation is trying to emit state after disposal was scheduled.

**Solution:** Add an `onDisposalScheduled` hook to clean up the resource:

```typescript
class MyCubit extends Cubit<State> {
  interval?: NodeJS.Timeout;

  constructor() {
    super(initialState);

    // Add this hook
    this.onDisposalScheduled = () => {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = undefined;
      }
    };

    this.interval = setInterval(() => {
      this.emit(newState);
    }, 1000);
  }
}
```

---

### Issue: Tests failing with "expected disposed, but still active"

**Symptom:**
```typescript
await new Promise(resolve => setTimeout(resolve, 150));
expect(cubit.isDisposed).toBe(true); // ❌ Fails
```

**Cause:** Tests are using old timeout-based disposal waiting pattern.

**Solution:** Update to microtask-based pattern:

```typescript
await Promise.resolve(); // Flush microtask queue
expect(cubit.isDisposed).toBe(true); // ✅ Passes
```

---

### Issue: React Strict Mode issues

**Symptom:** Components in Strict Mode behaving unexpectedly.

**Cause:** Your code may have been relying on the old `strictModeCompatibility` config.

**Solution:** Remove the config - Strict Mode support is now built-in and always enabled. No code changes needed.

---

### Issue: Disposal seems "too fast"

**Symptom:** Disposal happens immediately, causing unexpected behavior.

**Cause:** Disposal is now microtask-based (sub-millisecond) instead of timeout-based (100ms+).

**Solution:** This is intended behavior. If you need to prevent disposal:
- Use `static keepAlive = true` for persistent Blocs
- Maintain an active subscription
- Use plugins to control disposal logic

---

## Performance Impact

### Improvements

- **Disposal speed**: ~100-150ms → <1ms (100x+ faster)
- **React Strict Mode**: No extra instances created
- **Memory usage**: Reduced due to faster cleanup
- **Test performance**: Tests run faster with microtask pattern

### Benchmarks

```typescript
// v1.x: ~150ms per disposal
for (let i = 0; i < 100; i++) {
  const cubit = new TestCubit();
  const unsub = cubit.subscribe(() => {});
  unsub();
  await new Promise(resolve => setTimeout(resolve, 150));
}
// Total: ~15 seconds

// v2.0: <1ms per disposal
for (let i = 0; i < 100; i++) {
  const cubit = new TestCubit();
  const unsub = cubit.subscribe(() => {});
  unsub();
  await Promise.resolve();
}
// Total: <100ms (150x faster!)
```

---

## Additional Resources

### Documentation
- [BlaC v2.0 Lifecycle Guide](../../../docs/lifecycle.md)
- [API Reference: Lifecycle Hooks](../../../docs/api/lifecycle-hooks.md)
- [React Integration Guide](../../../docs/react-integration.md)

### Specification Documents
- [Disposal System Specifications](./specifications.md)
- [Technical Research](./research.md)
- [Design Discussion](./discussion.md)
- [Implementation Plan](./plan.md)

### Example Code
- [Lifecycle Hook Examples](../../../examples/lifecycle-hooks.ts)
- [Playground Examples](../../../apps/playground/src/examples/)

---

## Getting Help

If you encounter issues during migration:

1. **Check the error messages** - They now include helpful guidance
2. **Review this migration guide** - Common patterns are documented above
3. **Check existing tests** - See how they've been updated
4. **Open an issue** - Include error messages and code samples

---

**Last Updated:** 2025-01-10
**Version:** 2.0.0
**Status:** Final
