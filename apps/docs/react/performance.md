# Performance

BlaC's performance story is **re-render isolation**: each component re-renders only when the specific state it reads changes, and components that read nothing don't re-render at all. This falls out of [auto-tracking](/react/dependency-tracking) — most apps get it for free. This page is for when you want to confirm it's working, push it further, or render large lists efficiently.

::: info Where the gains come from
There is no shared subscription that wakes every consumer. Each `useBloc` call records its own path set and the container wakes only the consumers whose paths intersect a change. So the cost of a state update scales with _how many components read the changed field_, not with _how many components use the container_. The deep "why" lives in [Mental Model](/guide/mental-model).
:::

## How auto-tracking helps

By default, `useBloc` wraps the returned state in a Proxy that records which properties your component reads. Only changes to those properties trigger re-renders.

```tsx
function UserName() {
  const [state] = useBloc(UserCubit);
  return <span>{state.name}</span>;
  // changes to state.email, state.avatar, etc. are ignored
}
```

This happens automatically — no selectors, no memoization, no configuration. For the exact recording rules (and the patterns that quietly over-track), see [Dependency Tracking](/react/dependency-tracking).

## Measuring re-render isolation

Before optimizing, confirm where the re-renders actually are. Three approaches, cheapest first:

**1. Inline render counter (quick, local).**

```tsx
function MyComponent() {
  const renderCount = useRef(0);
  renderCount.current++;

  const [state] = useBloc(MyCubit);
  return (
    <div>
      <span>Renders: {renderCount.current}</span>
      {/* ... */}
    </div>
  );
}
```

::: tip Count in the render body, not in an effect
Increment the ref in the render body. The body runs on every render; `useEffect` runs _after_ commit and can be skipped or batched, so a ref bumped there under-counts. Reading it in the body gives the true render count.
:::

**2. React DevTools Profiler (visual, whole-tree).** Record an interaction and look for components that highlight (re-rendered) when they shouldn't have. A component that lights up on a state change it doesn't read is over-tracking — usually a spread or a whole-object read (see [Common mistakes](#common-mistakes)).

**3. BlaC DevTools (state-change-centric).** The [BlaC DevTools](/plugins/devtools) show which instances are live and when each state change fires, so you can correlate a render spike with the emit that caused it and spot unexpected instance churn. The [Logging Plugin](/plugins/logging) additionally warns on rapid create/destroy lifecycles in the console.

## Pattern: Split readers and writers

Separate components that _display_ state from components that only _trigger_ actions. A component that reads no state property records an empty path set and is therefore never woken by state changes — no option required.

```tsx
function Counter() {
  return (
    <>
      <CountDisplay />
      <CountButtons />
    </>
  );
}

function CountDisplay() {
  const [state] = useBloc(CounterCubit);
  return <span>{state.count}</span>;
}

function CountButtons() {
  // Destructures only the bloc instance — never touches `state`.
  const [, counter] = useBloc(CounterCubit);
  return (
    <>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
    </>
  );
}
```

`CountButtons` never re-renders on count changes because it reads nothing from `state`. The recipe form of this pattern lives in [Patterns: action-only components](/guide/patterns); this page owns the _why_.

## Pattern: `select` for coarse, derived control

When you want re-renders driven by a **computed value** rather than the raw fields auto-tracking would pick up, reach for `select`. It opts out of auto-tracking and re-renders only when the returned array changes per-index.

```tsx
function CartBadge() {
  const [, cart] = useBloc(CartCubit, {
    select: (_, bloc) => [bloc.isEmpty],
  });
  return cart.isEmpty ? null : <Badge />;
}
```

This re-renders only when `isEmpty` flips, not on every item added. Keep `select` referentially stable (`useCallback` or module scope) — see [Dependency Tracking: the `select` escape hatch](/react/dependency-tracking#the-select-escape-hatch).

::: tip Auto-track vs `select`: when to narrow vs derive
Reach for `select` to depend on a **derived/computed** value or to pin an explicit dependency set. To make a component _not_ re-render, don't pass an option — just don't read state. There is no `autoTrack` flag; the mode is chosen by the presence or absence of `select`.
:::

## Pattern: Getters as computed properties

Define getters on your Cubit for derived values. A getter centralizes the computation and keeps components thin.

```ts
class CartCubit extends Cubit<{ items: CartItem[] }> {
  get total() {
    return this.state.items.reduce((sum, i) => sum + i.price, 0);
  }
}
```

::: warning Getters on `bloc` are not auto-tracked
Auto-tracking records paths through the **`state` proxy only**. Reading `bloc.total` does _not_ register a dependency on `items`, so a component that reads only `bloc.total` won't re-render when items change. There are two correct ways to consume a getter:

```tsx
// 1. Read the getter's source path through `state` so the consumer wakes,
//    then call the getter for the computed result.
function CartTotal() {
  const [state, cart] = useBloc(CartCubit);
  void state.items; // track the source path
  return <span>${cart.total}</span>;
}

// 2. Or depend on the getter explicitly with `select` (it runs the getter).
function CartTotalSelected() {
  const [, cart] = useBloc(CartCubit, {
    select: (_, bloc) => [bloc.total],
  });
  return <span>${cart.total}</span>;
}
```

Option 1 wakes whenever `items` changes; option 2 wakes only when `total` actually changes value. Either is preferable to reading the raw array and reducing it inside the component.
:::

## List-rendering patterns

Iteration **coarsens**: `.map`/`.find`/`for..of` record the array's entry path (`items`) but not per-index paths, and their callbacks receive raw values. So a component that maps over `state.items` re-renders whenever the array changes — including when a single item's field changes (which produces a new array via immutable update).

For long lists where individual rows update independently, isolate each row in its own component that reads only its own item. There are two idiomatic shapes:

**Map to keys, render rows by id.** The list reads the ids (changes when items are added/removed/reordered); each row reads its own item.

```tsx
function TodoList() {
  const [state] = useBloc(TodoCubit);
  return (
    <ul>
      {state.items.map((item) => (
        <TodoRow key={item.id} id={item.id} />
      ))}
    </ul>
  );
}

function TodoRow({ id }: { id: string }) {
  // `args` keys identity; each row instance reads only its own item.
  const [item] = useBloc(TodoItemCubit, { args: { id } });
  return <li className={item.done ? 'done' : ''}>{item.text}</li>;
}
```

Here each row's `TodoItemCubit` is keyed by `args: { id }`, so toggling one row wakes only that row. See [Passing Inputs](/guide/inputs) for the identity model behind `args`.

**Or pass the item down and let the parent own the data.** When a single Cubit holds the list, render rows from a `select` that pins the row's own slice, so a row re-renders only when _its_ item changes:

```tsx
function TodoRow({ id }: { id: string }) {
  const [, todos] = useBloc(TodoCubit, {
    select: (state) => [state.items.find((i) => i.id === id)],
  });
  const item = todos.state.items.find((i) => i.id === id)!;
  return <li className={item.done ? 'done' : ''}>{item.text}</li>;
}
```

::: warning Stable keys, stable order
Use a stable `key` (an id, never the array index) so React reconciles rows correctly across reorders, and prefer immutable updates that replace only the changed item so unaffected rows keep reference-equal data.
:::

## Pattern: Keep most state flat

Auto-tracking works at any depth, and `patch` accepts a `DeepPartial<S>` so deep updates are ergonomic — depth is **supported**. But flatter state is still usually the better default:

- Each level of nesting is one more proxy to create on read and one more path segment to diff.
- Leaf isolation only helps if siblings live at the same level; over-nesting groups unrelated fields under a shared parent, so a whole-object read of that parent over-tracks.

```ts
// Prefer this
interface UserState {
  name: string;
  email: string;
  avatarUrl: string;
}

// Over this
interface UserState {
  profile: {
    personal: { name: string; contact: { email: string } };
    media: { avatarUrl: string };
  };
}
```

::: info Nesting isn't banned
Reach for nesting when the structure is _meaningful_ — a list of records, a normalized entity map, a genuinely tree-shaped domain. The guidance is "don't nest for the sake of organizing flat fields," not "never nest." Deep `patch` exists precisely so that legitimately nested state stays easy to update.
:::

## Common mistakes

These all manifest the same way in the Profiler: a component re-renders on a change it doesn't display.

::: warning Over-tracking anti-patterns

- **Spreading the whole state** tracks every property.

  ```tsx
  // Bad: tracks every property of state
  return <ProfileCard {...state} />;
  // Better: pass only what's rendered
  return <ProfileCard name={state.name} avatar={state.avatarUrl} />;
  ```

- **Reading the whole array to compute a boolean** over-tracks the array's contents. Track the narrow thing you actually need (`state.items.length`), or select the derived value so you only wake on the boundary:

  ```tsx
  // Tracks the full array on every change:
  return <Icon badge={state.items.length > 0} />;
  // Wakes only when empty/non-empty flips (getter via select):
  const [, cart] = useBloc(CartCubit, { select: (_, b) => [b.isEmpty] });
  return <Icon badge={!cart.isEmpty} />;
  ```

  Note `!cart.isEmpty` alone (without `select`) would **not** re-render — bloc getters aren't auto-tracked. See [Getters as computed properties](#pattern-getters-as-computed-properties).

- **Reading a whole object when you need one field** wakes on any sibling change. Read the leaf (`state.user.name`), not the object (`state.user`).
- **Destructuring then drilling off the raw value** — `const { user } = state; user.name` tracks `user`, not `user.name`. Drill through the proxy: `state.user.name`.
  :::

## Pattern: Lifecycle hooks instead of useEffect

Use `onMount` and `onUnmount` to run side effects tied to the component lifecycle without writing `useEffect`:

```tsx
function Feed() {
  const [state] = useBloc(FeedCubit, {
    onMount: (feed) => feed.load('latest'),
    onUnmount: (feed) => feed.cancelPending(),
  });

  if (state.status === 'loading') return <Spinner />;
  return <ArticleList articles={state.articles} />;
}
```

This keeps the component body clean and avoids the usual `useEffect` dependency-array pitfalls. `onMount` fires after the bloc is acquired; `onUnmount` fires _before_ the registry releases its ref, so the bloc is still alive when it runs.

## See also

- [Dependency Tracking](/react/dependency-tracking) — the recording rules that drive all of the above
- [useBloc](/react/use-bloc) — the full options reference (`select`, `args`, `onMount`/`onUnmount`)
- [DevTools](/plugins/devtools) — inspect live instances and state-change timing
- [Best Practices](/guide/best-practices) — when to narrow, derive, or split, as principles

## Troubleshooting

For the full FAQ see [Troubleshooting](/guide/troubleshooting). Below are the performance-specific problems.

### Getter on `bloc` does not trigger re-renders

**Symptom:** A component reads `bloc.total` (a getter) and does not re-render when the values the getter derives from change.

**Cause:** Auto-tracking records reads on the `state` proxy only — never on the bloc instance. `bloc.total` reads `this.state` internally (the raw state, not the proxy), so the component records nothing.

**Fix:** Either touch the source path through `state` to join the tracked set, or depend on the getter explicitly with `select`:

```tsx
// A — touch the source path so it's tracked; getter provides the result
function CartTotal() {
  const [state, cart] = useBloc(CartCubit);
  void state.items; // records `items` — component wakes when items change
  return <span>${cart.total}</span>;
}
```

```tsx
// B — select gates re-renders on the getter's return value changing
function CartTotal() {
  const [, cart] = useBloc(CartCubit, {
    select: (_, bloc) => [bloc.total],
  });
  return <span>${cart.total}</span>;
}
```

Option A wakes on every `items` change; option B wakes only when `total` changes value. See [Getters as computed properties](#pattern-getters-as-computed-properties) above.

### `select` re-keys / re-subscribes every render

**Symptom:** The component re-renders on every state change regardless of what `select` returns, or you see unexpected subscription churn in DevTools.

**Cause:** A fresh selector function is passed each render. The hook treats a new function identity as a new consumer, re-keying the subscription.

**Fix:** Wrap the selector in `useCallback` or define it at module scope so the reference is stable:

```tsx
const selectTotal = (state: CartState, bloc: CartCubit) => [bloc.total];

function CartBadge() {
  const [, cart] = useBloc(CartCubit, { select: selectTotal });
  return cart.isEmpty ? null : <Badge />;
}
```

See [Troubleshooting: `select` re-keying](/guide/troubleshooting#stale-values-in-callbacks) and [`useBloc`: `select`](/react/use-bloc#select).
