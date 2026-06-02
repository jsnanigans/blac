---
title: DevTools
description: A full DevTools suite — in-app overlay, Chrome DevTools panel, and console API — for inspecting live instances, state diffs, event timelines, and time-travel.
---

BlaC ships with a full DevTools suite: an in-app overlay, a Chrome DevTools panel, and a console API. Together they let you inspect live instances, view state diffs, browse event timelines, and time-travel to previous states.

DevTools is delivered as a [plugin](/plugins/overview): once installed, it observes every state container from the outside, so there is nothing to wire up per bloc. Keep it scoped to `environment: 'development'` — it tracks state snapshots and event history, which you do not want in a production bundle.

## Packages

| Package                  | What it does                                                 |
| ------------------------ | ------------------------------------------------------------ |
| `@blac/devtools-connect` | Core plugin that tracks instances and exposes the global API |
| `@blac/devtools-ui`      | React UI components (floating overlay and panel)             |
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

Drop `<BlacDevtoolsUi />` anywhere in your tree. It renders a draggable floating overlay that you toggle with **Alt+D** (or by dispatching a `blac-devtools-toggle` custom event).

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

The Instances tab lists every active state container with everything you need to identify and triage it at a glance:

- **Class name + instance ID** with a state preview.
- **`args`** that keyed the instance — surfaced inline so two instances of the same class with different `args` are easy to tell apart.
- **Ref holders** (`R:n`) — every active holder of the instance: each `useBloc` mount (which acquires a ref) plus any manual [`acquire()`](/core/instance-management).
- **Hydration badge** — `HYDRATING` while state is being restored by the persistence plugin, or `ERR` if hydration failed.
- **Insight pills** — inline warnings when a threshold trips: large state size (≥ 50 KB) or a high update rate (≥ 30 updates / 10 s).

Click an instance to see its full state tree and a side-by-side diff history.

:::tip[Screenshot pending]
The Instances tab shows every active bloc. Each row displays the class name, a truncated instance ID, the current ref count (`R:2`), and a compact JSON preview of the current state. A yellow insight pill appears on a bloc when its update rate exceeds 30/10 s.
_A human will capture this from the running examples app and drop the file at `apps/docs/public/devtools-instances.png` (then re-add the `<img>`)._
:::

:::note[Reading `R:n`]
`R:n` comes straight from the registry's [ref-counting model](/core/instance-management). Every `useBloc` mount acquires a ref, and every manual `acquire()` adds one; the bloc stays alive while the count is above zero. If an instance lingers after all its components have unmounted, a stray `acquire()` without a matching `release()` (or `keepAlive: true`) is the usual cause.
:::

### View state diffs

When you select an instance, the detail panel shows a side-by-side diff of the previous and current state. Each state change is recorded with a timestamp and the call stack that triggered it.

:::tip[Screenshot pending]
The detail panel shows a side-by-side diff for the selected bloc. The left column (red) is the previous state; the right column (green) is the current state. Changed keys are highlighted, with a timestamp and abbreviated call stack below each diff entry.
_Drop the file at `apps/docs/public/devtools-state-diff.png` (then re-add the `<img>`)._
:::

### Browse the event log

The Logs tab shows a timeline of all lifecycle events:

| Event               | When                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| `instance-created`  | A state container is created                                                      |
| `instance-updated`  | State changes (coalesced per animation frame — one entry per rAF, not per emit)   |
| `instance-disposed` | A state container is disposed                                                     |
| `refs-changed`      | The set of ref holders changes (a `useBloc` mount/unmount or `acquire`/`release`) |
| `deps-changed`      | The merged `deps` view changes — payload carries `previousDeps` and `currentDeps` |

:::note[`instance-updated` batching]
State changes are coalesced once per animation frame: if a bloc emits several times before the next rAF tick, the Logs tab records a single `instance-updated` entry with the final state. This keeps the timeline readable during high-frequency updates. The full snapshot history in the detail panel still captures every intermediate state.
:::

:::tip[Screenshot pending]
The Logs tab lists events with a type badge, a timestamp, and a collapsible payload. The `refs-changed` event shows the previous and current ref count; `instance-updated` shows the coalesced final state for that frame.
_Drop the file at `apps/docs/public/devtools-event-log.png` (then re-add the `<img>`)._
:::

### Time-travel

Click any snapshot in the state history to restore the instance to that point. This calls `emit` on the instance with the stored state, so your components update in real time.

:::caution[Time-travel bypasses your action logic]
Because time-travel calls `emit` directly with a stored snapshot, it skips the methods that normally produce that state. Anything those methods also do — network requests, writes to other blocs, external side effects — does **not** replay. The bloc's in-memory state jumps, but derived or external systems can desync. Treat time-travel as a UI-debugging aid, not a way to re-run application logic.
:::

### Search and filter

Use the search bar to filter instances by class name. Useful when you have dozens of active containers.

## Keyboard shortcut

Press **Alt+D** to toggle the in-app DevTools overlay.

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

The DevTools plugin skips these instances entirely — no tracking overhead. `excludeFromDevTools` is one of the [`blac()` configuration options](/core/configuration); this page shows it in use, but [Configuration](/core/configuration) documents the full option set.

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

## See also

- [Plugin Overview](/plugins/overview) — the plugin catalog and the install API
- [Logging Plugin](/plugins/logging) — passive console/CI logging; complements DevTools
- [Instance Management](/core/instance-management) — the ref-counting model behind `R:n`
- [Configuration](/core/configuration) — `excludeFromDevTools` and the other `blac()` options
