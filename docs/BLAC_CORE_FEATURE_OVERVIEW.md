# @blac/core v2 - Comprehensive Feature Overview

## Executive Summary

@blac/core is a sophisticated TypeScript state management library implementing the BLoC (Business Logic Component) pattern with clean V2 architecture. The codebase demonstrates excellent architectural maturity with clear separation of concerns, comprehensive type safety, and advanced features like proxy-based dependency tracking and generation-based race condition prevention.

## Core Features Currently Implemented

### 1. State Management Foundation

#### StateContainer (Base Class)
- **Purpose**: Abstract base class for all state management patterns
- **Key Responsibilities**:
  - State lifecycle management (mount, unmount, dispose)
  - Consumer tracking with WeakRef for automatic cleanup
  - Generation-based disposal pattern to prevent race conditions (React Strict Mode compatible)
  - Version tracking for state changes
  - Configuration-driven behavior (isolation, keepAlive flags)

#### StateStream
- **Immutable state management** with structural sharing
- **Version tracking** - each state change increments a version number
- **State history** with configurable size (default: 10 snapshots)
- **Deep equality checking** to prevent unnecessary notifications
- **Deep freeze capability** (disabled for proxy compatibility)
- **Snapshot-based** - maintains `{state, version, timestamp}` tuples

#### Cubit
- Simple state container for direct state emission
- Two methods: `emitState(state)` and `updateState(updater)`
- Arrow function methods for React compatibility
- Example: CounterCubit, TodoCubit with computed properties

#### Vertex (Bloc Pattern)
- Event-driven state container with class-based events
- Type-safe event handler registration via `on<EventClass>()`
- Async event support with automatic queuing
- Built-in event error handling via `onEventError()` hook
- Examples: CounterVertex, AuthVertex with login/logout

### 2. Lifecycle Management

#### LifecycleManager
- **State Machine**: UNMOUNTED → MOUNTING → MOUNTED → UNMOUNTING → DISPOSED
- **Immutable transitions** with validation
- **Event emission** for each state change
- **Generation counter** - prevents disposal race conditions
  - Each disposal request gets unique generation number
  - Pending microtasks validate generation before executing
  - Cancellation increments generation, invalidating pending operations
  - **Result**: Zero memory leaks in React Strict Mode scenarios

#### Container Lifecycle Hooks
- `onMount()` - Called when container is mounted
- `onUnmount()` - Called when container is unmounted
- `onDispose()` - Called when container is disposed
- `onStateChange()` - Called for every state change

#### Consumer Management
- **Reference counting** - tracks consumer count
- **Automatic disposal** - requests disposal when consumer count reaches 0
- **Keep-alive mode** - prevents automatic disposal
- **Isolated mode** - forces new instance per consumer

### 3. Subscription System (Advanced)

#### SubscriptionSystem Facade
- **High-level API** orchestrating subscription pipeline and registry
- **Flexible subscription options**:
  - `selector` - Fine-grained state transformation
  - `paths` - Path-based filtering for nested state
  - `filter` - Custom predicate-based filtering
  - `priority` - Execution priority (NORMAL, HIGH, CRITICAL)
  - `debounce` / `throttle` - Performance optimization
  - `batch` - Batch multiple changes
  - `keepAlive` - Prevent automatic cleanup
  - `weakRef` - Weak reference for consumer tracking

#### SubscriptionPipeline
- **Stage-based architecture** for composable subscription behavior
- **Processing stages** (in order):
  1. **PriorityStage** - Filter by subscription priority
  2. **ProxyTrackingStage** - Track property access via proxies
  3. **WeakRefStage** - Manage weak references, clean up garbage collected consumers
  4. **FilterStage** - Apply path-based and predicate filters
  5. **OptimizationStage** - Debounce, throttle, batch
  6. **SelectorStage** - Transform state via selector function
  7. **NotificationStage** - Execute callback with debounce/batch support

#### SubscriptionRegistry
- Central registry for tracking all subscriptions
- Manages subscription metadata and lifecycle
- Automatic cleanup of dead weak references
- Metrics and statistics tracking

### 4. Event System

#### BaseEvent Interface
- `type` - Event identifier
- `timestamp` - Creation time
- `source` - Optional source identifier

#### Event Types
- **StateChangeEvent** - Emitted when state changes
  - Contains `previous`, `current`, `version`, `metadata`
- **LifecycleEvent** - Mount, unmount, dispose
- **ErrorEvent** - Error handling
- **SubscriptionEvent** - Subscription lifecycle

#### TypedEventEmitter
- Type-safe event emitting
- Support for regular handlers and one-time handlers
- Error handling in event handlers
- Clear API: `emit()`, `on()`, `once()`, `off()`

#### EventStream
- Supports **event filtering** with `addFilter()`
- Supports **event transformation** with `addTransformer()`
- **Queue management** with backpressure (maxQueueSize)
- **Pause/resume** capability
- **Metrics** tracking (total, filtered, transformed, errored events)
- **Async processing** option
- **Error strategy** (throw, log, silent)

### 5. Registry & Instance Management

#### BlocRegistry
- **Constructor-based pattern** - Pass class, get type-safe instances
- **Auto-registration** - Automatically registers on first use
- **Shared vs Isolated**:
  - Shared (default) - Single instance across consumers
  - Isolated - Each consumer gets new instance
- **Instance tracking** by unique IDs
- **Type safety** - Full generic type inference
- **Statistics** - `getStats()` for debugging
- **Lazy instantiation** - Only creates instances when needed

### 6. Proxy-Based Dependency Tracking

#### ProxyTracker
- **Automatic dependency detection** via JavaScript Proxies
- **Path-based tracking** - Records accessed property paths
- **Nested object support** with depth limiting (max 10 levels)
- **Array-aware** - Tracks array index access
- **WeakMap caching** - Prevents duplicate proxy creation
- **Safe handling** of special objects (Date, RegExp, Map, Set, WeakMap, WeakSet, Promise)
- **Lazy evaluation** - Only tracks when explicitly enabled

### 7. Type Safety & Branded Types

#### Branded Types
- `InstanceId` - Unique instance identifier
- `SubscriptionId` - Unique subscription identifier
- `Version` - State version number (strongly typed integer)
- `Generation` - Disposal generation number
- Helper functions: `version()`, `generation()`, `incrementVersion()`, `incrementGeneration()`

#### Internal APIs
- **StateContainerVisitor** - Safe internal access pattern
- **InternalStateContainer** - Interface for framework-internal access
- **InternalSubscriptionManager** - Subscription management interface
- **Type guards** - `isInternalStateContainer()`, `isInternalSubscriptionManager()`

### 8. Logging System

#### BlacLogger
- **Configurable log levels**: ERROR, WARN, INFO, DEBUG
- **Custom output** - Route logs anywhere (console, remote service, etc.)
- **Structured logging** - JSON-serializable entries
- **Safe by default** - Logging errors don't crash the app
- **Selective enabling** - Off by default, can be configured globally

Usage:
```typescript
BlacLogger.configure({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => console.log(JSON.stringify(entry))
});
```

## Architecture Patterns

### 1. Generation Counter Pattern (Race Condition Prevention)
- Each disposal request gets unique generation number
- Pending microtasks check if generation is still valid
- Cancellation increments generation, invalidating stale microtasks
- Prevents multiple competing disposal attempts

### 2. Visitor Pattern
- Safe internal access without type assertions
- Used for controlled access to protected members
- Enables framework-internal cross-class communication

### 3. Stage-Based Pipeline
- Composable subscription behavior
- Each stage can skip subsequent stages
- Easy to add custom stages
- Clear separation of concerns

### 4. Weak Reference Management
- WeakRef-based consumer tracking prevents memory leaks
- Automatic cleanup when consumers are garbage collected
- Registry monitors and cleans dead references

### 5. Type-Safe Constructor Pattern
- No string names, no factories
- Full generic type inference
- Auto-registration on first use
- Static properties for isolation/keepAlive flags

## Plugin Ecosystem

### Available Plugins

#### 1. Persistence Plugin (@blac/plugins/bloc/persistence)
- **Purpose**: Persist state to storage
- **Location**: `/packages/plugins/bloc/persistence/src`
- **Likely Features**:
  - Save/restore state
  - Storage adapters (localStorage, etc.)
  - Serialization/deserialization

#### 2. Graph Plugin (@blac/plugins/system/graph)
- **Purpose**: Graph-based state management
- **Location**: `/packages/plugins/system/graph/src`
- **Advanced state composition with graph structure**

#### 3. Graph-React Plugin (@blac/plugins/system/graph-react)
- **Purpose**: React bindings for graph plugin
- **Location**: `/packages/plugins/system/graph-react/src`
- **React-specific graph state management**

#### 4. Render Logging Plugin (@blac/plugins/system/render-logging)
- **Purpose**: Track React render behavior
- **Location**: `/packages/plugins/system/render-logging/src`
- **Debug React component rendering with BlaC state**

## Testing Infrastructure

### Test Utilities
- `createTestState()` - Create test state objects
- `waitFor()` - Wait for condition with timeout
- `createMockNotify()` - Mock subscription callbacks
- `MemoryTracker` - Track memory usage in tests
- `PerfTimer` - Performance benchmarking
- `versionSequence()` - Generate version sequences
- `TestFixture<S>` - State/version/notification tracking

### Test Coverage
- Core: StateContainer, StateStream, Cubit, Vertex
- Lifecycle: LifecycleManager with all transitions
- Events: EventStream with filtering/transformation
- Registry: BlocRegistry with isolation/shared patterns
- Proxy: ProxyTracker with nested objects
- Subscriptions: SubscriptionPipeline with all stages
- Logging: Logger with levels and configuration

## Configuration & Customization

### StateContainer Config
```typescript
interface StateContainerConfig {
  instanceId?: string;           // Custom ID
  name?: string;                 // Debug name
  keepAlive?: boolean;           // Prevent auto-disposal
  isolated?: boolean;            // Per-consumer instance
  debug?: boolean;               // Debug logging
}
```

### SubscriptionSystem Config
```typescript
interface SubscriptionSystemConfig {
  enableMetrics?: boolean;       // Track metrics
  enableWeakRefs?: boolean;      // Use WeakRef
  enableProxyTracking?: boolean; // Auto-track deps
  maxSubscriptions?: number;     // Max allowed
  cleanupIntervalMs?: number;    // Cleanup frequency
  defaultPriority?: Priority;    // Default priority
}
```

### Logger Config
```typescript
BlacLogger.configure({
  enabled: boolean;
  level: LogLevel;  // ERROR, WARN, INFO, DEBUG
  output: (entry) => void;
});
```

## Performance Characteristics

### Memory Management
- **WeakRef-based** consumer tracking prevents memory leaks
- **Deep freeze disabled** for proxy compatibility
- **History trimming** - Default max 10 snapshots
- **Automatic cleanup** of dead weak references

### Computational Complexity
- State change notification: O(n) where n = subscription count
- Consumer cleanup: O(n) for consumer list traversal
- Proxy tracking: O(depth * properties) where depth ≤ 10

### Optimization Options
- **Selector-based subscriptions** - Only transform needed state
- **Path-based filtering** - Skip unrelated changes
- **Throttle/Debounce** - Reduce callback frequency
- **Batching** - Collect multiple changes
- **Priority ordering** - Execute critical subscriptions first

## Current Gaps & Limitations

### 1. Missing Features (Not Yet Implemented)

#### Error Handling & Recovery
- No global error boundary mechanism
- No automatic retry logic
- No circuit breaker pattern
- Error events exist but limited recovery mechanisms

#### Advanced Filtering
- Path-based filtering implemented but could be more sophisticated
- No glob pattern support for paths
- No complex predicate composition helpers

#### State Persistence
- Plugin exists but not examined for completeness
- No built-in localStorage integration in core
- No transaction/rollback mechanism

#### Middleware System
- No middleware pipeline for intercepting operations
- No before/after hooks for state changes
- No plugin lifecycle hooks

#### Time-Travel Debugging
- History is tracked but no time-travel API
- No state snapshots API for inspecting history
- No diff/patch operations

#### Async Support
- Events support async handlers
- No built-in async request management (loading, error states)
- No automatic retry/backoff

#### Testing Utilities
- Good basic utilities
- Could use snapshot testing helpers
- Could use property-based testing support

### 2. Known Limitations

#### Proxy Tracking
- Disabled for frozen objects (but deepFreeze is disabled)
- Max depth of 10 to prevent infinite recursion
- May not work with all special object types
- Performance overhead with deep nesting

#### Consumer Tracking
- Reference counting based on consumer count
- No sophisticated consumer grouping
- No consumer affinity/pinning

#### Event Processing
- Sequential event processing only
- Events queued when another event is processing
- No event priority/ordering

#### Subscription System
- Pipeline creation is factory-based (not very flexible)
- No easy way to inject custom stages dynamically
- No built-in metrics/performance monitoring in production

### 3. Potential Improvements Noted in Codebase

From architectural analysis:
- Subscription system could use reference counting instead of consumer tracking
- Circular dependencies between core classes (mentioned in CLAUDE.md)
- Complex dual consumer/observer subscription system could be simplified
- Performance bottlenecks with deep object proxies
- Security considerations with global state access

## Code Quality Observations

### Strengths
- **Clean Architecture** - Clear separation of concerns
- **Type Safety** - Extensive use of TypeScript generics and branded types
- **Error Handling** - Try-catch blocks, error events, debug mode
- **Documentation** - Well-commented code with clear examples
- **Testing** - Comprehensive test utilities and integration tests
- **No TODOs/FIXMEs** - Clean codebase without pending tasks

### Code Patterns
- **Arrow functions required** - For React compatibility (this binding)
- **Immutability** - State changes never mutate existing objects
- **Event-driven** - State changes trigger events
- **Consumer-aware** - Tracks who is consuming state
- **Configurable** - Most features can be configured or disabled

## Integration Points

### With React (@blac/react)
- Uses `useSyncExternalStore` (React 18+)
- Selector-based subscriptions for fine-grained reactivity
- Adapter Pattern (ReactBridge) for clean separation
- Version-based change detection

### With DevTools (@blac/devtools-connect)
- Likely hooks into logging system
- State change tracking and inspection
- Instance registry integration

### With Plugins
- Standardized interface for extending functionality
- Lifecycle hooks for integration
- Access to state changes via events

## Usage Patterns

### Basic Cubit
```typescript
class CounterCubit extends Cubit<number> {
  constructor() { super(0); }
  increment = () => this.emitState(this.state + 1);
  decrement = () => this.emitState(this.state - 1);
}
```

### Event-Driven Bloc
```typescript
class CounterVertex extends Vertex<number> {
  constructor() {
    super(0);
    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });
  }
  increment = (amount = 1) => this.add(new IncrementEvent(amount));
}
```

### Subscriptions
```typescript
const container = new CounterCubit();
const subscription = container.subscribeAdvanced({
  selector: (state) => `Count: ${state}`,
  callback: (selected) => console.log(selected),
  priority: SubscriptionPriority.HIGH
});
```

## Summary

@blac/core v2 is a mature, well-architected state management library with excellent type safety and advanced features. The implementation is clean, well-tested, and demonstrates sophisticated patterns like generation-based race condition prevention and staged subscription pipelines. The main gaps are in advanced features (middleware, time-travel, async management) rather than core functionality, which is comprehensive and production-ready.
