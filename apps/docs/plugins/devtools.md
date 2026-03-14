# DevTools Plugin

The DevTools plugin provides real-time inspection of state container instances, state history, and event timelines.

## Installation

```bash
pnpm add @blac/devtools-connect
```

## Quick setup

```ts
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';
import { getPluginManager } from '@blac/core';

getPluginManager().install(
  createDevToolsBrowserPlugin(),
  { environment: 'development' },
);
```

## Configuration

```ts
createDevToolsBrowserPlugin({
  enabled: true,        // default: true
  maxInstances: 2000,   // max tracked instances (default: 2000)
  maxSnapshots: 20,     // state snapshots per instance (default: 20)
})
```

## What you get

Once installed, the plugin:

- Tracks all state container instances and their current state
- Stores a history of state snapshots (last N per instance) with timestamps and callstacks
- Records lifecycle events (created, updated, disposed)
- Exposes a global API at `window.__BLAC_DEVTOOLS__`

### Browser console access

```ts
// List all active instances
window.__BLAC_DEVTOOLS__.getInstances();

// Get full state with history
window.__BLAC_DEVTOOLS__.getFullState();

// Get event timeline
window.__BLAC_DEVTOOLS__.getEventHistory();

// Subscribe to real-time events
const unsub = window.__BLAC_DEVTOOLS__.subscribe((event) => {
  console.log(event.type, event.data);
});
```

### Event types

| Type | When |
|------|------|
| `init` | Plugin installed |
| `instance-created` | State container created |
| `instance-updated` | State changed |
| `instance-disposed` | State container disposed |

## BlaC Chrome Extension

The BlaC DevTools Chrome extension (in `apps/devtools-extension/`) provides a dedicated panel in Chrome DevTools for inspecting BlaC state. It connects automatically when the browser plugin is installed.

## Redux DevTools integration

As an alternative, connect to the Redux DevTools browser extension for time-travel debugging:

```ts
import { ReduxDevToolsAdapter } from '@blac/devtools-connect';
```

This provides compatibility with the widely-available Redux DevTools extension without needing the BlaC-specific extension.

## Excluding instances

High-frequency or internal state containers can be excluded from DevTools:

```ts
import { blac } from '@blac/core';

@blac({ excludeFromDevTools: true })
class AnimationCubit extends Cubit<AnimState> { ... }
```

## Programmatic access

Beyond the global API, you can subscribe directly from the plugin instance:

```ts
const devtools = createDevToolsBrowserPlugin();
getPluginManager().install(devtools);

devtools.subscribe((event) => {
  // { type, timestamp, data }
});

devtools.getInstances();    // current instance metadata
devtools.getFullState();    // all instances with snapshot history
devtools.getEventHistory(); // event timeline
devtools.getVersion();      // plugin version string
```
