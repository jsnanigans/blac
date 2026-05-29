# Cubit

A Cubit is a state container that holds a typed state value and exposes methods to change it. It is the class you subclass for almost everything in BlaC.

## Why a class? (and why "Cubit", not "Bloc")

BlaC has exactly two base types: `StateContainer` (the abstract engine) and `Cubit` (the concrete class you extend). There is **no `Bloc` class** — if you are coming from `flutter_bloc` or v1 docs, the closest equivalent is `Cubit`. We use the name "bloc" colloquially to mean "any state-container instance," but the only thing you ever extend is `Cubit`. See the [glossary](/guide/glossary) for the full StateContainer / Cubit / bloc / instance hierarchy.

The state lives in a **class** for three concrete reasons:

- **State and the logic that changes it live together.** Methods like `addItem` sit next to the state they mutate, so an action is a method call, not a reducer plus an action-type constant plus a dispatch.
- **Derived values are just getters.** A `get total()` is computed on read and tracked automatically — no selector library, no memo wiring (see [Getters](#getters-derived-state)).
- **Instances have identity and a lifecycle.** The registry can create, key, ref-count, and dispose instances. That is what makes shared-vs-scoped state, `args`, and `deps` possible (see [Instance Management](/core/instance-management)).

`Cubit` adds nothing structurally over `StateContainer` — it exists as a real class so `instance instanceof Cubit` works and so you have one obvious thing to extend. For the deeper rationale (why proxy tracking over selectors, why microtask batching, how this compares to Redux/Zustand/MobX), see the [Mental Model](/guide/mental-model).

## Creating a Cubit

Define your state type as a generic parameter and pass the initial state to `super()`.

```ts
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

State must be an object type (`S extends object`). Primitives like `number` or `string` are not supported as state.

::: tip Why arrow-function fields for methods?
Notice `addItem` and `setFilter` are defined as arrow-function class fields, not regular methods. This binds `this` to the instance, so the method keeps working when passed as a callback — `onClick={cubit.addItem}` or destructured `const { addItem } = cubit`. A regular method would lose its `this` in those cases. Use arrow-function fields for any method you intend to pass around; getters and internal helpers can stay regular methods.
:::

## Mutation Methods

State in BlaC is **immutable from the outside**: you never assign to `this.state.x`. Instead you hand the container a *new* state and it diffs the change, marks which paths moved, and wakes only the consumers that read those paths. The three methods below are three ways to produce that next state.

::: info Why immutable?
The diffing that powers smart re-renders (see [Dependency Tracking](/react/dependency-tracking)) needs a previous value and a next value to compare. Mutating in place would leave nothing to compare against, so a mutation would either re-render everything or nothing. Producing a new value on every change is what lets BlaC wake exactly the right consumers.
:::

### `emit(newState)`

Replace the entire state. Use when you have the full new state ready.

```ts
this.emit({ count: 0, label: 'reset' });
```

`emit` is a no-op when the next state is equal to the current one: it short-circuits if `prev === next` by reference, or if the configured equality function (default: shallow per-key `Object.is`) reports them equal. So emitting an object that happens to match the current state will not wake any consumers. Equality is configurable per class via `blac({ equality })` and globally via `configureBlac` — see [Configuration](/core/configuration).

### `update(fn)`

Derive new state from the current state. Use when you need to read the current state to compute the next one.

```ts
this.update((current) => ({ ...current, count: current.count + 1 }));
```

### `patch(partial)`

Deep-merge partial changes into the current state. Use when you want to update some fields without touching others.

```ts
this.patch({ loading: true });
```

The argument type is `DeepPartial<S>`, so nested objects can be patched without spreading the full structure:

```ts
// Only updates user.profile.name — other profile fields are preserved
this.patch({ user: { profile: { name: 'Alice' } } });
```

`patch` skips the update if all provided values are identical to current state (using `Object.is` at the leaf level).

::: warning patch ignores the equality function
The per-class/global equality function applies to `emit` and `update` only. `patch` does its own per-key/per-path `Object.is` filtering instead, so a custom `equality` will not change how `patch` decides what counts as a change.
:::

### Choosing a method

| Scenario                   | Method   |
| -------------------------- | -------- |
| Full state replacement     | `emit`   |
| Derived from current state | `update` |
| Update a few fields        | `patch`  |
| Toggle a boolean           | `update` |
| Reset to initial state     | `emit`   |

::: danger Common mistake: emit with a partial object
`emit` *replaces* the whole state — it does not merge. Passing a partial object silently drops every field you left out:

```ts
// state was { items: [...], filter: 'all' }
this.emit({ filter: 'done' }); // items is now undefined!
```

If you only mean to change some fields, use `patch({ filter: 'done' })`, or read-and-spread with `update((s) => ({ ...s, filter: 'done' }))`. The same trap bites `update` when you build a new object literal and forget to spread the existing keys.
:::

## Getters: derived state

Getters are how you model **derived state** — values computed from other state rather than stored. Prefer a getter over storing a computed field: a stored `total` can drift out of sync with `items`, but a `get total()` is recomputed on every read and can never be stale.

Getters are tracked automatically by the proxy system: a getter reads `this.state.items`, and a component that reads `bloc.total` is treated as if it read `items`. So the component only re-renders when the data the getter actually touched changes — not on every state change.

```ts
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
  const [, cart] = useBloc(CartCubit);
  // only re-renders when total changes, not on every state change
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

### Args: typed construction data

Declare an `Args` type as the second generic parameter to let the bloc receive external construction data. The framework calls `init(args)` **once per instance**, synchronously after `new Type()` and before the first state snapshot.

```ts
class UserCardCubit extends Cubit<UserCardState, { userId: string }> {
  // Constructor stays zero-arg. The framework calls init(args) before first snapshot.
  init(args: { userId: string }) {
    void this.loadUser(args.userId);
  }
}
```

`init(args)` is a protected lifecycle method — not callable from outside the class. It replaces the old `setConfig`/`setProps` patterns.

When `useBloc` is called with `{ args }`, those args are:
- Required at the call site (type error if omitted when `Args != void`)
- Used to derive the instance identity (different args ⇒ different instance)
- Available synchronously in `init` before any consumer sees state

See [Passing Inputs](/guide/inputs) for the full args/identity model.

### `static key`: explicit identity declaration

By default, instance identity is the structural hash of all args. Override with a static property on the class to control exactly which args distinguish one instance from another:

```ts
class DocumentCubit extends Cubit<DocState, { docId: string; readonly: boolean }> {
  static key = (args: DocumentCubit['args']) => args.docId;
  // `readonly` rides along as config but does NOT fork instances
}
```

`static key` is a function `(args: Args) => string`. It is declared once on the class, not at every call site. When absent, BlaC hashes the full args object.

### Deps: non-serializable handles

Declare a `Deps` type as the third generic parameter to receive non-serializable values (refs, callbacks, controller instances) that can't go in `args`. Deps are read lazily via `this.deps.x` and may be `undefined` — always guard.

```ts
class FileUploadCubit extends Cubit<
  UploadState,
  { endpoint: string },                       // Args
  { inputRef?: RefObject<HTMLInputElement> }  // Deps
> {
  init(args: { endpoint: string }) {
    this.endpoint = args.endpoint;
  }

  openPicker() {
    this.deps.inputRef?.current?.click?.();   // lazy read, may be undefined
  }
}
```

**Key properties of deps:**
- **Never key identity** — different refs don't fork the instance
- **Per-consumer merged** — each `useBloc` call contributes its own slice; the bloc sees the union
- **Live** — updated after each commit; may change over time

### `onDepsChanged(next, prev)`

For handles that require initialization when they arrive (a canvas element, a rich-text-editor controller), implement `onDepsChanged`. It fires after each deps merge with the new and previous combined views:

```ts
class CanvasRendererCubit extends Cubit<
  RenderState,
  { sceneId: string },
  { canvas?: HTMLCanvasElement; controller?: RteController }
> {
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
}
```

`onDepsChanged` is optional — blocs that don't declare it just read `this.deps.x` lazily. When declared, it gives the bloc clean acquire/release edges without any consumer-side cleanup wiring.

::: danger Common mistakes with args and deps
- **Non-serializable value in `args`.** Args are hashed to derive instance identity; a function, ref, or class instance in `args` either throws (functions) or produces a fresh hash every render, spawning a new instance each time. Put non-serializable handles in `deps` instead.
- **Two consumers writing the same `deps` key.** Deps are merged per consumer into one view. If two `useBloc` call sites both supply `deps.controller`, the bloc sees one of them (last writer for that key) — decide a single owner.
- **Reading `this.deps.x` without guarding.** A dep may legitimately be `undefined` (no consumer has supplied it yet, or it unmounted). Always use optional chaining, as in `this.deps.inputRef?.current`.

See [Passing Inputs](/guide/inputs) for the full identity/merge model and [Best Practices](/guide/best-practices) for the judgment on which lane to reach for.
:::

## Protected APIs

These are available inside your Cubit class but not from the outside:

- `this.state` — read the current state
- `this.init(args)` — lifecycle called once by the framework before first snapshot (optional; override when `Args` is declared)
- `this.onDepsChanged(next, prev)` — lifecycle called after each `deps` merge (optional; override when `Deps` is declared)
- `this.onSystemEvent(event, handler)` — listen to lifecycle events (see [System Events](/core/system-events))
- `this.depend(OtherClass)` — declare a dependency on another state container (see [Bloc Communication](/core/bloc-communication))

## Public properties

| Property          | Type              | Description                            |
| ----------------- | ----------------- | -------------------------------------- |
| `state`           | `Readonly<S>`     | Current state value                    |
| `isDisposed`      | `boolean`         | Whether the instance has been disposed |
| `name`            | `string`          | Display name (defaults to class name)  |
| `instanceId`      | `string`          | Unique instance identifier             |
| `createdAt`       | `number`          | Creation timestamp                     |
| `hydrationStatus` | `HydrationStatus` | Current hydration phase (`'idle'` \| `'hydrating'` \| `'hydrated'` \| `'error'`); see [Persistence](/plugins/persistence) |

## Async methods

Cubits handle async operations naturally. Model loading/error state explicitly and guard against stale responses:

```ts
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

::: tip Form validation pattern
Cubits work well for form state. Use `patch` for field updates and getters for validation:

```ts
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
- [Passing Inputs](/guide/inputs) — the full args / deps / instanceId identity model
- [Glossary](/guide/glossary) — StateContainer vs Cubit vs bloc vs instance, and other terms
