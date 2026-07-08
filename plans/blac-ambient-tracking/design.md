# BlaC ambient tracking & compiler plugin — design

Status: design note. `untracked()` is shipped (the manual escape hatch); the
ambient model + plugin below are the planned path to make it automatic.

## The invariant we want

> **A component becomes reactive only to the paths it reads during its own render.**

Props are snapshots. A child that receives a proxy prop but never calls `useBloc`
is not reactive to that data at all — its reads pass through to no scope, so a
change triggers nothing, memo or not. To react, a component must be an actual
consumer (call `useBloc`). Nobody up the tree re-renders for a path unless they
read it themselves. (The current behavior where a proxy passed as a prop keeps a
memoized child updating is considered a bug, not a feature.)

## Problem today

A tracking proxy is bound to the `trackRender` closure of the component that
*created* it. Passed as a prop and read in a child, the child's reads record into
the **parent's** path set → the parent over-subscribes. Confirmed empirically on
the `apps/perf` `/debug` timeline: child reads land in `inst#(owner=Parent)`, and
they happen *after* the parent's render function returns but *before* any callback
we control (the microtask disarm fires far too late).

## Shipped escape hatch: `untracked()`

`untracked(value)` (a public alias of `raw()` in `@dirtytalk/structural`,
re-exported from `@blac/react`) unwraps the proxy to its raw target, so reads on it
never record. Explicit, zero build-step. Downside: manual, per-prop.

## Automatic scoping — the ambient model

Route proxy reads to a module-level *current scope* stack (top = the component
currently rendering) instead of a captured closure:

```ts
let currentScope: Tracker | null = null;
// proxy get(): if (currentScope) currentScope.record(path); else pass-through.
```

`useBloc` stops owning the proxy identity and instead registers its tracker as the
current render's scope. The essential missing piece is *popping* the parent's scope
at the exact instant its render function returns — the gap in which **no React hook
fires** (not layout effects, not passive effects, not a microtask; all run after
the whole subtree). Only something that brackets the render body can do it.

### Rejected: fiber-owner signal

Reading React's currently-rendering fiber (`React.__SECRET_INTERNALS…`
/ `ReactCurrentOwner`) would give the ambient signal with no build step, but it is
a private API that gets reshuffled between React 18 → 19 and does not exist the
same way off the DOM renderer / in RSC. **Rejected** as too fragile.

## Compiler / Babel plugin (the plan)

Bracket every component render at build time:

```tsx
// authored
function Parent(props) {
  const [state] = useBloc(Bloc);
  return <div>{state.items.map((i) => <Child key={i.id} item={i} />)}</div>;
}

// emitted
function Parent(props) {
  const _f = _pushScope();
  try {
    const [state] = useBloc(Bloc); // attaches its tracker to _f
    return <div>{state.items.map((i) => <Child key={i.id} item={i} />)}</div>;
  } finally {
    _popScope(_f); // runs when Parent returns, BEFORE children render
  }
}
```

Why it works: the `finally` runs at parent-render-end, before React descends into
the children — the precise window the microtask can't reach. Hooks stay at the top
level of the function (inside `try`, not a nested callback), so hook-call order is
preserved and it's runtime-safe with `try/finally`.

### Implementation notes

- **Component detection** — PascalCase + returns JSX + uses hooks (React Compiler
  heuristics). False positives/negatives are the main fuzziness.
- **`useBloc` role** — becomes the subscription anchor: attaches its tracker to the
  current frame; recorded paths become that component's subscription set.
- **Concurrent React** — a single component render is synchronous and
  uninterruptible; `try/finally` keeps the stack balanced across throws/Suspense;
  StrictMode double-invoke just pushes/pops twice. Safe.
- **Render props / function children** invoked synchronously inside a parent
  attribute to that parent (they run before `finally`). Defensible.
- **Effects / handlers / async** have no component on the stack → pass-through.
  Already true today; the ambient model just makes it the general rule.

### Costs

- Every consumer app must add the plugin → BlaC becomes a build-time dependency,
  not drop-in-runtime (React-Compiler-level adoption cost).
- Partial adoption fails quietly: a file missing the plugin silently over-subscribes
  (old behavior).
- Lint flags hooks-in-`try`, but compiler *output* isn't linted — non-issue.

## Phasing

1. `untracked()` — shipped (manual).
2. Prototype the ambient current-scope stack behind a flag; validate on `/debug`
   that child reads stop landing in the parent's instance.
3. Ship the compiler/Babel plugin as opt-in.
