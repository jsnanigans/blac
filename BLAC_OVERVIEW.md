# Blac State Management - Feature Overview & Best Practices

## Overview

Blac is a TypeScript-first state management library for React implementing the Bloc/Cubit pattern. It provides predictable state management with automatic instance lifecycle, smart sharing, and excellent type safety.

## Core Packages

### @blac/core
Zero-dependency state management foundation providing:
- **Cubit**: Simple state containers with direct `emit()` and `patch()` methods
- **Bloc**: Event-driven containers using reducer-based state transitions
- **Instance Management**: Automatic sharing, isolation, and lifecycle control
- **Memory Management**: Built-in cleanup and disposal mechanisms

### @blac/react
React integration layer providing:
- **useBloc Hook**: Connects components to state containers with automatic re-rendering
- **Dependency Tracking**: Selective subscriptions to minimize unnecessary renders
- **External Store Integration**: Leverages React's `useSyncExternalStore` for optimal performance

## Key Features

### Smart Instance Management
- **Shared by Default**: Same class instances automatically shared across components
- **Isolation**: Use `static isolated = true` for component-specific state
- **Keep Alive**: Use `static keepAlive = true` to persist beyond component lifecycle
- **Custom IDs**: Create controlled sharing groups with unique identifiers

### Type Safety
- **Full TypeScript Support**: Comprehensive type inference for state and methods
- **Generic Constraints**: Strong typing throughout the API surface
- **Runtime Validation**: Built-in state change validation and error handling

### Performance Optimizations
- **Lazy Initialization**: Instances created only when needed
- **Proxy-based Tracking**: Smart dependency tracking minimizes re-renders
- **Batched Updates**: Multiple state changes trigger single notifications
- **Memory Efficient**: Automatic cleanup prevents memory leaks

### Developer Experience
- **Minimal Boilerplate**: Clean, intuitive API design
- **Error Handling**: Graceful error recovery and debugging support
- **Memory Monitoring**: Built-in tools for tracking resource usage
- **Testing Friendly**: Easy to mock and test in isolation

## Best Practices

### State Container Design

**Choose the Right Pattern**:
- Use **Cubit** for simple state logic with direct mutations
- Use **Bloc** for complex event-driven state with formal transitions

**Method Definition**:
- Always use arrow functions for methods that access `this`
- Keep business logic in state containers, not components
- Favor `patch()` over `emit()` for partial state updates

**Instance Configuration**:
- Mark containers as `isolated` when each component needs its own instance
- Use `keepAlive` sparingly for truly persistent global state
- Provide meaningful custom IDs for controlled sharing groups

### React Integration

**Hook Usage**:
- Destructure `[state, container]` from `useBloc()` consistently
- Use selectors for performance-critical components with large state
- Place `useBloc()` calls at component top level, never conditionally

**Component Organization**:
- Keep components focused on presentation logic
- Move all business logic to state containers
- Use lifecycle callbacks (`onMount`, `onUnmount`) for side effects

**Performance Optimization**:
- Access only needed state properties to minimize re-renders
- Avoid spreading entire state objects unnecessarily
- Use React.memo() for components with expensive renders

### Memory Management

**Cleanup Strategy**:
- Let default disposal handle most scenarios automatically
- Use `Blac.getMemoryStats()` to monitor resource usage
- Call `Blac.disposeBlocs()` for bulk cleanup when needed
- Validate consumers periodically with `Blac.validateConsumers()`

**Resource Monitoring**:
- Check memory stats during development
- Set up cleanup routines for long-running applications
- Monitor keep-alive containers to prevent accumulation

### Error Handling

**State Validation**:
- Validate state shape in constructors
- Handle async operation errors within state containers
- Use try-catch blocks around state mutations

**Debugging Support**:
- Enable logging with `Blac.enableLog = true` during development
- Use meaningful constructor props for debugging context
- Implement proper error boundaries in React components

### Testing Strategies

**Unit Testing**:
- Test state containers independently of React components
- Use dependency injection for external services
- Verify state transitions and method calls

**Integration Testing**:
- Test complete user workflows with React Testing Library
- Mock external dependencies at the container level
- Verify proper cleanup and memory management

### Architecture Guidelines

**Separation of Concerns**:
- **Presentation Layer**: React components handle UI rendering
- **Business Logic Layer**: Blac containers manage state and logic
- **Data Layer**: Services handle external API calls and persistence

**Container Communication**:
- Use `Blac.getBloc()` sparingly for container-to-container communication
- Prefer event-driven patterns over direct method calls
- Keep coupling loose between different state containers

**Scalability Patterns**:
- Group related state containers in feature modules
- Use consistent naming conventions across containers
- Document container responsibilities and relationships

## Common Pitfalls to Avoid

- **Memory Leaks**: Not disposing of keep-alive containers when no longer needed
- **Over-sharing**: Using global shared state for component-specific data
- **Performance Issues**: Accessing unnecessary state properties causing extra renders
- **Type Errors**: Using regular functions instead of arrow functions for methods
- **Circular Dependencies**: Directly importing containers within other containers
- **Testing Problems**: Not mocking external dependencies in container tests

## Migration and Adoption

**Incremental Adoption**:
- Start with isolated containers for new features
- Gradually migrate existing state to Blac containers
- Use alongside existing state management temporarily

**Team Onboarding**:
- Establish coding standards for container design
- Create reusable patterns and templates
- Document container responsibilities and interfaces

Blac provides a robust foundation for TypeScript applications requiring predictable state management with excellent developer experience and performance characteristics.