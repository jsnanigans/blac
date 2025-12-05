# Logging

BlaC provides a built-in logging system for debugging.

## Global Configuration

```typescript
import { configureLogger, LogLevel } from '@blac/core';

configureLogger({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => console.log(JSON.stringify(entry)),
});
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | `boolean` | Enable/disable logging |
| `level` | `LogLevel` | Minimum level to log |
| `output` | `(entry) => void` | Custom output handler |

### Log Levels

```typescript
LogLevel.ERROR = 0  // Errors only
LogLevel.WARN  = 1  // Warnings and above
LogLevel.INFO  = 2  // Info and above
LogLevel.DEBUG = 3  // Everything
```

## Using Individual Functions

```typescript
import { debug, info, warn, error } from '@blac/core';

debug('MyComponent', 'Rendering', { props });
info('UserCubit', 'User logged in', { userId: '123' });
warn('CartCubit', 'Cart is getting large', { itemCount: 100 });
error('AuthCubit', 'Login failed', { error: 'Invalid credentials' });
```

Each function takes:
1. `context` - Where the log is from (component, cubit name)
2. `message` - What happened
3. `data` (optional) - Additional data object

## Custom Logger

Create isolated logger instances:

```typescript
import { createLogger, LogLevel } from '@blac/core';

const logger = createLogger({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => {
    // Custom formatting
    const prefix = `[${entry.level}] ${entry.context}:`;
    console.log(prefix, entry.message, entry.data || '');
  }
});

logger.debug('Context', 'Message', { data: 'value' });
logger.info('Context', 'Message');
logger.warn('Context', 'Message');
logger.error('Context', 'Message', { error });
```

## Log Entry Structure

```typescript
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  context: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}
```

## Environment Variable

Set log level via environment variable:

```bash
BLAC_LOG_LEVEL=debug npm start
```

## Common Patterns

### Development-Only Logging

```typescript
configureLogger({
  enabled: process.env.NODE_ENV === 'development',
  level: LogLevel.DEBUG,
});
```

### Production Error Tracking

```typescript
configureLogger({
  enabled: true,
  level: LogLevel.ERROR,
  output: (entry) => {
    // Send to error tracking service
    if (entry.level === 'error') {
      errorTracker.capture(entry);
    }
  },
});
```

### Custom Formatting

```typescript
configureLogger({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => {
    const time = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    console.log(`${time} ${level} [${entry.context}] ${entry.message}`);
    if (entry.data) {
      console.log('  Data:', entry.data);
    }
  },
});
```

## See Also

- [Plugins](/core/plugins) - Build custom logging plugins
- [System Events](/core/system-events) - Log state changes
