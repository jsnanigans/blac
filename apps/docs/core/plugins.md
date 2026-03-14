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

  onStateChanged(instance, previousState, currentState, callstack, context) {
    // called on every state change across all containers
  },

  onInstanceDisposed(instance, context) {
    // called when any state container is disposed
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

| Method | Returns |
|--------|---------|
| `getInstanceMetadata(instance)` | `{ className, instanceId, isIsolated, refCount }` |
| `getState(instance)` | Current state of the instance |
| `queryInstances(Type)` | All instances of a given class |
| `getAllTypes()` | All registered state container classes |
| `getStats()` | `{ totalInstances, totalRefCount, types }` |

## Example: analytics plugin

```ts
const analyticsPlugin: BlacPlugin = {
  name: 'analytics',
  version: '1.0.0',

  onStateChanged(instance, _prev, current, _callstack, context) {
    const meta = context.getInstanceMetadata(instance);
    if (!meta) return;

    analytics.track('state_changed', {
      className: meta.className,
      instanceId: meta.instanceId,
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

See also: [System Events](/core/system-events), [API Reference](/api/core/plugins)
