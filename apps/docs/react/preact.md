# Preact

::: warning Not yet published
A dedicated `@blac/preact` package is **planned but not yet released** — it does not currently ship in this repo. This page describes the intended binding so the design is on record; the import paths and `configureBlacPreact` below are not available until the package lands. In the meantime, `@blac/core` is framework-agnostic and Preact components can drive blocs through [`watch`](/core/watch). Track the package status before depending on the snippets here.
:::

The planned `@blac/preact` package will provide the same `useBloc` hook with the same API as `@blac/react`, over the same `@blac/core` engine. If you already know the React binding, there is nothing new to learn — only the import changes.

::: tip New to BlaC?
Start with [Getting Started](/react/getting-started) and [useBloc](/react/use-bloc) using the React examples — every concept transfers verbatim. This page covers only what is Preact-specific.
:::

## Installation

::: code-group

```bash [pnpm]
pnpm add @blac/core @blac/preact
```

```bash [npm]
npm install @blac/core @blac/preact
```

:::

Requires Preact 10.x. `@blac/core` is a peer dependency.

## Usage

```tsx
import { useBloc } from '@blac/preact';
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.patch({ count: this.state.count + 1 });
}

function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return (
    <div>
      <p>{state.count}</p>
      <button onClick={counter.increment}>+</button>
    </div>
  );
}
```

Auto-tracking works exactly as it does in React: `state.count` is recorded during render, so this component re-renders only when `count` changes. See [Dependency Tracking](/react/dependency-tracking) for the recording rules.

## API

The hook signature, return tuple, and options are identical to the React version:

```ts
const [state, bloc, ref] = useBloc(MyCubit, {
  args: { id }, // typed; required when the bloc declares Args; derives identity
  select: (state, bloc) => [bloc.someGetter], // re-render selector (opts out of auto-track)
  onMount: (bloc) => {
    /* runs after acquire */
  },
  onUnmount: (bloc) => {
    /* runs before release */
  },
});
```

`@blac/preact` is built for parity with `@blac/react`, so the v2 input model is the same: typed `args` for instance identity, the per-consumer `deps` lane (and the `onDepsChanged` hook on the container), and the `select` re-render selector (which replaced v1's `dependencies`). There is no `autoTrack` option in either binding — a component re-renders based on what it reads, or on `select` when you provide one; a component that reads no state never re-renders. For the complete, canonical options reference, see [useBloc](/react/use-bloc), and for the identity model, [Passing Inputs](/guide/inputs).

## Global configuration

```ts
import { configureBlacPreact } from '@blac/preact';

configureBlacPreact({
  // Reserved for forwards-compatible knobs; currently no options.
});
```

`configureBlacPreact` mirrors `configureBlacReact`: both configuration surfaces are intentionally empty today. The hook's tracking model is fixed — auto-tracking when `select` is omitted, selector-driven re-renders when it is provided — and is not configurable.

## Differences from React

- The hook is built against Preact's hook implementations rather than React's; the subscription and tracking model is otherwise identical.
- Everything else — `@blac/core`, the registry, ref-counting, plugins, and the tracking engine in `@dirtytalk/structural` — is shared between the two bindings. State containers themselves are framework-agnostic: the _same_ Cubit class works under React, Preact, or no framework at all (via [watch](/core/watch)).

## See also

- [Getting Started](/react/getting-started) — the quickstart; all examples transfer to Preact
- [useBloc](/react/use-bloc) — the canonical hook and options reference
- [Passing Inputs](/guide/inputs) — `args`, `deps`, and instance identity
- [Dependency Tracking](/react/dependency-tracking) — how auto-tracking decides re-renders
