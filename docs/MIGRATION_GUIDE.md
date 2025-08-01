# BlaC v2.4.0 to v3.0.0 Migration Guide

This guide helps you migrate from callback-based APIs to the new generator-based APIs introduced in BlaC v2.1.0 and later.

## Overview

BlaC is transitioning from callback-based observers to async generators for better memory efficiency, composability, and developer experience. The callback-based APIs are deprecated in v2.4.0 and will be removed in v3.0.0.

## Core API Migration

### State Observation

#### Before (Callback-based)
```typescript
// Direct observer subscription (deprecated)
const unsubscribe = bloc._observer.subscribe({
  id: 'my-observer',
  fn: (newState, oldState) => {
    console.log('State changed:', newState);
  }
});

// Manual cleanup required
unsubscribe();
```

#### After (Generator-based)
```typescript
// Using async generators
for await (const state of bloc.stateStream()) {
  console.log('State changed:', state);
}

// Or with state changes
for await (const { previous, current } of bloc.stateChanges()) {
  console.log(`State changed from ${previous} to ${current}`);
}
```

### Event Observation (Bloc only)

#### Before
```typescript
// No direct API for observing events
// Had to intercept add() method or use plugins
```

#### After
```typescript
// Observe all events
for await (const event of bloc.events()) {
  console.log('Event dispatched:', event);
}

// Observe specific event types
for await (const event of bloc.eventsOfType(IncrementEvent)) {
  console.log('Increment event:', event);
}
```

## React Hooks Migration

### Basic State Subscription

#### Before
```typescript
function Counter() {
  const [state, bloc] = useBloc(CounterBloc);
  
  // Manual subscription for side effects
  useEffect(() => {
    const unsubscribe = bloc._observer.subscribe({
      id: 'effect',
      fn: (newState) => {
        console.log('State updated:', newState);
      }
    });
    
    return unsubscribe;
  }, [bloc]);
  
  return <div>{state.count}</div>;
}
```

#### After
```typescript
function Counter() {
  const { state, bloc, stream } = useBlocStream(CounterBloc);
  
  // Using async generator for side effects
  useEffect(() => {
    const controller = new AbortController();
    
    (async () => {
      for await (const newState of stream) {
        if (controller.signal.aborted) break;
        console.log('State updated:', newState);
      }
    })();
    
    return () => controller.abort();
  }, [stream]);
  
  return <div>{state.count}</div>;
}
```

### Derived State

#### Before
```typescript
function CartTotal() {
  const [state, bloc] = useBloc(CartBloc);
  const [total, setTotal] = useState(0);
  
  useEffect(() => {
    const calculateTotal = () => {
      const newTotal = state.items.reduce((sum, item) => 
        sum + item.price * item.quantity, 0
      );
      setTotal(newTotal);
    };
    
    calculateTotal();
    
    const unsubscribe = bloc._observer.subscribe({
      id: 'total-calculator',
      fn: calculateTotal
    });
    
    return unsubscribe;
  }, [bloc, state.items]);
  
  return <div>Total: ${total}</div>;
}
```

#### After
```typescript
function CartTotal() {
  const total = useDerivedState(
    CartBloc,
    (state) => state.items.reduce((sum, item) => 
      sum + item.price * item.quantity, 0
    )
  );
  
  return <div>Total: ${total}</div>;
}
```

### Combined State

#### Before
```typescript
function Dashboard() {
  const [userState] = useBloc(UserBloc);
  const [cartState] = useBloc(CartBloc);
  const [combined, setCombined] = useState({});
  
  useEffect(() => {
    setCombined({
      userName: userState.name,
      cartCount: cartState.items.length
    });
  }, [userState.name, cartState.items.length]);
  
  return <div>{combined.userName} - {combined.cartCount} items</div>;
}
```

#### After
```typescript
function Dashboard() {
  const combined = useCombinedState(
    { user: UserBloc, cart: CartBloc },
    ({ user, cart }) => ({
      userName: user.name,
      cartCount: cart.items.length
    })
  );
  
  return <div>{combined.userName} - {combined.cartCount} items</div>;
}
```

## Stream Utilities

BlaC now provides powerful stream utilities for common patterns:

### Debouncing
```typescript
// Debounce search queries
for await (const state of BlocStreams.debounce(searchBloc, 500)) {
  performSearch(state.query);
}
```

### Throttling
```typescript
// Throttle position updates
for await (const state of BlocStreams.throttle(mouseBloc, 100)) {
  updatePosition(state.x, state.y);
}
```

### Filtering
```typescript
// Only react to positive values
for await (const state of BlocStreams.filter(counterBloc, s => s.count > 0)) {
  console.log('Positive count:', state.count);
}
```

### Mapping
```typescript
// Transform state values
for await (const doubled of BlocStreams.map(counterBloc, s => s.count * 2)) {
  console.log('Doubled:', doubled);
}
```

## Advanced Patterns

### Batching High-Frequency Updates
```typescript
// Process state updates in batches
for await (const batch of bloc.batchStream(100, 16)) {
  // Process up to 100 states every 16ms
  processBatch(batch);
}
```

### Event Analytics
```typescript
const { bloc } = useBlocStream(UserBloc);

useBlocEvents(UserBloc, {
  onEvent: (event) => {
    // Track all user events
    analytics.track(event.constructor.name, event);
  }
});
```

### Take Next State
```typescript
const { takeNext } = useBlocStream(DataBloc);

async function waitForData() {
  const nextState = await takeNext();
  console.log('Got next state:', nextState);
}
```

## Best Practices

1. **Cleanup is Automatic**: Generators handle cleanup automatically when iteration stops, eliminating memory leaks.

2. **Use AbortController**: For manual cancellation in effects:
   ```typescript
   useEffect(() => {
     const controller = new AbortController();
     
     (async () => {
       for await (const state of bloc.stateStream()) {
         if (controller.signal.aborted) break;
         // Process state
       }
     })();
     
     return () => controller.abort();
   }, [bloc]);
   ```

3. **Prefer Specialized Hooks**: Use `useDerivedState` and `useCombinedState` for computed values instead of manual subscriptions.

4. **Leverage Stream Utilities**: Use `BlocStreams` utilities for common patterns like debouncing and throttling.

## Timeline

- **v2.4.0** (Current): Callback APIs deprecated, console warnings added
- **v3.0.0** (Future): Callback APIs removed, full generator implementation

## Need Help?

- Check the [examples](../apps/demo/src/examples/GeneratorHooksExample.tsx)
- Read the [RFC](../project-archives/rfc-generator-integration.md)
- File an issue if you encounter problems during migration