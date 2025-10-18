# BlaC Dependency Tracking - Quick Start Guide

## 30-Second Summary

Dependency tracking controls when React components re-render in response to state changes. Tell BlaC which state values matter to your component, and it will only re-render when those values change.

```typescript
const [state, bloc] = useBloc(MyCubit, {
  dependencies: (bloc) => [bloc.state.userId, bloc.state.status]
  // Re-renders ONLY when userId or status changes
});
```

---

## Visual Overview

```
┌─────────────────────────────────────┐
│   State Change Happens              │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│   BlaC Checks: Did Watched Values   │
│   (userId, status) Change?          │
└────────────┬────────────────────────┘
      ↙      ↘
    YES      NO
     │        │
     ↓        └─→ NO RE-RENDER
    ↓
┌──────────────────────────────────────┐
│   Update stateSnapshot               │
│   React calls getSnapshot()          │
│   RE-RENDER COMPONENT                │
└──────────────────────────────────────┘
```

---

## Two Modes at a Glance

### Mode 1: Manual Dependencies (Better Performance)

```typescript
// ✅ Best when: complex state, multiple components, performance critical
useBloc(MyCubit, {
  dependencies: (bloc) => {
    const user = bloc.state.users.find(u => u.id === userId);
    return [user?.name, user?.email];
  }
})
```

**Benefits:**
- Explicit control
- Better performance
- Smaller payload
- Predictable behavior

---

### Mode 2: Proxy Tracking (Better Convenience)

```typescript
// ✅ Best when: simple state, few components, rapid prototyping
useBloc(MyCubit)
// Automatically tracks which properties you access
```

**Benefits:**
- No configuration
- Automatic tracking
- Less to think about
- Easy to get started

---

## Implementation Steps

### Step 1: Decide What to Watch

```typescript
// What state properties matter to THIS component?
const [state, bloc] = useBloc(UserListBloc, {
  dependencies: (bloc) => [
    bloc.state.users,           // Watch the array
    bloc.state.selectedUserId,  // Watch the selection
    bloc.state.isLoading        // Watch loading state
  ]
});
```

### Step 2: Use State Normally

```typescript
// Component still gets current state
return (
  <div>
    {state.isLoading && <p>Loading...</p>}
    {state.users.map(user => (
      <div key={user.id}
           onClick={() => bloc.selectUser(user.id)}>
        {user.name}
      </div>
    ))}
  </div>
);
```

### Step 3: Trigger State Changes

```typescript
// When these change, component re-renders:
bloc.addUser(newUser);           // ← users changed
bloc.selectUser(2);              // ← selectedUserId changed
bloc.setLoading(true);           // ← isLoading changed

// When these change, component does NOT re-render:
bloc.updateTheme('dark');        // ← not in dependencies
bloc.incrementCount();           // ← not in dependencies
```

---

## Common Patterns

### Pattern 1: Watch Specific Properties

```typescript
dependencies: (bloc) => [
  bloc.state.firstName,
  bloc.state.lastName,
  bloc.state.email
]
```

### Pattern 2: Computed Values

```typescript
dependencies: (bloc) => [
  bloc.state.firstName + ' ' + bloc.state.lastName,  // Concat
  bloc.state.emails.length,                           // Count
  bloc.state.isActive                                 // Boolean
]
```

### Pattern 3: Nested Extraction

```typescript
dependencies: (bloc) => {
  const user = bloc.state.users.find(u => u.id === userId);
  return [user?.id, user?.name, user?.role];
}
```

### Pattern 4: Conditional

```typescript
dependencies: (bloc) => {
  if (!bloc.state.isAuthenticated) {
    return [];  // Watch nothing if not authenticated
  }
  return [bloc.state.currentUser?.id];
}
```

### Pattern 5: Generator (Lazy)

```typescript
dependencies: function*(bloc) {
  yield bloc.state.id;
  yield bloc.state.name;
  // Stops early if first value changes
}
```

---

## Decision Tree: Which Mode?

```
Does your state have many properties?
├─ YES → Use Manual Dependencies
│        dependencies: (bloc) => [/* specific ones */]
│
└─ NO → Use Proxy Tracking
         useBloc(MyCubit)

Is performance critical?
├─ YES → Use Manual Dependencies
│        (more control, less overhead)
│
└─ NO → Use Either (both fine)

Want explicit control?
├─ YES → Use Manual Dependencies
│
└─ NO → Use Proxy Tracking
```

---

## Performance Impact

### Manual Dependencies
- **Memory per component:** ~50-100 bytes
- **Comparison cost:** O(n) where n = dependency count
- **Best for:** 10+ components or complex state

### Proxy Tracking
- **Memory per component:** ~500+ bytes
- **Comparison cost:** Property access tracking
- **Best for:** Simple apps or 1-5 components

**Bottom line:** Unless you have 50+ components, neither matters much.

---

## Debugging

### Problem: Component re-renders too often

```typescript
// Debug: Log every time dependencies are evaluated
dependencies: (bloc) => {
  const deps = [bloc.state.userId];
  console.log('Deps evaluated:', deps);  // If logged often, something's wrong
  return deps;
}

// Solution: Check if you're creating new objects
// ❌ Wrong:
dependencies: (bloc) => [bloc.state.user]  // New object every time

// ✅ Correct:
dependencies: (bloc) => [bloc.state.user?.id, bloc.state.user?.name]
```

### Problem: Component not re-rendering when it should

```typescript
// Debug: Are dependencies actually changing?
dependencies: (bloc) => {
  const value = bloc.state.count;
  console.log('Count changed to:', value);
  return [value];
}

// Solution: Is state actually being updated?
// ❌ Wrong:
this.state.count++;  // ❌ Mutating state
this.emit(this.state);

// ✅ Correct:
this.emit({...this.state, count: this.state.count + 1});
```

---

## Common Mistakes

### Mistake 1: Creating New Objects

```typescript
// ❌ BAD
dependencies: (bloc) => ({id: bloc.state.id})

// ✅ GOOD
dependencies: (bloc) => [bloc.state.id]
```

### Mistake 2: Watching Entire State

```typescript
// ❌ BAD - defeats the purpose
dependencies: (bloc) => [bloc.state]

// ✅ GOOD - be specific
dependencies: (bloc) => [bloc.state.userId]
```

### Mistake 3: Using Comparison Operators

```typescript
// ❌ BAD - functions never ===
dependencies: (bloc) => [bloc.increment]

// ✅ GOOD - use values or methods
dependencies: (bloc) => [bloc.state.count]
```

### Mistake 4: Not Returning Array

```typescript
// ❌ BAD
dependencies: (bloc) => bloc.state.id

// ✅ GOOD
dependencies: (bloc) => [bloc.state.id]
```

---

## Testing Your Dependencies

```typescript
it('should only re-render when dependencies change', () => {
  let renderCount = 0;

  function TestComponent() {
    const [state] = useBloc(MyCubit, {
      dependencies: (bloc) => [bloc.state.userId]
    });
    
    renderCount++;
    return <div>{renderCount}</div>;
  }

  render(<TestComponent />);
  
  expect(renderCount).toBe(1);
  
  // Trigger change to userId
  screen.getByRole('button').click();
  
  // Should have re-rendered
  expect(renderCount).toBe(2);
});
```

---

## When Should I Use Dependencies?

### Use If:
✅ You have complex state (10+ properties)
✅ You want to optimize re-renders
✅ Same bloc used by many components
✅ Some state changes don't affect your component
✅ You're concerned about performance

### Skip If:
❌ Your state is simple (1-5 properties)
❌ You use most of the state
❌ You're just prototyping
❌ Performance isn't a concern
❌ You're learning the library

---

## Real-World Example

```typescript
// User profile page
interface AppState {
  users: User[];
  currentUserId: number | null;
  theme: 'light' | 'dark';
  notifications: Notification[];
  isOnline: boolean;
}

function UserProfile({ userId }: { userId: number }) {
  const [state, bloc] = useBloc(AppCubit, {
    // Only re-render when THIS user changes
    dependencies: (bloc) => {
      const user = bloc.state.users.find(u => u.id === userId);
      return [user?.id, user?.name, user?.email, user?.role];
    }
  });

  const user = state.users.find(u => u.id === userId);

  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
      <p>Role: {user?.role}</p>
    </div>
  );
}

// This component does NOT re-render if:
// - Other users change ✓
// - Theme changes ✓
// - Notifications arrive ✓
// - Online status changes ✓
//
// This component DOES re-render if:
// - This user's name changes ✓
// - This user's email changes ✓
// - This user's role changes ✓
```

---

## Next Steps

1. **Understand:** Read [DEPENDENCY_TRACKING_SUMMARY.md](./DEPENDENCY_TRACKING_SUMMARY.md)
2. **Visualize:** Look at [dependency-flow-diagrams.md](./dependency-flow-diagrams.md)
3. **Implement:** Use patterns above in your component
4. **Debug:** Use debugging section if issues arise
5. **Deep dive:** Read [dependency-tracking-analysis.md](./dependency-tracking-analysis.md) if needed

---

## Key Takeaways

1. Dependencies tell BlaC which state values matter to your component
2. Component only re-renders when those values change
3. Use `dependencies` for performance in complex apps
4. Use default proxy tracking for convenience in simple apps
5. Both modes are valid, choose based on your needs

---

## Related Documentation

- **Full Index:** [INDEX_DEPENDENCY_TRACKING.md](./INDEX_DEPENDENCY_TRACKING.md)
- **Complete Guide:** [DEPENDENCY_TRACKING_SUMMARY.md](./DEPENDENCY_TRACKING_SUMMARY.md)
- **Visual Diagrams:** [dependency-flow-diagrams.md](./dependency-flow-diagrams.md)
- **Code Reference:** [dependency-code-reference.md](./dependency-code-reference.md)
- **Technical Details:** [dependency-tracking-analysis.md](./dependency-tracking-analysis.md)

