---
title: Plugin Authoring
description: A plugin installs once, globally, and observes lifecycle events across every state container — the escape hatch for cross-cutting concerns like logging, DevTools, persistence, and analytics.
---

Some behavior does not belong to any single bloc — logging every state change, mirroring state into DevTools, persisting to IndexedDB, sending analytics. Wiring that into each bloc by hand would scatter the same concern across your codebase and couple your domain logic to infrastructure.

A **plugin** is the escape hatch: it installs once, globally, and observes lifecycle events across _every_ state container in the registry. Write the cross-cutting concern once; it applies everywhere automatically.

:::note[Plugins vs system events — which do I reach for?]
[System events](/core/system-events) (`this.onSystemEvent(...)`) are for logic that belongs to **one bloc** ("when _this_ cart changes, recompute _this_ total"). Plugins are for behavior that applies **across all blocs** ("log every state change in the app"). If you find yourself adding the same `onSystemEvent` handler to many blocs, that is the signal to lift it into a plugin.
:::

## The BlacPlugin interface

A plugin is a plain object: a `name`, a `version`, and any subset of the optional hooks below. Implement only what you need — every hook is optional.

```ts twoslash
import { type BlacPlugin, type PathSet, ALL_PATHS } from '@blac/core';

const myPlugin: BlacPlugin = {
  name: 'my-plugin',
  version: '1.0.0',

  // Fires once when the plugin is installed.
  // ctx.container is undefined here — onInstall is global, not per-bloc.
  onInstall(ctx) {},

  // Fires once when the plugin is uninstalled. No context.
  onUninstall() {},

  // Fires when any state container is first created and acquired.
  // The new container is ctx.container.
  onCreated(ctx) {},

  // Fires once per microtask flush after any state change.
  // prev/next are the coalesced before/after states; paths is the
  // set of changed property paths (or ALL_PATHS for a full change).
  onStateChange(ctx, prev, next, paths: PathSet) {},

  // Fires when any state container is disposed.
  // The disposed container is ctx.container (isDisposed is already true).
  onDestroyed(ctx) {},

  // Fires on every hydration status transition of any container.
  onHydrationChange(ctx, status, previousStatus) {},
};
```

:::caution[The container is on `ctx`, not a separate parameter]
Every per-container hook receives the focal bloc as `ctx.container`, not as a second argument. There is no `instance` parameter. This is a common mistake when porting from older drafts — `onCreated(ctx, instance)` is wrong; use `ctx.container`.
:::

### Hook signatures (verbatim)

| Hook                | Signature                       | When it fires                                     |
| ------------------- | ------------------------------- | ------------------------------------------------- |
| `onInstall`         | `(ctx)`                         | Once at install. `ctx.container` is `undefined`.  |
| `onUninstall`       | `()`                            | Once at uninstall. No context.                    |
| `onCreated`         | `(ctx)`                         | Synchronously when a container is first acquired. |
| `onStateChange`     | `(ctx, prev, next, paths)`      | Once per microtask flush after a state change.    |
| `onDestroyed`       | `(ctx)`                         | Synchronously after a container is disposed.      |
| `onHydrationChange` | `(ctx, status, previousStatus)` | On each hydration status transition.              |

<details>
<summary>Internal devtools-only hooks</summary>

The interface also declares `onRefAcquired(ctx, refId)`, `onRefReleased(ctx, refId)`, and `onDepsChanged(ctx, previousDeps, currentDeps)`. These are marked `@internal` and exist to support the DevTools connector; they are not part of the stable plugin contract and may change. Avoid them in application plugins.

</details>

:::caution[Breaking change from v1]
Hook names were renamed for clarity and consistency. The `ctx` (context) parameter is now **first** on every hook. Update any existing plugins:

| v1 name              | v2 name             | Notes                              |
| -------------------- | ------------------- | ---------------------------------- |
| `onInstanceCreated`  | `onCreated`         | `ctx` is now the first param       |
| `onInstanceDisposed` | `onDestroyed`       | `ctx` is now the first param       |
| `onStateChanged`     | `onStateChange`     | New `paths` 4th param; `ctx` first |
| _(not present)_      | `onHydrationChange` | New in v2                          |

For the full v1 → v2 migration (including non-plugin changes), see [Migrating from v1](/guide/migration-from-v1).
:::

## Installing a plugin

`getPluginManager()` returns the singleton `PluginManager` bound to the global registry. Call it once, near app startup, to install your plugins.

```ts
import { getPluginManager } from '@blac/core';

getPluginManager().install(myPlugin, {
  enabled: true,
  environment: 'development', // 'development' | 'production' | 'test' | 'all'
});
```

| Config option | Default | Meaning                                                                                                                                              |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`     | `true`  | Set `false` to register the plugin but skip all hook dispatch.                                                                                       |
| `environment` | `'all'` | Active only when `process.env.NODE_ENV` matches (`'development'`, `'production'`, `'test'`) or `'all'`. A mismatch logs a skip and installs nothing. |

The `environment` gate is a runtime check against `NODE_ENV`, not tree-shaking. Use `'development'` for debug-only plugins (logging, DevTools) so they add zero overhead in production; use `'all'` for plugins you genuinely want everywhere, like persistence.

:::caution[Common mistakes]

- **`install` throws if a plugin with the same `name` is already installed.** Names are the unique key; pick a stable, unique `name`.
- **If `onInstall` throws, the plugin is rolled back** (removed) and the error rethrown — a failed install leaves nothing half-registered.
- **Forgetting `environment` means a debug plugin runs in production.** A noisy logging plugin left at the default `'all'` will log in prod. Gate it to `'development'`.
  :::

## Uninstalling

`uninstall` takes the plugin's **name string**, not the plugin object. It throws if no plugin with that name is installed.

```ts
getPluginManager().uninstall('my-plugin');
```

Other `PluginManager` methods: `getPlugin(name)`, `getAllPlugins()`, `hasPlugin(name)`, `clear()` (uninstall all), and `destroy()` (clear plus detach the registry lifecycle hooks).

## PluginContext

The `ctx` parameter (always first) carries the focal container plus safe, read-only access to registry data. A fresh `ctx` is built per dispatch — it is cheap and closes over the registry.

- **`ctx.container`** — the bloc this event is about (`StateContainer | undefined`). It is `undefined` only inside `onInstall`. For per-container hooks (`onCreated`, `onStateChange`, `onDestroyed`, `onHydrationChange`) it is the focal bloc. Use `ctx.container` to read `state`, `interner`, `instanceId`, etc.

The methods below take an `instance` argument so a plugin can also reach blocs other than the focal one (e.g. via `queryInstances`):

| Method                                | Returns                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `getInstanceMetadata(instance)`       | `{ id, className, isDisposed, name, state, createdAt, args, hydrationStatus, ... }` |
| `getState(instance)`                  | Current state of the instance                                                       |
| `getHydrationStatus(instance)`        | Current `HydrationStatus` of the instance                                           |
| `startHydration(instance)`            | Begin hydration for the instance                                                    |
| `applyHydratedState(instance, state)` | Apply restored state during hydration                                               |
| `finishHydration(instance)`           | Mark hydration as complete                                                          |
| `failHydration(instance, error)`      | Mark hydration as failed                                                            |
| `waitForHydration(instance)`          | `Promise<void>` that resolves when hydration completes                              |
| `queryInstances(Type)`                | All instances of a given class                                                      |
| `getAllTypes()`                       | All registered state container classes                                              |
| `getStats()`                          | `{ registeredTypes, totalInstances, typeBreakdown }`                                |
| `getRefIds(instanceId)`               | Array of ref holder IDs for an instance                                             |

The five hydration methods — `startHydration`, `applyHydratedState`, `finishHydration`, `failHydration`, and `waitForHydration` — exist so a plugin can drive the [hydration lifecycle](/core/system-events) from the outside. The [Persistence plugin](/plugins/persistence) is their real-world consumer: it begins hydration, restores saved state, and finishes (or fails) hydration through exactly these methods.

## PathSet and the path interner

:::tip[You probably do not need this]
Most plugins act on the whole `next` state and ignore `paths` entirely. Reach for the interner only when you are building field-level tooling — structured logs or DevTools integrations that report _which_ property changed.
:::

`onStateChange` receives `paths: PathSet` as its fourth argument: a `Set<PathId>` of the property paths that changed in the flush — **or the `ALL_PATHS` sentinel** when the change spans every path (for example a full `emit` replacing the whole state, or a single-consumer container that skips path diffing). It is never `undefined`.

A `PathId` is an integer, not a string. Each BlaC class has its own **per-class `PathInterner`** that maps path strings (`"items"`, `"user.profile.name"`) to those integers. Interning to integers keeps the hot path (diffing and set intersection on every flush) cheap — comparing numbers beats comparing strings. To turn a `PathId` back into a readable string, call `interner.lookup(pathId)` on the **focal container's** interner, reachable via `ctx.container`:

```ts twoslash
import { type BlacPlugin, type PathSet, ALL_PATHS } from '@blac/core';

const pathLoggingPlugin: BlacPlugin = {
  name: 'path-logger',
  version: '1.0.0',

  onStateChange(ctx, prev, next, paths) {
    const container = ctx.container;
    if (!container) return;

    if (paths === ALL_PATHS) {
      console.log(`[${container.name}] changed: (all paths)`);
      return;
    }

    for (const pathId of paths) {
      const path = container.interner.lookup(pathId);
      console.log(`[${container.name}] changed: ${path}`);
    }
  },
};
```

:::caution[Always handle `ALL_PATHS` before iterating]
`paths` is a union of `Set<PathId>` and the `ALL_PATHS` symbol. Iterating the symbol with `for..of` throws. Check `paths === ALL_PATHS` first, every time. The interner lives on the container (`ctx.container.interner`), not on the metadata object returned by `getInstanceMetadata` — that metadata has no `interner` field.
:::

## A complete minimal plugin

Here is an end-to-end plugin you can install as-is. It logs creation and disposal, and reports each state change with its changed paths — a self-contained template you can adapt for analytics, audit logs, or telemetry.

```ts twoslash
import {
  getPluginManager,
  type BlacPlugin,
  type PathSet,
  ALL_PATHS,
} from '@blac/core';

const auditPlugin: BlacPlugin = {
  name: 'audit-log',
  version: '1.0.0',

  onCreated(ctx) {
    const c = ctx.container;
    if (c) console.log(`[audit] created ${c.name} (${c.$blac.id})`);
  },

  onStateChange(ctx, _prev, _next, paths) {
    const c = ctx.container;
    if (!c) return;

    const changed =
      paths === ALL_PATHS
        ? ['(all)']
        : [...paths].map((id) => c.interner.lookup(id));

    console.log(`[audit] ${c.name} changed:`, changed);
  },

  onDestroyed(ctx) {
    const c = ctx.container;
    if (c) console.log(`[audit] disposed ${c.name} (${c.$blac.id})`);
  },
};

// Install once at startup. Gate to development so it adds no prod overhead.
getPluginManager().install(auditPlugin, { environment: 'development' });
```

:::caution[Common mistakes]

- **Mutating state inside `onStateChange`.** Calling `ctx.container.emit(...)` (or `patch`/`update`) from this hook triggers another flush, which fires `onStateChange` again — an infinite loop. Plugins observe; they do not write back.
- **Skipping the `ALL_PATHS` check.** See the warning above — iterating the sentinel throws.
- **Leaving a debug plugin at `environment: 'all'`.** It will run (and log, and cost) in production. Gate noisy plugins to `'development'`.
  :::

<details>
<summary>Performance note: plugins defeat the single-consumer skip</summary>

To deliver `onStateChange` for every flush, the manager subscribes to each container's channel with `ALL_PATHS` interest. That subscription counts as a consumer, which disables the single-consumer fast path in the structural container (where `emit` would otherwise skip path diffing entirely). The trade-off is intentional — DevTools and persistence genuinely need every change — but it is why a plugin you do not need should stay uninstalled or `environment`-gated rather than installed-but-disabled.

</details>

## `onStateChange` is once-per-flush

`onStateChange` fires **once per microtask flush**, not once per individual `emit`/`patch`/`update` call. If a method calls `patch` three times synchronously, `onStateChange` receives a single call with the final state and the union of all changed paths. Two consequences:

- `prev` is snapshotted **once per flush** (the state before the first emit of that flush) and reused for every plugin, so the value a plugin sees is independent of install order.
- For true per-call granularity (rare), subscribe to the container's channel directly instead of using a plugin hook.

This batching mirrors `onSystemEvent('stateChanged')` inside a bloc — the same microtask-coalescing model, seen from the global side rather than the per-instance side. See [System Events](/core/system-events) for the per-instance view and the full rationale for why BlaC batches.

## Built-in plugins

These official plugins are themselves authored against the interface above — read their source as worked examples:

- [Logging](/plugins/logging) — console logging and monitoring
- [DevTools](/plugins/devtools) — Chrome DevTools integration
- [Persistence](/plugins/persistence) — IndexedDB state persistence (the real consumer of the hydration methods on `ctx`)

## See also

- [Plugin Overview](/plugins/overview) — the plugin catalog and where to start
- [System Events](/core/system-events) — per-instance lifecycle hooks and when to use them instead
- [Persistence](/plugins/persistence) — a complete plugin that drives the hydration API
- [Glossary](/guide/glossary) — definitions for plugin, hydration, interner, and `PathSet`
