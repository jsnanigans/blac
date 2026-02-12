# Plugins

Plugins observe registry lifecycle events and state changes.

```ts
import { getPluginManager, type BlacPlugin } from '@blac/core';

const plugin: BlacPlugin = {
  name: 'logger',
  version: '1.0.0',
  onInstanceCreated(instance) {
    console.log('Created', instance.constructor.name);
  },
  onStateChanged(instance, previousState, currentState, callstack) {
    console.log(previousState, '->', currentState);
    if (callstack) console.log(callstack);
  },
};

getPluginManager().install(plugin, {
  enabled: true,
  environment: 'development',
});
```

## Plugin Context

`PluginContext` provides safe access to instance metadata and registry stats:

- `getInstanceMetadata(instance)`
- `getState(instance)`
- `queryInstances(Type)`
- `getAllTypes()`
- `getStats()`
