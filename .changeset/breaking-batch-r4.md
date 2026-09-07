---
'@blac/core': minor
'@blac/react': minor
---

Trim the published surface: one barrel per package, minus the dead and
duplicated entries.

**Breaking, shipped as a minor deliberately.** The project is pre-1.0 in
practice and has no known external consumers, so these land on the `2.x` line
rather than waiting for a `3.0`.

`@blac/core`:

- `getPluginManager` and `PluginManager` are no longer exported from the
  barrel. Import them from `@blac/core/plugins` instead. This is what makes the
  plugin system tree-shakeable — it cuts **1.10 kB brotli (9.47 → 8.37 kB,
  11.5%)** from every app that never installs a plugin.
- The `./debug`, `./watch` and `./types` subpath exports are removed. Every
  symbol they exposed was already exported from the barrel, so they were pure
  duplicates; import from `@blac/core` instead. `./plugins` and `./testing`
  remain — they exist to keep the plugin manager and the test harness out of
  the production entry point.
- `register()` now guards on constructor identity rather than on the resolved
  bloc name, so two distinct classes that share a `blacName` can both be
  registered. Registering the same class twice still throws.

`@blac/react`:

- `configureBlacReact` and `BlacReactConfig` are removed. The config object was
  inert: nothing ever read it, so setting it had no effect. Tree-scoped
  configuration is `RegistryProvider`; per-bloc configuration is the `@blac()`
  decorator.
