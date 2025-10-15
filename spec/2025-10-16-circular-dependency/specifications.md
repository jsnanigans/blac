# Specifications: Circular Dependency Fix

**Issue ID:** Critical-Stability-003
**Component:** Blac / BlocBase
**Priority:** High (Stability / Architecture)
**Status:** Verified

---

## Problem Statement

The core architecture has a circular dependency between `Blac` and `BlocBase` classes, where each imports and depends on the other. This creates tight coupling, makes testing difficult, and can cause initialization order issues.

### Verified Code Location
- **File 1:** `packages/blac/src/BlocBase.ts:11` - `import { Blac } from './Blac'`
- **File 2:** `packages/blac/src/Blac.ts:1` - `import { BlocBase } from './BlocBase'`

---

## Root Cause Analysis

### Current Circular Dependency

**BlocBase depends on Blac:**
```typescript
// BlocBase.ts:11
import { Blac } from './Blac';

export abstract class BlocBase<S> {
  blacInstance?: Blac;  // ← BlocBase holds reference to Blac

  // Used throughout BlocBase:
  this.blacInstance?.error(...);
  this.blacInstance?.log(...);
  this.blacInstance?.warn(...);
  this.blacInstance?.plugins.notifyStateChanged(...);
}
```

**Blac depends on BlocBase:**
```typescript
// Blac.ts:1
import { BlocBase, BlocInstanceId } from './BlocBase';

export class Blac {
  // Manages BlocBase instances:
  blocInstanceMap: Map<string, BlocBase<unknown>> = new Map();
  isolatedBlocMap: Map<BlocConstructor<any>, BlocBase<unknown>[]> = new Map();
  uidRegistry: Map<string, BlocBase<unknown>> = new Map();
  keepAliveBlocs: Set<BlocBase<unknown>> = new Set();

  // Methods that work with BlocBase:
  disposeBloc(bloc: BlocBase<unknown>): void { /* ... */ }
  registerBlocInstance(bloc: BlocBase<unknown>): void { /* ... */ }
  // ... many more
}
```

### What BlocBase Actually Needs from Blac

Looking at all usages of `blacInstance` in BlocBase:

1. **Logging methods** (lines 231, 256, 268, 370, 428, 437, 473, 485, 497, 501):
   ```typescript
   this.blacInstance?.error(message, ...args);
   this.blacInstance?.log(message, ...args);
   this.blacInstance?.warn(message, ...args);
   ```

2. **Plugin notifications** (line 256, 392):
   ```typescript
   this.blacInstance?.plugins.notifyStateChanged(this, oldState, newState);
   this.blacInstance?.plugins.notifyBlocDisposed(this);
   ```

3. **That's it!** BlocBase only needs:
   - Logging interface (log, error, warn)
   - Plugin notifications

### Dependency Graph

```
┌──────────┐
│   Blac   │
│          │
│ - log()  │
│ - error()│◄────┐
│ - warn() │     │
│ - plugins│     │ Depends on Blac
└──────────┘     │ for logging & plugins
      │          │
      │          │
      │  Depends on BlocBase
      │  for management
      ▼          │
┌──────────┐    │
│ BlocBase │────┘
│          │
│ - emit() │
│ - state  │
└──────────┘

CIRCULAR DEPENDENCY!
```

### Why This Is a Problem

1. **Tight Coupling:**
   - BlocBase can't be used without Blac
   - Blac can't be tested without BlocBase
   - Changes to one affect the other

2. **Testing Difficulty:**
   ```typescript
   // Can't test BlocBase in isolation:
   const bloc = new TestBloc();  // ← How to provide blacInstance?

   // Can't mock Blac easily:
   bloc.blacInstance = ???  // Need full Blac instance or complex mock
   ```

3. **Initialization Order Issues:**
   - JavaScript module system handles circular deps, but fragile
   - Can cause subtle bugs if initialization order changes
   - Makes hot module replacement (HMR) unreliable

4. **Code Organization:**
   - Violates Single Responsibility Principle
   - Makes dependency tree harder to understand
   - Complicates refactoring

### Current Unsafe Type Assertions (Related Issue)

As a consequence of the circular dependency, Blac must use unsafe type assertions to access BlocBase private properties:

**Location:** `packages/blac/src/Blac.ts:261, 301, 551, 765`

```typescript
// Blac needs to check disposal state:
if (
  !bloc._keepAlive &&
  (bloc as any)._disposalState === BlocLifecycleState.ACTIVE  // ← UNSAFE!
) {
  this.disposeBloc(bloc);
}
```

This is unsafe because:
- `_disposalState` is private (actually part of `_lifecycleManager`)
- TypeScript can't verify the property exists
- Can break silently if property is renamed

---

## Requirements

### Functional Requirements

1. **FR-1: Break Circular Dependency**
   - BlocBase should not import Blac
   - Blac can import BlocBase (one-way dependency)
   - BlocBase functionality must remain intact

2. **FR-2: Preserve Logging Functionality**
   - BlocBase must still be able to log messages
   - Error, warning, and info logs must work
   - No regression in logging behavior

3. **FR-3: Preserve Plugin Notifications**
   - BlocBase must notify system plugins
   - Plugin lifecycle events must fire correctly
   - No regression in plugin behavior

4. **FR-4: Testability**
   - BlocBase must be testable in isolation
   - Easy to provide test doubles for dependencies
   - No need for full Blac instance in tests

### Non-Functional Requirements

1. **NFR-1: Zero Performance Overhead**
   - Solution must not add runtime overhead
   - No additional indirection or lookups
   - Keep method calls fast

2. **NFR-2: Type Safety**
   - Remove all unsafe type assertions (`as any`)
   - Add public accessors where needed
   - Leverage TypeScript for correctness

3. **NFR-3: API Compatibility**
   - Keep current API surface unchanged
   - Internal refactor only
   - Existing code continues to work

4. **NFR-4: Maintainability**
   - Clear dependency direction
   - Self-documenting interfaces
   - Easy to extend in future

---

## Constraints

1. **C-1: No Breaking Changes**
   - Current BlocBase API must remain unchanged
   - Current Blac API must remain unchanged
   - Internal implementation can change

2. **C-2: Keep Functionality**
   - All logging must continue to work
   - All plugin notifications must continue to work
   - No regression in behavior

3. **C-3: Backwards Compatibility**
   - User specified "backwards compatibility is not a concern"
   - But internal code should minimize changes
   - Prefer refactoring over rewriting

4. **C-4: No External Dependencies**
   - Solution must use only TypeScript interfaces
   - No new npm packages
   - No framework-specific solutions

---

## Success Criteria

### Must Have
1. ✅ Zero circular dependencies (verified by TypeScript compiler)
2. ✅ BlocBase can be imported without importing Blac
3. ✅ All logging functionality works
4. ✅ All plugin notifications work
5. ✅ All existing tests pass
6. ✅ No unsafe type assertions (`as any` removed)

### Should Have
1. ✅ BlocBase testable in isolation
2. ✅ Easy to mock dependencies in tests
3. ✅ Clear interface contracts
4. ✅ Zero performance overhead
5. ✅ Type-safe throughout

### Nice to Have
1. 🔵 Simplified dependency injection
2. 🔵 Better separation of concerns
3. 🔵 Easier to extend in future

---

## Proposed Solution Approaches

### Option A: Extract Context Interface (Recommended in RV.md)
Create a `BlacContext` interface that BlocBase depends on, Blac implements.

**Advantages:**
- Breaks circular dependency
- Clear contract
- Testable

**Disadvantages:**
- Adds interface layer
- Requires dependency injection

### Option B: Event Bus / Observer Pattern
BlocBase emits events, Blac listens.

**Advantages:**
- Completely decoupled
- Very testable

**Disadvantages:**
- Adds complexity
- Potential performance overhead
- Less direct

### Option C: Inversion of Control / Callbacks
Pass callbacks to BlocBase instead of Blac reference.

**Advantages:**
- Simple
- Testable

**Disadvantages:**
- Many callbacks needed (log, error, warn, plugins)
- API becomes verbose

### Option D: Static Service Locator
Use static methods to access services without direct dependency.

**Advantages:**
- No dependency injection needed
- Simple to use

**Disadvantages:**
- Global state (already have this)
- Still some coupling
- Harder to test

---

## Test Requirements

### Unit Tests Required

1. **Test: BlocBase Without Blac**
   ```typescript
   it('should work without Blac instance', () => {
     const cubit = new TestCubit(0);

     // Should not throw
     cubit.increment();

     expect(cubit.state).toBe(1);
   });
   ```

2. **Test: BlocBase With Mock Context**
   ```typescript
   it('should use provided context for logging', () => {
     const mockContext = {
       log: jest.fn(),
       error: jest.fn(),
       warn: jest.fn(),
       plugins: {
         notifyStateChanged: jest.fn(),
         notifyBlocDisposed: jest.fn(),
       },
     };

     const cubit = new TestCubit(0);
     cubit.blacContext = mockContext;  // or however we inject it

     cubit.increment();  // Triggers state change

     expect(mockContext.plugins.notifyStateChanged).toHaveBeenCalled();
   });
   ```

3. **Test: Blac Can Still Manage Blocs**
   ```typescript
   it('should manage bloc lifecycle', () => {
     const blac = new Blac();
     const bloc = blac.getBloc(TestBloc);

     expect(bloc.blacInstance).toBe(blac);  // or blacContext
     expect(blac.uidRegistry.has(bloc.uid)).toBe(true);
   });
   ```

4. **Test: No Circular Import**
   ```typescript
   // This test is implicit - if there's a circular dependency,
   // TypeScript compilation will fail or show warnings

   it('should not have circular dependency', () => {
     // If this test runs, TypeScript compilation succeeded
     expect(true).toBe(true);
   });
   ```

### Integration Tests Required

1. **Test: Full Logging Flow**
   ```typescript
   it('should log from BlocBase through Blac', () => {
     Blac.enableLog = true;
     const logSpy = jest.fn();
     Blac.logSpy = logSpy;

     const bloc = Blac.instance.getBloc(TestBloc);
     bloc.doSomethingThatLogs();

     expect(logSpy).toHaveBeenCalled();
   });
   ```

2. **Test: Plugin Notifications**
   ```typescript
   it('should notify plugins of state changes', () => {
     const plugin = {
       name: 'TestPlugin',
       onStateChanged: jest.fn(),
     };

     Blac.instance.plugins.add(plugin);

     const bloc = Blac.instance.getBloc(TestBloc);
     bloc.emit(newState);

     expect(plugin.onStateChanged).toHaveBeenCalledWith(bloc, oldState, newState);
   });
   ```

---

## Out of Scope

1. ❌ Changes to plugin system architecture
2. ❌ Changes to subscription system
3. ❌ Changes to lifecycle management (beyond access to state)
4. ❌ Performance optimizations beyond removing overhead
5. ❌ Changes to public API

---

## Dependencies

### Code Dependencies
- Need to create interface for context
- BlocBase must accept context (constructor or setter)
- Blac must implement context interface
- All usages of `blacInstance` must be updated to `blacContext`

### Test Dependencies
- Vitest test framework
- Jest mock utilities
- TypeScript compiler for verification

---

## Acceptance Checklist

- [ ] Circular dependency verified and documented
- [ ] Solution designed with clear interfaces
- [ ] Implementation completed
- [ ] No circular imports (verified by tsc)
- [ ] All logging works
- [ ] All plugin notifications work
- [ ] No unsafe type assertions
- [ ] BlocBase testable in isolation
- [ ] All existing tests pass
- [ ] New tests demonstrate isolation
- [ ] Code review completed
- [ ] No performance regression

---

## Notes

### Current Dependency Locations

**BlocBase uses blacInstance for:**
1. Line 231: Error logging (state emission on non-ACTIVE bloc)
2. Line 256: Plugin notification (state changed)
3. Line 268: Info logging (scheduling disposal)
4. Line 370: Error logging (onDispose hook error)
5. Line 392: Plugin notification (bloc disposed)
6. Line 428: Error logging (onDisposalScheduled hook error)
7. Line 437: Info logging (scheduling disposal)
8. Line 473: Info logging (attempting to cancel disposal)
9. Line 485: Warning (cannot cancel - already disposing)
10. Line 497: Info logging (successfully cancelled disposal)
11. Line 501: Error logging (failed to cancel disposal)

**Blac uses BlocBase for:**
- Registry management (blocInstanceMap, isolatedBlocMap, uidRegistry)
- Lifecycle management (dispose, register, unregister)
- Query methods (find, getAll)

### Why Interface Approach Is Best

1. **Clear Contract:** Interface defines exactly what BlocBase needs
2. **Testability:** Easy to create test doubles
3. **Flexibility:** Blac can implement, but others could too
4. **Type Safety:** TypeScript enforces contract
5. **Performance:** Zero runtime overhead (interfaces are compile-time only)

---

**Ready for solution research and analysis.**
