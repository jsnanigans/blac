# @blac/logging-plugin

Logging and debugging plugin for BlaC. Logs lifecycle events, state changes, and monitors for potential memory issues like leaked instances and rapid create/dispose cycles.

**[Documentation](https://blac-docs.pages.dev/plugins/logging)** · **[npm](https://www.npmjs.com/package/@blac/logging-plugin)**

## Installation

```bash
pnpm add @blac/logging-plugin
```

## Usage

```ts
import { getPluginManager } from '@blac/core';
import { LoggingPlugin } from '@blac/logging-plugin';

getPluginManager().install(new LoggingPlugin(), {
  environment: 'development',
});
```

## Configuration

```ts
new LoggingPlugin({
  // Verbosity: 'minimal' | 'info' | 'debug' | 'verbose'
  level: 'info',

  // Output: 'simple' (one-line) | 'grouped' (console.group)
  format: 'grouped',

  // Filtering
  include: ['CounterCubit', 'CartCubit'],
  exclude: ['AnalyticsCubit'],
  filter: ({ className, isIsolated }) => !isIsolated,

  // What to log
  logLifecycle: true,
  logStateChanges: true,
  includeCallstack: false,

  // Memory monitoring
  instanceCountWarningThreshold: 50,
  detectRapidLifecycles: true,
  rapidLifecycleWindowMs: 1000,
  rapidLifecycleThreshold: 5,

  // State change batching
  debounceStateChanges: true,
  debounceWindowMs: 100,

  // Customization
  prefix: '[BlaC]',
  logger: console,
});
```

## Log Levels

| Level     | Logs                                               |
| --------- | -------------------------------------------------- |
| `minimal` | Warnings only (memory issues, suspicious activity) |
| `info`    | Lifecycle + warnings                               |
| `debug`   | + state changes                                    |
| `verbose` | + callstacks + full state objects                  |

## Output Examples

**Simple format:**

```
[BlaC] Created CounterCubit#abc12345
[BlaC] CounterCubit#abc12345 state: 0 → 1
[BlaC] Disposed CounterCubit#abc12345 (lived 5.2s)
```

**Grouped format:**

```
▼ [BlaC] CounterCubit#abc12345 state changed
    Previous: 0
    Current: 1
```

**Batched:**

```
[BlaC] CounterCubit#abc12345 state: 0 → 5 (5 changes batched)
```

**Warnings:**

```
[BlaC] ⚠️ High instance count: FormCubit has 52 instances
[BlaC] ⚠️ Rapid lifecycle: CounterCubit created/disposed 5 times in 1000ms
[BlaC] ⚠️ Unused instance: FormCubit#abc12345 disposed without state changes
```

## License

MIT
