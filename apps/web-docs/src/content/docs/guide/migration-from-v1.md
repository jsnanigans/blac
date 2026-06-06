---
title: Migrating from v1
description: The single source of truth for what changed between BlaC v1 and v2, with grep hints and before/after examples for every migration.
---

This page is the **single source of truth** for what changed between BlaC v1 and v2. Most changes are mechanical renames; a few — the props model, plugin hooks — change shape and need a closer look. Each section includes a hint for finding affected call sites.

:::tip[Finding affected code]
Most migrations are greppable. Each section below lists a `grep`/codemod hint. A fast first pass: search your project for `dependencies:`, `.props`, `onInstanceCreated`, `onInstanceDisposed`, `onStateChanged`, `@blac/adapter`, and `extends Bloc`.
:::

## `useBloc` option: `dependencies` → `select`

The `dependencies` option on `useBloc` has been renamed to `select`. It was renamed to avoid colliding with the new `deps` lane for non-serializable handles (see [Passing Inputs](/guide/inputs)).

```tsx
// v1 — no longer valid
useBloc(MyCubit, { dependencies: (s) => [s.count] });

// v2
useBloc(MyCubit, { select: (s) => [s.count] });
```

Rename the option key at every call site. The selector's contract is unchanged: return an array; the component re-renders when any element changes by `Object.is`. Keep the function referentially stable (define it outside the component or wrap in `useCallback`).

<details>
<summary>Find call sites</summary>

`grep -rn "dependencies:" src/` — then rename the key to `select:`. The return value needs no changes.

</details>

:::note[Alias-shim approach (internal reference)]
An internal `@9amhealth/blac-compat` package exists that backs the old v1 API surface with v2 internals. It is **private and not published for general use**. If you need a similar bridge for a large codebase, the approach is: create a local package that re-exports v2 types under the old names, then configure your bundler (Vite `resolve.alias`, webpack `resolve.alias`, or TypeScript `paths`) to point the old import specifiers at it. For example:

```ts
// vite.config.ts
resolve: {
  alias: {
    'blac-next': '/packages/my-compat/src/index.ts',
    '@blac/react': '/packages/my-compat/src/index.ts',
  },
}
```

This lets you migrate incrementally — existing call sites keep compiling while you rename them one file at a time. Do not take a dependency on `@9amhealth/blac-compat` directly; it is an internal migration aid tied to a specific codebase.
:::

## `tracked()` standalone API removed

The `tracked()` function exported from `@blac/core` no longer exists. It was an internal utility that leaked implementation details.

**Debugging:** Use the [BlaC DevTools](/plugins/devtools) to inspect which paths triggered a re-render.

**Manual subscriptions:** Use [`watch`](/core/watch). The callback receives the bloc instance, fires once immediately, then on every state change of the watched bloc.

```ts
// v2 replacement for manual dependency inspection
import { watch } from '@blac/core';

const stop = watch(UserCubit, (user) => {
  console.log(user.state.name); // fires on every UserCubit state change
});
```

## `@blac/adapter` package removed

The `@blac/adapter` package is gone. Its functionality (proxy-based dependency tracking, subscription strategies) is now built into `@blac/core` and `@blac/react` directly.

**Action:** Remove any `import` or `package.json` dependency on `@blac/adapter`.

<details>
<summary>Find call sites</summary>

`grep -rn "@blac/adapter" .` (including `package.json`).

</details>

## No `Bloc` class — `Cubit` is the base

v1 exposed an event-driven `Bloc<Event, State>` base alongside `Cubit`. v2 has **only** `Cubit` (and its abstract parent `StateContainer`); there is no event/reducer layer. Define methods directly on the Cubit and call `emit`/`patch`/`update`.

```ts
// v1 — event-driven Bloc (removed)
class CounterBloc extends Bloc<CounterEvent, CounterState> { ... }

// v2 — methods are the API
class CounterCubit extends Cubit<CounterState> {
  constructor() { super({ count: 0 }); }
  increment = () => this.patch({ count: this.state.count + 1 });
}
```

<details>
<summary>Find call sites</summary>

`grep -rn "extends Bloc<" src/` and any `import { Bloc }` from a BlaC package. Convert each to `extends Cubit<...>` and replace `on(Event)` handlers with plain methods.

</details>

## `props` model → input lanes

The single largest behavioral change. In v1 a Cubit took a second generic for `props`, injected once on mount via `useBloc(C, { props })` and read as `this.props`:

```tsx
// v1 — props generic + props option (removed)
class UserCubit extends Cubit<UserState, { userId: string }> {
  load() {
    fetch(`/users/${this.props.userId}`);
  }
}
useBloc(UserCubit, { props: { userId } });
```

v2 replaces this with the three explicit [input lanes](/guide/inputs):

- **`args`** — serializable creation data that also _keys instance identity_. Forwarded to `init(args)`. This is the direct successor to most `props` usage.
- **`deps`** — non-serializable handles (refs, callbacks), merged per consumer.
- **method calls** — for values that change over the instance's life.

```tsx
// v2 — args key identity and seed init()
class UserCubit extends Cubit<UserState, { userId: string }> {
  protected init(args: { userId: string }) {
    this.load(args.userId);
  }
}
useBloc(UserCubit, { args: { userId } });
```

If you need a literal mechanical port without adopting identity keying yet, define your own setter and push the old props from an effect: `useBloc(C)` paired with `useEffect(() => bloc.applyProps(props), [props])` (where `applyProps` is a method you write). Prefer migrating to `args` so shared instances stay race-free — see [Passing Inputs](/guide/inputs) for the full model.

<details>
<summary>Find call sites</summary>

`grep -rn "{ props:" src/` and search for `this.props` inside Cubit classes. Each maps to either `args` (identity data) or `deps` (handles).

</details>

## `useBloc` identity option: `id` → `args`

The v1 per-instance key option was named `id`. v2 has **no** explicit key option at all — instance identity is derived from `args`. Move the distinguishing value into `args` and select it with a `static key` on the class.

```tsx
// v1
useBloc(FormCubit, { id: 'billing' });

// v2 — the value lives in args; static key makes it the identity
class FormCubit extends Cubit<FormState, { section: string }> {
  static key = (a: FormCubit['args']) => a.section;
}
useBloc(FormCubit, { args: { section: 'billing' } });
```

There is also no `instanceId` or `autoInstance` option in v2 (neither shipped in the public surface). For a private per-mount instance, add a synthetic `args` field — `args: { _id: useId() }` — with a matching `static key`. See [Passing Inputs](/guide/inputs#per-component-private-instances).

<details>
<summary>Find call sites</summary>

`grep -rn "useBloc(.*{ *id:" src/` — move the key into `args` and add a `static key`.

</details>

## `Blac` facade → registry functions

v1's static `Blac` facade (`Blac.getBloc(C, { id })`, `Blac.getAllBlocs(C)`) is replaced by tree-shakeable functions from `@blac/core`:

| v1                                | v2                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `Blac.getBloc(C, { id })`         | `ensure(C, { args })` (create if missing, no ref) or `acquire(C, { args })` (ref-counted) |
| `Blac.getAllBlocs(C)`             | `getAll(C)`                                                                               |
| `Blac.clearAll()` (test teardown) | `clearAll()`                                                                               |

See [Instance Management](/core/instance-management) for the full registry surface and how `acquire`/`ensure`/`borrow` differ in ref-counting.

<details>
<summary>Find call sites</summary>

`grep -rn "Blac\\." src/`.

</details>

## Plugin hook renames

All plugin lifecycle hooks are renamed, and the `ctx` (context) parameter is now **first** on every hook. The bloc the event is about is no longer a separate parameter — read it from `ctx.container`.

| v1                                          | v2                                               | Notes                                                         |
| ------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `onInstanceCreated(instance, ctx)`          | `onCreated(ctx)`                                 | instance dropped; use `ctx.container`                         |
| `onInstanceDisposed(instance, ctx)`         | `onDestroyed(ctx)`                               | instance dropped; use `ctx.container`                         |
| `onStateChanged(instance, prev, next, ctx)` | `onStateChange(ctx, prev, next, paths)`          | ctx first; new `paths` param; `prev`/`next` are state objects |
| _(not present)_                             | `onHydrationChange(ctx, status, previousStatus)` | New hook for hydration status transitions                     |

:::caution[Update both the parameter order and the parameter set]
This is more than a rename: `onCreated`/`onDestroyed` no longer receive an `instance` argument at all. Code like `onCreated(ctx, instance) { use(instance.name) }` must become `onCreated(ctx) { use(ctx.container?.$blac.name) }`. Search your plugins for the old hook names and rewrite each call.
:::

### New `paths` parameter on `onStateChange`

`onStateChange` receives a `paths: PathSet` as its fourth argument — the set of property paths that changed in this flush (it may be the `ALL_PATHS` sentinel). Use the per-class `interner.lookup(pathId)` to convert path IDs to human-readable strings:

```ts
import { ALL_PATHS } from '@blac/core';

onStateChange(ctx, prev, next, paths) {
  const interner = ctx.container?.interner;
  if (!interner || paths === ALL_PATHS) return; // ALL_PATHS isn't iterable

  for (const pathId of paths) {
    console.log('changed path:', interner.lookup(pathId));
  }
}
```

The interner lives on the container (`ctx.container.interner`), not on `InstanceMetadata`. `paths` can be the `ALL_PATHS` sentinel rather than a `Set`, so guard before iterating. See [Plugin Authoring](/core/plugins) for the full updated interface.

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

Each BlaC class has its own `PathInterner` that maps property path strings to compact integer IDs. The interner is accessible via `ctx.container.interner` in plugin hooks, or via `bloc.interner` on any instance.

This is primarily relevant for plugin authors and DevTools integrations that need to work with `PathSet` values. Application code does not need to interact with the interner directly.

## New in v2 (not just removals)

Migration isn't only about what's gone. v2 adds capabilities a v1 codebase should adopt as it moves over:

- **The input model** — `args` (identity-keyed creation data), `deps` (non-serializable handles), and method-call events replace the old single `props` slot. This is the headline addition; start at [Passing Inputs](/guide/inputs).
- **Per-mount instances** via a synthetic `args: { _id: useId() }` field + `static key` (the supported replacement for the nonexistent `autoInstance`/`instanceId` options).
- **Automatic, path-scoped re-renders** — no `dependencies`/selector needed for the common case; the returned state proxy tracks exactly what your component reads. See [Dependency Tracking](/react/dependency-tracking).
- **Hydration lifecycle** — `$blac.hydration.begin()`/`.finish()`/`.wait()` and the `hydrationChanged` event, used by the [persistence plugin](/plugins/persistence).
- **Circuit breakers** — `configureBlac({ maxInstancesPerType, maxRefsPerInstance, maxEmitsPerSecond })` guard against leaks and emit storms. See [Configuration](/core/configuration).

---

## See also

- [Passing Inputs](/guide/inputs) — the v2 input model that replaces `props`
- [useBloc](/react/use-bloc) — the current option set and identity precedence
- [Plugin Authoring](/core/plugins) — the renamed hook interface in full
- [Instance Management](/core/instance-management) — registry functions that replace the `Blac` facade
- [watch](/core/watch) — the manual subscription API
