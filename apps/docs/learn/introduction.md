# Introduction to Blac

Blac is a state management library for React. It keeps your business logic separate from UI components.

> "Any sufficiently advanced bug is indistinguishable from a feature." — Rich Kulawiec

## What is Blac?

Blac is written in TypeScript and draws on common patterns. The API is small and avoids boilerplate.

> "The quieter you become, the more you are able to hear." — Ram Dass

It consists of two main packages:
-   `@blac/core`: The foundational library providing the core Blac/Bloc logic, instance management, and a plugin system.
-   `@blac/react`: The React integration layer, offering custom hooks and utilities to seamlessly connect Blac with your React components.

In Blac's architecture, state becomes a well-defined side effect of your business logic, and the UI becomes a reactive reflection of that state.

## Key Features

> "Always keep your towel handy." — Douglas Adams

- Minimal API
- Instance management for shared or isolated blocs
- Written in TypeScript
- Extensible via plugins and addons
- Efficient state updates

## Documentation Structure

> "Knowledge is power." — Francis Bacon

This documentation is organized into two sections:

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

Ready to begin? See the [Getting Started](/learn/getting-started) guide.
