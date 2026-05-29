# Plugins

A plugin is a single object that taps into the registry's lifecycle — every instance created, every state change, every disposal flows through it. Where [system events](/core/system-events) let one bloc react to its _own_ lifecycle from the inside, a plugin observes _all_ instances from the outside. That makes plugins the right tool for cross-cutting concerns: logging, inspection, persistence — anything you want to apply uniformly without editing each bloc.

BlaC has an official set of plugins for these common needs. All plugins implement the `BlacPlugin` interface and are installed once, at startup, via `getPluginManager().install()`.

## Official plugins

| Package                                                                  | Purpose                                                         | Typical environment |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------- |
| [`@blac/logging-plugin`](/plugins/logging)                               | Console logging, instance monitoring, rapid lifecycle detection | Development         |
| [`@blac/devtools-connect`](/plugins/devtools)                            | Core plugin for instance tracking and state inspection          | Development         |
| [`@blac/devtools-ui`](/plugins/devtools#2-add-the-in-app-ui-recommended) | In-app draggable overlay and panel UI components                | Development         |
| [`@blac/plugin-persist`](/plugins/persistence)                           | Persist state to IndexedDB with automatic hydration             | All                 |

## Installing a plugin

```ts
import { getPluginManager } from '@blac/core';

getPluginManager().install(myPlugin, {
  enabled: true,
  environment: 'development', // 'development' | 'production' | 'test' | 'all'
});
```

The `environment` option controls when the plugin is active. The check is a **runtime comparison** against `process.env.NODE_ENV` (which falls back to `'development'`) performed inside `install()`: if the environments don't match, the plugin is skipped with a log message and never wired up. So `environment: 'development'` means the plugin does nothing in a production build — but the import still ships unless your bundler tree-shakes it. To keep dev-only plugin code out of the bundle entirely, guard the `install()` call behind your own `import.meta.env.DEV` (or equivalent) check.

::: info Install once, at startup
Install plugins before any blocs are acquired so the first `onCreated` hooks fire. `install()` throws if a plugin with the same `name` is already installed; calling it twice is a mistake, not an upsert.
:::

## Multiple plugins

Install as many plugins as you need. They all receive the same lifecycle callbacks independently.

```ts
import { getPluginManager } from '@blac/core';
import { LoggingPlugin } from '@blac/logging-plugin';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';

const pm = getPluginManager();

pm.install(new LoggingPlugin({ level: 'info' }), {
  environment: 'development',
});
pm.install(createDevToolsBrowserPlugin(), { environment: 'development' });
pm.install(createIndexedDbPersistPlugin());
```

## Building your own

See [Plugin Authoring](/core/plugins) for the full `BlacPlugin` interface, the hook firing model, and the `PluginContext` API.

## See also

- [Plugin Authoring](/core/plugins) — the `BlacPlugin` interface and how to write your own
- [System Events](/core/system-events) — per-instance lifecycle hooks, and when to use them instead of a plugin
- [Logging Plugin](/plugins/logging) · [DevTools](/plugins/devtools) · [Persistence](/plugins/persistence) — the official plugins in detail
- [Glossary](/guide/glossary) — definitions for plugin, hydration, and registry
