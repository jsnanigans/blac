# State Notification Patterns for Multi-Consumer Scenarios

## Current Issue

The current implementation uses a single async generator that can only be consumed once, but we have multiple React components that need to subscribe to state changes. This causes components to not receive updates.

## Alternative Approaches

### 1. EventEmitter Pattern

The EventEmitter pattern is a classic Node.js/JavaScript pattern for handling multiple subscribers.

```typescript
import { EventEmitter } from 'events';

class BlocBase<S> extends EventEmitter {
  private _state: S;
  
  constructor(initialState: S) {
    super();
    this._state = initialState;
  }
  
  protected _pushState(newState: S, oldState: S): void {
    this._state = newState;
    // Emit to all listeners
    this.emit('stateChange', { newState, oldState });
  }
  
  // For React hook consumption
  subscribeToState(callback: (state: S) => void): () => void {
    const handler = ({ newState }: { newState: S }) => callback(newState);
    this.on('stateChange', handler);
    
    // Return unsubscribe function
    return () => this.off('stateChange', handler);
  }
}
```

**Pros:**
- Simple and well-understood pattern
- Handles multiple subscribers naturally
- Synchronous notification
- Built into Node.js

**Cons:**
- Not async-first
- No built-in backpressure handling
- Memory leaks if listeners aren't removed

### 2. Subject Pattern (RxJS-style)

The Subject pattern from reactive programming allows multiple observers to subscribe to a stream of values.

```typescript
interface Observer<T> {
  next: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

class Subject<T> {
  private observers: Set<Observer<T>> = new Set();
  private closed = false;
  
  subscribe(observer: Observer<T>): () => void {
    if (this.closed) {
      observer.complete?.();
      return () => {};
    }
    
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }
  
  next(value: T): void {
    if (this.closed) return;
    this.observers.forEach(observer => observer.next(value));
  }
  
  complete(): void {
    if (this.closed) return;
    this.closed = true;
    this.observers.forEach(observer => observer.complete?.());
    this.observers.clear();
  }
}

class BlocBase<S> {
  private stateSubject = new Subject<S>();
  private _state: S;
  
  protected _pushState(newState: S): void {
    this._state = newState;
    this.stateSubject.next(newState);
  }
  
  subscribeToState(callback: (state: S) => void): () => void {
    return this.stateSubject.subscribe({
      next: callback
    });
  }
}
```

**Pros:**
- Designed for reactive streams
- Handles multiple subscribers elegantly
- Can be extended with operators (map, filter, etc.)
- Clear lifecycle (complete/error)

**Cons:**
- More complex than EventEmitter
- Requires understanding of reactive patterns
- May be overkill for simple state management

### 3. Multi-Consumer Async Generator Pattern

Create a broadcasting mechanism that allows multiple async generators to consume from a single source.

```typescript
class BroadcastChannel<T> {
  private subscribers: Set<(value: T) => void> = new Set();
  private closed = false;
  
  broadcast(value: T): void {
    if (this.closed) return;
    this.subscribers.forEach(sub => sub(value));
  }
  
  close(): void {
    this.closed = true;
    this.subscribers.clear();
  }
  
  async *subscribe(): AsyncGenerator<T, void, void> {
    const queue: T[] = [];
    let resolver: (() => void) | null = null;
    
    const handler = (value: T) => {
      queue.push(value);
      resolver?.();
    };
    
    this.subscribers.add(handler);
    
    try {
      while (!this.closed) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          await new Promise<void>(resolve => {
            resolver = resolve;
          });
        }
      }
    } finally {
      this.subscribers.delete(handler);
    }
  }
}

class BlocBase<S> {
  private stateChannel = new BroadcastChannel<S>();
  
  protected _pushState(newState: S): void {
    this._state = newState;
    this.stateChannel.broadcast(newState);
  }
  
  async *stateStream(): AsyncGenerator<S, void, void> {
    yield this._state; // Initial state
    yield* this.stateChannel.subscribe();
  }
}
```

**Pros:**
- Maintains async generator interface
- Each consumer gets their own generator
- Preserves the current API design
- Natural backpressure handling

**Cons:**
- More complex implementation
- Each subscriber maintains its own queue
- Potential memory issues with slow consumers

### 4. Callback Registry Pattern

A simple pattern where components register callbacks that get called on state changes.

```typescript
class BlocBase<S> {
  private _state: S;
  private subscribers = new Map<string, (state: S) => void>();
  
  protected _pushState(newState: S): void {
    this._state = newState;
    this.subscribers.forEach(callback => callback(newState));
  }
  
  subscribe(id: string, callback: (state: S) => void): () => void {
    this.subscribers.set(id, callback);
    callback(this._state); // Send initial state
    
    return () => {
      this.subscribers.delete(id);
    };
  }
}
```

**Pros:**
- Dead simple
- Minimal overhead
- Easy to debug
- Synchronous

**Cons:**
- No built-in error handling
- Manual ID management
- Not async-aware

## Recommendation

For the BlaC library, I recommend the **Multi-Consumer Async Generator Pattern** because:

1. It preserves the existing async generator API that's already implemented
2. It properly handles multiple consumers without changing the external interface
3. It maintains the benefits of async iteration (backpressure, cancellation)
4. It's a minimal change to the existing codebase

The implementation would involve:
1. Replacing the single `_stateChannel.generator` with a `BroadcastChannel`
2. Having `stateStream()` create a new subscription for each caller
3. Ensuring proper cleanup when consumers disconnect

This would fix the current issue where multiple React components can't receive state updates while maintaining the elegant async generator API.