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

## How BlaC Compares

BlaC addresses common pain points found in other state management solutions while maintaining a simple, intuitive API. Whether you're coming from Redux's boilerplate-heavy approach, MobX's magical reactivity, Context API's performance limitations, or Zustand's manual selectors, BlaC offers a refreshing alternative.

For a detailed comparison with Redux, MobX, Context API, Zustand, and other popular solutions, see our [Comparison Guide](/comparisons).

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
