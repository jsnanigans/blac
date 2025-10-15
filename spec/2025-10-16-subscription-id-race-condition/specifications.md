# Specifications: Subscription ID Race Condition Fix

**Issue ID:** Critical-Stability-002
**Component:** BlacAdapter
**Priority:** Critical (Stability)
**Status:** Verified

---

## Problem Statement

The `BlacAdapter.createSubscription()` method has a race condition when retrieving the subscription ID after creating a subscription. It uses an unsafe assumption that the last subscription ID in the Map is the one just created, which can fail in concurrent scenarios.

### Verified Code Location
- **File:** `packages/blac/src/adapter/BlacAdapter.ts`
- **Method:** `createSubscription()` (lines 136-187)
- **Specific Issue:** Lines 161-164

---

## Root Cause Analysis

### Current Implementation Issue

**Problem: Guessing Subscription ID**
```typescript
createSubscription = (options: { onChange: () => void }) => {
  // ...

  // Create a component subscription with weak reference
  const weakRef = new WeakRef(this.componentRef.current);
  this.unsubscribe = this.blocInstance.subscribeComponent(
    weakRef,
    options.onChange,
  );

  // Get the subscription ID for tracking
  const subscriptions = (this.blocInstance._subscriptionManager as any)
    .subscriptions as Map<string, any>;
  this.subscriptionId = Array.from(subscriptions.keys()).pop(); // ← UNSAFE!
```

**Why This Is Broken:**

1. **Assumption of Map Ordering:**
   - Relies on Map preserving insertion order (implementation detail)
   - Assumes `.pop()` returns the most recently added key
   - This is technically true for JavaScript Maps, but fragile

2. **Race Condition Window:**
   ```
   Timeline:
   1. Adapter A calls subscribeComponent() → creates subscription "consumer-uuid-1"
   2. Adapter B calls subscribeComponent() → creates subscription "consumer-uuid-2"
   3. Adapter A calls Array.from(keys()).pop() → gets "consumer-uuid-2" ❌ WRONG!
   4. Adapter A now tracks the wrong subscription
   ```

3. **Unsafe Type Assertion:**
   - Uses `as any` to access private `_subscriptionManager`
   - Bypasses TypeScript type safety
   - Can break if internal structure changes

4. **Lost Subscription ID Reference:**
   - `subscribe()` method internally captures the ID in the unsubscribe closure
   - But this ID is never exposed to the caller
   - Forces BlacAdapter to guess the ID

### Data Flow Analysis

```typescript
// SubscriptionManager.subscribe() - lines 25-68
subscribe(options: SubscriptionOptions<S>): () => void {
  const id = `${options.type}-${generateUUID()}`;  // ← ID created here

  const subscription: Subscription<S> = {
    id,
    type: options.type,
    // ...
  };

  this.subscriptions.set(id, subscription);  // ← Added to Map

  // Return unsubscribe function
  return () => this.unsubscribe(id);  // ← ID captured in closure, but not exposed
}

// BlocBase.subscribeComponent() - lines 191-200
subscribeComponent(
  componentRef: WeakRef<object>,
  callback: () => void,
): () => void {
  return this._subscriptionManager.subscribe({
    type: 'consumer',
    weakRef: componentRef,
    notify: callback,
  });  // ← Returns unsubscribe, but no ID
}

// BlacAdapter.createSubscription() - lines 156-164
this.unsubscribe = this.blocInstance.subscribeComponent(
  weakRef,
  options.onChange,
);  // ← Only get unsubscribe function back

// Now must GUESS the subscription ID
this.subscriptionId = Array.from(subscriptions.keys()).pop();  // ← UNSAFE!
```

### Impact on Dependency Tracking

When BlacAdapter has the wrong subscription ID, it causes:

```typescript
// BlacAdapter.trackAccess() - lines 86-114
trackAccess(_consumerRef: object, type: 'state' | 'class', path: string): void {
  // ...

  if (this.subscriptionId) {
    // Uses WRONG subscription ID!
    this.blocInstance.trackAccess(this.subscriptionId, path, value);
  }
}
```

**Consequences:**
- Dependencies tracked on wrong subscription
- Component A's dependencies might be tracked on Component B's subscription
- Component A won't re-render when its dependencies change
- Component B will re-render when Component A's dependencies change
- Subtle, unpredictable rendering behavior

### Race Condition Scenarios

**Scenario A: Concurrent Adapter Creation**
```
Timeline:
1. Component A mounts → creates Adapter A
2. Component B mounts (same bloc) → creates Adapter B
3. Adapter A calls createSubscription()
   - Creates subscription "consumer-abc123"
   - subscription added to Map
4. Adapter B calls createSubscription() (before A's pop())
   - Creates subscription "consumer-def456"
   - subscription added to Map
5. Adapter A calls Array.from(keys()).pop()
   - Gets "consumer-def456" ❌ Should be "consumer-abc123"
6. Adapter A tracks dependencies on Adapter B's subscription
7. Adapter B overwrites Adapter A's dependencies
Result: Both adapters broken
```

**Scenario B: React Strict Mode**
```
In React StrictMode, components mount twice:
1. Mount #1 → Adapter A created → subscription "consumer-1"
2. Unmount #1 → Adapter A destroyed (subscription may still exist)
3. Mount #2 → Adapter A created again → subscription "consumer-2"
4. If timing overlaps, could get wrong ID for either mount
Result: Broken dependency tracking in development
```

**Scenario C: Multiple Blocs in Same Component**
```
Component uses multiple blocs:
1. useBloc(CounterBloc) → creates Adapter A → subscription "consumer-1"
2. useBloc(TodoBloc) → creates Adapter B → subscription "consumer-2"
3. If both call createSubscription() in same render:
   - Race condition on Map.keys().pop()
   - One adapter gets wrong ID
Result: One of the blocs doesn't track dependencies correctly
```

---

## Requirements

### Functional Requirements

1. **FR-1: Unique Subscription Identification**
   - Each adapter must get the correct subscription ID for the subscription it created
   - No guessing or assumptions about Map ordering
   - Must work correctly even with concurrent subscription creation

2. **FR-2: Type-Safe ID Retrieval**
   - No `as any` casts to access private properties
   - Use public API or return ID from subscription methods

3. **FR-3: Backwards Compatibility**
   - Keep current API surface for subscribe methods
   - Internal refactor only, no breaking changes
   - Existing subscriptions must continue to work

4. **FR-4: Dependency Tracking Correctness**
   - Adapter must track dependencies on its own subscription, not others'
   - trackAccess() calls must use correct subscription ID
   - No cross-contamination between adapters

### Non-Functional Requirements

1. **NFR-1: Performance**
   - Solution must not add significant overhead to subscription creation
   - No additional allocations in hot paths
   - Target: <0.1ms overhead per subscription

2. **NFR-2: Stability**
   - Solution must be race-free under all timing scenarios
   - No assumptions about execution order
   - Works correctly in React Strict Mode (mount/unmount/remount)

3. **NFR-3: API Simplicity**
   - Minimize changes to public API
   - Prefer internal refactoring over API expansion
   - Clear, self-documenting code

4. **NFR-4: Type Safety**
   - Remove unsafe type assertions
   - Leverage TypeScript for correctness
   - No `as any` casts

---

## Constraints

1. **C-1: No Breaking Changes**
   - Current API must remain unchanged for external consumers
   - Internal API can change freely
   - Existing tests must continue to pass

2. **C-2: Single-Threaded Execution**
   - JavaScript is single-threaded, but async/microtasks create interleaving
   - Solution must handle synchronous subscription creation from multiple callers

3. **C-3: No External Dependencies**
   - Solution must use only built-in JavaScript primitives
   - No new npm packages

4. **C-4: WeakRef Compatibility**
   - Must work with existing WeakRef-based subscription system
   - Cannot break WeakRef cleanup logic

---

## Success Criteria

### Must Have
1. ✅ Zero race conditions in subscription ID retrieval
2. ✅ Correct dependency tracking under all scenarios
3. ✅ No unsafe type assertions (`as any`)
4. ✅ All existing tests pass
5. ✅ New tests demonstrate race condition is fixed

### Should Have
1. ✅ Performance overhead <0.1ms per subscription
2. ✅ Type-safe API throughout
3. ✅ Test cases covering all race condition scenarios
4. ✅ Clear code comments explaining the solution

### Nice to Have
1. 🔵 Simplified subscription creation API
2. 🔵 Better encapsulation of subscription details
3. 🔵 Debug utilities for tracking subscription IDs

---

## Test Requirements

### Unit Tests Required

1. **Test: Concurrent Adapter Creation**
   ```typescript
   it('should assign correct subscription IDs for concurrent adapters', () => {
     const bloc = new CounterBloc();
     const adapter1 = new BlacAdapter({ blocConstructor: CounterBloc, componentRef: ref1 });
     const adapter2 = new BlacAdapter({ blocConstructor: CounterBloc, componentRef: ref2 });

     // Create subscriptions synchronously (simulates concurrent mount)
     const cleanup1 = adapter1.createSubscription({ onChange: jest.fn() });
     const cleanup2 = adapter2.createSubscription({ onChange: jest.fn() });

     // Verify each adapter has unique subscription ID
     expect(adapter1['subscriptionId']).toBeDefined();
     expect(adapter2['subscriptionId']).toBeDefined();
     expect(adapter1['subscriptionId']).not.toBe(adapter2['subscriptionId']);

     // Verify dependency tracking works correctly for each adapter
     adapter1.trackAccess(ref1.current, 'state', 'count');
     adapter2.trackAccess(ref2.current, 'state', 'count');

     const sub1 = bloc._subscriptionManager.getSubscription(adapter1['subscriptionId']!);
     const sub2 = bloc._subscriptionManager.getSubscription(adapter2['subscriptionId']!);

     expect(sub1?.dependencies.has('count')).toBe(true);
     expect(sub2?.dependencies.has('count')).toBe(true);
   });
   ```

2. **Test: React Strict Mode Simulation**
   ```typescript
   it('should handle React Strict Mode mount/unmount/remount', () => {
     const bloc = new CounterBloc();
     const componentRef = { current: {} };

     // Mount 1
     const adapter1 = new BlacAdapter({ blocConstructor: CounterBloc, componentRef });
     const cleanup1 = adapter1.createSubscription({ onChange: jest.fn() });
     const id1 = adapter1['subscriptionId'];

     // Unmount (strict mode)
     cleanup1();

     // Remount (strict mode)
     const adapter2 = new BlacAdapter({ blocConstructor: CounterBloc, componentRef });
     const cleanup2 = adapter2.createSubscription({ onChange: jest.fn() });
     const id2 = adapter2['subscriptionId'];

     // IDs should be different
     expect(id1).not.toBe(id2);

     // Only adapter2's subscription should exist
     expect(bloc._subscriptionManager.getSubscription(id1!)).toBeUndefined();
     expect(bloc._subscriptionManager.getSubscription(id2!)).toBeDefined();
   });
   ```

3. **Test: Multiple Blocs in Same Component**
   ```typescript
   it('should handle multiple blocs with correct subscription IDs', () => {
     const counterBloc = new CounterBloc();
     const todoBloc = new TodoBloc();

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

4. **Test: Dependency Tracking Isolation**
   ```typescript
   it('should not contaminate dependencies across adapters', () => {
     const bloc = new CounterBloc();

     // Create two adapters for same bloc
     const adapter1 = new BlacAdapter({
       blocConstructor: CounterBloc,
       componentRef: { current: {} }
     });
     const adapter2 = new BlacAdapter({
       blocConstructor: CounterBloc,
       componentRef: { current: {} }
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

### Integration Tests Required

1. **Test: Full useBloc Hook Integration**
   ```typescript
   it('should track dependencies correctly in useBloc hook', () => {
     function Component1() {
       const [state] = useBloc(CounterBloc);
       return <div>{state.count}</div>;
     }

     function Component2() {
       const [state] = useBloc(CounterBloc);
       return <div>{state.doubled}</div>;
     }

     const { rerender } = render(
       <>
         <Component1 />
         <Component2 />
       </>
     );

     // Both components should render correctly
     expect(screen.getByText('0')).toBeInTheDocument(); // count
     expect(screen.getByText('0')).toBeInTheDocument(); // doubled

     // Change count
     act(() => {
       CounterBloc.instance.increment();
     });

     // Both should update
     expect(screen.getByText('1')).toBeInTheDocument();
     expect(screen.getByText('2')).toBeInTheDocument();
   });
   ```

---

## Out of Scope

1. ❌ Changes to subscription notification system
2. ❌ Changes to WeakRef cleanup logic
3. ❌ Performance optimizations beyond fixing the race condition
4. ❌ Changes to dependency tracking algorithm
5. ❌ Plugin system modifications

---

## Dependencies

### Code Dependencies
- `SubscriptionManager.subscribe()` (needs to return ID)
- `BlocBase.subscribeComponent()` (needs to pass through ID)
- `BlacAdapter.createSubscription()` (needs to receive ID)

### Test Dependencies
- Vitest test framework
- React Testing Library (for integration tests)
- Mock WeakRef utilities

---

## Acceptance Checklist

- [ ] Race condition identified and documented
- [ ] Solution designed and type-safe
- [ ] Implementation completed with no `as any` casts
- [ ] Unit tests written and passing (all scenarios)
- [ ] Integration tests written and passing
- [ ] Performance overhead verified (<0.1ms)
- [ ] Code review completed
- [ ] No breaking changes to public API
- [ ] React Strict Mode compatibility verified
- [ ] All existing tests pass

---

## Notes

### Subscription ID Format
Current format: `${type}-${uuid}`
- Example: `"consumer-a1b2c3d4-e5f6-7890-abcd-ef1234567890"`
- Type is either "consumer" or "observer"
- UUID guarantees uniqueness

### Why This Bug Existed
The bug exists because:
1. `subscribe()` returns only an unsubscribe function
2. The ID is captured in the closure but not exposed
3. BlacAdapter needs the ID for dependency tracking
4. No public API to get the ID, so it resorts to guessing

### Ideal Solution Properties
1. Return ID from `subscribe()` alongside unsubscribe
2. No changes to external API (only internal)
3. Type-safe, no `as any` casts
4. Zero performance overhead
5. Self-documenting code

---

**Ready for solution research and analysis.**
