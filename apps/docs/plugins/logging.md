# Logging Plugin

The logging plugin provides console output for state changes, instance lifecycle events, and monitoring alerts.

## Installation

```bash
pnpm add @blac/logging-plugin
```

## Quick setup

```ts
import { LoggingPlugin } from '@blac/logging-plugin';
import { getPluginManager } from '@blac/core';

getPluginManager().install(new LoggingPlugin({ level: 'info' }), {
  environment: 'development',
});
```

## Configuration

Pass a `LoggingPluginConfig` object to the constructor:

```ts
new LoggingPlugin({
  level: 'debug',
  format: 'grouped',
  include: ['CartCubit', 'AuthCubit'],
  logStateChanges: true,
  logLifecycle: true,
});
```

### Options

| Option             | Type                                          | Default     | Description                                     |
| ------------------ | --------------------------------------------- | ----------- | ----------------------------------------------- |
| `level`            | `'minimal' \| 'info' \| 'debug' \| 'verbose'` | `'info'`    | Log verbosity                                   |
| `format`           | `'simple' \| 'grouped'`                       | `'grouped'` | Output format. `'grouped'` uses `console.group` |
| `logger`           | `Logger`                                      | `console`   | Custom logger implementation                    |
| `prefix`           | `string`                                      | `'[BlaC]'`  | Prefix for log messages                         |
| `logLifecycle`     | `boolean`                                     | `true`      | Log instance creation and disposal              |
| `logStateChanges`  | `boolean`                                     | `true`      | Log state changes                               |
| `includeCallstack` | `boolean`                                     | `false`     | Show call stacks for state changes              |
| `include`          | `string[]`                                    | —           | Whitelist: only log these class names           |
| `exclude`          | `string[]`                                    | —           | Blacklist: skip these class names               |
| `filter`           | `FilterFn`                                    | —           | Custom filter function                          |

### Monitoring options

| Option                          | Type      | Default | Description                               |
| ------------------------------- | --------- | ------- | ----------------------------------------- |
| `instanceCountWarningThreshold` | `number`  | `50`    | Warn when instance count exceeds this     |
| `detectRapidLifecycles`         | `boolean` | `true`  | Detect rapid create/dispose cycles        |
| `rapidLifecycleWindowMs`        | `number`  | `1000`  | Time window for rapid lifecycle detection |
| `rapidLifecycleThreshold`       | `number`  | `5`     | Cycles in window to trigger warning       |

## Log levels

| Level     | Lifecycle | State changes  | Monitoring |
| --------- | --------- | -------------- | ---------- |
| `minimal` | No        | No             | Yes        |
| `info`    | Yes       | Yes            | Yes        |
| `debug`   | Yes       | Yes (detailed) | Yes        |
| `verbose` | Yes       | Yes (full)     | Yes        |

## Filtering

### By class name

```ts
new LoggingPlugin({
  include: ['CartCubit', 'AuthCubit'], // only these
  exclude: ['TimerCubit'], // or skip these
});
```

### Custom filter

```ts
new LoggingPlugin({
  filter: (ctx) => {
    // ctx: { instance, className, instanceId }
    return ctx.className !== 'InternalCubit'; // skip specific types
  },
});
```

## Custom logger

Replace `console` with your own logging implementation:

```ts
new LoggingPlugin({
  logger: {
    log: (...args) => myLogger.info(...args),
    warn: (...args) => myLogger.warn(...args),
    error: (...args) => myLogger.error(...args),
    group: (label) => myLogger.group(label),
    groupEnd: () => myLogger.groupEnd(),
  },
});
```

## Registry stats

Call `logStats()` to print a summary of the current registry state:

```ts
const logging = new LoggingPlugin({ level: 'info' });
getPluginManager().install(logging);

// later, in a debug context:
logging.logStats();
```

## Rate limiting

State change logging is automatically disabled if more than 1,000 changes per second are detected. This prevents flooding the console in high-frequency scenarios. A warning is logged when rate limiting kicks in.
