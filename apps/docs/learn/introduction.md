# Introduction to Blac

Welcome to Blac, a modern state management library designed to bring simplicity, power, and predictability to your React projects! Blac aims to reduce the mental overhead of state management by cleanly separating business logic from your UI components.

## What is Blac?

Blac is a state management solution built with **TypeScript first**, offering a lightweight yet flexible approach. It draws inspiration from established patterns while providing an intuitive API to minimize boilerplate.

It consists of two main packages:
-   `@blac/core`: The foundational library providing the core Blac/Bloc logic, instance management, and a plugin system.
-   `@blac/react`: The React integration layer, offering custom hooks and utilities to seamlessly connect Blac with your React components.

In Blac's architecture, state becomes a well-defined side effect of your business logic, and the UI becomes a reactive reflection of that state.

## Key Features of Blac

-   💡 **Simple & Intuitive API**: Get started quickly with familiar concepts and less boilerplate.
-   🧠 **Smart Instance Management**:
    -   Automatic creation and disposal of `Bloc` instances.
    -   `Bloc`s are kept alive as long as they have active listeners or consumers, or if explicitly marked with `keepAlive: true`.
    -   Support for both shared (singleton-like) and isolated `Bloc` instances per component.
-   🔒 **TypeScript First**: Full type safety out-of-the-box, enabling robust applications and great autocompletion.
-   🧩 **Extensible via Plugins & Addons**:
    -   **Plugins**: Extend Blac's core functionality by hooking into lifecycle events (e.g., for custom logging).
    -   **Addons**: Enhance individual `Bloc` capabilities (e.g., state persistence with the built-in `Persist` addon).
-   🚀 **Performance Focused**:
    -   Minimal dependencies for a small bundle size.
    -   Efficient state updates and re-renders in React.
-   🧱 **Flexible Architecture**: Adapts to various React project structures and complexities.

## Documentation Structure

This documentation is organized to help you learn Blac 효과적으로 (effectively):

-   **Learn**: Foundational concepts, patterns, and guides.
    -   [Getting Started](/learn/getting-started): Your first steps with Blac.
    -   [Core Concepts](/learn/core-concepts): Understand the fundamental ideas and architecture.
    -   [The Blac Pattern](/learn/blac-pattern): Dive into the unidirectional data flow and principles.
    -   [State Management Patterns](/learn/state-management-patterns): Explore different approaches to sharing state.
    -   [Architecture](/learn/architecture): A deeper look at Blac's internal structure.
    -   [Best Practices](/learn/best-practices): Recommended techniques for building robust applications.

-   **API Reference**: Detailed information about Blac's classes, hooks, and methods.
    -   Core (`@blac/core`):
        -   [Core Classes (BlocBase, Bloc, Cubit)](/api/core-classes): Detailed references for the main state containers.
        -   [Key Methods](/api/key-methods): Essential methods for creating and managing state.
    -   React (`@blac/react`):
        -   [React Hooks (useBloc, useValue, etc.)](/api/react-hooks): Learn how to use Blac with your React components.

Ready to begin? Jump into the [Getting Started](/learn/getting-started) guide! 