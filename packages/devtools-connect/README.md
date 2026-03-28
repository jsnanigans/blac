# @blac/devtools-connect

DevTools connection plugin for BlaC. Exposes a `window.__BLAC_DEVTOOLS__` API that the DevTools UI reads from.

**[Documentation](https://blac-docs.pages.dev/plugins/devtools)** · **[npm](https://www.npmjs.com/package/@blac/devtools-connect)**

## Installation

```bash
pnpm add @blac/devtools-connect
```

## Setup

```ts
import { getPluginManager } from '@blac/core';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

getPluginManager().install(
  createDevToolsBrowserPlugin({
    enabled: import.meta.env.DEV,
  }),
);
```

Then add the UI component from [`@blac/devtools-ui`](../devtools-ui/README.md).

## Options

```ts
createDevToolsBrowserPlugin({
  enabled: true, // default: true
  maxInstances: 2000, // max tracked instances (default: 2000)
  maxSnapshots: 20, // state snapshots per instance (default: 20)
});
```

## Global API

The plugin exposes `window.__BLAC_DEVTOOLS__`:

```ts
const api = window.__BLAC_DEVTOOLS__;

api.isEnabled();
api.getInstances();
api.getEventHistory();

const unsubscribe = api.subscribe((event) => {
  console.log(event.type, event.data);
});
```

## Security

Only enable in development — never ship DevTools to production. The plugin includes safe serialization with circular reference handling and depth limits.

## License

MIT
