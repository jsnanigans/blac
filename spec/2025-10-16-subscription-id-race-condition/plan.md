# Implementation Plan: Subscription ID Race Condition Fix

**Issue:** Critical-Stability-002
**Priority:** Critical (Stability)
**Approach:** Option A - Return Object with ID and Unsubscribe
**Estimated Total Time:** 3-4 hours
**Date:** 2025-10-16

---

## Executive Summary

This plan implements the fix for the subscription ID race condition in BlacAdapter by modifying subscription methods to return `{ id: string; unsubscribe: () => void }` instead of just the unsubscribe function. This eliminates unsafe ID guessing and type assertions.

**Key Decision:** Option A (Return Object) selected based on:
- Unanimous Council recommendation
- Simplest implementation (no code duplication)
- Strongest type safety
- User confirmation: "backwards compatibility is not a concern"

---

## Phase 1: Core Subscription API Changes

### Task 1.1: Define SubscriptionResult Type
- [ ] #S:s #P
- **File:** `packages/blac/src/types/subscription.ts` (or inline in SubscriptionManager)
- **Description:** Define the new return type for subscription methods
- **Details:**
  ```typescript
  export interface SubscriptionResult {
    id: string;
    unsubscribe: () => void;
  }
  ```
- **Success Criteria:**
  - Type exported and available
  - TypeScript compiles without errors
  - Clear JSDoc comments explaining usage

### Task 1.2: Update SubscriptionManager.subscribe()
- [ ] #S:m
- **File:** `packages/blac/src/subscription/SubscriptionManager.ts`
- **Line Range:** ~25-68
- **Description:** Change return type from `() => void` to `SubscriptionResult`
- **Changes:**
  ```typescript
  // Before:
  subscribe(options: SubscriptionOptions<S>): () => void {
    const id = `${options.type}-${generateUUID()}`;
    // ...
    return () => this.unsubscribe(id);
  }

  // After:
  subscribe(options: SubscriptionOptions<S>): SubscriptionResult {
    const id = `${options.type}-${generateUUID()}`;
    // ...
    return {
      id,
      unsubscribe: () => this.unsubscribe(id)
    };
  }
  ```
- **Success Criteria:**
  - Returns object with `id` and `unsubscribe`
  - All usages updated (will be handled in Phase 2)
  - No type assertions (`as any`)

### Task 1.3: Update SubscriptionManager.subscribeWithSelector()
- [ ] #S:m
- **File:** `packages/blac/src/subscription/SubscriptionManager.ts`
- **Line Range:** ~70-120
- **Description:** Change return type to `SubscriptionResult`
- **Changes:** Similar to Task 1.2
- **Success Criteria:**
  - Returns object with `id` and `unsubscribe`
  - Selector logic unchanged
  - Type-safe throughout

---

## Phase 2: BlocBase API Updates

### Task 2.1: Update BlocBase.subscribe()
- [ ] #S:m
- **File:** `packages/blac/src/BlocBase.ts`
- **Line Range:** ~170-180
- **Description:** Update to pass through new return type
- **Changes:**
  ```typescript
  // Before:
  subscribe(callback: (state: S) => void): () => void {
    return this._subscriptionManager.subscribe({
      type: 'observer',
      notify: callback,
    });
  }

  // After:
  subscribe(callback: (state: S) => void): SubscriptionResult {
    return this._subscriptionManager.subscribe({
      type: 'observer',
      notify: callback,
    });
  }
  ```
- **Success Criteria:**
  - Return type matches SubscriptionResult
  - No behavior changes

### Task 2.2: Update BlocBase.subscribeComponent()
- [ ] #S:m
- **File:** `packages/blac/src/BlocBase.ts`
- **Line Range:** ~191-200
- **Description:** Update to return SubscriptionResult
- **Changes:**
  ```typescript
  // Before:
  subscribeComponent(
    componentRef: WeakRef<object>,
    callback: () => void,
  ): () => void {
    return this._subscriptionManager.subscribe({
      type: 'consumer',
      weakRef: componentRef,
      notify: callback,
    });
  }

  // After:
  subscribeComponent(
    componentRef: WeakRef<object>,
    callback: () => void,
  ): SubscriptionResult {
    return this._subscriptionManager.subscribe({
      type: 'consumer',
      weakRef: componentRef,
      notify: callback,
    });
  }
  ```
- **Success Criteria:**
  - Return type matches SubscriptionResult
  - WeakRef handling unchanged

### Task 2.3: Update BlocBase.subscribeWithSelector()
- [ ] #S:m
- **File:** `packages/blac/src/BlocBase.ts`
- **Line Range:** ~202-215
- **Description:** Update to return SubscriptionResult
- **Success Criteria:**
  - Return type matches SubscriptionResult
  - Selector functionality unchanged

---

## Phase 3: BlacAdapter Integration (Critical Fix)

### Task 3.1: Update BlacAdapter.createSubscription() - Component Path
- [ ] #S:l
- **File:** `packages/blac/src/adapter/BlacAdapter.ts`
- **Line Range:** ~136-187
- **Description:** Remove unsafe ID guessing, use returned ID
- **Changes:**
  ```typescript
  // Before (UNSAFE):
  const weakRef = new WeakRef(this.componentRef.current);
  this.unsubscribe = this.blocInstance.subscribeComponent(
    weakRef,
    options.onChange,
  );

  // Get the subscription ID for tracking
  const subscriptions = (this.blocInstance._subscriptionManager as any)
    .subscriptions as Map<string, any>;
  this.subscriptionId = Array.from(subscriptions.keys()).pop(); // ❌ RACE CONDITION!

  // After (SAFE):
  const weakRef = new WeakRef(this.componentRef.current);
  const result = this.blocInstance.subscribeComponent(
    weakRef,
    options.onChange,
  );

  this.unsubscribe = result.unsubscribe;
  this.subscriptionId = result.id; // ✅ Direct, type-safe, race-free
  ```
- **Success Criteria:**
  - No `as any` type assertions
  - No Array.from().pop() guessing
  - Correct subscription ID captured
  - All existing functionality preserved

### Task 3.2: Update BlacAdapter.createSubscription() - Selector Path
- [ ] #S:m
- **File:** `packages/blac/src/adapter/BlacAdapter.ts`
- **Line Range:** ~145-160
- **Description:** Update selector-based subscription to use new API
- **Changes:**
  ```typescript
  // Before:
  this.unsubscribe = this.blocInstance.subscribeWithSelector(
    (_state) => this.options!.dependencies!(this.blocInstance),
    (newValues) => { /* ... */ },
  );

  // After:
  const result = this.blocInstance.subscribeWithSelector(
    (_state) => this.options!.dependencies!(this.blocInstance),
    (newValues) => { /* ... */ },
  );

  this.unsubscribe = result.unsubscribe;
  // Note: subscriptionId may not be needed for selector path
  ```
- **Success Criteria:**
  - Destructuring uses new return type
  - Selector logic unchanged
  - Cleanup still works

### Task 3.3: Verify trackAccess() Works Correctly
- [ ] #S:s
- **File:** `packages/blac/src/adapter/BlacAdapter.ts`
- **Line Range:** ~86-114
- **Description:** Ensure trackAccess uses correct subscription ID
- **Verification:**
  - Check that `this.subscriptionId` is set before any `trackAccess()` calls
  - Ensure ID is from current subscription, not guessed
  - Verify dependencies tracked on correct subscription
- **Success Criteria:**
  - No changes needed (should just work)
  - Dependencies correctly isolated per adapter

---

## Phase 4: Update All Internal Usages

### Task 4.1: Scan for All Direct subscribe() Calls
- [ ] #S:m #P
- **Command:** `rg "\.subscribe\(" --type ts -g "!node_modules" -g "!*.test.ts"`
- **Description:** Find all usages of subscribe methods
- **Expected Locations:**
  - BlacAdapter (already handled)
  - Tests (Phase 5)
  - Possibly plugin code
  - Example/demo code
- **Success Criteria:**
  - All usages identified
  - Create list of files to update

### Task 4.2: Update Plugin Subscriptions
- [ ] #S:m
- **Files:** Any plugins using subscribe methods
- **Description:** Update to destructure new return type
- **Changes:**
  ```typescript
  // Before:
  const cleanup = bloc.subscribe(callback);

  // After:
  const { unsubscribe } = bloc.subscribe(callback);
  ```
- **Success Criteria:**
  - All plugin code updated
  - TypeScript compiles
  - Functionality preserved

### Task 4.3: Update Demo/Example Code
- [ ] #S:s #P
- **Files:** Apps/demos that may use subscribe directly
- **Description:** Update any direct subscribe usage
- **Success Criteria:**
  - All examples work correctly
  - Demonstrate proper new API usage

---

## Phase 5: Test Updates

### Task 5.1: Update Existing Unit Tests
- [ ] #S:l
- **Files:** All test files using subscribe methods
- **Description:** Update test code to destructure new return type
- **Changes:**
  ```typescript
  // Before:
  const cleanup = bloc.subscribe(callback);
  cleanup();

  // After:
  const { unsubscribe, id } = bloc.subscribe(callback);
  unsubscribe();
  ```
- **Success Criteria:**
  - All existing tests pass
  - No test functionality changed
  - TypeScript compiles without errors

### Task 5.2: Add Race Condition Test - Concurrent Adapters
- [ ] #S:m
- **File:** `packages/blac-react/src/__tests__/adapter-race-condition.test.ts` (new file)
- **Description:** Test that concurrent adapters get unique subscription IDs
- **Test Case:**
  ```typescript
  it('should assign correct subscription IDs for concurrent adapters', () => {
    const bloc = new CounterBloc();
    const adapter1 = new BlacAdapter({
      blocConstructor: CounterBloc,
      componentRef: { current: {} }
    });
    const adapter2 = new BlacAdapter({
      blocConstructor: CounterBloc,
      componentRef: { current: {} }
    });

    // Create subscriptions synchronously (simulates concurrent mount)
    const result1 = adapter1.createSubscription({ onChange: jest.fn() });
    const result2 = adapter2.createSubscription({ onChange: jest.fn() });

    // Verify each adapter has unique subscription ID
    expect(adapter1['subscriptionId']).toBeDefined();
    expect(adapter2['subscriptionId']).toBeDefined();
    expect(adapter1['subscriptionId']).not.toBe(adapter2['subscriptionId']);

    // Verify dependency tracking works correctly for each adapter
    adapter1.trackAccess(adapter1.componentRef.current, 'state', 'count');
    adapter2.trackAccess(adapter2.componentRef.current, 'state', 'count');

    // Both should have their own dependencies
    const sub1 = bloc._subscriptionManager.getSubscription(adapter1['subscriptionId']!);
    const sub2 = bloc._subscriptionManager.getSubscription(adapter2['subscriptionId']!);

    expect(sub1?.dependencies.has('count')).toBe(true);
    expect(sub2?.dependencies.has('count')).toBe(true);
  });
  ```
- **Success Criteria:**
  - Test passes with new implementation
  - Would fail with old implementation

### Task 5.3: Add Race Condition Test - React Strict Mode
- [ ] #S:m
- **File:** Same as 5.2
- **Description:** Test mount/unmount/remount behavior
- **Test Case:**
  ```typescript
  it('should handle React Strict Mode mount/unmount/remount', () => {
    const bloc = new CounterBloc();
    const componentRef = { current: {} };

    // Mount 1
    const adapter1 = new BlacAdapter({
      blocConstructor: CounterBloc,
      componentRef
    });
    adapter1.createSubscription({ onChange: jest.fn() });
    const id1 = adapter1['subscriptionId'];

    // Unmount
    adapter1.cleanup();

    // Remount (strict mode)
    const adapter2 = new BlacAdapter({
      blocConstructor: CounterBloc,
      componentRef
    });
    adapter2.createSubscription({ onChange: jest.fn() });
    const id2 = adapter2['subscriptionId'];

    // IDs should be different
    expect(id1).not.toBe(id2);

    // Only adapter2's subscription should exist
    expect(bloc._subscriptionManager.getSubscription(id1!)).toBeUndefined();
    expect(bloc._subscriptionManager.getSubscription(id2!)).toBeDefined();
  });
  ```
- **Success Criteria:**
  - Test passes
  - Verifies strict mode compatibility

### Task 5.4: Add Race Condition Test - Multiple Blocs in Same Component
- [ ] #S:m
- **File:** Same as 5.2
- **Description:** Test multiple blocs in same render
- **Test Case:**
  ```typescript
  it('should handle multiple blocs with correct subscription IDs', () => {
    const componentRef = { current: {} };

    // Simulate useBloc(CounterBloc) and useBloc(TodoBloc) in same render
    const counterAdapter = new BlacAdapter({
      blocConstructor: CounterBloc,
      componentRef
    });
    const todoAdapter = new BlacAdapter({
      blocConstructor: TodoBloc,
      componentRef
    });

    counterAdapter.createSubscription({ onChange: jest.fn() });
    todoAdapter.createSubscription({ onChange: jest.fn() });

    // Track different paths on each adapter
    counterAdapter.trackAccess(componentRef.current, 'state', 'count');
    todoAdapter.trackAccess(componentRef.current, 'state', 'todos');

    // Verify dependencies are tracked on correct subscriptions
    const counterBloc = CounterBloc.instance;
    const todoBloc = TodoBloc.instance;

    const counterSub = counterBloc._subscriptionManager.getSubscription(
      counterAdapter['subscriptionId']!
    );
    const todoSub = todoBloc._subscriptionManager.getSubscription(
      todoAdapter['subscriptionId']!
    );

    expect(counterSub?.dependencies.has('count')).toBe(true);
    expect(counterSub?.dependencies.has('todos')).toBe(false);

    expect(todoSub?.dependencies.has('todos')).toBe(true);
    expect(todoSub?.dependencies.has('count')).toBe(false);
  });
  ```
- **Success Criteria:**
  - Test passes
  - Verifies dependency isolation

### Task 5.5: Add Dependency Tracking Isolation Test
- [ ] #S:m
- **File:** Same as 5.2
- **Description:** Verify no cross-contamination of dependencies
- **Test Case:**
  ```typescript
  it('should not contaminate dependencies across adapters', () => {
    const bloc = new CounterBloc();

    // Create two adapters for same bloc
    const adapter1 = new BlacAdapter({
      blocConstructor: CounterBloc,
      componentRef: { current: { name: 'Component1' } }
    });
    const adapter2 = new BlacAdapter({
      blocConstructor: CounterBloc,
      componentRef: { current: { name: 'Component2' } }
    });

    adapter1.createSubscription({ onChange: jest.fn() });
    adapter2.createSubscription({ onChange: jest.fn() });

    // Adapter 1 accesses 'count'
    adapter1.trackAccess(adapter1.componentRef.current, 'state', 'count');

    // Adapter 2 accesses 'doubled'
    adapter2.trackAccess(adapter2.componentRef.current, 'state', 'doubled');

    // Verify each adapter has only its own dependencies
    const sub1 = bloc._subscriptionManager.getSubscription(adapter1['subscriptionId']!);
    const sub2 = bloc._subscriptionManager.getSubscription(adapter2['subscriptionId']!);

    expect(sub1?.dependencies).toEqual(new Set(['count']));
    expect(sub2?.dependencies).toEqual(new Set(['doubled']));
  });
  ```
- **Success Criteria:**
  - Test passes
  - Proves no dependency contamination

### Task 5.6: Add Integration Test - Full useBloc Hook
- [ ] #S:l
- **File:** `packages/blac-react/src/__tests__/useBloc-race-condition.test.tsx` (new)
- **Description:** Integration test with actual React components
- **Test Case:**
  ```typescript
  it('should track dependencies correctly with concurrent useBloc calls', () => {
    function Component1() {
      const [state] = useBloc(CounterBloc);
      return <div data-testid="count">{state.count}</div>;
    }

    function Component2() {
      const [state] = useBloc(CounterBloc);
      return <div data-testid="doubled">{state.doubled}</div>;
    }

    const { getByTestId } = render(
      <>
        <Component1 />
        <Component2 />
      </>
    );

    // Both components should render correctly
    expect(getByTestId('count').textContent).toBe('0');
    expect(getByTestId('doubled').textContent).toBe('0');

    // Change count
    act(() => {
      CounterBloc.instance.increment();
    });

    // Both should update
    expect(getByTestId('count').textContent).toBe('1');
    expect(getByTestId('doubled').textContent).toBe('2');
  });
  ```
- **Success Criteria:**
  - Test passes
  - Real React rendering behavior verified

---

## Phase 6: Performance Verification

### Task 6.1: Benchmark Subscription Creation
- [ ] #S:m #P
- **File:** `packages/blac/src/__tests__/performance/subscription-benchmark.test.ts`
- **Description:** Measure performance overhead of new return type
- **Benchmark:**
  ```typescript
  it('should have minimal overhead (<0.1ms per subscription)', () => {
    const bloc = new CounterBloc();
    const iterations = 10000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const { unsubscribe } = bloc.subscribe(() => {});
      unsubscribe();
    }
    const end = performance.now();

    const avgTime = (end - start) / iterations;
    expect(avgTime).toBeLessThan(0.1); // < 0.1ms per subscription
  });
  ```
- **Success Criteria:**
  - Overhead < 0.1ms per subscription
  - No regression from previous implementation

### Task 6.2: Memory Usage Verification
- [ ] #S:s #P
- **Description:** Verify no memory leaks with new API
- **Verification:**
  - Create and destroy many subscriptions
  - Check for memory growth
  - Verify WeakRef cleanup still works
- **Success Criteria:**
  - No memory leaks detected
  - WeakRef cleanup functioning

---

## Phase 7: Documentation and Cleanup

### Task 7.1: Update API Documentation
- [ ] #S:m
- **Files:**
  - `packages/blac/README.md`
  - Inline JSDoc comments
- **Description:** Document new return type
- **Content:**
  ```typescript
  /**
   * Subscribe to state changes
   * @param callback - Function to call on state change
   * @returns Object containing subscription ID and unsubscribe function
   * @example
   * const { id, unsubscribe } = bloc.subscribe((state) => {
   *   console.log('State changed:', state);
   * });
   *
   * // Later, cleanup:
   * unsubscribe();
   */
  ```
- **Success Criteria:**
  - Clear examples
  - Migration guide included

### Task 7.2: Update Type Definitions
- [ ] #S:s #P
- **File:** `packages/blac/src/types/index.ts`
- **Description:** Export SubscriptionResult type
- **Success Criteria:**
  - Type available for external use
  - Proper exports

### Task 7.3: Code Review Checklist
- [ ] #S:s
- **Description:** Final verification before merge
- **Checklist:**
  - [ ] No `as any` type assertions remain
  - [ ] All tests pass
  - [ ] Performance benchmarks met
  - [ ] No breaking changes to public API (only internal)
  - [ ] TypeScript strict mode passes
  - [ ] ESLint passes
  - [ ] All race condition scenarios covered by tests
- **Success Criteria:**
  - All items checked

### Task 7.4: Update CHANGELOG
- [ ] #S:s
- **File:** `packages/blac/CHANGELOG.md`
- **Description:** Document the fix
- **Content:**
  ```markdown
  ## [Next Version]

  ### Fixed
  - **[Critical]** Fixed subscription ID race condition in BlacAdapter that could cause incorrect dependency tracking when multiple adapters were created simultaneously
  - Removed unsafe type assertions (`as any`) in subscription ID retrieval

  ### Changed
  - **[Breaking - Internal API]** Subscription methods now return `{ id: string; unsubscribe: () => void }` instead of just the unsubscribe function
  - This change only affects internal code; external API remains stable
  ```
- **Success Criteria:**
  - Clear description of fix
  - Breaking change clearly marked as internal

---

## Phase 8: Final Verification

### Task 8.1: Run Full Test Suite
- [ ] #S:l
- **Command:** `pnpm test`
- **Description:** Run all tests across all packages
- **Success Criteria:**
  - All tests pass
  - No regressions
  - New tests included in coverage

### Task 8.2: Type Check All Packages
- [ ] #S:m
- **Command:** `pnpm typecheck`
- **Description:** Verify TypeScript compilation
- **Success Criteria:**
  - No type errors
  - Strict mode passes

### Task 8.3: Lint Check
- [ ] #S:s #P
- **Command:** `pnpm lint`
- **Description:** Verify code style
- **Success Criteria:**
  - No lint errors
  - Code style consistent

### Task 8.4: Build All Packages
- [ ] #S:m
- **Command:** `pnpm build`
- **Description:** Verify production builds work
- **Success Criteria:**
  - All packages build successfully
  - No build errors

### Task 8.5: Manual Testing - Playground App
- [ ] #S:m
- **Command:** `cd apps/playground && pnpm dev`
- **Description:** Manual verification in interactive playground
- **Test Scenarios:**
  1. Create multiple components using same bloc
  2. Create components using different blocs
  3. Test with React Strict Mode enabled
  4. Verify dependency tracking works correctly
  5. Check DevTools (if available) for subscription IDs
- **Success Criteria:**
  - All scenarios work correctly
  - No console errors
  - Dependency tracking accurate

---

## Risk Mitigation

### High-Risk Areas
1. **BlacAdapter.createSubscription()** - Most critical change
   - Mitigation: Comprehensive test coverage (Tasks 5.2-5.6)
   - Verification: Manual testing (Task 8.5)

2. **Type signature changes** - Could break external code
   - Mitigation: TypeScript will catch all issues at compile time
   - Verification: Type check (Task 8.2)

3. **Performance regression** - New object allocation
   - Mitigation: Performance benchmarks (Task 6.1)
   - Verification: < 0.1ms overhead requirement

### Rollback Plan
If critical issues discovered:
1. Revert all changes in single commit
2. Document issues encountered
3. Re-evaluate approach
4. Note: Low risk given comprehensive testing

---

## Timeline Estimate

### Optimistic (2-3 hours)
- Phase 1-3: 1 hour (core changes)
- Phase 4-5: 1 hour (usage updates + tests)
- Phase 6-8: 1 hour (verification)

### Realistic (3-4 hours)
- Phase 1-3: 1.5 hours (core changes + debugging)
- Phase 4-5: 1.5 hours (comprehensive test coverage)
- Phase 6-8: 1 hour (full verification)

### Pessimistic (5-6 hours)
- Unexpected issues in dependency tracking
- Additional edge cases discovered
- Performance tuning needed

---

## Success Metrics

### Must Achieve (P0)
- ✅ Zero race conditions in subscription ID retrieval
- ✅ All existing tests pass
- ✅ New tests demonstrate race condition is fixed
- ✅ No unsafe type assertions (`as any`)
- ✅ Correct dependency tracking in all scenarios
- ✅ TypeScript strict mode passes

### Should Achieve (P1)
- ✅ Performance overhead < 0.1ms per subscription
- ✅ Comprehensive test coverage for all race scenarios
- ✅ Clear documentation and examples
- ✅ Clean code with no duplication

### Nice to Have (P2)
- 🔵 Performance benchmarks added to CI
- 🔵 DevTools integration for subscription ID visibility
- 🔵 Migration guide for external users (if needed)

---

## Post-Implementation

### Follow-Up Tasks (Not in this plan)
1. Consider adding subscription ID to DevTools
2. Evaluate if selector-based subscriptions need ID tracking
3. Add debug utilities for tracking subscription lifecycle
4. Consider exposing SubscriptionResult type in public API

### Monitoring
- Watch for any new issues reported
- Monitor performance in production
- Collect feedback on new API

---

## Appendix: Key Files

### Core Files to Modify
1. `packages/blac/src/subscription/SubscriptionManager.ts` - Core subscription logic
2. `packages/blac/src/BlocBase.ts` - Public API
3. `packages/blac/src/adapter/BlacAdapter.ts` - **Critical fix location**
4. `packages/blac/src/types/subscription.ts` - Type definitions

### Test Files to Create/Update
1. `packages/blac-react/src/__tests__/adapter-race-condition.test.ts` - New race condition tests
2. `packages/blac-react/src/__tests__/useBloc-race-condition.test.tsx` - Integration tests
3. All existing test files using subscribe methods

### Documentation Files
1. `packages/blac/README.md` - API documentation
2. `packages/blac/CHANGELOG.md` - Release notes

---

## Task Summary

**Total Tasks:** 38
**Parallel Tasks:** 8 (marked with #P)
**Small (s):** 13 tasks (~15-30 min each)
**Medium (m):** 20 tasks (~30-60 min each)
**Large (l):** 5 tasks (~1-2 hours each)

**Critical Path:**
Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 8

**Can Be Parallelized:**
- Task 1.1 with start of Phase 1
- Task 4.1, 4.3 after Phase 3 complete
- Task 6.1, 6.2 after Phase 3 complete
- Task 7.2, 7.3 after Phase 5 complete

---

**Ready for implementation. All phases are clearly defined with specific tasks, acceptance criteria, and verification steps.**
