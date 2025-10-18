# BlaC Dependency Tracking System - Executive Summary

## What is Dependency Tracking?

Dependency tracking in BlaC determines when a React component should re-render in response to state changes in a Bloc/Cubit. It prevents unnecessary re-renders by selectively subscribing to only the state properties that matter to your component.

---

## Two Modes of Operation

### Mode 1: Manual Dependencies (Explicit)

```typescript
const [state, bloc] = useBloc(MyCubit, {
  dependencies: (bloc) => {
    return [bloc.state.userId, bloc.state.status];
  },
});
// Component ONLY re-renders when userId or status changes
```

**Characteristics:**
- Developer specifies exactly what to watch
- Best for complex applications
- Minimal performance overhead
- Full control over re-render behavior

### Mode 2: Proxy-Based Tracking (Automatic)

```typescript
const [state, bloc] = useBloc(MyCubit);
// Component re-renders when ANY accessed property changes
```

**Characteristics:**
- Automatic tracking of property accesses
- Best for simple applications
- Proxy overhead but no manual configuration
- Less control, more convenience

---

## How Dependencies Actually Work

### The Comparison Process (Step by Step)

**When you return `[userId, status]` from dependencies function:**

```
1. Function is called: const result = dependencies(bloc)
   └─ Returns: [1, "loading"]

2. Compared against previous: [1, "pending"]
   └─ Using Object.is() for each element

3. Result:
   └─ First element: 1 === 1 ? YES (same)
   └─ Second element: "loading" === "pending" ? NO (different)
   └─ Conclusion: CHANGED

4. When dependency changes detected:
   └─ dependencyValues updated to [1, "loading"]
   └─ stateSnapshot updated to current state
   └─ React notified → component re-renders
```

### The Storage Model

```
BlacAdapter keeps:
├─ dependencyValues     = [1, "loading"]    ← Current values
├─ stateSnapshot        = {...state...}    ← State at last change
└─ subscription         = {
    ├─ selector: function that calls your dependencies
    ├─ equalityFn: checks if selector result is same object
    └─ lastValue: [1, "loading"]
  }

When state changes:
1. Selector runs dependencies function
2. Gets [1, "loading"] again
3. Compares against previous [1, "loading"]
4. If same: return cached array (same object reference)
5. If different: return new array (different object reference)
6. Equality check sees object identity difference
7. Calls notify() only if arrays are different objects
```

### The State Snapshot: The Secret Sauce

```
Global Bloc State: {userId: 1, status: "loading", count: 0}

Your component watching: [userId, status]

When count changes to 1:
├─ Global state becomes: {userId: 1, status: "loading", count: 1}
├─ Your dependencies return: [1, "loading"] (unchanged!)
├─ stateSnapshot stays: {userId: 1, status: "loading", count: 0}
└─ Result: Component does NOT re-render

getSnapshot() returns the frozen snapshot, not the updated state
React sees no change → no re-render
```

---

## Key Concepts Explained

### Object.is() - The Comparison Function

```typescript
Object.is(1, 1)              // true
Object.is('hello', 'hello')  // true
Object.is({}, {})            // false (different objects)
Object.is(NaN, NaN)          // true (unlike ===)
Object.is(+0, -0)            // false (unlike ===)
```

**Why use it?**
- More strict than `===` for edge cases
- Correctly handles NaN (important for state values)
- Distinguishes between +0 and -0 (important for math)

### Generator Support

```typescript
dependencies: function*(bloc) {
  yield bloc.state.userId;
  yield bloc.state.status;
  // Lazy evaluation - stops early if change found
}
```

**Why generators?**
- Early exit optimization
- Only generates values until first change found
- More efficient for large dependency sets

### State Immutability

```typescript
// Each state change creates new object reference
this.emit({
  ...this.state,
  count: this.state.count + 1
});
// New object → comparison detects change
```

---

## Performance Characteristics

### Comparison Speed

| Scenario | Time | Notes |
|----------|------|-------|
| Dependencies unchanged | O(n) | n = # dependencies |
| First dependency changes | O(1) | Early exit |
| Last dependency changes | O(n) | Must check all |
| No dependencies tracked | O(1) | Just identity check |

### Memory Usage

| Component | Size | Notes |
|-----------|------|-------|
| dependencyValues | ~40 bytes + array | Minimal |
| stateSnapshot | 8 bytes | Reference only |
| Proxy tracking | 200+ bytes | More overhead |

**Manual dependencies:** 50-100 bytes per component
**Proxy tracking:** 500+ bytes per component

---

## When to Use Each Mode

### Use Manual Dependencies If:

- Your state is complex with many properties
- You want to optimize re-renders carefully
- Some state changes don't affect your component
- You're concerned about performance
- You want explicit control over behavior

```typescript
// Good example
useBloc(UserBloc, {
  dependencies: (bloc) => [bloc.state.currentUser?.id]
})
```

### Use Proxy Tracking If:

- Your state is small and simple
- Your component uses most properties
- You're prototyping or learning
- Performance isn't critical
- You want automatic behavior

```typescript
// Good example
useBloc(ToggleCubit)  // Just watching a boolean
```

---

## Common Patterns

### Pattern 1: Watch Specific Nested Property

```typescript
dependencies: (bloc) => {
  const user = bloc.state.users.find(u => u.id === userId);
  return [user?.name, user?.email];
}
```

**Effect:**
- Component re-renders only when this specific user's name/email changes
- Other users changing won't trigger re-render
- New users added won't trigger re-render

### Pattern 2: Conditional Dependencies

```typescript
dependencies: (bloc) => {
  if (!bloc.state.isAuthenticated) {
    return [];  // Watch nothing when not authenticated
  }
  return [bloc.state.currentUser?.id];
}
```

**Effect:**
- Component doesn't re-render when auth is off
- Reacts only to current user changes when authenticated

### Pattern 3: Multiple Computed Values

```typescript
dependencies: (bloc) => [
  bloc.state.firstName + ' ' + bloc.state.lastName,
  bloc.state.emails.length,
  bloc.state.isActive,
]
```

**Effect:**
- Component re-renders when computed values change
- Updates caught by watching multiple derived values

---

## Implementation Checklist

### Setting Up Manual Dependencies

```typescript
const [state, bloc] = useBloc(MyCubit, {
  // 1. Define dependencies function
  dependencies: (bloc) => {
    // 2. Extract values from bloc
    const value1 = bloc.state.property1;
    const value2 = bloc.state.property2;
    
    // 3. Return array of values to watch
    return [value1, value2];
  },
  
  // 4. (Optional) Setup lifecycle
  onMount: (bloc) => {
    console.log('Component mounted');
  },
  onUnmount: (bloc) => {
    console.log('Component unmounting');
  },
});

// 5. Component uses state normally
return <div>{state.property1}</div>;
```

### Debugging

```typescript
const [state, bloc] = useBloc(MyCubit, {
  dependencies: (bloc) => {
    const deps = [bloc.state.userId];
    console.log('Dependencies evaluated:', deps);
    return deps;
  },
});
// Watch console - if logged on every state change that's good!
// If logged only sometimes, dependencies might not be changing correctly
```

---

## Potential Pitfalls

### Pitfall 1: Creating New Objects

```typescript
// BAD - creates new array every render
dependencies: () => [bloc.state.id]  // No deps array!
dependencies: (bloc) => ({id: bloc.state.id})  // Object literal

// GOOD
dependencies: (bloc) => [bloc.state.id]
```

### Pitfall 2: Forgetting Object Immutability

```typescript
// BAD - mutating state
state.users.push(newUser);
this.emit(state);

// GOOD - creating new reference
this.emit({
  ...state,
  users: [...state.users, newUser]
});
```

### Pitfall 3: Expensive Computations

```typescript
// BAD - called on every state change
dependencies: (bloc) => {
  return [expensiveAlgorithm(bloc.state)];
}

// GOOD - cache or memoize
const computed = useMemo(() => expensiveAlgorithm(bloc.state), [bloc.state]);
dependencies: () => [computed]
```

### Pitfall 4: Comparing Objects

```typescript
// BAD - different objects always !== even if same values
dependencies: (bloc) => [bloc.state.user]  // Returns new object each time

// GOOD - watch specific properties
dependencies: (bloc) => [
  bloc.state.user?.id,
  bloc.state.user?.name,
  bloc.state.user?.email
]
```

---

## Real-World Example: User Profile Component

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AppState {
  users: User[];
  currentUserId: number | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
}

function UserProfileCard({ userId }: { userId: number }) {
  const [state] = useBloc(AppCubit, {
    dependencies: (bloc) => {
      // Only watch the specific user we're displaying
      const user = bloc.state.users.find(u => u.id === userId);
      
      // Return specific properties to watch
      return [
        user?.id,
        user?.name,
        user?.email,
        user?.role,
      ];
    },
  });

  // Component won't re-render if:
  // - Other users change
  // - Theme changes
  // - isLoading changes
  // - currentUserId changes
  //
  // Component WILL re-render if:
  // - This user's name/email/role changes
  // - User is added/removed (user becomes undefined or new object)

  const user = state.users.find(u => u.id === userId);

  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
      <span>{user?.role}</span>
    </div>
  );
}
```

---

## FAQ

### Q: Why does dependency tracking exist?

**A:** To prevent unnecessary React re-renders. When you have complex state with many properties, but your component only cares about a few, dependency tracking lets your component ignore changes to the properties it doesn't use.

### Q: Do I have to use dependencies?

**A:** No. If you don't provide a `dependencies` option, proxy tracking automatically tracks accessed properties. But manual dependencies give you explicit control for better performance.

### Q: What's the performance impact?

**A:** 
- Manual dependencies: negligible (just array comparisons)
- Proxy tracking: small overhead (proxy creation, path tracking)
- Not worth optimizing unless you have 100+ components

### Q: Can I use both?

**A:** No. If you provide `dependencies`, proxy tracking is automatically disabled for that component. This is by design to avoid redundancy.

### Q: What if I return different array lengths?

**A:** The component re-renders. If dependencies return `[a, b]` then next render returns `[a]`, that's a change.

### Q: Can I use generators?

**A:** Yes! `dependencies: function*(bloc) { yield bloc.state.a; yield bloc.state.b; }`

### Q: How do I debug if dependencies aren't working?

**A:** Add console.log to your dependencies function. If it logs every state change, dependencies are working. If it logs only sometimes, check your comparison logic.

---

## Key Takeaways

1. **Dependencies** control which state changes trigger re-renders
2. **Object.is()** compares values for strict equality
3. **State snapshots** freeze state when dependencies match
4. **Proxies** automatically track property access without manual config
5. **Manual mode** has better performance, **proxy mode** has better convenience
6. **Choose based on** your performance needs and preference for explicit vs automatic

---

## Resources

- Detailed Analysis: `dependency-tracking-analysis.md`
- Visual Diagrams: `dependency-flow-diagrams.md`
- Code Reference: `dependency-code-reference.md`
- Test Examples: `packages/blac-react/src/__tests__/useBloc.dependencies.test.tsx`

