# Blac: A Beautiful State Management Library

<p align="center">
  <img src="./apps/docs/public/logo.svg" alt="Blac Logo" width="120" />
</p>

<p align="center">
  Lightweight, flexible state management for React applications with predictable data flow
</p>

## Overview

Blac is a modern state management library for React applications that combines the best aspects of Redux and React Context with a simpler, more intuitive API. It's designed to be lightweight yet powerful, with a strong focus on type safety and developer experience.

## Features

- **Simple Yet Powerful**: Familiar patterns with less boilerplate
- **Smart Instance Management**: Automatic lifecycle handling for components
- **TypeScript First**: Full type safety with excellent IDE support
- **Redux DevTools Compatible**: Debug your application state with ease
- **Flexible Architecture**: Works with any React project structure
- **Minimal Dependencies**: Small bundle size and performance focused

## Quick Start

```bash
npm install @blac/react
```

```tsx
// Define your state container
import { createBloc } from '@blac/react';

interface CounterState {
  count: number;
}

class CounterBloc extends createBloc<CounterState>() {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.setState({ count: this.state.count + 1 });
  }

  decrement() {
    this.setState({ count: Math.max(0, this.state.count - 1) });
  }
}

// Use in your component
import { useBloc } from '@blac/react';

function Counter() {
  const counterBloc = useBloc(CounterBloc);
  const count = counterBloc.useValue(state => state.count);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterBloc.decrement()}>-</button>
      <button onClick={() => counterBloc.increment()}>+</button>
    </div>
  );
}
```

## Documentation

For complete documentation, visit [our docs site](https://example.com/blac-docs).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Blac is [MIT licensed](./LICENSE).
