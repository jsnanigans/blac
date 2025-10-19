# Dependency Tracking System - Research Findings

**Date**: 2025-01-19
**Researcher**: Claude (Investigator Agent + Web Research)
**Scope**: Comprehensive analysis of BlaC dependency tracking + industry patterns

## Executive Summary

The BlaC dependency tracking system has a **critical timing bug** where getter caches are populated asynchronously (in useEffect) but checked synchronously (during state changes). This creates a window where necessary re-renders are missed. Beyond this immediate bug, the architecture suffers from complexity stemming from mixing three different tracking paradigms (selectors, proxies, manual dependencies) with unclear ownership boundaries.

**Immediate Fix**: Change `SubscriptionManager.ts:394` to return `true` (not `false`) when cache is empty
**Long-term Solution**: Redesign to single-phase synchronous tracking using one consistent paradigm

---

## Part 1: Current Architecture Deep Dive

### 1.1 Complete System Flow

#### Initial Subscription Setup
```
1. useBloc creates BlacAdapter
2. BlacAdapter creates Bloc instance
3. useSyncExternalStore subscribes via adapter.getSubscribe()
4. BlacAdapter.createSubscription() creates subscription in SubscriptionManager
5. Subscription ID returned and stored in adapter
```

#### Render Cycle (Per Frame)
```
[BEFORE RENDER - Synchronous]
1. useBloc calls adapter.resetTracking()
   - Clears pendingDependencies Set
   - Clears pendingGetterValues Map
   - Sets isTrackingActive = true

[DURING RENDER - Synchronous]
2. Component renders, accesses state/getters
3. Proxy intercepts access → adapter.trackAccess()
   - For state: tracks path (e.g., "firstName")
   - For getters: tracks path ("_class.fullName") + value
   - Stores in pending collections

[AFTER RENDER - Asynchronous]
4. useEffect runs → adapter.commitTracking()
   - Filters paths to leaf nodes only
   - Atomically swaps subscription.dependencies
   - Transfers pendingGetterValues → subscription.getterCache
   - Sets isTrackingActive = false
```

#### State Change Cycle
```
[WHEN STATE CHANGES]
1. BlocBase.emit(newState)
2. SubscriptionManager.notify(newState, oldState)
3. For each subscription:
   a. Get changed paths via getChangedPaths()
   b. Call shouldNotifyForPaths()
   c. For each tracked dependency:
      - State paths: check if in changedPaths
      - Getter paths: call checkGetterChanged()
   d. If any dependency changed → subscription.notify()
4. subscription.notify() triggers React re-render
```

### 1.2 Data Flow Diagram

```
┌─────────────────┐
│ React Component │
└────────┬────────┘
         │
    useBloc hook
         │
         ↓
┌─────────────────┐
│  BlacAdapter    │  Orchestration Layer
│  ┌───────────┐  │
│  │ Tracking: │  │
│  │ - pending │  │  ← Temporary storage during render
│  │ - values  │  │
│  └───────────┘  │
└────────┬────────┘
         │
         ↓
┌────────────────────┐
│ SubscriptionManager│  Notification Layer
│  ┌──────────────┐  │
│  │Subscription: │  │
│  │ - deps       │  │  ← Active dependencies after commit
│  │ - cache      │  │  ← Getter values for comparison
│  └──────────────┘  │
└────────┬───────────┘
         │
         ↓
┌─────────────────┐
│   BlocBase      │  State Container
│  state: T       │
└─────────────────┘

CACHE FLOW:
ProxyFactory          BlacAdapter             SubscriptionManager
   access  ────────→  pending  ─────────→     cache
  (render)           (temporary)            (permanent)
```

### 1.3 State and Cache Ownership Map

| Component | State Owned | Lifecycle | Access Pattern |
|-----------|-------------|-----------|----------------|
| **BlacAdapter** | `pendingDependencies: Set<string>` | Per-render (cleared each frame) | Write during render, read in commitTracking |
| **BlacAdapter** | `pendingGetterValues: Map<string, any>` | Per-render (cleared each frame) | Write during render, read in commitTracking |
| **BlacAdapter** | `trackedPaths: Set<string>` | Persistent | Cumulative tracking history |
| **BlacAdapter** | `cachedStateProxy` | Per state instance | Reused if state unchanged |
| **BlacAdapter** | `cachedBlocProxy` | Per bloc instance | Reused across renders |
| **Subscription** | `dependencies: Set<string>` | Until unsubscribe | Updated atomically in commitTracking |
| **Subscription** | `getterCache: Map<string, {value, error}>` | Until unsubscribe | Updated in commitTracking, read in checkGetterChanged |
| **ProxyFactory** | `proxyCache: WeakMap<...>` | GC-managed | Three-level cache (target→consumer→path) |

**Ownership Issues:**
- Unclear who "owns" getter values: captured by ProxyFactory, stored in BlacAdapter, transferred to Subscription
- Cache lifecycle unclear: when is it valid? when should it be cleared?
- Circular dependency: Adapter needs subscription ID, Subscription needs adapter's tracked values

### 1.4 Timing and Lifecycle Diagram

```
Frame N:
  ┌─ resetTracking() ─────────────────┐
  │  Clear pending caches             │
  ↓                                    │
  [Component Render]                   │ SYNCHRONOUS
  ↓                                    │
  Access proxy → trackAccess()         │
  ↓                                    │
  Render complete ────────────────────┘

  ⏱️  TIMING GAP (async boundary)

  ┌─ useEffect runs ──────────────────┐
  │  commitTracking()                 │ ASYNCHRONOUS
  │  - Transfer to cache              │
  └───────────────────────────────────┘

State Change (can happen ANYTIME):
  ┌─ notify() ────────────────────────┐
  │  checkGetterChanged()             │ SYNCHRONOUS
  │  - Reads from cache               │
  │  ❌ PROBLEM: Cache may be empty!  │
  └───────────────────────────────────┘
```

**The Critical Timing Bug:**
- If state changes between "Render complete" and "useEffect runs", cache is still empty
- `checkGetterChanged()` finds no cached value, returns `false` (no change)
- Component doesn't re-render even though getter value may have changed

---

## Part 2: Root Cause Analysis

### 2.1 The Getter Cache Synchronization Failure

**Primary Issue**: Two-phase async commit pattern creates timing window

**Evidence Chain:**

1. **Cache Population** (`BlacAdapter.ts:484-495`):
   ```typescript
   // Runs in useEffect - AFTER render completes
   commitTracking(): void {
     // ...
     for (const [getterName, value] of this.pendingGetterValues) {
       subscription.getterCache.set(getterPath, { value, error: undefined });
     }
   }
   ```

2. **Cache Checking** (`SubscriptionManager.ts:383-394`):
   ```typescript
   // Runs during state changes - can happen ANYTIME
   checkGetterChanged(subscriptionId, getterPath, bloc): boolean {
     const cachedEntry = subscription.getterCache.get(getterPath);
     if (!cachedEntry) {
       // ❌ BUG: Returns false when cache is empty
       // Should return true (unknown = assume changed)
       subscription.getterCache.set(getterPath, { value: newValue, error: newError });
       return false; // WRONG!
     }
     // ...
   }
   ```

3. **React Strict Mode Amplifier**:
   ```
   Render 1: pendingGetterValues = { fullName: "John Doe" }
   Render 2: resetTracking() clears pendingGetterValues
   useEffect: Commits empty map to cache
   Result: Cache permanently empty, getters never trigger re-renders
   ```

### 2.2 Why All Fix Attempts Failed

**Fix Attempt #1**: Removed `invalidateGetterCache()` call
- **Rationale**: Cache was being cleared on every state change
- **Why it failed**: Cache was never populated in the first place

**Fix Attempt #2**: Changed cache warming to always update
- **Rationale**: Removed `if (!cache.has())` check to force updates
- **Why it failed**: `pendingGetterValues` is empty due to Strict Mode double-clear

**Fix Attempt #3**: Changed first-access to return `false`
- **Rationale**: Don't assume change when no previous value
- **Why it failed**: Made the problem worse - now never triggers even on first render

**Fix Attempt #4**: Removed `leafPaths` condition
- **Rationale**: Getter paths were being filtered out
- **Why it failed**: `pendingGetterValues` is empty, so nothing to transfer

**Root Issue**: All fixes targeted the *transfer* mechanism, but the real problem is *timing*. The cache is checked before it's populated, and no amount of transfer optimization fixes that race condition.

### 2.3 Secondary Issues Discovered

**Issue #1: Pessimistic Cache Assumption**
- Most reactive systems assume "no cache = changed" (optimistic)
- BlaC assumes "no cache = not changed" (pessimistic)
- Leads to missed re-renders instead of extra re-renders
- Extra re-renders are recoverable (performance), missed re-renders are not (correctness)

**Issue #2: Unclear Cache Semantics**
- Is empty cache "not populated yet" or "value hasn't changed"?
- No way to distinguish these states
- System conflates "never tracked" with "tracked but unchanged"

**Issue #3: React Strict Mode Incompatibility**
- Double-render pattern clears pending values
- Only one useEffect runs (React optimization)
- System designed without Strict Mode in mind

---

## Part 3: Architectural Problems

### 3.1 Multiple Caching Layers

**Three-Level Cache Hierarchy:**

1. **ProxyFactory Cache** (`ProxyFactory.ts:14-20`):
   ```typescript
   const proxyCache = new WeakMap<
     object, // target
     WeakMap<object, // consumer
       Map<string, any> // path → proxy
     >
   >();
   ```
   - Purpose: Reuse proxy objects
   - Lifecycle: GC-managed via WeakMap
   - Scope: Global across all blocs

2. **BlacAdapter Pending Cache** (`BlacAdapter.ts:119`):
   ```typescript
   private pendingGetterValues = new Map<string, unknown>();
   ```
   - Purpose: Collect getter values during render
   - Lifecycle: Cleared every render
   - Scope: Per adapter instance

3. **Subscription Getter Cache** (`SubscriptionManager.ts:362-364`):
   ```typescript
   if (!subscription.getterCache) {
     subscription.getterCache = new Map();
   }
   ```
   - Purpose: Store previous getter values for comparison
   - Lifecycle: Until subscription unsubscribes
   - Scope: Per subscription

**Problems:**
- Data flows through 3 different caches with different lifecycles
- Unclear which cache is "source of truth"
- Complex initialization: lazy, eager, or just-in-time?
- Error-prone transfers between caches

### 3.2 Mixed Tracking Paradigms

The system attempts to support three different approaches simultaneously:

**Paradigm 1: Selector-based (Manual Dependencies)**
```typescript
useBloc(CounterBloc, {
  dependencies: (bloc) => [bloc.state.count, bloc.isEven]
});
```
- Explicit dependency declaration
- Selector function runs on every state change
- Value comparison determines re-render

**Paradigm 2: Proxy-based (Auto State Tracking)**
```typescript
const [state, bloc] = useBloc(CounterBloc);
return <div>{state.count}</div>; // Automatically tracked
```
- Implicit tracking via proxies
- Path comparison determines re-render
- Works for nested state access

**Paradigm 3: Getter-based (Auto Computed Tracking)**
```typescript
const [state, bloc] = useBloc(CounterBloc);
return <div>{bloc.doubleCount}</div>; // Getter automatically tracked
```
- Implicit tracking via proxies
- Value comparison determines re-render
- Requires cache for previous values

**Problems:**
- Each paradigm has different semantics (path vs value comparison)
- Different notification paths through SubscriptionManager
- Hard to reason about which rules apply
- Complexity compounds when mixing paradigms (e.g., `state.count` + `bloc.getter`)

### 3.3 Unclear Responsibility Boundaries

**BlacAdapter Responsibilities:**
- Create and manage bloc instance
- Create subscriptions in SubscriptionManager
- Track proxy access during render
- Create state and bloc proxies
- Reset and commit tracking phases
- Lifecycle management (mount/unmount)
- Plugin notification

**SubscriptionManager Responsibilities:**
- Store and manage subscriptions
- Notify subscriptions of state changes
- Filter notifications by dependencies
- Check if getter values changed
- Manage getter cache
- Cleanup invalid subscriptions

**Overlap and Confusion:**
- Both maintain caches related to getters
- Both involved in dependency tracking
- Adapter "drives" the subscription but doesn't own it
- SubscriptionManager owns cache but relies on adapter to populate it
- Circular flow: Adapter → Subscription → Adapter

**Better Separation:**
- Adapter should handle React integration only
- SubscriptionManager should handle all tracking logic
- Or: merge them into single cohesive component

### 3.4 Complexity Metrics

**Lines of Code:**
- `BlacAdapter.ts`: 676 lines
- `SubscriptionManager.ts`: 560 lines
- `ProxyFactory.ts`: 319 lines
- **Total**: 1555 lines for dependency tracking alone

**Cyclomatic Complexity Hotspots:**
1. `BlacAdapter.commitTracking()`: 106 lines, nested conditions
2. `SubscriptionManager.shouldNotifyForPaths()`: 96 lines, complex path matching
3. `SubscriptionManager.getChangedPaths()`: 68 lines, recursive comparison
4. `BlacAdapter.filterLeafPaths()`: 46 lines, trie-based filtering

**Cognitive Load:**
- 4 separate tracking phases (reset → track → commit → check)
- 3 different caching layers
- 3 different tracking paradigms
- 2 different comparison strategies (path vs value)

---

## Part 4: Industry Pattern Analysis

### 4.1 Zustand - Selector-Based Subscriptions

**Core Pattern:**
```typescript
// User provides explicit selector
const count = useStore(state => state.count);

// Zustand runs selector on every state change
const newValue = selector(newState);
const oldValue = selector(oldState);

// Re-render if values differ
if (!Object.is(newValue, oldValue)) {
  triggerRerender();
}
```

**Key Characteristics:**
- ✅ Simple: no proxies, no caching, no tracking
- ✅ Explicit: developer declares dependencies
- ✅ Predictable: same selector = same behavior
- ✅ No timing issues: selector runs synchronously
- ❌ Boilerplate: must write selector for every use
- ❌ Performance: selector runs on all state changes

**Shallow Equality Optimization (`useShallow`):**
```typescript
const { count, name } = useStore(useShallow(state => ({
  count: state.count,
  name: state.name
})));
```
- Solves "new object every time" problem
- Shallow comparison of selected properties
- Still requires explicit selection

**Relevance to BlaC:**
- BlaC's manual dependencies mode is similar
- Could eliminate proxy complexity
- But loses automatic tracking benefit

### 4.2 Valtio - Dual-Proxy Architecture

**Core Pattern:**
```typescript
// Write proxy (valtio/vanilla)
const state = proxy({ count: 0, name: "John" });

// Read proxy (proxy-compare)
const snap = useSnapshot(state);

// Usage tracking during render
return <div>{snap.count}</div>; // Tracks "count" access
```

**How It Works:**

1. **Write Proxy** (`proxy()`):
   - Tracks mutations
   - Notifies subscribers when properties change
   - Wraps nested objects automatically

2. **Read Proxy** (`createProxy()` from proxy-compare):
   - Wraps snapshot during render
   - Tracks property access synchronously
   - No caching needed - access IS tracking

3. **Re-render Logic**:
   ```typescript
   // Simplified internal flow
   const affected = new WeakMap(); // Stores accessed paths

   // During render
   get(target, prop) {
     track(target, prop); // Record access
     return target[prop];
   }

   // On state change
   if (affected.has(changedProp)) {
     rerender();
   }
   ```

**Key Characteristics:**
- ✅ Automatic tracking, no selectors needed
- ✅ Synchronous: access tracking happens during render
- ✅ No caching: tracked paths are the "cache"
- ✅ Fine-grained: only re-render if accessed properties changed
- ✅ Immutable snapshots: no stale closure issues
- ⚠️ Proxy overhead for every access
- ⚠️ Doesn't handle computed values automatically

**Relevance to BlaC:**
- Shows proxies CAN be simple
- Synchronous tracking eliminates timing bugs
- Snapshot approach prevents stale data
- **BlaC could adopt**: Create new snapshot proxy per render

### 4.3 MobX - Computed Values and Automatic Tracking

**Core Pattern:**
```typescript
class Store {
  @observable count = 0;

  @computed get doubled() {
    return this.count * 2; // Dependencies auto-detected!
  }
}
```

**How Computed Values Work:**

1. **Dependency Tracking During First Execution**:
   ```typescript
   // Simplified internal flow
   let currentComputed = null;

   function executeComputed(computed) {
     currentComputed = computed;
     computed.dependencies = [];

     const value = computed.getter();

     currentComputed = null;
     return value;
   }

   function observableGet(target, prop) {
     if (currentComputed) {
       currentComputed.dependencies.push(target[prop]);
     }
     return target[prop];
   }
   ```

2. **Cache and Invalidation**:
   - First access: execute getter, cache result, record dependencies
   - Dependency changes: mark computed as "stale"
   - Next access: re-execute if stale, cache new result
   - No access: don't execute (lazy)

3. **Automatic Garbage Collection**:
   - If no reactions observing computed → don't cache
   - If computed becomes unused → remove from dependency graph

**Key Characteristics:**
- ✅ Zero boilerplate: just use standard getters
- ✅ Automatic dependencies: detected on execution
- ✅ Lazy evaluation: only compute when needed
- ✅ Smart caching: automatic invalidation
- ✅ Dynamic tracking: dependencies can change
- ⚠️ Relies on decorators/makeObservable
- ⚠️ Complex internal dependency graph

**Relevance to BlaC:**
- Shows getters CAN auto-track dependencies
- Cache at *definition* time, not *render* time
- Invalidate synchronously with state changes
- **BlaC could adopt**: Execute getter during first access, cache result, invalidate on state change

### 4.4 Jotai - Atom Dependency Graph

**Core Pattern:**
```typescript
const countAtom = atom(0);
const doubledAtom = atom(get => get(countAtom) * 2);

// In component
const count = useAtomValue(countAtom);
const doubled = useAtomValue(doubledAtom);
```

**How It Works:**

1. **Explicit Dependency Graph**:
   - Dependencies declared at atom creation
   - Static graph built ahead of time
   - No runtime tracking needed

2. **Propagation**:
   - Change to `countAtom` → notify `doubledAtom`
   - `doubledAtom` re-computes → notify subscribers
   - Topological sort ensures correct order

3. **Subscription**:
   - Component subscribes to specific atoms
   - Only re-renders when those atoms change
   - No proxy overhead

**Key Characteristics:**
- ✅ Explicit dependencies: clear data flow
- ✅ No runtime overhead: graph is pre-built
- ✅ Type-safe: TypeScript knows dependencies
- ✅ Composable: atoms can depend on other atoms
- ❌ More boilerplate: must define atoms
- ❌ Less flexible: can't access arbitrary state

**Relevance to BlaC:**
- Different paradigm (granular atoms vs coarse blocs)
- Shows explicit > implicit for complex apps
- Not directly applicable to BlaC's class-based model

---

## Part 5: Best Practices and Anti-Patterns

### 5.1 Best Practices (from industry)

**BP1: Single Source of Truth for Dependencies**
- Valtio: Tracked accesses stored in WeakMap
- MobX: Dependency graph in computed descriptor
- Zustand: Selector is the dependency
- **BlaC violates**: Dependencies split across adapter + subscription

**BP2: Synchronous Tracking**
- Valtio: Track access immediately when property read
- MobX: Track during getter execution
- **BlaC violates**: Two-phase async commit

**BP3: Optimistic Cache Misses**
- Most systems: No cache = assume changed
- Triggers re-render, prevents missed updates
- Correctness > performance
- **BlaC violates**: Pessimistic (no cache = assume unchanged)

**BP4: Clear Cache Ownership**
- Zustand: No cache (selector re-runs)
- Valtio: No cache (snapshot is immutable)
- MobX: Cache owned by computed descriptor
- **BlaC violates**: Cache ownership split between 3 components

**BP5: One Comparison Strategy**
- Zustand: Always value comparison (Object.is)
- Valtio: Always reference comparison (paths changed)
- MobX: Always value comparison (computed result)
- **BlaC violates**: Mixes path comparison (state) + value comparison (getters)

### 5.2 Anti-Patterns (in BlaC)

**AP1: Deferred Commitment**
- Tracking happens at time T
- Commitment happens at time T+delay
- Window where dependencies are known but not active
- **Impact**: Race conditions, missed updates

**AP2: Mixed Paradigms Without Isolation**
- Selectors, proxies, and manual deps in same system
- Different code paths for each
- Unclear which rules apply
- **Impact**: Complexity, bugs, hard to maintain

**AP3: Pessimistic Error Handling**
- "No data = assume no change" philosophy
- Prioritizes avoiding extra re-renders over correctness
- **Impact**: Silent failures, missed updates

**AP4: Implicit State Machines**
- Cache has implicit states: empty, populating, populated, stale
- No explicit tracking of which state we're in
- Conflates "empty because never tracked" with "empty because cleared"
- **Impact**: Bugs, unclear behavior

**AP5: Deep Nesting of Responsibilities**
- Adapter calls Subscription calls Adapter
- Circular dependencies
- Hard to test in isolation
- **Impact**: Tight coupling, fragile

---

## Part 6: Performance Analysis

### 6.1 Current Performance Characteristics

**Proxy Creation Overhead:**
- New proxies for every state change (even with caching)
- Three-level WeakMap lookup for cache hit
- Property descriptor traversal for getter detection
- **Measurement needed**: Overhead per tracked property access

**Path Filtering Complexity:**
- `filterLeafPaths()` uses PathTrie for O(n) filtering
- Runs on every `commitTracking()` call
- For 10 dependencies: not noticeable
- For 100+ dependencies: potential bottleneck

**Getter Re-execution:**
- Getters run during render (proxy access)
- Getters run again during `checkGetterChanged()`
- Double execution on every state change
- **Impact**: Expensive getters pay 2x cost

**Subscription Iteration:**
- All subscriptions checked on every state change
- O(n) where n = number of subscriptions
- With filtering: mostly early-exit
- Still iterates full list

**Memory Usage:**
- Three separate caches for tracking
- WeakMap prevents memory leaks (good)
- But: Maps inside WeakMaps not GC-friendly
- Subscription cache never cleared (until unsubscribe)

### 6.2 Performance Comparison

| System | Tracking Cost | Notification Cost | Cache Size |
|--------|---------------|-------------------|------------|
| **Zustand** | None | O(subscribers) | None |
| **Valtio** | O(1) per access | O(affected) | O(tracks) |
| **MobX** | O(1) first exec | O(dependents) | O(computeds) |
| **BlaC** | O(1) + async commit | O(subscribers * deps) | O(subs * getters) |

**BlaC Disadvantages:**
- Async commit adds latency
- Cache grows per subscription (not shared)
- Must iterate all dependencies for each subscriber

### 6.3 Optimization Opportunities

**OPT1: Shared Getter Cache**
- One cache per getter, not per subscription
- Multiple components accessing same getter share cache
- **Savings**: O(n) → O(1) cache size

**OPT2: Synchronous Tracking**
- Eliminate `commitTracking()` useEffect delay
- Track and activate immediately
- **Savings**: Removes async boundary, prevents races

**OPT3: Smart Getter Re-execution**
- Only re-execute if dependencies changed
- Track getter's state dependencies
- **Savings**: Avoids double execution

**OPT4: Subscription Indexes**
- Index subscriptions by dependency path
- Only check subscriptions that might care
- **Savings**: O(all subs) → O(relevant subs)

---

## Part 7: Recommended Solutions

### 7.1 Immediate Fix (Hours)

**Change one line in `SubscriptionManager.ts:394`:**
```typescript
if (!cachedEntry) {
  subscription.getterCache.set(getterPath, { value: newValue, error: newError });
  return true; // Changed from false
}
```

**Rationale:**
- Optimistic assumption: no cache = assume changed
- Triggers re-render on first state change
- May cause one extra re-render, but ensures correctness
- Aligns with industry practice (Zustand, MobX)

**Expected Outcome:**
- 5 failing tests should pass
- Possible extra re-render on initial state change (acceptable)
- Doesn't fix underlying architecture

### 7.2 Short-term Improvement (Days)

**Pre-populate cache during subscription creation:**
```typescript
// In BlacAdapter.createSubscription()
if (!this.isUsingDependencies) {
  // Execute all getters immediately to warm cache
  for (const path of this.trackedPaths) {
    if (path.startsWith('_class.')) {
      const getterName = path.substring(7);
      const value = this.blocInstance[getterName];

      subscription.getterCache.set(path, { value, error: undefined });
    }
  }
}
```

**Benefits:**
- Cache always populated before first check
- Eliminates timing window
- No architecture changes needed

**Drawbacks:**
- Still has two-phase commit
- Cache can still get out of sync
- Doesn't fix React Strict Mode issue

### 7.3 Long-term Redesign Options

**Option A: Zustand-like Selectors Only**
- Remove proxies entirely
- Require explicit `dependencies` function
- Simple, predictable, no timing issues

**Option B: Valtio-like Synchronous Proxies**
- Keep proxies, remove two-phase commit
- Create new snapshot proxy per render
- Track access synchronously during render

**Option C: MobX-like Computed Definitions**
- Cache getters at definition time (in Bloc constructor)
- Track dependencies on first execution
- Invalidate synchronously with state changes

**Option D: Hybrid Simplified**
- Unify state and getter tracking into one mechanism
- Single cache shared across subscriptions
- Synchronous tracking, no pending collections

---

## Conclusion

The BlaC dependency tracking system's failures stem from a fundamental architectural mismatch: asynchronous cache population with synchronous cache checking. This creates a timing window where the system cannot distinguish between "value unchanged" and "value not tracked yet."

Beyond this critical bug, the architecture suffers from:
1. Mixing three different tracking paradigms without clear boundaries
2. Split ownership of caching responsibilities
3. Two-phase commit pattern that introduces complexity and timing hazards
4. Pessimistic error handling that prioritizes performance over correctness

**Immediate path forward:**
1. Apply one-line fix to return `true` on empty cache
2. Add comprehensive logging to understand real-world behavior
3. Plan architectural redesign based on one of the long-term options

**Recommended long-term direction:**
- Choose one tracking paradigm and commit to it
- Eliminate two-phase async commit
- Unify cache ownership in single component
- Prioritize correctness over avoiding extra re-renders

The industry analysis shows that simple, synchronous systems (Zustand, Valtio) are easier to reason about and debug than complex multi-paradigm systems. BlaC would benefit from simplification rather than optimization of the current complex architecture.
