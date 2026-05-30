# useBloc

The `useBloc` hook connects a React component to a state container with optimized re-renders.

```tsx
const [state, bloc] = useBloc(CounterCubit);
```

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

## Return values

| Index | Name    | Description                                                                                    |
| ----- | ------- | ---------------------------------------------------------------------------------------------- |
| 0     | `state` | Current state. In auto-tracking mode (the default) this is a tracking proxy that records which paths you read so re-renders stay scoped to them. In `select` mode it's the raw state object. |
| 1     | `bloc`  | The Cubit instance. Call its methods to drive changes (`bloc.increment()`). The instance itself is not proxied — to make a computed getter drive re-renders, read it inside [`select`](#select) (`select: (state, bloc) => [bloc.total]`). |
| 2     | `ref`   | An advanced-use ref object for component-bloc binding. You almost never need it; destructure just the first two values. |

Typically you destructure just the first two:

```tsx
const [state, counter] = useBloc(CounterCubit);
```

## Choosing an option

`useBloc` takes one optional options object. Every key is independent — reach for the one that matches your need:

| Option       | Type                                         | Reach for it when                                                        |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------ |
| `args`       | the bloc's `Args` type (required if non-`void`) | The bloc needs typed input *and* that input identifies the instance (one instance per `userId`, etc.). |
| `instanceId` | `string \| number`                           | You need a named instance whose key can't be derived from `args`.        |
| `select`     | `(state, bloc) => unknown[]`                 | You want to opt out of auto-tracking and re-render only on specific values. |
| `onMount`    | `(bloc) => void`                             | You need to kick off work once after the bloc is acquired (e.g. fetch).  |
| `onUnmount`  | `(bloc) => void`                             | You need to clean up while the bloc is still alive (e.g. disconnect).    |

::: tip These five are the entire option surface
`UseBlocOptions` has exactly these keys. Two things people expect that are **not** options here:
- **Per-mount instances** are not an option — pass `instanceId: useId()` so each mount gets its own private instance (see [`instanceId`](#instanceid) and [Passing Inputs](/guide/inputs)).
- **Non-serializable handles** (refs, callbacks) are a bloc-level `Deps` concept, not a `useBloc` option; see [Injecting handles (`deps`)](#injecting-handles-deps).

There is no `autoTrack` flag — auto-tracking is the default and you opt out with `select`.
:::

## Options

### `args`

**Type:** `Args` (the bloc's declared Args type) — **Required when the bloc declares `Args != void`; forbidden when `void`**

Pass typed construction data to the bloc. Args are forwarded to the bloc's `init(args)` method before the first state snapshot, and they derive the instance identity by default (different args ⇒ different instance).

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
- **Serializable only** — refs, callbacks, and DOM elements must not go in `args` (they'd produce a new instance every render, and `args` must be JSON-serializable). Put them in the bloc's `Deps` instead — see [Injecting handles (`deps`)](#injecting-handles-deps).
- **Per-component private instances** — to give each mount its own instance (disposed on unmount), pass a per-mount `instanceId` keyed by React's `useId()`:

```tsx
class FormCubit extends Cubit<FormState, FormArgs> {}

// each mount of this component gets its own FormCubit instance
const instanceId = useId();
const [state, cubit] = useBloc(FormCubit, { args: options, instanceId });
```

See [Passing Inputs](/guide/inputs) for the full identity model.

### Injecting handles (`deps`)

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

### `select`

**Type:** `(state: S, bloc: T) => unknown[]`

Provide an explicit dependency array. The component re-renders only when the shallow-compared values change. Setting this disables auto-tracking.

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
This option was called `dependencies` in v1. It was renamed to `select` to avoid confusion with the `deps` (non-serializable handles) lane. There is no compatibility shim. See [Migration from v1](/guide/migration-from-v1) for the full change list.
:::

### `instanceId`

**Type:** `string | number`

Use a named instance instead of the default shared one. Components with the same `instanceId` share the same instance. This is the escape hatch for identities that can't be derived from `args`.

```tsx
const [state] = useBloc(EditorCubit, { instanceId: 'doc-42' });
```

When a bloc declares `Args`, prefer using `args` for identity — the meaningful value keys the instance and feeds the bloc in one step. Reserve `instanceId` for cases where the key genuinely can't be derived from args.

::: tip Need a fresh instance per component mount?
Pass `instanceId: useId()`. `useId()` returns a stable-per-mount value, so every call site gets its own private instance, disposed on unmount. Useful for per-form or per-item cubits. See [Passing Inputs](/guide/inputs).
:::

### `onMount`

**Type:** `(bloc: T) => void`

Called once when the component mounts with the bloc instance.

```tsx
const [state] = useBloc(DataCubit, {
  onMount: (bloc) => bloc.fetchData(),
});
```

### `onUnmount`

**Type:** `(bloc: T) => void`

Called when the component unmounts.

```tsx
const [state] = useBloc(StreamCubit, {
  onUnmount: (bloc) => bloc.disconnect(),
});
```

## Identity and keying

This is the canonical instance-identity precedence for `useBloc`. Other pages defer to this list:

1. **Explicit `instanceId`** on the call — hard override, wins over everything below (pass `useId()` here for a per-mount private instance)
2. **`<BlocProvider>` context id** — inherited from a parent provider when no explicit `instanceId` is given
3. **`static key(args)`** — class-supplied key derived from `args`
4. **Structural hash of `args`** — default when the bloc declares `Args` and no `key` is set
5. **`'default'`** — singleton fallback when the bloc has no `args`, no key, and no provider

Blocs declare explicit identity via a static property:

```ts
class DocumentCubit extends Cubit<DocState, { docId: string; readonly: boolean }> {
  static key = (args: DocumentCubit['args']) => args.docId;
  // docId keys the instance; readonly is config that rides along but doesn't fork instances
}
```

A note on `<BlocProvider>` (step 2 above): it supplies a default `instanceId` to descendant `useBloc` calls that don't pass one of their own, so a subtree can share a scoped instance without threading the key through props. An explicit `instanceId` on the call still wins over it.

```tsx
import { BlocProvider } from '@blac/react';

<BlocProvider instanceId="customer-42">
  <CustomerView /> {/* useBloc(CustomerCubit) here resolves to "customer-42" */}
</BlocProvider>;
```

See [Passing Inputs](/guide/inputs) for the full decision matrix.

::: warning Common mistakes
- **Passing a fresh `select` each render.** The selector must be referentially stable (wrap it in `useCallback`). A new function identity each render re-keys the subscription, which the underlying channel treats as a new consumer.
- **Putting non-serializable values in `args`.** Refs, callbacks, and DOM nodes change identity every render, so a fresh `args` object produces a brand-new instance each time (and `args` must be JSON-serializable). Use the bloc's `Deps` for handles — see [Injecting handles (`deps`)](#injecting-handles-deps).
- **Reaching for `instanceId` when `args` would do.** If the identifying value is also useful inside the bloc, pass it as `args` so it keys the instance *and* feeds `init` in one step. Reserve `instanceId` for keys that aren't part of the bloc's data.
- **Expecting an `autoTrack` or `autoInstance` option.** Neither exists. Opt out of tracking with `select`; get per-mount instances with `instanceId: useId()`.
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

- [Passing Inputs](/guide/inputs) — `args`, `deps`, `instanceId`, per-mount isolation, and the identity model
- [Dependency Tracking](/react/dependency-tracking) — How auto-tracking decides what re-renders
- [Performance](/react/performance) — Splitting readers and writers, anti-patterns
- [Cubit](/core/cubit) — The state container these options connect to
- [Migration from v1](/guide/migration-from-v1) — The `dependencies` → `select` rename and other changes
