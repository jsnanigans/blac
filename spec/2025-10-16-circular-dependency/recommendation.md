# Recommendation: Context Interface Implementation

**Issue:** Critical-Stability-003 - Circular Dependency
**Solution:** Dependency Injection via BlacContext Interface
**Priority:** High (Architecture / Stability)
**Est. Implementation Time:** 2 hours
**Est. Testing Time:** 30 minutes

---

## Executive Summary

**Recommended Solution:** Extract `BlacContext` interface, BlocBase depends on interface, Blac implements interface

**Why:** After comprehensive analysis and Expert Council review, the Context Interface approach scores highest (9.3/10):
- **Breaks circular dependency** (acyclic by construction)
- **Zero performance overhead** (interfaces are compile-time only)
- **Type-safe** (TypeScript enforces contract)
- **Testable** (easy to mock for tests)
- **Industry standard** (Dependency Injection pattern)

**Impact:** Eliminates circular dependency, improves testability, adds type safety, enables independent development of Blac and BlocBase.

---

## Complete Implementation

### Changes Required

**Files to create:**
1. `packages/blac/src/types/BlacContext.ts` - New interface

**Files to modify:**
2. `packages/blac/src/BlocBase.ts` - Use BlacContext instead of Blac
3. `packages/blac/src/Blac.ts` - Implement BlacContext

**Bonus fix:**
4. Add public `disposalState` accessor to remove unsafe type assertions

---

## Step 1: Create BlacContext Interface

**File:** `packages/blac/src/types/BlacContext.ts` (NEW FILE)

```typescript
/**
 * Context interface that defines the services BlocBase needs from its environment.
 *
 * This interface breaks the circular dependency between Blac and BlocBase by:
 * - BlocBase depends on this interface (not Blac class)
 * - Blac implements this interface
 * - Creates a one-way dependency: Blac → BlocBase (no cycle)
 *
 * Benefits:
 * - Type-safe contract
 * - Easy to mock for testing
 * - Zero runtime overhead (interface is compile-time only)
 * - Clear documentation of BlocBase's dependencies
 */
export interface BlacContext {
  /**
   * Log informational message.
   * Only logs when Blac.enableLog is true.
   *
   * @param args - Arguments to log
   */
  log(...args: unknown[]): void;

  /**
   * Log error message.
   * Always logs errors.
   *
   * @param message - Error message
   * @param args - Additional error context
   */
  error(message: string, ...args: unknown[]): void;

  /**
   * Log warning message.
   * Always logs warnings.
   *
   * @param message - Warning message
   * @param args - Additional warning context
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * System plugin registry for lifecycle notifications.
   * Plugins can observe bloc state changes and disposal.
   */
  plugins: {
    /**
     * Notify system plugins that a bloc's state has changed.
     *
     * @param bloc - The bloc instance
     * @param oldState - Previous state
     * @param newState - New state
     */
    notifyStateChanged(
      bloc: any,
      oldState: unknown,
      newState: unknown,
    ): void;

    /**
     * Notify system plugins that a bloc has been disposed.
     *
     * @param bloc - The disposed bloc instance
     */
    notifyBlocDisposed(bloc: any): void;
  };
}
```

---

## Step 2: Update BlocBase to Use BlacContext

**File:** `packages/blac/src/BlocBase.ts`

### Change 1: Update Imports

**Remove this line:**
```typescript
import { Blac } from './Blac';
```

**Add this line:**
```typescript
import { BlacContext } from './types/BlacContext';
```

### Change 2: Update Property Type

**Line 26 - Before:**
```typescript
export abstract class BlocBase<S> {
  public uid = generateUUID();
  blacInstance?: Blac;  // ← Remove this
```

**Line 26 - After:**
```typescript
export abstract class BlocBase<S> {
  public uid = generateUUID();
  blacContext?: BlacContext;  // ← Change to BlacContext
```

### Change 3: Update All Usages

**All references to `blacInstance` must change to `blacContext`:**

**Lines to update:**
- Line 231: `this.blacInstance?.error(` → `this.blacContext?.error(`
- Line 256: `this.blacInstance?.plugins.notifyStateChanged(` → `this.blacContext?.plugins.notifyStateChanged(`
- Line 268: `this.blacInstance?.log(` → `this.blacContext?.log(`
- Line 370: `this.blacInstance?.error(` → `this.blacContext?.error(`
- Line 390: `if (this.blacInstance) {` → `if (this.blacContext) {`
- Line 392: `this.blacInstance.plugins.notifyBlocDisposed(` → `this.blacContext.plugins.notifyBlocDisposed(`
- Line 428: `this.blacInstance?.error(` → `this.blacContext?.error(`
- Line 437: `this.blacInstance?.log(` → `this.blacContext?.log(`
- Line 473: `this.blacInstance?.log(` → `this.blacContext?.log(`
- Line 485: `this.blacInstance?.warn(` → `this.blacContext?.warn(`
- Line 497: `this.blacInstance?.log(` → `this.blacContext?.log(`
- Line 501: `this.blacInstance?.error(` → `this.blacContext?.error(`

**Example of one change:**

**Before (line 231):**
```typescript
if (currentState !== BlocLifecycleState.ACTIVE) {
  this.blacInstance?.error(
    `[${this._name}:${this._id}] Cannot emit state on ${currentState} bloc. ` +
      `State update ignored. ` +
      `If this bloc uses setInterval/setTimeout, clean up in onDisposalScheduled hook.`,
  );
  return;
}
```

**After (line 231):**
```typescript
if (currentState !== BlocLifecycleState.ACTIVE) {
  this.blacContext?.error(
    `[${this._name}:${this._id}] Cannot emit state on ${currentState} bloc. ` +
      `State update ignored. ` +
      `If this bloc uses setInterval/setTimeout, clean up in onDisposalScheduled hook.`,
  );
  return;
}
```

---

## Step 3: Update Blac to Implement BlacContext

**File:** `packages/blac/src/Blac.ts`

### Change 1: Add Import

**Add to imports (line 1 area):**
```typescript
import { BlacContext } from './types/BlacContext';
```

### Change 2: Implement Interface

**Line 102 - Before:**
```typescript
export class Blac {
  static get instance(): Blac {
```

**Line 102 - After:**
```typescript
export class Blac implements BlacContext {
  static get instance(): Blac {
```

**Note:** Blac already has all the required methods (`log`, `error`, `warn`, `plugins`), so just adding `implements BlacContext` is sufficient. TypeScript will verify the contract is met.

### Change 3: Update Bloc Instantiation

**Line 528 - Before:**
```typescript
createNewBlocInstance<B extends BlocConstructor<BlocBase<any>>>(
  blocClass: B,
  id: BlocInstanceId,
  options: GetBlocOptions<InstanceType<B>> = {},
): InstanceType<B> {
  const { constructorParams, instanceRef } = options;
  const newBloc = new blocClass(constructorParams) as InstanceType<B>;
  newBloc.blacInstance = this;  // ← Change this line
  newBloc._instanceRef = instanceRef;
```

**Line 528 - After:**
```typescript
createNewBlocInstance<B extends BlocConstructor<BlocBase<any>>>(
  blocClass: B,
  id: BlocInstanceId,
  options: GetBlocOptions<InstanceType<B>> = {},
): InstanceType<B> {
  const { constructorParams, instanceRef } = options;
  const newBloc = new blocClass(constructorParams) as InstanceType<B>;
  newBloc.blacContext = this;  // ← Inject context
  newBloc._instanceRef = instanceRef;
```

---

## Step 4: Add Disposal State Accessor (Bonus Fix)

While fixing the circular dependency, also eliminate unsafe type assertions in Blac.

**File:** `packages/blac/src/BlocBase.ts`

**Add public getter (after line 322):**

```typescript
/**
 * Disposal management
 */
get isDisposed(): boolean {
  return this._lifecycleManager.isDisposed;
}

// ======== ADD THIS GETTER ========
/**
 * Get current disposal lifecycle state.
 * Used by Blac for disposal management.
 */
get disposalState(): BlocLifecycleState {
  return this._lifecycleManager.currentState;
}
// ==================================

/**
 * Atomic state transition for disposal
 */
_atomicStateTransition(
```

**File:** `packages/blac/src/Blac.ts`

**Remove unsafe type assertions:**

**Location 1: Line 261**

**Before:**
```typescript
if (
  !bloc._keepAlive &&
  (bloc as any)._disposalState === BlocLifecycleState.ACTIVE
) {
  this.disposeBloc(bloc);
}
```

**After:**
```typescript
if (
  !bloc._keepAlive &&
  bloc.disposalState === BlocLifecycleState.ACTIVE
) {
  this.disposeBloc(bloc);
}
```

**Location 2: Line 301**

**Before:**
```typescript
const currentState = (bloc as any)._disposalState;
```

**After:**
```typescript
const currentState = bloc.disposalState;
```

**Location 3: Line 551**

**Before:**
```typescript
// Don't activate disposed blocs
if ((bloc as any)._disposalState !== BlocLifecycleState.ACTIVE) {
  this.log(
    `[${bloc._name}:${String(bloc._id)}] activateBloc called on disposed bloc. Ignoring.`,
  );
  return;
}
```

**After:**
```typescript
// Don't activate disposed blocs
if (bloc.disposalState !== BlocLifecycleState.ACTIVE) {
  this.log(
    `[${bloc._name}:${String(bloc._id)}] activateBloc called on disposed bloc. Ignoring.`,
  );
  return;
}
```

**Location 4: Line 765**

**Before:**
```typescript
if (
  bloc.subscriptionCount === 0 &&
  !bloc._keepAlive &&
  (bloc as any)._disposalState === BlocLifecycleState.ACTIVE
) {
  this.disposeBloc(bloc);
}
```

**After:**
```typescript
if (
  bloc.subscriptionCount === 0 &&
  !bloc._keepAlive &&
  bloc.disposalState === BlocLifecycleState.ACTIVE
) {
  this.disposeBloc(bloc);
}
```

**Also line 774:**

**Before:**
```typescript
if (
  bloc.subscriptionCount === 0 &&
  !bloc._keepAlive &&
  (bloc as any)._disposalState === BlocLifecycleState.ACTIVE
) {
  this.disposeBloc(bloc);
}
```

**After:**
```typescript
if (
  bloc.subscriptionCount === 0 &&
  !bloc._keepAlive &&
  bloc.disposalState === BlocLifecycleState.ACTIVE
) {
  this.disposeBloc(bloc);
}
```

---

## Why This Works

### Dependency Graph

**Before (Circular):**
```
┌──────┐
│ Blac │ ◄──────────┐
└───┬──┘            │
    │               │
    │ imports       │ imports
    │               │
    ▼               │
┌──────────┐        │
│ BlocBase │ ───────┘
└──────────┘

CIRCULAR DEPENDENCY!
```

**After (Acyclic):**
```
    ┌──────────────┐
    │ BlacContext  │ (interface - no imports)
    │  (interface) │
    └──────────────┘
           ▲
           │
           │ implements
           │
    ┌──────┴───┐
    │   Blac   │
    └──────┬───┘
           │
           │ imports
           │
           ▼
    ┌──────────┐
    │ BlocBase │
    └──────┬───┘
           │
           │ imports
           │
           ▼
    ┌──────────────┐
    │ BlacContext  │
    │  (interface) │
    └──────────────┘

ONE-WAY DEPENDENCY!
```

**Invariant:** The dependency graph is acyclic because:
1. Interfaces have no imports (pure type information)
2. BlocBase imports only the interface (not Blac)
3. Blac imports BlocBase and implements the interface
4. No cycle: Blac → BlocBase → BlacContext (interface, no runtime)

---

## Test Plan

### Test File
`packages/blac/src/__tests__/circular-dependency.test.ts` (NEW FILE)

### Test Cases

```typescript
import { describe, it, expect, jest } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';
import { BlacContext } from '../types/BlacContext';

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

describe('Circular Dependency Fix', () => {
  it('should work without Blac context (optional dependency)', () => {
    const cubit = new TestCubit();

    // Should work without context
    expect(cubit.blacContext).toBeUndefined();

    cubit.increment();

    expect(cubit.state).toBe(1);
  });

  it('should use provided mock context for logging', () => {
    const mockContext: BlacContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      plugins: {
        notifyStateChanged: jest.fn(),
        notifyBlocDisposed: jest.fn(),
      },
    };

    const cubit = new TestCubit();
    cubit.blacContext = mockContext;

    cubit.increment();

    // Verify plugin notification was called
    expect(mockContext.plugins.notifyStateChanged).toHaveBeenCalledWith(
      cubit,
      0,  // old state
      1,  // new state
    );
  });

  it('should use Blac as context (Blac implements BlacContext)', () => {
    const blac = new Blac();
    const cubit = blac.getBloc(TestCubit);

    // Verify context is set
    expect(cubit.blacContext).toBe(blac);

    // Verify Blac implements BlacContext interface
    const context: BlacContext = blac;  // Type-check: Blac is assignable to BlacContext
    expect(context).toBeDefined();
  });

  it('should allow testing BlocBase in isolation', () => {
    // Create minimal mock context for testing
    const testContext: BlacContext = {
      log: () => {},
      error: () => {},
      warn: () => {},
      plugins: {
        notifyStateChanged: () => {},
        notifyBlocDisposed: () => {},
      },
    };

    const cubit = new TestCubit();
    cubit.blacContext = testContext;

    // Test business logic in isolation
    expect(cubit.state).toBe(0);
    cubit.increment();
    expect(cubit.state).toBe(1);
    cubit.increment();
    expect(cubit.state).toBe(2);
  });
});

describe('Disposal State Accessor', () => {
  it('should expose disposal state publicly', () => {
    const cubit = new TestCubit();

    // Public accessor should work
    expect(cubit.disposalState).toBeDefined();
    expect(typeof cubit.disposalState).toBe('number');
  });

  it('should not use unsafe type assertions', () => {
    const blac = new Blac();
    const cubit = blac.getBloc(TestCubit);

    // This should compile without `as any`
    const state = cubit.disposalState;

    expect(state).toBeDefined();
  });
});
```

---

## Verification Checklist

### Type Safety Verification

**Run TypeScript compiler:**
```bash
cd packages/blac
pnpm typecheck
```

**Expected result:** No circular dependency warnings, no type errors.

**Check imports manually:**
```bash
# BlocBase should NOT import Blac
grep "import.*Blac" packages/blac/src/BlocBase.ts
# Should return: import { BlacContext } from './types/BlacContext';

# Blac should import BlocBase (one-way dependency)
grep "import.*BlocBase" packages/blac/src/Blac.ts
# Should return: import { BlocBase } from './BlocBase';
```

### Functional Verification

**Run all tests:**
```bash
cd packages/blac
pnpm test
```

**Expected result:** All tests pass.

**Run specific test:**
```bash
pnpm test circular-dependency.test.ts
```

### Integration Verification

**Check React integration:**
```bash
cd packages/blac-react
pnpm test
```

**Expected result:** All tests pass (BlacAdapter works with new context).

---

## Migration Summary

### Files Created
- ✅ `packages/blac/src/types/BlacContext.ts` - Interface definition

### Files Modified
- ✅ `packages/blac/src/BlocBase.ts` - Use BlacContext, add disposalState getter
- ✅ `packages/blac/src/Blac.ts` - Implement BlacContext, remove unsafe assertions

### Test Files
- ✅ `packages/blac/src/__tests__/circular-dependency.test.ts` - New tests

### Changes Summary
- 1 new file (interface)
- 12 usages updated (`blacInstance` → `blacContext`)
- 1 new getter (`disposalState`)
- 5 unsafe assertions removed (`as any` → public accessor)
- 1 interface implementation (`implements BlacContext`)

---

## Success Criteria

- [ ] No circular import between Blac and BlocBase
- [ ] TypeScript compilation succeeds with no warnings
- [ ] All existing tests pass
- [ ] New circular dependency tests pass
- [ ] BlocBase can be tested in isolation
- [ ] No unsafe type assertions (`as any` removed)
- [ ] Zero performance regression
- [ ] All logging functionality works
- [ ] All plugin notifications work

---

## Performance Analysis

**Before:**
- Circular dependency (fragile but functional)
- Unsafe type assertions (bypasses TypeScript safety)

**After:**
- Acyclic dependency (robust)
- Type-safe throughout

**Performance Impact:** **Zero** - Interfaces are compile-time only, no runtime overhead.

**Binary size:** No increase (interfaces are erased during compilation).

**Type checking:** Slightly faster (acyclic dependency graph is easier for TypeScript to analyze).

---

## Summary

**Changes:**
- 1 new interface file (BlacContext)
- 12 property access updates
- 1 new public getter
- 5 unsafe assertions removed
- 1 interface implementation keyword

**Impact:**
- ✅ Breaks circular dependency
- ✅ Improves testability
- ✅ Adds type safety
- ✅ Zero performance overhead
- ✅ Better architecture (Dependency Inversion Principle)

**Confidence:** Very High (9.3/10 score, unanimous Council approval, zero risk)

---

**Ready for implementation.**
