# Integrated Logging System - Recommendation

## Selected Solution: Option 2 - Dedicated Logger Module

### Overview

We will implement a centralized, feature-rich logging system through a dedicated `Logger` module in the core package. This approach provides structured logging, fine-grained configuration, zero-overhead capabilities, and excellent developer experience while maintaining backwards compatibility.

### Why This Approach?

**Option 2 scored 61/70** and provides the best balance of:
- **Features**: All required capabilities (topics, namespaces, levels, context)
- **Performance**: Zero-overhead when disabled via dead code elimination
- **Maintainability**: Centralized logic, easy to test and extend
- **Developer Experience**: Clear API, TypeScript autocomplete, good documentation
- **Future-proofing**: Easy to add custom handlers, formatters, or advanced features

### Architecture

```
packages/blac/src/logging/
  ├── Logger.ts              # Core logger class with filtering & formatting
  ├── LogConfig.ts           # Configuration types, defaults, validation
  ├── LogLevel.ts            # Log level definitions and utilities
  ├── LogTopic.ts            # Topic definitions and utilities
  ├── LogFormatter.ts        # Output formatting (console, structured)
  ├── types.ts               # LogEntry, LogConfig interfaces
  └── index.ts               # Public API exports

packages/blac/src/
  └── Blac.ts                # Integration: setConfig(), logging API
```

### Key Components

#### 1. Logger Class
- **Singleton pattern** for global configuration
- **Fast filtering**: O(1) level/topic checks, O(1) namespace matching (with wildcards)
- **Lazy evaluation**: No string formatting unless log will be output
- **Structured entries**: Key-value pairs instead of string concatenation
- **DevTools integration**: Console groups, timing, performance marks

#### 2. Configuration API
**Global Configuration** (via `Blac.setConfig()`):
```typescript
Blac.setConfig({
  logging: {
    level: 'log' | 'warn' | 'error' | false,
    topics: ['lifecycle', 'state', 'subscriptions'] | 'all',
    namespaces: 'Counter*' | ['UserBloc', 'AuthBloc'] | '*',
    timestamp: boolean,
    stackTrace: boolean,
    blocIdentity: boolean,
  }
});
```

**Runtime API** (via `Blac.logging`):
```typescript
Blac.logging.setLevel('log');
Blac.logging.enableTopic('subscriptions');
Blac.logging.disableTopic('performance');
Blac.logging.setNamespaces(['CounterBloc', 'UserBloc']);
Blac.logging.reset();  // Reset to defaults
```

#### 3. Log Entry Structure
```typescript
interface LogEntry {
  level: 'error' | 'warn' | 'log';
  topic: 'lifecycle' | 'state' | 'subscriptions' | 'performance';
  message: string;
  namespace?: string;       // Bloc name
  blocId?: string;          // Bloc instance ID
  blocUid?: string;         // Bloc UID
  context?: unknown;        // Additional structured data
  timestamp?: number;       // High-resolution timestamp
  stackTrace?: string;      // Call stack (for error/warn)
}
```

#### 4. Zero-Overhead Mode
**Build-time flag**: `__BLAC_LOGGING__`
- Defined via Webpack DefinePlugin, Vite define, or Rollup replace
- When `false`, all logging code is eliminated by minifier
- When `true`, logging is available with runtime configuration

**Configuration**:
```javascript
// webpack.config.js
new webpack.DefinePlugin({
  __BLAC_LOGGING__: JSON.stringify(process.env.NODE_ENV !== 'production'),
});

// vite.config.js
export default {
  define: {
    __BLAC_LOGGING__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  }
};
```

**Usage in code**:
```typescript
if (__BLAC_LOGGING__) {
  logger.log({ level: 'log', topic: 'lifecycle', message: 'Bloc created' });
}
```

### Integration Points

We will instrument the following critical code paths:

#### Core Package (`@blac/core`)

**1. Lifecycle Events** (`Blac.ts`, `BlocBase.ts`):
- Bloc creation (constructor, registration)
- Bloc disposal (lifecycle states, cleanup)
- Instance management (find, create, register, unregister)
- Keep-alive handling
- Configuration changes

**2. State Changes** (`BlocBase.ts`, `Cubit.ts`, `Bloc.ts`):
- State emissions (previous/next values)
- Plugin transformations
- Subscriber notifications
- Error handling during emit

**3. Subscription Operations** (`SubscriptionManager.ts`, `ConsumerTracker.ts`):
- Observer add/remove
- Consumer add/remove (WeakRef tracking)
- Notification cycles (selector evaluation, equality checks)
- Dependency tracking results
- WeakRef cleanup (garbage collection)

**4. Proxy & Dependency Tracking** (`ProxyFactory.ts`, `BlacAdapter.ts`):
- Proxy creation
- Cache hits/misses
- Dependency detection
- Adapter mode switches

#### React Package (`@blac/react`)

**5. Hook Lifecycle** (`useBloc.ts`):
- Hook calls (mount, unmount, updates)
- Dependency array changes
- Selector evaluation
- Force update triggers

**6. Adapter Operations** (`BlacAdapter.ts`):
- Adapter creation/disposal
- Subscription management
- Render notifications
- Dependency tracking mode

### Backwards Compatibility

**Maintain existing API**:
```typescript
// Old API (deprecated but functional)
Blac.enableLog = true;  // Maps to Blac.setConfig({ logging: { level: 'log' } })
Blac.log(...args);      // Maps to logger.log({ level: 'log', ... })
Blac.logSpy = fn;       // Still captures logs for tests
```

**Migration path**:
1. Old API continues to work (no breaking changes)
2. Add deprecation warnings in console (only in dev mode)
3. Provide migration guide in documentation
4. Update internal uses to new API over time

### Performance Characteristics

**Zero-Overhead Mode** (production):
- Build flag eliminates all logging code
- Zero runtime checks
- Zero bundle size impact

**Minimal-Overhead Mode** (development):
- Fast boolean checks: ~1-2ns per log call when disabled
- O(1) level/topic/namespace filtering
- Lazy evaluation prevents expensive formatting when filtered
- String formatting only for output logs

**Benchmarks** (estimated):
- Disabled log check: < 2ns (negligible)
- Enabled log with filtering: < 5ns (O(1) Set lookup)
- Full log output: ~100-500μs (console I/O dominates)

### Developer Experience Improvements

**Before** (current):
```typescript
if (Blac.enableLog) {
  this.log('[CounterBloc:default] State changed from 0 to 1');
}
```

**After** (new):
```typescript
logger.log({
  level: 'log',
  topic: 'state',
  message: 'State changed',
  namespace: this._name,
  blocId: String(this._id),
  context: { previous: 0, next: 1 },
});

// Output:
// [2025-01-20T10:30:45.123Z] [CounterBloc:default:abc123] [state] State changed { previous: 0, next: 1 }
```

**TypeScript autocomplete**:
- Autocomplete for topics, levels, config options
- Type-safe log entries (can't typo topic names)
- IntelliSense for configuration

**Console output enhancements**:
- Color coding by level (error=red, warn=yellow)
- Console groups for related operations
- Performance timing with `console.time()`
- Performance marks for browser profiling

### Testing Strategy

**Unit Tests** (Logger module):
- Test filtering logic (level, topic, namespace)
- Test configuration validation
- Test formatting logic
- Test output methods

**Integration Tests** (Core + React):
- Test logging during bloc lifecycle
- Test logging during state changes
- Test logging during subscriptions
- Test logging in React hooks

**Build Tests**:
- Verify dead code elimination works
- Verify production bundle has no logging strings
- Verify dev bundle includes logging code

**Test Infrastructure**:
- Maintain `logSpy` compatibility for existing tests
- Add new log capture utilities for structured logs
- Add matchers for log entry assertions

### Documentation & Examples

**API Documentation**:
- JSDoc comments for all public APIs
- TypeScript type definitions
- Configuration examples

**User Guide**:
- Getting started with logging
- Configuration options explained
- Filtering by topic/namespace/level
- Reading log output
- Debugging common issues

**Migration Guide**:
- How to migrate from old API
- Updating existing log calls
- Configuring zero-overhead mode
- Testing with new logging

### Implementation Phases

**Phase 1: Core Infrastructure** (~3 hours)
- Create logging module structure
- Implement Logger class with filtering
- Add configuration API
- Add build flag support

**Phase 2: Core Instrumentation** (~3 hours)
- Add lifecycle logging (Blac, BlocBase)
- Add state change logging (Cubit, Bloc)
- Add subscription logging (SubscriptionManager, ConsumerTracker)

**Phase 3: React Instrumentation** (~2 hours)
- Add useBloc hook logging
- Add adapter logging
- Add dependency tracking logging

**Phase 4: Polish & Testing** (~3 hours)
- Add DevTools integration (groups, timing)
- Write comprehensive tests
- Update existing tests
- Write documentation

**Total Estimated Time**: 11-12 hours

### Success Criteria

✅ All lifecycle events are logged with context
✅ State changes include previous/next values
✅ Subscription operations are traceable
✅ React hook lifecycle is visible
✅ Logs can be filtered by topic, namespace, and level
✅ Zero performance overhead when disabled
✅ Console output is well-formatted and readable
✅ Existing `Blac.enableLog` behavior is preserved
✅ All tests pass (existing + new)
✅ Documentation is complete

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking existing tests | High | Maintain logSpy compatibility, update tests incrementally |
| Performance regression | Medium | Implement zero-overhead mode, benchmark critical paths |
| Log noise in development | Low | Sensible defaults (warn level), easy filtering |
| Complex configuration | Low | Good defaults, clear examples, TypeScript autocomplete |
| Build config complexity | Low | Provide examples for Webpack/Vite/Rollup |

### Future Enhancements (Out of Scope)

- Custom log handlers (file output, remote logging)
- Structured JSON output for log aggregation
- Per-instance logging configuration
- Log sampling/throttling for high-frequency events
- Integration with external logging services (Sentry, LogRocket, etc.)
- Performance metrics topic with automatic timing

These can be added later without breaking changes.

---

## Next Steps

Proceed to **plan.md** for detailed task breakdown and implementation steps.
