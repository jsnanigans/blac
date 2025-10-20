# Integrated Logging System - Research

## Executive Summary

This research document covers:
1. Current logging implementation in BlaC codebase
2. Best practices for TypeScript library logging
3. Zero-overhead logging techniques
4. Build-time optimization strategies
5. Implementation patterns and anti-patterns

## Current BlaC Logging Implementation

### Existing Infrastructure

**Location**: `packages/blac/src/Blac.ts:281-330`

```typescript
static enableLog = false;
static logLevel: 'warn' | 'log' = 'warn';
static logSpy: ((...args: unknown[]) => void) | null = null;

log = (...args: unknown[]) => {
  if (Blac.logSpy) {
    Blac.logSpy(args);
  }
};

warn = (message: string, ...args: unknown[]) => {
  console.warn(message, ...args);
};

error = (message: string, ...args: unknown[]) => {
  if (Blac.enableLog) {
    console.error(message, ...args);
  }
};
```

**Key Observations**:
- `log()` is **silent by default**, only captured by test spy
- `warn()` **always** outputs (no gating)
- `error()` only outputs when `enableLog === true`
- No topic filtering, namespace filtering, or structured output
- No timestamp or context information
- Used primarily for debugging during development

### Current Logging Usage

**Total logging calls**: ~50-60 across entire codebase
**Logging density**: ~1 log per 1,000+ lines of code

**Distribution**:
- `packages/blac/src/`: ~40-50 calls (mostly in Blac.ts, BlocBase.ts)
- `packages/blac-react/src/`: **0 calls** (no logging in React integration!)

**Most common log locations**:
1. `Blac.ts:777` - getBloc() calls with options
2. `Blac.ts:812` - creating new bloc instances
3. `Blac.ts:390` - disposeBloc() with lifecycle state
4. `Blac.ts:337` - resetInstance() operation
5. Various disposal and lifecycle transitions in `BlocBase.ts`

### Critical Gaps in Current Logging

#### 1. Bloc Lifecycle (HIGH PRIORITY)
- **Missing**: Bloc creation timing, constructor parameters
- **Missing**: Registration into maps (isolated vs shared)
- **Missing**: UID assignment and tracking
- **Missing**: Plugin activation notifications
- **Partial**: Disposal has some logging but lacks detail

#### 2. State Changes (HIGH PRIORITY)
- **Missing**: State emission values (before/after)
- **Missing**: Plugin transformation results
- **Missing**: Subscriber notification count
- **Missing**: State change frequency/timing

#### 3. Subscription Management (CRITICAL)
- **Missing**: Consumer add/remove operations
- **Missing**: Observer add/remove operations
- **Missing**: Dependency tracking results
- **Missing**: Selector evaluation timing
- **Missing**: Equality check results
- **Missing**: WeakRef cleanup operations

The `SubscriptionManager.notify()` method (called on EVERY state change) has **zero logging** despite being a performance-critical path.

#### 4. React Integration (CRITICAL)
**Zero logging** in the entire React package!
- **Missing**: useBloc hook calls (mount/unmount)
- **Missing**: Dependency array changes
- **Missing**: Re-render triggers
- **Missing**: Adapter lifecycle
- **Missing**: Proxy dependency tracking

#### 5. Performance Tracking
- **Missing**: Timing data for critical operations
- **Missing**: Memory statistics
- **Missing**: Subscription counts over time
- **Missing**: Cache hit/miss rates (ProxyFactory)

### Existing Test Infrastructure

The codebase has a **solid test-focused logging pattern** using `logSpy`:

```typescript
// Pattern from tests:
beforeEach(() => {
  Blac.logSpy = vi.fn();
  Blac.enableLog = true;
});

afterEach(() => {
  Blac.logSpy = null;
  Blac.enableLog = false;
});

// Usage:
expect(Blac.logSpy).toHaveBeenCalledWith(
  expect.arrayContaining([expect.stringMatching(/pattern/)])
);
```

This pattern is used effectively in:
- `BlocBase.disposal.test.ts`
- `cubit-emit-disposal.test.ts`
- Memory leak detection tests

**Insight**: New logging system should maintain compatibility with `logSpy` for testing.

## TypeScript Logging Best Practices

### Structured Logging Principles

**Definition**: Treat log entries as structured data (key-value pairs) rather than plain text strings.

**Benefits**:
1. Machine-readable logs (easy parsing/filtering)
2. Better searchability in log aggregation tools
3. Consistent format across codebase
4. Type-safe log context

**Example Pattern**:
```typescript
// ❌ Unstructured
log("User logged in: user123 at 2024-01-20");

// ✅ Structured
log({
  event: 'user_login',
  userId: 'user123',
  timestamp: Date.now(),
  level: 'info'
});
```

### Log Levels Best Practices

**Standard Levels** (from least to most verbose):
1. **error**: Critical failures requiring immediate attention
2. **warn**: Recoverable issues, deprecations, potential problems
3. **info/log**: General informational messages
4. **debug**: Detailed debugging information
5. **trace**: Extremely verbose low-level operations

**Usage Guidelines**:
- **error**: Use sparingly, only for actual errors
- **warn**: Use for things that should be fixed but aren't breaking
- **log**: Default informational level for development
- **debug**: Detailed state/flow information
- **trace**: Hot path operations (should be zero-cost when disabled)

### Context & Metadata

**Essential Context** (should be included in every log):
- **Timestamp**: High-resolution for performance analysis
- **Logger name**: Component/class/module identifier
- **Level**: error/warn/log/debug/trace
- **Message**: Human-readable description

**Optional Context**:
- **Stack trace**: For errors and warnings
- **User/Session ID**: For request tracing
- **Performance metrics**: Execution time, memory usage
- **Structured data**: Arbitrary key-value pairs

### Performance Considerations

**Zero-Cost Abstraction Principles**:
1. **Lazy evaluation**: Don't compute log data if it won't be output
2. **Dead code elimination**: Remove disabled logs from production builds
3. **Minimal branching**: Fast boolean checks before expensive operations
4. **Avoid string concatenation**: Use template literals or defer formatting

**Example - Lazy Evaluation**:
```typescript
// ❌ BAD: Always computes expensive data
logger.debug(`State: ${JSON.stringify(complexState)}`);

// ✅ GOOD: Only computes if debug is enabled
logger.debug(() => `State: ${JSON.stringify(complexState)}`);
```

## Zero-Overhead Logging Techniques

### Build-Time Dead Code Elimination

**Webpack DefinePlugin Approach**:
```javascript
// webpack.config.js
new webpack.DefinePlugin({
  __BLAC_LOGGING_ENABLED__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  __BLAC_LOG_LEVEL__: JSON.stringify(process.env.LOG_LEVEL || 'warn')
});
```

**Vite Define Approach**:
```javascript
// vite.config.js
export default {
  define: {
    __BLAC_LOGGING_ENABLED__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  }
};
```

**Code Pattern**:
```typescript
if (__BLAC_LOGGING_ENABLED__) {
  logger.log('expensive operation');
}

// After build with production mode, becomes:
if (false) {
  logger.log('expensive operation');  // Dead code - removed by minifier
}
```

**Tree-Shaking Requirements**:
1. Use ES modules (import/export)
2. Mark side-effect-free code in package.json: `"sideEffects": false`
3. Use `const` for logger instances (enables better optimization)
4. Avoid dynamic logger creation

### Runtime Performance Optimization

**Fast Path Checks**:
```typescript
class Logger {
  private enabled = false;

  log(message: string) {
    // Fast boolean check before any work
    if (!this.enabled) return;

    // Expensive formatting only if enabled
    this.output(this.format(message));
  }
}
```

**Benchmark Comparison** (from Pino documentation):
- **Pino**: ~13,000 ops/sec (production-optimized)
- **Winston**: ~900 ops/sec (feature-rich)
- **Console.log**: ~3,500 ops/sec (baseline)

**Insight**: Proper optimization can make logging **faster than console.log** while adding features.

### Topic/Namespace Filtering Performance

**Pattern**: Use Map or Set for O(1) lookups:
```typescript
class Logger {
  private enabledTopics = new Set(['lifecycle', 'state']);

  log(topic: string, message: string) {
    if (!this.enabledTopics.has(topic)) return;  // O(1) check
    // ... log message
  }
}
```

**Pattern**: Use string prefix matching for namespaces:
```typescript
class Logger {
  private namespacePattern = 'Counter*';

  shouldLog(blocName: string): boolean {
    // Fast string operations
    if (this.namespacePattern === '*') return true;
    if (this.namespacePattern.endsWith('*')) {
      return blocName.startsWith(this.namespacePattern.slice(0, -1));
    }
    return blocName === this.namespacePattern;
  }
}
```

## Implementation Patterns

### Centralized Logger Module

**Recommended Structure**:
```
packages/blac/src/logging/
  ├── Logger.ts           # Main logger class
  ├── LogConfig.ts        # Configuration types and defaults
  ├── LogFormatter.ts     # Output formatting
  ├── LogLevel.ts         # Level definitions
  ├── LogTopic.ts         # Topic definitions
  └── index.ts            # Public API
```

**Benefits**:
- Single source of truth for logging logic
- Easy to test in isolation
- Can be tree-shaken if unused
- Clear API boundaries

### Integration Points

**Core Package** (`@blac/core`):
1. **Blac.ts**: Instance lifecycle, configuration changes
2. **BlocBase.ts**: Bloc lifecycle, state changes, disposal
3. **SubscriptionManager.ts**: Observer add/remove, notifications
4. **ConsumerTracker.ts**: Consumer tracking, WeakRef cleanup
5. **ProxyFactory.ts**: Proxy creation, cache operations
6. **ErrorManager.ts**: Error handling, recovery

**React Package** (`@blac/react`):
7. **useBloc.ts**: Hook lifecycle, dependency tracking
8. **BlacAdapter.ts**: Adapter lifecycle, React integration
9. **DependencyTracker.ts**: Dependency array changes

### Console Output Patterns

**Visual Hierarchy with Groups**:
```typescript
console.group(`🔵 [CounterBloc:default:abc123] Created`);
console.log('Constructor params:', params);
console.log('Initial state:', initialState);
console.log('Plugins:', activePlugins);
console.groupEnd();
```

**Color Coding** (browser console):
```typescript
const styles = {
  error: 'color: red; font-weight: bold',
  warn: 'color: orange',
  log: 'color: blue',
  lifecycle: 'background: green; color: white; padding: 2px 4px',
};

console.log('%c[lifecycle]%c State changed', styles.lifecycle, '', newState);
```

**Performance Timing**:
```typescript
console.time('CounterBloc:default:abc123 - State Change');
// ... operation
console.timeEnd('CounterBloc:default:abc123 - State Change');

// Or use Performance API:
performance.mark('bloc-state-start');
// ... operation
performance.mark('bloc-state-end');
performance.measure('bloc-state-duration', 'bloc-state-start', 'bloc-state-end');
```

### Configuration API Design

**Global Configuration** (extend existing `Blac.setConfig()`):
```typescript
interface BlacConfig {
  // ... existing config
  logging?: {
    level: LogLevel | false;
    topics: LogTopic[] | 'all';
    namespaces: string | string[];
    timestamp: boolean;
    stackTrace: boolean;
    blocIdentity: boolean;
  };
}
```

**Runtime API** (new static methods on Blac):
```typescript
class Blac {
  static logging = {
    setLevel(level: LogLevel | false): void,
    enableTopic(topic: LogTopic): void,
    disableTopic(topic: LogTopic): void,
    setNamespaces(patterns: string | string[]): void,
    reset(): void,
  };
}
```

## Anti-Patterns to Avoid

### 1. String Concatenation in Hot Paths
```typescript
// ❌ BAD: Always builds string
logger.log('State: ' + JSON.stringify(state));

// ✅ GOOD: Lazy evaluation
logger.log(() => `State: ${JSON.stringify(state)}`);
```

### 2. Complex Logic in Log Statements
```typescript
// ❌ BAD: Always executes expensive calculation
logger.log('Average:', calculateComplexAverage(data));

// ✅ GOOD: Guard with level check
if (logger.isDebugEnabled()) {
  logger.debug('Average:', calculateComplexAverage(data));
}
```

### 3. Mutating State in Logs
```typescript
// ❌ BAD: Sorting mutates original array
logger.log('Sorted items:', items.sort());

// ✅ GOOD: Create copy for logging
logger.log('Sorted items:', [...items].sort());
```

### 4. Logging Sensitive Data
```typescript
// ❌ BAD: Exposes passwords
logger.log('User login:', { username, password });

// ✅ GOOD: Redact sensitive fields
logger.log('User login:', { username, password: '***' });
```

### 5. Over-Logging in Production
```typescript
// ❌ BAD: Logs on every render
function Component() {
  logger.log('Rendering');  // Could be called thousands of times
  // ...
}

// ✅ GOOD: Use sampling or disable in production
function Component() {
  if (__DEV__ && Math.random() < 0.01) {  // 1% sampling
    logger.debug('Rendering');
  }
  // ...
}
```

## Recommended Libraries (for reference)

### Pino (High-Performance Logging)
- **Strengths**: Extremely fast (~13k ops/sec), low overhead, structured JSON output
- **Use case**: Production applications where performance is critical
- **Pattern**: Async logging, worker threads for formatting

### LogTape (Zero-Dependency)
- **Strengths**: Zero dependencies, library-friendly, minimal API
- **Use case**: Libraries that need logging without bloating consumers
- **Pattern**: Hierarchical loggers, lazy evaluation

### tslog (TypeScript-Native)
- **Strengths**: Full TypeScript support, beautiful console output, extensible
- **Use case**: Development and debugging with great DX
- **Pattern**: Type-safe context, pluggable transports

**Insight for BlaC**: We should adopt patterns from these libraries (lazy evaluation, structured output, hierarchical loggers) but implement our own minimal solution to avoid dependencies.

## Build Configuration Research

### Webpack Setup for Dead Code Elimination

**Configuration**:
```javascript
// webpack.config.js
module.exports = {
  mode: 'production',  // Enables tree shaking
  optimization: {
    usedExports: true,  // Mark used exports
    sideEffects: false, // Enable aggressive tree shaking
  },
  plugins: [
    new webpack.DefinePlugin({
      __BLAC_LOGGING__: JSON.stringify(process.env.ENABLE_LOGGING === 'true'),
    }),
  ],
};
```

**Package.json**:
```json
{
  "sideEffects": false,  // All files are side-effect free
  // OR specify files with side effects:
  "sideEffects": ["*.css", "src/global-setup.ts"]
}
```

### Vite Setup for Dead Code Elimination

**Configuration**:
```javascript
// vite.config.js
export default defineConfig({
  define: {
    __BLAC_LOGGING__: JSON.stringify(process.env.ENABLE_LOGGING === 'true'),
  },
  build: {
    minify: 'terser',  // Terser is better at DCE than esbuild
    terserOptions: {
      compress: {
        dead_code: true,
        drop_console: false,  // Keep console for our logger
      },
    },
  },
});
```

### Rollup Setup (Used by Most Libraries)

**Configuration**:
```javascript
// rollup.config.js
import replace from '@rollup/plugin-replace';

export default {
  plugins: [
    replace({
      __BLAC_LOGGING__: JSON.stringify(process.env.ENABLE_LOGGING === 'true'),
      preventAssignment: true,
    }),
  ],
};
```

## Testing Strategies

### Testing Logging Behavior

**Pattern 1: Spy on Logger Methods**
```typescript
test('should log state change', () => {
  const logSpy = vi.spyOn(logger, 'log');
  cubit.increment();
  expect(logSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      topic: 'state',
      event: 'state_changed',
    })
  );
});
```

**Pattern 2: Mock Console**
```typescript
test('should output to console', () => {
  const consoleSpy = vi.spyOn(console, 'log');
  logger.log('test message');
  expect(consoleSpy).toHaveBeenCalled();
  consoleSpy.mockRestore();
});
```

**Pattern 3: Capture Log Output**
```typescript
test('should format log correctly', () => {
  const logs: string[] = [];
  logger.onLog = (message) => logs.push(message);

  logger.log('test');
  expect(logs[0]).toMatch(/\[lifecycle\] test/);
});
```

### Testing Dead Code Elimination

**Pattern**: Verify bundle size with/without logging:
```typescript
test('production build has no logging code', async () => {
  const prodBundle = await buildBundle({ mode: 'production' });
  const prodSize = prodBundle.length;

  const devBundle = await buildBundle({ mode: 'development' });
  const devSize = devBundle.length;

  // Production should be significantly smaller
  expect(prodSize).toBeLessThan(devSize * 0.8);

  // Production should not contain logging strings
  expect(prodBundle).not.toContain('logger.debug');
});
```

## Summary & Recommendations

### Key Takeaways

1. **Current State**: BlaC has minimal logging (~50 calls total, mostly in Blac.ts)
2. **Critical Gaps**: React integration has **zero logging**, subscription system is un-instrumented
3. **Performance**: Zero-overhead is achievable via dead code elimination + lazy evaluation
4. **Best Practices**: Structured logging, lazy evaluation, topic filtering, hierarchical loggers
5. **Build Tools**: All major bundlers support DefinePlugin-style dead code elimination

### Recommended Approach

1. **Create centralized Logger module** in `packages/blac/src/logging/`
2. **Extend Blac.setConfig()** with logging configuration
3. **Add static Blac.logging** API for runtime control
4. **Instrument critical paths**: lifecycle, state, subscriptions, React hooks
5. **Use build-time flags**: `__BLAC_LOGGING__` for dead code elimination
6. **Maintain backwards compatibility**: Keep `Blac.enableLog` and `logSpy`
7. **Provide migration guide**: Help users transition from old to new API

### Implementation Priority

**Phase 1 - Core Infrastructure**:
- Logger module with topic filtering
- Configuration API
- Integration with Blac singleton

**Phase 2 - Core Instrumentation**:
- Lifecycle events (creation, disposal)
- State changes
- Subscription operations

**Phase 3 - React Instrumentation**:
- useBloc hook lifecycle
- Dependency tracking
- Adapter operations

**Phase 4 - Advanced Features**:
- Performance timing
- DevTools integration
- Custom formatters

### Success Metrics

1. ✅ Zero overhead when logging disabled (verified via bundle size)
2. ✅ All critical lifecycle events instrumented
3. ✅ Logs provide actionable debugging information
4. ✅ Configuration is intuitive and well-documented
5. ✅ Existing tests continue to pass
6. ✅ New logging tests achieve >80% coverage

---

**Next Steps**: Proceed to discussion.md with solution options.
