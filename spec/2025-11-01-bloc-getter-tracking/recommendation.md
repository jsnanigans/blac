# Bloc Getter Tracking - Recommendation

## Selected Solution

**Option 1: Proxy-Based Tracking with Separate Getter Tracker**

## Justification

This solution provides the best balance across all evaluation criteria:

### Requirements Alignment
✅ **Automatic by default**: Works without configuration, consistent with state tracking
✅ **Reference equality**: Uses Object.is() for fast comparison
✅ **Error handling**: Stop tracking failing getters, log warning
✅ **Performance priority**: <5% overhead through caching and optimization
✅ **Backward compatible**: No API changes, all existing code works unchanged

### Technical Strengths

1. **Clean Architecture**
   - Separate getter tracking from state tracking
   - Parallel pattern to existing state tracking system
   - Clear boundaries and responsibilities
   - Minimal cross-cutting concerns

2. **Maintainability**
   - Easy to understand and debug
   - Each component can be developed and tested independently
   - Changes to getter tracking don't affect state tracking
   - Well-documented code structure

3. **Performance**
   - Fast proxy interception
   - Object.is() comparison (O(1) per getter)
   - Cacheable descriptor lookups (per-class)
   - No unnecessary re-renders
   - Tracking only active during render phase

4. **Testability**
   - Clear unit test boundaries
   - Easy to mock and isolate
   - Integration tests straightforward
   - Performance benchmarks well-defined

5. **Low Risk**
   - Minimal changes to existing code
   - No core package modifications
   - Isolated to React integration layer
   - Can be feature-flagged if needed

### Why Not Other Options?

**Option 2 (Unified Tracking)**: ❌ Breaking change, API incompatibility
**Option 3 (Opt-in)**: ❌ Violates "automatic by default" requirement
**Option 4 (Double-Proxy in Snapshot)**: ⚠️ Tuple equality issues, subtle bugs

## Implementation Strategy

### High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│              React Component                     │
│  const [state, bloc] = useBloc(MyBloc)          │
│  return <div>{state.count} {bloc.doubled}</div> │
└────────┬─────────────────────────┬───────────────┘
         │                         │
         │                         │
    ┌────▼────┐              ┌────▼──────┐
    │  State  │              │   Bloc    │
    │  Proxy  │              │  Proxy    │
    │ (exists)│              │   (new)   │
    └────┬────┘              └────┬──────┘
         │                         │
         │                         │
  ┌──────▼──────┐          ┌──────▼───────┐
  │   State     │          │   Getter     │
  │  Tracker    │          │  Tracker     │
  │  (exists)   │          │   (new)      │
  └─────────────┘          └──────────────┘

Both trackers checked in subscribe callback:
  if (hasChanges(stateTracker) || hasGetterChanges(getterTracker))
    → trigger re-render
```

### Core Components

#### 1. Getter Tracking State
```typescript
interface GetterTrackingState {
  // Last computed value for each tracked getter
  trackedValues: Map<string | symbol, unknown>;

  // Getters accessed during current render
  accessedInRender: Set<string | symbol>;

  // Enable/disable tracking flag
  isTracking: boolean;
}
```

#### 2. Getter Detection
```typescript
// Cache descriptors per class to avoid repeated prototype walks
const getterCache = new WeakMap<any, Set<string | symbol>>();

function isGetter(obj: any, prop: string | symbol): boolean {
  let current = obj;
  while (current && current !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(current, prop);
    if (descriptor) {
      return descriptor.get !== undefined;
    }
    current = Object.getPrototypeOf(current);
  }
  return false;
}
```

#### 3. Bloc Proxy
```typescript
function createBlocProxy<TBloc>(
  bloc: TBloc,
  tracker: GetterTrackingState
): TBloc {
  return new Proxy(bloc, {
    get(target, prop, receiver) {
      // Check if tracking enabled and property is a getter
      if (tracker.isTracking && isGetter(target, prop)) {
        tracker.accessedInRender.add(prop);

        // Call getter and store result
        const descriptor = getDescriptor(target, prop);
        const value = descriptor!.get!.call(target);
        tracker.trackedValues.set(prop, value);

        return value;
      }

      // Default behavior for methods/properties
      return Reflect.get(target, prop, receiver);
    }
  });
}
```

#### 4. Change Detection
```typescript
function hasGetterChanges(
  bloc: TBloc,
  tracker: GetterTrackingState | null
): boolean {
  if (!tracker || tracker.accessedInRender.size === 0) {
    return false;
  }

  for (const prop of tracker.accessedInRender) {
    try {
      const descriptor = getDescriptor(bloc, prop);
      const newValue = descriptor!.get!.call(bloc);
      const oldValue = tracker.trackedValues.get(prop);

      if (!Object.is(newValue, oldValue)) {
        tracker.trackedValues.set(prop, newValue);
        return true;
      }
    } catch (error) {
      // Getter threw error - stop tracking it
      console.warn(
        `Getter ${String(prop)} threw error during comparison:`,
        error
      );
      tracker.accessedInRender.delete(prop);
      tracker.trackedValues.delete(prop);
      // Treat as "changed" to ensure component updates
      return true;
    }
  }

  return false;
}
```

#### 5. Hook Integration
```typescript
// Extend HookState
interface HookState<TBloc extends StateContainer<AnyObject>> {
  tracker: TrackerState<ExtractState<TBloc>> | null;
  manualDepsCache: unknown[] | null;
  getterTracker: GetterTrackingState | null;  // NEW
  proxiedBloc: TBloc | null;                  // NEW - cached
}

// In useMemo
const [proxiedBloc, subscribe, getSnapshot, instanceKey] = useMemo(() => {
  // ... existing bloc creation ...

  const hookState: HookState<TBloc> = {
    tracker: null,
    manualDepsCache: null,
    getterTracker: autoTrackEnabled ? createGetterTracker() : null,
    proxiedBloc: null,
  };

  // Cache proxied bloc
  hookState.proxiedBloc = hookState.getterTracker
    ? createBlocProxy(instance, hookState.getterTracker)
    : instance;

  // Enhanced subscribe
  const subscribeFn = (callback: () => void) => {
    return instance.subscribe(() => {
      // Check state changes
      const stateChanged = hasChanges(hookState.tracker!, instance.state);

      // Check getter changes
      const getterChanged = hasGetterChanges(
        instance,
        hookState.getterTracker
      );

      if (stateChanged || getterChanged) {
        callback();
      }
    });
  };

  // Enhanced getSnapshot
  const getSnapshotFn = () => {
    // ... existing state tracking logic ...

    // Enable getter tracking
    if (hookState.getterTracker) {
      hookState.getterTracker.isTracking = true;
      hookState.getterTracker.accessedInRender.clear();
    }

    return createProxy(hookState.tracker!, instance.state);
  };

  return [hookState.proxiedBloc, subscribeFn, getSnapshotFn, instanceId];
}, [BlocClass]);

// Disable getter tracking after render
useEffect(() => {
  // This runs after every render
  if (getterTracker) {
    getterTracker.isTracking = false;
  }
});

return [state, proxiedBloc, componentRef];
```

### Integration Points

1. **packages/blac-react/src/useBloc.ts**
   - Add GetterTrackingState interface
   - Extend HookState interface
   - Add helper functions: isGetter, getDescriptor, createBlocProxy, hasGetterChanges
   - Modify useMemo to create getter tracker and bloc proxy
   - Update subscribe functions to check getter changes
   - Update getSnapshot to enable/clear getter tracking
   - Add useEffect to disable tracking after render
   - Return proxiedBloc instead of raw bloc

2. **No changes to core packages** (@blac/core)
   - All changes isolated to React integration
   - Uses existing tracking utilities
   - No new dependencies

### Performance Optimizations

1. **Descriptor Caching**
   ```typescript
   const descriptorCache = new WeakMap<any, Map<string | symbol, PropertyDescriptor>>();

   function getDescriptor(obj: any, prop: string | symbol): PropertyDescriptor | undefined {
     const constructor = obj.constructor;
     let cache = descriptorCache.get(constructor);

     if (!cache) {
       cache = new Map();
       descriptorCache.set(constructor, cache);
     }

     if (cache.has(prop)) {
       return cache.get(prop);
     }

     // Walk prototype chain once
     let current = obj;
     while (current && current !== Object.prototype) {
       const desc = Object.getOwnPropertyDescriptor(current, prop);
       if (desc) {
         cache.set(prop, desc);
         return desc;
       }
       current = Object.getPrototypeOf(current);
     }

     return undefined;
   }
   ```

2. **Proxy Caching**
   - Create proxy once in useMemo
   - Store in hookState.proxiedBloc
   - Return cached proxy instead of creating new one

3. **Early Exit**
   - If no getters accessed: `accessedInRender.size === 0` → return false immediately
   - If getter tracker null: return false immediately
   - If manual dependencies: getter tracker is null (skip entirely)

4. **Tracking Window**
   - Only enable tracking during getSnapshot call
   - Disable immediately after render
   - Minimizes overhead outside render phase

### Testing Strategy

#### Unit Tests
1. `isGetter()` function
   - Own property getter
   - Prototype getter
   - Nested prototype getter
   - Non-getter (method, property)

2. `createBlocProxy()` function
   - Intercepts getter access when tracking enabled
   - Stores computed value
   - Returns value correctly
   - Passes through methods and properties
   - Ignores getters when tracking disabled

3. `hasGetterChanges()` function
   - Detects getter value change (Object.is)
   - Returns false when values same
   - Handles primitives correctly
   - Handles objects/arrays (reference equality)
   - Handles errors gracefully
   - Cleans up after errors

#### Integration Tests (useBloc)
1. Single getter tracking
2. Multiple getter tracking
3. Nested getter calls (getter calling getter)
4. Getter with complex return value (array, object)
5. Getter error handling
6. Works with state tracking (both triggers)
7. Works with manual dependencies (disabled)
8. Works with autoTrack: false (disabled)
9. Works in React Strict Mode
10. Memory cleanup on unmount

#### Performance Benchmarks
1. Baseline: Component without getter tracking
2. With tracking: Same component with feature enabled
3. Multiple getters: 5-10 getters accessed
4. Complex getters: Expensive computations
5. No getter access: Overhead when getters not used
6. Memory usage: Track over time

**Target**: <5% overhead compared to baseline

### Migration and Rollout

#### Phase 1: Implementation (Week 1)
- [ ] Implement core functions (isGetter, createBlocProxy, hasGetterChanges)
- [ ] Add GetterTrackingState to HookState
- [ ] Integrate in useBloc hook
- [ ] Add descriptor caching

#### Phase 2: Testing (Week 1-2)
- [ ] Write unit tests (>90% coverage)
- [ ] Write integration tests
- [ ] Run in React Strict Mode
- [ ] Memory leak testing

#### Phase 3: Performance (Week 2)
- [ ] Create benchmarks
- [ ] Measure overhead
- [ ] Optimize hot paths
- [ ] Verify <5% target met

#### Phase 4: Documentation (Week 2)
- [ ] Add JSDoc comments
- [ ] Update README examples
- [ ] Document best practices (getter caching)
- [ ] Document limitations (reference equality)

#### Phase 5: Release (Week 3)
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Release notes written

### Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance overhead >5% | Medium | Low | Aggressive caching, benchmarking, optimization |
| Memory leaks | High | Low | Cleanup on unmount, memory profiling |
| Nested getter loops | Medium | Low | Track computing stack, detect cycles |
| Getter errors breaking tracking | Medium | Medium | Try-catch, stop tracking failed getter |
| Strict Mode issues | Low | Low | Idempotent operations, thorough testing |
| Descriptor lookup cost | Low | Medium | WeakMap caching per class |

### Success Metrics

✓ All existing tests pass without modification
✓ Performance overhead <5% when using getters
✓ Performance overhead 0% when NOT using getters
✓ Test coverage >90% for new code
✓ No memory leaks in profiling
✓ Works correctly in React Strict Mode
✓ Handles all edge cases (errors, nested getters, etc.)

## Conclusion

**Option 1: Proxy-Based Tracking with Separate Getter Tracker** provides the optimal solution:
- Meets all requirements
- Clean, maintainable architecture
- Low risk implementation
- Performance-optimized
- Fully backward compatible

This recommendation is based on thorough analysis of requirements, research of similar systems, evaluation of multiple options, and alignment with project constraints and priorities.