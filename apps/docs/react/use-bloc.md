<script setup>
import { perConsumerTrackingFiles } from '../demos/per-consumer-tracking';
</script>

# useBloc

The `useBloc` hook connects a React component to a state container. It acquires (or creates) a bloc instance, subscribes to state changes, and returns the current state, the bloc instance, and an internal ref.

## Signature

```ts
function useBloc<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: UseBlocOptions<T>,
): [
  state: ExtractState<T>,
  bloc: InstanceReadonlyState<T>,
  ref: RefObject<ComponentRef>,
];
```

| Parameter   | Type                                  | Required | Description                                            |
| ----------- | ------------------------------------- | -------- | ------------------------------------------------------ |
| `BlocClass` | `T extends StateContainerConstructor` | yes      | The state-container class to acquire.                  |
| `options`   | `UseBlocOptions<T>`                   | no       | Optional configuration: see [Options](#options) below. |

**Returns:** a `[state, bloc, ref]` tuple.

| Index | Name    | Description                                                                                                                                                                                                                                |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | `state` | Current state. In auto-tracking mode (the default) this is a tracking proxy that records which paths you read so re-renders stay scoped to them. In `select` mode it's the raw state object.                                               |
| 1     | `bloc`  | The Cubit instance. Call its methods to drive changes (`bloc.increment()`). The instance itself is not proxied — to make a computed getter drive re-renders, read it inside [`select`](#select) (`select: (state, bloc) => [bloc.total]`). |
| 2     | `ref`   | An advanced-use ref object for component-bloc binding. You almost never need it; destructure just the first two values.                                                                                                                    |

Typically you destructure just the first two:

```tsx
const [state, counter] = useBloc(CounterCubit);
```

## Tracking modes

By default, `useBloc` uses auto-tracking to keep re-renders scoped: the hook wraps `state` in a tracking proxy that records which paths you actually read, and the component re-renders only when one of those paths changes. This means two components consuming the same state can read different slices — one re-renders when `left` changes, the other only when `right` changes.

See it in action:

<BlacSandpack :files="perConsumerTrackingFiles" active-file="/App.tsx" :editor-height="500" />

## Options

`useBloc` accepts one optional options object. `UseBlocOptions` has exactly four keys — reach for the one that matches your need:

| Option      | Type                               | Required            | Description                                                                                        |
| ----------- | ---------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `args`      | the bloc's `Args` type             | when `Args != void` | Typed construction data; derives instance identity. Required when declared, forbidden when `void`. |
| `select`    | `(state: S, bloc: T) => unknown[]` | no                  | Explicit dependency selector; disables auto-tracking.                                              |
| `onMount`   | `(bloc: InstanceType<T>) => void`  | no                  | Called once when the component mounts with the bloc instance.                                      |
| `onUnmount` | `(bloc: InstanceType<T>) => void`  | no                  | Called when the component unmounts (bloc still alive at this point).                               |

::: tip These four are the entire option surface
`UseBlocOptions` has exactly these keys. Two things people expect that are **not** options here:

- **Per-mount instances** — pass a per-mount unique value in `args` (e.g. `args: { _id: useId() }`) with a matching `static key` on the class so each mount gets its own private instance (see [`args`](#args) and [Passing Inputs](/guide/inputs)).
- **Non-serializable handles** (refs, callbacks) are a bloc-level `Deps` concept, not a `useBloc` option; see [Injecting handles (`deps`)](#injecting-handles-deps).

There is no `autoTrack` flag — auto-tracking is the default and you opt out with `select`.
:::

### `args`

```ts
args: ExtractArgs<T>;
```

**Required when the bloc declares `Args != void`; forbidden (type `never`) when `void`.**

**Returns:** `void` (the option feeds the bloc's `init(args)` before the first snapshot).

**Behavior.** Pass typed construction data to the bloc. Args are forwarded to the bloc's `init(args)` method before the first state snapshot, and they derive the instance identity by default — different args ⇒ different instance. Only serializable values are permitted; non-serializable handles (refs, callbacks, DOM elements) must go in the bloc's `Deps` instead.

```tsx
class UserCardCubit extends Cubit<UserCardState, { userId: string }> {
  protected init(args: { userId: string }) {
    void this.loadUser(args.userId);
  }
}

// args is required and type-checked; omitting it is a compile error
const [state] = useBloc(UserCardCubit, { args: { userId } });
```

- **Identity:** different `args` values produce different instances. By default identity is the structural hash of all args. Override with `static key` on the class.
- **Serializable only** — refs, callbacks, and DOM elements must not go in `args` (they'd produce a new instance every render). Put them in the bloc's `Deps` instead — see [Injecting handles (`deps`)](#injecting-handles-deps).
- **Per-component private instances** — to give each mount its own instance (disposed on unmount), include a per-mount unique value in `args` and declare `static key` on the class so it becomes the identity key:

```tsx
class FormCubit extends Cubit<FormState, { _id: string }> {
  static key = (a: { _id: string }) => a._id;
}

// each mount of this component gets its own FormCubit instance
const _id = useId();
const [state, cubit] = useBloc(FormCubit, { args: { ...options, _id } });
```

See [Passing Inputs](/guide/inputs) for the full identity model.

### `select`

```ts
select?: (state: ExtractState<T>, bloc: InstanceReadonlyState<T>) => unknown[]
```

**Returns:** `void` (the hook uses the returned array to decide whether to re-render).

**Behavior.** Provide an explicit dependency array. The component re-renders only when the shallow-compared values change (per-index `Object.is`). Setting this disables auto-tracking for that call.

```tsx
const [state] = useBloc(UserCubit, {
  select: (state) => [state.name, state.email],
});
```

The function receives both state and the bloc instance, so you can depend on getters:

```tsx
const [state, cart] = useBloc(CartCubit, {
  select: (state, bloc) => [bloc.total, state.items.length],
});
```

::: warning Breaking change (v1 → v2)
This option was called `dependencies` in v1. It was renamed to `select` to avoid confusion with the `deps` (non-serializable handles) lane. See [Migration from v1](/guide/migration-from-v1) for the full change list.

Keep the selector referentially stable across renders — wrap it in `useCallback` or define it at module scope. A new function identity each render re-keys the subscription, which the underlying channel treats as a new consumer.
:::

### `onMount`

```ts
onMount?: (bloc: InstanceType<T>) => void
```

**Returns:** `void`.

**Behavior.** Called once in a mount effect after the bloc is acquired. Use it to kick off work tied to this component's lifecycle (e.g. fetch on mount).

```tsx
const [state] = useBloc(DataCubit, {
  onMount: (bloc) => bloc.fetchData(),
});
```

### `onUnmount`

```ts
onUnmount?: (bloc: InstanceType<T>) => void
```

**Returns:** `void`.

**Behavior.** Called when the component unmounts, _before_ the registry releases its ref — so the bloc is still alive when this runs. Use it to clean up subscriptions or cancel pending work.

```tsx
const [state] = useBloc(StreamCubit, {
  onUnmount: (bloc) => bloc.disconnect(),
});
```

## Injecting handles (`deps`)

Non-serializable handles (refs, stable callbacks, controller instances) are **not** a `useBloc` option. They are a bloc-level concept: the bloc declares a `Deps` type and reads from `this.deps.x` (which may be `undefined` — always guard).

```ts
class FileUploadCubit extends Cubit<
  UploadState,
  { endpoint: string },
  { inputRef?: RefObject<HTMLInputElement>; onComplete?: () => void }
> {
  async upload() {
    this.deps.inputRef?.current?.click?.();
    // ... perform upload ...
    this.deps.onComplete?.();
  }
}
```

For handles that need to trigger initialization on arrival (e.g. a canvas ref), implement `onDepsChanged` on the bloc — see [Cubit](/core/cubit). For how `deps` are supplied and merged across consumers, and the full input model, see [Passing Inputs](/guide/inputs).

::: tip Avoid raw inline callbacks as handles
An inline callback (`onComplete={() => …}`) gets a new identity every render, so a bloc that captured it holds a stale closure. Prefer:

1. **Callback inversion (best):** expose state; let the component call its fresh callback from its own `useEffect`.
2. **Stabilize with `useCallback`** before passing.
3. **Push via an event** — call a bloc method from an effect.
   :::

## Identity and keying

This is the canonical instance-identity precedence for `useBloc`. Other pages defer to this list:

1. **`<BlocProvider>` context args** — inherited from a parent provider when present
2. **`static key(args)`** — class-supplied key derived from `args`
3. **Structural hash of `args`** — default when the bloc declares `Args` and no `key` is set
4. **`'default'`** — singleton fallback when the bloc has no `args`, no key, and no provider

Blocs declare explicit identity via a static property:

```ts
class DocumentCubit extends Cubit<
  DocState,
  { docId: string; readonly: boolean }
> {
  static key = (args: DocumentCubit['args']) => args.docId;
  // docId keys the instance; readonly is config that rides along but doesn't fork instances
}
```

A note on `<BlocProvider>`: it supplies `args` to descendant `useBloc` calls that don't pass their own, so a subtree can share a scoped instance without threading data through props.

```tsx
import { BlocProvider } from '@blac/react';

<BlocProvider args={{ customerId: 'customer-42' }}>
  <CustomerView />{' '}
  {/* useBloc(CustomerCubit) here inherits args from the provider */}
</BlocProvider>;
```

See [Passing Inputs](/guide/inputs) for the full decision matrix.

::: warning Common mistakes

- **Passing a fresh `select` each render.** The selector must be referentially stable (wrap it in `useCallback`). A new function identity each render re-keys the subscription, which the underlying channel treats as a new consumer.
- **Putting non-serializable values in `args`.** Refs, callbacks, and DOM nodes change identity every render, so a fresh `args` object produces a brand-new instance each time (and `args` must be JSON-serializable). Use the bloc's `Deps` for handles — see [Injecting handles (`deps`)](#injecting-handles-deps).
- **Expecting an `autoTrack`, `autoInstance`, or `instanceId` option.** None of these exist. Opt out of tracking with `select`; get per-mount instances by including a per-mount unique value in `args` with a matching `static key`.
  :::

## Lifecycle

1. **Mount:** `acquire(BlocClass)` creates or retrieves the instance, incrementing the ref count
2. **`init(args)` called** (once, when the instance is first created) before the first state snapshot
3. **Subscribe:** the hook subscribes to the bloc's channel using the selected tracking mode (auto-track or `select`)
4. **`onMount(bloc)` fires** in a mount effect, after the bloc is acquired
5. **Re-render:** only triggered when a tracked state path or a `select` value changes
6. **Unmount:** `onUnmount(bloc)` fires (bloc still alive), then `release(BlocClass)` decrements the ref count. At zero, the instance is disposed unless the class is [`keepAlive`](/core/configuration)

For the registry mechanics behind acquire/release and ref counting, see [Instance Management](/core/instance-management).

## How re-renders are scheduled

`useBloc` subscribes to the bloc's path-scoped channel and triggers a re-render through a `useReducer` dispatch — React's normal update path — whenever a tracked path (or `select` value) changes. State is read directly from the bloc during render, so reads are consistent within a single render. The hook does not use `useSyncExternalStore`.

## See also

- [Passing Inputs](/guide/inputs) — `args`, `deps`, per-mount isolation, and the identity model
- [Dependency Tracking](/react/dependency-tracking) — How auto-tracking decides what re-renders
- [Performance](/react/performance) — Splitting readers and writers, anti-patterns
- [Cubit](/core/cubit) — The state container these options connect to
- [Migration from v1](/guide/migration-from-v1) — The `dependencies` → `select` rename and other changes

## Troubleshooting

For the full FAQ see [Troubleshooting](/guide/troubleshooting). Below are the problems most specific to `useBloc`.

### Component re-renders too often

**Symptom:** A component re-renders on state changes it doesn't display.

**Cause:** Reading a coarse path (whole object or array) instead of the specific leaf you render. A spread (`{...state}`) or an early destructure before drilling into a path widens the tracked set.

**Fix:** Read exactly the leaf you render through the live proxy, or use `select` to depend on a derived value:

```tsx
// Tracks every property — any change re-renders:
const { user } = state;
return <span>{user.name}</span>;

// Tracks only user.name:
return <span>{state.user.name}</span>;

// Or: select a derived/computed value so re-renders are gated on the boundary
```

See [Dependency Tracking](/react/dependency-tracking) for the full recording rules.

### State leaks between component mounts

**Symptom:** A component mounts, unmounts, and then remounts with stale state from the previous mount — or two independent mounts share state unexpectedly.

**Cause:** Both mounts resolve to the same instance key (`'default'` when there are no `args`). When the first mount releases, the instance disposes and the remount creates a fresh one — but if `keepAlive` is set, the instance persists and the remount picks it back up.

**Fix:** For one private instance per mount, include a per-mount unique value in `args` and use `static key` to make it the identity key. `useId()` returns a stable-per-mount value:

```tsx
class WidgetCubit extends Cubit<WidgetState, { _id: string }> {
  static key = (a: { _id: string }) => a._id;
}

const _id = useId();
const [state] = useBloc(WidgetCubit, { args: { _id } });
```

See [Instance Management](/core/instance-management) and [Passing Inputs](/guide/inputs).

### `autoTrack`, `autoInstance`, `isolated`, or `instanceId` option not found

**Symptom:** TypeScript errors or runtime `undefined` when passing `autoTrack`, `autoInstance`, `isolated`, `instanceId`, or `dependencies` to `useBloc`.

**Cause:** These were v1 or pre-release APIs that were removed. `UseBlocOptions` has exactly four keys: `args`, `select`, `onMount`, `onUnmount`.

**Fix:**

| Old                         | Replacement                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `autoTrack` / no option     | Auto-tracking is the default; opt out with `select`                                  |
| `autoInstance` / `isolated` | Include a per-mount unique value in `args` with `static key` for per-mount instances |
| `instanceId`                | Use `args`-derived identity; include a unique value in `args` + `static key`         |
| `dependencies`              | Renamed to `select` in v2                                                            |

See [Migration from v1](/guide/migration-from-v1) for the full list of renamed/removed options.
