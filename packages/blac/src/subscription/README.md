# Unified Subscription Model

## Overview

The unified subscription model replaces the dual consumer/observer system in BlaC with a single, consistent subscription mechanism. This reduces complexity, improves performance, and provides a cleaner API for state management.

## Architecture

### Core Components

1. **Subscription Interface** (`types.ts`)
   - Single interface for all subscription types
   - Supports selectors, custom equality functions, and priorities
   - Tracks dependencies and metadata

2. **SubscriptionManager** (`SubscriptionManager.ts`)
   - Manages all subscriptions with a single Map
   - Handles notification dispatch with priority ordering
   - Automatic weak reference cleanup
   - Path-based dependency tracking

3. **Backward Compatibility Adapters**
   - `ConsumerTrackerAdapter`: Maintains ConsumerTracker API
   - `BlacObservableAdapter`: Maintains BlacObservable API
   - Zero breaking changes for existing code

## Benefits

### 1. Simplified Mental Model

- Single subscription concept instead of two overlapping systems
- Consistent API across React and non-React usage
- Easier to understand and debug

### 2. Better Performance

- Single notification pass instead of dual system
- Reduced memory overhead
- O(1) subscription lookups
- Automatic dead reference cleanup

### 3. Enhanced Features

- Priority-based notification ordering
- Unified dependency tracking
- Consistent selector/equality function support
- Better TypeScript support

### 4. Reduced Complexity

- ~50% less code to maintain
- Single source of truth for subscriptions
- Eliminated circular dependencies
- Cleaner separation of concerns

## Migration Path

### Phase 1: Infrastructure (COMPLETE)

✅ Implement core subscription types and manager
✅ Create backward compatibility adapters
✅ Comprehensive test coverage

### Phase 2: Integration (IN PROGRESS)

⏳ Update BlocBase to use SubscriptionManager
⏳ Maintain existing APIs through adapters
⏳ Ensure all tests pass

### Phase 3: React Adapter

- Update useBloc to create unified subscriptions
- Optimize re-render logic with unified system
- Maintain backward compatibility

### Phase 4: Deprecation

- Mark old APIs as deprecated
- Provide migration guide
- Remove in next major version

## Usage Examples

### React-style Subscription

```typescript
// Subscribe to specific state slice
const unsubscribe = bloc.subscribeWithSelector(
  (state) => state.count,
  (newCount) => console.log('Count changed:', newCount),
);
```

### Observer-style Subscription

```typescript
// Subscribe with dependency array
const unsubscribe = bloc.observe(
  (newState, oldState) => console.log('State changed'),
  (state) => [state.user.id, state.settings.theme], // Only notify when these change
);
```

### Direct Subscription Manager Usage

```typescript
const subscription = subscriptionManager.subscribe({
  type: 'consumer',
  selector: (state) => state.items.length,
  equalityFn: (a, b) => a === b,
  notify: (length) => updateItemCount(length),
  priority: 10, // Higher priority = earlier notification
});
```

## Performance Considerations

1. **Selector Optimization**: Use memoized selectors for expensive computations
2. **Equality Functions**: Provide custom equality for complex objects
3. **Priority Usage**: Use priorities sparingly, only when order matters
4. **Weak References**: Automatic cleanup reduces memory leaks

## Future Enhancements

1. **Batched Notifications**: Group updates for better performance
2. **Async Selectors**: Support for async data derivation
3. **DevTools Integration**: Enhanced debugging capabilities
4. **Subscription Composition**: Combine multiple subscriptions

## Conclusion

The unified subscription model simplifies BlaC's architecture while maintaining full backward compatibility. It provides a solid foundation for future enhancements and makes the library easier to use and maintain.
