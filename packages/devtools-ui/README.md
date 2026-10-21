# @blac/devtools-ui

DevTools UI for BlaC: a `Panel` that renders any `DevToolsClient`, and an in-app overlay (`BlacDevtoolsUi`) that hosts it.

## Installation

```bash
pnpm add @blac/devtools-ui @blac/devtools-connect
```

## In-app overlay

Install the agent (see `@blac/devtools-connect`), then render the overlay once:

```tsx
import { BlacDevtoolsUi } from '@blac/devtools-ui';

<BlacDevtoolsUi />;
```

Toggle with `Alt+D` or `window.dispatchEvent(new CustomEvent('blac-devtools-toggle'))`. The overlay is a draggable, resizable floating window (position and size persist). Where the browser supports the Document Picture-in-Picture API (Chromium), a pop-out button moves it into a PiP window; closing that window returns it to the page. The overlay connects only while open and renders inside a Shadow DOM root.

## Custom host

```tsx
import { Panel } from '@blac/devtools-ui';

<Panel client={client} theme="auto" />;
```

`client` is a `DevToolsClient` from `@blac/devtools-connect/client`.
