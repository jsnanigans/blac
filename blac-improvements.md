# BlaC Subscription Architecture Improvements

## Current Architecture Analysis

The BlaC subscription system currently consists of several interconnected components:

1. **BlocBase**: Core state management with lifecycle states (ACTIVE, DISPOSAL_REQUESTED, DISPOSING, DISPOSED)
2. **BlacObserver**: Manages observer subscriptions with dependency arrays
3. **ConsumerTracker**: Tracks component consumers using WeakRefs
4. **ProxyFactory**: Creates proxies for automatic dependency tracking
5. **BlacAdapter**: Orchestrates connections between Blocs and React components

### Key Issues Identified

1. **Complexity**: Dual consumer/observer system with overlapping responsibilities
2. **Performance**: Proxy creation overhead and dependency tracking costs
3. **Coupling**: Tight coupling to React's component model
4. **Consistency**: Two separate subscription systems that must stay synchronized
5. **Debugging**: Limited visibility into subscription graphs and performance

## Proposed Improvements

### 1. Unified Subscription Model

Replace the dual consumer/observer system with a single, unified subscription mechanism:

```typescript
interface Subscription<S> {
  id: string;
  selector?: (state: S) => unknown;
  equalityFn?: (a: unknown, b: unknown) => boolean;
  notify: (value: unknown) => void;
  priority?: number;
}
```

**Benefits:**
- Single source of truth for all subscriptions
- Simplified mental model
- Easier to debug and maintain
- Better performance through reduced overhead

### 2. Low Prio: Optional Selector-Based Architecture

Add optional proxy-based tracking to explicit selectors (similar to Redux Toolkit):

```typescript
// Current proxy-based approach
const [state, bloc] = useBloc(CounterBloc);
const count = state.count; // Proxy tracks access

// Proposed selector-based approach with automatic memoization
// no proxy overhead
const count = useBlocState(CounterBloc, bloc => bloc.state.count);

// With memoized selectors
const selectCount = createSelector(
  (state: CounterState) => state.count,
  count => count
);
```

**Benefits:**
- Explicit dependencies
- Better performance (no proxy overhead)
- Easier to optimize with memoization
- More predictable behavior

### 3. Message-Oriented Updates

Replace direct state notifications with typed messages:

```typescript
interface StateChange<S> {
  type: 'STATE_CHANGE';
  oldState: S;
  newState: S;
  changedPaths: Set<string>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Usage
class SubscriptionManager<S> {
  publish(change: StateChange<S>) {
    // Subscribers can filter based on message properties
    this.subscribers.forEach(sub => {
      if (sub.interestedIn(change)) {
        sub.notify(change);
      }
    });
  }
}
```

**Benefits:**
- Decoupled from UI framework
- Extensible message types
- Better debugging with message history
- Support for middleware/interceptors

### 4. Subscription Prioritization

Add priority-based notification ordering for deterministic updates:

```typescript
class SubscriptionManager<S> {
  private priorityQueues: Map<number, Set<Subscription<S>>> = new Map();

  subscribe(subscription: Subscription<S>, priority = 0) {
    if (!this.priorityQueues.has(priority)) {
      this.priorityQueues.set(priority, new Set());
    }
    this.priorityQueues.get(priority)!.add(subscription);
  }

  notify(change: StateChange<S>) {
    // Notify in priority order (highest first)
    const priorities = Array.from(this.priorityQueues.keys()).sort((a, b) => b - a);

    for (const priority of priorities) {
      const subscriptions = this.priorityQueues.get(priority)!;
      for (const subscription of subscriptions) {
        subscription.notify(change);
      }
    }
  }
}
```

**Benefits:**
- Deterministic notification order
- Support for critical updates
- Better control over cascading updates

### 5. Simplified Lifecycle Management

Replace complex disposal state machine with reference counting:

```typescript
class BlocLifecycle {
  private refCount = 0;
  private disposed = false;

  retain(): void {
    if (this.disposed) {
      throw new Error('Cannot retain disposed bloc');
    }
    this.refCount++;
  }

  release(): void {
    if (--this.refCount === 0 && !this.keepAlive) {
      this.dispose();
    }
  }

  private dispose(): void {
    this.disposed = true;
    this.onDispose?.();
  }
}
```

**Benefits:**
- Simpler mental model
- Easier to reason about
- Less prone to race conditions
- Better React Strict Mode compatibility

### 6. Performance Optimizations

#### Object Pooling for Subscriptions
```typescript
class SubscriptionPool<S> {
  private pool: Subscription<S>[] = [];

  acquire(config: SubscriptionConfig<S>): Subscription<S> {
    const sub = this.pool.pop() || new Subscription<S>();
    sub.configure(config);
    return sub;
  }

  release(subscription: Subscription<S>): void {
    subscription.reset();
    this.pool.push(subscription);
  }
}
```

#### Batch Notifications
```typescript
class BatchedNotifier<S> {
  private pending = new Set<Subscription<S>>();
  private scheduled = false;

  scheduleNotification(subscription: Subscription<S>, value: unknown): void {
    this.pending.add(subscription);

    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  private flush(): void {
    const batch = Array.from(this.pending);
    this.pending.clear();
    this.scheduled = false;

    batch.forEach(sub => sub.notify());
  }
}
```

### 7. Type-Safe Subscriptions

Improve type safety with better generic constraints:

```typescript
interface TypedSubscription<S, T> {
  select: (state: S) => T;
  subscribe(listener: (value: T, previousValue?: T) => void): () => void;
}

// Usage
const countSubscription: TypedSubscription<CounterState, number> = {
  select: state => state.count,
  subscribe: listener => {
    // Type-safe listener with number type
    return bloc.subscribe(state => {
      const value = this.select(state);
      listener(value);
    });
  }
};
```

### 8. Enhanced Debugging and Observability

#### Subscription Graph Visualization
```typescript
interface SubscriptionNode {
  id: string;
  type: 'bloc' | 'component' | 'subscription';
  metadata: Record<string, unknown>;
}

interface SubscriptionEdge {
  from: string;
  to: string;
  type: 'subscribes' | 'notifies';
}

class SubscriptionGraph {
  nodes: Map<string, SubscriptionNode> = new Map();
  edges: Set<SubscriptionEdge> = new Set();

  export(): { nodes: SubscriptionNode[]; edges: SubscriptionEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges)
    };
  }
}
```

#### Performance Metrics
```typescript
interface SubscriptionMetrics {
  notificationCount: number;
  totalNotificationTime: number;
  averageNotificationTime: number;
  lastNotificationTime: number;
  selectorExecutionTime: number;
}

class MetricsCollector {
  private metrics = new Map<string, SubscriptionMetrics>();

  recordNotification(subscriptionId: string, duration: number): void {
    const current = this.metrics.get(subscriptionId) || this.createMetrics();
    current.notificationCount++;
    current.totalNotificationTime += duration;
    current.averageNotificationTime =
      current.totalNotificationTime / current.notificationCount;
    current.lastNotificationTime = Date.now();
  }
}
```

## Migration Strategy

### Phase 1: Internal Refactoring
1. Implement unified subscription model alongside existing system
2. Add selector-based API as alternative to proxy tracking
3. Migrate internal components to use new APIs

### Phase 2: Public API Addition
1. Expose selector-based hooks
2. Add subscription priority support
3. Implement debugging tools

### Phase 3: Deprecation
1. Mark proxy-based tracking as deprecated
2. Provide migration guide and codemods
3. Remove old implementation in major version

## Expected Benefits

1. **Performance**: 30-50% reduction in subscription overhead
2. **Memory**: Lower memory usage through pooling and simplified tracking
3. **Developer Experience**: Clearer mental model and better debugging
4. **Maintainability**: Simpler codebase with fewer interdependencies
5. **Framework Independence**: Easier to support frameworks beyond React

## Backward Compatibility

The new architecture can be implemented alongside the existing system, allowing for gradual migration:

```typescript
// Old API (still supported)
const bloc = useBloc(CounterBloc);
const count = bloc.state.count;

// New API
const count = useBloc(CounterBloc, state => state.count);

// Both work during transition period
```

## Conclusion

These improvements address the core issues in the current subscription architecture while maintaining the essence of the BlaC pattern. The key insight is moving from implicit, proxy-based tracking to explicit, selector-based subscriptions that are easier to understand, debug, and optimize.
