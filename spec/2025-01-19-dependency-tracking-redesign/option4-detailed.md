# Option 4: Hybrid Unified System - Detailed Design

**Date**: 2025-01-19
**Status**: Design Proposal
**Scope**: Complete architectural redesign

## Philosophy

The current system tries to do three things simultaneously:
1. Track state property access (proxy-based)
2. Track getter access (proxy-based with caching)
3. Support manual dependencies (selector-based)

**Option 4's core insight**: These are all variations of the same problem - "track what the component depends on, notify when it changes." Instead of three separate mechanisms, we need **one unified dependency tracking system** that handles all cases.

---

## Architecture Overview

### Core Principle: Everything is a Dependency

```typescript
// A dependency is anything that can have a value that can change
type Dependency =
  | StateDependency    // State property access
  | ComputedDependency // Getter/computed value
  | CustomDependency   // User-provided selector

interface StateDependency {
  type: 'state';
  path: string; // e.g., "firstName" or "user.profile.email"
}

interface ComputedDependency {
  type: 'computed';
  key: string;         // e.g., "fullName"
  compute: () => any;  // Function to get current value
}

interface CustomDependency {
  type: 'custom';
  key: string;
  selector: (bloc: any) => any;
}
```

### Single Unified Tracker

```typescript
class UnifiedDependencyTracker {
  private subscriptions = new Map<string, SubscriptionState>();
  private globalCache = new Map<string, CacheEntry>();

  // Single method to track any dependency
  track(subscriptionId: string, dependency: Dependency): void;

  // Single method to notify on changes
  notifyChanges(blocId: string, changes: StateChange): Set<string>;

  // Single method to evaluate dependency value
  evaluate(dependency: Dependency, bloc: BlocBase): any;
}
```

**Key Difference from Current System:**
- Current: BlacAdapter (state tracking) + SubscriptionManager (getters) + manual deps
- Option 4: Single UnifiedDependencyTracker handles everything

---

## Detailed Design

### 1. Subscription State Structure

```typescript
interface SubscriptionState {
  id: string;
  blocId: string;

  // All dependencies tracked by this subscription
  dependencies: Dependency[];

  // Cached values for comparison
  // Key is dependency identifier, value is last known value
  valueCache: Map<string, any>;

  // Callback to trigger re-render
  notify: () => void;

  // Metadata
  metadata: {
    componentName?: string;
    mountTime: number;
    renderCount: number;
  };
}
```

**Example subscription state:**
```typescript
{
  id: "sub-abc123",
  blocId: "CounterBloc-1",
  dependencies: [
    { type: 'state', path: 'count' },
    { type: 'computed', key: 'doubled', compute: () => bloc.doubled }
  ],
  valueCache: Map {
    'state:count' => 5,
    'computed:doubled' => 10
  },
  notify: () => forceUpdate(),
  metadata: { componentName: 'CounterDisplay', ... }
}
```

### 2. Dependency Tracking Flow

#### During Component Render

```typescript
// In useBloc hook
function useBloc<B>(BlocConstructor: B): [state, bloc] {
  const subscriptionId = useRef(generateId()).current;
  const tracker = UnifiedDependencyTracker.getInstance();
  const bloc = Blac.getBloc(BlocConstructor);

  // Force update function
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Create subscription on mount
  useEffect(() => {
    tracker.createSubscription(subscriptionId, bloc._id, forceUpdate);
    return () => tracker.removeSubscription(subscriptionId);
  }, [subscriptionId, bloc._id]);

  // Create tracking proxies that call tracker.track()
  const stateProxy = useMemo(() =>
    createTrackingProxy(bloc.state, subscriptionId, tracker, 'state'),
    [bloc.state, subscriptionId]
  );

  const blocProxy = useMemo(() =>
    createTrackingProxy(bloc, subscriptionId, tracker, 'computed'),
    [bloc, subscriptionId]
  );

  return [stateProxy, blocProxy];
}
```

#### Proxy Creation

```typescript
function createTrackingProxy(
  target: any,
  subscriptionId: string,
  tracker: UnifiedDependencyTracker,
  mode: 'state' | 'computed'
): any {
  return new Proxy(target, {
    get(obj, prop) {
      if (typeof prop === 'symbol') return Reflect.get(obj, prop);

      const value = Reflect.get(obj, prop);

      if (mode === 'state') {
        // Track state access
        const dependency: StateDependency = {
          type: 'state',
          path: String(prop)
        };
        tracker.track(subscriptionId, dependency);

        // Recursively proxy nested objects
        if (value && typeof value === 'object') {
          return createTrackingProxy(value, subscriptionId, tracker, 'state');
        }

      } else if (mode === 'computed') {
        // Only track getters
        const descriptor = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(obj),
          prop
        );

        if (descriptor?.get) {
          const dependency: ComputedDependency = {
            type: 'computed',
            key: String(prop),
            compute: () => obj[prop] // Capture closure
          };
          tracker.track(subscriptionId, dependency);
        }
      }

      return value;
    }
  });
}
```

#### Tracking Method

```typescript
class UnifiedDependencyTracker {
  track(subscriptionId: string, dependency: Dependency): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return;

    // Check if already tracking this dependency
    const depKey = this.getDependencyKey(dependency);
    const alreadyTracked = sub.dependencies.some(d =>
      this.getDependencyKey(d) === depKey
    );

    if (alreadyTracked) {
      return; // No need to track twice
    }

    // Add to dependency list
    sub.dependencies.push(dependency);

    // CRITICAL: Immediately capture current value
    const bloc = Blac.getBloc(sub.blocId);
    const currentValue = this.evaluate(dependency, bloc);
    sub.valueCache.set(depKey, currentValue);

    // No async commit needed - tracking is complete!
  }

  private getDependencyKey(dep: Dependency): string {
    switch (dep.type) {
      case 'state': return `state:${dep.path}`;
      case 'computed': return `computed:${dep.key}`;
      case 'custom': return `custom:${dep.key}`;
    }
  }

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

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      current = current?.[part];
    }
    return current;
  }
}
```

### 3. State Change Notification Flow

#### When State Changes

```typescript
class BlocBase<S> {
  emit(newState: S): void {
    const oldState = this.state;
    this.state = newState;

    // Notify the unified tracker
    const tracker = UnifiedDependencyTracker.getInstance();
    const affectedSubscriptions = tracker.notifyChanges(this._id, {
      oldState,
      newState
    });

    // Tracker already called notify() on affected subscriptions
    // We're done!
  }
}
```

#### Notification Logic

```typescript
class UnifiedDependencyTracker {
  notifyChanges(blocId: string, change: StateChange): Set<string> {
    const affected = new Set<string>();

    // Find all subscriptions for this bloc
    for (const [subId, sub] of this.subscriptions) {
      if (sub.blocId !== blocId) continue;

      let shouldNotify = false;
      const bloc = Blac.getBloc(blocId);

      // Check each dependency
      for (const dep of sub.dependencies) {
        const depKey = this.getDependencyKey(dep);
        const oldValue = sub.valueCache.get(depKey);
        const newValue = this.evaluate(dep, bloc);

        // Value comparison (works for state, computed, and custom!)
        if (!Object.is(oldValue, newValue)) {
          // Value changed - update cache and mark for notification
          sub.valueCache.set(depKey, newValue);
          shouldNotify = true;
          break; // One changed dependency is enough
        }
      }

      if (shouldNotify) {
        affected.add(subId);
        sub.notify(); // Trigger React re-render
        sub.metadata.renderCount++;
      }
    }

    return affected;
  }
}
```

**Key Insight**: Same comparison logic for all dependency types! No special cases for getters vs state vs custom selectors.

---

## Complete Example

Let's trace through a real scenario:

### Setup: Counter with Getter

```typescript
class CounterBloc extends Cubit<{ count: number; name: string }> {
  constructor() {
    super({ count: 0, name: 'Counter' });
  }

  // Getter - automatically tracked
  get doubled(): number {
    return this.state.count * 2;
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  rename = (name: string) => {
    this.emit({ ...this.state, name });
  };
}
```

### Component Using Bloc

```typescript
function CounterDisplay() {
  const [state, bloc] = useBloc(CounterBloc);

  return (
    <div>
      <p>Count: {state.count}</p>
      <p>Doubled: {bloc.doubled}</p>
      <button onClick={bloc.increment}>Increment</button>
      <button onClick={() => bloc.rename('New Name')}>Rename</button>
    </div>
  );
}
```

### Execution Trace

#### 1. Initial Render

```
→ useBloc creates subscription "sub-1"
→ Render starts
→ Access state.count
  → Proxy intercepts
  → tracker.track("sub-1", { type: 'state', path: 'count' })
  → Current value: 0
  → valueCache.set('state:count', 0)

→ Access bloc.doubled
  → Proxy detects getter
  → tracker.track("sub-1", { type: 'computed', key: 'doubled', compute: () => bloc.doubled })
  → Executes compute: bloc.doubled → 0 * 2 = 0
  → valueCache.set('computed:doubled', 0)

→ Render complete

Subscription State:
{
  id: "sub-1",
  dependencies: [
    { type: 'state', path: 'count' },
    { type: 'computed', key: 'doubled', compute: [Function] }
  ],
  valueCache: Map {
    'state:count' => 0,
    'computed:doubled' => 0
  }
}
```

#### 2. User Clicks "Increment"

```
→ bloc.increment() called
→ emit({ count: 1, name: 'Counter' })
→ tracker.notifyChanges(blocId, { oldState, newState })

For subscription "sub-1":

  Check dependency 'state:count':
    oldValue = valueCache.get('state:count') = 0
    newValue = getNestedValue(newState, 'count') = 1
    0 !== 1 → CHANGED!

    Update cache: valueCache.set('state:count', 1)
    shouldNotify = true
    break (no need to check more)

  Call sub.notify() → React re-renders component

→ Component re-renders
→ Access state.count → 1 (already cached, no re-track)
→ Access bloc.doubled
  → Re-executes: 1 * 2 = 2
  → Compares with cache: 0 !== 2 → CHANGED
  → Update cache: valueCache.set('computed:doubled', 2)
```

#### 3. User Clicks "Rename"

```
→ bloc.rename('New Name') called
→ emit({ count: 1, name: 'New Name' })
→ tracker.notifyChanges(blocId, { oldState, newState })

For subscription "sub-1":

  Check dependency 'state:count':
    oldValue = 1
    newValue = 1
    1 === 1 → No change

  Check dependency 'computed:doubled':
    oldValue = 2
    newValue = compute() = 1 * 2 = 2
    2 === 2 → No change

  shouldNotify = false

  Don't call notify() - NO RE-RENDER! ✅

→ Component does NOT re-render (name not tracked)
```

**This is exactly the behavior we want!**

---

## Handling Edge Cases

### 1. Nested State Access

```typescript
// Component accesses nested property
const email = state.user.profile.email;

// Tracking flow:
// 1. Access state.user → track 'user'
// 2. Access user.profile → track 'user.profile'
// 3. Access profile.email → track 'user.profile.email'

// Optimization: Filter to leaf paths only
// Final dependency: { type: 'state', path: 'user.profile.email' }
```

**Implementation:**
```typescript
track(subscriptionId: string, dependency: StateDependency): void {
  // ... existing logic ...

  // After render, filter leaf paths
  this.optimizeDependencies(subscriptionId);
}

private optimizeDependencies(subscriptionId: string): void {
  const sub = this.subscriptions.get(subscriptionId);

  // Filter state dependencies to leaf paths only
  const stateDeps = sub.dependencies.filter(d => d.type === 'state');
  const leafPaths = this.filterLeafPaths(
    stateDeps.map(d => d.path)
  );

  // Replace with optimized set
  sub.dependencies = [
    ...sub.dependencies.filter(d => d.type !== 'state'),
    ...leafPaths.map(path => ({ type: 'state', path }))
  ];
}
```

### 2. Dynamic Dependencies

```typescript
// Getter that accesses different state based on condition
get displayValue(): string {
  if (this.state.mode === 'count') {
    return `Count: ${this.state.count}`;
  } else {
    return `Name: ${this.state.name}`;
  }
}
```

**How it's handled:**
- First render with mode='count' → tracks only 'count'
- State changes to mode='name'
- Getter re-executes → now accesses 'name'
- Next render → dependencies update automatically
- **Dynamic tracking "just works"** because we re-execute on every render

### 3. Array Methods

```typescript
// Component uses array method
const names = state.users.map(u => u.name);

// Current tracking: 'users', 'users.map'
// Optimization: 'users.map' is metadata, track 'users' instead
```

**Implementation:**
```typescript
private filterLeafPaths(paths: string[]): string[] {
  const metaProperties = new Set([
    'map', 'filter', 'length', 'join', 'forEach', etc.
  ]);

  return paths.map(path => {
    const lastSegment = path.split('.').pop();
    if (metaProperties.has(lastSegment)) {
      // Remove last segment (array method)
      return path.split('.').slice(0, -1).join('.');
    }
    return path;
  });
}
```

### 4. Manual Dependencies (Custom Selectors)

```typescript
// User provides custom selector
useBloc(CounterBloc, {
  dependencies: (bloc) => [bloc.state.count, bloc.doubled]
});

// Convert to unified dependencies:
const customDeps = [
  { type: 'custom', key: 'selector-0', selector: (b) => b.state.count },
  { type: 'custom', key: 'selector-1', selector: (b) => b.doubled }
];
```

**Implementation:**
```typescript
// In useBloc
if (options?.dependencies) {
  const selectorFn = options.dependencies;

  // Wrap in a custom dependency
  const customDep: CustomDependency = {
    type: 'custom',
    key: 'manual-deps',
    selector: (bloc) => {
      const result = selectorFn(bloc);
      // Result can be array or generator
      return Array.isArray(result) ? result : Array.from(result);
    }
  };

  tracker.track(subscriptionId, customDep);
}
```

### 5. React Strict Mode

```typescript
// Strict Mode renders twice
// First render: track dependencies
// Second render: track dependencies again (duplicate)

// Solution: Track is idempotent
track(subscriptionId: string, dependency: Dependency): void {
  const depKey = this.getDependencyKey(dependency);

  // Check if already tracked
  if (this.alreadyTracked(subscriptionId, depKey)) {
    return; // Duplicate access - ignore
  }

  // ... rest of tracking logic
}
```

**No clearing needed** - tracking is naturally idempotent because we check before adding.

---

## Migration Path

### Phase 1: Implement Tracker (Parallel to Current System)

```typescript
// Add new tracker alongside existing code
class UnifiedDependencyTracker { ... }

// Add feature flag
Blac.setConfig({
  useUnifiedTracking: false // Default off
});
```

### Phase 2: Adapt useBloc to Use Tracker (Behind Flag)

```typescript
function useBloc(...) {
  if (Blac.config.useUnifiedTracking) {
    return useBloc_Unified(...);
  } else {
    return useBloc_Legacy(...);
  }
}
```

### Phase 3: Test & Validate

```typescript
// Enable in tests
beforeEach(() => {
  Blac.setConfig({ useUnifiedTracking: true });
});

// Run full test suite
// Fix any issues
```

### Phase 4: Enable by Default

```typescript
Blac.setConfig({
  useUnifiedTracking: true // New default
});
```

### Phase 5: Remove Legacy Code

```typescript
// Delete BlacAdapter.resetTracking/commitTracking
// Delete SubscriptionManager.checkGetterChanged
// Delete ProxyFactory dual-cache system
// Simplify to single tracking path
```

---

## Performance Analysis

### Current System

```
Render:
  1. resetTracking() - O(1)
  2. Proxy access - O(1) per access
  3. trackAccess() - O(1) per access
  4. useEffect microtask
  5. commitTracking() - O(n) filter + transfer
  Total: O(n) where n = tracked paths

State Change:
  6. notify() - O(s) iterate subscriptions
  7. checkGetterChanged() - O(g) re-execute getters
  8. shouldNotifyForPaths() - O(d) check dependencies
  Total: O(s * (g + d))
```

### Option 4 Unified System

```
Render:
  1. Proxy access - O(1) per access
  2. track() - O(1) idempotency check + add
  Total: O(1) per access

State Change:
  3. notifyChanges() - O(s) iterate subscriptions
  4. evaluate() - O(d) re-execute dependencies
  5. compare - O(d) value comparison
  Total: O(s * d)
```

**Improvements:**
- ✅ Eliminates useEffect delay
- ✅ No O(n) filtering step
- ✅ No separate getter check logic
- ✅ Single pass through dependencies

**Same Complexity:**
- ⚠️ Still O(s * d) for notifications
- ⚠️ Still re-execute getters on every change

**Future Optimizations:**
- Index subscriptions by dependency path → O(affected subs) instead of O(all subs)
- Smart invalidation → Only re-execute getters if their state deps changed

### Memory Comparison

```
Current:
  - pendingDependencies: O(n) per adapter
  - pendingGetterValues: O(g) per adapter
  - subscription.dependencies: O(d) per subscription
  - subscription.getterCache: O(g) per subscription
  - ProxyFactory cache: O(proxies) global
  Total: O(adapters * n + subscriptions * (d + g))

Option 4:
  - subscription.dependencies: O(d) per subscription
  - subscription.valueCache: O(d) per subscription
  - ProxyFactory cache: O(proxies) global (same)
  Total: O(subscriptions * d)
```

**Improvements:**
- ✅ No per-adapter pending caches
- ✅ Single cache per subscription (not separate for getters)
- ✅ Simpler: 2 collections instead of 5

---

## Comparison with Current System

| Aspect | Current System | Option 4 Unified |
|--------|----------------|------------------|
| **Tracking Phases** | 4 (reset → track → commit → check) | 2 (track → check) |
| **Cache Layers** | 3 (ProxyFactory + pending + subscription) | 1 (subscription) |
| **Tracking Paradigms** | 3 (state paths, getters, custom) | 1 (unified dependencies) |
| **Comparison Strategies** | 2 (path comparison, value comparison) | 1 (value comparison) |
| **Async Boundaries** | 1 (useEffect commit) | 0 (synchronous) |
| **Lines of Code** | ~1500 (across 3 files) | ~500 (single file) |
| **Cyclomatic Complexity** | High (nested conditions) | Low (single algorithm) |
| **Ownership** | Split (Adapter + Manager) | Clear (Tracker) |
| **Timing Bugs** | Possible (race conditions) | Impossible (synchronous) |
| **Test Surface** | Large (many components) | Small (one component) |

---

## Why "Clean Slate"?

**Not a Refactor, a Replacement:**

1. **New Component**: UnifiedDependencyTracker replaces BlacAdapter + SubscriptionManager split
2. **New Data Structures**: Unified Dependency type instead of separate path/cache systems
3. **New Algorithm**: Single comparison loop instead of multi-phase commit
4. **New Philosophy**: "Everything is a dependency" vs "state vs getters vs custom"

**What We Keep:**
- Proxy-based access tracking (configurable)
- useSyncExternalStore integration
- Plugin notification points
- Bloc/Cubit public API

**What We Delete:**
- BlacAdapter.resetTracking/commitTracking
- SubscriptionManager.checkGetterChanged/shouldNotifyForPaths
- Separate getter caching logic
- Two-phase dependency management
- Mixed comparison strategies

**Net Result:**
- 66% less code
- 1/3 the complexity
- 0 timing bugs
- 100% consistent behavior

---

## Risks and Mitigation

### Risk 1: Unknown Bugs in New Implementation

**Mitigation:**
- Implement behind feature flag
- Run existing test suite with flag enabled
- Add new tests for unified tracker
- Gradual rollout (internal → beta → production)

### Risk 2: Performance Regression

**Mitigation:**
- Benchmark before/after
- Profile in production-like scenarios
- Add performance tests to CI
- Optimize hot paths if needed

### Risk 3: Breaking Edge Cases

**Mitigation:**
- Comprehensive test coverage first
- Document edge cases before implementing
- Beta testing period with real apps
- Rollback plan (feature flag)

### Risk 4: Scope Creep During Implementation

**Mitigation:**
- Strict scope: tracking system only
- Don't touch Bloc/Cubit API
- Don't touch plugin system
- Don't add "nice to have" features

### Risk 5: Timeline Overrun

**Mitigation:**
- Time-boxed milestones
- MVP first (basic tracking works)
- Iterate on optimizations
- Parallel work allowed (tests + implementation)

---

## Success Criteria

**Must Pass:**
1. All 197 existing tests pass
2. No memory leaks (run leak detector)
3. Performance within 10% of current (benchmark suite)
4. Works in React Strict Mode
5. Backward compatible API (no user changes needed)

**Should Have:**
6. Simpler codebase (LOC reduced)
7. Clear ownership (single component)
8. Synchronous (no async boundaries)

**Nice to Have:**
9. Better performance than current
10. Enhanced debugging (dependency visualization)
11. Smaller bundle size

---

## Timeline Estimate

**Week 1: Foundation**
- Days 1-2: Implement UnifiedDependencyTracker core
- Days 3-4: Implement dependency evaluation logic
- Day 5: Write unit tests for tracker

**Week 2: Integration**
- Days 1-2: Adapt useBloc to use tracker
- Days 3-4: Migrate notification logic
- Day 5: Integration testing

**Week 3: Validation & Polish**
- Days 1-2: Full test suite validation
- Days 3-4: Fix bugs, edge cases
- Day 5: Performance benchmarking

**Week 4: Cleanup & Launch**
- Days 1-2: Remove legacy code
- Days 3-4: Documentation updates
- Day 5: Final review & merge

**Total: 4 weeks** (20 working days)

**Can be accelerated to 2 weeks** if working full-time with high focus.

---

## Conclusion

Option 4 is the "clean slate" approach because it fundamentally rethinks the architecture rather than patching the current system. It's:

- **More correct**: Eliminates timing bugs by design
- **More maintainable**: Single component, clear ownership
- **More performant**: Fewer caches, synchronous flow
- **More debuggable**: One algorithm to understand
- **More future-proof**: Easy to extend and optimize

The trade-off is **time and risk**: it requires rewriting core logic with no incremental path. But the result is a system that will be solid for years instead of accumulating more patches.

**When to choose Option 4:**
- You have 2+ weeks available
- You're willing to accept higher upfront risk for long-term quality
- You value architectural clarity over short-term velocity
- You want to fix the root cause, not just symptoms

**When NOT to choose Option 4:**
- Need tests passing this week
- Can't afford regression risk
- Prefer iterative improvements
- Team not ready for big refactor

If Option 4 feels too ambitious, **Option 2 is an excellent middle ground**: it fixes the timing bug with a proven pattern (Valtio) while keeping more of the existing structure intact.
