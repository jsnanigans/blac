# Introduction

## What is BlaC?

BlaC (Business Logic as Components) is a modern state management library for React that brings clarity, predictability, and simplicity to your applications. Born from the desire to separate business logic from UI components, BlaC makes your code more testable, maintainable, and easier to reason about.

At its core, BlaC provides:
- **Clear separation of concerns** between business logic and UI
- **Type-safe state management** with full TypeScript support
- **Minimal boilerplate** compared to traditional solutions
- **Automatic optimization** for React re-renders
- **Flexible architecture** that scales from simple to complex applications

## Why BlaC?

### The Problem with Traditional State Management

Many React applications suffer from:
- Business logic scattered throughout components
- Difficult-to-test stateful components
- Complex state management setups with excessive boilerplate
- Performance issues from unnecessary re-renders
- Type safety challenges with dynamic state

### The BlaC Solution

BlaC addresses these challenges by introducing state containers (Cubits and Blocs) that encapsulate your business logic separately from your UI components. This separation brings numerous benefits:

1. **Testability**: Test your business logic in isolation without rendering components
2. **Reusability**: Share state logic across different UI implementations
3. **Maintainability**: Modify business logic without touching UI code
4. **Performance**: Automatic render optimization through smart dependency tracking
5. **Developer Experience**: Full TypeScript support with excellent IDE integration

## Core Philosophy

### Business Logic as Components

Just as React revolutionized UI development by thinking in components, BlaC applies the same principle to business logic. Each piece of business logic becomes a self-contained, reusable component with:

- **Clear boundaries**: Each state container manages a specific domain
- **Explicit dependencies**: Props and state types are clearly defined
- **Predictable behavior**: State changes follow a unidirectional flow

### Simplicity First

BlaC prioritizes developer experience without sacrificing power:

```typescript
// This is all you need for a working state container
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
}

// And this is how you use it
function Counter() {
  const [state, cubit] = useBloc(CounterCubit);
  return <button onClick={cubit.increment}>{state.count}</button>;
}
```

### Progressive Complexity

Start simple with Cubits for basic state management, then graduate to Blocs when you need event-driven architecture:

- **Cubits**: Direct state updates via `emit()` and `patch()`
- **Blocs**: Event-driven state transitions with type-safe event handlers

## When to Use BlaC

BlaC shines in applications that need:

- **Clean architecture** with separated concerns
- **Complex state logic** that would clutter components
- **Shared state** across multiple components
- **Testable business logic** independent of UI
- **Type-safe state management** with TypeScript
- **Performance optimization** for frequent state updates

## Comparison with Other Solutions

### vs Redux
**Community Pain Points**: Developers report having to "touch five different files just to make one change" and struggle with TypeScript integration requiring separate type definitions for actions, action types, and objects.

**How BlaC Addresses These**:
- **Minimal boilerplate**: One class with methods that call `emit()` - no actions, action creators, or reducers
- **Automatic TypeScript inference**: State types flow naturally from your class definition without manual type annotations
- **No Redux Toolkit learning curve**: Simple API that doesn't require learning additional abstractions

### vs MobX
**Community Pain Points**: Observable arrays aren't real arrays (breaks with lodash, Array.concat), can't make primitive values observable, dynamic property additions require special handling, and debugging automatic reactions can be challenging.

**How BlaC Addresses These**:
- **Standard JavaScript objects**: Your state is plain JS/TS - no special array types or observable primitives to worry about
- **Predictable updates**: Explicit `emit()` calls make state changes traceable through your codebase
- **No "magic" to debug**: While MobX uses proxies for automatic reactivity, BlaC only uses them for render optimization

### vs Context + useReducer
**Community Pain Points**: Any context change re-renders ALL consuming components (even if they only use part of the state), no built-in async support, and complex apps require extensive memoization to prevent performance issues.

**How BlaC Addresses These**:
- **Automatic render optimization**: Only re-renders components that use the specific properties that changed
- **Built-in async patterns**: Handle async operations naturally in your state container methods
- **No manual memoization needed**: Performance optimization happens automatically without useMemo/useCallback
- **No context providers**: Any component can access any state container without needing to wrap it in a provider

### vs Zustand/Valtio
**Community Pain Points**: Zustand requires manual selectors for each component usage, both are designed for module state (not component state), and mixing mutable (Valtio) with React's immutable model can cause confusion.

**How BlaC Addresses These**:
- **Flexible state patterns**: Use `isolated` for component-specific state or share state across components
- **Clear architectural patterns**: Cubit for simple cases, Bloc for complex event-driven scenarios
- **Consistent mental model**: Always use explicit updates, matching React's immutable state philosophy

## Architecture Overview

BlaC consists of two main packages working in harmony:

### @blac/core
The foundation providing:
- **State Containers**: `Cubit` and `Bloc` base classes
- **Instance Management**: Automatic creation, sharing, and disposal
- **Plugin System**: Extensible architecture for custom features

### @blac/react
The React integration offering:
- **useBloc Hook**: Connect components to state containers
- **Dependency Tracking**: Automatic optimization of re-renders
- **React Patterns**: Best practices for React applications

## What's Next?

Ready to dive in? Here's your learning path:

1. **[Getting Started](/getting-started/installation)**: Install BlaC and create your first Cubit
2. **[Core Concepts](/concepts/state-management)**: Understand the fundamental principles
3. **[API Reference](/api/core/cubit)**: Explore the complete API surface
4. **[Examples](/examples/)**: Learn from practical, real-world examples

Welcome to BlaC! Let's build better React applications together.
