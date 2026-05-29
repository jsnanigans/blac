# Plugin Authoring

Plugins observe lifecycle events across all state containers. Use them for cross-cutting concerns like logging, debugging, analytics, or persistence.

## The BlacPlugin interface

```ts
import { type BlacPlugin } from '@blac/core';

const myPlugin: BlacPlugin = {
  name: 'my-plugin',
  version: '1.0.0',

  onInstall(context) {
    // called when plugin is installed
  },

  onUninstall() {
    // called when plugin is removed
  },

  onCreated(ctx, instance) {
    // called when any state container is created
  },

  onStateChange(ctx, prev, next, paths) {
    // called once per flush after any state change
    // paths: PathSet | undefined — the set of changed property paths,
    //   or undefined for events not tied to a specific state delta
  },

  onDestroyed(ctx, instance) {
    // called when any state container is disposed
  },

  onHydrationChange(ctx, instance) {
    // called when the hydration status of an instance changes
  },

  onRefAcquired(ctx, instance, refId) {
    // called when a ref is acquired on an instance
  },

  onRefReleased(ctx, instance, refId) {
    // called when a ref is released from an instance
  },

  onDepsChanged(ctx, instance, previousDeps, currentDeps) {
    // called when an instance's merged `deps` view changes
    // (a consumer added/changed/dropped a handle). Fires after the
    // protected `onDepsChanged` hook on the StateContainer itself.
  },
};
```

All lifecycle methods are optional. Implement only what you need.

::: warning Breaking change from v1
Hook names were renamed for clarity and consistency. The `ctx` (context) parameter is now **first** on every hook. Update any existing plugins:

| v1 name               | v2 name         | Notes                        |
| --------------------- | --------------- | ---------------------------- |
| `onInstanceCreated`   | `onCreated`     | `ctx` is now the first param |
| `onInstanceDisposed`  | `onDestroyed`   | `ctx` is now the first param |
| `onStateChanged`      | `onStateChange` | New `paths` 4th param; `ctx` first |
| _(not present)_       | `onHydrationChange` | New in v2               |
:::

## Installing a plugin

```ts
import { getPluginManager } from '@blac/core';

getPluginManager().install(myPlugin, {
  enabled: true,
  environment: 'development', // 'development' | 'production' | 'test' | 'all'
});
```

The `environment` option controls when the plugin is active. Use `'development'` for debug plugins, `'all'` for production plugins like persistence.

## Uninstalling

```ts
getPluginManager().uninstall(myPlugin);
// or by name:
getPluginManager().uninstall('my-plugin');
```

## PluginContext

The `ctx` parameter (always first) provides safe, read-only access to registry data:

| Method                                | Returns                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `getInstanceMetadata(instance)`       | `{ id, className, isDisposed, name, state, createdAt, args, ... }` |
| `getState(instance)`                  | Current state of the instance                                |
| `getHydrationStatus(instance)`        | Current `HydrationStatus` of the instance                    |
| `startHydration(instance)`            | Begin hydration for the instance                             |
| `applyHydratedState(instance, state)` | Apply restored state during hydration                        |
| `finishHydration(instance)`           | Mark hydration as complete                                   |
| `failHydration(instance, error)`      | Mark hydration as failed                                     |
| `waitForHydration(instance)`          | `Promise<void>` that resolves when hydration completes       |
| `queryInstances(Type)`                | All instances of a given class                               |
| `getAllTypes()`                       | All registered state container classes                       |
| `getStats()`                          | `{ registeredTypes, totalInstances, typeBreakdown }`         |
| `getRefIds(instanceId)`               | Array of ref holder IDs for an instance                      |

## PathSet and the path interner

`onStateChange` receives a `paths: PathSet | undefined` as its fourth argument. This is a set of property paths (e.g. `"items"`, `"user.profile.name"`) that changed in the flush.

Each BlaC class has its own **per-class PathInterner** — a compact string interner that deduplicates path strings. Use `interner.lookup(pathId)` to convert a `PathId` back to a human-readable string when building DevTools integrations or structured logs:

```ts
import { type BlacPlugin, type PathSet } from '@blac/core';

const pathLoggingPlugin: BlacPlugin = {
  name: 'path-logger',
  version: '1.0.0',

  onStateChange(ctx, prev, next, paths) {
    if (!paths) return;
    const meta = ctx.getInstanceMetadata(next);
    if (!meta) return;

    for (const pathId of paths) {
      const path = meta.interner.lookup(pathId);
      console.log(`[${meta.className}] changed: ${path}`);
    }
  },
};
```

When `paths` is `undefined`, the event is not associated with a specific set of changes (e.g. initial state on creation).

## Example: analytics plugin

```ts
const analyticsPlugin: BlacPlugin = {
  name: 'analytics',
  version: '1.0.0',

  onStateChange(ctx, _prev, current, paths) {
    const meta = ctx.getInstanceMetadata(current);
    if (!meta) return;

    analytics.track('state_changed', {
      className: meta.className,
      id: meta.id,
      changedPaths: paths ? [...paths].map((id) => meta.interner.lookup(id)) : [],
    });
  },

  onCreated(ctx, instance) {
    const stats = ctx.getStats();
    if (stats.totalInstances > 100) {
      console.warn('High instance count:', stats.totalInstances);
    }
  },
};
```

## `onStateChange` is once-per-flush

`onStateChange` fires **once per microtask flush**, not once per individual `emit`/`patch`/`update` call. If a method calls `patch` three times synchronously, `onStateChange` receives a single call with the final state and the union of all changed paths.

This matches the behavior of `onSystemEvent('stateChanged')` inside state containers. For per-call granularity (rare), use a lower-level subscription.

## System events vs plugins

Use system events (`this.onSystemEvent`) for logic that belongs to a single instance. Use plugins for behavior that applies globally across all state containers.

## Official plugins

- [Logging](/plugins/logging) — Console logging and monitoring
- [DevTools](/plugins/devtools) — Chrome DevTools integration
- [Persistence](/plugins/persistence) — IndexedDB state persistence

See also: [System Events](/core/system-events), [Plugin Overview](/plugins/overview)
