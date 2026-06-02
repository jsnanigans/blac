---
title: Configuration
description: Per-class config with the @blac decorator (keepAlive, equality, key, excludeFromDevTools) and global config with configureBlac, including the circuit breakers that catch leaks and emit storms.
---

There are two layers of configuration in BlaC, and it helps to keep them straight:

- **Per-class config** with the `@blac` decorator (or `blac()` function) — opt one bloc into special behavior: keep it alive, hide it from DevTools, override its equality check, or control how its instances are keyed.
- **Global config** with `configureBlac` — set app-wide defaults and tune the safety limits (circuit breakers) that catch leaks and runaway emits before they freeze the app.

This page covers both. If you just want one bloc to survive route changes, you want `@blac({ keepAlive: true })` below. If you want to swap the default equality check or raise a circuit-breaker limit, jump to [`configureBlac`](#global-config-configureblac).

## Per-class config: `@blac`

`BlacOptions` is a **union type** — you can specify exactly **one** option per `@blac` call. Each option sets a single static property on the class that the registry and React layer read at runtime.

```ts
import { blac, Cubit } from '@blac/core';

@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ user: null });
  }
}
```

:::caution[One option per call]
Because `BlacOptions` is a union, this is a **type error** — you cannot combine options in a single call:

```ts
// Type error: object literal may only specify one of these members
@blac({ keepAlive: true, key: (args) => args.id })
class Bad extends Cubit<S> {}
```

To apply more than one, stack decorators (or chain function calls). Each call sets its own static property and returns the class:

```ts
@blac({ keepAlive: true })
@blac({ key: (args) => args.id })
class Good extends Cubit<S, { id: string }> {}
```

:::

### `{ keepAlive: true }`

Prevents the instance from being auto-disposed when its ref count reaches zero. The instance persists for the lifetime of the app (it can still be torn down explicitly via `clear()` or `release(..., forceDispose)`).

**Why:** By default, BlaC disposes an instance the moment the last consumer releases it — see [Instance Management](/core/instance-management). That is exactly what you want for screen-local state, but wrong for state that must outlive the components reading it.

```ts
@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ user: null });
  }
}
```

**When to use:** global state that should survive route changes and component churn — authentication, user preferences, app-wide settings, a feature-flag cache.

### `{ excludeFromDevTools: true }`

Hides every instance of the class from DevTools inspection.

**Why:** the DevTools plugin subscribes to each tracked container. A container that emits at high frequency (an animation clock, a pointer-position store) would flood the DevTools panel and add overhead on every frame. Excluding it keeps the panel readable and avoids self-induced feedback when DevTools-related state changes.

```ts
@blac({ excludeFromDevTools: true })
class InternalTimerCubit extends Cubit<TimerState> {
  constructor() {
    super({ tick: 0 });
  }
}
```

**When to use:** high-frequency or purely internal state containers that would clutter DevTools. See [DevTools](/plugins/devtools) for how the plugin consumes this flag.

### `{ equality: EqualityFn }`

Overrides the global equality check for this one class. The function receives the previous and next state; **return `true` to treat them as equal and skip the emit**.

**Why:** `emit`/`update` short-circuit when the new state is considered equal to the old, which prevents needless re-renders and downstream work. The global default ([`shallowEqualState`](#defaults)) compares top-level keys with `Object.is`. If a specific bloc holds deeply nested state where a shallow check is too eager (or not eager enough), give it its own comparator.

```ts
import { blac, Cubit, type EqualityFn } from '@blac/core';

const deepEqual: EqualityFn = (prev, next) =>
  JSON.stringify(prev) === JSON.stringify(next);

@blac({ equality: deepEqual })
class FilterCubit extends Cubit<FilterState> {
  constructor() {
    super({ tags: [], range: { min: 0, max: 100 } });
  }
}
```

:::note[Equality applies to emit/update, not patch]
The configured equality function gates `emit` and `update` only. `patch` does its own per-key `Object.is` filtering and ignores this function — see [Cubit](/core/cubit) for the difference between the mutation methods.
:::

### `{ key: (args) => string }`

Overrides how the registry derives an instance key from `args`. The function receives the bloc's `args` and returns the key string: **distinct return values produce distinct instances; identical values share one instance.**

**Why:** by default, a bloc with `args` is keyed by a structural hash of the entire `args` object. That is usually right, but sometimes only part of `args` is identity-bearing. A `static key` lets you key on just the identifying field so that non-identity fields (display options, a callback flag) don't accidentally fork a brand-new instance every time they change.

```ts
// Two consumers passing { userId: 'u1', highlight: true/false }
// should share ONE instance keyed only by userId.
@blac({ key: (args: { userId: string }) => args.userId })
class UserCardCubit extends Cubit<
  UserState,
  { userId: string; highlight?: boolean }
> {
  constructor() {
    super({ user: null });
  }
}
```

The same key function can be set directly as a class static (`static key = (args) => …`) if you prefer not to use a decorator. The registry reads either form. See [Passing Inputs](/guide/inputs) for the full identity model, and [Instance Management](/core/instance-management) for how keys drive sharing and disposal.

## Without decorators

If you're not using TypeScript decorators, call `blac` as a regular function. The decorator and function forms are identical — the decorator is just sugar for calling the returned wrapper on your class.

```ts
class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ user: null });
  }
}

blac({ keepAlive: true })(AuthCubit);
```

:::note[Decorator setup]
The decorator form (`@blac({ … })`) requires decorator support in your toolchain — `experimentalDecorators` in `tsconfig.json` for the TypeScript-style decorators, or a build that understands TC39 decorators. If you hit a decorator-syntax error, switch to the function form above; it needs no special configuration.
:::

## Global config: `configureBlac`

`configureBlac` sets app-wide defaults. Call it **once, early** (before any blocs are acquired) — typically at your app's entry point. It shallow-merges the partial config into the current globals, so you only pass the keys you want to change.

```ts twoslash
import { configureBlac } from '@blac/core';

configureBlac({
  maxInstancesPerType: 5000,
  maxEmitsPerSecond: 240, // allow 4x/frame for a 60fps animation bloc
});
```

The config object has four keys: the default `equality` function and three **circuit breakers**.

### Circuit breakers

Circuit breakers are guardrails for the two failure modes that quietly destroy a BlaC app: leaks (instances or refs that are created but never disposed) and emit storms (a tight loop pushing high-frequency data through state). They cost nothing on the happy path and turn a silent freeze into a loud, actionable error.

| Option                | Guards against                                                                                                                                                                                    | Behavior when exceeded                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `maxInstancesPerType` | Too many **live instances** of one class — almost always an unstable instance key (a fresh object/array passed as `args` every render, or a missing `static key`) leaking one instance per render | `acquire` **throws**                                                             |
| `maxRefsPerInstance`  | Too many **distinct refs** on one instance — consumer cleanup (e.g. a `useBloc` unmount `release`) never firing, so refs pile up without bound                                                    | `acquire` **throws**                                                             |
| `maxEmitsPerSecond`   | An **emit storm** — a tight loop (RAF/animation, or an effect emitting on every commit) pushing high-frequency changes that saturate subscribers, plugins, and the main thread                    | Dev-only `console.warn` once per instance; **never throws**; no-op in production |

A few details that matter when tuning these:

- `maxInstancesPerType` throws when the live-instance count for a class **reaches** the limit (`>=`). `maxRefsPerInstance` throws when an instance's distinct-ref count **exceeds** the limit (`>`).
- `maxEmitsPerSecond` counts only **real** state changes (emits that actually changed state, after equality filtering) in a rolling one-second window, and warns at most once per instance. It is a heuristic — high-frequency state is occasionally legitimate, so it never blocks you.
- **Disable any breaker** by setting it to `Infinity` or any non-positive value (`0`, `-1`).

:::caution[A thrown breaker is a symptom, not the bug]
If `acquire` throws an instance- or ref-limit error, raising the limit usually just delays the freeze. The real cause is almost always an unstable key or a missing `release`. Stabilize the `args` / add a `static key` ([Passing Inputs](/guide/inputs)), or fix the missing cleanup ([Instance Management](/core/instance-management)), before reaching for a higher limit.
:::

### `equality` (global default)

The global equality function applied to every bloc that doesn't declare its own via [`@blac({ equality })`](#equality-equalityfn). The exported default, `shallowEqualState`, short-circuits on `Object.is`, returns `false` for non-objects/`null`, and otherwise compares top-level keys with `Object.is`. Swap it to change the default skip behavior for the whole app:

```ts twoslash
import { configureBlac, shallowEqualState } from '@blac/core';

// Treat any two states as different unless referentially identical
configureBlac({ equality: (a, b) => Object.is(a, b) });
```

### Defaults

| Option                | Type         | Default             | What it does                                                                      |
| --------------------- | ------------ | ------------------- | --------------------------------------------------------------------------------- |
| `equality`            | `EqualityFn` | `shallowEqualState` | App-wide default equality for `emit`/`update`; return `true` to skip the emit     |
| `maxInstancesPerType` | `number`     | `1000`              | Max live instances per class before `acquire` throws                              |
| `maxRefsPerInstance`  | `number`     | `1000`              | Max distinct refs per instance before `acquire` throws                            |
| `maxEmitsPerSecond`   | `number`     | `100`               | Dev-only soft limit; real emits/sec per instance before a one-time `console.warn` |

<details>
<summary>Reading the current config (advanced)</summary>

`getBlacConfig()` returns the live config object and `resetBlacConfig()` restores defaults. Both are marked `@internal` — `resetBlacConfig()` is handy in test teardown to undo a `configureBlac` from a previous test, but neither belongs in application code.

</details>

## See also

- [Instance Management](/core/instance-management) — how `keepAlive`, ref counting, and instance keys drive sharing and disposal
- [Passing Inputs](/guide/inputs) — `args`, `static key`, and the full instance-identity model
- [Cubit](/core/cubit) — `emit` vs `update` vs `patch`, and where equality applies
- [DevTools](/plugins/devtools) — how `excludeFromDevTools` is consumed
