# Research: Unified Logging System for BlaC v2

## Executive Summary

This research examines the BlaC v2 architecture to identify optimal logging integration points, existing logging patterns, and best practices for implementing a unified logging system. The goal is to provide comprehensive traceability without impacting performance or introducing coupling.

## Current State Analysis

### Existing Logging Infrastructure

#### 1. Current Console Logging
The v2 codebase contains **ad-hoc console.log statements** scattered across multiple files:

**Core packages/blac/src/v2:**
- `subscription/stages/ProxyTrackingStage.ts`
- `subscription/SubscriptionSystem.ts` (line 208: error logging)
- `subscription/SubscriptionRegistry.ts` (line 191: error logging)
- `subscription/stages/NotificationStage.ts`
- `subscription/SubscriptionPipeline.ts`
- `core/StateContainer.ts`
- `types/events.ts`
- `core/EventStream.ts`
- `core/Vertex.ts`
- `core/LifecycleManager.ts`

**React integration packages/blac-react/src/v2:**
- `ReactBridge.ts` - **15+ console.log statements** for tracking subscription lifecycle
- Debug test files (debug-render-timing.test.tsx, debug-subscription-timing.test.tsx)

#### 2. Configuration Patterns
Current configuration management in v2:
- **SubscriptionSystem**: Accepts `SubscriptionSystemConfig` with flags like `enableMetrics`, `enableWeakRefs`, `enableProxyTracking`
- **SubscriptionRegistry**: Accepts options for `cleanupIntervalMs`, `maxSubscriptions`, `enableWeakRefs`
- **SubscriptionPipeline**: Accepts `enableMetrics` flag
- **BlocRegistry**: Simple instance management, no configuration system yet

**Gap**: No centralized configuration system for v2. Each component manages its own config.

### V2 Architecture Overview

#### Core Components

**1. State Management Layer**
- **StateStream** (packages/blac/src/v2/core/StateStream.ts:92)
  - Entry point: `update(updater, options)` - line 92
  - Emits events via TypedEventEmitter - line 125
  - Supports silent updates, metadata, source tracking
  - Maintains state history with configurable size

**2. Subscription System** (packages/blac/src/v2/subscription/)
- **SubscriptionSystem** (facade pattern)
  - Entry: `subscribe(options)` - line 110
  - Entry: `notify(stateChange)` - line 178
  - Creates and manages pipelines
  - Generates consumer IDs - line 323

- **SubscriptionRegistry**
  - Entry: `register(config)` - line 80
  - Entry: `processStateChange(containerId, change)` - line 157
  - Reference counting: `retain(id)` / `release(id)`
  - Cleanup scheduler runs every 30s - line 320

- **SubscriptionPipeline**
  - Entry: `execute(context)` - line 139 (estimated)
  - Processes through 7 stages in priority order
  - Supports metrics collection when enabled

**3. Pipeline Stages** (packages/blac/src/v2/subscription/stages/)
Seven stages in priority order:
1. **PriorityStage** (850): Filter by priority threshold
2. **ProxyTrackingStage** (800): Set up proxy-tracked paths
3. **WeakRefStage** (700): Check weak references
4. **FilterStage** (600): Evaluate filter predicates and paths
5. **OptimizationStage** (400): Throttling, caching
6. **SelectorStage** (200): Transform state
7. **NotificationStage** (100): Execute callbacks (line 117 estimated)

**4. Proxy Tracking** (packages/blac/src/v2/proxy/ProxyTracker.ts)
- Entry: `startTracking()` - line 166
- Entry: `stopTracking()` - line 174
- Creates recursive proxies with max depth (10)
- Tracks leaf property access only
- Handles arrays, objects, functions

**5. React Integration** (packages/blac-react/src/v2/)
- **ReactBridge**
  - Entry: `subscribe(onStoreChange)` - line 40
  - Entry: `getSnapshot()` - line 90 (triggers tracking)
  - Manages proxy tracking lifecycle
  - Guards against stale subscriptions with symbols

**6. State Container** (packages/blac/src/v2/core/StateContainer.ts)
- Entry: `onStateChange()` - line 368 (estimated, CRITICAL logging point per research)
- Integration point with StateStream and SubscriptionSystem
- Manages lifecycle via LifecycleManager

### Critical Logging Landmarks Identified

Based on the architecture analysis and user requirements, these are the **must-log** points:

#### State Changes
1. **StateStream.update()** (line 92)
   - Log: Previous state, new state, version, source, metadata
   - Frequency: Every state change (potentially high)
   - Context: Include updater source if provided

2. **StateContainer.onStateChange()** (line 368)
   - Log: State transition, container ID, timestamp
   - Frequency: Every state change
   - Context: Most valuable single logging point

#### Subscription Lifecycle
3. **SubscriptionSystem.subscribe()** (line 110)
   - Log: Subscription creation, consumer ID, options (paths, filters, priority)
   - Frequency: Low (component mount)
   - Context: Include metadata and configuration

4. **SubscriptionSystem.notify()** (line 178)
   - Log: State change broadcast, container ID, number of subscriptions
   - Frequency: Every state change
   - Context: Include subscription IDs being notified

5. **SubscriptionRegistry.register()** (line 80)
   - Log: New subscription registered, ID generated, config
   - Frequency: Low (component mount)
   - Context: Include ref count, weak ref status

6. **SubscriptionRegistry.unregister()** (line 112)
   - Log: Subscription removed, ID, cleanup status
   - Frequency: Low (component unmount)
   - Context: Include final ref count

7. **FilterStage.process()**
   - Log: Filter evaluation result (pass/fail), paths matched
   - Frequency: Every state change per subscription
   - Context: Include filter criteria and matched paths

#### Disposal/Cleanup
8. **SubscriptionRegistry.performCleanup()** (line 333)
   - Log: Cleanup cycle, subscriptions removed, weak refs collected
   - Frequency: Every 30 seconds (configurable)
   - Context: Include count of subscriptions cleaned, memory freed

9. **SubscriptionRegistry.scheduleCleanup()** (line 306)
   - Log: Subscription marked for cleanup, reason (ref count, weak ref)
   - Frequency: Low (component unmount or weak ref GC)
   - Context: Include subscription ID and reason

10. **ReactBridge.dispose()** (line 223)
    - Log: Bridge cleanup, subscription cleanup, listener cleanup
    - Frequency: Low (component unmount)
    - Context: Include tracked paths, render generation

### Additional Logging Points (Lower Priority)

- **ProxyTrackingStage**: Path setup and tracking initiation
- **SelectorStage**: Selector execution and result
- **NotificationStage.sendNotification()**: Callback execution start/end
- **SubscriptionPipeline.execute()**: Pipeline execution timing (when metrics enabled)
- **ProxyTracker.completeTracking()**: Tracked paths captured
- **StateStream.reset()**: State reset operations

## Best Practices Research

### 1. Structured Logging Patterns

**Industry Standards:**
- **Winston, Pino, Bunyan** (Node.js): Structured JSON logging with levels
- **Log4j, SLF4J** (Java): Hierarchical loggers with appenders
- **Serilog** (.NET): Structured logging with message templates

**Key Takeaways:**
- Use structured data (objects) over string concatenation
- Support log levels with clear semantics (ERROR, WARN, INFO, DEBUG)
- Enable/disable via configuration, not environment variables alone
- Lazy evaluation: don't serialize data if log level won't output it

### 2. Performance Considerations

**Zero-Cost Abstractions:**
```typescript
// Bad: Always creates string even if debug disabled
logger.debug("State change: " + JSON.stringify(state));

// Good: Lazy evaluation
logger.debug(() => `State change: ${JSON.stringify(state)}`);

// Better: Structured data evaluated only when needed
logger.debug("State change", { state, version });
```

**Benchmarks from Research:**
- Conditional checks add < 1ns overhead (branch prediction)
- JSON.stringify can be expensive (10-100ms for large objects)
- String concatenation creates garbage (memory pressure)

**Recommendations:**
- Use lazy message functions for expensive operations
- Implement log level guards before expensive serialization
- Consider sampling for high-frequency logs (e.g., every Nth state change)

### 3. Metadata and Context

**Best Practice Patterns:**
- **Correlation IDs**: Track requests across async boundaries
- **Call stack depth**: Prevent recursive logging loops
- **Component hierarchy**: Bloc → Subscription → Pipeline → Stage
- **Timestamps**: High-resolution for performance debugging

**Anti-Patterns to Avoid:**
- Logging in tight loops without sampling
- Mutating state during logging (side effects)
- Blocking I/O in log handlers
- Circular references in logged objects

### 4. Serialization Strategies

**Circular Reference Handling:**
```typescript
const seen = new WeakSet();
const replacer = (key: string, value: unknown) => {
  if (typeof value === "object" && value !== null) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
  }
  return value;
};
JSON.stringify(state, replacer);
```

**State Snapshot Strategies:**
- **Shallow**: Only top-level properties (fast, less info)
- **Deep with depth limit**: Recurse up to N levels (balanced)
- **Selective**: Only log changed properties (optimal for diffs)

### 5. Configuration Patterns

**Centralized Config vs. Distributed:**
- **Centralized**: Single source of truth (Blac.setConfig)
  - Pro: Consistent, easy to change globally
  - Con: Harder to configure per-component

- **Hierarchical**: Global defaults + per-instance overrides
  - Pro: Flexible, granular control
  - Con: More complex to implement and reason about

**Recommendation**: Start with centralized (simpler), add hierarchy later if needed.

## Logging System Architectures

### Pattern 1: Singleton Logger
```typescript
class Logger {
  private static instance: Logger;
  private config: LogConfig;

  static getInstance(): Logger { ... }
  debug(message, data) { ... }
  info(message, data) { ... }
}
```
**Pros:** Simple, global access, easy to configure
**Cons:** Hard to test, global state, tight coupling

### Pattern 2: Dependency Injection
```typescript
class StateStream {
  constructor(
    initialState: S,
    private logger: Logger
  ) { ... }
}
```
**Pros:** Testable, flexible, loose coupling
**Cons:** More boilerplate, need to thread logger through constructors

### Pattern 3: Factory with Context
```typescript
class LoggerFactory {
  createLogger(context: string): Logger { ... }
}

// Usage
const logger = loggerFactory.createLogger('StateStream');
logger.info('Update', { state });
```
**Pros:** Context-aware, flexible, testable
**Cons:** Need factory instance, more objects

### Pattern 4: Aspect-Oriented (Decorators)
```typescript
class StateStream {
  @log('debug')
  update(updater: StateUpdater<S>) { ... }
}
```
**Pros:** Non-invasive, declarative, clean
**Cons:** Requires decorator support, less flexible

## Recommended Approach

Based on requirements and architecture:

**Hybrid: Singleton + Context**
- Global logger instance via `Blac.setLogConfig()`
- Contextual loggers created per component
- Lazy evaluation for performance
- Structured data with JSON serialization
- Fallback error handling

**Justification:**
1. **Minimal Changes**: No need to modify all constructors
2. **Performance**: Lazy evaluation, level guards
3. **Flexibility**: Can add DI later without breaking changes
4. **Testability**: Can override global logger in tests
5. **Developer Experience**: Simple API, familiar patterns

## Potential Challenges

### 1. Performance Overhead
- **Risk**: Logging every state change could slow down high-frequency updates
- **Mitigation**: Use log level guards, lazy evaluation, sampling at DEBUG level

### 2. Circular Dependencies
- **Risk**: Logger importing StateStream, StateStream importing logger
- **Mitigation**: Create logger in separate module, no imports of core classes

### 3. Bundle Size
- **Risk**: Adding logging could increase bundle size significantly
- **Mitigation**: Tree-shakeable design, minimal API surface, no external deps

### 4. Type Safety
- **Risk**: Logging arbitrary data loses type information
- **Mitigation**: Use generics for structured data, type-safe metadata

### 5. Testability
- **Risk**: Hard to test logging behavior, logs pollute test output
- **Mitigation**: Injectable output handler, silent mode for tests

## Integration Points Summary

### High Priority (Must Have)
1. **StateStream.update()** - State change entry point
2. **StateContainer.onStateChange()** - State transition hook
3. **SubscriptionSystem.notify()** - Broadcast state changes
4. **SubscriptionRegistry.register/unregister()** - Lifecycle
5. **FilterStage** - Filter evaluation decisions

### Medium Priority (Should Have)
6. **SubscriptionPipeline.execute()** - Pipeline execution
7. **NotificationStage** - Callback invocation
8. **ProxyTracker** - Dependency tracking
9. **ReactBridge** - React integration events
10. **Cleanup operations** - Scheduled and on-demand

### Low Priority (Nice to Have)
11. **Individual stages** - Detailed stage metrics
12. **BlocRegistry** - Instance management
13. **Error boundaries** - Exception capture and logging

## Conclusion

The v2 architecture is well-suited for unified logging with clear integration points. The subscription system's pipeline architecture provides natural logging boundaries at each stage. Performance can be maintained through lazy evaluation and log level guards. A singleton-based logger with structured data and JSON serialization will provide the traceability needed without significant overhead or coupling.

## Next Steps

1. Design logger API and configuration interface
2. Evaluate solution options (singleton vs DI vs hybrid)
3. Create implementation plan with phased rollout
4. Implement core logger and integrate with StateStream
5. Add subscription system logging
6. Add disposal/cleanup logging
7. Add React bridge logging
8. Performance testing and optimization
