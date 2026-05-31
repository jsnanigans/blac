# Tracking

Tracking is how BlaC knows which consumers care about a given state change. Instead of re-running every observer on every change, BlaC records exactly which leaves of the state each consumer reads, then wakes only the consumers whose leaves actually moved.

This page explains the mechanism: what gets recorded, how the recording proxy works, how getters fold into it, and how it maps onto re-renders. If you only want the React-facing rules, jump to [Dependency Tracking](/react/dependency-tracking); for the design rationale, see the [Mental Model](/guide/mental-model).

::: warning The standalone `tracked()` function was removed in v2
There used to be a `tracked()` helper you could call explicitly. It is gone — it leaked internal details and is no longer needed. Tracking is now **automatic and unconditional**: there is no `@tracked` decorator, no `autoTrack` option, and nothing to opt into. The recording happens for you whenever a consumer reads state. To see which paths trigger re-renders at runtime, use the [BlaC DevTools](/plugins/devtools). To narrow or opt out of tracking in React, use the `select` option (see below).
:::

## What tracking is

Every state container holds an immutable state object. When you `emit`/`update`/`patch`, the container produces a _new_ state and diffs it against the previous one, marking the set of **paths** that changed — for example `user.name` or `items`. A path is a dotted route to a leaf in the state tree.

Separately, each consumer (a `useBloc` call, a plugin, a manual subscriber) declares an **interest**: the set of paths it reads. On each change, the container intersects "paths that changed" with "paths this consumer reads." If the intersection is empty, the consumer stays asleep.

The clever part is that you never write the interest set by hand. BlaC observes which paths you read and builds it for you.

## The read-recording proxy

In React's auto-tracking mode, the `state` returned by `useBloc` is not the raw state object — it is a `Proxy` that records every property read. Each time your component reads `state.user.name`, the proxy adds the path `user.name` to a set. After render commits, that set becomes the consumer's interest.

```tsx
function UserAvatar() {
  const [state] = useBloc(UserCubit);
  return <img src={state.avatarUrl} />;
  // recorded interest: { "avatarUrl" }
  // a change to state.name or state.email will not re-render this component
}
```

The recording follows a few rules that are worth knowing because they explain otherwise-surprising behavior:

| Rule                                                    | Effect                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Leaf-only (maximal) recording**                       | Reading `a.b.c` records just `a.b.c`, and drops the parent `a.b` from the set. Two consumers reading sibling leaves (`user.name` vs `user.address`) are isolated — one does not wake when the other's sibling changes.  |
| **Reading a whole object keeps it as the leaf**         | If you read `state.user` and stop there (no deeper key), `user` is your leaf and you wake on any change inside it. Read deeper to narrow.                                                                               |
| **Primitives short-circuit**                            | Reading a primitive, `null`, or `undefined` returns it as-is and records the path you took to reach it.                                                                                                                 |
| **Nested objects/arrays return child proxies**          | They record into the same set, and are cached per read, so `state.user === state.user` within one render.                                                                                                               |
| **Iteration coarsens**                                  | `for..of`, `.map`, `.find`, `.reduce` record the container path (e.g. `users`) but not per-index paths; callbacks receive the raw values. So a list component re-renders when the list changes, which is what you want. |
| **`Map` / `Set` / `Date` / class instances are leaves** | They are not wrapped. A change to one is detected as a reference change at its own path — so you must replace the whole value (a new `Map`), not mutate it in place, for the change to be seen.                         |

::: danger Common mistake: non-plain values are not deeply tracked
Only plain object literals and arrays are proxied. If you store a `Map`, `Set`, `Date`, or a class instance in state and mutate it in place, no path is marked and nothing re-renders. Replace the value with a new instance instead:

```ts
// Won't re-render — same reference, no path marked
this.state.tags.add('new'); // never do this anyway; state is immutable

// Will re-render — new reference at the `tags` path
this.update((s) => ({ ...s, tags: new Set([...s.tags, 'new']) }));
```

:::

## Getters do not auto-track

A getter on the bloc is **derived state**: it reads other state and computes a value. Getters are the right way to model a value derived from state — a `get total()` is recomputed on every read and can never drift from `items`.

But a getter does **not** participate in auto-tracking. The recording proxy wraps only the `state` value that `useBloc` returns — never the bloc instance. When a getter runs it reads `this.state`, the _raw_ state, so reading `bloc.total` in a component records **nothing**:

```ts
class CartCubit extends Cubit<{ items: CartItem[]; coupon: string | null }> {
  get total() {
    // reads this.state.items — the RAW state, not the consumer's proxy
    return this.state.items.reduce((sum, i) => sum + i.price, 0);
  }
}
```

```tsx
function Total() {
  const [state, cart] = useBloc(CartCubit);
  return <span>{cart.total}</span>;
  // ⚠️ recorded interest: {} — reading `cart.total` tracks nothing,
  // so this will NOT re-render when `items` changes.
}
```

To make a derived value reactive, either read its **source paths through `state`**, or name the getter in a `select`:

```tsx
// A — touch the source path through `state`, so it joins the tracked set
function Total() {
  const [state, cart] = useBloc(CartCubit);
  void state.items;
  return <span>{cart.total}</span>;
}

// B — depend on the getter explicitly; `select` gates re-renders and you
//     still read the value off the bloc
function Total() {
  const [, cart] = useBloc(CartCubit, {
    select: (state, cart) => [cart.total],
  });
  return <span>{cart.total}</span>;
}
```

See [Dependency Tracking](/react/dependency-tracking#what-does-not-register-a-dependency) for the full list of what does and doesn't register.

## When tracking matters (and when it doesn't)

Tracking exists to make re-renders precise. It matters most when:

- A single container holds many fields and different components read different subsets.
- A container updates frequently (typing, dragging, streaming) but each tick changes only a slice.

It matters less for a tiny container where every consumer reads everything — there the diff is cheap and the wake set is "everyone" regardless.

::: info Tracking outside React
Auto-tracking via the recording proxy is a **React render-time** feature, driven by `useBloc`. The lower-level container API (`channel.subscribe(interest, cb)`) lets you declare an interest set directly. The convenience helper [`watch`](/core/watch) deliberately does **not** auto-track: it subscribes to _all_ paths and fires on every change. If you need selective observation outside React, subscribe to the channel with an explicit interest, or filter inside your callback.
:::

## How tracking relates to re-renders

Putting it together, one update flows like this:

1. A method calls `emit` / `update` / `patch`. The container diffs old vs new state and marks the changed paths.
2. Changes are coalesced per microtask flush, so several synchronous mutations produce one notification (see [System Events](/core/system-events)).
3. On flush, each consumer's recorded interest is intersected with the changed paths.
4. Consumers with a non-empty intersection re-render (React) or have their callback invoked. The rest stay asleep.
5. On the next render, the proxy re-records the interest from scratch — so if a component conditionally reads different fields, the tracked set adapts automatically.

The practical takeaway: read exactly the state you render, keep state immutable, and BlaC will re-render the minimum. To opt out of auto-tracking for a specific consumer — for example to derive a value array and re-render only on shallow changes — use the `select` option on `useBloc` (see [Dependency Tracking](/react/dependency-tracking#the-select-escape-hatch)).

## See also

- [Dependency Tracking](/react/dependency-tracking) — the React-facing rules, `select`, and limitations
- [Performance](/react/performance) — splitting readers from writers and avoiding over-reads
- [Mental Model](/guide/mental-model) — why proxy tracking beats selectors and memoization
- [watch](/core/watch) — observing state outside React

## Troubleshooting

For the full FAQ see [Troubleshooting](/guide/troubleshooting). Below are tracking-specific problems.

### Mutating a `Map`, `Set`, or `Date` doesn't trigger a re-render

**Symptom:** You call `.set()`, `.add()`, or another mutating method on a `Map`/`Set`/`Date` stored in state, but the component doesn't re-render.

**Cause:** The tracker wraps plain objects and arrays only. A `Map`, `Set`, `Date`, or class instance is treated as a single leaf — the tracker detects changes as a **reference change** at that path, never as an internal mutation.

**Fix:** Replace the whole value with a new instance so the reference changes:

```ts
// No-op — same Map reference, nothing tracked
this.state.tags.add('new'); // never mutate state directly anyway

// Correct — new Set reference, change detected at the `tags` path
this.update((s) => ({ ...s, tags: new Set([...s.tags, 'new']) }));
```

### Getter on `bloc` never wakes the component

**Symptom:** A component reads `bloc.computedValue` (a getter) and never re-renders when the getter's inputs change.

**Cause:** The recording proxy wraps `state` only — the bloc instance is never proxied. Reading a getter off the bloc runs internally against `this.state` (the raw state), so nothing is recorded in the consumer's interest set.

**Fix:** Touch the getter's source paths through `state` during render, or depend on the getter via `select`:

```tsx
// Touch the source path so the interest set includes it
function Total() {
  const [state, cart] = useBloc(CartCubit);
  void state.items; // records `items`
  return <span>${cart.total}</span>;
}
```

See [Getters do not auto-track](#getters-do-not-auto-track) above and [Performance: Getters as computed properties](/react/performance#pattern-getters-as-computed-properties).
