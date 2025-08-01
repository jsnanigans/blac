# RFC: Generator Integration for BlaC

## Overview

This RFC proposes integrating async generators into the BlaC state management library to enhance its stream processing capabilities while maintaining backward compatibility with the existing API.

## Goal

Leverage JavaScript/TypeScript async generators to provide a more elegant, memory-efficient, and composable approach to handling state streams and event processing in BlaC, without breaking existing user code.

## Benefits

### 1. **Memory Efficiency**

- Generators process items one at a time, eliminating the need for array accumulation
- Natural backpressure handling prevents memory overflow in high-frequency state updates
- Lazy evaluation means values are computed only when needed

### 2. **Improved Developer Experience**

- Async iteration with `for await...of` provides cleaner syntax than callback-based observers
- Built-in error handling with try/catch in async functions
- Natural composition of stream operations

### 3. **Better Resource Management**

- Generator `finally` blocks guarantee cleanup, eliminating complex disposal state machines
- Automatic cleanup when iteration stops
- No more manual unsubscribe management in many cases

### 4. **Enhanced Debugging**

- Stream operations can be easily tapped for logging
- Each yielded value can be inspected
- Stack traces are more meaningful with async/await

### 5. **Future-Proof Architecture**

- Generators are a standard JavaScript feature with excellent performance
- Enables future additions like CRDT support and distributed state
- Aligns with modern JavaScript patterns

## Reasons for This Approach

### Current Pain Points

1. **Event Queue Management**: The current array-based queue with `shift()` operations is inefficient for high-frequency events
2. **Complex Disposal Logic**: Multiple disposal states (ACTIVE, DISPOSAL_REQUESTED, DISPOSING, DISPOSED) create race conditions
3. **Memory Leaks**: Manual observer management can lead to forgotten unsubscribe calls
4. **Limited Composability**: Current observer pattern doesn't compose well for derived state

### Why Generators Solve These Issues

- **Event Queues**: Generators naturally queue and process items sequentially
- **Disposal**: Generator cleanup in `finally` blocks is guaranteed by the JavaScript engine
- **Memory Management**: Generators are garbage collected when no longer referenced
- **Composability**: Async generators compose naturally with standard operators

## Implementation Phases

### Phase 1: Addition of Stream APIs (No Breaking Changes)

**Timeline**: v2.1.0
**Risk**: Low

Add new methods alongside existing APIs:

- `BlocBase.stateStream()`: Returns async generator of state changes
- `BlocBase.stateChanges()`: Returns generator of state transitions with previous/current
- `Bloc.events()`: Returns async generator of all events
- `Bloc.eventsOfType<T>()`: Returns filtered event stream
- New `BlocStreams` utility namespace for stream operations

### Phase 2: Internal Optimizations

**Timeline**: v2.2.0
**Risk**: Medium

Replace internal implementations with generators:

- Event queue becomes generator-based channel
- Observer notification uses generator pattern internally
- Batch processing leverages generator backpressure

### Phase 3: Enhanced React Integration

**Timeline**: v2.3.0
**Risk**: Low

Add new hooks that leverage generators:

- `useBlocStream()`: Subscribe to state via generators
- `useBlocEvents()`: Subscribe to events
- `useDerivedState()`: Compute derived state efficiently

### Phase 4: Deprecation and Documentation

**Timeline**: v2.4.0
**Risk**: Low

- Mark callback-based APIs as deprecated
- Provide migration guides
- Update all examples to use generator patterns

### Phase 5: Major Version with Cleanup (Optional)

**Timeline**: v3.0.0
**Risk**: High

- Remove deprecated APIs
- Simplify internal architecture
- Full generator-based implementation

## High-Level Changes

### 1. New Public APIs

```typescript
// State streaming
abstract class BlocBase<S> {
  // New methods
  async *stateStream(): AsyncGenerator<S, void, void>
  async *stateChanges(): AsyncGenerator<{previous: S, current: S}, void, void>
}

// Event streaming
abstract class Bloc<S, A> extends BlocBase<S> {
  // New methods
  async *events(): AsyncGenerator<A, void, void>
  async *eventsOfType<E extends A>(EventType: new(...args: any[]) => E): AsyncGenerator<E, void, void>
}

// Utility namespace
namespace BlocStreams {
  function *combineStates<T extends Record<string, BlocBase<any>>>(blocs: T): AsyncGenerator<CombinedState<T>>
  function *deriveState<S, D>(bloc: BlocBase<S>, selector: (state: S) => D): AsyncGenerator<D>
  function *debounce<S>(bloc: BlocBase<S>, ms: number): AsyncGenerator<S>
  function *throttle<S>(bloc: BlocBase<S>, ms: number): AsyncGenerator<S>
}
```

### 2. Internal Architecture Changes

```typescript
// Before: Array-based event queue
private _eventQueue: A[] = [];
private _isProcessingEvent = false;

// After: Generator-based event channel
private _eventChannel = this._createEventChannel();
private async *_createEventChannel(): AsyncGenerator<A, void, void> {
  // Generator implementation
}
```

### 3. Simplified Disposal

```typescript
// Before: Complex state machine
private _disposalState: BlocLifecycleState = BlocLifecycleState.ACTIVE;
private _atomicStateTransition(expected: BlocLifecycleState, new: BlocLifecycleState): StateTransitionResult

// After: Generator lifecycle
private *_lifecycle(): Generator<void, void, boolean> {
  try {
    while (true) {
      const shouldDispose = yield;
      if (shouldDispose && this._consumers.size === 0) break;
    }
  } finally {
    // Guaranteed cleanup
    this._cleanup();
  }
}
```

### 4. React Integration Examples

```typescript
// New hook using generators
function useBlocStream<S>(bloc: BlocBase<S>): S {
  const [state, setState] = useState<S>(bloc.state);

  useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      for await (const newState of bloc.stateStream()) {
        if (abortController.signal.aborted) break;
        setState(newState);
      }
    })();

    return () => abortController.abort();
  }, [bloc]);

  return state;
}

// Usage in components
function Counter() {
  const bloc = useBloc(CounterBloc);
  const count = useBlocStream(bloc);

  // Or use events
  useEffect(() => {
    (async () => {
      for await (const event of bloc.eventsOfType(IncrementEvent)) {
        console.log('Increment!');
      }
    })();
  }, [bloc]);

  return <div>{count}</div>;
}
```

## Migration Guide

### For Library Users

Existing code continues to work:

```typescript
// This still works
const bloc = new CounterBloc();
bloc.add(new IncrementEvent());
const unsubscribe = bloc.subscribe((state) => console.log(state));
```

New generator-based approach available:

```typescript
// New way
const bloc = new CounterBloc();
bloc.add(new IncrementEvent());

for await (const state of bloc.stateStream()) {
  console.log(state);
}
```

### For Library Maintainers

1. Run tests after each phase to ensure compatibility
2. Update documentation with generator examples
3. Monitor performance metrics
4. Gather user feedback before proceeding to next phase

## Success Metrics

1. **No breaking changes** in Phases 1-3
2. **Performance improvement** in event processing (target: 20% faster)
3. **Memory usage reduction** for high-frequency updates (target: 50% less)
4. **Positive developer feedback** on new APIs
5. **Smooth migration** with less than 5% of users reporting issues

## Risks and Mitigation

| Risk                   | Impact | Mitigation                                                    |
| ---------------------- | ------ | ------------------------------------------------------------- |
| Browser compatibility  | Medium | Generators are well-supported, provide polyfill documentation |
| Performance regression | High   | Benchmark each phase, rollback if needed                      |
| User confusion         | Medium | Extensive documentation and examples                          |
| Hidden edge cases      | High   | Comprehensive test suite, beta releases                       |

## Alternative Approaches Considered

1. **RxJS Integration**: Too heavy, adds significant bundle size
2. **Custom Stream Implementation**: Reinventing the wheel, generators are standard
3. **Complete Rewrite**: Too disruptive, breaks existing code
4. **Status Quo**: Misses opportunity to improve developer experience

## Conclusion

Integrating async generators into BlaC provides significant benefits while maintaining backward compatibility. The phased approach minimizes risk and allows for community feedback at each stage. This evolution positions BlaC as a modern, efficient state management solution that embraces JavaScript's native capabilities.

## References

- [MDN: Async Generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator)
- [TC39: Async Iteration Proposal](https://github.com/tc39/proposal-async-iteration)
- [JavaScript Info: Generators](https://javascript.info/generators)
