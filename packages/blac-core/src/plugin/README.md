# BlaC Plugin System

A plugin API for extending BlaC state management with lifecycle hooks.

**[Full documentation](https://jsnanigans.github.io/blac/core/plugins)**

## Quick Start

```typescript
import { getPluginManager, type BlacPlugin } from '@blac/core';
import type { PathSet } from '@dirtytalk/structural';

const myPlugin: BlacPlugin = {
  name: 'my-plugin',
  version: '1.0.0',

  onInstall(ctx) {},
  onUninstall() {},

  // ctx.container is the focal bloc for the event.
  onCreated(ctx) {},
  onDestroyed(ctx) {},

  // Fires once per microtask flush. `paths` lists the changed paths in
  // this flush; `prev` is the pre-flush state, `next` is the post-flush
  // state. Multiple plugins see identical (prev, next, paths) per flush
  // — `prev` is snapshotted once.
  onStateChange(ctx, prev, next, paths: PathSet) {},

  onHydrationChange(ctx, status, previousStatus) {},
};

getPluginManager().install(myPlugin, {
  enabled: true,
  environment: 'development',
});
```

## Event payload contract (C2 / Decision 6)

| Hook                | `ctx.container`     | Extra arguments                                              |
| ------------------- | ------------------- | ------------------------------------------------------------ |
| `onInstall`         | `undefined`         | —                                                            |
| `onCreated`         | the new container   | —                                                            |
| `onStateChange`     | the focal container | `prev: S`, `next: S`, `paths: PathSet`                       |
| `onDestroyed`       | disposed container  | —                                                            |
| `onHydrationChange` | the focal container | `status: HydrationStatus`, `previousStatus: HydrationStatus` |

`paths` is the `PathSet` of changed paths for the flush. It may equal
`ALL_PATHS` when the channel marks every path (e.g. coarse `emit` from
legacy callers). Decode interned ids back to dotted strings via
`ctx.container.interner.lookup(id)`.

```typescript
import {
  ALL_PATHS,
  type PathSet,
  type PathInterner,
} from '@dirtytalk/structural';

function decodePaths(paths: PathSet, interner: PathInterner): string[] {
  if (paths === ALL_PATHS) return ['<all>'];
  return Array.from(paths).map((id) => interner.lookup(id));
}
```

## Dispatch model

- **Lifecycle events** (`onCreated`/`onDestroyed`/`onRefAcquired`/`onRefReleased`/`onDepsChanged`) are fired synchronously from the registry.
- **`onStateChange`** is fired from each container's `DirtyChannel` flush callback — once per microtask flush, regardless of how many `emit`/`patch` calls collapsed into it. `prev` is the state at the previous flush (or container creation); `next` is the post-flush state.

## Perf notes

- The plugin manager subscribes to every container with `ALL_PATHS` interest. This defeats the single-consumer-skip optimization in `StructuralContainer` for any container that has plugins installed. Devtools/persist plugins genuinely want every change; for fine-grained subscribers prefer `container.channel.subscribe(interest, cb)` directly.
- Stateful plugins (logging) can opt into path-level signals by decoding `paths` via the interner.

## Migration from pre-C2

| Old hook name (pre-C2) | New hook name (C2)        | Arg shape change                                           |
| ---------------------- | ------------------------- | ---------------------------------------------------------- |
| `onInstanceCreated`    | `onCreated`               | `(instance, ctx)` → `(ctx)` (instance via `ctx.container`) |
| `onInstanceDisposed`   | `onDestroyed`             | `(instance, ctx)` → `(ctx)`                                |
| `onStateChanged`       | `onStateChange`           | `(instance, prev, next, ctx)` → `(ctx, prev, next, paths)` |
| —                      | `onHydrationChange` (new) | —                                                          |

## Official Plugins

- [`@blac/logging-plugin`](../../../logging-plugin/) — Console logging and monitoring
- [`@blac/devtools-connect`](../../../devtools-connect/) — Chrome DevTools and Redux DevTools integration
- [`@blac/plugin-persist`](../../../plugin-persist/) — IndexedDB state persistence

See the [Plugin Authoring guide](https://jsnanigans.github.io/blac/core/plugins) for the full BlacPlugin interface, PluginContext API, and examples.
