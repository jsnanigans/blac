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
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
  
  increment = () => this.emit(this.state + 1);
}

// And this is how you use it
function Counter() {
  const [count, cubit] = useBloc(CounterCubit);
  return <button onClick={cubit.increment}>{count}</button>;
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
- **Less boilerplate**: With Redux, you need to define actions, action creators, and reducers for every state change. BlaC only requires a method that calls `emit()`
- **Type safety**: Redux requires complex TypeScript configurations and type assertions. BlaC provides automatic type inference from your state definition
- **Simpler mental model**: Redux uses a single global store with combineReducers. BlaC uses individual state containers that can be composed naturally

### vs MobX
- **Explicit updates**: MobX uses proxies to make state "magically" reactive - any mutation like `state.count++` automatically triggers updates. BlaC requires explicit `emit()` calls to change state. (Note: BlaC also uses proxies, but only for performance optimization to track which properties components read, not to change how state updates work)
- **Better debugging**: MobX's automatic reactions can create hard-to-trace update chains. BlaC's explicit emit pattern shows exactly when and why state changed in a linear, traceable flow
- **Framework agnostic core**: MobX is tightly coupled to its reactivity system. BlaC's core can be used with any framework or even vanilla JavaScript

### vs Context + useReducer
- **Automatic optimization**: Context requires manual memoization with useMemo/useCallback to prevent unnecessary renders. BlaC automatically tracks which parts of state each component uses
- **Better organization**: useReducer keeps logic inside components or requires manual extraction. BlaC enforces separation with dedicated state container classes
- **Built-in patterns**: useReducer is just a hook - you build patterns yourself. BlaC provides Cubit for simple state and Bloc for complex event-driven flows

### vs Zustand/Valtio
- **Stronger architecture**: Zustand uses function-based stores without clear patterns for complex apps. BlaC provides structured patterns with Cubit/Bloc that scale to enterprise applications
- **Better testing**: Zustand stores are functions that are harder to mock and test. BlaC's class-based containers are easily instantiated and tested in isolation
- **More flexibility**: Zustand is primarily hook-based. BlaC lets you choose between simple state (Cubit) and event-driven architecture (Bloc) based on your needs

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