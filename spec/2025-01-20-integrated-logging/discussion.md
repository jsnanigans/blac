# Integrated Logging System - Solution Options

## Context & Goals

We need to design a comprehensive logging system for BlaC that:
- Provides visibility into lifecycle, state changes, and subscriptions
- Supports fine-grained configuration (topics, namespaces, levels)
- Has zero overhead when disabled (via dead code elimination)
- Maintains backwards compatibility with existing `Blac.enableLog` API
- Works in both browser and Node.js environments

### Current State

- **~50 log calls** scattered across codebase, mostly in `Blac.ts`
- **React integration has ZERO logging** (critical gap)
- Subscription system (hot path) has **no instrumentation**
- Existing `log()` method is silent unless test spy is attached
- No topic filtering, namespace filtering, or structured output

### Key Requirements (from specifications)

1. **Log Levels**: error, warn, log (current pattern)
2. **Topics**: lifecycle, state, subscriptions, (optional: performance)
3. **Namespace Filtering**: Filter by bloc name/pattern
4. **Configuration**: Via `Blac.setConfig()` and runtime API
5. **Context**: Include bloc identity, timestamps, stack traces
6. **Output**: Enhanced console with DevTools integration
7. **Zero Overhead**: Dead code elimination when disabled
8. **Backwards Compatible**: Preserve `Blac.enableLog` and `logSpy`

## Solution Options

We evaluated four distinct approaches, ranging from minimal refactoring to comprehensive redesign.

---

## Option 1: Minimal Extension (Simple Logger Wrapper)

### Description

Extend the existing `Blac.log()` method with minimal changes:
- Add topic parameter: `log(topic, message, ...args)`
- Add simple topic filtering via `Set<string>`
- Keep configuration on `Blac` static properties
- No new modules, all code in `Blac.ts`

### Implementation

```typescript
// In Blac.ts
class Blac {
  static enableLog = false;
  static enabledTopics = new Set(['lifecycle', 'state', 'subscriptions']);
  static enabledNamespaces: string[] = ['*'];

  log = (topic: string, message: string, ...args: unknown[]) => {
    if (!Blac.enableLog) return;
    if (!Blac.enabledTopics.has(topic)) return;
    if (!this.matchesNamespace(this.constructor.name)) return;

    console.log(`[${topic}] ${message}`, ...args);

    if (Blac.logSpy) {
      Blac.logSpy([topic, message, ...args]);
    }
  };

  private matchesNamespace(name: string): boolean {
    return Blac.enabledNamespaces.includes('*') ||
           Blac.enabledNamespaces.includes(name);
  }
}
```

### Usage

```typescript
// In BlocBase.ts
this.blacContext.log('lifecycle', `[${this._name}] Created`, { state: this.state });

// Configuration
Blac.enableLog = true;
Blac.enabledTopics = new Set(['lifecycle']);
Blac.enabledNamespaces = ['CounterBloc'];
```

### Pros

- ✅ **Minimal code changes** (< 50 lines added)
- ✅ **No new dependencies or modules**
- ✅ **Easy to understand and maintain**
- ✅ **Fully backwards compatible**
- ✅ **Fast implementation** (~2-3 hours)
- ✅ **Low risk of breaking changes**

### Cons

- ❌ **No structured logging** (still string-based)
- ❌ **No timestamp or context** (must add manually)
- ❌ **No stack traces** (would need to add separately)
- ❌ **No zero-overhead mode** (still has runtime checks)
- ❌ **Limited extensibility** (hard to add features later)
- ❌ **No DevTools integration** (just console.log)
- ❌ **Configuration is scattered** (multiple static properties)

### Scoring

| Category | Score | Rationale |
|----------|-------|-----------|
| **Simplicity** | 9/10 | Minimal new concepts, easy to grasp |
| **Maintainability** | 6/10 | Works but limited room for growth |
| **Performance** | 5/10 | Runtime checks on every log call |
| **Features** | 4/10 | Basic topic filtering only |
| **Extensibility** | 3/10 | Hard to add structured logging later |
| **Developer Experience** | 6/10 | Better than current but still basic |
| **Testing** | 8/10 | Easy to test, maintains logSpy |
| **TOTAL** | **41/70** | |

---

## Option 2: Dedicated Logger Module (Recommended)

### Description

Create a centralized `Logger` class with full features:
- New module: `packages/blac/src/logging/`
- Structured log entries with metadata
- Topic, namespace, and level filtering
- Configuration via `Blac.setConfig({ logging: {...} })`
- Runtime API: `Blac.logging.setLevel()`, `enableTopic()`, etc.
- Build-time flag: `__BLAC_LOGGING__` for dead code elimination

### Implementation

```typescript
// packages/blac/src/logging/Logger.ts
export class Logger {
  private config: LogConfig = defaultConfig;

  log(entry: LogEntry): void {
    if (!this.shouldLog(entry)) return;

    const formatted = this.format(entry);
    this.output(entry.level, formatted);
  }

  private shouldLog(entry: LogEntry): boolean {
    // Fast O(1) checks
    if (this.config.level === false) return false;
    if (!this.isLevelEnabled(entry.level)) return false;
    if (!this.isTopicEnabled(entry.topic)) return false;
    if (!this.matchesNamespace(entry.namespace)) return false;
    return true;
  }

  private format(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.timestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.config.blocIdentity && entry.namespace) {
      parts.push(`[${entry.namespace}:${entry.blocId}]`);
    }

    parts.push(`[${entry.topic}]`);
    parts.push(entry.message);

    return parts.join(' ');
  }

  private output(level: LogLevel, message: string, context?: unknown): void {
    const method = console[level] || console.log;
    method(message, context || '');
  }
}

// Singleton instance
export const logger = new Logger();
```

```typescript
// packages/blac/src/logging/types.ts
export type LogLevel = 'error' | 'warn' | 'log' | false;
export type LogTopic = 'lifecycle' | 'state' | 'subscriptions' | 'performance';

export interface LogEntry {
  level: LogLevel;
  topic: LogTopic;
  message: string;
  namespace?: string;
  blocId?: string;
  context?: unknown;
  timestamp?: number;
  stackTrace?: string;
}

export interface LogConfig {
  level: LogLevel;
  topics: LogTopic[] | 'all';
  namespaces: string | string[];
  timestamp: boolean;
  stackTrace: boolean;
  blocIdentity: boolean;
}
```

```typescript
// Integration in Blac.ts
import { logger } from './logging';

class Blac {
  static setConfig(config: Partial<BlacConfig>): void {
    if (config.logging) {
      logger.configure(config.logging);
    }
    // ... existing config
  }

  static logging = {
    setLevel: (level: LogLevel) => logger.setLevel(level),
    enableTopic: (topic: LogTopic) => logger.enableTopic(topic),
    disableTopic: (topic: LogTopic) => logger.disableTopic(topic),
    setNamespaces: (ns: string | string[]) => logger.setNamespaces(ns),
  };
}
```

### Usage

```typescript
// Configuration
Blac.setConfig({
  logging: {
    level: 'log',
    topics: ['lifecycle', 'state'],
    namespaces: 'Counter*',
    timestamp: true,
    blocIdentity: true,
  }
});

// Or runtime API
Blac.logging.setLevel('log');
Blac.logging.enableTopic('subscriptions');

// In code
import { logger } from './logging';

logger.log({
  level: 'log',
  topic: 'lifecycle',
  message: 'Bloc created',
  namespace: this._name,
  blocId: String(this._id),
  context: { initialState: this.state },
});
```

### Pros

- ✅ **Structured logging** (key-value pairs, not strings)
- ✅ **Full feature set** (topics, namespaces, timestamps, context)
- ✅ **Centralized logic** (easy to maintain and test)
- ✅ **Extensible** (can add formatters, handlers later)
- ✅ **Good DX** (clear API, TypeScript autocomplete)
- ✅ **Backwards compatible** (can wrap old API)
- ✅ **Zero-overhead capable** (with build-time flag)
- ✅ **DevTools friendly** (can add groups, timing, marks)

### Cons

- ⚠️ **More code** (~200-300 lines for logger module)
- ⚠️ **Requires build config** (for zero-overhead mode)
- ⚠️ **Migration effort** (update ~50 existing log calls)
- ⚠️ **New API to learn** (though well-documented)

### Scoring

| Category | Score | Rationale |
|----------|-------|-----------|
| **Simplicity** | 7/10 | New module but clear separation |
| **Maintainability** | 9/10 | Centralized, testable, extensible |
| **Performance** | 9/10 | Fast checks + dead code elimination |
| **Features** | 9/10 | All required features + room for more |
| **Extensibility** | 9/10 | Easy to add formatters, handlers, etc. |
| **Developer Experience** | 9/10 | Great API, good autocomplete, clear docs |
| **Testing** | 9/10 | Easy to test in isolation + integration |
| **TOTAL** | **61/70** | |

---

## Option 3: Hybrid Approach (Logger + Helpers)

### Description

Combine Option 2's Logger with convenience helpers on `BlocBase`:
- Core `Logger` class (same as Option 2)
- Helper methods on `BlocBase`: `this.logLifecycle()`, `this.logState()`, etc.
- Auto-inject bloc identity (name, id, uid) from context
- Less verbose logging calls throughout codebase

### Implementation

```typescript
// Logger module (same as Option 2)
export class Logger { /* ... */ }

// BlocBase helper methods
class BlocBase<S> {
  protected logLifecycle(message: string, context?: unknown): void {
    logger.log({
      level: 'log',
      topic: 'lifecycle',
      message,
      namespace: this._name,
      blocId: String(this._id),
      context,
    });
  }

  protected logState(message: string, state?: S): void {
    logger.log({
      level: 'log',
      topic: 'state',
      message,
      namespace: this._name,
      blocId: String(this._id),
      context: { state },
    });
  }

  protected logSubscription(message: string, context?: unknown): void {
    logger.log({
      level: 'log',
      topic: 'subscriptions',
      message,
      namespace: this._name,
      blocId: String(this._id),
      context,
    });
  }

  protected logError(message: string, error?: Error): void {
    logger.log({
      level: 'error',
      topic: 'lifecycle',  // or separate 'error' topic
      message,
      namespace: this._name,
      blocId: String(this._id),
      context: { error },
      stackTrace: error?.stack,
    });
  }
}
```

### Usage

```typescript
// In BlocBase
constructor(initialState: S) {
  this.state = initialState;
  this.logLifecycle('Bloc created', { initialState });
}

dispose() {
  this.logLifecycle('Disposal started');
  // ... disposal logic
  this.logLifecycle('Disposal completed');
}

// In Cubit
emit(newState: S) {
  const previousState = this.state;
  this.state = newState;
  this.logState('State emitted', { previousState, newState });
  // ... notify subscribers
}
```

### Pros

- ✅ **All benefits of Option 2** (structured, extensible, etc.)
- ✅ **More concise usage** (`this.logLifecycle()` vs full entry object)
- ✅ **Auto-inject bloc identity** (less repetition)
- ✅ **Better developer experience** (less verbose)
- ✅ **Type-safe helpers** (can't mix up topics)
- ✅ **Easier migration** (replace `this.log()` with `this.logLifecycle()`)

### Cons

- ⚠️ **More code** (~350-400 lines total)
- ⚠️ **Additional methods on BlocBase** (surface area increase)
- ⚠️ **Two ways to log** (helpers vs direct logger calls)
- ⚠️ **Tight coupling** (BlocBase depends on Logger)

### Scoring

| Category | Score | Rationale |
|----------|-------|-----------|
| **Simplicity** | 6/10 | More moving parts (helpers + logger) |
| **Maintainability** | 9/10 | Centralized + DRY helpers |
| **Performance** | 9/10 | Same as Option 2 (fast + DCE) |
| **Features** | 9/10 | Same as Option 2 |
| **Extensibility** | 8/10 | Slightly less flexible (helpers are rigid) |
| **Developer Experience** | 10/10 | Most concise, best autocomplete |
| **Testing** | 8/10 | Need to test helpers + logger |
| **TOTAL** | **59/70** | |

---

## Option 4: Debug Build Only (No Production Logging)

### Description

Extreme zero-overhead approach: logging only exists in debug builds
- All logging code wrapped in `if (__DEV__)` blocks
- Production builds have **zero** logging code (fully eliminated)
- Debug builds use a simple logger (similar to Option 2 but stripped down)
- No runtime configuration (compile-time only)

### Implementation

```typescript
// packages/blac/src/logging/debug-logger.ts
if (__DEV__) {
  export class DebugLogger {
    log(topic: string, message: string, context?: unknown): void {
      console.log(`[${topic}] ${message}`, context || '');
    }
  }
  export const logger = new DebugLogger();
} else {
  export const logger = {
    log: () => {},  // No-op in production
  };
}
```

```typescript
// Usage in BlocBase
constructor(initialState: S) {
  this.state = initialState;

  if (__DEV__) {
    logger.log('lifecycle', `[${this._name}] Created`, { initialState });
  }
}
```

### Pros

- ✅ **True zero overhead** (literally no code in production)
- ✅ **Simplest production bundle** (smallest size)
- ✅ **No configuration needed** (it's on or off)
- ✅ **Fast development** (no complex filtering logic)

### Cons

- ❌ **No production debugging** (can't enable logging remotely)
- ❌ **No fine-grained control** (all or nothing)
- ❌ **No topic filtering** (everything logs in dev)
- ❌ **Noisy development** (can't filter by namespace)
- ❌ **Limited usefulness** (can't debug prod issues)
- ❌ **Poor DX for library users** (can't inspect blac internals)

### Scoring

| Category | Score | Rationale |
|----------|-------|-----------|
| **Simplicity** | 8/10 | Simple concept but lots of `if (__DEV__)` |
| **Maintainability** | 5/10 | Hard to debug production issues |
| **Performance** | 10/10 | Absolute zero overhead in production |
| **Features** | 2/10 | Minimal features, no configurability |
| **Extensibility** | 2/10 | Can't add features without rebuild |
| **Developer Experience** | 4/10 | Good in dev, terrible in prod |
| **Testing** | 6/10 | Can test dev build, but prod is untestable |
| **TOTAL** | **37/70** | |

---

## Comparison Matrix

| Criteria | Option 1: Minimal | Option 2: Logger (⭐) | Option 3: Hybrid | Option 4: Debug Only |
|----------|------------------|---------------------|------------------|---------------------|
| **Implementation Time** | 2-3 hours | 6-8 hours | 8-10 hours | 4-5 hours |
| **Code Size** | ~50 lines | ~250 lines | ~400 lines | ~150 lines |
| **Structured Logging** | ❌ No | ✅ Yes | ✅ Yes | ⚠️ Minimal |
| **Topic Filtering** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Namespace Filtering** | ✅ Basic | ✅ Advanced | ✅ Advanced | ❌ No |
| **Timestamps** | ❌ No | ✅ Yes | ✅ Yes | ⚠️ Manual |
| **Stack Traces** | ❌ No | ✅ Yes | ✅ Yes | ❌ No |
| **Zero Overhead** | ❌ No | ✅ Yes (with flag) | ✅ Yes (with flag) | ✅ Yes (compile-time) |
| **Runtime Config** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **DevTools Integration** | ❌ No | ✅ Yes | ✅ Yes | ⚠️ Basic |
| **Backwards Compat** | ✅ Perfect | ✅ Yes | ✅ Yes | ✅ Yes |
| **Extensibility** | ⚠️ Limited | ✅ High | ✅ High | ❌ Low |
| **Production Debugging** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **DX Score** | 6/10 | 9/10 | 10/10 | 4/10 |
| **Total Score** | 41/70 | **61/70** | 59/70 | 37/70 |

---

## Recommendation

**Option 2: Dedicated Logger Module** is the recommended approach.

### Rationale

1. **Meets all requirements**: Structured logging, topic/namespace filtering, zero-overhead, backwards compatibility
2. **Best balance**: Features vs complexity, performance vs configurability
3. **Future-proof**: Easy to extend with custom handlers, formatters, or plugins later
4. **Industry standard**: Follows patterns from mature logging libraries (Pino, LogTape, tslog)
5. **Good DX**: Clear API, TypeScript autocomplete, helpful error messages
6. **Testable**: Centralized logic makes testing easy
7. **Maintainable**: Single source of truth, follows Single Responsibility Principle

### Why Not The Others?

- **Option 1** is too limited (no structured logging, no zero-overhead, limited extensibility)
- **Option 3** is slightly over-engineered for current needs (helpers can be added later if desired)
- **Option 4** sacrifices production debugging entirely (deal-breaker for enterprise use)

### Implementation Strategy

**Phase 1: Core Infrastructure**
1. Create `packages/blac/src/logging/` module
2. Implement `Logger` class with topic/namespace filtering
3. Add configuration to `Blac.setConfig()` and runtime API
4. Add build-time flag support (`__BLAC_LOGGING__`)

**Phase 2: Instrumentation (Core)**
5. Add lifecycle logging (creation, disposal, registration)
6. Add state change logging (emit, previous/next values)
7. Add subscription logging (add/remove, notifications)

**Phase 3: Instrumentation (React)**
8. Add useBloc hook logging (mount, unmount, deps changes)
9. Add adapter logging (lifecycle, dependency tracking)

**Phase 4: Polish**
10. Add DevTools integration (groups, timing, performance marks)
11. Add documentation and examples
12. Add comprehensive tests
13. Update existing tests to use new logging (deprecate old API)

---

## Next Steps

Please review the options above and indicate your preference:

1. **Option 1** - Minimal (fastest, limited features)
2. **Option 2** - Logger Module (recommended, balanced)
3. **Option 3** - Hybrid with Helpers (most ergonomic)
4. **Option 4** - Debug Build Only (zero overhead but no prod debugging)
5. **Custom** - Mix and match features from multiple options

Once you confirm your choice, I'll create a detailed implementation plan with task breakdown, file changes, and testing strategy.
