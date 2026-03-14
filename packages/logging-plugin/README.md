# @blac/logging-plugin

Logging and debugging plugin for BlaC state management. Logs instance lifecycle, state changes, events, and monitors for potential memory issues.

**[Full documentation](https://jsnanigans.github.io/blac/plugins/logging)**

## Installation

```bash
pnpm add @blac/logging-plugin
```

## Usage

```typescript
import { getPluginManager } from '@blac/core';
import { LoggingPlugin } from '@blac/logging-plugin';

getPluginManager().install(new LoggingPlugin(), {
  environment: 'development',
});
```

## Configuration

```typescript
new LoggingPlugin({
  // Log verbosity: 'minimal' | 'info' | 'debug' | 'verbose'
  level: 'info',

  // Output format: 'simple' (one-line) | 'grouped' (console.group)
  format: 'grouped',

  // Filtering
  include: ['CounterCubit', 'CartCubit'], // Only log these classes
  exclude: ['AnalyticsCubit'], // Exclude these classes
  filter: ({ className, isIsolated }) => !isIsolated, // Custom filter

  // Feature toggles
  logLifecycle: true, // Log create/dispose
  logStateChanges: true, // Log state transitions
  includeCallstack: false, // Include callstack in logs

  // Memory monitoring
  instanceCountWarningThreshold: 50, // Warn when exceeded
  detectRapidLifecycles: true, // Detect create/dispose loops
  rapidLifecycleWindowMs: 1000, // Time window for detection
  rapidLifecycleThreshold: 5, // Cycles to trigger warning

  // State change batching
  debounceStateChanges: true, // Group rapid successive changes
  debounceWindowMs: 100, // Time window for batching

  // Customization
  prefix: '[BlaC]', // Log prefix
  logger: console, // Custom logger
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
[BlaC] Created CounterCubit#abc12345 (isolated)
[BlaC] CounterCubit#abc12345 state: 0 → 1
[BlaC] Disposed CounterCubit#abc12345 (lived 5.2s)
```

**Grouped format:**

```
▼ [BlaC] CounterCubit#abc12345 state changed
    Previous: 0
    Current: 1
```

**Batched state changes (when multiple changes happen rapidly):**

```
[BlaC] CounterCubit#abc12345 state: 0 → 5 (5 changes batched)
```

```
▼ [BlaC] CounterCubit#abc12345 state changed (5 batched)
    Initial: 0
    Final: 5
  ▼ All changes
      1. 0 → 1
      2. 1 → 2
      3. 2 → 3
      4. 3 → 4
      5. 4 → 5
```

**Warnings:**

```
[BlaC] ⚠️ High instance count: FormCubit has 52 instances
[BlaC] ⚠️ Rapid lifecycle: CounterCubit created/disposed 5 times in 1000ms
[BlaC] ⚠️ Unused instance: FormCubit#abc12345 disposed without state changes
```
