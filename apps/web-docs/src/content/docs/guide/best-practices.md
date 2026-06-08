---
title: Best Practices
description: The opinionated do/don't principles for shaping state, choosing input lanes, modeling async work, and avoiding the habits that quietly cause bugs.
---

This page is about judgment, not mechanics. It collects the opinionated do/don't principles that keep a BlaC codebase predictable as it grows: how to shape state, how to choose between the input lanes, how to model async work, and which habits quietly cause bugs.

If you want copy-paste recipes for these situations, see [Patterns & Recipes](/guide/patterns) — that page is the concrete how-to. This page is the _why_ behind the choices.

:::tip[How to read this page]
Each section states a principle, gives a one-line rationale, and shows a good-vs-bad pair. The [Anti-patterns](#anti-patterns) section at the end is a quick-reference of the mistakes, each with its fix.
:::

## Cubit vs Bloc: there is only Cubit

**Principle:** reach for `Cubit`. BlaC does not ship a separate `Bloc` class.

If you come from `flutter_bloc`, you may expect two base classes — a `Cubit` you call methods on, and an event-driven `Bloc` you dispatch events to. BlaC has one concrete base: [`Cubit`](/core/cubit), which extends the abstract `StateContainer`. You change state by calling methods that call `emit` / `update` / `patch`. There is no `add(event)` dispatch layer.

```ts
// Good — a method per intent, called directly
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.patch({ count: this.state.count + 1 });
  reset = () => this.emit({ count: 0 });
}
```

```ts
// Bad — there is no Bloc class to extend, and no event enum to dispatch
class CounterBloc extends Bloc<CounterState, CounterEvent> {
  /* does not exist */
}
```

If you genuinely want an event-sourced log (every intent recorded as a value before it is reduced), model it explicitly inside a Cubit — keep an `events: Event[]` array in state and a reducer method — rather than looking for a framework `Bloc`. For the lower-level engine that BlaC is built on, see [DirtyTalk](/dirtytalk/).

## State shape: flat, serializable, and free of derived values

**Principle:** state holds the _source of truth_; everything computable from it is a getter, not a stored field.

Two rules keep state honest:

1. **Prefer flat and serializable.** Deeply nested or non-serializable state (class instances, `Map`/`Set`/`Date`, DOM nodes, functions) is harder to diff, harder to persist, and is treated as an opaque leaf by auto-tracking — see [Dependency Tracking](/react/dependency-tracking). `patch` accepts a `DeepPartial<S>` so shallow shapes update cleanly. Deep nesting is supported, but flat shapes are easier to reason about; reach for nesting only when the domain truly is nested.
2. **Never store what you can derive.** A derived value stored in state is a second source of truth you must remember to keep in sync. Expose it as a getter instead — auto-tracking records the state paths the getter reads, and `select` is available when a consumer should wake only when the computed result changes.

```ts
// Good — totals are getters; state has one source of truth
interface CartState {
  items: { id: string; price: number; qty: number }[];
}

class CartCubit extends Cubit<CartState> {
  constructor() {
    super({ items: [] });
  }
  get subtotal() {
    return this.state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }
  get itemCount() {
    return this.state.items.length;
  }
}
```

```ts twoslash
// Bad — subtotal/itemCount stored alongside items; every mutation must
// recompute them by hand, and one missed update silently desyncs the UI
interface CartState {
  items: { id: string; price: number; qty: number }[];
  subtotal: number; // derived — do not store
  itemCount: number; // derived — do not store
}
```

:::note[Why getters re-render correctly]
Auto-tracking records the _leaf paths_ a render reads. A getter that reads `this.state.items` is recorded as a dependency on `items`; when `items` changes the getter is re-evaluated and consumers re-render. A getter that no consumer reads costs nothing. See [Patterns & Recipes](/guide/patterns#getter-based-computed-values) for the recipe.
:::

## `args` vs `deps`: the decision rule

**Principle:** put **serializable identity in `args`** and **non-serializable handles in `deps`**. Every instance is keyed from its `args` — there is no separate key input.

This is the single most common source of confusion, so commit the rule to memory:

| You have…                                                                                 | Use                                         | Because                                                                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Serializable data that defines _which_ instance (a `userId`, an `endpoint`, a filter set) | **`args`**                                  | Args are hashed into the instance key — same args share one instance, different args fork. |
| A non-serializable handle (a `useRef`, a stable `useCallback`, an external API object)    | **`deps`**                                  | Deps never key identity and are merged per-consumer; the bloc reads them lazily.           |
| An opaque key that isn't real bloc data (a per-mount id, an externally-managed token)     | **a synthetic `args` field + `static key`** | Add the value to `args` (e.g. `_id`) and key on it; nothing else forks the instance.       |

The mechanics of all three live in [Passing Inputs to Blocs](/guide/inputs); this is just the judgment. Note that `deps` is **not** a `useBloc` option — a consumer contributes its slice from a mount effect via the `APPLY_DEPS` / `REMOVE_DEPS_OWNER` handles from `@blac/core` (the examples below import them); see [Wiring deps from a component](/guide/inputs#wiring-deps-from-a-component).

```tsx
// Good — userId is serializable identity (args); inputRef is a handle (deps).
// deps is NOT a useBloc option: wire it from a mount effect (post-commit).
const inputRef = useRef<HTMLInputElement>(null);
const ownerId = useId();
const [state, cubit] = useBloc(UserCardCubit, { args: { userId } });
useEffect(() => {
  cubit[APPLY_DEPS](ownerId, { inputRef });
  return () => cubit[REMOVE_DEPS_OWNER](ownerId);
}, [cubit, inputRef, ownerId]);
```

```tsx
// Bad — a ref in args destabilizes the instance key, forcing a brand-new
// instance on every render (refs are not serializable)
const [state, cubit] = useBloc(UserCardCubit, {
  args: { userId, inputRef }, // inputRef belongs in deps
});
```

:::caution[The inline-callback pitfall]
An inline callback (`onDone={() => save()}`) has a new function identity every render. If you capture it once in `deps`, the bloc holds the **first** closure forever and later calls fire stale logic. Prefer, best first:

1. **Callback inversion** — expose result state from the bloc and let the component invoke its own fresh callback in a `useEffect` (`useEffect(() => { if (doneId) onDone(doneId); }, [doneId, onDone])`).
2. **Stabilize with `useCallback`** before passing into `deps`.
3. **Push via a bloc method from an effect** (`useEffect(() => cubit.setOnDone(cb), [cb])`).

See the full treatment in [Passing Inputs to Blocs](/guide/inputs#the-callback-staleness-gotcha).
:::

### Per-component private instances

When a component needs its _own_ instance with its own lifecycle (disposed on unmount), add a per-mount unique value to `args` keyed by React's `useId()` and select it with `static key` — each mount gets a fresh private instance.

```ts
// Good — a synthetic `_id` keys the instance; endpoint rides along as config
class FileUploadCubit extends Cubit<
  UploadState,
  { endpoint: string; _id: string }
> {
  static key = (a: FileUploadCubit['args']) => a._id;
  constructor() {
    super({ status: 'idle', progress: 0 });
  }
  protected init(args: { endpoint: string; _id: string }) {
    this.endpoint = args.endpoint;
  }
}
```

```tsx
// Each FileUpload mount owns a private instance
const _id = useId();
const [state, upload] = useBloc(FileUploadCubit, { args: { endpoint, _id } });
```

:::tip[One source of per-mount identity]
`useId()` returns a stable-per-mount value, so keying on it gives each mount a private instance that lives and dies with it. For _named_ sections that should share an instance by name (e.g. `"billing"` vs `"shipping"` form sections), make that name a real `args` field and key on it the same way. See [Instance Management](/core/instance-management) for the registry mechanics.
:::

## Async, loading, and error state

**Principle:** model async outcomes as explicit state, guard against stale responses, and never block `init`.

### Make status a value, not a guess

Don't infer "loading" from `data === null`. Hold an explicit status so the UI can distinguish _never loaded_, _loading_, _error_, and _empty success_.

```ts
// Good — explicit, exhaustive status
interface FeedState {
  articles: Article[];
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
}
```

```ts
// Bad — overloaded null forces the UI to guess
interface FeedState {
  articles: Article[] | null; // null = loading? error? empty? unknown.
}
```

### Guard against overlapping requests

Two in-flight loads can resolve out of order and clobber each other. A monotonic request id is simpler than `AbortController` and ignores stale responses:

```ts
class FeedCubit extends Cubit<FeedState> {
  private requestId = 0;
  constructor() {
    super({ articles: [], status: 'idle', error: null });
  }
  load = async (category: string) => {
    const id = ++this.requestId;
    this.patch({ status: 'loading', error: null });
    try {
      const articles = await api.fetch(category);
      if (id !== this.requestId) return; // a newer load superseded us
      this.emit({ articles, status: 'success', error: null });
    } catch (e) {
      if (id !== this.requestId) return;
      this.patch({ status: 'error', error: String(e) });
    }
  };
}
```

### Don't block in `init`

`init(args)` runs **once, synchronously, before the first state snapshot** — so consumers get correct initial state with no flash. That makes it the wrong place to `await`. Kick the async work off (fire-and-forget) from `init` and let the loading status carry the rest.

```ts
// Good — init seeds sync state and starts the load; it does not await
class UserCubit extends Cubit<UserState, { userId: string }> {
  protected init(args: { userId: string }) {
    void this.load(args.userId); // returns immediately; status shows 'loading'
  }
}
```

```ts
// Bad — init cannot be awaited by the framework; consumers render before
// this resolves, and an unawaited rejection is swallowed
class UserCubit extends Cubit<UserState, { userId: string }> {
  protected async init(args: { userId: string }) {
    this.emit(await api.fetchUser(args.userId)); // blocks nothing useful
  }
}
```

:::tip[Hydrating from storage]
If state arrives asynchronously from the persistence plugin, await `this.$blac.hydration.wait()` inside a fire-and-forget `init` before touching the network, so you don't overwrite restored values. See [Persistence](/plugins/persistence) and the [hydration-aware loading recipe](/guide/patterns#hydration-aware-loading).
:::

## Cross-bloc dependencies: `this.depend`, and avoid cycles

**Principle:** declare cross-bloc reads with `this.depend(Other)`; keep the dependency graph a DAG.

`this.depend(OtherCubit)` returns a handle that resolves the dependency from the registry on each call. Use `.untracked()` to _read_ another bloc's state inside a getter or to _call_ its methods, and `.track()` when the read should re-render the consumer (below).

```ts
// Good — CartCubit depends on ShippingCubit, one direction only
class CartCubit extends Cubit<CartState> {
  private shipping = this.depend(ShippingCubit);
  get total() {
    return this.subtotal + this.shipping.untracked().state.rate;
  }
}
```

```ts
// Bad — a cycle: Cart depends on Shipping AND Shipping depends on Cart.
// Reading total now risks infinite recursion, and disposal order is undefined.
class ShippingCubit extends Cubit<ShippingState> {
  private cart = this.depend(CartCubit); // closes the loop — don't
}
```

:::caution[Two gotchas with `depend`]

- **`depend` resolves via `ensure`, which does not hold a reference.** A depended-on bloc can be disposed out from under you if nothing else keeps it alive. For app-wide collaborators, mark the dependency `@blac({ keepAlive: true })`.
- **Reading a dependency's state in a constructor is unsafe** — it may not be initialized yet. Read it lazily inside a method or getter, where the getter resolves it on demand.
- **`.untracked()` reads and method calls do not subscribe you.** They give you access, not reactivity. Cross-bloc re-render tracking is opt-in via `.track()` (below); a plain `.untracked()` read only updates if the consumer also subscribes via `useBloc`.

See [Bloc Communication](/core/bloc-communication) for the full lifecycle picture.
:::

**Reach for `.track()` when the cross-bloc read needs to be reactive.** Plain `this.shipping.untracked().state.rate` is a live but _untracked_ read — the consumer only re-renders if it independently subscribes to the dependency. When a getter genuinely derives from another bloc and components should update on its changes, call `.track()` on the handle (`const [shipping] = this.shipping.track()`) instead of duplicating `useBloc(Other)` across every consumer. Keep `.untracked()` for one-off reads and method invocations where you don't want a subscription.

```ts
// Good — the derivation declares its own reactivity; consumers stay simple.
class CartCubit extends Cubit<CartState> {
  private shipping = this.depend(ShippingCubit);
  get total() {
    const [shipping] = this.shipping.track();
    return this.subtotal + shipping.rate;
  }
}
```

This keeps the dependency graph in the blocs (where it's testable) rather than scattering coordinating `useBloc` calls through the view. See [Auto-tracking with `.track()`](/core/bloc-communication#auto-tracking-with-track).

If you find two blocs reaching into each other, that is usually a sign the shared concern belongs in a third bloc both depend on, or that the two should be one. Cross-bloc coupling is a smell worth questioning, not a tool to reach for first.

## Keep components dumb

**Principle:** components read tracked state and call methods. They should not hold derived logic, mutate state, or own business rules.

A component's job is to render the current state and forward intent. Put the _what_ in the bloc (methods, getters) and leave the _how it looks_ in the component. This keeps logic testable without a DOM and keeps re-renders precise.

```tsx
// Good — reads a getter, calls a method; no logic in the view
function CartSummary() {
  const [, cart] = useBloc(CartCubit);
  return (
    <footer>
      <span>{cart.itemCount} items</span>
      <strong>${cart.total.toFixed(2)}</strong>
      <button onClick={cart.checkout}>Checkout</button>
    </footer>
  );
}
```

```tsx
// Bad — totals computed in the view (duplicating bloc logic), and the
// button mutates state through the bloc instance directly
function CartSummary() {
  const [state, cart] = useBloc(CartCubit);
  const total = state.items.reduce((s, i) => s + i.price * i.qty, 0); // belongs in a getter
  return (
    <footer>
      <strong>${total.toFixed(2)}</strong>
      <button onClick={() => (cart.state.items = [])}>Clear</button>{' '}
      {/* never mutate */}
    </footer>
  );
}
```

:::tip[Action-only components]
A component that only triggers actions and never displays state does not need a selector. Do not read from `state`, and auto-tracking records nothing to wake:

```tsx
function QuickAdd() {
  const [, todo] = useBloc(TodoCubit);
  return <button onClick={() => todo.addItem('New')}>Add</button>;
}
```

The deeper performance rationale lives in [Performance](/react/performance).
:::

## Testing mindset

**Principle:** test blocs as plain classes; test components against the registry. Isolate every test.

Because logic lives in the bloc and components stay dumb, most behavior is testable without React — instantiate the Cubit, call methods, assert on `state` and getters. Component tests then verify wiring against an isolated registry so instances never leak between tests.

```ts
// Good — pure bloc test, no DOM
const cart = new CartCubit();
cart.addItem({ id: 'a', price: 10, qty: 2 });
expect(cart.subtotal).toBe(20);
```

Design blocs to be easy to test: deterministic methods, injectable collaborators via `depend`, and no hidden global reads. The full toolkit (registry isolation, stubs, overrides, flushing async updates) is in [Testing Overview](/testing/overview).

## Anti-patterns

A quick-reference of habits to drop, each with the fix. Many of these have a symptom-first entry in [Troubleshooting](/guide/troubleshooting).

### Mutating state in place

Assigning to `this.state.x` (or pushing into an array on `this.state`) bypasses change detection — no diff is computed, no consumer wakes.

```ts
// Bad
this.state.items.push(item);

// Fix — produce a new value through a mutation method
this.patch({ items: [...this.state.items, item] });
```

### Storing derived state

A computed value duplicated into state is a second source of truth that drifts.

```ts
// Bad — total stored and hand-maintained
this.patch({ items: next, total: recompute(next) });

// Fix — expose a getter, store only the source
get total() { return this.state.items.reduce(/* ... */); }
```

### Threading identity outside `args`

When the distinguishing value is _meaningful data_ (a `userId`, a `docId`), it belongs in `args` — args both key the instance and seed `init()` in one step. Don't invent a parallel key channel.

```tsx
// Bad — passing userId as a bare positional/extra arg, separate from args
const [s] = useBloc(UserCardCubit, userId);

// Fix — args key the instance AND seed init() in one step
const [s] = useBloc(UserCardCubit, { args: { userId } });
```

For keys that aren't real bloc data — named sections (`"billing"` / `"shipping"`), externally-supplied ids, or a per-mount `useId()` — add the value as an `args` field and key on it with `static key`. There is no separate `instanceId` channel.

### Raw inline callbacks in `deps`

An inline arrow captured into `deps` freezes the first render's closure.

```tsx
// Bad — new identity each render contributed as a dep; bloc keeps the stale one
useEffect(() => {
  cubit[APPLY_DEPS](ownerId, { onDone: () => save(id) });
}, [cubit, ownerId, id]);

// Fix — invert: expose result state, call your own callback in an effect
const [{ doneId }] = useBloc(UploadCubit, { args });
useEffect(() => {
  if (doneId) onDone(doneId);
}, [doneId, onDone]);
```

### Non-serializable values in `args`

Refs, callbacks, class instances, and `Date`/`Map`/`Set` in `args` produce an unstable instance key — a new instance every render.

```tsx
// Bad — ref in args re-keys the instance on every render
useBloc(UploadCubit, { args: { endpoint, inputRef } });

// Fix — handles go in the deps lane, wired from an effect (not a useBloc option)
const [, cubit] = useBloc(UploadCubit, { args: { endpoint } });
useEffect(() => {
  cubit[APPLY_DEPS](ownerId, { inputRef });
  return () => cubit[REMOVE_DEPS_OWNER](ownerId);
}, [cubit, inputRef, ownerId]);
```

### Opting out of tracking when you don't need to

Reaching for `select` "to be safe" trades automatic, leaf-precise tracking for a hand-maintained dependency array you must keep in sync. Auto-tracking is the default for a reason.

```tsx
// Bad — manual select that you must remember to update when the view reads more
const [s] = useBloc(TodoCubit, { select: (s) => [s.items] });

// Fix — let auto-tracking record exactly what this render reads
const [s] = useBloc(TodoCubit);
```

Use `select` deliberately: to opt a writer-only component _out_ of all re-renders (`() => []`), or to narrow re-renders to a specific computed slice when profiling shows it matters — not as a default. A `select` function must also be referentially stable (wrap it in `useCallback`), or a fresh function each render re-keys the subscription.

## See also

- [Passing Inputs to Blocs](/guide/inputs) — the mechanics of `args` and `deps`
- [Patterns & Recipes](/guide/patterns) — concrete copy-paste recipes for these principles
- [Performance](/react/performance) — re-render mechanics and the cost model
- [Troubleshooting](/guide/troubleshooting) — symptom-first fixes for the anti-patterns above
