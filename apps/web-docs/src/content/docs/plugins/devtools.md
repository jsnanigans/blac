---
title: DevTools
description: Inspect live BlaC instances, their state and change history — in an in-app overlay or the Chrome DevTools panel.
---

BlaC DevTools lets you inspect live instances, browse each instance's state and change history, diff any change against the one before it, and follow a global log of created, changed and disposed instances. The same panel runs in an in-app overlay and in a Chrome DevTools tab.

DevTools is delivered as a [plugin](/plugins/overview): once installed it observes every state container from the outside, so there is nothing to wire up per bloc. Keep it scoped to `environment: 'development'`.

## Packages

| Package                  | What it does                                                           |
| ------------------------ | ---------------------------------------------------------------------- |
| `@blac/devtools-connect` | The agent plugin that records instances, and the client that reads it  |
| `@blac/devtools-ui`      | The panel UI and the in-app overlay                                    |
| BlaC Chrome Extension    | The same panel as a Chrome DevTools tab                                |

## Setup

### 1. Install the agent

```bash
pnpm add @blac/devtools-connect
```

```ts
import { getPluginManager } from '@blac/core/plugins';
import { createDevToolsAgent } from '@blac/devtools-connect';

getPluginManager().install(createDevToolsAgent(), {
  environment: 'development',
});
```

This is the minimum setup. The agent records recent history for every container but sends nothing — and serializes nothing — until a DevTools client attaches.

### 2. Add the in-app overlay (optional)

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

`<BlacDevtoolsUi />` renders a panel docked to the bottom of the page, toggled with **Alt+D** (or by dispatching a `blac-devtools-toggle` event on `window`). Drag its top edge to resize. The overlay connects only while it is open, and it renders in a Shadow DOM so it cannot clash with your app's CSS.

### 3. Chrome extension (optional)

Install the BlaC Chrome Extension from the Chrome Web Store (or build `apps/devtools-extension/`). A **BlaC** tab appears in Chrome DevTools. It attaches to the inspected tab's top frame, follows reloads, and reconnects if the extension's service worker restarts.

## Agent options

```ts
createDevToolsAgent({
  historySize: 50, // recorded changes kept per instance
  maxDisposed: 100, // disposed instances kept listed
});
```

## What you can do

### Inspect instances

The **Instances** view lists every container grouped by class, with a text filter, a toggle for disposed instances, and a change counter that flashes when an instance updates. Select one to open the inspector:

- the `args` that keyed the instance, so two instances of the same class are easy to tell apart;
- its current state as a collapsible tree (Maps, Sets, Dates, Errors and other non-JSON values are tagged);
- its history, newest first, with the paths each change touched.

State is sent only for the selected instance; everything else sends just metadata, which keeps large apps responsive.

### Diff a change

Select a history entry to see its state and a **Changes** list — every path that was added, removed or changed compared with the previous entry, with before and after values.

:::note[Changed paths]
The path list on a history entry is the finest the core reports. While a path-scoped consumer (such as a `useBloc` mount) is subscribed it is precise; otherwise the agent falls back to the top-level keys that differ. The **Changes** diff is always computed from the two states.
:::

:::note[Granularity]
One record is kept per plugin flush — changes made in the same microtask are coalesced by the core. Records are sent to the panel at most once per frame per instance, so an instance that updates many times per frame appears as one entry with the union of its changed paths.
:::

### Follow the log

The **Log** view is a bounded, global stream of created, changed and disposed events. Click an entry to jump to that instance and history entry.

## Keyboard shortcut

Press **Alt+D** to toggle the in-app overlay.

## Excluding instances from DevTools

High-frequency or internal state containers can be hidden:

```ts twoslash
import { blac, Cubit } from '@blac/core';

@blac({ excludeFromDevTools: true })
class AnimationCubit extends Cubit<{ frame: number }> {
  constructor() {
    super({ frame: 0 });
  }
}
```

The agent skips these instances entirely. `excludeFromDevTools` is one of the [`blac()` configuration options](/core/configuration).

:::tip[Readable names in production builds]
Instances are listed by class name, which a minifier may mangle. Give a class a stable name with `static blacName = 'Counter'` and DevTools will use it.
:::

## Writing your own host

The panel is a plain React component driven by a `DevToolsClient`; a host only supplies a transport.

```tsx
import { DevToolsClient } from '@blac/devtools-connect/client';
import { Panel } from '@blac/devtools-ui';

const client = new DevToolsClient(transport); // any ClientTransport
render(<Panel client={client} />);
```

The wire protocol (`@blac/devtools-connect/protocol`) is versioned: every agent message carries a `session` and a `seq`, a client that sees a gap asks for a `snapshot`, and a protocol mismatch is reported in the panel instead of misbehaving.

## See also

- [Plugin Overview](/plugins/overview) — the plugin catalog and the install API
- [Logging Plugin](/plugins/logging) — passive console/CI logging; complements DevTools
- [Configuration](/core/configuration) — `excludeFromDevTools` and the other `blac()` options
