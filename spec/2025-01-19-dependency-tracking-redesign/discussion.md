# Dependency Tracking Redesign - Solution Discussion

**Date**: 2025-01-19
**Context**: Fix getter tracking + architectural redesign

## Problem Summary

BlaC's dependency tracking has a critical timing bug causing 5 test failures. Components using getters incorrectly re-render when unrelated state changes. The root cause is asynchronous cache population (useEffect) vs synchronous cache checking (during notify), creating a window where cached values aren't available.

Beyond the immediate bug, the architecture mixes three paradigms (selectors, proxies, manual deps) with unclear ownership, leading to complexity and fragility.

## Requirements Recap

**Must Have (P0)**:
- Fix 5 failing getter tracking tests
- Zero false positives/negatives
- React Strict Mode compatibility
- No memory leaks

**Priorities**: Correctness > Developer Experience > Performance > Debuggability

**Constraints**: Breaking changes allowed, open to complete redesign

---

## Solution Options

We present four distinct approaches, ranging from minimal fix to complete redesign:

### Option 1: Minimal Fix (Band-Aid)
### Option 2: Synchronous Tracking (Valtio-Inspired)
### Option 3: Computed-First Architecture (MobX-Inspired)
### Option 4: Hybrid Unified System (Clean Slate)

---

## Option 1: Minimal Fix (Band-Aid)

**Approach**: Fix the immediate bug with minimal code changes, accept architectural debt.

### Implementation

**Change #1**: Fix empty cache assumption (`SubscriptionManager.ts:394`)
```typescript
if (!cachedEntry) {
  subscription.getterCache.set(getterPath, { value: newValue, error: newError });
  return true; // Changed from false - optimistic assumption
}
```

**Change #2**: Pre-warm cache on subscription creation (`BlacAdapter.ts:createSubscription`)
```typescript
// After creating subscription, populate cache immediately
const subscription = subscriptionManager.subscriptions.get(subscriptionId);
for (const path of this.trackedPaths) {
  if (path.startsWith('_class.')) {
    const value = this.blocInstance[path.substring(7)];
    subscription.getterCache.set(path, { value, error: undefined });
  }
}
```

**Change #3**: Defensive cache check in Strict Mode
```typescript
// In commitTracking(), don't clear if values already present
if (this.pendingGetterValues.size === 0 && subscription.getterCache.size > 0) {
  return; // Skip transfer if cache already populated
}
```

### Pros
- ✅ **Minimal risk**: Only 3 small code changes
- ✅ **Fast to implement**: Hours, not days
- ✅ **Proven approach**: Optimistic caching used by Zustand
- ✅ **Tests should pass**: Addresses root cause directly
- ✅ **No API changes**: Existing code continues to work
- ✅ **Easy to revert**: Small changeset

### Cons
- ❌ **Doesn't fix architecture**: Still has timing window
- ❌ **Complexity remains**: 3 cache layers, mixed paradigms
- ❌ **Maintainability**: Next bug will be equally subtle
- ❌ **Tech debt**: Patches symptom, not disease
- ❌ **Performance**: Still double-executes getters
- ❌ **Future-proofing**: Will need redesign eventually

### Scoring

| Criteria | Score | Rationale |
|----------|-------|-----------|
| **Correctness** | 7/10 | Fixes immediate bug, but timing window remains |
| **Developer Experience** | 5/10 | No API changes, but still complex internally |
| **Performance** | 4/10 | No improvements, still has overhead |
| **Debuggability** | 4/10 | Still complex to trace through system |
| **Maintainability** | 3/10 | Adds patches to already complex code |
| **Implementation Effort** | 10/10 | Minimal - few hours |
| **Risk** | 9/10 | Very low - small, isolated changes |

**Total: 42/70 (60%)**

---

## Option 2: Synchronous Tracking (Valtio-Inspired)

**Approach**: Eliminate two-phase commit by tracking dependencies synchronously during render. Create immutable snapshot proxies per render.

### Implementation

**New Architecture**:
```
useBloc hook
  ↓
Create snapshot of current state
  ↓
Wrap in tracking proxy
  ↓
Track accesses during render (synchronous!)
  ↓
After render: compare tracked vs previous
  ↓
If changed: schedule re-render
```

**Key Changes**:

1. **Remove async commit** - Delete `commitTracking()` useEffect
2. **Create snapshot proxies** - New proxy per render with current state
3. **Track during access** - Store accessed paths immediately
4. **Compare after render** - Check if any accessed paths changed

**Code Structure**:
```typescript
// In useBloc
const [trackedPaths] = useState(() => new Set<string>());

// Create fresh snapshot proxy each render
const stateSnapshot = useMemo(() => {
  const paths = new Set<string>();

  return new Proxy(blocInstance.state, {
    get(target, prop) {
      paths.add(String(prop)); // Synchronous tracking!
      return Reflect.get(target, prop);
    }
  });
}, [blocInstance.state]);

// Subscribe with tracked paths
useEffect(() => {
  return blocInstance.subscribe(paths, () => rerender());
}, [Array.from(paths).join(',')); // Re-subscribe when paths change
```

**Getter Handling**:
- Execute getter during render
- Cache result in component state (useState)
- On next render, re-execute and compare
- No need for separate getter cache in subscription

### Pros
- ✅ **Eliminates timing bug**: No async boundary
- ✅ **Simpler mental model**: Track when accessed, that's it
- ✅ **Valtio-proven**: Same pattern used in production
- ✅ **React-friendly**: Works naturally with Strict Mode
- ✅ **Better performance**: No useEffect delay
- ✅ **Easier to debug**: Synchronous flow, no deferred state

### Cons
- ❌ **Proxy overhead**: New proxy every render
- ❌ **Breaking change**: Internal API changes
- ❌ **Migration needed**: Existing tracking code must be rewritten
- ❌ **Getters tracked differently**: Component state vs subscription cache
- ❌ **Still mixed paradigms**: Proxies + selectors still coexist

### Scoring

| Criteria | Score | Rationale |
|----------|-------|-----------|
| **Correctness** | 10/10 | Eliminates root cause entirely |
| **Developer Experience** | 8/10 | Simple for users, same API |
| **Performance** | 7/10 | New proxies cost, but no async delay |
| **Debuggability** | 9/10 | Synchronous = easier to trace |
| **Maintainability** | 8/10 | Much simpler than current |
| **Implementation Effort** | 5/10 | Moderate - 2-3 days |
| **Risk** | 6/10 | Medium - changes core mechanism |

**Total: 53/70 (76%)**

---

## Option 3: Computed-First Architecture (MobX-Inspired)

**Approach**: Treat getters as first-class computed values with their own dependency tracking and caching, separate from component subscriptions.

### Implementation

**New Concepts**:

1. **Computed Descriptor** - Metadata for each getter
   ```typescript
   interface ComputedDescriptor {
     name: string;
     getter: () => any;
     cachedValue: any;
     dependencies: Set<string>; // State paths accessed
     isDirty: boolean;
     observers: Set<string>; // Subscription IDs watching this
   }
   ```

2. **Getter Registration** - Auto-detect and register getters at Bloc creation
   ```typescript
   class BlocBase {
     private _computeds = new Map<string, ComputedDescriptor>();

     constructor() {
       // Auto-detect getters
       const proto = Object.getPrototypeOf(this);
       for (const key of Object.getOwnPropertyNames(proto)) {
         const desc = Object.getOwnPropertyDescriptor(proto, key);
         if (desc?.get) {
           this._computeds.set(key, {
             name: key,
             getter: desc.get.bind(this),
             dependencies: new Set(),
             isDirty: true,
             observers: new Set()
           });
         }
       }
     }
   }
   ```

3. **Dependency Tracking During First Execution**
   ```typescript
   private executeComputed(computed: ComputedDescriptor): any {
     const originalState = this.state;

     // Wrap state in tracking proxy
     const trackedState = new Proxy(originalState, {
       get(target, prop) {
         computed.dependencies.add(String(prop));
         return Reflect.get(target, prop);
       }
     });

     // Execute with tracking
     this.state = trackedState;
     const result = computed.getter();
     this.state = originalState;

     computed.cachedValue = result;
     computed.isDirty = false;

     return result;
   }
   ```

4. **Invalidation on State Change**
   ```typescript
   emit(newState: S) {
     const changedPaths = this.getChangedPaths(this.state, newState);

     // Mark affected computeds as dirty
     for (const computed of this._computeds.values()) {
       for (const dep of computed.dependencies) {
         if (changedPaths.has(dep)) {
           computed.isDirty = true;
           break;
         }
       }
     }

     this.state = newState;
     this.notify();
   }
   ```

5. **Component Subscription**
   ```typescript
   // Component subscribes to specific computeds
   useBloc(MyBloc, {
     computeds: ['fullName', 'isAdult']
   });

   // Or auto-detect via proxy (keeps current behavior)
   const [state, bloc] = useBloc(MyBloc);
   bloc.fullName; // Auto-subscribes to this computed
   ```

**Flow**:
```
1. Bloc created → Scan for getters → Create ComputedDescriptors
2. Component accesses getter → Execute (if dirty) → Track dependencies → Cache result
3. State changes → Check which computeds affected → Mark dirty
4. Notify subscriptions → Re-execute dirty computeds → Compare values → Trigger re-render
```

### Pros
- ✅ **MobX-proven**: Battle-tested pattern
- ✅ **Lazy execution**: Only compute when observed
- ✅ **Smart caching**: Auto-invalidation
- ✅ **Dynamic dependencies**: Tracks what's actually used
- ✅ **Zero boilerplate**: Standard getters just work
- ✅ **Performance**: No double execution
- ✅ **Clear ownership**: Computed owns its cache

### Cons
- ❌ **Significant rewrite**: New ComputedDescriptor system
- ❌ **Reflection overhead**: Scanning prototype at construction
- ❌ **Complex invalidation**: Must track state path dependencies
- ❌ **Different paradigm**: Requires understanding computed lifecycle
- ❌ **Still has proxies**: Dependency tracking still uses proxies
- ❌ **Memory**: One descriptor per getter per Bloc instance

### Scoring

| Criteria | Score | Rationale |
|----------|-------|-----------|
| **Correctness** | 10/10 | Proven pattern, clear semantics |
| **Developer Experience** | 9/10 | Zero boilerplate, just works |
| **Performance** | 9/10 | Optimal - lazy, cached, single execution |
| **Debuggability** | 7/10 | More components, but clearer roles |
| **Maintainability** | 7/10 | More code, but well-structured |
| **Implementation Effort** | 3/10 | Substantial - 1+ week |
| **Risk** | 4/10 | High - completely new system |

**Total: 49/70 (70%)**

---

## Option 4: Hybrid Unified System (Clean Slate)

**Approach**: Complete redesign that unifies state and getter tracking into a single, consistent mechanism. Choose one paradigm and commit fully.

### Implementation

**Design Principles**:
1. **Single tracking mechanism** - One way to track dependencies
2. **Single cache** - Shared across all subscriptions
3. **Single comparison strategy** - Value-based for everything
4. **Synchronous** - No async boundaries

**Proposed Architecture**:

```typescript
interface DependencyTracker {
  // Unified tracking
  track(subscription: string, dependency: Dependency): void;

  // Unified notification
  notify(changes: Change[]): Set<string>; // Returns subscriptions to trigger
}

type Dependency =
  | { type: 'state'; path: string }
  | { type: 'computed'; name: string; fn: () => any };

interface SubscriptionState {
  id: string;
  dependencies: Dependency[];
  lastValues: Map<string, any>; // Cached values for all dependencies
  notify: () => void;
}
```

**Tracking Flow**:
```
1. Component renders
2. Accesses state: tracker.track(subId, { type: 'state', path: 'count' })
3. Accesses getter: tracker.track(subId, { type: 'computed', name: 'doubled', fn: () => bloc.doubled })
4. Store dependencies + current values in subscription.lastValues

On state change:
5. Execute all dependency functions
6. Compare new vs cached values
7. Trigger subscriptions with changed dependencies
```

**Key Features**:

1. **Unified Caching**:
   ```typescript
   class DependencyTracker {
     private subscriptions = new Map<string, SubscriptionState>();

     track(subId: string, dep: Dependency) {
       const sub = this.subscriptions.get(subId);
       sub.dependencies.push(dep);

       // Immediately capture current value
       const currentValue = this.evaluate(dep);
       sub.lastValues.set(this.depKey(dep), currentValue);
     }

     private evaluate(dep: Dependency): any {
       if (dep.type === 'state') {
         return this.getStateValue(dep.path);
       } else {
         return dep.fn(); // Execute computed
       }
     }
   }
   ```

2. **Unified Notification**:
   ```typescript
   notify(changes: Change[]): Set<string> {
     const triggered = new Set<string>();

     for (const [subId, sub] of this.subscriptions) {
       for (const dep of sub.dependencies) {
         const oldValue = sub.lastValues.get(this.depKey(dep));
         const newValue = this.evaluate(dep);

         if (!Object.is(oldValue, newValue)) {
           triggered.add(subId);
           sub.lastValues.set(this.depKey(dep), newValue);
           break; // One change is enough
         }
       }
     }

     return triggered;
   }
   ```

3. **Simplified useBloc**:
   ```typescript
   function useBloc(BlocClass) {
     const [, forceRender] = useReducer(x => x + 1, 0);
     const tracker = DependencyTracker.getInstance();

     const subId = useMemo(() => generateId(), []);

     useEffect(() => {
       tracker.subscribe(subId, forceRender);
       return () => tracker.unsubscribe(subId);
     }, [subId]);

     // Tracking happens automatically via proxies
     // No reset/commit phases needed!

     return [bloc.state, bloc];
   }
   ```

### Pros
- ✅ **Maximum simplicity**: One mechanism for everything
- ✅ **No timing bugs**: Synchronous value capture
- ✅ **Shared cache**: O(1) memory per dependency, not per subscription
- ✅ **Consistent**: Same comparison logic everywhere
- ✅ **Clean ownership**: DependencyTracker owns all tracking
- ✅ **Future-proof**: Easy to extend
- ✅ **Testable**: Single component to test

### Cons
- ❌ **Complete rewrite**: Nothing reused
- ❌ **Riskiest**: No proven pattern, new design
- ❌ **Longest timeline**: 1-2 weeks
- ❌ **Migration**: All existing code affected
- ❌ **Unknown unknowns**: May discover issues during implementation
- ❌ **Still has proxies**: If keeping automatic tracking

### Scoring

| Criteria | Score | Rationale |
|----------|-------|-----------|
| **Correctness** | 9/10 | Clean design, but unproven |
| **Developer Experience** | 10/10 | Simplest mental model |
| **Performance** | 8/10 | Shared cache, single comparison |
| **Debuggability** | 10/10 | One component, clear flow |
| **Maintainability** | 10/10 | Minimal, focused code |
| **Implementation Effort** | 2/10 | Longest - 1-2 weeks |
| **Risk** | 3/10 | Highest - unproven design |

**Total: 52/70 (74%)**

---

## Comparison Matrix

| Criterion | Weight | Option 1 | Option 2 | Option 3 | Option 4 |
|-----------|--------|----------|----------|----------|----------|
| **Correctness** | 4x | 28/40 | **40/40** | **40/40** | 36/40 |
| **Developer Experience** | 3x | 15/30 | 24/30 | **27/30** | **30/30** |
| **Performance** | 2x | 8/20 | 14/20 | **18/20** | 16/20 |
| **Debuggability** | 1x | 4/10 | 9/10 | 7/10 | **10/10** |
| **Maintainability** | 3x | 9/30 | 24/30 | 21/30 | **30/30** |
| **Implementation Effort** | 2x | **20/20** | 10/20 | 6/20 | 4/20 |
| **Risk** | 2x | **18/20** | 12/20 | 8/20 | 6/20 |
| **TOTAL** | | **102/170** | **133/170** | **127/170** | **132/170** |
| **Percentage** | | 60% | **78%** | 75% | **78%** |

**Weighted Ranking**:
1. **Option 2 (Synchronous Tracking)** - 78% - Tied for best score
2. **Option 4 (Hybrid Unified)** - 78% - Tied for best score, highest quality
3. **Option 3 (Computed-First)** - 75% - Best DX and performance
4. **Option 1 (Minimal Fix)** - 60% - Fastest but least sustainable

---

## Council Discussion

> "The immediate fix is tempting," **Butler Lampson** observes, "but simplicity demands we address the root cause. Three caching layers is two too many."

**Barbara Liskov** nods. "The invariant being violated is: cache must be populated before it's checked. Option 1 papers over this with optimistic returns. Options 2-4 eliminate the timing window entirely."

**Nancy Leveson** leans forward. "What's the worst failure mode? Option 1: timing window remains, future bugs inevitable. Options 2-4: implementation bugs during rewrite, but once correct, they stay correct."

**Alan Kay** interjects: "The real problem here is mixing paradigms. You're trying to be Zustand AND Valtio AND MobX simultaneously. Pick one. Be that."

**Leslie Lamport** adds: "Asynchronous commitment creates an ordering problem you can't solve with patches. Make it synchronous or accept the race conditions."

**The Pragmatic Tester (Kent Beck)** speaks up: "Can we ship Option 1 this week and refactor to Option 2 next sprint? Tests pass, users happy, tech debt tracked?"

**The SRE on Call** counters: "That creates two failure modes in production: the old bugs AND any new bugs from the quick fix. I'd rather one correct system than two imperfect ones."

**Michael Feathers** offers: "If you go with Option 1, extract the timing logic into a well-tested component. Make it observable. Then replacing it with Option 2 is just swapping implementations."

> **The Council Consensus**: Option 1 is a tactical retreat. Options 2 and 4 are strategic victories. Option 3 is elegant but heavy-handed. Given the priority on correctness and maintainability, the Council leans toward **Option 2 or Option 4**, with **Option 4 preferred** for long-term health despite the higher upfront cost.

---

## Recommendation Preview

Given the priorities (Correctness > Developer Experience > Performance > Debuggability) and the willingness to accept breaking changes, I recommend a **two-phase approach**:

**Phase 1 (Immediate)**: Option 1 Minimal Fix
- Unblocks development
- Passes tests
- Low risk
- **Timeline**: 1 day

**Phase 2 (Next Sprint)**: Option 2 Synchronous Tracking OR Option 4 Hybrid Unified
- Fix architecture
- Long-term sustainability
- Better performance
- **Timeline**: 3-5 days (Option 2) or 7-10 days (Option 4)

**Decision Point**: If you need tests passing TODAY → Option 1 then Option 2/4
If you can wait 1 week → Go straight to Option 4

The choice between Option 2 and Option 4 for Phase 2 depends on appetite for risk vs reward:
- **Option 2**: Safer (proven Valtio pattern), faster (moderate rewrite)
- **Option 4**: Better (cleaner architecture), slower (complete rewrite)

Would you like to proceed with:
- **A)** Two-phase (Option 1 now, then redesign)
- **B)** Direct to Option 2 (Synchronous Tracking)
- **C)** Direct to Option 4 (Hybrid Unified)
- **D)** Something else / more information needed
