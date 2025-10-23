# Solution Discussion: Unified Logging System

## Context & Requirements Summary

**Goal**: Create a comprehensive, unified logging system for BlaC v2 that provides complete traceability of state changes, subscription lifecycle, and disposal operations.

**Key Requirements**:
- Support 4 log levels: ERROR, WARN, INFO, DEBUG
- Configuration-driven output (not environment-based)
- Automatic metadata: timestamps, instance info, state snapshots, call stack
- JSON serialization with circular reference handling
- Fallback logging on serialization errors
- Negligible performance overhead when logging disabled
- Zero breaking changes to existing code

**Critical Landmarks to Log**:
1. State changes (StateStream, StateContainer)
2. Subscription lifecycle (create, update, destroy)
3. Disposal/cleanup operations (registry cleanup, weak refs)

## Solution Options

### Option 1: Singleton Logger with Global Configuration

**Architecture**:
```typescript
// Core logger singleton
class BlacLogger {
  private static instance: BlacLogger;
  private config: LoggerConfig = defaultConfig;

  static configure(config: Partial<LoggerConfig>) { ... }
  static debug(message: string, data?: any) { ... }
  static info(message: string, data?: any) { ... }
  static warn(message: string, data?: any) { ... }
  static error(message: string, data?: any) { ... }
}

// Integration (StateStream example)
class StateStream<S> {
  update(updater: StateUpdater<S>, options: UpdateOptions = {}): void {
    BlacLogger.debug('StateStream.update', {
      version: this.version,
      source: options.source
    });
    // ... rest of implementation
  }
}
```

**Configuration**:
```typescript
// User-facing API
import { Blac } from '@blac/core';

Blac.setLogConfig({
  level: 'DEBUG',
  enabled: true,
  output: (entry) => console.log(entry),
  metadata: {
    timestamps: true,
    callStack: false
  }
});
```

**Pros**:
- ✅ Simple, straightforward implementation
- ✅ Minimal code changes (just add log calls)
- ✅ No constructor changes needed
- ✅ Easy to configure globally via `Blac.setLogConfig()`
- ✅ Familiar pattern (similar to existing console.log usage)
- ✅ Can override in tests easily
- ✅ Zero runtime overhead when disabled (static if checks)

**Cons**:
- ❌ Global state (harder to test in parallel)
- ❌ Tight coupling to singleton
- ❌ Less flexible for per-instance configuration
- ❌ Harder to mock in unit tests
- ❌ No component-specific context (all logs look the same)

**Scoring**:
| Category | Score | Notes |
|----------|-------|-------|
| Simplicity | 9/10 | Very simple to implement and use |
| Maintainability | 7/10 | Global state can be tricky |
| Performance | 9/10 | Static checks, zero overhead |
| Testability | 6/10 | Global state complicates testing |
| Flexibility | 5/10 | Hard to customize per-component |
| Bundle Size | 10/10 | Minimal, tree-shakeable |

---

### Option 2: Contextual Logger with Factory

**Architecture**:
```typescript
// Logger factory creates context-aware loggers
class LoggerFactory {
  private config: LoggerConfig = defaultConfig;

  configure(config: Partial<LoggerConfig>) { ... }

  createLogger(context: LogContext): Logger {
    return new Logger(context, this.config);
  }
}

// Logger instance per component
class Logger {
  constructor(
    private context: LogContext,
    private config: LoggerConfig
  ) {}

  debug(message: string, data?: any) {
    if (this.config.level < LogLevel.DEBUG) return;

    this.log({
      level: 'DEBUG',
      context: this.context,
      message,
      data,
      timestamp: Date.now()
    });
  }
}

// Integration
class StateStream<S> {
  private logger: Logger;

  constructor(initialState: S, maxHistorySize = 10) {
    this.logger = globalLoggerFactory.createLogger({
      component: 'StateStream',
      instanceId: generateId()
    });
    // ...
  }

  update(updater: StateUpdater<S>, options: UpdateOptions = {}): void {
    this.logger.debug('update', {
      version: this.version,
      source: options.source
    });
    // ...
  }
}
```

**Configuration**:
```typescript
import { globalLoggerFactory } from '@blac/core/logging';

globalLoggerFactory.configure({
  level: 'DEBUG',
  enabled: true,
  output: (entry) => console.log(entry)
});
```

**Pros**:
- ✅ Context-aware logs (know which component logged)
- ✅ Flexible - can customize per component
- ✅ Better for debugging (logs include component info)
- ✅ Testable (can inject mock logger)
- ✅ Can filter logs by component
- ✅ Natural fit for instance-based architecture

**Cons**:
- ❌ More boilerplate (logger per class)
- ❌ Need to initialize logger in every constructor
- ❌ Slightly larger bundle (more Logger instances)
- ❌ More complex API
- ❌ Factory is still global state

**Scoring**:
| Category | Score | Notes |
|----------|-------|-------|
| Simplicity | 6/10 | More setup needed |
| Maintainability | 8/10 | Clear separation of concerns |
| Performance | 8/10 | Slight overhead from logger instances |
| Testability | 9/10 | Easy to mock per-component |
| Flexibility | 9/10 | Can customize per component/instance |
| Bundle Size | 7/10 | More objects, larger bundle |

---

### Option 3: Decorator-Based Logging (AOP)

**Architecture**:
```typescript
// Decorator for automatic logging
function logMethod(level: LogLevel = LogLevel.DEBUG) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      BlacLogger.log(level, `${target.constructor.name}.${propertyName}`, {
        args: args.length
      });

      try {
        const result = method.apply(this, args);
        BlacLogger.log(level, `${target.constructor.name}.${propertyName} -> success`);
        return result;
      } catch (error) {
        BlacLogger.error(`${target.constructor.name}.${propertyName} -> error`, { error });
        throw error;
      }
    };
  };
}

// Integration
class StateStream<S> {
  @logMethod(LogLevel.DEBUG)
  update(updater: StateUpdater<S>, options: UpdateOptions = {}): void {
    // ... implementation
  }
}
```

**Configuration**:
```typescript
BlacLogger.configure({ level: 'DEBUG' });
```

**Pros**:
- ✅ Non-invasive (no changes to method bodies)
- ✅ Declarative and clean
- ✅ Automatic error logging
- ✅ Consistent logging format
- ✅ Can add metadata via decorator parameters

**Cons**:
- ❌ Requires TypeScript experimentalDecorators
- ❌ Less control over what data to log
- ❌ Harder to log mid-method (only entry/exit)
- ❌ Decorator overhead on every call
- ❌ Complex to implement for property access
- ❌ Limited flexibility for conditional logging

**Scoring**:
| Category | Score | Notes |
|----------|-------|-------|
| Simplicity | 7/10 | Clean usage, complex implementation |
| Maintainability | 8/10 | Declarative, easy to see what's logged |
| Performance | 6/10 | Overhead on every method call |
| Testability | 7/10 | Can be mocked but less granular |
| Flexibility | 5/10 | Hard to customize per-call |
| Bundle Size | 8/10 | Adds decorator runtime |

---

### Option 4: Hybrid - Singleton with Context Injection

**Architecture**:
```typescript
// Global logger with context support
class BlacLogger {
  private static instance: BlacLogger;
  private config: LoggerConfig = defaultConfig;

  static configure(config: Partial<LoggerConfig>) { ... }

  // Context-aware logging
  static debug(context: string, message: string, data?: any) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    this.log({
      level: 'DEBUG',
      context,
      message,
      data,
      timestamp: Date.now(),
      // Auto metadata
      ...this.captureMetadata()
    });
  }

  // Convenience: lazy evaluation
  static debugFn(context: string, messageFn: () => [string, any?]) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const [message, data] = messageFn();
    this.debug(context, message, data);
  }

  private static shouldLog(level: LogLevel): boolean {
    return this.config.enabled && level >= this.config.level;
  }

  private static captureMetadata() {
    if (!this.config.metadata) return {};

    const meta: any = {};
    if (this.config.metadata.timestamps) meta.timestamp = Date.now();
    if (this.config.metadata.callStack) meta.stack = new Error().stack;
    return meta;
  }
}

// Integration
class StateStream<S> {
  private readonly logContext = 'StateStream';

  update(updater: StateUpdater<S>, options: UpdateOptions = {}): void {
    // Fast path: level guard before expensive operations
    if (BlacLogger.shouldLog(LogLevel.DEBUG)) {
      BlacLogger.debug(this.logContext, 'update', {
        version: this.version,
        source: options.source,
        previousState: this.state // Only serialized if needed
      });
    }

    // ... implementation
  }
}
```

**Configuration**:
```typescript
import { Blac } from '@blac/core';

Blac.setLogConfig({
  level: 'DEBUG',
  enabled: true,
  metadata: {
    timestamps: true,
    callStack: false,
    instanceInfo: true,
    stateSnapshots: true
  },
  output: (entry) => {
    // Custom output handler
    console.log(JSON.stringify(entry));
  },
  // Advanced: filtering
  filter: (entry) => {
    // Only log StateStream and Subscription components
    return entry.context.match(/StateStream|Subscription/);
  }
});
```

**Pros**:
- ✅ Simple API like Option 1
- ✅ Context-aware like Option 2
- ✅ Lazy evaluation for performance
- ✅ No constructor changes needed
- ✅ Automatic metadata capture
- ✅ Flexible filtering via config
- ✅ Easy to test (global config override)
- ✅ Best of both worlds

**Cons**:
- ❌ Still global state
- ❌ Context is manual (string-based)
- ❌ Slightly more complex than pure singleton
- ❌ Need discipline to use context consistently

**Scoring**:
| Category | Score | Notes |
|----------|-------|-------|
| Simplicity | 8/10 | Slightly more complex API |
| Maintainability | 9/10 | Clear patterns, good separation |
| Performance | 10/10 | Lazy eval, optimal guards |
| Testability | 8/10 | Global state, but easy to override |
| Flexibility | 8/10 | Context-aware, filterable |
| Bundle Size | 9/10 | Minimal overhead |

---

## Comparison Summary

| Criterion | Option 1 (Singleton) | Option 2 (Factory) | Option 3 (Decorators) | Option 4 (Hybrid) |
|-----------|---------------------|-------------------|----------------------|-------------------|
| **Simplicity** | 9/10 | 6/10 | 7/10 | **8/10** |
| **Maintainability** | 7/10 | 8/10 | 8/10 | **9/10** |
| **Performance** | 9/10 | 8/10 | 6/10 | **10/10** |
| **Testability** | 6/10 | 9/10 | 7/10 | **8/10** |
| **Flexibility** | 5/10 | 9/10 | 5/10 | **8/10** |
| **Bundle Size** | 10/10 | 7/10 | 8/10 | **9/10** |
| **TOTAL** | 46/60 | 47/60 | 41/60 | **52/60** |

## Council Perspective

**Barbara Liskov** (Invariants): _"The logger should not violate any assumptions of the existing system. It must be added without changing the state management semantics. Option 4's lazy evaluation and level guards ensure logging is truly side-effect free."_

**Butler Lampson** (Simplicity): _"Option 1 is the simplest, but Option 4 provides better simplicity where it counts - at the call site. The additional config complexity is worth the cleaner integration."_

**Brendan Gregg** (Performance): _"Measure it, don't guess. But based on benchmarks, Option 4's lazy evaluation and shouldLog guards are optimal. JSON.stringify is expensive - only call it when the log will actually be output."_

**Leslie Lamport** (Concurrency): _"In JavaScript, there are no true concurrency concerns, but async boundary tracking matters. Option 4's automatic metadata capture can include correlation IDs for tracing async flows."_

**Nancy Leveson** (Safety): _"What's the worst that could happen? If logging throws an error during state updates, it could crash the app. All options need try-catch wrappers. Option 4's fallback serialization strategy is essential."_

## Recommendation

**Option 4: Hybrid Singleton with Context Injection**

This option provides the best balance of simplicity, performance, and flexibility. It addresses the core requirements while maintaining clean architecture.

**Why Option 4?**

1. **Performance**: Lazy evaluation and level guards ensure zero overhead when logging is disabled
2. **Simplicity**: Minimal code changes, no constructor modifications
3. **Flexibility**: Context-aware logs can be filtered and organized
4. **Maintainability**: Clear patterns, automatic metadata
5. **Testability**: Global config override in tests, deterministic behavior
6. **Developer Experience**: Clean API, familiar patterns

**Implementation Strategy**:
- Create `Logger` class in `packages/blac/src/v2/logging/`
- Integrate with existing `Blac` configuration system
- Add log calls to critical landmarks (StateStream, SubscriptionSystem, etc.)
- Provide sensible defaults (INFO level, console output)
- Add filtering and custom output handlers
- Document usage patterns

**Risks & Mitigations**:
- **Risk**: Performance impact on high-frequency state changes
  - **Mitigation**: Lazy evaluation, level guards, sampling at DEBUG
- **Risk**: Logs pollute production output
  - **Mitigation**: Default to INFO level, easy to disable
- **Risk**: Circular references crash serializer
  - **Mitigation**: Custom JSON replacer with WeakSet tracking

## Next Steps

1. Get user confirmation on Option 4 (or alternative preference)
2. Create detailed implementation plan with tasks
3. Implement core Logger class
4. Integrate with StateStream and StateContainer
5. Add subscription system logging
6. Add cleanup/disposal logging
7. Performance testing and optimization
