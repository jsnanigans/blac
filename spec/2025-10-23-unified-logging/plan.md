# Implementation Plan: Simple Unified Logging

## Philosophy

**Build the simplest thing that works. Add complexity only when needed.**

This is not an enterprise logging framework. It's structured debugging for development.

---

## Phase 1: Core Logger (2 hours)

### 1.1 Create Logger Class
- [ ] #S:m Create `packages/blac/src/v2/logging/Logger.ts`

```typescript
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  level: string;
  context: string;
  message: string;
  data?: any;
  timestamp: number;
}

class BlacLogger {
  private static config = {
    enabled: false,  // Off by default
    level: LogLevel.INFO,
    output: (entry: LogEntry) => console.log(JSON.stringify(entry))
  };

  static configure(opts: {
    enabled?: boolean;
    level?: LogLevel;
    output?: (entry: LogEntry) => void;
  }): void {
    Object.assign(this.config, opts);
  }

  static debug(context: string, message: string, data?: any): void {
    if (!this.config.enabled || this.config.level < LogLevel.DEBUG) return;
    this.log('DEBUG', context, message, data);
  }

  static info(context: string, message: string, data?: any): void {
    if (!this.config.enabled || this.config.level < LogLevel.INFO) return;
    this.log('INFO', context, message, data);
  }

  static warn(context: string, message: string, data?: any): void {
    if (!this.config.enabled || this.config.level < LogLevel.WARN) return;
    this.log('WARN', context, message, data);
  }

  static error(context: string, message: string, data?: any): void {
    if (!this.config.enabled || this.config.level < LogLevel.ERROR) return;
    this.log('ERROR', context, message, data);
  }

  private static log(level: string, context: string, message: string, data?: any): void {
    try {
      const entry: LogEntry = {
        level,
        context,
        message,
        timestamp: Date.now(),
        ...(data !== undefined && { data: this.serialize(data) })
      };
      this.config.output(entry);
    } catch (e) {
      // Fallback: never let logging crash the app
      console.error('[BlacLogger] Error logging:', e);
    }
  }

  private static serialize(data: any): any {
    try {
      // Simple serialization - if it fails, we'll catch it
      return JSON.parse(JSON.stringify(data));
    } catch {
      // Fallback to toString
      return String(data);
    }
  }
}

export { BlacLogger, LogLevel };
```

### 1.2 Export from index
- [ ] #S:s Add to `packages/blac/src/v2/index.ts`
```typescript
export { BlacLogger, LogLevel } from './logging/Logger';

// Add to Blac class
static setLogConfig(config: {
  enabled?: boolean;
  level?: LogLevel;
  output?: (entry: any) => void;
}): void {
  BlacLogger.configure(config);
}
```

### 1.3 Basic Test
- [ ] #S:s Create `packages/blac/src/v2/logging/Logger.test.ts`
- Test level filtering works
- Test output handler is called
- Test disabled logger produces no output
- Done

**Deliverable**: Working logger, ~150 lines of code

---

## Phase 2: Add Logging to Critical Points (3 hours)

### 2.1 State Changes
- [ ] #S:s `StateStream.ts` - Add to update() method:
```typescript
BlacLogger.debug('StateStream', 'update', {
  version: this.version,
  source: options.source
});
```

- [ ] #S:s `StateContainer.ts` - Add to onStateChange():
```typescript
BlacLogger.debug('StateContainer', 'stateChange', {
  version: event.version
});
```

### 2.2 Subscription Lifecycle
- [ ] #S:s `SubscriptionSystem.ts` - Add to notify():
```typescript
BlacLogger.debug('SubscriptionSystem', 'notify', {
  containerId: this.containerId,
  subscriptionCount: subscriptionIds.length
});
```

- [ ] #S:s `SubscriptionRegistry.ts` - Add to register/unregister:
```typescript
// In register()
BlacLogger.debug('SubscriptionRegistry', 'register', {
  subscriptionId: id,
  containerId: config.containerId
});

// In unregister()
BlacLogger.debug('SubscriptionRegistry', 'unregister', {
  subscriptionId: id
});
```

- [ ] #S:s `SubscriptionRegistry.ts` - Add to performCleanup():
```typescript
BlacLogger.info('SubscriptionRegistry', 'cleanup', {
  removed: cleanedCount,
  remaining: this.subscriptions.size
});
```

### 2.3 Replace ReactBridge console.log
- [ ] #S:m `ReactBridge.ts` - Replace all 15 console.log with BlacLogger.debug
  - Use context: `'ReactBridge'`
  - Keep the same messages and data
  - Simple find/replace: `console.log('[ReactBridge]` → `BlacLogger.debug('ReactBridge',`

### 2.4 Error Logging
- [ ] #S:s Add error logging where exceptions are caught:
  - `SubscriptionPipeline.execute()` - catch block
  - `SubscriptionSystem.notify()` - catch block
  - `SubscriptionRegistry.processStateChange()` - catch block

**Deliverable**: Logging at ~10 key points

---

## Phase 3: Test & Done (1 hour)

### 3.1 Integration Test
- [ ] #S:s Create a simple test that:
  - Enables DEBUG logging
  - Captures log output
  - Triggers state changes
  - Verifies logs appear

### 3.2 Manual Testing
- [ ] #S:s Run playground app with:
```typescript
Blac.setLogConfig({
  enabled: true,
  level: LogLevel.DEBUG
});
```
- Verify you see logs in console
- Check logs are useful for debugging
- Done

### 3.3 Update CLAUDE.md
- [ ] #S:s Add simple note about logging:
```markdown
## Logging

Enable v2 logging for debugging:
```typescript
import { Blac, LogLevel } from '@blac/core';

Blac.setLogConfig({
  enabled: true,
  level: LogLevel.DEBUG
});
```
```

**Deliverable**: Working, tested, documented logging

---

## Summary

**Total: 3 phases, 14 tasks, ~6 hours**

### Task Breakdown
- Phase 1: 3 tasks (Logger implementation)
- Phase 2: 8 tasks (Add logging calls)
- Phase 3: 3 tasks (Test and document)

### What We're NOT Doing
- ❌ Custom serializers for circular references (add if needed)
- ❌ Call stack capture (expensive, usually useless)
- ❌ Filter predicates (use log levels)
- ❌ Custom output handlers (console.log is fine)
- ❌ Per-stage pipeline logging (too noisy)
- ❌ Benchmark suite (if it's slow, we'll notice)
- ❌ Bundle size analysis (it's tiny)
- ❌ Memory leak testing (nothing to leak)
- ❌ Example applications (it's just logging)
- ❌ Migration guides (obvious how to use)

### Success Criteria
- ✅ Can enable/disable logging via config
- ✅ Can set log level (ERROR, WARN, INFO, DEBUG)
- ✅ State changes are logged
- ✅ Subscription lifecycle is logged
- ✅ No more console.log in v2 code
- ✅ All existing tests still pass
- ✅ Logging doesn't crash on errors

### If You Need More Later
**Add it when you need it:**
- Circular reference handling → add when you hit it
- Custom output → add when you need remote logging
- Sampling → add if DEBUG is too noisy
- Per-component filtering → add if you need it

### Start Here
Begin with Phase 1, Task 1.1: Create `Logger.ts`

One file, 150 lines, simple and clean.
