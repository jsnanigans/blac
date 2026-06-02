---
title: Cubit
description: A Cubit is the state container you subclass for almost everything in BlaC — typed state, emit/update/patch mutations, derived getters, and the args/deps lifecycle.
---

A Cubit is a state container that holds a typed state value and exposes methods to change it. It is the class you subclass for almost everything in BlaC. Every signature on this page is quoted from the `@blac/core` source.

```ts
class Cubit<
  S extends object = any,
  Args = void,
  Deps extends object = Record<string, never>,
> extends StateContainer<S, Args, Deps> {}
```

| Type parameter | Default                 | Description                                                                                                                    |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `S`            | `any`                   | The state shape. Must be an object type (`S extends object`); primitives like `number` or `string` are not supported as state. |
| `Args`         | `void`                  | Serializable construction data delivered to `init(args)`. See [Args](#args-typed-construction-data).                           |
| `Deps`         | `Record<string, never>` | Non-serializable handles injected per consumer and read via `this.deps`. See [Deps](#deps-non-serializable-handles).           |

`Cubit` adds nothing structurally over `StateContainer` — it exists as a real class so `instance instanceof Cubit` works and so you have one obvious thing to extend.

## Why a class? (and why "Cubit", not "Bloc")

BlaC has exactly two base types: `StateContainer` (the abstract engine) and `Cubit` (the concrete class you extend). There is **no `Bloc` class** — if you are coming from `flutter_bloc` or v1 docs, the closest equivalent is `Cubit`. We use the name "bloc" colloquially to mean "any state-container instance," but the only thing you ever extend is `Cubit`. See the [glossary](/guide/glossary) for the full StateContainer / Cubit / bloc / instance hierarchy.

The state lives in a **class** for three concrete reasons:

- **State and the logic that changes it live together.** Methods like `addItem` sit next to the state they mutate, so an action is a method call, not a reducer plus an action-type constant plus a dispatch.
- **Derived values are just getters.** A `get total()` is computed on read and tracked automatically — no selector library, no memo wiring (see [Getters](#getters-derived-state)).
- **Instances have identity and a lifecycle.** The registry can create, key, ref-count, and dispose instances. That is what makes shared-vs-scoped state, `args`, and `deps` possible (see [Instance Management](/core/instance-management)).

For the deeper rationale (why proxy tracking over selectors, why microtask batching, how this compares to Redux/Zustand/MobX), see the [Mental Model](/guide/mental-model).

## Constructor

Define your state type as a generic parameter and pass the initial state to `super()`.

```ts
constructor(initialState: S, options?: StructuralContainerOptions)
```

| Parameter      | Type                         | Required | Description                                                                                      |
| -------------- | ---------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `initialState` | `S`                          | yes      | The starting state. Must be an object.                                                           |
| `options`      | `StructuralContainerOptions` | no       | Low-level container options (custom per-path equality, skeleton hints). Most subclasses omit it. |

**Returns:** a new instance. The registry always builds instances zero-arg, so your subclass constructor takes no arguments — it only calls `super(initialState)`.

**Behavior.** Runs before `init(args)`. Use it solely to set the initial state; args-derived setup belongs in [`init`](#init-args).

```ts twoslash
import { Cubit } from '@blac/core';

interface TodoState {
  items: string[];
  filter: 'all' | 'active' | 'done';
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ items: [], filter: 'all' });
  }

  addItem = (text: string) => {
    this.update((s) => ({ ...s, items: [...s.items, text] }));
  };

  setFilter = (filter: TodoState['filter']) => {
    this.patch({ filter });
  };
}
```

:::tip[Why arrow-function fields for methods?]
Notice `addItem` and `setFilter` are defined as arrow-function class fields, not regular methods. This binds `this` to the instance, so the method keeps working when passed as a callback — `onClick={cubit.addItem}` or destructured `const { addItem } = cubit`. A regular method would lose its `this` in those cases. Use arrow-function fields for any method you intend to pass around; getters and internal helpers can stay regular methods.
:::

## Mutation methods

State in BlaC is **immutable from the outside**: you never assign to `this.state.x`. Instead you hand the container a _new_ state and it diffs the change, marks which paths moved, and wakes only the consumers that read those paths. The three methods below are three ways to produce that next state.

:::note[Why immutable?]
The diffing that powers smart re-renders (see [Dependency Tracking](/react/dependency-tracking)) needs a previous value and a next value to compare. Mutating in place would leave nothing to compare against, so a mutation would either re-render everything or nothing. Producing a new value on every change is what lets BlaC wake exactly the right consumers.
:::

### `emit(next)`

Replace the entire state. Use when you have the full new state ready.

```ts
emit(next: S): void
```

| Parameter | Type | Required | Description                                                                           |
| --------- | ---- | -------- | ------------------------------------------------------------------------------------- |
| `next`    | `S`  | yes      | The complete new state. Replaces the current state wholesale — it does **not** merge. |

**Returns:** `void`.

**Behavior.** `emit` is a no-op when the next state is equal to the current one: it short-circuits if `prev === next` by reference, or if the configured equality function (default: shallow per-key `Object.is`) reports them equal. So emitting an object that happens to match the current state will not wake any consumers. Equality is configurable per class via `blac({ equality })` and globally via `configureBlac` — see [Configuration](/core/configuration).

```ts twoslash
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
  label: string;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'start' });
  }

  reset = () => {
    this.emit({ count: 0, label: 'reset' }); // full replacement
  };
}
```

:::danger[Common mistake: emit with a partial object]
`emit` _replaces_ the whole state — it does not merge. Passing a partial object silently drops every field you left out. If you only mean to change some fields, use `patch`, or read-and-spread with `update`. See [Troubleshooting](#emit-silently-drops-fields).
:::

### `update(fn)`

Derive new state from the current state. Use when you need to read the current state to compute the next one.

```ts
update(fn: (state: S) => S): void
```

| Parameter | Type              | Required | Description                                                                  |
| --------- | ----------------- | -------- | ---------------------------------------------------------------------------- |
| `fn`      | `(state: S) => S` | yes      | A reducer receiving the current state and returning the complete next state. |

**Returns:** `void`.

**Behavior.** `update` is sugar over `emit`: it calls `this.emit(fn(currentState))`, so it inherits `emit`'s equality short-circuit. Your `fn` must return the **full** next state — the same "no merge" rule as `emit` applies, so spread the existing state when you only change a few fields.

```ts twoslash
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((current) => ({ ...current, count: current.count + 1 }));
  };
}
```

### `patch(partial)`

Deep-merge partial changes into the current state. Use when you want to update some fields without touching others.

```ts
patch(partial: DeepPartial<S>): void
```

| Parameter | Type             | Required | Description                                                                                                                                                               |
| --------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `partial` | `DeepPartial<S>` | yes      | The subtree to merge. Nested objects can be patched without spreading the full structure; arrays, `Date`, `Map`, `Set`, and class instances are treated as atomic leaves. |

**Returns:** `void`.

**Behavior.** `patch` deep-merges along plain-object branches and value-filters the result: a path is marked dirty only if its value actually changed. It skips the update entirely if all provided top-level values are already `Object.is`-equal to the current state (a shallow pre-spread no-op check), and `deepMerge` also returns the previous state by reference on a deep no-op.

:::caution[patch ignores the equality function]
The per-class/global equality function applies to `emit` and `update` only. `patch` does its own per-key/per-path `Object.is` filtering instead, so a custom `equality` will not change how `patch` decides what counts as a change.
:::

```ts twoslash
import { Cubit } from '@blac/core';

interface ProfileState {
  loading: boolean;
  user: { profile: { name: string; age: number } };
}

class ProfileCubit extends Cubit<ProfileState> {
  constructor() {
    super({ loading: false, user: { profile: { name: '', age: 0 } } });
  }

  startLoad = () => {
    this.patch({ loading: true });
  };

  rename = (name: string) => {
    // Only updates user.profile.name — age and other fields are preserved
    this.patch({ user: { profile: { name } } });
  };
}
```

### Choosing a method

| Scenario                   | Method   |
| -------------------------- | -------- |
| Full state replacement     | `emit`   |
| Derived from current state | `update` |
| Update a few fields        | `patch`  |
| Toggle a boolean           | `update` |
| Reset to initial state     | `emit`   |

## Getters: derived state

Getters are how you model **derived state** — values computed from other state rather than stored. Prefer a getter over storing a computed field: a stored `total` can drift out of sync with `items`, but a `get total()` is recomputed on every read and can never be stale.

A getter has no signature fence of its own — it is plain TypeScript on your subclass. The one rule that is easy to miss:

:::caution[Reading a getter off the bloc does not subscribe]
Reading a getter **off the bloc instance** (`bloc.total`) does **not** subscribe a component to the state it derives from — auto-tracking only records reads on the `state` proxy, never on the bloc. To re-render when a getter's inputs change, read those inputs through `state` in the render body (e.g. `state.items`), or name the getter in a `select`: `useBloc(CartCubit, { select: (state, bloc) => [bloc.total] })`. See [Dependency Tracking](/react/dependency-tracking#what-does-not-register-a-dependency).
:::

```ts twoslash
import { Cubit } from '@blac/core';

interface CartItem {
  price: number;
}

class CartCubit extends Cubit<{ items: CartItem[] }> {
  constructor() {
    super({ items: [] });
  }

  get total() {
    return this.state.items.reduce((sum, item) => sum + item.price, 0);
  }

  get isEmpty() {
    return this.state.items.length === 0;
  }

  addItem = (item: CartItem) => {
    this.update((s) => ({ items: [...s.items, item] }));
  };
}
```

```tsx
function CartSummary() {
  const [state, cart] = useBloc(CartCubit);
  // re-renders when items change because we read state.items via the getter's input
  void state.items.length;
  return <span>Total: ${cart.total}</span>;
}
```

## Lifecycle, args, and deps

A Cubit instance moves through a fixed sequence, and the input hooks slot into specific points:

1. **Construct** — `new Type()` runs your constructor, which calls `super(initialState)`. The constructor takes no arguments; the registry always builds instances zero-arg.
2. **`init(args)`** — called **once**, synchronously, after construction and before any consumer reads the first snapshot. This is where args-derived setup belongs.
3. **`onDepsChanged(next, prev)`** — called whenever the merged per-consumer `deps` view changes (and once more on dispose, with everything cleared).
4. **Mutations** — `emit` / `update` / `patch` run as your methods are called.
5. **Dispose** — when the last consumer releases the instance (unless `keepAlive`); fires the `dispose` system event.

Steps 2 and 3 are the two input lanes: **args** for serializable identity data, **deps** for live non-serializable handles. The rest of this section covers each.

### `init(args)`

Seed args-derived state or kick off loads, once per instance, before the first snapshot.

```ts
protected init(args: Args): void
```

| Parameter | Type   | Required | Description                                                                                             |
| --------- | ------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `args`    | `Args` | yes      | The args passed at acquire time (`useBloc(Type, { args })`). `void` when no `Args` generic is declared. |

**Returns:** `void`.

**Behavior.** A protected lifecycle method — not callable from outside the class. The framework calls it **once per instance**, synchronously after `new Type()` and before the first state snapshot is read. It replaces the old `setConfig`/`setProps` patterns. When `useBloc` is called with `{ args }`, those args are required at the call site (type error if omitted when `Args != void`), used to derive the instance identity (different args ⇒ different instance), and available synchronously in `init` before any consumer sees state. See [Passing Inputs](/guide/inputs) for the full args/identity model.

```ts twoslash
import { Cubit } from '@blac/core';

interface UserCardState {
  name: string;
  loading: boolean;
}

class UserCardCubit extends Cubit<UserCardState, { userId: string }> {
  constructor() {
    super({ name: '', loading: false });
  }

  // Constructor stays zero-arg. The framework calls init(args) before first snapshot.
  protected init(args: { userId: string }) {
    this.patch({ loading: true });
    void this.loadUser(args.userId);
  }

  private async loadUser(_id: string) {
    /* ...fetch... */
  }
}
```

### `static key`: explicit identity declaration

By default, instance identity is the structural hash of all args. Override with a static property on the class to control exactly which args distinguish one instance from another:

```ts
static key: (args: Args) => string
```

**Behavior.** A function `(args: Args) => string` declared once on the class, not at every call site. When absent, BlaC hashes the full args object. Args not referenced by `key` ride along as config but do **not** fork instances.

```ts twoslash
import { Cubit } from '@blac/core';

interface DocState {
  title: string;
}

class DocumentCubit extends Cubit<
  DocState,
  { docId: string; readonly: boolean }
> {
  constructor() {
    super({ title: '' });
  }

  static key = (args: DocumentCubit['args']) => args?.docId ?? '';
  // `readonly` rides along as config but does NOT fork instances
}
```

### Deps: non-serializable handles

Declare a `Deps` type as the third generic parameter to receive non-serializable values (refs, callbacks, controller instances) that can't go in `args`. Deps are read lazily via `this.deps.x` and may be `undefined` — always guard.

```ts
get deps(): Readonly<Deps>
```

**Returns:** a `Readonly<Deps>` view — the union of every consumer's contributed slice.

**Key properties of deps:**

- **Never key identity** — different refs don't fork the instance.
- **Per-consumer merged** — each `useBloc` call contributes its own slice; the bloc sees the union (last writer wins on key collisions).
- **Live** — updated after each commit; may change over time. May legitimately be `undefined`, so always optional-chain.

```ts twoslash
import { Cubit } from '@blac/core';

interface UploadState {
  progress: number;
}

interface InputRef {
  current?: { click?: () => void };
}

class FileUploadCubit extends Cubit<
  UploadState,
  { endpoint: string }, // Args
  { inputRef?: InputRef } // Deps
> {
  private endpoint = '';

  constructor() {
    super({ progress: 0 });
  }

  protected init(args: { endpoint: string }) {
    this.endpoint = args.endpoint;
  }

  openPicker() {
    this.deps.inputRef?.current?.click?.(); // lazy read, may be undefined
  }
}
```

### `onDepsChanged(next, prev)`

For handles that require initialization when they arrive (a canvas element, a rich-text-editor controller), implement `onDepsChanged`. It fires after each deps merge with the new and previous combined views.

```ts
protected onDepsChanged(next: Readonly<Deps>, prev: Readonly<Deps>): void
```

| Parameter | Type             | Required | Description                                                                   |
| --------- | ---------------- | -------- | ----------------------------------------------------------------------------- |
| `next`    | `Readonly<Deps>` | yes      | The merged deps view after this reconcile.                                    |
| `prev`    | `Readonly<Deps>` | yes      | The merged view before it. Compare the two to detect arrivals and departures. |

**Returns:** `void`.

**Behavior.** Optional — blocs that don't declare it just read `this.deps.x` lazily. When declared, it gives the bloc clean acquire/release edges without any consumer-side cleanup wiring. It also fires once on dispose with every key cleared (so `next.x` is `undefined`), giving you a teardown edge.

```ts twoslash
import { Cubit } from '@blac/core';

interface RenderState {
  ready: boolean;
}

interface RteController {
  destroy(): void;
}

class CanvasRendererCubit extends Cubit<
  RenderState,
  { sceneId: string },
  { canvas?: HTMLCanvasElement; controller?: RteController }
> {
  constructor() {
    super({ ready: false });
  }

  onDepsChanged(next: this['deps'], prev: this['deps']) {
    if (next.canvas && next.canvas !== prev.canvas) {
      this.initRenderer(next.canvas);
    }
    if (!next.canvas && prev.canvas) {
      this.disposeRenderer();
    }
    if (next.controller !== prev.controller) {
      this.bindController(next.controller);
    }
  }

  private initRenderer(_c: HTMLCanvasElement) {}
  private disposeRenderer() {}
  private bindController(_c?: RteController) {}
}
```

:::danger[Common mistakes with args and deps]

- **Non-serializable value in `args`.** Args are hashed to derive instance identity; a function, ref, or class instance in `args` either throws (functions) or produces a fresh hash every render, spawning a new instance each time. Put non-serializable handles in `deps` instead. See [Troubleshooting](#a-new-instance-is-created-on-every-render).
- **Two consumers writing the same `deps` key.** Deps are merged per consumer into one view. If two `useBloc` call sites both supply `deps.controller`, the bloc sees one of them (last writer for that key) — decide a single owner.
- **Reading `this.deps.x` without guarding.** A dep may legitimately be `undefined` (no consumer has supplied it yet, or it unmounted). Always use optional chaining, as in `this.deps.inputRef?.current`.

See [Passing Inputs](/guide/inputs) for the full identity/merge model and [Best Practices](/guide/best-practices) for the judgment on which lane to reach for.
:::

## `depend(Type)`

Declare a cross-bloc dependency. See [Bloc Communication](/core/bloc-communication) for the full pattern.

```ts
protected depend<T extends StateContainerConstructor>(
  Type: T,
  defaultArgs?: ExtractArgs<T>,
): DepHandle<T>
```

| Parameter     | Type                                  | Required | Description                                                                                         |
| ------------- | ------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `Type`        | `T extends StateContainerConstructor` | yes      | The state-container class to depend on.                                                             |
| `defaultArgs` | `ExtractArgs<T>`                      | no       | Args identifying which keyed instance to resolve when an accessor is called without its own `args`. |

**Returns:** a `DepHandle<T>` with two accessors — `handle.untracked()` resolves the dep against the registry lazily on each call (`this.user.untracked()`), and `handle.track()` does the same _plus_ subscribes the reading React consumer. Both take an optional `{ args }` to override `defaultArgs` per call. See [Auto-tracking with `.track()`](/core/bloc-communication#auto-tracking-with-track).

**Behavior.** Records the dependency, then returns the handle. Resolving on every call keeps the surface immune to dep-instance churn. Note: `.untracked()` does **not** auto-resubscribe to the dep's channel — consumers that need reactive updates use `.track()` (or subscribe explicitly via `useBloc`'s tracker). A naive always-on auto-bridge would cycle on mutual deps, which is why tracking is opt-in.

```ts twoslash
import { Cubit } from '@blac/core';

class AuthCubit extends Cubit<{ userId: string | null }> {
  constructor() {
    super({ userId: null });
  }
}

class ProfileCubit extends Cubit<{ name: string }> {
  private auth = this.depend(AuthCubit);

  constructor() {
    super({ name: '' });
  }

  get currentUserId() {
    return this.auth.untracked().state.userId; // lazy resolve
  }
}
```

## Protected APIs

These are available inside your Cubit class but not from the outside:

- `this.state` — read the current state.
- [`this.init(args)`](#init-args) — lifecycle called once before first snapshot (override when `Args` is declared).
- [`this.onDepsChanged(next, prev)`](#ondepschanged-next-prev) — lifecycle called after each `deps` merge (override when `Deps` is declared).
- `this.onSystemEvent(event, handler)` — listen to lifecycle events (see [System Events](/core/system-events)).
- [`this.depend(OtherClass)`](#depend-type) — declare a dependency on another state container (see [Bloc Communication](/core/bloc-communication)).

## Public properties

| Property          | Type              | Description                                                                                                               |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `state`           | `Readonly<S>`     | Current state value                                                                                                       |
| `isDisposed`      | `boolean`         | Whether the instance has been disposed                                                                                    |
| `name`            | `string`          | Display name (defaults to class name)                                                                                     |
| `instanceId`      | `string`          | Unique instance identifier                                                                                                |
| `createdAt`       | `number`          | Creation timestamp                                                                                                        |
| `hydrationStatus` | `HydrationStatus` | Current hydration phase (`'idle'` \| `'hydrating'` \| `'hydrated'` \| `'error'`); see [Persistence](/plugins/persistence) |

## Async methods

Cubits handle async operations naturally. Model loading/error state explicitly and guard against stale responses:

```ts twoslash
import { Cubit } from '@blac/core';

interface Article {
  id: string;
}

declare const api: { fetchArticles(category: string): Promise<Article[]> };

interface ArticleState {
  articles: Article[];
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
}

class ArticleCubit extends Cubit<ArticleState> {
  private requestId = 0;

  constructor() {
    super({ articles: [], status: 'idle', error: null });
  }

  load = async (category: string) => {
    const id = ++this.requestId;
    this.patch({ status: 'loading', error: null });

    try {
      const articles = await api.fetchArticles(category);
      if (id !== this.requestId) return; // stale response
      this.emit({ articles, status: 'success', error: null });
    } catch (e) {
      if (id !== this.requestId) return;
      this.patch({ status: 'error', error: String(e) });
    }
  };
}
```

The `requestId` pattern discards responses from superseded requests. Each new `load()` call increments the ID, and callbacks from previous calls see a mismatch and bail out.

:::tip[Form validation pattern]
Cubits work well for form state. Use `patch` for field updates and getters for validation:

```ts twoslash
import { Cubit } from '@blac/core';

class FormCubit extends Cubit<{ email: string; password: string }> {
  constructor() {
    super({ email: '', password: '' });
  }

  setEmail = (email: string) => this.patch({ email });
  setPassword = (password: string) => this.patch({ password });

  get errors() {
    const errors: Record<string, string> = {};
    if (!this.state.email.includes('@')) errors.email = 'Invalid email';
    if (this.state.password.length < 8) errors.password = 'Too short';
    return errors;
  }

  get isValid() {
    return Object.keys(this.errors).length === 0;
  }
}
```

:::

## See also

- [Mental Model](/guide/mental-model) — why class-based containers, proxy tracking, and microtask batching
- [Best Practices](/guide/best-practices) — how to scope blocs, model async, and choose args vs deps
- [Passing Inputs](/guide/inputs) — the full args / deps identity model
- [Glossary](/guide/glossary) — StateContainer vs Cubit vs bloc vs instance, and other terms

## Troubleshooting

For the full FAQ see [Troubleshooting](/guide/troubleshooting). Below are the Cubit-specific problems.

### `emit` silently drops fields

**Symptom:** After calling `emit`, some state fields are `undefined` even though you didn't intend to clear them.

**Cause:** `emit` **replaces** the entire state — it does not merge. Passing a partial object drops every field you omit.

**Fix:** Use `patch` for partial updates, or spread existing state in `update`:

```ts twoslash
import { Cubit } from '@blac/core';

class TodoCubit extends Cubit<{
  items: string[];
  filter: 'all' | 'done';
}> {
  constructor() {
    super({ items: [], filter: 'all' });
  }

  // state: { items: [...], filter: 'all' }
  bad = () => {
    // @ts-expect-error — items is required; emit replaces the whole state
    this.emit({ filter: 'done' }); // items would be undefined!
  };

  // Fix A — patch merges only the listed fields
  fixA = () => this.patch({ filter: 'done' });

  // Fix B — update reads current state first
  fixB = () => this.update((s) => ({ ...s, filter: 'done' }));
}
```

See [Mutation methods: choosing a method](#choosing-a-method) above.

### A new instance is created on every render

**Symptom:** DevTools shows a new bloc instance being created and destroyed on every render, or the circuit-breaker throws "max instances exceeded."

**Cause:** A non-serializable value (function, ref, class instance) is in `args`. Because `args` must be JSON-serializable, a fresh object reference each render produces a different hash and therefore a different instance key.

**Fix:** Move non-serializable values to the bloc's `Deps` lane — they never affect instance identity:

```tsx
// Non-serializable in args → new instance every render (throws in dev)
useBloc(UploadCubit, { args: { onComplete: () => {} } });

// Serializable identity in args, handle in deps
useBloc(UploadCubit, { args: { endpoint: '/upload' } });
// (wire the callback via deps — see Cubit Deps and Passing Inputs)
```

See [Deps: non-serializable handles](#deps-non-serializable-handles) and [Troubleshooting: instance identity](/guide/troubleshooting#instance-identity-too-many--too-few).
