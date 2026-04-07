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

  onInstanceCreated(instance, context) {
    // called when any state container is created
  },

  onStateChanged(instance, previousState, currentState, context) {
    // called on every state change across all containers
  },

  onInstanceDisposed(instance, context) {
    // called when any state container is disposed
  },

  onRefAcquired(instance, refId, context) {
    // called when a ref is acquired on an instance
  },

  onRefReleased(instance, refId, context) {
    // called when a ref is released from an instance
  },
};
```

All lifecycle methods are optional. Implement only what you need.

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

The `context` parameter provides safe, read-only access to registry data:

| Method                                | Returns                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `getInstanceMetadata(instance)`       | `{ id, className, isDisposed, name, state, createdAt, ... }` |
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

## Example: analytics plugin

```ts
const analyticsPlugin: BlacPlugin = {
  name: 'analytics',
  version: '1.0.0',

  onStateChanged(instance, _prev, current, context) {
    const meta = context.getInstanceMetadata(instance);
    if (!meta) return;

    analytics.track('state_changed', {
      className: meta.className,
      id: meta.id,
    });
  },

  onInstanceCreated(instance, context) {
    const stats = context.getStats();
    if (stats.totalInstances > 100) {
      console.warn('High instance count:', stats.totalInstances);
    }
  },
};
```

## System events vs plugins

Use system events (`this.onSystemEvent`) for logic that belongs to a single instance. Use plugins for behavior that applies globally across all state containers.

## Official plugins

- [Logging](/plugins/logging) — Console logging and monitoring
- [DevTools](/plugins/devtools) — Chrome DevTools integration
- [Persistence](/plugins/persistence) — IndexedDB state persistence

See also: [System Events](/core/system-events), [Plugin Overview](/plugins/overview)
