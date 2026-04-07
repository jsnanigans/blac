# DevTools

BlaC ships with a full DevTools suite: an in-app overlay, a Chrome DevTools panel, and a console API. Together they let you inspect live instances, view state diffs, browse event timelines, and time-travel to previous states.

## Packages

| Package                  | What it does                                                 |
| ------------------------ | ------------------------------------------------------------ |
| `@blac/devtools-connect` | Core plugin that tracks instances and exposes the global API |
| `@blac/devtools-ui`      | React UI components (overlay, Picture-in-Picture, panel)     |
| BlaC Chrome Extension    | Chrome DevTools panel that connects automatically            |

## Setup

### 1. Install the plugin

```bash
pnpm add @blac/devtools-connect
```

```ts
import { getPluginManager } from '@blac/core';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

getPluginManager().install(createDevToolsBrowserPlugin(), {
  environment: 'development',
});
```

This is the minimum setup. The plugin starts tracking all state containers and exposes `window.__BLAC_DEVTOOLS__` for programmatic access.

### 2. Add the in-app UI (recommended)

```bash
pnpm add @blac/devtools-ui
```

```tsx
import { BlacDevtoolsUi } from '@blac/devtools-ui';

function App() {
  return (
    <>
      <YourApp />
      <BlacDevtoolsUi />
    </>
  );
}
```

Drop `<BlacDevtoolsUi />` anywhere in your tree. It renders a floating overlay that you toggle with **Alt+D** (or by dispatching a `blac-devtools-toggle` custom event).

On Chrome 116+, it automatically uses **Picture-in-Picture** mode — the DevTools open in a separate always-on-top window so they don't cover your app.

### 3. Chrome extension (optional)

Install the BlaC Chrome Extension from the Chrome Web Store (or build from `apps/devtools-extension/`). Once installed, a **BlaC** tab appears in Chrome DevTools alongside Elements, Console, etc.

The extension connects automatically when the browser plugin is active — no extra configuration needed. It stays in sync across page reloads.

## Plugin configuration

```ts
createDevToolsBrowserPlugin({
  enabled: true, // kill switch (default: true)
  maxInstances: 2000, // max tracked instances before FIFO eviction
  maxSnapshots: 20, // state snapshots kept per instance
});
```

## What you can do

### Inspect instances

The Instances tab shows every active state container: class name, instance ID, current state, and creation time. Click an instance to see its full state tree.

### View state diffs

When you select an instance, the detail panel shows a side-by-side diff of the previous and current state. Each state change is recorded with a timestamp and the call stack that triggered it.

### Browse the event log

The Logs tab shows a timeline of all lifecycle events:

| Event               | When                          |
| ------------------- | ----------------------------- |
| `instance-created`  | A state container is created  |
| `instance-updated`  | State changes                 |
| `instance-disposed` | A state container is disposed |

### Time-travel

Click any snapshot in the state history to restore the instance to that point. This calls `emit` on the instance with the stored state, so your components update in real time.

### Search and filter

Use the search bar to filter instances by class name. Useful when you have dozens of active containers.

## Keyboard shortcut

Press **Alt+D** to toggle the in-app DevTools overlay. This works with both the draggable overlay and Picture-in-Picture modes.

## Excluding instances from DevTools

High-frequency or internal state containers can be hidden:

```ts
import { blac, Cubit } from '@blac/core';

@blac({ excludeFromDevTools: true })
class AnimationCubit extends Cubit<{ frame: number }> {
  constructor() {
    super({ frame: 0 });
  }
}
```

The DevTools plugin skips these instances entirely — no tracking overhead.

## Console API

With the plugin installed, `window.__BLAC_DEVTOOLS__` is available in the browser console:

```ts
// List all active instances
__BLAC_DEVTOOLS__.getInstances();

// Full state dump with snapshot history
__BLAC_DEVTOOLS__.getFullState();

// Event timeline
__BLAC_DEVTOOLS__.getEventHistory();

// Subscribe to real-time events
const unsub = __BLAC_DEVTOOLS__.subscribe((event) => {
  console.log(event.type, event.data);
});

// Time-travel an instance to a previous state
__BLAC_DEVTOOLS__.timeTravel(instanceId, previousState);

// Check plugin version
__BLAC_DEVTOOLS__.getVersion();
```

## Programmatic access

You can also interact with the plugin instance directly in your code:

```ts
const devtools = createDevToolsBrowserPlugin();
getPluginManager().install(devtools, { environment: 'development' });

devtools.subscribe((event) => {
  // { type, timestamp, data }
});

devtools.getInstances();
devtools.getFullState();
devtools.getEventHistory();
```

See also: [Plugin Overview](/plugins/overview), [Logging Plugin](/plugins/logging), [Configuration](/core/configuration)
