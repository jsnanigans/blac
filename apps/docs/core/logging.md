# Logging

`@blac/core` does not ship built-in logging utilities. If you need logging, implement a plugin using the core plugin system.

```ts
import { getPluginManager, type BlacPlugin } from '@blac/core';

const loggingPlugin: BlacPlugin = {
  name: 'logging',
  version: '1.0.0',
  onStateChanged(instance, prev, next) {
    console.log(instance.constructor.name, prev, '->', next);
  },
};

getPluginManager().install(loggingPlugin, { environment: 'development' });
```
