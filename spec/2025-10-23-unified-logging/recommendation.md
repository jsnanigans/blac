# Recommendation: Simple Singleton Logger

## Decision

**Build the simplest thing that works.**

A basic singleton logger with:
- 4 log levels (ERROR, WARN, INFO, DEBUG)
- Simple configuration via `Blac.setLogConfig()`
- JSON serialization with fallback
- No unnecessary complexity

## Why Simple?

### What You Actually Need
- Replace scattered `console.log` statements
- Structured output for debugging
- Can be enabled/disabled
- Works at critical landmarks

### What You Don't Need (Yet)
- Circular reference detection (add when you hit it)
- Call stack capture (expensive, rarely useful)
- Custom output handlers (console.log is fine)
- Filtering by context (use log levels)
- Benchmarking suite (if it's slow, you'll notice)
- Example applications (it's logging, not rocket science)

## Implementation

### One File: `Logger.ts` (~150 lines)

```typescript
class BlacLogger {
  private static config = {
    enabled: false,
    level: LogLevel.INFO,
    output: (entry: LogEntry) => console.log(JSON.stringify(entry))
  };

  static debug(context: string, message: string, data?: any): void {
    if (!this.config.enabled || this.config.level < LogLevel.DEBUG) return;
    this.log('DEBUG', context, message, data);
  }

  // ... info, warn, error
}
```

**That's it.**

### Usage

```typescript
// Enable for development
Blac.setLogConfig({
  enabled: true,
  level: LogLevel.DEBUG
});

// Use in code
BlacLogger.debug('StateStream', 'update', { version: this.version });
```

### Where to Add Logging

**~10 critical points:**
1. StateStream.update() - state changes
2. StateContainer.onStateChange() - state transitions
3. SubscriptionSystem.notify() - notifications
4. SubscriptionRegistry.register/unregister() - lifecycle
5. SubscriptionRegistry.performCleanup() - cleanup
6. ReactBridge - replace 15 console.log statements
7. Error catch blocks - exception logging

## Timeline

**Total: ~6 hours**

- **Phase 1** (2 hours): Create Logger.ts, tests, exports
- **Phase 2** (3 hours): Add logging calls to ~10 points
- **Phase 3** (1 hour): Test, verify, document

## Success Criteria

- ✅ Can enable/disable via config
- ✅ Can set log level
- ✅ State changes are logged
- ✅ Subscriptions are logged
- ✅ No more console.log in v2
- ✅ All tests still pass
- ✅ Logging doesn't crash

## When to Add More

**Only when you actually need it:**

- **Circular references?** Add WeakSet tracking when you hit one
- **Remote logging?** Add custom output handler when needed
- **Too noisy?** Add sampling/filtering when it's a problem
- **Performance issue?** Optimize when you measure a problem

## Why This is Better

### Over-Engineered Version
- 33 tasks
- 7 phases
- 20-30 hours
- Benchmarking, optimization, example apps
- Solving problems that don't exist yet

### Simple Version
- 14 tasks
- 3 phases
- 6 hours
- Solves the actual problem
- Can evolve as needed

## Conclusion

Build what you need now. Add complexity when you need it, not speculatively.

Start with Phase 1, Task 1.1: Create `Logger.ts`
