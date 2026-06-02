# C2 — Update plugin system to carry `PathSet` payloads

**Phase:** C (parallel after C0; safe alongside C1, C3, C4)
**Model:** Opus 4.7
**Effort:** high (event payload contract change; ripples to F0/F1/F2/F3)
**Estimated touch:** 3-4 files

---

## Goal

The plugin system (`BlacPlugin`, `PluginManager`, `InstanceMetadata`) is the public API plugins use to observe container lifecycle and state changes. Today plugins receive `(prev, next)` state pairs. After C0, the channel emits a `PathSet` per flush — **plugins should receive that too**.

Update the plugin event contract per Decision 6:

```ts
onStateChange(ctx, prev, next, paths: PathSet | undefined): void
```

`paths` is `undefined` for non-state events (e.g. `onCreated`, `onDestroyed`). This is breaking for plugin authors but aligned with the new model and unlocks free path-level signals for devtools / persist.

---

## Inputs — read these first

1. `packages/blac-core/src/plugin/BlacPlugin.ts` — current plugin interface.
2. `packages/blac-core/src/plugin/PluginManager.ts` — dispatch logic.
3. `packages/blac-core/src/plugin/README.md` — author-facing docs.
4. `packages/blac-core/src/core/StateContainerRegistry.ts` — `getPluginManager` exposure.
5. `packages/blac-core/src/core/StateContainer.ts` (after C0) — how `stateChanged` flush is fired; you'll hook plugin dispatch into the same flush.
6. `plans/blac-core-migration/_audit.md` — plugin consumers (logging, persist, devtools-connect).
7. `dirtytalk/03-blac.md` § "Plugin events" if it exists; else infer from the structural channel surface.
8. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

### New `BlacPlugin` interface

```ts
import type { PathSet } from '@dirtytalk/structural';

export interface BlacPlugin {
  name: string;

  // Lifecycle (paths: undefined — not tied to a state change)
  onCreated?(ctx: PluginContext): void;
  onDestroyed?(ctx: PluginContext): void;

  // State (paths: PathSet — what changed in this flush)
  onStateChange?(
    ctx: PluginContext,
    prev: unknown,
    next: unknown,
    paths: PathSet,
  ): void;

  // Hydration unchanged
  onHydrationChange?(
    ctx: PluginContext,
    status: HydrationStatus,
    prev: HydrationStatus,
  ): void;
}
```

### `PluginManager` dispatch

For each container, subscribe **once** at create-time to `container.subscribe(ALL_PATHS, ...)`. On every flush, call each registered plugin's `onStateChange(ctx, prev, next, paths)`.

Wire the `prev`/`next`/`paths` capture inside the subscription closure. Structural's channel callback signature includes the `PathSet` of the flush — pass it through.

Lifecycle dispatch happens via the registry's existing `'created'`/`'destroyed'` events.

### Migration helper

For plugins authored against the old `(prev, next)` signature, **don't** add a compat shim — the audit (A2) shows all plugin authors are in-tree and updated by F0/F1/F2/F3.

If the audit shows out-of-tree plugins exist (it shouldn't, but if so), add this conditional helper:

```ts
function callOnStateChange(plugin: BlacPlugin, ctx, prev, next, paths) {
  if (!plugin.onStateChange) return;
  if (plugin.onStateChange.length >= 4) {
    plugin.onStateChange(ctx, prev, next, paths);
  } else {
    (plugin.onStateChange as any)(ctx, prev, next); // legacy
  }
}
```

**Default: skip the shim.** Document expectation that all plugins update.

### `PluginContext`

Add `paths: PathSet` to it? **No.** Keep `PluginContext` invariant per-container — it identifies the bloc, not the event. Per-event data goes through method arguments.

If `PluginContext` exposed `state` directly today, keep it. Plugins reading `ctx.state` should always see the post-emit value.

---

## Owned files (write set)

```
packages/blac-core/src/plugin/BlacPlugin.ts
packages/blac-core/src/plugin/PluginManager.ts
packages/blac-core/src/plugin/README.md            (update prose to reflect new payload)
packages/blac-core/src/plugin/PluginManager.test.ts
packages/blac-core/src/plugin/PluginManager.edge-cases.test.ts
```

**Do not touch:** `core/StateContainer.ts` (C0), registry (C1), watch (C3), decorators (C4), `src/index.ts` (C0 owns barrel).

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - C0 has committed. `StateContainer` extends `StructuralContainer`.
   - `getPluginManager` is still exported from `core/StateContainerRegistry.ts` (C1 keeps it).

2. **Implement.**
   - Update `BlacPlugin` interface — add `paths: PathSet` to `onStateChange`.
   - Update `PluginManager.dispatch` (or whatever the dispatch method is) to wire through the structural channel.
   - Replace any direct `instance.subscribe(listener)` with `instance.subscribe(ALL_PATHS, (paths, _prev, _next) => ...)` once C0's container exposes prev/next in the callback.
     - **If `super.subscribe` doesn't deliver prev/next**, capture them in the manager itself by stashing the previous state per container on each flush.
   - Update test expectations to assert `paths` is passed.

3. **Verify.**
   - `vp run typecheck` from `packages/blac-core/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test src/plugin/` — green.
   - `vp run test src/core/__tests__/StateContainer.subscriptions.test.ts` if it tests plugin dispatch — green.

5. **Commit.**

   ```
   feat(blac-core)!: pass PathSet to plugin onStateChange
   ```

   `!` marks breaking. Body:

   ```
   Per dirtytalk/03-blac.md, plugins now receive the changed PathSet on
   each flush. Lifecycle events (onCreated/onDestroyed) unchanged.
   Plugin authors update onStateChange signature from (ctx, prev, next)
   to (ctx, prev, next, paths). In-tree plugins updated in Phase F.
   ```

---

## Acceptance criteria

- [ ] `BlacPlugin.onStateChange` signature includes `paths: PathSet`.
- [ ] `PluginManager` dispatches `paths` on every flush.
- [ ] No in-tree plugin breaks at build (F-phase fixes the consumers; but `vp run typecheck` here only covers blac-core itself).
- [ ] Lifecycle events still fire correctly.
- [ ] Plugin tests pass.

---

## Pitfalls

- **`prev`/`next` capture.** Structural's `DirtyChannel` callback gives you `(paths)`. To deliver `(prev, next, paths)`, you must either (a) snapshot `container.state` before the emit and after the flush, or (b) extend the channel callback shape. **Option (a)** is local to this task; **option (b)** ripples into structural. Pick (a) unless it's hopeless.
- **Multiple plugins on one container.** Snapshot `prev` once per container per flush, not per plugin. Otherwise plugins see different `prev` values depending on dispatch order.
- **`ALL_PATHS` interest cost.** A plugin manager that subscribes with `ALL_PATHS` to every container makes the single-consumer-skip optimization in structural ineffective (because the plugin counts as a consumer). Document this. F0 (logging-plugin) and F1 (persist) probably _want_ this. F2/F3 (devtools) only attach when devtools are open.
- **`PathInterner` per-class** means plugins can decode `PathId` → `string` via `container.interner.lookup(id)`. Document this in the plugin README.
- **`unique symbol`** for `ALL_PATHS` — make sure your `instance.subscribe(ALL_PATHS, ...)` uses the same `ALL_PATHS` symbol exported from `@dirtytalk/structural`. Don't import from a stale path.
- **Don't add a `paths` field to `PluginContext`.** Context is per-container; `paths` is per-event. They have different lifetimes.
