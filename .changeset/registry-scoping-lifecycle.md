---
'@blac/core': patch
---

Bind containers to the registry that created them, so a scoped registry is
actually isolated.

`StateContainer` captured the module-global registry in a field initialiser, so
every instance routed its lifecycle through that registry no matter which one
owned it. `RegistryProvider` — documented for test isolation, SSR isolation and
micro-frontends — placed instances in the scoped registry but sent all their
events to the global one. Consequences, each confirmed by test:

- `created` / `disposed` / `stateChanged` / `depsChanged` / `hydrationChanged`
  fired on the global registry, so listeners on the scoped registry saw nothing.
- Plugins never worked on a scoped registry: `PluginManager` subscribes via
  `registry.on('created')`, so it received no events and never attached a state
  bridge.
- The registry's own `disposed` handler never ran, so an instance disposed
  directly was never pruned and its `depend()` dependent edges were never
  swept — leaking the whole dependency subtree.
- `depend()` resolved deps through the global registry, so a scoped bloc's
  dependencies escaped the sandbox entirely.

The owning registry is now passed through `StateContainerConfig` and bound in
`[INIT_CONFIG]` before `init()` runs, since `init()` may call `depend()` or
emit. A bare `new`'d container still falls back to the global registry.

Also fixed:

- `hasStateChangedListeners` could stick `true` forever. It tracked a counter
  incremented on every `on('stateChanged')`, but the listener collection is a
  `Set` — registering the same function twice incremented twice and added once,
  so the count never returned to zero. Every subsequent `emit`/`patch` then
  paid for a notification pass and a microtask flush that reached no listener.
  The getter is now derived from the `Set`, removing the drift entirely.
- `PluginManager.destroy()` leaked one `ALL_PATHS` channel subscription per
  container. Bridges were only detached on a container's disposal, so after
  `destroy()` every live container kept a subscriber — and the
  single-consumer-skip penalty that comes with it — for the rest of the
  process. `destroy()` now detaches them all.
