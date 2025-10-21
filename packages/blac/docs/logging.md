# BlaC Logging System

Comprehensive, configurable logging for debugging, development, and performance profiling.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Topics](#topics)
- [Filtering](#filtering)
- [API Reference](#api-reference)
- [Performance](#performance)
- [Examples](#examples)
- [Migration Guide](#migration-guide)

## Overview

The BlaC logging system provides structured, topic-based logging with fine-grained control over what gets logged. It supports:

- **Topic-based filtering**: Log only lifecycle, state, subscriptions, or performance events
- **Namespace filtering**: Log only specific blocs (e.g., `"Counter*"`, `["UserBloc", "AuthBloc"]`)
- **Log levels**: error, warn, log (with future extensibility)
- **Zero overhead**: When disabled, logging code can be eliminated via dead code elimination
- **Rich context**: Automatic inclusion of bloc identity, timestamps, and stack traces
- **DevTools integration**: Console groups, performance marks, and timing
- **Backwards compatible**: Works with existing `Blac.enableLog` and `logSpy`

## Quick Start

### Enable Logging

```typescript
import { Blac } from '@blac/core';

// Method 1: Via configuration
Blac.setConfig({
  logging: {
    level: 'log', // 'error' | 'warn' | 'log' | false
    topics: ['lifecycle', 'state'], // or 'all'
    namespaces: '*', // All blocs
  },
});

// Method 2: Runtime API
Blac.logging.setLevel('log');
Blac.logging.enableTopic('lifecycle');
Blac.logging.enableTopic('state');
```

### View Logs

Open browser DevTools console. You'll see structured logs like:

```
[lifecycle] Bloc created { isolated: false, keepAlive: false, ... }
[state] State emitted { previousState: 0, newState: 1, ... }
[subscriptions] Notification cycle completed { notifiedCount: 2, duration: "0.15ms", ... }
```

## Configuration

### Via `Blac.setConfig()`

```typescript
Blac.setConfig({
  logging: {
    // Log level: false = disabled, 'error' | 'warn' | 'log'
    level: 'log',

    // Topics to log: specific array or 'all'
    topics: ['lifecycle', 'state', 'subscriptions', 'performance'],
    // Or: topics: 'all'

    // Namespace filter: string pattern or array
    namespaces: 'Counter*', // Wildcard: matches CounterBloc, CounterCubit, etc.
    // Or: namespaces: ['UserBloc', 'AuthBloc']  // Exact matches
    // Or: namespaces: '*'  // All blocs (default)

    // Include timestamp in output (default: true)
    timestamp: true,

    // Capture stack traces for error/warn (default: true)
    stackTrace: true,

    // Include bloc identity [name:id:uid] (default: true)
    blocIdentity: true,
  },
});
```

### Runtime API

For dynamic control without reconfiguration:

```typescript
// Change log level
Blac.logging.setLevel('log');
Blac.logging.setLevel(false); // Disable

// Enable/disable specific topics
Blac.logging.enableTopic('lifecycle');
Blac.logging.disableTopic('state');

// Change namespace filter
Blac.logging.setNamespaces('User*');
Blac.logging.setNamespaces(['CounterBloc', 'TodoBloc']);

// Get current config
const config = Blac.logging.getConfig();

// Reset to defaults
Blac.logging.reset();
```

## Topics

### lifecycle

Logs bloc creation, disposal, and React adapter mount/unmount:

```typescript
// Example output:
[lifecycle] Bloc created
  namespace: "CounterBloc"
  blocId: "default"
  blocUid: "abc123..."
  context: { isolated: false, keepAlive: false, instanceRef: undefined }

[lifecycle] Adapter mounted
  namespace: "CounterBloc"
  context: { adapterId: "xyz...", mountCount: 1 }

[lifecycle] Disposing bloc
  context: { disposalState: "ACTIVE", isolated: false }
```

### state

Logs all state emissions with previous/next values:

```typescript
// Example output:
[state] State emitted
  namespace: "CounterBloc"
  context: {
    previousState: 0,
    newState: 1,
    stateTransformed: false,
    action: undefined
  }
```

### subscriptions

Logs subscription operations and notification cycles:

```typescript
// Example output:
[subscriptions] Observer subscribed
  context: {
    subscriptionId: "observer-xyz...",
    type: "observer",
    hasSelector: true,
    totalSubscriptions: 3
  }

[subscriptions] Notification cycle completed
  context: {
    notifiedCount: 2,
    skippedCount: 1,
    totalSubscriptions: 3,
    duration: "0.23ms"
  }

[subscriptions] Observer unsubscribed
  context: { subscriptionId: "observer-xyz...", remainingSubscriptions: 2 }
```

### performance

Reserved for future use. Will include:

- Execution timing
- Memory stats
- Cache statistics
- Render performance

## Filtering

### By Topic

```typescript
// Only lifecycle events
Blac.setConfig({
  logging: { level: 'log', topics: ['lifecycle'] },
});

// Lifecycle + state
Blac.setConfig({
  logging: { level: 'log', topics: ['lifecycle', 'state'] },
});

// Everything
Blac.setConfig({
  logging: { level: 'log', topics: 'all' },
});
```

### By Namespace

Namespace filtering uses pattern matching:

```typescript
// Exact match
namespaces: 'CounterBloc'; // Only CounterBloc

// Wildcard at end
namespaces: 'Counter*'; // CounterBloc, CounterCubit, etc.

// Wildcard at start
namespaces: '*Bloc'; // UserBloc, AuthBloc, CounterBloc, etc.

// Multiple patterns
namespaces: ['CounterBloc', 'User*', '*Manager'];

// All (default)
namespaces: '*';
```

### By Level

```typescript
// Only errors
Blac.logging.setLevel('error');

// Errors + warnings
Blac.logging.setLevel('warn');

// Everything
Blac.logging.setLevel('log');

// Disable
Blac.logging.setLevel(false);
```

## API Reference

### `Blac.setConfig({ logging: {...} })`

Configure logging via main Blac configuration.

**Parameters**:

- `level`: `'error' | 'warn' | 'log' | false` - Minimum log level
- `topics`: `LogTopic[] | 'all'` - Topics to enable
- `namespaces`: `string | string[]` - Bloc name patterns
- `timestamp`: `boolean` - Include timestamps (default: true)
- `stackTrace`: `boolean` - Capture stacks for error/warn (default: true)
- `blocIdentity`: `boolean` - Include bloc name/id/uid (default: true)

### `Blac.logging`

Runtime logging control API:

#### `setLevel(level: LogLevel | false): void`

Set the minimum log level or disable logging.

#### `getLevel(): LogLevel | false`

Get the current log level.

#### `enableTopic(topic: LogTopic): void`

Enable a specific topic.

#### `disableTopic(topic: LogTopic): void`

Disable a specific topic.

#### `setNamespaces(patterns: string | string[]): void`

Set namespace filter pattern(s).

#### `getConfig(): Readonly<LogConfig>`

Get current logging configuration.

#### `reset(): void`

Reset to default configuration (disabled).

### Types

```typescript
type LogLevel = 'error' | 'warn' | 'log';
type LogTopic = 'lifecycle' | 'state' | 'subscriptions' | 'performance';

interface LogConfig {
  level: LogLevel | false;
  topics: LogTopic[] | 'all';
  namespaces: string | string[];
  timestamp: boolean;
  stackTrace: boolean;
  blocIdentity: boolean;
}

interface LogEntry {
  level: LogLevel;
  topic: LogTopic;
  message: string;
  namespace?: string;
  blocId?: string;
  blocUid?: string;
  context?: unknown;
  timestamp?: number;
  stackTrace?: string;
}
```

## Performance

### Runtime Overhead

When logging is **enabled**:

- Fast O(1) boolean checks before logging
- Minimal overhead: ~1-2% in development
- Lazy evaluation prevents unnecessary work

When logging is **disabled** (level: false):

- Near-zero overhead (~1-2ns per check)
- Lightweight boolean guards

### Zero-Overhead Mode (Future)

For production builds, use build-time flags to eliminate logging code entirely:

```javascript
// webpack.config.js
new webpack.DefinePlugin({
  __BLAC_LOGGING__: JSON.stringify(process.env.NODE_ENV !== 'production'),
});

// vite.config.js
export default {
  define: {
    __BLAC_LOGGING__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
};
```

Then wrap logging calls:

```typescript
if (__BLAC_LOGGING__) {
  logger.log({ ... });
}
```

Build tools will eliminate the entire block in production.

## Examples

### Example 1: Debug Lifecycle Issues

```typescript
// Enable only lifecycle logs
Blac.setConfig({
  logging: {
    level: 'log',
    topics: ['lifecycle'],
  },
});

// Create and dispose blocs
const bloc = Blac.getBloc(MyBloc);
bloc.dispose();

// Console output:
// [lifecycle] Bloc created { ... }
// [lifecycle] Disposing bloc { disposalState: "ACTIVE", ... }
```

### Example 2: Track State Changes

```typescript
// Enable state logging for specific bloc
Blac.setConfig({
  logging: {
    level: 'log',
    topics: ['state'],
    namespaces: 'CounterBloc',
  },
});

const counter = Blac.getBloc(CounterBloc);
counter.increment(); // Logs: [state] State emitted { previousState: 0, newState: 1 }
```

### Example 3: Debug Subscription Issues

```typescript
// Enable subscription logging
Blac.setConfig({
  logging: {
    level: 'log',
    topics: ['subscriptions'],
  },
});

const bloc = Blac.getBloc(MyBloc);
const sub = bloc.subscribe({ type: 'observer', notify: () => {} });

// Console:
// [subscriptions] Observer subscribed { subscriptionId: "...", totalSubscriptions: 1 }

sub.unsubscribe();

// [subscriptions] Observer unsubscribed { remainingSubscriptions: 0 }
```

### Example 4: Performance Profiling

```typescript
// Enable all logging to see full picture
Blac.setConfig({
  logging: {
    level: 'log',
    topics: 'all',
  },
});

// Perform operations
bloc.emit(newState);

// Console:
// [state] State emitted { ... }
// [subscriptions] Notification cycle completed { notifiedCount: 5, duration: "0.42ms" }
```

### Example 5: Production Error Logging

```typescript
// Only log errors in production
Blac.setConfig({
  logging: {
    level: 'error',
    topics: 'all',
  },
});

// Normal operations: no logs
bloc.increment();

// Errors are logged:
// [lifecycle] Dispose called on already disposed bloc
```

## Migration Guide

### From `Blac.enableLog`

**Old**:

```typescript
Blac.enableLog = true;
```

**New**:

```typescript
Blac.setConfig({
  logging: { level: 'log', topics: 'all' },
});

// Or use runtime API:
Blac.logging.setLevel('log');
```

**Backwards Compatibility**: `Blac.enableLog` still works and maps to the new system:

```typescript
Blac.enableLog = true; // → logger.setLevel('log')
Blac.enableLog = false; // → logger.setLevel(false)
```

### From `Blac.log()`

**Old**:

```typescript
Blac.log('My message', data);
```

**New** (internal use):

```typescript
import { logger } from '@blac/core';

logger.log({
  level: 'log',
  topic: 'lifecycle',
  message: 'My message',
  namespace: this._name,
  blocId: String(this._id),
  context: data,
});
```

**Note**: `Blac.log()` is deprecated but still functional. It's used internally for legacy compatibility.

### From `Blac.logSpy`

No changes needed! `logSpy` continues to work for testing:

```typescript
beforeEach(() => {
  Blac.logSpy = vi.fn();
});

// logSpy captures both old Blac.log() and new logger calls
expect(Blac.logSpy).toHaveBeenCalled();
```

## Troubleshooting

### No logs appearing

1. Check logging is enabled:

   ```typescript
   console.log(Blac.logging.getConfig());
   ```

2. Verify topics are enabled:

   ```typescript
   Blac.logging.enableTopic('lifecycle');
   Blac.logging.enableTopic('state');
   ```

3. Check namespace filter:
   ```typescript
   Blac.logging.setNamespaces('*'); // Allow all
   ```

### Too many logs

1. Filter by topic:

   ```typescript
   Blac.setConfig({
     logging: { level: 'log', topics: ['lifecycle'] }, // Only lifecycle
   });
   ```

2. Filter by namespace:

   ```typescript
   Blac.logging.setNamespaces('MyBloc'); // Only MyBloc
   ```

3. Increase level threshold:
   ```typescript
   Blac.logging.setLevel('warn'); // Only warnings and errors
   ```

### Performance issues

1. Disable logging:

   ```typescript
   Blac.logging.setLevel(false);
   ```

2. Filter to specific topics:

   ```typescript
   Blac.setConfig({
     logging: { level: 'log', topics: ['lifecycle'] }, // Avoid hot paths
   });
   ```

3. Use build-time elimination (see Zero-Overhead Mode above)

## Best Practices

1. **Development**: Enable all logging

   ```typescript
   Blac.setConfig({
     logging: { level: 'log', topics: 'all' },
   });
   ```

2. **Production**: Only errors

   ```typescript
   Blac.setConfig({
     logging: { level: 'error', topics: 'all' },
   });
   ```

3. **Debugging specific issues**: Filter by topic and namespace

   ```typescript
   Blac.setConfig({
     logging: {
       level: 'log',
       topics: ['subscriptions'],
       namespaces: 'MyProblematicBloc',
     },
   });
   ```

4. **Performance profiling**: Use performance topic (when available)

   ```typescript
   Blac.setConfig({
     logging: { level: 'log', topics: ['performance'] },
   });
   ```

5. **Testing**: Use `logSpy` to verify behavior
   ```typescript
   beforeEach(() => {
     Blac.logSpy = vi.fn();
     Blac.logging.setLevel('log');
   });
   ```

## Future Enhancements

Planned features (not yet implemented):

- Custom log handlers/transports
- Structured JSON output
- Per-instance logging configuration
- Log sampling/throttling
- Integration with external services (Sentry, LogRocket, etc.)
- Performance metrics topic with automatic timing

---

**See Also**:

- [BlaC Documentation](../README.md)
- [Configuration Guide](./configuration.md)
- [Debugging Guide](./debugging.md)
