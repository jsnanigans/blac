# Logging Plugin

The logging plugin provides console output for state changes, instance lifecycle events, and monitoring alerts. Reach for it when you want a passive, scannable record in the console or in CI logs — a running narrative of what your blocs are doing. For interactive, point-and-click inspection (state trees, diffs, time-travel) use [DevTools](/plugins/devtools) instead; the two are complementary and can run side by side. Like all plugins, it observes every instance from outside — see [Plugin Overview](/plugins/overview) for the bigger picture.

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

## What the output looks like

The default `format: 'grouped'` writes collapsible `console.group` entries for every event. Here is representative output for a short session — plugin install, a `CartCubit` state change, and its disposal:

```console
▶ [BlaC] Plugin installed
    Registered types: 1
    Total instances:  0

▶ [BlaC] Created CartCubit#a1b2c3d4
    Class:         CartCubit
    Instance ID:   a1b2c3d4-e5f6-7890-abcd-ef1234567890
    Initial state: { items: [], total: 0 }

▶ [BlaC] CartCubit#a1b2c3d4 state changed
    Previous: { items: [], total: 0 }
    Current:  { items: [{ id: 1, name: "Widget", qty: 2 }], total: 19.98 }

▶ [BlaC] Disposed CartCubit#a1b2c3d4
    Lifespan:      4.2s
    State changes: 1
    Final state:   { items: [{ id: 1, name: "Widget", qty: 2 }], total: 19.98 }
```

Groups are collapsed by default — click the `▶` arrow to expand. Switch to `format: 'simple'` for a flat, line-per-event view:

```console
[BlaC] Plugin installed (1 types, 0 instances)
[BlaC] Created CartCubit#a1b2c3d4
[BlaC] CartCubit#a1b2c3d4 state: {"items":[],"total":0} → {"items":[{"id":1,"name":"W...
[BlaC] Disposed CartCubit#a1b2c3d4 (lived 4.2s)
```

The simple format truncates state JSON at 50 characters, which keeps CI logs scannable.

<figure>
  <img src="/devtools-logging-console.png" alt="Logging plugin: grouped console.group output in Chrome DevTools Console panel" />
</figure>

::: tip Screenshot
The image above shows the Console panel with four collapsed `[BlaC]` groups: plugin install, instance creation, a state change, and disposal. The state change group is expanded to reveal the Previous / Current diff.
_Screenshot pending — drop the file at `apps/docs/public/devtools-logging-console.png`._
:::

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
| `logPaths`         | `boolean`                                     | `false`     | Log the dirtytalk paths that changed            |
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

::: info `filter` ctx is not the plugin `PluginContext`
The `filter` callback receives a small `{ instance, className, instanceId }` object — not the `PluginContext` passed to plugin hooks like `onStateChange`. Don't expect the hydration or query helpers here; this is just enough to decide whether a given instance should be logged.
:::

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

::: tip Logging went quiet?
If state-change logs suddenly stop, you have likely tripped the 1,000/s limiter — usually a sign of an emit storm (e.g. emitting on every animation frame). That same high update rate is what the `instanceCountWarningThreshold` and `detectRapidLifecycles` monitors are designed to surface. Treat these warnings as a pointer toward a [performance](/react/performance) problem rather than a logging quirk; lifecycle and monitoring logs keep flowing regardless of the limiter.
:::

## See also

- [Plugin Overview](/plugins/overview) — the plugin catalog and the install API
- [DevTools](/plugins/devtools) — interactive inspection; pairs well with logging
- [Performance](/react/performance) — diagnosing the emit storms the rate limiter guards against
- [Plugin Authoring](/core/plugins) — the hooks this plugin is built on
