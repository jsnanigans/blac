# @blac/devtools-ui

Reusable DevTools UI components for BlaC state management. Provides in-app debugging tools that can be embedded as floating overlays or Picture-in-Picture windows.

## Installation

```bash
npm install @blac/devtools-ui @blac/devtools-connect @blac/react @blac/core
# or
pnpm add @blac/devtools-ui @blac/devtools-connect @blac/react @blac/core
# or
yarn add @blac/devtools-ui @blac/devtools-connect @blac/react @blac/core
```

## Quick Start

**Step 1:** Register the DevTools plugin:

```typescript
import { getPluginManager } from '@blac/core';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

getPluginManager().register(
  createDevToolsBrowserPlugin({
    enabled: import.meta.env.DEV,
  }),
);
```

**Step 2:** Add the DevTools UI component:

```tsx
import { BlacDevtoolsUi } from '@blac/devtools-ui';

function App() {
  return (
    <>
      {import.meta.env.DEV && <BlacDevtoolsUi />}
      <YourApp />
    </>
  );
}
```

**Step 3:** Toggle with `Alt+D`

## Components

### BlacDevtoolsUi

Auto-initializing DevTools overlay component. Uses Picture-in-Picture API when available (Chrome 116+), falls back to draggable overlay.

```tsx
import { BlacDevtoolsUi } from '@blac/devtools-ui';

// Auto-detect best mode
<BlacDevtoolsUi />

// Force overlay mode (skip PiP)
<BlacDevtoolsUi mode="overlay" />

// Force Picture-in-Picture mode
<BlacDevtoolsUi mode="pip" />
```

### DraggableOverlay

Floating DevTools window that can be dragged and resized.

```tsx
import { DraggableOverlay } from '@blac/devtools-ui';

<DraggableOverlay
  onMount={(instancesBloc) => {
    // Custom initialization logic
  }}
/>;
```

### PictureInPictureDevTools

Opens DevTools in a separate Picture-in-Picture window (Chrome 116+).

```tsx
import { PictureInPictureDevTools, isPiPSupported } from '@blac/devtools-ui';

if (isPiPSupported()) {
  <PictureInPictureDevTools />;
}
```

### DevToolsPanel

Core panel component for custom integrations (Chrome extension, etc.).

```tsx
import { DevToolsPanel } from '@blac/devtools-ui';

<DevToolsPanel
  onMount={(instancesBloc) => {
    // Connect to data source
    return () => {
      // Cleanup
    };
  }}
/>;
```

## Features

- **Instance List** - View all active state containers
- **State Viewer** - Inspect current state as JSON tree
- **State Diff** - See what changed between state updates
- **Event Logs** - Track state changes, creation, and disposal
- **Search & Filter** - Find instances by name or class
- **Keyboard Shortcuts** - Toggle with `Alt+D`, close with `Esc`

## Keyboard Shortcuts

| Shortcut | Action          |
| -------- | --------------- |
| `Alt+D`  | Toggle DevTools |
| `Esc`    | Close DevTools  |

## Custom Events

Toggle DevTools programmatically:

```typescript
window.dispatchEvent(new CustomEvent('blac-devtools-toggle'));
```

Listen for time-travel events:

```typescript
window.addEventListener('blac-devtools-time-travel', (event) => {
  const { targetState, restoredCount } = event.detail;
  console.log(`Restored ${restoredCount} blocs`);
});
```

## Blocs

The DevTools UI uses its own BlaC-based state management:

```typescript
import {
  DevToolsInstancesBloc,
  DevToolsSearchBloc,
  DevToolsDiffBloc,
  DevToolsLayoutBloc,
  DevToolsLogsBloc,
} from '@blac/devtools-ui';
```

## API Reference

### Exports

```typescript
// Main components
export { BlacDevtoolsUi } from '@blac/devtools-ui';
export { DevToolsPanel } from '@blac/devtools-ui';
export { DraggableOverlay, defaultDevToolsMount } from '@blac/devtools-ui';
export { PictureInPictureDevTools, isPiPSupported } from '@blac/devtools-ui';

// Blocs
export {
  DevToolsInstancesBloc,
  DevToolsSearchBloc,
  DevToolsDiffBloc,
  DevToolsLayoutBloc,
  DevToolsLogsBloc,
} from '@blac/devtools-ui';

// Types
export type {
  DevToolsUIProps,
  InstanceData,
  DraggableOverlayProps,
  PictureInPictureDevToolsProps,
  BlacDevtoolsUiProps,
} from '@blac/devtools-ui';
```

## Browser Support

| Browser      | Overlay Mode | Picture-in-Picture Mode |
| ------------ | ------------ | ----------------------- |
| Chrome 116+  | Yes          | Yes                     |
| Chrome < 116 | Yes          | No                      |
| Firefox      | Yes          | No                      |
| Safari       | Yes          | No                      |
| Edge         | Yes          | Yes (Chromium-based)    |

## License

MIT
