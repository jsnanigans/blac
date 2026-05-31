# Glossary

A one-line definition for every term you will meet in the BlaC docs, with a link to the page that explains it in full. Terms are grouped into **Core model**, **Inputs &amp; identity**, **React binding**, **Lifecycle &amp; hydration**, and **Plugins &amp; observation**, then alphabetized within each group.

::: tip Read this when terms collide
A few names look alike and are easy to confuse: `select` (a re-render selector) vs `deps` (a handle lane) vs `dependencies` (the old v1 name for `select`); and `StateContainer` vs `Cubit` vs "bloc" vs "instance". The [Disambiguation](#disambiguation) section at the bottom untangles each cluster in one place.
:::

## Core model

| Term | Definition |
|---|---|
| **StateContainer** | The abstract base class for all state holders. Holds state, exposes `emit`/`patch`/`update`, manages subscriptions, deps, and lifecycle. You rarely extend it directly. See [Cubit](/core/cubit). |
| **Cubit** | The concrete class you extend. It is `StateContainer` with an empty body, existing as a real class so `instanceof Cubit` works. Adds nothing structurally. See [Cubit](/core/cubit). |
| **bloc** | Colloquial shorthand for *any* state-container instance (`StateContainer` or `Cubit`). There is **no `Bloc` class** in BlaC. See [Concepts](/guide/concepts). |
| **instance** | A single live object of a bloc class, identified by its instance key and shared by all consumers that resolve to that key. See [Instance management](/core/instance-management). |
| **state** | The single object a bloc holds (`S extends object`). Read via `bloc.state`; replaced or merged through `emit`/`patch`/`update`. See [Cubit](/core/cubit). |
| **emit** | `emit(next)` replaces the whole state with `next`. Skipped when `next` is reference-equal or passes the configured equality fn. See [Cubit](/core/cubit). |
| **patch** | `patch(partial)` deep-merges a `DeepPartial<S>` into state, marking only paths whose value actually changed. The equality fn does **not** apply to `patch`. See [Cubit](/core/cubit). |
| **update** | `update(fn)` is sugar for `emit(fn(state))` — build the next state from the current one. See [Cubit](/core/cubit). |
| **init** | `protected init(args)` — an override hook called **once** after construction, before the first snapshot. Seed args-derived state or kick off loads here. See [Patterns](/guide/patterns). |
| **registry** | The global singleton that creates, keys, shares, ref-counts, and disposes instances. Resolved via `getRegistry()`. See [Instance management](/core/instance-management). |
| **acquire / release** | Registry verbs that take and give back a counted reference to an instance: `acquire` creates-or-reuses and bumps the ref count, `release` drops it (disposing at zero unless `keepAlive`). See [Instance management](/core/instance-management). |
| **ensure** | Registry verb that creates-or-reuses an instance **without** taking a ref. Used by `watch` and `depend()`; the result is not kept alive by the caller. See [Instance management](/core/instance-management). |
| **borrow / borrowSafe** | Registry reads that return an **existing** instance without creating one or counting a ref. `borrow` throws when missing; `borrowSafe` returns `{ error, instance }`. See [Instance management](/core/instance-management). |
| **ref counting** | The mechanism behind sharing: each consumer holds one ref via `acquire`; when the last ref is released the instance is auto-disposed (unless `keepAlive`). See [Instance management](/core/instance-management). |
| **instance key** | The string that decides which instance a consumer gets. Resolved from `args`: own `args` (via `static key(args)`, else structural hash of `args`) &gt; `<BlocProvider>` context `args` &gt; `'default'`. See [Inputs](/guide/inputs). |
| **structural key** | A deterministic, order-independent JSON hash of `args` used to key instances when no explicit key is given. Throws (dev) if `args` contains a function. See [Inputs](/guide/inputs). |

## Inputs &amp; identity

| Term | Definition |
|---|---|
| **Args** | Typed, **serializable** creation data (`Args` type param). Passed to `init(args)` once and used to key instance identity. Required by `useBloc` when declared, forbidden when `void`. See [Inputs](/guide/inputs). |
| **Deps** | Non-serializable handles (refs, stable callbacks) injected **per consumer** via the `Deps` type param. Merged into `bloc.deps`; **never** key identity. See [Inputs](/guide/inputs). |
| **deps (runtime)** | The merged, read-only view of all consumers' dep slices, exposed as `bloc.deps`. Changes fire [onDepsChanged](#onDepsChanged). Note: a `deps` *option* on `useBloc` is **internal**, not part of the public hook surface. See [Inputs](/guide/inputs). |
| **instanceId** | **No longer a `useBloc`/`BlocProvider` option.** Instance identity comes entirely from `args` (via `static key` or structural hash). `instanceId` survives only as a read-only **property** on each instance (its resolved key) and as the `instanceId()` branded-type helper. For a per-mount instance use `args: { _id: useId() }` + `static key`. See [Inputs](/guide/inputs). |
| **autoInstance** | **Not a current option.** The shipping mechanism for a fresh per-mount instance is a synthetic `args` field — `args: { _id: useId() }` — plus a `static key` selecting it. The names `autoInstance`/`instanceId`-option survive only in stale comments; a `static isolated` field exists but is not wired into `useBloc` in the current release. See [Instance management](/core/instance-management). |
| **static key** | A class static `key = (args) => string` (settable directly or via `blac({ key })`) that derives the instance key from `args`. See [Inputs](/guide/inputs). |
| **keepAlive** | Set via `blac({ keepAlive: true })`; instances of the class are **never** auto-disposed at ref count zero (still disposable via `forceDispose`/`clear`). See [Configuration](/core/configuration). |
| **excludeFromDevTools** | Set via `blac({ excludeFromDevTools: true })`; the class is excluded from DevTools tracking. See [Configuration](/core/configuration). |
| **blac()** | The decorator/function that sets exactly **one** class-level option: `keepAlive`, `excludeFromDevTools`, `equality`, or `key`. See [Configuration](/core/configuration). |

## React binding

| Term | Definition |
|---|---|
| **useBloc** | The React hook: `useBloc(BlocClass, options?)` returns `[state, bloc, ref]`, acquiring on mount and releasing on unmount. See [useBloc](/react/use-bloc). |
| **select** | The `useBloc` option to **opt out** of auto-tracking: `select: (state, bloc) => unknown[]` re-renders only when the returned array changes per-index. Must be referentially stable. Replaces v1's `dependencies`. See [Dependency tracking](/react/dependency-tracking). |
| **auto-tracking** | The default re-render strategy: when `select` is omitted, BlaC records which state leaves a render reads and re-renders only when one of them changes. Also called *dependency tracking* (the feature/page name). See [Dependency tracking](/react/dependency-tracking). |
| **tracked proxy** | The recording `Proxy` wrapper (`trackRender`) placed around `state` during render; reads on it log leaf paths used for auto-tracking. There is **no `@tracked` decorator** — tracking is automatic. See [Tracked](/core/tracked). |
| **per-consumer tracker** | Each `useBloc` call gets its **own** proxy + recorded path set, so re-renders stay isolated between components reading the same instance. See [Dependency tracking](/react/dependency-tracking). |
| **BlocProvider** | A React component that supplies default `args` to descendant `useBloc` calls that omit their own. A call passing its own `args` still wins. See [useBloc](/react/use-bloc). |
| **ref (tuple element)** | The third element of the `useBloc` tuple (`ComponentRef`); an advanced-use ref object rarely needed in app code. See [useBloc](/react/use-bloc). |

## Lifecycle &amp; hydration

| Term | Definition |
|---|---|
| **system event** | A bloc lifecycle signal subscribed via `onSystemEvent(event, handler)`: one of `'stateChanged'`, `'dispose'`, or `'hydrationChanged'`. See [System events](/core/system-events). |
| **dispose** | Tearing down an instance: cancels hydration, fires the `'dispose'` system event, clears listeners, and removes it from the registry. Idempotent. See [System events](/core/system-events). |
| **hydration** | Restoring previously persisted state into a bloc on startup, driven by `beginHydration` / `applyHydratedState` / `finishHydration` / `failHydration`. See [Persistence](/plugins/persistence). |
| **hydrationStatus** | The current hydration phase: `'idle' \| 'hydrating' \| 'hydrated' \| 'error'`. See [System events](/core/system-events). |
| **waitForHydration** | `waitForHydration()` returns a promise that resolves once hydration settles (idle/hydrated) or rejects on error. See [Persistence](/plugins/persistence). |
| **depend / cross-bloc dependency** | `protected depend(Type, instanceKey?)` records a dependency on another bloc and returns a lazy **getter** that resolves it via `ensure` (no ref taken) on each call. See [Bloc communication](/core/bloc-communication). |
| **onDepsChanged** | `protected onDepsChanged(next, prev)` — an override hook that fires whenever the merged per-consumer [deps](#deps-runtime) view changes (and once on dispose with all keys cleared). See [Inputs](/guide/inputs). |

## Plugins &amp; observation

| Term | Definition |
|---|---|
| **watch** | `watch(blocOrRef, callback)` runs a callback once immediately and again on every change of the watched bloc(s), outside React. Return `watch.STOP` (or call the returned fn) to stop. See [watch](/core/watch). |
| **instance() (helper)** | `instance(BlocClass, args)` builds a `BlocRef` so `watch` targets the instance keyed by those args rather than the default one. See [watch](/core/watch). |
| **subscribe** | `subscribe(listener)` — the legacy per-flush listener surface on a bloc. Prefer `watch` (non-React) or `useBloc` (React); new code can use `bloc.channel.subscribe`. See [watch](/core/watch). |
| **plugin** | An observer (`BlacPlugin`) that hooks into container lifecycle (`onCreated`, `onStateChange`, `onDestroyed`, `onHydrationChange`, …) across all instances. See [Plugins](/core/plugins). |
| **PluginManager** | The singleton (via `getPluginManager()`) that installs, uninstalls, and tracks plugins, gating each by `enabled` and `environment`. See [Plugins](/core/plugins). |
| **PluginContext** | The per-dispatch context object passed to plugin hooks; exposes the focal `container`, metadata, state, hydration controls, and registry queries. See [Plugins](/core/plugins). |
| **interner** | The per-class `PathInterner` that maps state property paths to integer ids, making path comparison cheap. You rarely touch it directly. See [Tracked](/core/tracked). |
| **PathSet** | The set of changed paths marked during a flush — either a `Set<PathId>` or the `ALL_PATHS` sentinel that means "everything changed." See [Tracked](/core/tracked). |

## Disambiguation

These clusters cause the most confusion. Keep them straight:

::: details select vs dependencies vs deps
- **`select`** — a `useBloc` option that **narrows re-renders**: `(state, bloc) => unknown[]`. Opting in disables auto-tracking for that consumer. See [Dependency tracking](/react/dependency-tracking).
- **`dependencies`** — the **old v1 name** for `select`. It no longer exists; if you see it, it means "rename to `select`." See [Migration](/guide/migration-from-v1).
- **`deps`** — the **non-serializable handle lane** (`Deps` type param + `bloc.deps` view). Nothing to do with re-rendering. See [Inputs](/guide/inputs).
:::

::: details StateContainer vs Cubit vs bloc vs instance
- **`StateContainer`** — the abstract base class (you rarely extend it).
- **`Cubit`** — the concrete class you extend; structurally identical to `StateContainer`.
- **bloc** — informal word for *any* container instance. There is **no `Bloc` class**.
- **instance** — one concrete live object of a class, shared by ref count under an instance key.

See [Concepts](/guide/concepts).
:::

::: details auto-tracking vs dependency tracking vs proxy tracking
All three name the **same** mechanism: the render-time recording proxy that logs which state leaves a component reads, so re-renders fire only on relevant changes. The docs use **auto-tracking** for the behavior and **dependency tracking** for the feature/page. See [Dependency tracking](/react/dependency-tracking).
:::

::: warning No `Bloc` class, no `@tracked`, no `autoTrack`/`autoInstance` options
BlaC has **no `Bloc` class** (only `StateContainer` and `Cubit`), **no `@tracked` decorator**, and **no `autoTrack`, `autoInstance`, or `instanceId` options**. Tracking is automatic and unconditional unless you pass `select`; a fresh per-mount instance comes from `args: { _id: useId() }` + `static key`. If a doc or comment mentions these, it is stale.
:::

## See also

- [Concepts](/guide/concepts) — the quick tour of the model behind these terms
- [Mental model](/guide/mental-model) — the deep "why it works this way"
- [Inputs](/guide/inputs) — `args`, `deps`, and instance identity in full
- [useBloc](/react/use-bloc) — the canonical `useBloc` options and identity precedence
