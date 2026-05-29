# Migrating from v1

This page summarizes the breaking changes in BlaC v2. Most changes are mechanical renames.

## `useBloc` option: `dependencies` → `select`

The `dependencies` option on `useBloc` has been renamed to `select`.

```tsx
// v1 — no longer valid
useBloc(MyCubit, { dependencies: (s) => [s.count] });

// v2
useBloc(MyCubit, { select: (s) => [s.count] });
```

There is no compatibility shim. Rename the option key at every call site.

## `tracked()` standalone API removed

The `tracked()` function exported from `@blac/core` no longer exists. It was an internal utility that leaked implementation details.

**Debugging:** Use the [BlaC DevTools](/plugins/devtools) to inspect which paths triggered a re-render.

**Manual subscriptions:** Use [`watch`](/core/watch) — it tracks which properties your callback reads and only re-fires when those change.

```ts
// v2 replacement for manual dependency inspection
import { watch } from '@blac/core';

const stop = watch(UserCubit, (user) => {
  console.log(user.state.name); // re-runs only when 'name' changes
});
```

## `@blac/adapter` package removed

The `@blac/adapter` package is gone. Its functionality (proxy-based dependency tracking, subscription strategies) is now built into `@blac/core` and `@blac/react` directly.

**Action:** Remove any `import` or `package.json` dependency on `@blac/adapter`.

## Plugin hook renames

All plugin lifecycle hooks are renamed. The `ctx` (context) parameter is now **first** on every hook.

| v1                    | v2                | Notes                              |
| --------------------- | ----------------- | ---------------------------------- |
| `onInstanceCreated(instance, ctx)` | `onCreated(ctx, instance)` | ctx moved to first param |
| `onInstanceDisposed(instance, ctx)` | `onDestroyed(ctx, instance)` | ctx moved to first param |
| `onStateChanged(instance, prev, next, ctx)` | `onStateChange(ctx, prev, next, paths)` | ctx first; new `paths` param |
| _(not present)_       | `onHydrationChange(ctx, instance)` | New hook for hydration status changes |

### New `paths` parameter on `onStateChange`

`onStateChange` receives a `paths: PathSet | undefined` as its fourth argument — the set of property paths that changed in this flush. Use the per-class `interner.lookup(pathId)` to convert path IDs to human-readable strings:

```ts
onStateChange(ctx, prev, next, paths) {
  if (!paths) return;
  const meta = ctx.getInstanceMetadata(next);
  if (!meta) return;

  for (const pathId of paths) {
    console.log('changed path:', meta.interner.lookup(pathId));
  }
}
```

See [Plugin Authoring](/core/plugins) for the full updated interface.

## `onSystemEvent('stateChanged')` — once per flush

`onSystemEvent('stateChanged', handler)` now fires **once per microtask flush** instead of once per individual mutation call. Multiple synchronous `emit`/`patch`/`update` calls are coalesced into a single event with the final state.

```ts
class MyCubit extends Cubit<{ a: number; b: number }> {
  constructor() {
    super({ a: 0, b: 0 });

    this.onSystemEvent('stateChanged', ({ state, previousState }) => {
      // fires once after both patches below settle
      console.log(state); // { a: 1, b: 2 }
    });
  }

  setAll() {
    this.patch({ a: 1 }); // coalesced
    this.patch({ b: 2 }); // coalesced
  }
}
```

## `subscribe(listener)` — microtask-coalesced

`StateContainer.subscribe(listener)` is now delivered through the same microtask channel as `onSystemEvent('stateChanged')`. Listeners receive the final state once per flush, not once per mutation.

## Per-class path interner

Each BlaC class has its own `PathInterner` that maps property path strings to compact integer IDs. The interner is accessible via `ctx.getInstanceMetadata(instance).interner` in plugin hooks, or via `StateContainer.interner` on the class itself.

This is primarily relevant for plugin authors and DevTools integrations that need to work with `PathSet` values. Application code does not need to interact with the interner directly.

---

See also: [useBloc](/react/use-bloc), [Plugin Authoring](/core/plugins), [watch](/core/watch)
