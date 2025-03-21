# Blac Framework TODO

This document tracks features that are described in the documentation but require implementation or enhancement in the actual packages.

## High Priority Features

### Event Transformation in Bloc
**Status:** Documented but needs implementation
**Reasoning:** Event transformation enables critical reactive patterns like debouncing and filtering events before they're processed, essential for search inputs and form validation to prevent unnecessary API calls and improve performance.

```typescript
// As shown in docs
this.transform(SearchQueryChanged, events => 
  events.pipe(
    debounceTime(300),
    distinctUntilChanged((prev, curr) => prev.query === curr.query)
  )
);
```

### Concurrent Event Processing
**Status:** Documented but needs implementation
**Reasoning:** Allows non-dependent events to be processed simultaneously, significantly improving performance for apps with many parallel operations like data fetching from multiple sources.

```typescript
// As shown in docs
this.concurrentEventProcessing = true;
```

## Medium Priority Features

### `patch()` Method Enhancements
**Status:** Basic implementation exists, needs enhancement
**Reasoning:** The current implementation needs better handling of nested objects and arrays to reduce boilerplate when updating complex state structures.

```typescript
// Current usage that's verbose for nested updates
this.patch({ 
  loadingState: { 
    ...this.state.loadingState,
    isInitialLoading: false 
  } 
});

// Desired usage with path-based updates
this.patch('loadingState.isInitialLoading', false);
```

### Improved Instance Management
**Status:** Basic support exists, needs enhancement
**Reasoning:** The `isolated` and `keepAlive` static properties need more robust lifecycle management and memory optimization to prevent memory leaks in large applications.

## Low Priority Features

### TypeSafe Events
**Status:** Documented but basic implementation
**Reasoning:** Event type checking could be improved to provide compile-time safety when dispatching events to the appropriate handlers.

```typescript
// Goal: Make this relationship type-safe at compile time
this.on(IncrementPressed, this.increment);
```

### Enhanced Debugging Tools
**Status:** Minimally implemented
**Reasoning:** Developer tools for inspecting bloc state transitions and event flows would make debugging complex state management issues much easier, especially for larger applications.

## Future Considerations

### Server-side Bloc Support
**Status:** Not implemented
**Reasoning:** Supporting SSR with Blac would improve SEO and initial load performance for Next.js and other SSR frameworks.

### Persistence Adapters
**Status:** Not implemented
**Reasoning:** Built-in support for persisting bloc state to localStorage, sessionStorage, or IndexedDB would greatly simplify offline-first app development. 