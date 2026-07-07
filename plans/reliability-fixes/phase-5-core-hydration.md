# Phase 5 — R6: wire up `onHydrationChange` plugin hook (high)

**Goal:** A plugin's `onHydrationChange` runs on every hydration status transition.

Package: `@blac/core`. **Runs after Phase 4** (shared `StateContainerRegistry.ts`).

## Decision (Q4 → wire up)

Precise 3-file mirror of the existing `depsChanged` lifecycle path.

## Root cause (verified)

- `BlacPlugin.ts:~134` declares `onHydrationChange`; README + web-docs document it;
  `rg onHydrationChange` finds only declaration/docs/tests — **no dispatch site**.
- `StateContainerRegistry.ts` `LifecycleEvent` union (`:32-38`) has no `hydrationChanged`.
- `PluginManager.setupLifecycleHooks` (`:217-242`) wires created/disposed/refAcquired/
  refReleased/depsChanged — not hydration.
- `StateContainer.setHydrationStatus` (`:672-683`) fires only the **local system
  event** (`emitSystemEvent`), never a registry emit — contrast `reconcileDeps`
  (`:216-221`) which does `this._registry.emit('depsChanged', …)`.

## Verify (phase entry)

- Read `depsChanged` end-to-end (union entry → `StateContainer` emit → PluginManager
  dispatch → `notifyPlugins('onDepsChanged', …)`) — this is the exact template.
- Confirm `onHydrationChange`'s signature/payload in `BlacPlugin.ts` (status +
  previousStatus + instance/context).

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent | Report-back | Done-check |
|---|------|-------|-----------|-----------|-------|-------------|-----------|
| 5.1 | Add `hydrationChanged` to the registry `LifecycleEvent` union + its `on(...)` listener overload + `emit(...)` overload, mirroring `depsChanged`. | `core/StateContainerRegistry.ts` | seq | — | quick-build sonnet/high | structured summary | Registry supports `hydrationChanged` |
| 5.2 | In `StateContainer.setHydrationStatus` (`:672-683`), after the existing system-event emit, add `this._registry.emit('hydrationChanged', this, status, previousStatus)` (match `reconcileDeps:216-221` shape and the hook payload). | `core/StateContainer.ts` | seq | 5.1 | quick-build sonnet/high | same | Registry event emitted on every transition |
| 5.3 | In `PluginManager.setupLifecycleHooks`, add `registry.on('hydrationChanged', …)` → `notifyPlugins('onHydrationChange', …)` mirroring the `depsChanged` wiring; ensure the unsub is tracked like the others (destroy cleanup). | `plugin/PluginManager.ts` | seq | 5.2 | quick-build sonnet/high | same | Hook dispatched; unsub tracked |
| 5.4 | Test: a plugin implementing `onHydrationChange` receives `(status, previousStatus, …)` on begin→hydrated (and error) transitions; payload matches the hook signature. | `PluginManager.test.ts` (+ `PluginManager.edge-cases.test.ts` if needed) | seq | 5.3 | quick-build sonnet/high | same | Dispatch test added and passing shape |

Sequential (shared registry file, one agent). Must start only after Phase 4 commits/edits land.

## Sanity check (phase exit, orchestrator)

- Confirm the payload passed at the emit site matches `onHydrationChange`'s declared
  params exactly. Confirm the new `registry.on` unsub is added to PluginManager's
  teardown set (no listener leak on `destroy()`).

## Commit

`[<ticket>] fix(core): dispatch onHydrationChange plugin hook`

## Done-check

- [ ] `hydrationChanged` in registry union + on/emit overloads.
- [ ] `setHydrationStatus` emits the registry event on every transition.
- [ ] `PluginManager` dispatches `onHydrationChange`; unsub tracked.
- [ ] Dispatch test added.
