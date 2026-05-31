# What is BlaC?

BlaC (Business Logic Components) is a TypeScript state management library for React. It separates business logic into class-based state containers — [Cubits](/guide/glossary#core-model) — that are type-safe, testable, and automatically optimized for minimal re-renders.

A first taste — the whole loop in one screen:

```tsx twoslash
import React from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
}

function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return <button onClick={counter.increment}>Count: {state.count}</button>;
}
```

No store setup, no provider, no reducer, no selector. The class holds the logic; the hook connects it; re-renders are tracked automatically.

## Why BlaC?

Most state management libraries force you to choose between simplicity and power. Simple hooks-based solutions scatter logic across components. Powerful libraries require boilerplate, providers, and context wrappers.

BlaC takes a different approach:

- **State logic lives in classes, not components.** Define your state shape and mutations in a `Cubit` class. Components just read state and call methods.
- **No providers or context wrappers.** Import your class, call `useBloc(MyClass)`, and you're connected. The registry handles instance creation and sharing automatically.
- **Re-renders are precise by default.** Auto-tracking proxies detect which state properties your component reads during render. Only changes to those properties trigger re-renders.
- **Lifecycle is declarative.** Instances are shared by default. Use `args` (with a `static key`) for named per-component instances or `@blac({ keepAlive: true })` for persistent singletons.
- **Built for TypeScript.** State types flow from your class definition through the hook return value with zero type annotations needed.

::: info How does this compare to Redux / Zustand / Jotai / MobX?
The short version: BlaC keeps logic in classes (like flutter_bloc), shares instances through a ref-counted registry (no providers), and tracks re-renders with a render-time proxy (no selectors or `useMemo`). The honest, side-by-side comparison — including where those other libraries are the better fit — lives on the [Comparison](/guide/comparison) page.
:::

## Architecture

BlaC has two layers:

```text
┌─────────────────────────────┐
│  React        useBloc hook  │  Framework-specific binding,
│               BlocProvider  │  path-scoped channel subscriptions
├─────────────────────────────┤
│  Core         Cubit,        │  State containers, registry,
│               Registry,     │  plugins, watch, path-based
│               Plugins       │  dirty tracking
└─────────────────────────────┘
```

**Core** (`@blac/core`) provides state containers, a global registry with ref counting, a plugin system, and utilities like `watch`. Proxy-based dependency tracking is built in — no separate adapter package is needed.

**React** (`@blac/react`) provides the `useBloc` hook. It subscribes each component to the bloc's path-scoped channel and re-renders through React's normal update path when a tracked read path changes. The optional `BlocProvider` shown above scopes default `args` to a subtree — most apps never need it (see [useBloc](/react/use-bloc) for when it helps).

::: details Under the hood: the DirtyTalk engine family
The "what changed, who cares, when do we tell them" machinery — path-based dirty tracking, the render-time proxy, microtask-batched flushing — lives in a lower-level, framework-agnostic family of packages called [DirtyTalk](/dirtytalk/). BlaC's `StateContainer` extends `@dirtytalk/structural`'s container; you never need to touch it directly, but it's there if you want to understand the foundation.
:::

## When to use BlaC

BlaC works best when:

- You have **complex state logic** that benefits from being in a class (validation, derived state, async operations)
- Multiple components need to **share state** without prop drilling or context providers
- You want **testable business logic** that can run without React
- You value **TypeScript inference** and want the compiler to catch state errors

::: tip When you probably don't need BlaC
If a piece of state lives in exactly one component and never travels, `useState` is the right tool — reach for BlaC when state is _shared_, _complex_, or _worth testing without React_. BlaC adds value as state complexity grows, not at the first `useState`.
:::

## What's next?

- [Quick Start](/guide/getting-started) — Install BlaC and build your first component
- [Core Concepts](/guide/concepts) — A quick tour of the mental model
- [Mental Model](/guide/mental-model) — The deep "why it works this way," plus honest comparisons
- [Patterns & Recipes](/guide/patterns) — Common patterns for real apps
- [useBloc Hook](/react/use-bloc) — Full hook reference

## See also

- [Mental Model](/guide/mental-model) — how auto-tracking, the registry, and batching actually work
- [Quick Start](/guide/getting-started) — go from install to working component
- [Glossary](/guide/glossary) — one-line definitions for every term used here
