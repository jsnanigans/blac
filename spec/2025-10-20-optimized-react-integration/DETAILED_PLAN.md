# Detailed Implementation Plan: React Adapter Pattern (Phases 4-8)

**Current Status**: Phases 1-3 Complete + Full Migration ✅
**Next Steps**: Phases 4-8 (Optional Enhancements)

---

## Phase 4: React 18 Features (Advanced)

**Goal**: Complete React 18 feature support including Suspense, concurrent rendering, and SSR
**Priority**: Medium (Basic Suspense already works, this adds comprehensive support)
**Estimated Time**: 3-4 days

### 4.1 Suspense Integration Enhancement

**Current State**: Basic Suspense support exists via `suspense`, `loadAsync`, `isLoading`, `getLoadingPromise` options

**What Needs Improvement**:
1. Current implementation requires manual promise management
2. No automatic promise caching or tracking
3. Error handling not integrated
4. Suspense test is skipped

#### Task 4.1.1: Enhanced Promise Tracking

**Why**: Simplify Suspense usage by automatically tracking bloc promises without manual configuration

**How**:
```typescript
// STEP 1: Add SuspensePromiseManager class
// Location: packages/blac-react/src/adapter/SuspensePromiseManager.ts

class SuspensePromiseManager {
  private promiseCache = new WeakMap<BlocBase<any>, Promise<void> | null>();
  private loadingStates = new WeakMap<BlocBase<any>, boolean>();

  /**
   * Track a promise for a bloc
   * @param bloc - The bloc instance
   * @param promise - The promise to track
   */
  trackPromise(bloc: BlocBase<any>, promise: Promise<void>): void {
    this.promiseCache.set(bloc, promise);
    this.loadingStates.set(bloc, true);

    promise.finally(() => {
      this.loadingStates.set(bloc, false);
      this.promiseCache.delete(bloc);
    });
  }

  /**
   * Get cached promise for bloc
   */
  getPromise(bloc: BlocBase<any>): Promise<void> | null {
    return this.promiseCache.get(bloc) || null;
  }

  /**
   * Check if bloc is loading
   */
  isLoading(bloc: BlocBase<any>): boolean {
    return this.loadingStates.get(bloc) || false;
  }
}
```

**Instructions**:
1. Create `packages/blac-react/src/adapter/SuspensePromiseManager.ts`
2. Implement the class with WeakMap-based promise tracking
3. Add singleton instance: `export const suspenseManager = new SuspensePromiseManager();`
4. Export from `packages/blac-react/src/adapter/index.ts`

**Testing**:
- Test promise caching
- Test automatic cleanup on promise resolution
- Test concurrent promises for different blocs

#### Task 4.1.2: Automatic Loading Detection

**Why**: Remove boilerplate by auto-detecting when blocs are loading

**How**:
```typescript
// STEP 2: Add convention for async blocs
// Blocs should have standardized loading detection

// In useBlocAdapter.ts, add auto-detection:
function detectLoading(bloc: BlocBase<any>): boolean {
  // Check common loading patterns
  if ('isLoading' in bloc && typeof (bloc as any).isLoading === 'boolean') {
    return (bloc as any).isLoading;
  }
  if ('loading' in bloc.state && typeof bloc.state.loading === 'boolean') {
    return bloc.state.loading;
  }
  return false;
}

function detectPromise(bloc: BlocBase<any>): Promise<void> | null {
  // Check common promise patterns
  if ('loadingPromise' in bloc && (bloc as any).loadingPromise instanceof Promise) {
    return (bloc as any).loadingPromise;
  }
  if ('promise' in bloc.state && bloc.state.promise instanceof Promise) {
    return bloc.state.promise;
  }
  return suspenseManager.getPromise(bloc);
}
```

**Instructions**:
1. Add helper functions in `useBlocAdapter.ts`
2. Update Suspense logic to use auto-detection
3. Keep manual options for override capability
4. Document conventions in JSDoc

**Testing**:
- Test with bloc having `isLoading` property
- Test with state having `loading` property
- Test with manual options override

#### Task 4.1.3: Error Boundary Integration

**Why**: Suspense errors should propagate to React Error Boundaries

**How**:
```typescript
// STEP 3: Add error handling wrapper

class SuspenseError extends Error {
  constructor(
    message: string,
    public readonly bloc: BlocBase<any>,
    public readonly originalError: Error
  ) {
    super(message);
    this.name = 'SuspenseError';
  }
}

// In SuspensePromiseManager:
trackPromise(bloc: BlocBase<any>, promise: Promise<void>): void {
  const wrappedPromise = promise.catch((error) => {
    // Convert to SuspenseError for better error boundaries
    throw new SuspenseError(
      `Suspense loading failed for ${bloc._name}`,
      bloc,
      error
    );
  });

  this.promiseCache.set(bloc, wrappedPromise);
  // ... rest of implementation
}
```

**Instructions**:
1. Create `SuspenseError` class
2. Wrap promises to convert errors
3. Add error state tracking
4. Document error handling patterns

**Testing**:
- Test error propagation to Error Boundary
- Test error recovery
- Test multiple concurrent errors

#### Task 4.1.4: Comprehensive Suspense Tests

**Why**: Currently 1 Suspense test is skipped, need full coverage

**Location**: `packages/blac-react/src/adapter/__tests__/useBlocAdapter.suspense.test.tsx`

**Test Cases**:
```typescript
describe('Suspense Integration', () => {
  it('should suspend on async bloc initialization');
  it('should resume when promise resolves');
  it('should throw to Error Boundary on promise rejection');
  it('should handle concurrent Suspense boundaries');
  it('should work with nested Suspense boundaries');
  it('should support manual promise tracking');
  it('should auto-detect loading state');
  it('should cache promises per bloc instance');
  it('should cleanup promises on unmount');
  it('should handle Suspense with selectors');
  it('should support Suspense in Strict Mode');
  it('should handle promise race conditions');
});
```

**Instructions**:
1. Create new test file
2. Implement each test case
3. Use `@testing-library/react` with Suspense
4. Test both auto and manual modes
5. Ensure all tests pass
6. Remove skip from existing Suspense test

---

### 4.2 Concurrent Features Support

**Current State**: useSyncExternalStore provides basic concurrent compatibility

**What's Needed**: Explicit support for useTransition and useDeferredValue patterns

#### Task 4.2.1: useTransition Support

**Why**: Allow non-blocking state updates for better UX during heavy renders

**How**:
```typescript
// STEP 1: Add transition-aware subscription

// In ReactBlocAdapter.ts:
interface SubscriptionOptions {
  selector?: Selector<any, any>;
  notify: () => void;
  compare?: CompareFn<any>;
  isPriority?: boolean; // NEW: Mark as priority update
}

// Modify subscribe method:
subscribe<R>(
  selector: Selector<S, R> | undefined,
  notify: () => void,
  compare?: CompareFn<R>,
  options?: { isPriority?: boolean }
): () => void {
  // ... existing code ...

  const subscription: Subscription<R> = {
    id,
    selector,
    notify,
    compare,
    lastResult,
    lastNotifiedVersion: this.version,
    refCount: 1,
    isPriority: options?.isPriority || false, // NEW
  };

  // ... rest of implementation
}

// Modify notifySubscribers to respect priority:
private notifySubscribers(newState: S, oldState: S): void {
  // Notify priority subscriptions first
  const prioritySubs = Array.from(this.subscriptions.values())
    .filter(sub => sub.isPriority);
  const normalSubs = Array.from(this.subscriptions.values())
    .filter(sub => !sub.isPriority);

  for (const sub of prioritySubs) {
    this.notifySubscription(sub, newState, oldState);
  }

  // Normal subscriptions can be deferred
  for (const sub of normalSubs) {
    this.notifySubscription(sub, newState, oldState);
  }
}
```

**Instructions**:
1. Add `isPriority` flag to subscription interface
2. Modify `subscribe()` to accept priority option
3. Update `notifySubscribers()` to handle priority
4. Document useTransition pattern in JSDoc
5. Create example component showing usage

**Example Usage**:
```typescript
function SearchResults() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const [results, bloc] = useBloc(SearchBloc, {
    selector: (state) => state.results,
    // Mark as non-priority for transition
  });

  const handleSearch = (value: string) => {
    setQuery(value);
    startTransition(() => {
      bloc.search(value);
    });
  };

  return (
    <div>
      <input value={query} onChange={e => handleSearch(e.target.value)} />
      {isPending && <div>Searching...</div>}
      <Results data={results} />
    </div>
  );
}
```

**Testing**:
- Test priority vs normal subscriptions
- Test with React.useTransition
- Test render priority ordering
- Test concurrent updates

#### Task 4.2.2: useDeferredValue Compatibility

**Why**: Enable performance optimization for expensive renders

**How**:
```typescript
// STEP 2: Document pattern, no code changes needed

// useDeferredValue works automatically with adapter pattern
// Just document the usage pattern

/**
 * Example: Using useDeferredValue with useBloc
 *
 * @example
 * function FilteredList() {
 *   const [filter, setFilter] = useState('');
 *   const deferredFilter = useDeferredValue(filter);
 *
 *   const [items, bloc] = useBloc(ListBloc, {
 *     selector: (state) => state.items.filter(
 *       item => item.name.includes(deferredFilter)
 *     )
 *   });
 *
 *   return (
 *     <>
 *       <input value={filter} onChange={e => setFilter(e.target.value)} />
 *       <List items={items} />
 *     </>
 *   );
 * }
 */
```

**Instructions**:
1. No code changes required (already compatible)
2. Add documentation to `USAGE_GUIDE.md`
3. Create example components
4. Add test demonstrating pattern

**Testing**:
- Test deferred value with selector
- Test render priority
- Test with slow renders

#### Task 4.2.3: Automatic Batching Verification

**Why**: Ensure React 18 automatic batching works correctly

**How**:
```typescript
// STEP 3: Create tests to verify batching

describe('React 18 Automatic Batching', () => {
  it('should batch multiple bloc updates in event handler', () => {
    // Multiple bloc.emit() calls should batch into single render
  });

  it('should batch updates in async callbacks', () => {
    // React 18 auto-batches these now
  });

  it('should batch updates in promises', () => {
    // React 18 feature
  });

  it('should batch updates in setTimeout', () => {
    // React 18 feature
  });
});
```

**Instructions**:
1. Create test file: `useBlocAdapter.batching.test.tsx`
2. Implement batching verification tests
3. Use render counters to verify batching
4. Document batching behavior

**Testing**:
- Test event handler batching
- Test async batching
- Test setTimeout batching
- Test promise batching

---

### 4.3 SSR Support

**Current State**: Basic getServerSnapshot exists but returns same as getSnapshot

**What's Needed**: Proper server-side rendering with hydration safety

#### Task 4.3.1: Server Snapshot Implementation

**Why**: Prevent hydration mismatches in SSR environments

**How**:
```typescript
// STEP 1: Add server environment detection

// In ReactBlocAdapter.ts:
class ReactBlocAdapter<S> {
  private isServer = typeof window === 'undefined';

  /**
   * Get snapshot for server-side rendering
   * Returns initial/default state to prevent hydration mismatches
   */
  getServerSnapshot<R>(selector?: Selector<S, R>): R | S {
    if (this.isServer) {
      // On server, always return initial state
      // This prevents hydration mismatches
      return selector ? selector(this.initialState) : this.initialState;
    }

    // On client (during hydration), use current state
    return this.getSnapshot(selector);
  }

  // Store initial state on construction
  private initialState: S;

  constructor(bloc: BlocBase<S>) {
    this.bloc = bloc;
    this.initialState = bloc.state; // Capture initial state
    // ... rest of constructor
  }
}
```

**Instructions**:
1. Add `isServer` detection in ReactBlocAdapter
2. Store `initialState` on construction
3. Implement `getServerSnapshot()` properly
4. Update `useBlocAdapter` to use new server snapshot
5. Add JSDoc explaining hydration safety

**Testing**:
- Test server environment detection
- Test initial state capture
- Test hydration safety
- Test SSR rendering

#### Task 4.3.2: SSR Test Suite

**Why**: Verify SSR works correctly without hydration warnings

**Location**: `packages/blac-react/src/adapter/__tests__/useBlocAdapter.ssr.test.tsx`

**Test Cases**:
```typescript
describe('Server-Side Rendering', () => {
  it('should return initial state on server');
  it('should prevent hydration mismatches');
  it('should work with selectors in SSR');
  it('should hydrate correctly on client');
  it('should handle state changes after hydration');
  it('should work with multiple blocs in SSR');
  it('should handle nested components in SSR');
});
```

**Instructions**:
1. Create SSR test file
2. Mock server environment (`window` undefined)
3. Test renderToString scenarios
4. Test hydration scenarios
5. Verify no console warnings

**Testing**:
- Test server rendering
- Test client hydration
- Test state synchronization
- Test mismatch detection

---

## Phase 5: Performance Optimizations

**Goal**: Optimize memory usage, selector performance, and batching
**Priority**: Low (Current performance is already good)
**Estimated Time**: 2 days

### 5.1 Advanced Caching & Memoization

**Current State**: Basic selector memoization exists via comparison functions

#### Task 5.1.1: LRU Cache for Selector Results

**Why**: Prevent memory growth when using many dynamic selectors

**How**:
```typescript
// STEP 1: Implement LRU Cache

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists (to re-add at end)
    this.cache.delete(key);

    // Add to end
    this.cache.set(key, value);

    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// In ReactBlocAdapter:
private selectorResultCache = new LRUCache<string, any>(100);

getSnapshot<R>(selector?: Selector<S, R>): R | S {
  if (!selector) {
    return this.bloc.state;
  }

  // Create cache key from selector
  const cacheKey = `v${this.version}-${selector.toString().slice(0, 50)}`;

  // Check cache
  const cached = this.selectorResultCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Compute and cache
  const result = selector(this.bloc.state);
  this.selectorResultCache.set(cacheKey, result);
  return result;
}
```

**Instructions**:
1. Create `LRUCache` class in `adapter/LRUCache.ts`
2. Add to ReactBlocAdapter for selector results
3. Configure max size (default 100)
4. Clear cache on bloc disposal

**Testing**:
- Test cache hit/miss
- Test LRU eviction
- Test cache size limits
- Test memory usage

#### Task 5.1.2: Structural Sharing for State

**Why**: Minimize memory allocation when state changes

**Current State**: Not needed - blocs should emit new objects anyway

**Decision**: **DEFER** - This is the responsibility of Bloc implementations, not the adapter

---

### 5.2 Batch Processing

**Current State**: React 18 handles batching automatically

#### Task 5.2.1: Custom Batching API

**Why**: Allow manual batching for programmatic updates

**How**:
```typescript
// STEP 1: Add batch API to adapter

class ReactBlocAdapter<S> {
  private isBatching = false;
  private batchedNotifications = new Set<Subscription<any>>();

  /**
   * Batch multiple updates into single notification
   */
  batch(fn: () => void): void {
    if (this.isBatching) {
      // Already batching, just run function
      fn();
      return;
    }

    this.isBatching = true;
    this.batchedNotifications.clear();

    try {
      fn();
    } finally {
      this.isBatching = false;
      // Flush batched notifications
      for (const sub of this.batchedNotifications) {
        sub.notify();
      }
      this.batchedNotifications.clear();
    }
  }

  private notifySubscription(
    sub: Subscription<any>,
    newState: S,
    oldState: S
  ): void {
    // ... existing comparison logic ...

    if (this.isBatching) {
      this.batchedNotifications.add(sub);
    } else {
      sub.notify();
    }
  }
}

// Export batch function
export function batchBlocUpdates(fn: () => void): void {
  // Batch all bloc updates in function
  const allAdapters = getAllAdapters(); // Need to implement

  Promise.all(allAdapters.map(adapter =>
    new Promise(resolve => adapter.batch(() => { fn(); resolve(undefined); }))
  ));
}
```

**Instructions**:
1. Add batching state to ReactBlocAdapter
2. Implement `batch()` method
3. Modify `notifySubscription()` to respect batching
4. Export `batchBlocUpdates()` utility

**Decision**: **DEFER** - React 18 automatic batching handles this

---

## Phase 6: Cross-Bloc Dependencies

**Goal**: Allow blocs to depend on other blocs
**Priority**: Low (Complex feature, not commonly needed)
**Estimated Time**: 2-3 days

**Decision**: **DEFER to future enhancement** - This is a complex feature requiring careful design

---

## Phase 7: Testing & Validation

**Goal**: Comprehensive test coverage and performance validation
**Priority**: Medium
**Estimated Time**: 2 days

### 7.1 Performance Benchmarks

**Why**: Validate adapter pattern is faster than unified tracking

#### Task 7.1.1: Benchmark Suite

**Location**: `packages/blac-react/src/adapter/__tests__/performance.bench.ts`

**Benchmarks**:
```typescript
describe('Performance Benchmarks', () => {
  bench('subscribe/unsubscribe cycle', () => {
    // Measure subscription creation/cleanup
  });

  bench('selector evaluation (simple)', () => {
    // Measure simple selector performance
  });

  bench('selector evaluation (complex)', () => {
    // Measure complex selector performance
  });

  bench('version-based change detection', () => {
    // Measure O(1) version check
  });

  bench('100 rapid state changes', () => {
    // Measure batching and notification
  });

  bench('1000 subscriptions', () => {
    // Measure scalability
  });
});
```

**Instructions**:
1. Use Vitest bench API
2. Create realistic scenarios
3. Compare with baseline metrics
4. Document results in `PERFORMANCE.md`

---

## Phase 8: Developer Experience

**Goal**: Enhanced debugging and documentation
**Priority**: Low
**Estimated Time**: 2 days

### 8.1 Enhanced Documentation

#### Task 8.1.1: API Reference

**Location**: `spec/2025-10-20-optimized-react-integration/API_REFERENCE.md`

**Sections**:
1. `useBloc` / `useBlocAdapter` API
2. Options reference
3. ReactBlocAdapter API
4. Selector patterns
5. Best practices
6. Common pitfalls
7. TypeScript usage

**Instructions**:
1. Create comprehensive API docs
2. Include examples for each option
3. Add type signatures
4. Document edge cases

#### Task 8.1.2: Migration Guide Expansion

**Location**: `spec/2025-10-20-optimized-react-integration/MIGRATION_GUIDE.md`

**Sections**:
1. Quick migration checklist
2. Pattern translations
3. Common issues and solutions
4. Performance tips
5. Testing strategies

**Instructions**:
1. Create detailed migration guide
2. Include before/after examples
3. Add troubleshooting section
4. Document breaking changes

---

## Implementation Priority Order

Based on value and effort:

### High Priority (Do First)
1. ✅ **Phase 4.1**: Complete Suspense Integration
   - High value for async blocs
   - Fixes skipped test
   - ~1 day effort

2. ✅ **Phase 4.3**: SSR Support
   - Important for Next.js/Remix users
   - Prevents hydration issues
   - ~0.5 day effort

3. ✅ **Phase 7.1**: Performance Benchmarks
   - Validates our work
   - Provides metrics for future
   - ~0.5 day effort

### Medium Priority (Do Second)
4. **Phase 4.2**: Concurrent Features
   - Nice-to-have documentation
   - Already mostly works
   - ~0.5 day effort

5. **Phase 8.1**: Enhanced Documentation
   - Helps adoption
   - Low effort, high value
   - ~1 day effort

### Low Priority (Future)
6. **Phase 5**: Performance Optimizations
   - Current perf is already good
   - Diminishing returns
   - ~1 day effort

7. **Phase 6**: Cross-Bloc Dependencies
   - Complex feature
   - Not commonly needed
   - ~3 days effort

---

## Success Criteria for Each Phase

### Phase 4 Success
- ✅ All Suspense tests passing (no skips)
- ✅ SSR hydration works without warnings
- ✅ Concurrent features documented with examples
- ✅ Error boundaries work with Suspense

### Phase 7 Success
- ✅ Benchmarks show performance improvement
- ✅ Memory usage is stable
- ✅ Scalability validated (1000+ components)

### Phase 8 Success
- ✅ Comprehensive API docs published
- ✅ Migration guide covers all scenarios
- ✅ Examples for all features
- ✅ Troubleshooting guide complete

---

## Next Steps

**Recommended Order**:
1. Start with **Phase 4.1** (Suspense) - fixes skipped test
2. Then **Phase 4.3** (SSR) - important feature
3. Then **Phase 7.1** (Benchmarks) - validate performance
4. Then **Phase 8.1** (Documentation) - improve DX

**Total Estimated Time**: 3-4 days for high priority items

Ready to proceed with Phase 4.1 (Suspense Integration)?
