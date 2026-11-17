---
title: DevTools
description: Inspect live BlaC instances, their state and change history — in an in-app overlay or the Chrome DevTools panel.
---

BlaC DevTools lets you inspect live instances, browse each instance's state and change history, diff any change against the one before it, and follow a global log of created, changed and disposed instances. The same panel runs in an in-app overlay and in a Chrome DevTools tab.

DevTools is delivered as a [plugin](/docs/plugins/overview): once installed it observes every state container from the outside, so there is nothing to wire up per bloc. Keep it scoped to `environment: 'development'`.

## Packages

| Package                  | What it does                                                          |
| ------------------------ | --------------------------------------------------------------------- |
| `@blac/devtools-connect` | The agent plugin that records instances, and the client that reads it |
| `@blac/devtools-ui`      | The panel UI and the in-app overlay                                   |
| BlaC Chrome Extension    | The same panel as a Chrome DevTools tab                               |

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

`<BlacDevtoolsUi />` renders a floating window, toggled with **Alt+D** (or by dispatching a `blac-devtools-toggle` event on `window`). Drag its header to move it and its corner to resize it; position and size persist. In Chromium, the pop-out button moves it into a Picture-in-Picture window, and closing that window returns it to the page. The overlay connects only while it is open, picks up an agent installed after it opened, and renders in a Shadow DOM so it cannot clash with your app's CSS. It renders nothing when `process.env.NODE_ENV` is `'production'`.

### Keep DevTools out of production bundles

`environment: 'development'` and the overlay's production check keep DevTools inert in production, but statically imported code still ships. Import both packages only in development so the bundler drops them:

```tsx
import { lazy, Suspense } from 'react';
import { getPluginManager } from '@blac/core/plugins';

if (import.meta.env.DEV) {
  void import('@blac/devtools-connect').then(({ createDevToolsAgent }) =>
    getPluginManager().install(createDevToolsAgent()),
  );
}

const DevTools = import.meta.env.DEV
  ? lazy(() =>
      import('@blac/devtools-ui').then((m) => ({ default: m.BlacDevtoolsUi })),
    )
  : () => null;

function App() {
  return (
    <>
      <YourApp />
      <Suspense>
        <DevTools />
      </Suspense>
    </>
  );
}
```

Instances created before the agent installs are picked up when it does, but their earlier history is not.

### 3. Chrome extension (optional)

Install the BlaC Chrome Extension from the Chrome Web Store (or build `apps/devtools-extension/`). A **BlaC** tab appears in Chrome DevTools. It attaches to the inspected tab's top frame, follows reloads (keeping the selected instance), and reconnects if the extension's service worker restarts.

## Agent options

```ts
createDevToolsAgent({
  historySize: 50, // recorded changes kept per live instance
});
```

With no client attached the agent serializes and sends nothing, but it does keep references to each live instance's last `historySize` states. Lower `historySize` if your states are large and change wholesale.

## What you can do

### Inspect instances

The **Instances** view lists every container one line per instance (`ClassName · key · version · last change`), sorted by class, with a text filter. Each class gets a colored monogram, kept the same across sessions. A class with several instances becomes a collapsible group, and instances that share a key (duplicates or `isolated` mounts) carry a `#n` badge. Only live instances are listed: a disposed one disappears at once, and all of them go when the page reloads (the log is cleared when the new page connects). Large classes show 200 rows at a time. While the pointer is over the list, rows aren't added or removed under it; a **Show updates** button applies what arrived. Select one to open the inspector (if a selected keyed instance is disposed and re-created, the selection follows the new one; otherwise the inspector empties). Its header shows the `args` that keyed the instance and a button to copy the state, with three views:

- **State**: the current state as a collapsible tree (Maps, Sets, Dates, Errors and other non-JSON values are tagged), with the paths the last change touched marked;
- **Changes**: the diff against the previous version;
- **History**: recorded versions, newest first, with the paths each change touched.

State is sent only for the selected instance; everything else sends just metadata, which keeps large apps responsive.

### Diff a change

Select a history entry to hold the inspector at that version (the instance list stays live); **State** and **Changes** then show that version, and **Changes** lists every path that was added, removed or changed compared with the previous entry, with before and after values. **Back to latest** follows the live state again.

:::note[Changed paths]
The path list on a history entry is the finest the core reports. While a path-scoped consumer (such as a `useBloc` mount) is subscribed it is precise; otherwise the agent falls back to the top-level keys that differ. The **Changes** diff is always computed from the two states.
:::

:::note[Granularity]
One record is kept per plugin flush — changes made in the same microtask are coalesced by the core. The inspector's history shows every record; the instance list and the **Log** are updated at most once per frame per instance, so an instance that updates many times per frame appears there as one entry with the union of its changed paths.
:::

### Follow the log

The **Log** view is a bounded, global stream of created, changed and disposed events, newest first, starting with the instances that existed at connect. Back-to-back changes of one instance less than a second apart fold into one row. Filter by text or by kind (lifecycle or changes), and click an entry to jump to that instance and version.

## Keyboard shortcuts

| Key                                                      | Action                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| <kbd>Alt</kbd>+<kbd>D</kbd>                              | Toggle the in-app overlay                                       |
| <kbd>/</kbd>                                             | Focus the filter                                                |
| <kbd>j</kbd> / <kbd>k</kbd>, <kbd>↓</kbd> / <kbd>↑</kbd> | Next / previous row                                             |
| <kbd>1</kbd> / <kbd>2</kbd>                              | Instances / Log                                                 |
| <kbd>s</kbd> / <kbd>c</kbd> / <kbd>h</kbd>               | State / Changes / History                                       |
| <kbd>[</kbd> / <kbd>]</kbd>                              | Previous / next version                                         |
| <kbd>l</kbd>                                             | Back to latest                                                  |
| <kbd>Esc</kbd>                                           | Leave the filter, then back to latest, then clear the selection |

All but <kbd>Alt</kbd>+<kbd>D</kbd> work while focus is inside the devtools.

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

The agent skips these instances entirely. `excludeFromDevTools` is one of the [`blac()` configuration options](/docs/core/configuration).

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

- [Plugin Overview](/docs/plugins/overview) — the plugin catalog and the install API
- [Logging Plugin](/docs/plugins/logging) — passive console/CI logging; complements DevTools
- [Configuration](/docs/core/configuration) — `excludeFromDevTools` and the other `blac()` options
