# Tracking Utilities

Dependency tracking utilities are exposed via `@blac/core/tracking` for framework adapters.

## Exports

- `createDependencyState`
- `startDependency`
- `createDependencyProxy`
- `capturePaths`
- `hasDependencyChanges`
- `hasTrackedData`
- Getter tracking: `createGetterState`, `createBlocProxy`, `hasGetterChanges`, `commitTrackedGetters`, `invalidateRenderCache`
- `DependencyManager`
- `resolveDependencies`
- `shallowEqual`

Use these in custom integrations when you need fine-grained dependency tracking outside React.
