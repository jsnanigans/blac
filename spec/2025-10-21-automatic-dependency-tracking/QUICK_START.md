# Automatic Dependency Tracking - Quick Start Guide

**TL;DR:** Components now automatically track which state properties they access. No selectors needed for simple cases!

## Basic Usage

### Before (Manual Selector)
```typescript
const [name] = useBlocAdapter(UserCubit, {
  selector: (state) => state.user.name
});
```

### After (Automatic Tracking) ✨
```typescript
const [state] = useBlocAdapter(UserCubit);
// Just access what you need - tracking is automatic!
return <div>{state.user.name}</div>;
```

## How It Works

1. **First Render**: Component accesses `state.user.name`
2. **Tracking**: System records that this component depends on `"user.name"`
3. **State Changes**: When state updates, system checks if `user.name` changed
4. **Smart Re-render**: Only re-renders if the accessed property actually changed

## Common Patterns

### Simple Property Access
```typescript
function UserCard() {
  const [state] = useBlocAdapter(UserCubit);
  // Tracks: user.name, user.email
  return (
    <div>
      <h1>{state.user.name}</h1>
      <p>{state.user.email}</p>
    </div>
  );
}
// ✅ Only re-renders when user.name or user.email changes
```

### Conditional Access (Dynamic Dependencies)
```typescript
function Counter() {
  const [state] = useBlocAdapter(CountCubit);
  // When visible=true: tracks both 'visible' and 'count'
  // When visible=false: tracks only 'visible'
  return (
    <div>
      {state.visible ? <span>{state.count}</span> : <span>Hidden</span>}
    </div>
  );
}
// ✅ Dependencies update automatically every 10 renders
```

### Multiple Components, Same State
```typescript
function UserName() {
  const [state] = useBlocAdapter(UserCubit);
  return <div>{state.user.name}</div>;
  // ✅ Only re-renders when user.name changes
}

function UserEmail() {
  const [state] = useBlocAdapter(UserCubit);
  return <div>{state.user.email}</div>;
  // ✅ Only re-renders when user.email changes
}
```

## When to Use Selectors vs Auto-Tracking

### Use Auto-Tracking When:
- ✅ Accessing simple properties
- ✅ Component uses 1-5 properties
- ✅ Properties are at most 2 levels deep
- ✅ You want less boilerplate

### Use Selectors When:
- ✅ Complex transformations needed
- ✅ Deeply nested properties (>2 levels)
- ✅ Derived/computed values
- ✅ Custom equality checks required

## Configuration

### Global Configuration
```typescript
import { Blac } from '@blac/core';

Blac.setConfig({
  proxyDependencyTracking: false,  // Disable auto-tracking globally
  proxyMaxDepth: 3                 // Increase tracking depth (default: 2)
});
```

### Disable for Specific Component
```typescript
// Just use a selector - auto-tracking is automatically disabled
const [name] = useBlocAdapter(UserCubit, {
  selector: (state) => state.user.name
});
```

## Debugging

### Enable Debug Logging
```typescript
import { enableGlobalDebug } from '@blac/react';

// Show what's being tracked
enableGlobalDebug();
```

Console output:
```
[DependencyTracker] Starting dependency tracking
[DependencyTracker] Accessed: user.name
[DependencyTracker] Tracked dependencies: ["user.name"]
[ReactBlocAdapter] Re-rendering sub-123 due to dependency change
```

### Enable DevTools
```typescript
import { enableDevTools } from '@blac/react';

enableDevTools();

// Access in browser console
window.__BLAC_DEVTOOLS__.getAllAdapters();
window.__BLAC_DEVTOOLS__.getGlobalStats();
```

## Example: Complete Component

```typescript
import { Cubit } from '@blac/core';
import { useBlocAdapter } from '@blac/react';

interface UserState {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      user: { name: 'Alice', email: 'alice@example.com', avatar: '...' },
      settings: { theme: 'light', notifications: true }
    });
  }

  updateName = (name: string) => {
    this.emit({
      ...this.state,
      user: { ...this.state.user, name }
    });
  };
}

// Component automatically tracks only accessed properties
function UserProfile() {
  const [state, cubit] = useBlocAdapter(UserCubit);

  // This component only re-renders when:
  // - state.user.name changes
  // - state.user.email changes
  // It does NOT re-render when:
  // - state.user.avatar changes
  // - state.settings.theme changes

  return (
    <div>
      <h1>{state.user.name}</h1>
      <p>{state.user.email}</p>
      <button onClick={() => cubit.updateName('Bob')}>
        Change Name
      </button>
    </div>
  );
}
```

## Performance Tips

1. **Keep State Flat**: Prefer `state.userName` over `state.user.profile.details.name`
2. **Watch Depth Limits**: Default is 2 levels - beyond that, tracking stops
3. **Use Selectors for Transforms**: `selector: (s) => s.items.filter(...)` is faster
4. **Monitor with DevTools**: Check if you're tracking too many dependencies

## Troubleshooting

### Problem: Component re-renders too often
**Solution:** Check what you're accessing. Even reading a property creates a dependency.

```typescript
// ❌ Bad - creates dependencies you might not need
const [state] = useBlocAdapter(UserCubit);
console.log(state); // Logs entire object, tracks everything!

// ✅ Good - only track what you render
const [state] = useBlocAdapter(UserCubit);
return <div>{state.user.name}</div>; // Only tracks user.name
```

### Problem: Not re-rendering when expected
**Solution:** Check tracking depth (default: 2 levels)

```typescript
// If accessing state.a.b.c.d (4 levels deep)
Blac.setConfig({ proxyMaxDepth: 4 });
```

### Problem: Performance seems slow
**Solution:** Use explicit selector for complex cases

```typescript
// ❌ Auto-tracking with complex transform (inefficient)
const [state] = useBlocAdapter(TodoCubit);
const filtered = state.todos.filter(t => !t.completed);

// ✅ Selector with transform (efficient)
const [active] = useBlocAdapter(TodoCubit, {
  selector: (state) => state.todos.filter(t => !t.completed)
});
```

## Live Example

See **Example #12** in the perf app (`apps/perf/src/examples/AdapterExamples.tsx`) for a comprehensive interactive demonstration.

Run the perf app:
```bash
cd apps/perf
pnpm dev
```

Navigate to "Performance" tab → "Automatic Dependency Tracking" example.

## Next Steps

- ✅ Start using auto-tracking in new components
- ✅ Keep selectors for complex cases
- ✅ Enable debugging during development
- ✅ Monitor render behavior with DevTools
- 📖 Read the full plan: `spec/2025-10-21-automatic-dependency-tracking/plan.md`

---

**Questions?** Check the troubleshooting guide or open an issue.
