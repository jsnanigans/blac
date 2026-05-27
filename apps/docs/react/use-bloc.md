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
): [state: ExtractState<T>, bloc: InstanceType<T>, ref: ComponentRef];
```

## Return values

| Index | Name    | Description                                                                                    |
| ----- | ------- | ---------------------------------------------------------------------------------------------- |
| 0     | `state` | Current state snapshot. In auto-tracking mode, this is a Proxy that records property access.   |
| 1     | `bloc`  | The Cubit instance. Call methods on it (`bloc.increment()`). Also proxied for getter tracking. |
| 2     | `ref`   | Internal component ref. Rarely needed outside of advanced use cases.                           |

Typically you destructure just the first two:

```tsx
const [state, counter] = useBloc(CounterCubit);
```

## Options

### `args`

**Type:** `Args` (the bloc's declared Args type) — **Required when the bloc declares `Args != void`; forbidden when `void`**

Pass typed construction data to the bloc. Args are forwarded to the bloc's `init(args)` method before the first state snapshot, and they derive the instance identity by default (different args ⇒ different instance).

```tsx
class UserCardCubit extends Cubit<UserCardState, { userId: string }> {
  init(args: { userId: string }) {
    void this.loadUser(args.userId);
  }
}

// args is required and type-checked; omitting it is a compile error
const [state] = useBloc(UserCardCubit, { args: { userId } });
```

- **Identity:** different `args` values produce different instances. By default identity is the structural hash of all args. Override with `static key` on the class.
- **Serializable only** — refs, callbacks, and DOM elements belong in the `deps` lane.
- **Per-component private instances** — combine with `autoInstance: true` to give each mount its own instance, disposed on unmount:

```tsx
const [state, cubit] = useBloc(FormCubit, { args: options, autoInstance: true });
```

See [Passing Inputs](/guide/inputs) for the full identity model.

### `deps`

**Type:** `{ [key: string]: unknown }` — **Optional**

Inject non-serializable handles (refs, stable callbacks, controller instances) that the bloc reads lazily. Unlike `args`, `deps` never affect instance identity and are never passed to `init`.

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const onComplete = useCallback(() => { /* ... */ }, []);

const [state, cubit] = useBloc(FileUploadCubit, {
  args: { endpoint },
  deps: { inputRef, onComplete },
});
```

The bloc declares the `Deps` type and reads via `this.deps.x` (may be `undefined` — always guard):

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

**Multi-consumer merge:** when multiple components share the same instance and each passes disjoint `deps` keys, their slices are shallow-merged into `bloc.deps`. One component contributing `{ inputRef }` and another contributing `{ onSubmit }` results in `bloc.deps === { inputRef, onSubmit }`. A dev warning fires if two consumers provide the same key (last write wins).

For handles that need to trigger initialization on arrival (e.g. a canvas ref), implement `onDepsChanged` on the bloc — see [Cubit](/core/cubit).

::: tip Avoid raw inline callbacks in deps
An inline callback (`onComplete={() => …}`) gets a new identity every render. Captured once in a dep, the bloc holds a stale closure. Prefer:
1. **Callback inversion (best):** expose state; let the component call its fresh callback from its own `useEffect`.
2. **Stabilize with `useCallback`** before passing.
3. **Push via an event** — call a bloc method from an effect.
:::

### `autoTrack`

**Type:** `boolean` — **Default:** `true`

Controls whether auto-tracking is enabled. Set to `false` to disable proxy-based tracking — the component re-renders on every state change.

```tsx
// action-only component — doesn't read state
const [, counter] = useBloc(CounterCubit, { autoTrack: false });
```

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

::: warning Breaking change
This option was called `dependencies` in v1. It was renamed to `select` to avoid confusion with the new `deps` (non-serializable handles) lane. There is no compatibility shim.
:::

### `instanceId`

**Type:** `string | number`

Use a named instance instead of the default shared one. Components with the same `instanceId` share the same instance. This is the escape hatch for identities that can't be derived from `args`.

```tsx
const [state] = useBloc(EditorCubit, { instanceId: 'doc-42' });
```

When a bloc declares `Args`, prefer using `args` for identity — the meaningful value keys the instance and feeds the bloc in one step. Reserve `instanceId` for cases where the key genuinely can't be derived from args.

### `autoInstance`

**Type:** `boolean` — **Default:** `false`

When `true`, each component mount gets its own private instance, keyed by React's `useId()`. The instance is disposed when the component unmounts. Useful for per-form or per-item cubits.

```tsx
const [state, cubit] = useBloc(FormCubit, { args: options, autoInstance: true });
```

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

Instance identity is resolved in this precedence order:

1. **Explicit `instanceId`** — hard override
2. **`autoInstance: true`** — per-mount instance via `useId()`
3. **`static key(args)`** → **structural hash of `args`** — default when the bloc declares `Args`
4. **`<BlocProvider>` context id** — inherited from a parent provider
5. **`'default'`** — singleton fallback

Blocs declare explicit identity via a static property:

```ts
class DocumentCubit extends Cubit<DocState, { docId: string; readonly: boolean }> {
  static key = (args: DocumentCubit['args']) => args.docId;
  // docId keys the instance; readonly is config that rides along but doesn't fork instances
}
```

See [Passing Inputs](/guide/inputs) for the full decision matrix.

## Lifecycle

1. **Mount:** `acquire(BlocClass)` creates or retrieves the instance, incrementing the ref count
2. **`init(args)` called** (once, if the bloc declares `Args`) before the first state snapshot
3. **`deps` merged** in a commit effect; `onDepsChanged` fires if declared
4. **Render:** `useSyncExternalStore` subscribes to state changes using the selected tracking mode
5. **Re-render:** Only triggered when tracked state properties or `select` values change
6. **Unmount:** `release(BlocClass)` decrements the ref count. At zero, the instance is disposed (unless `keepAlive`)

## Concurrent mode

`useBloc` is built on React's `useSyncExternalStore`, making it safe for concurrent features like Suspense and transitions. State reads are consistent within a single render.

See also: [Passing Inputs](/guide/inputs), [Dependency Tracking](/react/dependency-tracking), [Performance](/react/performance)
