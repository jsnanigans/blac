# Blac: Beautiful State Management for React

<p align="center">
  <img src="./apps/docs/public/logo.svg" alt="Blac Logo" width="150" />
</p>

<p align="center">
  <strong>Lightweight, flexible, and predictable state management for modern React applications.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@blac/react"><img src="https://img.shields.io/npm/v/@blac/react.svg" alt="NPM Version"/></a>
  <a href="https://github.com/your-username/blac/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@blac/react.svg" alt="License"/></a>
  <!-- Add other badges like build status, code coverage, etc. once CI/CD is set up -->
  <!-- e.g., <a href="your-ci-link"><img src="your-build-status-badge-url" alt="Build Status"/></a> -->
</p>

## Overview

Blac is a state management library designed to bring simplicity and power to your React projects. It draws inspiration from established patterns like Redux and the Bloc pattern, while offering a more intuitive API and minimizing boilerplate. At its core, Blac focuses on type safety (with first-class TypeScript support) and an excellent developer experience.

It consists of two main packages:
-   `@blac/core`: The foundational library providing the core Blac/Bloc logic, instance management, and plugin system.
-   `@blac/react`: The React integration layer, offering hooks and utilities to seamlessly connect Blac with your React components.

An **overview** of the Blac pattern, its core concepts, and how it simplifies state management in React.

-   **Simple API**: Intuitive and easy to learn, minimizing boilerplate.
-   **Smart Instance Management**: Automatic creation, sharing, and disposal of `Bloc` instances. Supports `keepAlive` for persistent state and isolated instances.
-   **TypeScript First**: Strong typing for robust applications and excellent developer experience.
-   **Extensible**: Add custom functionality through a built-in plugin system or create addons for `Bloc`s (like the `Persist` addon for storage).
-   **Performance**: Lightweight core and efficient updates.
-   **Flexible Architecture**: Adapts to various project needs, from simple components to complex applications.

## Installation

To get started with Blac in your React project, install the `@blac/react` package. This package includes `@blac/core`.

```bash
# Using pnpm (recommended for this monorepo)
pnpm add @blac/react

# Or using npm
npm install @blac/react

# Or using yarn
yarn add @blac/react
```

## Quick Start

Here's a taste of how to use Blac with a simple counter:

```tsx
// 1. Define your Cubit (e.g., in src/cubits/CounterCubit.ts)
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

// CounterCubit manages the counter's state
export class CounterCubit extends Cubit<CounterState> {
  constructor() {
    // Initialize the state with a count of 0
    super({ count: 0 });
  }

  // Define methods to update the state
  // Remember: methods must be arrow functions to bind 'this' correctly!
  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
  reset = () => this.emit({ count: 0 });
}

// 2. Use the Cubit in your React component (e.g., in src/components/CounterDisplay.tsx)
import { useBloc } from '@blac/react';
import { CounterCubit } from '../cubits/CounterCubit'; // Adjust path as needed

function CounterDisplay() {
  // Connect your component to the CounterCubit.
  // useBloc returns a tuple: [currentState, cubitInstance]
  const [state, counterCubit] = useBloc(CounterCubit);

  return (
    <>
      <h1>Count: {state.count}</h1> {/* Access state directly */}
      <button onClick={counterCubit.increment}>Increment</button>
      <button onClick={counterCubit.decrement}>Decrement</button>
      <button onClick={counterCubit.reset}>Reset</button>
    </>
  );
}

export default CounterDisplay;
```

## Core Concepts

-   **`BlocBase`**: The foundational abstract class for state containers.
-   **`Cubit<State>`**: A simpler state container that exposes methods to directly `emit` or `patch` new states. The Quick Start example above uses a `Cubit`.
-   **`Bloc<State, Action>`**: A more advanced state container that processes `Action`s through a `reducer` function to produce new `State`. This is useful for more complex state logic where transitions are event-driven.
-   **`useBloc` Hook**: The primary React hook from `@blac/react` to connect components to `Bloc` or `Cubit` instances, providing the current state and the instance itself. It efficiently re-renders components when relevant state properties change.
-   **Instance Management**: Blac intelligently manages instances of your `Bloc`s/`Cubit`s. By default, they are shared, but can be isolated or kept alive in memory.

## Features In-Depth

-   💡 **Simple & Intuitive API**: Get started quickly with familiar concepts and less boilerplate.
-   🧠 **Smart Instance Management**:
    -   Automatic creation and disposal of `Bloc` instances.
    -   `Bloc`s are kept alive as long as they have active listeners or consumers, or if explicitly marked with `keepAlive: true`.
    -   Support for both shared (singleton-like) and isolated `Bloc` instances per component.
-   🔒 **TypeScript First**: Full type safety out-of-the-box, enabling robust applications and great autocompletion.
-   🧩 **Extensible via Plugins & Addons**:
    -   **Plugins**: Extend Blac's core functionality by hooking into lifecycle events (e.g., for logging).
    -   **Addons**: Enhance individual `Bloc` capabilities (e.g., state persistence with the `Persist` addon).
-   🚀 **Performance Focused**:
    -   Minimal dependencies for a small bundle size.
    -   Efficient state updates and re-renders in React.
-   🧱 **Flexible Architecture**: Adapts to various React project structures and complexities.

## Documentation

For comprehensive documentation, including advanced usage, API details, and guides, please refer to:

-   **Local Docs**: Run `pnpm run dev:docs` in the `apps/docs` directory and open the provided local URL.
-   **Online Docs**: (TODO: Add link to the deployed documentation site here if available)

## Contributing

Contributions are highly welcome! Whether it's bug fixes, feature enhancements, or documentation improvements, please feel free to:
1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

Please ensure your code adheres to the project's linting and formatting standards.

## License

Blac is [MIT licensed](./LICENSE).
