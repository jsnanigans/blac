# @blac/devtools-connect

DevTools connection plugin for [BlaC](https://github.com/jsnanigans/blac) state management library.

**[Full documentation](https://jsnanigans.github.io/blac/plugins/devtools)**

## Installation

```bash
npm install @blac/devtools-connect
# or
pnpm add @blac/devtools-connect
# or
yarn add @blac/devtools-connect
```

## Quick Start

Add the plugin to your app:

```typescript
import { getPluginManager } from '@blac/core';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

getPluginManager().install(
  createDevToolsBrowserPlugin({
    enabled: import.meta.env.DEV,
  }),
);
```

Then add the UI component (see `@blac/devtools-ui` package).

## Configuration

```typescript
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

createDevToolsBrowserPlugin({
  // Enable/disable the plugin (default: true)
  enabled: import.meta.env.DEV,

  // Maximum instances to track (default: 2000)
  maxInstances: 2000,

  // Maximum state snapshots per instance (default: 20)
  maxSnapshots: 20,
});
```

This plugin exposes a global `window.__BLAC_DEVTOOLS__` API for the DevTools UI.

## API

The plugin exposes a global API at `window.__BLAC_DEVTOOLS__`:

```typescript
const api = window.__BLAC_DEVTOOLS__;

// Check if enabled
api.isEnabled();

// Get all current instances
api.getInstances();

// Get event history
api.getEventHistory();

// Subscribe to events
const unsubscribe = api.subscribe((event) => {
  console.log(event.type, event.data);
});

// Cleanup
unsubscribe();
```

## Security

- ✅ Safe serialization with circular reference handling
- ✅ Depth limits to prevent infinite recursion
- ⚠️ **Only enable in development** - Never ship DevTools to production

## License

MIT
