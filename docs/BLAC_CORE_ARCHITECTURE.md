# @blac/core v2 - Architecture Deep Dive

## Project Structure

```
packages/blac/
├── src/
│   ├── core/                          # Core state management
│   │   ├── StateContainer.ts         # Base class for all state containers
│   │   ├── StateStream.ts            # Immutable state management with versioning
│   │   ├── Cubit.ts                  # Simple state container pattern
│   │   ├── Vertex.ts                 # Event-driven Bloc pattern
│   │   ├── EventStream.ts            # Type-safe event dispatch
│   │   ├── LifecycleManager.ts       # Lifecycle state machine
│   │   └── *.test.ts                 # Core integration tests
│   │
│   ├── subscription/                  # Advanced subscription system
│   │   ├── SubscriptionSystem.ts     # High-level subscription facade
│   │   ├── SubscriptionRegistry.ts   # Subscription registry
│   │   ├── SubscriptionPipeline.ts   # Stage-based processing pipeline
│   │   ├── SubscriptionBuilder.ts    # Fluent builder API
│   │   ├── stages/                   # Pipeline stages
│   │   │   ├── PriorityStage.ts
│   │   │   ├── ProxyTrackingStage.ts
│   │   │   ├── WeakRefStage.ts
│   │   │   ├── FilterStage.ts
│   │   │   ├── OptimizationStage.ts
│   │   │   ├── SelectorStage.ts
│   │   │   └── NotificationStage.ts
│   │   └── *.test.ts
│   │
│   ├── registry/                      # Instance management
│   │   ├── BlocRegistry.ts           # Type-safe instance registry
│   │   └── *.test.ts
│   │
│   ├── proxy/                         # Dependency tracking
│   │   ├── ProxyTracker.ts           # Automatic dependency detection
│   │   └── *.test.ts
│   │
│   ├── logging/                       # Logging system
│   │   ├── Logger.ts                 # Structured logging
│   │   └── *.test.ts
│   │
│   ├── types/                         # Type definitions
│   │   ├── branded.ts                # Branded types (InstanceId, Version, etc.)
│   │   ├── events.ts                 # Event system types
│   │   └── internal.ts               # Internal API interfaces
│   │
│   ├── test-utils/                    # Testing utilities
│   │   └── index.ts
│   │
│   └── index.ts                       # Public API exports
│
├── tsdown.config.ts                   # Build configuration
├── vitest.config.ts                   # Test configuration
└── package.json                       # Package metadata
```

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                        Public API                            │
│                      (index.ts exports)                      │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        │                     │                     │
    ┌───┴───┐         ┌──────┴──────┐        ┌─────┴─────┐
    │ Cubit │         │   Vertex    │        │ Registry  │
    │       │◄────┐   │             │        │           │
    └───┬───┘     │   └──────┬──────┘        └─────┬─────┘
        │         │          │                     │
        │         │          │                     │
        └────────┬┴──────────┴─────────────────────┘
                 │
        ┌────────┴──────────────┐
        │                       │
        ▼                       ▼
   ┌─────────────┐      ┌──────────────┐
   │StateContainer│      │LifecycleManager
   │             │      │              │
   ├─StateStream │      ├─LifecycleState Machine
   ├─EventStream │      ├─Generation Counter
   ├─Subscription│      └─Event emission
   │  System    │
   └─────────────┘
        │
        │ contains & uses
        ▼
   ┌─────────────────────────────────────┐
   │    SubscriptionSystem               │
   │  ┌───────────────────────────────┐  │
   │  │  SubscriptionPipeline         │  │
   │  │  ┌─────────────────────────┐  │  │
   │  │  │ Priority Stage          │  │  │
   │  │  ├─ Proxy Tracking Stage   │  │  │
   │  │  ├─ WeakRef Stage          │  │  │
   │  │  ├─ Filter Stage           │  │  │
   │  │  ├─ Optimization Stage     │  │  │
   │  │  ├─ Selector Stage         │  │  │
   │  │  └─ Notification Stage     │  │  │
   │  └─────────────────────────────┘  │
   │  ┌───────────────────────────────┐  │
   │  │ SubscriptionRegistry          │  │
   │  │ (Metadata & Lifecycle)        │  │
   │  └───────────────────────────────┘  │
   └─────────────────────────────────────┘
        │
        │ uses
        ▼
   ┌─────────────────────────────────┐
   │    Supporting Systems           │
   │                                 │
   │  ├─ ProxyTracker (optional)    │
   │  ├─ BlacLogger (configurable)  │
   │  └─ TypedEventEmitter          │
   └─────────────────────────────────┘
```

## Core Class Hierarchy

```
StateContainer<S, E extends BaseEvent>
├── extends AbstractClass
├── contains StateStream<S>
├── contains EventStream<E>
├── contains LifecycleManager
├── contains SubscriptionSystem<S>
│
├── Cubit<S> extends StateContainer
│   └── Simple state emission pattern
│
└── Vertex<S, E> extends StateContainer
    └── Event-driven pattern with queue processing
```

## Data Flow

### State Change Flow

```
1. Method Call on Cubit/Vertex
   └─> emitState() / update() / add(event)
       │
2. State Update Request
   └─> StateContainer.emit() / .update()
       │
3. StateStream Update
   └─> Deep equality check ──[No Change]──> Return
       │
4. Version Increment
   └─> Create new snapshot {state, version, timestamp}
       │
5. Event Emission
   └─> StateChangeEvent dispatched through eventStream
       │
6. Subscription System Notification
   └─> subscriptionSystem.notify(stateChange)
       │
7. Pipeline Processing (for each subscription)
   ├─> Priority Filter
   ├─> Proxy Tracking
   ├─> WeakRef Cleanup
   ├─> Path/Predicate Filter
   ├─> Optimization (throttle/debounce)
   ├─> Selector Transform
   └─> Notification (callback execution)
       │
8. Consumer Tracking
   └─> Reference counting on state changes
       └─> If count = 0 & !keepAlive: requestDisposal()
           └─> Queue microtask with generation counter
               └─> Check generation validity
                   └─> Execute disposal if valid
```

### Lifecycle Flow

```
┌──────────────────────────────────────────────────────┐
│                    UNMOUNTED                         │
│  (Initial state, no resources allocated)            │
└────────────────────────┬─────────────────────────────┘
                         │ mount()
                         ▼
┌──────────────────────────────────────────────────────┐
│                   MOUNTING                           │
│  (onMount() lifecycle hook in progress)             │
└────────────────────────┬─────────────────────────────┘
                         │ mount() completes
                         ▼
┌──────────────────────────────────────────────────────┐
│                    MOUNTED                           │
│  (Active, accepting state changes & subscriptions) │
└────────┬──────────────────────────────┬──────────────┘
         │ unmount()                    │ requestDisposal()
         ▼                              ▼
┌──────────────────────┐    ┌──────────────────────┐
│    UNMOUNTING        │    │ DISPOSAL_REQUESTED   │
│ (Cleanup in prog.)   │    │ (Generation counter  │
└─────────┬────────────┘    │  queuedMicrotask)   │
          │                 └──────────┬───────────┘
          │                            │ generation valid?
          │                            ▼
          │                  ┌─────────────────────┐
          │                  │    DISPOSING        │
          │                  │ (onDispose() hook)  │
          │                  └──────────┬──────────┘
          │                             │
          └─────────────┬───────────────┘
                        │ disposal complete
                        ▼
        ┌──────────────────────────────────────┐
        │           DISPOSED                   │
        │ (No more state changes possible)    │
        └──────────────────────────────────────┘
```

### Disposal Race Condition Prevention

```
Timeline with React Strict Mode (double-mounting):

t=0:  Component mounts
      └─> addConsumer() called
          └─> consumerCount = 1

t=1:  Component unmounts (React Strict Mode)
      └─> removeConsumer() called
          └─> consumerCount = 0
          └─> requestDisposal() called
              ├─> disposalGeneration = gen(1)
              ├─> Queue microtask A (checks gen=1)
              └─> Return immediately

t=2:  Component remounts (React Strict Mode)
      └─> addConsumer() called
          └─> consumerCount = 1
          └─> cancelDisposal() called
              └─> disposalGeneration = gen(2) ◄─ INVALIDATES microtask A

t=3:  Microtask A executes
      └─> Check: currentGeneration (gen=2) === gen(1) from closure? NO
          └─> Skip disposal ✓ MEMORY LEAK PREVENTED

t=4:  Actual disposal happens when needed
      └─> Container safely cleaned up
```

## Subscription Pipeline Stages

```
Input: StateChange<T>
  │
  ├─> [1] PriorityStage
  │   └─> Filter subscriptions by priority threshold
  │       └─> SKIP if priority too low
  │
  ├─> [2] ProxyTrackingStage
  │   └─> Track property access via proxies
  │       └─> Populate accessed paths in metadata
  │
  ├─> [3] WeakRefStage
  │   └─> Check if consumer is still alive (WeakRef)
  │       └─> SKIP if consumer garbage collected
  │
  ├─> [4] FilterStage
  │   └─> Check path-based & predicate filtering
  │       └─> SKIP if paths don't match or predicate false
  │
  ├─> [5] OptimizationStage
  │   └─> Apply throttle/debounce/batching
  │       └─> DEFER if throttled/debounced
  │       └─> BATCH if batching enabled
  │
  ├─> [6] SelectorStage
  │   └─> Transform state via selector function
  │       ├─> selectedState = selector(current)
  │       └─> NEW: Compare with previous selected state
  │
  ├─> [7] NotificationStage
  │   └─> Execute callback with selected state
  │       ├─> If debounce: Queue execution
  │       ├─> If batch: Collect and execute together
  │       └─> callback(selectedState)
  │
  └─> Output: Callback executed (or deferred)
```

## Memory Management

### Weak Reference Pattern

```
StateContainer
├─> consumers: WeakMap<consumer_object, refCount>
│
└─> On each state change:
    ├─> Iterate consumers
    ├─> If consumer is garbage collected:
    │   └─> Remove from WeakMap (automatic)
    │
    └─> If consumerCount reaches 0:
        └─> requestDisposal()
            ├─> Queue microtask with generation
            └─> On microtask:
                ├─> Check generation is valid
                └─> If valid: execute dispose()
```

### Generation Counter

```
StateContainer
├─> disposalGeneration: Generation = gen(0)
│
├─> requestDisposal():
│   ├─> disposalGeneration = incrementGeneration(gen) → gen(1)
│   ├─> capture currentGeneration = gen(1)
│   └─> queueMicrotask(() => {
│       ├─> if (currentGeneration === disposalGeneration) {
│       │   └─> dispose()
│       │
│       └─> else: // Cancellation invalidated this
│       │   └─> Skip (Memory leak prevented!)
│       └─> })
│
└─> cancelDisposal():
    └─> disposalGeneration = incrementGeneration(gen) → gen(2)
        ├─> Invalidates any pending microtasks with gen(1)
        └─> Allows new consumers to be added safely
```

## Type Safety Architecture

### Branded Types

```typescript
// Nominal typing: prevents mixing different ID types
InstanceId = string & { readonly __brand: 'InstanceId' }
SubscriptionId = string & { readonly __brand: 'SubscriptionId' }
Version = number & { readonly __brand: 'Version' }
Generation = number & { readonly __brand: 'Generation' }

// Result: Compiler prevents accidental mixing
const id1: InstanceId = 'foo' as InstanceId;
const id2: SubscriptionId = 'foo' as SubscriptionId;

// ❌ Compile error: InstanceId is not assignable to SubscriptionId
const mixed: SubscriptionId = id1;
```

### Generic Type Safety

```typescript
// State type is tracked through the entire hierarchy
class Cubit<S> extends StateContainer<S> { }
class Vertex<S, E> extends StateContainer<S, E> { }

// Container methods are type-safe to state S
const cubit = new CounterCubit(); // CounterCubit extends Cubit<number>
cubit.subscribe((state: number) => {}); // state is number ✓

// Subscription state transform is type-safe
const subscription = cubit.subscribeAdvanced({
  selector: (state: number) => `Count: ${state}`,
  callback: (selected: string) => {} // selected is string ✓
});
```

## Configuration Cascade

```
Global Configuration (BlacLogger)
  └─> BlacLogger.configure({ enabled, level, output })

StateContainer Configuration
  └─> StateContainerConfig {
      ├─> instanceId: custom ID
      ├─> name: debug name
      ├─> keepAlive: prevent auto-disposal
      ├─> isolated: per-consumer instance
      └─> debug: enable logging
      }

SubscriptionSystem Configuration
  └─> SubscriptionSystemConfig {
      ├─> enableMetrics: track metrics
      ├─> enableWeakRefs: use WeakRef
      ├─> enableProxyTracking: auto-track deps
      ├─> maxSubscriptions: limit
      ├─> cleanupIntervalMs: cleanup frequency
      └─> defaultPriority: priority level
      }

Per-Subscription Options
  └─> SubscriptionOptions {
      ├─> selector: transform state
      ├─> paths: filter by paths
      ├─> filter: predicate filter
      ├─> priority: execution priority
      ├─> debounce/throttle: optimize
      ├─> batch: batch updates
      ├─> keepAlive: prevent cleanup
      └─> weakRef: consumer reference
      }
```

## Event Flow Architecture

```
User Action
  └─> cubit.increment() / vertex.add(event)
      │
      ▼
  Event/Update dispatched
      │
      ├─> StateContainer.emit(newState)
      │   └─> StateStream.update(updater)
      │       ├─> Deep equality check
      │       ├─> Create snapshot
      │       └─> Emit StateChangeEvent
      │
      └─> EventStream.dispatch(event)
          ├─> Apply filters
          ├─> Apply transformers
          ├─> Queue if async
          └─> Notify handlers
              └─> Error handling per handler

Observer Pattern (StateChangeEvent)
      │
      ▼
  SubscriptionSystem.notify(stateChange)
      │
      └─> For each subscription:
          ├─> Create PipelineContext
          ├─> Execute Pipeline:
          │   ├─> Priority → WeakRef → Filter → Optimize → Select → Notify
          │   └─> Skip stages as needed
          │
          └─> Execution metrics tracked
```

## Summary

The @blac/core v2 architecture achieves sophisticated state management through:

1. **Clear Layering**: Core (StateContainer) → Lifecycle (LifecycleManager) → Subscriptions (Pipeline system)
2. **Type Safety**: Branded types + generics throughout the stack
3. **Memory Safety**: WeakRef + generation counter + automatic cleanup
4. **Performance**: Configurable stages, lazy evaluation, caching
5. **Extensibility**: Stage-based pipeline for custom behavior
6. **Robustness**: Error handling, validation, metrics, logging

The design balances complexity with usability, providing powerful features while maintaining a clean API.
