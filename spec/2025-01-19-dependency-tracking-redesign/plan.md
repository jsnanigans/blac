# Implementation Plan: Hybrid Unified System

**Project**: BlaC Dependency Tracking Redesign
**Date**: 2025-01-19
**Estimated Duration**: 2-3 weeks (10-15 working days)
**Approach**: Parallel development with feature flag

---

## Overview

This plan implements the Hybrid Unified System (Option 4) through three main phases:
1. **Phase 1**: Build new system in parallel (Week 1)
2. **Phase 2**: Test and validate (Week 2)
3. **Phase 3**: Cleanup and ship (Week 3)

**Legend:**
- `[ ]` - Not started
- `#P` - Can be parallelized with other #P tasks
- `#S:s` - Small (< 2 hours)
- `#S:m` - Medium (2-4 hours)
- `#S:l` - Large (4-8 hours)
- `#S:xl` - Extra Large (1+ day)

---

## Phase 1: Foundation & Core Implementation (Week 1)

**Goal**: Build UnifiedDependencyTracker with core algorithms, behind feature flag

### 1.1 Project Setup

- [ ] Create new directory `packages/blac/src/tracking/` #S:s
- [ ] Add feature flag to Blac config #S:s
  ```typescript
  // In packages/blac/src/Blac.ts
  interface BlacConfig {
    // ... existing
    useUnifiedTracking?: boolean; // New
  }
  ```
- [ ] Create types file `packages/blac/src/tracking/types.ts` #S:m
  - Dependency union type
  - SubscriptionState interface
  - CacheEntry interface
  - Utility types

**Estimated**: 1-2 hours

### 1.2 Core Data Structures

- [ ] Implement `Dependency` types in `tracking/types.ts` #S:m #P
  ```typescript
  interface StateDependency {
    type: 'state';
    path: string;
  }

  interface ComputedDependency {
    type: 'computed';
    key: string;
    compute: () => any;
  }

  interface CustomDependency {
    type: 'custom';
    key: string;
    selector: (bloc: any) => any;
  }

  type Dependency = StateDependency | ComputedDependency | CustomDependency;
  ```

- [ ] Implement `SubscriptionState` interface #S:m #P
  ```typescript
  interface SubscriptionState {
    id: string;
    blocId: string;
    dependencies: Dependency[];
    valueCache: Map<string, any>;
    notify: () => void;
    metadata: {
      componentName?: string;
      mountTime: number;
      renderCount: number;
    };
  }
  ```

- [ ] Write unit tests for type guards #S:s #P
  - `isStateDependency()`
  - `isComputedDependency()`
  - `isCustomDependency()`

**Estimated**: 2-3 hours

### 1.3 UnifiedDependencyTracker Class (Core)

- [ ] Create `packages/blac/src/tracking/UnifiedDependencyTracker.ts` #S:l
  - Singleton pattern
  - Subscriptions Map
  - Basic constructor
  - getInstance() method

- [ ] Implement `createSubscription()` method #S:m
  ```typescript
  createSubscription(
    id: string,
    blocId: string,
    notify: () => void
  ): void
  ```

- [ ] Implement `removeSubscription()` method #S:s
  - Clean up from subscriptions Map
  - Clear value cache

- [ ] Write unit tests for subscription lifecycle #S:m #P
  - Create subscription
  - Remove subscription
  - Duplicate subscription handling

**Estimated**: 4-6 hours

### 1.4 Dependency Key Generation

- [ ] Implement `getDependencyKey()` helper #S:m
  ```typescript
  private getDependencyKey(dep: Dependency): string {
    switch (dep.type) {
      case 'state': return `state:${dep.path}`;
      case 'computed': return `computed:${dep.key}`;
      case 'custom': return `custom:${dep.key}`;
    }
  }
  ```

- [ ] Write unit tests for key generation #S:s #P
  - Unique keys for different dependencies
  - Consistent keys for same dependency
  - Handle special characters in paths

**Estimated**: 1-2 hours

### 1.5 Dependency Evaluation

- [ ] Implement `evaluate()` method #S:l
  ```typescript
  private evaluate(dep: Dependency, bloc: BlocBase): any {
    switch (dep.type) {
      case 'state':
        return this.getNestedValue(bloc.state, dep.path);
      case 'computed':
        return dep.compute();
      case 'custom':
        return dep.selector(bloc);
    }
  }
  ```

- [ ] Implement `getNestedValue()` helper #S:m
  - Split path by dots
  - Traverse object safely
  - Handle undefined/null

- [ ] Handle evaluation errors gracefully #S:m
  - Try-catch in evaluate
  - Store error in cache
  - Log error with Blac.error()

- [ ] Write unit tests for evaluation #S:m #P
  - State path evaluation (flat)
  - State path evaluation (nested)
  - Computed evaluation
  - Custom selector evaluation
  - Error handling

**Estimated**: 4-5 hours

### 1.6 Dependency Tracking

- [ ] Implement `track()` method #S:l
  ```typescript
  track(subscriptionId: string, dependency: Dependency): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return;

    const depKey = this.getDependencyKey(dependency);

    // Idempotency check
    const alreadyTracked = sub.dependencies.some(
      d => this.getDependencyKey(d) === depKey
    );
    if (alreadyTracked) return;

    // Add dependency
    sub.dependencies.push(dependency);

    // CRITICAL: Immediately capture current value
    const bloc = Blac.getBloc(sub.blocId);
    const currentValue = this.evaluate(dependency, bloc);
    sub.valueCache.set(depKey, currentValue);
  }
  ```

- [ ] Implement idempotency (prevent duplicate tracking) #S:m
  - Already implemented in track() above

- [ ] Write unit tests for tracking #S:m #P
  - Track state dependency
  - Track computed dependency
  - Track custom dependency
  - Idempotency (calling track() twice)
  - React Strict Mode scenario (double render)

**Estimated**: 4-5 hours

### 1.7 Change Notification

- [ ] Implement `notifyChanges()` method #S:xl
  ```typescript
  notifyChanges(blocId: string, change: StateChange): Set<string> {
    const affected = new Set<string>();

    for (const [subId, sub] of this.subscriptions) {
      if (sub.blocId !== blocId) continue;

      let shouldNotify = false;
      const bloc = Blac.getBloc(blocId);

      for (const dep of sub.dependencies) {
        const depKey = this.getDependencyKey(dep);
        const oldValue = sub.valueCache.get(depKey);
        const newValue = this.evaluate(dep, bloc);

        if (!Object.is(oldValue, newValue)) {
          sub.valueCache.set(depKey, newValue);
          shouldNotify = true;
          break; // One change is enough
        }
      }

      if (shouldNotify) {
        affected.add(subId);
        sub.notify();
        sub.metadata.renderCount++;
      }
    }

    return affected;
  }
  ```

- [ ] Handle evaluation errors during notification #S:m
  - Catch errors in evaluate()
  - Compare error states
  - Log but don't crash

- [ ] Write unit tests for notification #S:l #P
  - Notify on value change
  - Don't notify when unchanged
  - Multiple subscriptions
  - Error handling
  - Metadata updates (renderCount)

**Estimated**: 6-8 hours

### 1.8 Integration with Blac

- [ ] Add getInstance() to Blac class #S:s
  ```typescript
  // In packages/blac/src/Blac.ts
  private static unifiedTracker?: UnifiedDependencyTracker;

  static getUnifiedTracker(): UnifiedDependencyTracker {
    if (!Blac.unifiedTracker) {
      Blac.unifiedTracker = UnifiedDependencyTracker.getInstance();
    }
    return Blac.unifiedTracker;
  }
  ```

- [ ] Update BlocBase.emit() to use tracker #S:m
  ```typescript
  emit(newState: S): void {
    const oldState = this.state;
    this.state = newState;

    if (Blac.config.useUnifiedTracking) {
      const tracker = Blac.getUnifiedTracker();
      tracker.notifyChanges(this._id, { oldState, newState });
    } else {
      // Legacy path
      this._subscriptionManager.notify(newState, oldState);
    }

    // ... rest of emit
  }
  ```

**Estimated**: 1-2 hours

**Phase 1 Total**: 23-35 hours (3-5 days)

---

## Phase 2: React Integration & Testing (Week 2)

**Goal**: Create useBloc_Unified, enable in tests, fix all issues

### 2.1 Tracking Proxy Creation

- [ ] Create `packages/blac/src/tracking/createTrackingProxy.ts` #S:l
  ```typescript
  export function createStateTrackingProxy<T extends object>(
    target: T,
    subscriptionId: string,
    tracker: UnifiedDependencyTracker,
    path: string = ''
  ): T
  ```

- [ ] Implement state proxy logic #S:l
  - Intercept property access
  - Build full path (for nested access)
  - Call tracker.track() with StateDependency
  - Recursively proxy nested objects/arrays
  - Handle maxDepth limit

- [ ] Create computed tracking proxy #S:m
  ```typescript
  export function createComputedTrackingProxy<T extends object>(
    target: T,
    subscriptionId: string,
    tracker: UnifiedDependencyTracker
  ): T
  ```

- [ ] Implement computed proxy logic #S:m
  - Detect getters via property descriptors
  - Call tracker.track() with ComputedDependency
  - Skip non-getter properties

- [ ] Write unit tests for proxies #S:l #P
  - State proxy: flat access
  - State proxy: nested access
  - State proxy: array access
  - Computed proxy: getter detection
  - Computed proxy: skip methods
  - Max depth handling

**Estimated**: 6-8 hours

### 2.2 useBloc_Unified Implementation

- [ ] Create `packages/blac-react/src/useBloc.unified.ts` #S:xl
  ```typescript
  export function useBloc_Unified<B>(
    BlocConstructor: B,
    options?: UseBlocOptions
  ): [state, bloc]
  ```

- [ ] Implement subscription creation #S:m
  - Generate stable subscription ID
  - Create subscription via tracker on mount
  - Remove subscription on unmount

- [ ] Implement state proxy creation #S:m
  - Use createStateTrackingProxy
  - Memoize based on state reference
  - Pass subscription ID to proxy

- [ ] Implement bloc proxy creation #S:m
  - Use createComputedTrackingProxy
  - Memoize based on bloc instance
  - Pass subscription ID to proxy

- [ ] Handle manual dependencies option #S:l
  - If options.dependencies provided
  - Create CustomDependency
  - Track via tracker.track()

- [ ] Write unit tests for useBloc_Unified #S:xl #P
  - Basic state access
  - Basic getter access
  - Mixed state + getter
  - Manual dependencies
  - React Strict Mode
  - Multiple instances
  - Unmount cleanup

**Estimated**: 8-12 hours

### 2.3 Feature Flag Integration

- [ ] Add flag check in useBloc entry point #S:s
  ```typescript
  // In packages/blac-react/src/useBloc.ts
  export default function useBloc<B>(...args) {
    if (Blac.config.useUnifiedTracking) {
      return useBloc_Unified(...args);
    } else {
      return useBloc_Legacy(...args);
    }
  }
  ```

- [ ] Rename current useBloc to useBloc_Legacy #S:s
  - Move implementation to `useBloc.legacy.ts`
  - Export as useBloc_Legacy

- [ ] Update exports #S:s
  - Export both variants
  - Keep default export as conditional

**Estimated**: 1 hour

### 2.4 Test Suite Validation

- [ ] Enable flag globally in tests #S:s
  ```typescript
  // In vitest.setup.ts or similar
  import { Blac } from '@blac/core';

  beforeEach(() => {
    Blac.setConfig({ useUnifiedTracking: true });
  });
  ```

- [ ] Run dependency-tracking.test.tsx #S:m
  - Identify failures
  - Fix issues
  - Verify all pass

- [ ] Run dependency-tracking.advanced.test.tsx #S:m
  - Identify failures (likely the 5 currently failing)
  - Fix issues
  - Verify all pass

- [ ] Run useBloc.adapter.test.tsx #S:m
  - May need updates for new architecture
  - Fix any failures

- [ ] Run full test suite #S:l
  - All 197 tests
  - Fix any failures
  - Document any behavioral changes

- [ ] Test React Strict Mode specifically #S:m #P
  - useBloc.strictMode.test.tsx
  - useBloc.isolated.strictMode.test.tsx
  - Verify no double-tracking issues

**Estimated**: 8-12 hours

### 2.5 Edge Case Handling

- [ ] Handle array access patterns #S:m
  - `state.items.map()` → track `items`
  - `state.items.length` → track `items`
  - `state.items[0]` → track `items.0`
  - Test with actual use cases

- [ ] Handle dynamic dependencies #S:m
  - Getter that accesses different state based on condition
  - Dependencies should update on next render
  - Test conditional access

- [ ] Handle circular references #S:m
  - Prevent infinite loops in nested proxies
  - Add visited set or depth limit
  - Test with circular state

- [ ] Handle undefined/null values #S:s
  - Access path that doesn't exist
  - Should not crash
  - Should track attempted access

- [ ] Write tests for all edge cases #S:m #P

**Estimated**: 4-6 hours

### 2.6 Performance Optimization

- [ ] Add dependency deduplication #S:m
  - Filter leaf paths after tracking
  - Remove intermediate paths
  - Reuse existing filterLeafPaths logic

- [ ] Optimize dependency key generation #S:s
  - Consider caching keys
  - Benchmark performance

- [ ] Add early-exit optimizations #S:m
  - In notifyChanges, break after first change
  - Skip subscriptions for different blocs
  - Cache bloc lookups

- [ ] Run benchmark suite #S:l #P
  - Compare with legacy system
  - Identify bottlenecks
  - Optimize hot paths

**Estimated**: 4-6 hours

**Phase 2 Total**: 31-47 hours (4-6 days)

---

## Phase 3: Cleanup & Launch (Week 3)

**Goal**: Remove legacy code, finalize, ship

### 3.1 Legacy Code Removal

- [ ] Remove BlacAdapter.resetTracking() #S:s
- [ ] Remove BlacAdapter.commitTracking() #S:m
- [ ] Remove BlacAdapter.trackAccess() old implementation #S:s
- [ ] Remove BlacAdapter.pendingGetterValues #S:s
- [ ] Remove BlacAdapter.pendingDependencies #S:s
- [ ] Simplify BlacAdapter to minimal orchestration #S:l

- [ ] Remove SubscriptionManager.checkGetterChanged() #S:m
- [ ] Remove SubscriptionManager.invalidateGetterCache() #S:s
- [ ] Remove SubscriptionManager.getterCache from subscriptions #S:m
- [ ] Simplify SubscriptionManager.notify() #S:m
- [ ] Remove SubscriptionManager.shouldNotifyForPaths() #S:m

- [ ] Clean up ProxyFactory #S:m
  - Remove createBlocProxy (now in tracking/)
  - Remove createStateProxy (now in tracking/)
  - Keep only shared caching logic if needed

- [ ] Remove useBloc_Legacy #S:s
- [ ] Remove feature flag conditional #S:s
- [ ] Update imports throughout codebase #S:m

**Estimated**: 6-8 hours

### 3.2 Documentation Updates

- [ ] Update inline comments in UnifiedDependencyTracker #S:m
- [ ] Add JSDoc to all public methods #S:m
- [ ] Create architecture diagram (ASCII or mermaid) #S:m #P
- [ ] Document dependency types #S:s #P
- [ ] Update CLAUDE.md with new architecture #S:m #P

- [ ] Update README if needed #S:s #P
- [ ] Add migration guide (internal changes only) #S:s #P

**Estimated**: 3-4 hours

### 3.3 Final Testing & Validation

- [ ] Run full test suite one more time #S:l
  - Verify all 197 tests pass
  - Check for flaky tests
  - Ensure consistent behavior

- [ ] Run memory leak detection #S:m
  - Use WeakRef detector
  - Test long-running scenarios
  - Verify cleanup on unmount

- [ ] Performance validation #S:l #P
  - Run benchmark suite
  - Compare with baseline (before changes)
  - Ensure within ±10% tolerance
  - Document any improvements

- [ ] Test in example apps #S:m #P
  - Run playground app
  - Test various patterns
  - Verify behavior matches expectations

**Estimated**: 5-7 hours

### 3.4 Code Review & Quality

- [ ] Self code review #S:l
  - Review all changed files
  - Check for TODO comments
  - Verify error handling
  - Check edge cases

- [ ] Run linter #S:s
  - Fix any lint errors
  - Format code

- [ ] Run type checker #S:s
  - Fix any type errors
  - Ensure strict mode compliance

- [ ] Check bundle size #S:s #P
  - Compare before/after
  - Should be smaller (less code)

**Estimated**: 3-4 hours

### 3.5 Changelog & Release Prep

- [ ] Create changeset #S:s
  - Document breaking changes (internal only)
  - List improvements
  - Note bug fixes

- [ ] Update CHANGELOG.md #S:s
  - Add version entry
  - List all changes
  - Credit contributors

- [ ] Update package versions if needed #S:s

**Estimated**: 1 hour

### 3.6 Merge & Ship

- [ ] Create PR #S:s
  - Clear description
  - Link to spec documents
  - List test results

- [ ] Address review feedback #S:m-l (variable)

- [ ] Merge to main branch #S:s

- [ ] Monitor for issues #S:m
  - Watch CI
  - Check for regression reports
  - Be ready for hotfix

**Estimated**: 2-4 hours (+ review time)

**Phase 3 Total**: 20-30 hours (2.5-4 days)

---

## Summary

### Total Estimated Time

- **Phase 1 (Foundation)**: 23-35 hours (3-5 days)
- **Phase 2 (Integration)**: 31-47 hours (4-6 days)
- **Phase 3 (Cleanup)**: 20-30 hours (2.5-4 days)

**Total**: 74-112 hours (9-14 days)

**With buffer**: 2-3 weeks

### Critical Path

The following tasks must be completed in sequence (cannot be parallelized):

1. Phase 1.1-1.3: Setup + Core tracker class
2. Phase 1.4-1.7: Tracking algorithms
3. Phase 2.1-2.2: Proxies + useBloc_Unified
4. Phase 2.4: Test suite validation
5. Phase 3.1: Legacy code removal
6. Phase 3.6: Merge & ship

### Parallelizable Work

Tasks marked with `#P` can be done concurrently:
- Writing tests while implementing features
- Documentation while coding
- Performance benchmarking while validating
- Code review while finalizing

### Risk Mitigation

**High-Risk Tasks** (need extra attention):
- [ ] 1.7: notifyChanges() implementation (core algorithm)
- [ ] 2.2: useBloc_Unified (React integration)
- [ ] 2.4: Full test suite validation (may reveal issues)
- [ ] 3.1: Legacy code removal (potential breakage)

**Mitigation Strategies**:
- Extra testing for high-risk tasks
- Peer review before merging
- Feature flag allows safe revert
- Incremental validation (don't wait until end)

---

## Daily Progress Tracking

### Week 1

**Day 1**: Tasks 1.1-1.4 (Setup + Core structures)
**Day 2**: Tasks 1.5-1.6 (Evaluation + Tracking)
**Day 3**: Task 1.7 (Notification logic)
**Day 4**: Task 1.8 + Start 2.1 (Integration + Proxies)
**Day 5**: Finish 2.1 + Tests (Proxy completion)

**Milestone**: Core tracker complete and tested ✓

### Week 2

**Day 1**: Task 2.2 (useBloc_Unified implementation)
**Day 2**: Tasks 2.3 + Start 2.4 (Feature flag + Testing)
**Day 3**: Finish 2.4 (Fix failing tests)
**Day 4**: Task 2.5 (Edge cases)
**Day 5**: Task 2.6 (Performance optimization)

**Milestone**: All tests passing, performance validated ✓

### Week 3

**Day 1**: Task 3.1 (Remove legacy code)
**Day 2**: Tasks 3.2 + 3.3 (Documentation + Validation)
**Day 3**: Task 3.4 (Code review + Quality)
**Day 4**: Task 3.5 + 3.6 (Release prep + Merge)
**Day 5**: Buffer / polish / monitoring

**Milestone**: New system shipped ✓

---

## Acceptance Criteria

Before considering the project complete, verify:

- [ ] All 197 tests pass with unified tracking enabled
- [ ] No memory leaks detected
- [ ] Performance within ±10% of baseline
- [ ] React Strict Mode works correctly
- [ ] No user-facing API changes
- [ ] Code coverage maintained or improved
- [ ] All edge cases documented and tested
- [ ] Feature flag removed, legacy code deleted
- [ ] Documentation updated
- [ ] Changeset created
- [ ] PR merged to main

---

## Rollback Plan

If critical issues arise:

**Immediate (< 1 hour)**:
1. Revert feature flag: `useUnifiedTracking: false`
2. Deploy hotfix
3. Investigate issue

**Short-term (< 1 day)**:
1. Fix issue in unified tracker
2. Test fix thoroughly
3. Re-enable flag

**Long-term (> 1 day)**:
1. If unfixable, keep legacy code
2. Revisit Option 2 (Synchronous Tracking)
3. Document lessons learned

---

## Next Steps

1. Review this plan
2. Confirm timeline acceptable
3. Begin Phase 1, Task 1.1
4. Track progress daily
5. Update checkboxes as tasks complete

**Let's build the Hybrid Unified System!**
