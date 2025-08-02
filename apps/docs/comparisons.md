# Comparison with Other Solutions

BlaC takes a unique approach to state management by focusing on separation of concerns and developer experience. Here's how it compares to popular alternatives:

## vs Redux

**Community Pain Points**: Developers report having to "touch five different files just to make one change" and struggle with TypeScript integration requiring separate type definitions for actions, action types, and objects.

**How BlaC Addresses These**:

- **Minimal boilerplate**: One class with methods that call `emit()` - no actions, action creators, or reducers
- **Automatic TypeScript inference**: State types flow naturally from your class definition without manual type annotations
- **No Redux Toolkit learning curve**: Simple API that doesn't require learning additional abstractions

## vs MobX

**Community Pain Points**: Observable arrays aren't real arrays (breaks with lodash, Array.concat), can't make primitive values observable, dynamic property additions require special handling, and debugging automatic reactions can be challenging.

**How BlaC Addresses These**:

- **Standard JavaScript objects**: Your state is plain JS/TS - no special array types or observable primitives to worry about
- **Predictable updates**: Explicit `emit()` calls make state changes traceable through your codebase
- **No "magic" to debug**: While MobX uses proxies for automatic reactivity, BlaC only uses them for render optimization

## vs Context + useReducer

**Community Pain Points**: Any context change re-renders ALL consuming components (even if they only use part of the state), no built-in async support, and complex apps require extensive memoization to prevent performance issues.

**How BlaC Addresses These**:

- **Automatic render optimization**: Only re-renders components that use the specific properties that changed
- **Built-in async patterns**: Handle async operations naturally in your state container methods
- **No manual memoization needed**: Performance optimization happens automatically without useMemo/useCallback
- **No context providers**: Any component can access any state container without needing to wrap it in a provider

## vs Zustand/Valtio

**Community Pain Points**: Zustand requires manual selectors for each component usage, both are designed for module state (not component state), and mixing mutable (Valtio) with React's immutable model can cause confusion.

**How BlaC Addresses These**:

- **Flexible state patterns**: Use `isolated` for component-specific state or share state across components
- **Clear architectural patterns**: Cubit for simple cases, Bloc for complex event-driven scenarios
- **Consistent mental model**: Always use explicit updates, matching React's immutable state philosophy

## Quick Comparison Table

| Feature            | Redux               | MobX      | Context API        | Zustand          | BlaC      |
| ------------------ | ------------------- | --------- | ------------------ | ---------------- | --------- |
| **Boilerplate**    | High                | Low       | Medium             | Low              | Low       |
| **TypeScript**     | Manual              | Good      | Good               | Good             | Automatic |
| **Async Support**  | Redux-Thunk/Saga    | Built-in  | Manual             | Manual           | Built-in  |
| **Performance**    | Manual optimization | Automatic | Manual memoization | Manual selectors | Automatic |
| **Learning Curve** | Steep               | Moderate  | Low                | Low              | Low       |
| **DevTools**       | Excellent           | Good      | Basic              | Good             | Good      |
| **Testing**        | Complex             | Moderate  | Complex            | Simple           | Simple    |
| **Code Splitting** | Manual              | Automatic | N/A                | Manual           | Automatic |

## When to Choose BlaC

Choose BlaC when you want:

- **Clean architecture** with separated business logic
- **Minimal boilerplate** without sacrificing power
- **Automatic performance optimization** without manual work
- **First-class TypeScript support** with zero type annotations
- **Flexible patterns** that scale from simple to complex apps
- **Easy testing** with isolated business logic

## Migration Strategies

### From Redux

1. Start by converting one Redux slice to a Cubit
2. Use BlaC's event-driven Bloc pattern for complex flows
3. Gradually migrate feature by feature
4. Keep Redux DevTools integration with BlaC's plugin system

### From MobX

1. Convert observable classes to Cubits
2. Replace reactions with explicit method calls
3. Use computed getters for derived state
4. Maintain the same component structure

### From Context API

1. Extract context logic into Cubits
2. Replace useContext with useBloc
3. Remove Provider components
4. Enjoy automatic performance benefits

### From Zustand

1. Convert stores to Cubits (very similar API)
2. Remove manual selectors
3. Use instance management for component state
4. Keep the same mental model

## Summary

BlaC provides a modern approach to state management that addresses common pain points while maintaining simplicity. It's not trying to be a drop-in replacement for other solutions, but rather a better way to structure your application's state management from the ground up.
