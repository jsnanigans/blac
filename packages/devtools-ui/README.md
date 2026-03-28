# @blac/devtools-ui

Embeddable DevTools UI for BlaC. Provides in-app state inspection as a draggable overlay or Picture-in-Picture window.

**[Documentation](https://blac-docs.pages.dev/plugins/devtools)** · **[npm](https://www.npmjs.com/package/@blac/devtools-ui)**

## Installation

```bash
pnpm add @blac/devtools-ui @blac/devtools-connect @blac/react @blac/core
```

## Setup

**1. Register the plugin:**

```ts
import { getPluginManager } from '@blac/core';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

getPluginManager().install(
  createDevToolsBrowserPlugin({ enabled: import.meta.env.DEV }),
);
```

**2. Add the UI:**

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

**3. Toggle with `Alt+D`**

## Components

### BlacDevtoolsUi

Auto-initializing wrapper. Uses Picture-in-Picture when available (Chrome 116+), falls back to draggable overlay.

```tsx
<BlacDevtoolsUi />                  // auto-detect
<BlacDevtoolsUi mode="overlay" />   // force overlay
<BlacDevtoolsUi mode="pip" />       // force PiP
```

### DraggableOverlay

Floating, resizable DevTools window.

```tsx
import { DraggableOverlay } from '@blac/devtools-ui';
<DraggableOverlay
  onMount={(instancesBloc) => {
    /* ... */
  }}
/>;
```

### PictureInPictureDevTools

Opens DevTools in a separate PiP window (Chrome 116+).

```tsx
import { PictureInPictureDevTools, isPiPSupported } from '@blac/devtools-ui';
if (isPiPSupported()) {
  <PictureInPictureDevTools />;
}
```

### DevToolsPanel

Core panel for custom integrations (browser extensions, etc.).

```tsx
import { DevToolsPanel } from '@blac/devtools-ui';
<DevToolsPanel
  onMount={(instancesBloc) => {
    /* ... */
  }}
/>;
```

## Features

- Instance list with search & filter
- JSON state viewer
- State diff between updates
- Event log (state changes, creation, disposal)
- Inline state editing
- Computed getter values in inspector

## Keyboard Shortcuts

| Shortcut | Action          |
| -------- | --------------- |
| `Alt+D`  | Toggle DevTools |
| `Esc`    | Close DevTools  |

## Programmatic Control

```ts
window.dispatchEvent(new CustomEvent('blac-devtools-toggle'));
```

## Browser Support

| Browser         | Overlay | Picture-in-Picture |
| --------------- | ------- | ------------------ |
| Chrome 116+     | Yes     | Yes                |
| Chrome < 116    | Yes     | No                 |
| Firefox         | Yes     | No                 |
| Safari          | Yes     | No                 |
| Edge (Chromium) | Yes     | Yes                |

## License

MIT
