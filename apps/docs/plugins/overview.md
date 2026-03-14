# Plugins

BlaC has an official set of plugins for common needs. All plugins implement the `BlacPlugin` interface and are installed via `getPluginManager().install()`.

## Official plugins

| Package | Purpose | Typical environment |
|---------|---------|-------------------|
| [`@blac/logging-plugin`](/plugins/logging) | Console logging, instance monitoring, rapid lifecycle detection | Development |
| [`@blac/devtools-connect`](/plugins/devtools) | Chrome DevTools extension and Redux DevTools integration | Development |
| [`@blac/plugin-persist`](/plugins/persistence) | Persist state to IndexedDB with automatic hydration | All |

## Installing a plugin

```ts
import { getPluginManager } from '@blac/core';

getPluginManager().install(myPlugin, {
  enabled: true,
  environment: 'development', // 'development' | 'production' | 'test' | 'all'
});
```

The `environment` option controls when the plugin is active. Plugins with `environment: 'development'` are skipped in production builds.

## Multiple plugins

Install as many plugins as you need. They all receive the same lifecycle callbacks independently.

```ts
import { getPluginManager } from '@blac/core';
import { LoggingPlugin } from '@blac/logging-plugin';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';

const pm = getPluginManager();

pm.install(new LoggingPlugin({ level: 'info' }), { environment: 'development' });
pm.install(createDevToolsBrowserPlugin(), { environment: 'development' });
pm.install(createIndexedDbPersistPlugin());
```

## Building your own

See [Plugin Authoring](/core/plugins) for how to create custom plugins.
