# BlaC Plugin System

A plugin API for extending BlaC state management with lifecycle hooks.

**[Full documentation](https://jsnanigans.github.io/blac/core/plugins)**

## Quick Start

```typescript
import { getPluginManager, type BlacPlugin } from '@blac/core';

const myPlugin: BlacPlugin = {
  name: 'my-plugin',
  version: '1.0.0',

  onInstall(context) { },
  onUninstall() { },
  onInstanceCreated(instance, context) { },
  onStateChanged(instance, previousState, currentState, callstack, context) { },
  onInstanceDisposed(instance, context) { },
};

getPluginManager().install(myPlugin, {
  enabled: true,
  environment: 'development',
});
```

## Official Plugins

- [`@blac/logging-plugin`](../../../logging-plugin/) — Console logging and monitoring
- [`@blac/devtools-connect`](../../../devtools-connect/) — Chrome DevTools and Redux DevTools integration
- [`@blac/plugin-persist`](../../../plugin-persist/) — IndexedDB state persistence

See the [Plugin Authoring guide](https://jsnanigans.github.io/blac/core/plugins) for the full BlacPlugin interface, PluginContext API, and examples.
