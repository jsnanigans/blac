# Render-tracking ergonomics: unstable-by-reference default + `select` re-key footgun

**Impact: Medium-high** — `useBloc`'s default (no `select`) return value is a
fresh object every render by design, which is a dependency-array trap for
any consumer who doesn't already know to reach for `select`. The shipped fix
for that trap has its own documented sharp edge that's easy to trigger the
same way.

## The default is unstable-by-reference every render

Without `select`, the tuple's state element is computed fresh on every
render:

```ts
// UseBlocOptions = { args?; select?: (state, bloc) => unknown[]; onMount?; onUnmount? }
const [state] = useBloc(MyCubit); // no select
```

Internally this is `trackRender(bloc.state, bloc.interner).value` — a new
proxy object constructed every render, whose job is to record which paths
are read during that render so the hook knows what to re-render on. That's
the right mechanism for the common "just render it" case, but it means the
returned `state` is never reference-stable across renders even when nothing
in it changed.

The trap: putting that returned `state` directly in a `useEffect`/`useMemo`
dependency array gives React a new reference every render, so the effect
fires every render — in the worst case, "Maximum update depth exceeded":

```ts
const [state] = useBloc(MyCubit);

useEffect(() => {
  doSomething(state.count);
}, [state]); // new proxy every render -> fires every render
```

This isn't a misuse of an escape hatch — it's the *default* behavior of the
primary hook, so any consumer who hasn't specifically learned about `select`
is exposed to it the first time they put a tracked value in a dependency
array.

## The shipped fix, and its own footgun

Passing `select` changes what's returned: the hook now returns the **raw,
stable** `bloc.state` (stable by reference across renders while unchanged),
and only re-renders when the selector's returned array changes per-index via
`Object.is` (`shallowArrayEqual`):

```ts
const [state] = useBloc(MyCubit, { select: (s) => [s.count] });

useEffect(() => {
  doSomething(state.count);
}, [state]); // stable reference while count is unchanged — safe
```

This works well, but the shipped type documentation for `select` itself
warns of a second, related trap: the selector function must be referentially
stable across renders (e.g. via `useCallback`), because passing a fresh
function each render forces the subscription to re-key, which the underlying
channel treats as a new consumer:

```ts
// Footgun: inline lambda, recreated every render
useBloc(MyCubit, { select: (s) => [s.count] });

// Required: stable reference
const selectCount = useCallback((s: MyState) => [s.count], []);
useBloc(MyCubit, { select: selectCount });
```

So the fix for "the default value's reference is unstable" is itself only
safe if the consumer independently knows to stabilize the function they pass
to unlock it — the same category of mistake (an inline value/function
recreated every render silently breaking an optimization) shows up twice in
a row, once at the top level of the hook and once inside its escape hatch.

## Suggested fix

1. **Document the dependency-array trap prominently** — in the `useBloc`
   JSDoc/README section itself, not only discoverable by reading the
   `select` type. A short "if you're about to put this in a dependency
   array, use `select`" callout would likely prevent most instances of this.
2. **Consider stabilizing the default value by reference when the state is
   unchanged**, so the common case doesn't require opting into `select` at
   all purely to get dependency-array safety.
3. **Consider letting `select` accept a dependency array (like `useMemo`)
   instead of requiring the function reference itself to be stable**, so an
   inline lambda is safe by construction rather than requiring the consumer
   to remember `useCallback`. If that's not feasible, at minimum surface a
   dev-mode warning when a `select` function's identity changes on
   consecutive renders, so the re-keying isn't silent.
