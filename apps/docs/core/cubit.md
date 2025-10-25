# Cubit

Cubits are the simplest form of state management in BlaC.

## Overview

A Cubit is a state container that directly emits new states without the event-driven pattern.

## Basic Example

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}
```

## When to Use Cubits

- Simple state management
- Direct state changes
- No complex event handling needed

_Full documentation coming soon._

## Next Steps

- [Bloc](/core/bloc) - Event-driven state containers
- [State Management](/core/state-management)
