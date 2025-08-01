# BlaC React Generator Hooks (Phase 3)

## Overview

Phase 3 introduces new React hooks that leverage async generators for enhanced stream processing capabilities. These hooks are fully backward compatible and provide more elegant patterns for handling state streams, events, and derived state.

## New Hooks

### `useBlocStream`

Enhanced version of `useBloc` that provides generator-based stream access alongside traditional state management.

```typescript
import { useBlocStream } from '@blac/react';

function Counter() {
  const { state, bloc, stream, takeNext } = useBlocStream(CounterBloc);
  
  // Traditional usage - fully backward compatible
  const handleIncrement = () => bloc.increment();
  
  // Stream usage for side effects
  useEffect(() => {
    (async () => {
      for await (const newState of stream) {
        console.log('State changed:', newState);
        // Break after 10 updates
        if (newState.count > 10) break;
      }
    })();
  }, [stream]);
  
  return <div>Count: {state.count}</div>;
}
```

### `useBlocEvents`

Subscribe to Bloc events using async generators with automatic cleanup.

```typescript
import { useBlocEvents } from '@blac/react';

function ActivityMonitor() {
  // Listen to all events
  useBlocEvents(UserActivityBloc, {
    onEvent: async (event) => {
      await analytics.track(event);
      console.log('User action:', event);
    }
  });
  
  // Listen to specific event types
  useBlocEvents(UserActivityBloc, {
    eventType: ClickEvent,
    onEvent: (event) => {
      updateClickHeatmap(event.position);
    }
  });
  
  return <div>Monitoring user activity...</div>;
}
```

### `useDerivedState`

Efficiently derive state with automatic memoization and custom equality checks.

```typescript
import { useDerivedState } from '@blac/react';

function UserProfile() {
  // Simple derived state
  const userName = useDerivedState(
    UserBloc,
    (state) => state.profile.name
  );
  
  // Complex computation with memoization
  const statistics = useDerivedState(
    DataBloc,
    (state) => calculateExpensiveStats(state.records),
    { memoize: true }
  );
  
  // Custom equality for arrays
  const activeItems = useDerivedState(
    ItemsBloc,
    (state) => state.items.filter(item => item.active),
    { isEqual: (a, b) => a.length === b.length }
  );
  
  return (
    <div>
      <h1>{userName}</h1>
      <Stats data={statistics} />
      <ItemList items={activeItems} />
    </div>
  );
}
```

### `useCombinedState`

Combine multiple bloc states into a single derived value.

```typescript
import { useCombinedState } from '@blac/react';

function Dashboard() {
  const summary = useCombinedState(
    {
      user: UserBloc,
      notifications: NotificationBloc,
      settings: SettingsBloc
    },
    ({ user, notifications, settings }) => ({
      greeting: `Hello, ${user.name}!`,
      unreadCount: notifications.filter(n => !n.read).length,
      theme: settings.theme,
      lastLogin: user.lastLogin
    })
  );
  
  return (
    <div className={`dashboard theme-${summary.theme}`}>
      <h1>{summary.greeting}</h1>
      <Badge count={summary.unreadCount} />
      <small>Last login: {summary.lastLogin}</small>
    </div>
  );
}
```

## Benefits Over Traditional Approach

### 1. **Memory Efficiency**
- Generators process one state at a time
- No array accumulation for event history
- Automatic cleanup on component unmount

### 2. **Better Async Patterns**
```typescript
// Before: Callback hell
useEffect(() => {
  const unsubscribe = bloc.subscribe((state) => {
    fetchData(state.id).then(data => {
      updateUI(data);
    }).catch(handleError);
  });
  return unsubscribe;
}, [bloc]);

// After: Clean async/await
useEffect(() => {
  (async () => {
    for await (const state of bloc.stateStream()) {
      try {
        const data = await fetchData(state.id);
        updateUI(data);
      } catch (error) {
        handleError(error);
      }
    }
  })();
}, [bloc]);
```

### 3. **Natural Composition**
```typescript
// Combine streams elegantly
for await (const state of BlocStreams.debounce(searchBloc, 300)) {
  const results = await searchAPI(state.query);
  displayResults(results);
}
```

### 4. **Fine-grained Updates**
```typescript
// Only re-render when specific values change
const theme = useDerivedState(
  SettingsBloc,
  (state) => state.appearance.theme
);
// Component only updates when theme changes, not other settings
```

## Migration Guide

### Gradual Adoption

All new hooks are compatible with existing code. You can adopt them gradually:

```typescript
// Existing code continues to work
const [state, bloc] = useBloc(CounterBloc);

// New hooks can be used alongside
const events = useBlocEvents(CounterBloc, {
  onEvent: (e) => console.log(e)
});
```

### Common Patterns

#### Pattern 1: Event Logging
```typescript
// Before
const [state, bloc] = useBloc(UserBloc);
useEffect(() => {
  // Manual event tracking
}, [state]);

// After
useBlocEvents(UserBloc, {
  onEvent: async (event) => {
    await logger.log(event);
  }
});
```

#### Pattern 2: Computed Values
```typescript
// Before
const [state, bloc] = useBloc(CartBloc);
const total = useMemo(() => 
  state.items.reduce((sum, item) => sum + item.price, 0),
  [state.items]
);

// After
const total = useDerivedState(
  CartBloc,
  (state) => state.items.reduce((sum, item) => sum + item.price, 0)
);
```

#### Pattern 3: Multi-Bloc Dependencies
```typescript
// Before
const [userState] = useBloc(UserBloc);
const [cartState] = useBloc(CartBloc);
const combined = useMemo(() => ({
  user: userState.name,
  itemCount: cartState.items.length
}), [userState.name, cartState.items]);

// After
const combined = useCombinedState(
  { user: UserBloc, cart: CartBloc },
  ({ user, cart }) => ({
    user: user.name,
    itemCount: cart.items.length
  })
);
```

## Performance Considerations

1. **Stream Lifecycle**: Streams are lazy - they only process when actively consumed
2. **Memory Usage**: Generators use constant memory regardless of state history length
3. **CPU Usage**: Derived state selectors run only when source state changes

## Best Practices

1. **Use the Right Hook**:
   - `useBloc` - Simple state access and actions
   - `useBlocStream` - When you need async iteration
   - `useBlocEvents` - For side effects on events
   - `useDerivedState` - For computed/filtered state

2. **Cleanup Streams**: Always let effects complete naturally or use AbortController

3. **Memoize Expensive Selectors**:
   ```typescript
   const result = useDerivedState(
     DataBloc,
     expensiveComputation,
     { memoize: true }
   );
   ```

4. **Custom Equality for Reference Types**:
   ```typescript
   const items = useDerivedState(
     ItemsBloc,
     (state) => state.items,
     { isEqual: (a, b) => a.length === b.length && a[0]?.id === b[0]?.id }
   );
   ```

## TypeScript Support

All hooks are fully typed with TypeScript inference:

```typescript
// Types are inferred automatically
const userName = useDerivedState(UserBloc, state => state.name);
// userName: string

const summary = useCombinedState(
  { user: UserBloc, cart: CartBloc },
  ({ user, cart }) => ({ 
    name: user.name,
    total: cart.total 
  })
);
// summary: { name: string, total: number }
```

## Future Enhancements

- WebSocket integration with streams
- Time-travel debugging with generators
- Replay functionality for event streams
- Advanced stream operators (sample, buffer, window)

## Summary

Phase 3's generator-based hooks provide a modern, efficient approach to state management in React while maintaining full backward compatibility. They reduce boilerplate, improve performance, and make complex state operations more intuitive.