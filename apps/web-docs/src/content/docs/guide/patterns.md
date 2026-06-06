---
title: Patterns & Recipes
description: Concrete, copy-pasteable patterns for async operations, named instances, cross-bloc communication, plugins, keep-alive, and getter-based computed values.
---

Common patterns for structuring BlaC applications. Each pattern is drawn from real examples in the codebase.

:::note[Recipes vs. principles]
This page is a **cookbook**: concrete, copy-pasteable solutions to recurring problems. For the _principles_ behind these choices — when to reach for one approach over another, and the smells to avoid — see [Best Practices](/guide/best-practices). Rule of thumb: come here when you know _what_ you want to build; go there when you're deciding _whether_ an approach is sound.
:::

## Async operations

### Loading / error / success

Model async state explicitly. Use a request ID to handle race conditions when multiple requests overlap.

```ts
interface FeedState {
  articles: Article[];
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
}

class FeedCubit extends Cubit<FeedState> {
  private requestId = 0;

  constructor() {
    super({ articles: [], status: 'idle', error: null });
  }

  loadArticles = async (category: string) => {
    const id = ++this.requestId;
    this.patch({ status: 'loading', error: null });

    try {
      const articles = await api.fetchArticles(category);
      // Ignore stale responses
      if (id !== this.requestId) return;
      this.emit({ articles, status: 'success', error: null });
    } catch (e) {
      if (id !== this.requestId) return;
      this.patch({ status: 'error', error: String(e) });
    }
  };
}
```

The `requestId` pattern is simpler than AbortController for most cases. Each new call invalidates previous in-flight responses. Modelling async state as an explicit `status` enum (rather than scattered `isLoading`/`error` booleans) is a principle covered in [Best Practices](/guide/best-practices).

### Hydration-aware loading

When using the [persistence plugin](/plugins/persistence), state may arrive asynchronously from IndexedDB. Override `init` and `await this.$blac.hydration.wait()` before making API calls, so you don't overwrite restored values with a stale fetch:

```ts
class SettingsCubit extends Cubit<SettingsState> {
  constructor() {
    super({ theme: 'light', locale: 'en' });
  }

  protected override async init() {
    await this.$blac.hydration.wait();
    // Now this.state has restored values from IndexedDB
    await this.refreshFromServer();
  }
}
```

`init` is the framework's once-per-instance setup hook — a protected method called after construction, before the first state snapshot, with the bloc's `args`. `$blac.hydration.wait()` resolves once the persistence plugin finishes restoring (or immediately if nothing is persisted); see [system events](/core/system-events) for the `hydrationChanged` event that drives it.

## Action-only components

Components that only trigger actions and never display state don't need tracking at all. Opt out of auto-tracking by passing a `select` that returns a constant empty array — it has nothing that can change, so the component never re-renders:

```tsx
const selectNothing = () => [];

function QuickAdd() {
  const [, todo] = useBloc(TodoCubit, { select: selectNothing });

  return <button onClick={() => todo.addItem('New item')}>Add Item</button>;
}
```

This component renders once and never re-renders, regardless of state changes.

:::tip[Keep `select` referentially stable]
Define the selector outside the component (or wrap it in `useCallback`). A fresh function every render re-keys the subscription. There is no `autoTrack` option — passing `select` _is_ how you opt out. See [Performance](/react/performance) for the full reader/writer split rationale and [useBloc](/react/use-bloc) for `select` semantics.
:::

## Named instances

When you need multiple independent instances of the same Cubit class, make the distinguishing name an `args` field and key on it with `static key`. Each name gets its own instance with its own state and lifecycle.

```tsx
class FormCubit extends Cubit<FormState, { section: string }> {
  static key = (a: FormCubit['args']) => a.section;
}

function FormPage() {
  return (
    <>
      <FormSection section="billing" />
      <FormSection section="shipping" />
    </>
  );
}

function FormSection({ section }: { section: string }) {
  const [state, form] = useBloc(FormCubit, { args: { section } });
  // Each section has independent state
  return (
    <input
      value={state.email}
      onChange={(e) => form.setEmail(e.target.value)}
    />
  );
}
```

Named instances are ref-counted independently. When all components using `"billing"` unmount, that instance is disposed while `"shipping"` stays alive.

The name (`"billing"` / `"shipping"`) is just as much `args` data as a `userId` or `docId` would be — there is no separate key channel. See [Passing Inputs](/guide/inputs) for the full identity model.

## Persisting state outside React

Use [`watch`](/core/watch) to observe state changes from non-React code — saving to localStorage, syncing to a server, or feeding analytics. The callback receives the **bloc instance** (read its state via `bloc.state`), fires once immediately, then on every change:

```ts
import { watch } from '@blac/core';

watch(TodoCubit, (bloc) => {
  localStorage.setItem('todos', JSON.stringify(bloc.state.items));
});
```

`watch` resolves the instance via `ensure` (no ref count, so it does not keep the bloc alive) and observes all of its state.

To stop watching, either call the returned function or return `watch.STOP` from the callback:

```ts
const stop = watch(AuthCubit, (bloc) => {
  if (bloc.state.user) {
    analytics.identify(bloc.state.user.id);
    return watch.STOP; // one-shot
  }
});
```

## Cross-bloc communication

The recipes below are the common shapes; [Bloc Communication](/core/bloc-communication) is the full reference for `depend()` and its lifecycle caveats, and [Best Practices](/guide/best-practices) covers when cross-bloc coupling is a smell versus a clean dependency.

### Reading state from another bloc

Use `depend()` to declare a dependency. It returns a handle that resolves the instance from the registry on demand — `.untracked()` for a plain read.

```ts
class CartCubit extends Cubit<CartState> {
  private shipping = this.depend(ShippingCubit);

  get total() {
    const subtotal = this.state.items.reduce((sum, i) => sum + i.price, 0);
    return subtotal + this.shipping.untracked().state.rate;
  }
}
```

### Auto-tracking a dependency with `.track()`

A plain `.untracked()` read (`this.shipping.untracked().state.rate`) is _not_ reactive on its own — a component reading `cart.total` only re-renders on shipping changes if it _also_ calls `useBloc(ShippingCubit)`. Calling `.track()` on the handle removes that ceremony: the component reading the getter auto-subscribes to the dependency too.

```ts
class CartCubit extends Cubit<CartState> {
  private shipping = this.depend(ShippingCubit);

  get total() {
    const subtotal = this.state.items.reduce((sum, i) => sum + i.price, 0);
    const [shippingState] = this.shipping.track(); // opt in to cross-bloc reactivity
    return subtotal + shippingState.rate;
  }
}
```

```tsx
// The component subscribes to CartCubit only — yet re-renders when shipping changes too.
function CartTotal() {
  const [, cart] = useBloc(CartCubit);
  return <strong>${cart.total.toFixed(2)}</strong>;
}
```

`.track()` is render-aware (outside render it degrades to live values, no subscription), tracks the dependency's own getters transitively, and supports conditional and mutual dependencies. See [Auto-tracking with `.track()`](/core/bloc-communication#auto-tracking-with-track) for the full reference.

### Triggering side effects across blocs

Call methods on dependencies to coordinate behavior:

```ts
class ChannelCubit extends Cubit<ChannelState> {
  private notifications = this.depend(NotificationCubit);

  receiveMessage = (message: Message) => {
    this.patch({ messages: [...this.state.messages, message] });
    this.notifications.untracked().incrementUnread(this.state.channelId);
  };
}
```

### Lazy instance creation

When a dependency might not exist yet, use `borrowSafe` to check and `acquire` to create on demand:

```ts
import { borrowSafe, acquire } from '@blac/core';

class ChannelCubit extends Cubit<ChannelState> {
  private ensureUserCubit(userId: string) {
    const { error } = borrowSafe(UserCubit, { args: { userId } });
    if (!error) return;
    acquire(UserCubit, { args: { userId } }); // keyed by userId; init seeds state
  }

  receiveMessage = (message: Message) => {
    this.ensureUserCubit(message.userId);
    // ...
  };
}
```

## Saving state on disposal

Use `onSystemEvent('dispose')` to persist data when an instance is cleaned up:

```ts
class ChannelCubit extends Cubit<ChannelState> {
  constructor() {
    super({ channel: null, messages: [] });
    this.onSystemEvent('dispose', () => {
      if (this.state.channel) {
        persistenceService.save(this.state.channel.id, this.state.messages);
      }
    });
  }
}
```

## Custom plugins

Plugins observe lifecycle events across all state containers. Use them for cross-cutting concerns like analytics, logging, or monitoring. Every hook takes the `PluginContext` first; the bloc the event is about is `ctx.container`, and `prev`/`next` in `onStateChange` are the **state objects**, not the bloc:

```ts
const analyticsPlugin: BlacPlugin = {
  name: 'analytics',
  version: '1.0.0',

  onCreated(ctx) {
    analytics.track('bloc_created', { name: ctx.container?.name });
  },

  onStateChange(ctx, prev, next, paths) {
    analytics.track('state_changed', {
      name: ctx.container?.name,
      from: prev,
      to: next,
    });
  },

  onDestroyed(ctx) {
    analytics.track('bloc_disposed', { name: ctx.container?.name });
  },
};

getPluginManager().install(analyticsPlugin);
```

See [Plugin Authoring](/core/plugins) for the full hook reference, the `paths` parameter, and the `environment` option (skip a plugin outside `development`, for example).

## Keep-alive instances

For app-wide singletons that should never be disposed (auth, theme, feature flags), use `keepAlive`:

```ts
@blac({ keepAlive: true })
class ThemeCubit extends Cubit<{ mode: 'light' | 'dark' }> {
  constructor() {
    super({ mode: 'light' });
  }

  toggle = () => {
    this.patch({ mode: this.state.mode === 'light' ? 'dark' : 'light' });
  };
}
```

The instance is created on first use and stays alive for the entire app session, even if all components using it unmount. `keepAlive` only disables the _auto-dispose at refcount zero_; the instance is still disposable via `clear()` or a forced release. See [Configuration](/core/configuration) for the option and [Instance Management](/core/instance-management) for how ref-counting and auto-dispose interact.

## Per-component private instances

When a component needs its _own_ instance — never shared with siblings, disposed when it unmounts — add a per-mount unique value to `args` and key on it with `static key`. `useId()` is the idiomatic source of a stable-per-mount value:

```tsx
import { useId } from 'react';

class UploadCubit extends Cubit<UploadState, { _id: string }> {
  static key = (a: UploadCubit['args']) => a._id;
}

function UploadWidget() {
  const _id = useId(); // unique per mount, stable across this mount's renders
  const [state, upload] = useBloc(UploadCubit, { args: { _id } });

  return <progress value={state.progress} max={100} />;
}
```

Two `<UploadWidget />` siblings get two independent instances; each is disposed on its own unmount. This is the supported replacement for the removed `autoInstance`/`instanceId` options. Any real identity data goes in the same `args` object alongside `_id` — see [Passing Inputs](/guide/inputs).

## Getter-based computed values

Define getters on your Cubit for derived state instead of storing the computed value in state. One caveat: auto-tracking records reads on the `state` proxy only, so reading a getter off the `bloc` instance (`todo.activeCount`) does **not** register a dependency by itself. Wake the consumer either by reading the getter's source path through `state` in render, or by depending on the getter via `select`. See [Performance: getters as computed properties](/react/performance#pattern-getters-as-computed-properties).

```ts
class TodoCubit extends Cubit<TodoState> {
  get activeCount() {
    return this.state.items.filter((t) => !t.done).length;
  }

  get completedCount() {
    return this.state.items.filter((t) => t.done).length;
  }

  get filteredItems() {
    if (this.state.filter === 'all') return this.state.items;
    const isDone = this.state.filter === 'done';
    return this.state.items.filter((t) => t.done === isDone);
  }
}
```

```tsx
function TodoStats() {
  const [state, todo] = useBloc(TodoCubit);
  // Read the getter's source path through `state` so the consumer wakes,
  // then call the getter for the computed result.
  void state.items;
  return (
    <span>
      {todo.activeCount} active, {todo.completedCount} done
    </span>
  );
}

// Or depend on the getters explicitly with `select` (each runs the getter):
function TodoStatsSelected() {
  const [, todo] = useBloc(TodoCubit, {
    select: (_, bloc) => [bloc.activeCount, bloc.completedCount],
  });
  return (
    <span>
      {todo.activeCount} active, {todo.completedCount} done
    </span>
  );
}
```

:::tip[Derive, don't duplicate]
Storing `activeCount` _in state_ alongside `items` means every mutation has to remember to update both — they drift. A getter computes on read and can never go stale. Best Practices treats "derive with getters, don't store computed values" as a core principle.
:::

## More recipes

The patterns above cover the core primitives. The recipes below handle common
higher-level scenarios — each is a self-contained page with a twoslash-checked
Cubit block and a plain TSX component example:

- [Optimistic Update](/guide/recipes/optimistic-update) — apply a mutation immediately, roll back on error
- [Debounce](/guide/recipes/debounce) — collapse rapid input into a single deferred action
- [Undo / Redo](/guide/recipes/undo-redo) — past/future state stacks with a history cap
- [Pagination](/guide/recipes/pagination) — offset/page and cursor-based infinite scroll
- [WebSocket Subscription](/guide/recipes/websocket) — persistent server-pushed connections
- [Form Validation](/guide/recipes/form-validation) — touched map, getter-derived errors, async submit
- [Reset to Initial State](/guide/recipes/reset-to-initial) — one-call full or partial reset

## See also

- [Best Practices](/guide/best-practices) — the principles behind these recipes
- [Performance](/react/performance) — reader/writer splitting and proxy-cost mechanics
- [Bloc Communication](/core/bloc-communication) — full `depend()` reference and lifecycle caveats
- [Instance Management](/core/instance-management) — ref-counting, `keepAlive`, and auto-dispose
- [Passing Inputs](/guide/inputs) — `args`, `deps`, and per-mount instances
- [Cubit](/core/cubit) — `init`, `emit`/`patch`/`update`, and getters
