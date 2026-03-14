# What is BlaC?

BlaC (Business Logic Components) is a TypeScript state management library for React. It separates business logic into class-based state containers that are type-safe, testable, and automatically optimized for minimal re-renders.

## Why BlaC?

Most state management libraries force you to choose between simplicity and power. Simple hooks-based solutions scatter logic across components. Powerful libraries require boilerplate, providers, and context wrappers.

BlaC takes a different approach:

- **State logic lives in classes, not components.** Define your state shape and mutations in a `Cubit` class. Components just read state and call methods.
- **No providers or context wrappers.** Import your class, call `useBloc(MyClass)`, and you're connected. The registry handles instance creation and sharing automatically.
- **Re-renders are precise by default.** Auto-tracking proxies detect which state properties your component reads during render. Only changes to those properties trigger re-renders.
- **Lifecycle is declarative.** Instances are shared by default. Add `@blac({ isolated: true })` for per-component instances or `@blac({ keepAlive: true })` for persistent singletons.
- **Built for TypeScript.** State types flow from your class definition through the hook return value with zero type annotations needed.

## Architecture

BlaC has three layers:

```
┌─────────────────────────────┐
│  React        useBloc hook  │  Framework-specific binding
├─────────────────────────────┤
│  Adapter      Tracking &    │  Subscription strategies,
│               subscriptions │  proxy-based change detection
├─────────────────────────────┤
│  Core         Cubit,        │  State containers, registry,
│               Registry,     │  plugins, watch utilities
│               Plugins       │
└─────────────────────────────┘
```

**Core** (`@blac/core`) provides state containers, a global registry with ref counting, a plugin system, and utilities like `watch` and `tracked`.

**Adapter** (`@blac/adapter`) bridges state containers with framework subscription models. It handles the three tracking modes (auto, manual, none) and manages proxy-based dependency detection.

**React** (`@blac/react`) provides the `useBloc` hook built on `useSyncExternalStore` for concurrent mode safety.

## When to use BlaC

BlaC works best when:

- You have **complex state logic** that benefits from being in a class (validation, derived state, async operations)
- Multiple components need to **share state** without prop drilling or context providers
- You want **testable business logic** that can run without React
- You value **TypeScript inference** and want the compiler to catch state errors

For a simple app with two or three pieces of state, React's built-in `useState` and `useContext` may be all you need. BlaC adds value as state complexity grows.

## What's next?

- [Quick Start](/guide/getting-started) — Install BlaC and build your first component
- [Core Concepts](/guide/concepts) — Understand the mental model
- [useBloc Hook](/react/use-bloc) — Full hook reference
