# BlaC API Improvements & Missing Features

**Date**: 2025-01-16
**Based on**: Documentation analysis, guide patterns, and competitive research (Zustand, Jotai, TanStack Query, Recoil, MobX)

---

## Executive Summary

Based on analysis of the playground guides, current API surface, and feature comparison with leading state management libraries, this document outlines **20 high-value API improvements** that would make BlaC more powerful, developer-friendly, and competitive.

**Key Findings:**
- Developers spend significant effort on async patterns (loading/error states, retry logic, caching)
- Missing middleware/plugin ecosystem compared to Zustand
- No built-in data fetching utilities like TanStack Query
- Lacks developer tools integration
- Missing parametric state patterns (like Jotai's atom families)

---

## 🔴 Critical Missing APIs

### 1. **AsyncCubit/QueryCubit Base Class**

**Problem:** Every guide shows developers manually implementing discriminated unions for async states. This is repetitive boilerplate.

**Solution:** Provide a base class that handles async loading states:

```typescript
// Proposed API
class UserCubit extends AsyncCubit<User, Error> {
  fetchUser = async (id: string) => {
    return this.execute(async () => {
      const user = await api.getUser(id);
      return user;
    });
  };
}

// Automatically provides:
// - state: { status: 'idle' | 'loading' | 'success' | 'error', data?, error? }
// - execute() method that handles loading/error states
// - retry() method
// - reset() method
```

**Inspiration:** TanStack Query's `useQuery`, but as a Cubit base class.

**Priority:** 🔴 **CRITICAL** - Appears in almost every async pattern guide.

---

### 2. **useCubit Hook (Separate from useBloc)**

**Problem:** Documentation uses `useBloc` for both Blocs and Cubits, which is confusing.

**Solution:** Add a dedicated `useCubit` hook for Cubits:

```typescript
// More explicit and semantically correct
const [state, cubit] = useCubit(CounterCubit);

// vs current (confusing)
const [state, cubit] = useBloc(CounterCubit);
```

**Benefits:**
- Better TypeScript inference
- Clearer distinction between event-driven (Bloc) and simple state (Cubit)
- Matches community conventions (useQuery vs useMutation)

**Priority:** 🔴 **CRITICAL** - Low effort, high clarity improvement.

---

### 3. **Middleware/Interceptor API**

**Problem:** Plugin system exists but is complex. Developers need simple middleware for common tasks.

**Solution:** Add Zustand-style middleware API:

```typescript
// Proposed API
const logger = (cubit) => (next) => (action) => {
  console.log('Action:', action);
  const result = next(action);
  console.log('New State:', cubit.state);
  return result;
};

class CounterCubit extends Cubit<number> {
  static middleware = [logger, persist, devtools];

  constructor() {
    super(0);
  }
}
```

**Built-in middleware suggestions:**
- `logger` - Console logging
- `persist` - LocalStorage/SessionStorage
- `devtools` - Redux DevTools integration
- `retry` - Automatic retry on errors
- `throttle` - Throttle state updates
- `debounce` - Debounce state updates

**Inspiration:** Zustand's middleware system.

**Priority:** 🟡 **HIGH** - Dramatically improves DX for common patterns.

---

### 4. **Query & Mutation Abstractions**

**Problem:** Data fetching patterns (caching, revalidation, optimistic updates) require tons of boilerplate.

**Solution:** Provide query/mutation primitives like TanStack Query:

```typescript
// Proposed API
class UsersCubit extends QueryCubit<User[]> {
  constructor() {
    super({
      queryKey: 'users',
      queryFn: () => api.getUsers(),
      staleTime: 5000,
      cacheTime: 60000,
    });
  }
}

class CreateUserCubit extends MutationCubit<User, CreateUserInput> {
  constructor() {
    super({
      mutationFn: (input) => api.createUser(input),
      onSuccess: () => {
        // Invalidate users query
        Blac.invalidateQuery('users');
      },
    });
  }
}
```

**Features:**
- Automatic caching with configurable TTL
- Stale-while-revalidate pattern
- Request deduplication
- Automatic retry with exponential backoff
- Optimistic updates
- Query invalidation
- Parallel queries
- Dependent queries

**Inspiration:** TanStack Query (React Query).

**Priority:** 🟡 **HIGH** - Massive DX improvement for API-heavy apps.

---

## 🟡 High-Value Features

### 5. **Parametric Blocs (Bloc Families)**

**Problem:** Creating multiple instances with different parameters requires manual instance management.

**Solution:** Add parametric blocs like Jotai's atom families:

```typescript
// Proposed API
const UserCubitFamily = createBlocFamily((userId: string) => {
  return new UserCubit(userId);
});

// Usage
function UserProfile({ userId }: { userId: string }) {
  const [state, cubit] = useBloc(UserCubitFamily(userId));
  // Automatically creates/reuses instances based on userId
}
```

**Benefits:**
- Automatic instance management
- Type-safe parameters
- Memory efficient (auto-cleanup when unused)

**Inspiration:** Jotai's `atomFamily`, Recoil's `atomFamily`.

**Priority:** 🟡 **HIGH** - Common pattern in list/detail views.

---

### 6. **DevTools Integration**

**Problem:** No way to inspect state, time-travel debug, or visualize state changes.

**Solution:** Redux DevTools integration:

```typescript
// Enable in development
Blac.setConfig({
  devtools: true, // Automatically connects to Redux DevTools
});

// Features:
// - View all active Blocs/Cubits
// - Inspect current state
// - Time-travel debugging
// - Action/event history
// - State diff visualization
```

**Inspiration:** Redux DevTools, MobX DevTools.

**Priority:** 🟡 **HIGH** - Essential for debugging complex apps.

---

### 7. **Automatic Retry Logic Utility**

**Problem:** Guides show manual exponential backoff implementation every time.

**Solution:** Built-in retry decorator/utility:

```typescript
// Proposed API
class DataCubit extends Cubit<Data> {
  @retry({ maxAttempts: 3, backoff: 'exponential' })
  fetchData = async () => {
    const data = await api.getData();
    this.emit(data);
  };
}

// Or as a utility
class DataCubit extends Cubit<Data> {
  fetchData = withRetry(async () => {
    const data = await api.getData();
    this.emit(data);
  }, { maxAttempts: 3 });
}
```

**Inspiration:** TanStack Query's retry configuration.

**Priority:** 🟡 **HIGH** - Reduces boilerplate for a very common pattern.

---

### 8. **Optimistic Update Helpers**

**Problem:** Implementing optimistic updates requires careful state management and rollback logic.

**Solution:** Provide optimistic update utilities:

```typescript
// Proposed API
class TodoCubit extends Cubit<TodoState> {
  toggleTodo = async (id: string) => {
    this.optimistic(
      // Optimistic update
      (state) => ({
        ...state,
        items: state.items.map(item =>
          item.id === id ? { ...item, completed: !item.completed } : item
        ),
      }),
      // Server call
      async () => {
        await api.toggleTodo(id);
      }
      // Automatic rollback on error
    );
  };
}
```

**Features:**
- Automatic rollback on error
- Loading state tracking
- Error handling
- Confirmation on success

**Inspiration:** TanStack Query's optimistic updates.

**Priority:** 🟡 **HIGH** - Common in modern apps.

---

### 9. **Request Deduplication**

**Problem:** Multiple components calling the same async operation creates duplicate requests.

**Solution:** Built-in request deduplication:

```typescript
// Proposed API
class UserCubit extends Cubit<User> {
  @dedupe() // Automatically deduplicates concurrent calls
  fetchUser = async (id: string) => {
    const user = await api.getUser(id);
    this.emit(user);
  };
}

// Or configure globally
Blac.setConfig({
  deduplicateRequests: true,
});
```

**Inspiration:** TanStack Query, SWR.

**Priority:** 🟢 **MEDIUM** - Performance optimization for API-heavy apps.

---

### 10. **Enhanced Persistence API**

**Problem:** Current persistence plugin is basic. Developers need migrations, selective persistence, and encryption.

**Solution:** Enhanced persistence configuration:

```typescript
// Proposed API
class AppCubit extends Cubit<AppState> {
  static persistence = {
    key: 'app-state',
    storage: 'local', // 'local' | 'session' | 'indexedDB' | custom
    version: 2, // For migrations
    migrate: (persistedState, version) => {
      if (version < 2) {
        return { ...persistedState, newField: 'default' };
      }
      return persistedState;
    },
    partialize: (state) => ({
      // Only persist these fields
      user: state.user,
      settings: state.settings,
    }),
    encrypt: true, // Optional encryption
  };
}
```

**Features:**
- Multiple storage backends
- Schema migrations
- Selective persistence (partialize)
- Encryption support
- Compression
- TTL/expiration

**Inspiration:** Zustand's persist middleware.

**Priority:** 🟢 **MEDIUM** - Important for production apps.

---

## 🟢 Quality of Life Improvements

### 11. **State Snapshots & History**

**Problem:** No built-in way to capture state snapshots or implement undo/redo.

**Solution:** Snapshot utilities:

```typescript
// Proposed API
class EditorCubit extends Cubit<EditorState> {
  static history = true; // Enable history tracking

  undo = () => {
    this.history.undo();
  };

  redo = () => {
    this.history.redo();
  };

  snapshot = () => {
    return this.history.snapshot();
  };

  restore = (snapshot) => {
    this.history.restore(snapshot);
  };
}
```

**Inspiration:** Immer's patches, Redux Toolkit's history.

**Priority:** 🟢 **MEDIUM** - Useful for editors, forms, etc.

---

### 12. **Computed/Derived State Helpers**

**Problem:** While computed properties exist, there's no memoization or dependency tracking built-in.

**Solution:** Computed state decorator:

```typescript
// Proposed API
class CartCubit extends Cubit<CartState> {
  @computed
  get total(): number {
    // Automatically memoized and cached
    return this.state.items.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0
    );
  }

  @computed
  get itemCount(): number {
    return this.state.items.length;
  }
}
```

**Features:**
- Automatic memoization
- Dependency tracking
- Lazy evaluation
- Cache invalidation

**Inspiration:** MobX computed, Recoil selectors.

**Priority:** 🟢 **MEDIUM** - Performance optimization.

---

### 13. **React Suspense Integration**

**Problem:** No built-in Suspense support for async Blocs.

**Solution:** Suspense-aware Blocs:

```typescript
// Proposed API
class UserCubit extends SuspenseCubit<User> {
  constructor(userId: string) {
    super(async () => {
      return await api.getUser(userId);
    });
  }
}

// Usage with Suspense
function UserProfile() {
  const [user] = useCubit(UserCubit, { suspense: true });
  return <div>{user.name}</div>; // No loading state needed
}
```

**Inspiration:** Recoil async selectors, Jotai async atoms.

**Priority:** 🟢 **MEDIUM** - Modern React pattern.

---

### 14. **Error Boundary Integration**

**Problem:** Errors in Blocs don't integrate with React Error Boundaries.

**Solution:** Error boundary support:

```typescript
// Proposed API
class DataCubit extends Cubit<Data> {
  static throwOnError = true; // Throw to Error Boundary

  fetchData = async () => {
    try {
      const data = await api.getData();
      this.emit(data);
    } catch (error) {
      // Automatically caught by Error Boundary if throwOnError is true
      throw error;
    }
  };
}
```

**Priority:** 🟢 **MEDIUM** - Better error handling patterns.

---

### 15. **Testing Utilities**

**Problem:** No built-in testing helpers. Developers write custom test utilities.

**Solution:** Test utilities package:

```typescript
// Proposed API
import { createBlocTest } from '@blac/testing';

describe('CounterCubit', () => {
  it('increments count', async () => {
    const { cubit, expectState } = createBlocTest(CounterCubit);

    cubit.increment();

    expectState({ count: 1 });
  });

  it('handles async operations', async () => {
    const { cubit, waitForState } = createBlocTest(DataCubit);

    cubit.fetchData();

    await waitForState((state) => state.status === 'success');
    expect(cubit.state.data).toBeDefined();
  });
});
```

**Features:**
- Mock Blac instance
- State assertions
- Async state waiting
- Event spy/mock
- Time-travel testing

**Inspiration:** `@testing-library/react`, `redux-mock-store`.

**Priority:** 🟢 **MEDIUM** - Essential for test-driven development.

---

### 16. **Server-Side Rendering (SSR) Utilities**

**Problem:** Hydrating state from server is manual and error-prone.

**Solution:** SSR hydration helpers:

```typescript
// Server
const serverState = await Blac.prefetchAll([
  { bloc: UserCubit, params: { userId } },
  { bloc: PostsCubit, params: { page: 1 } },
]);

// Client
Blac.hydrate(serverState);
```

**Features:**
- Server-side prefetching
- Serialization/deserialization
- Hydration warnings
- Type-safe hydration

**Priority:** 🟢 **MEDIUM** - Important for Next.js, Remix apps.

---

### 17. **Selector Performance Profiler**

**Problem:** No way to measure selector/dependency tracking performance.

**Solution:** Built-in profiler:

```typescript
// Proposed API
Blac.setConfig({
  profiler: {
    enabled: true,
    logSlowSelectors: true,
    threshold: 16, // ms (one frame)
  },
});

// Console output:
// [BlaC Profiler] Selector in CartCubit took 23ms (above 16ms threshold)
```

**Inspiration:** React Profiler.

**Priority:** 🟢 **LOW** - Nice-to-have for optimization.

---

### 18. **Batch State Updates API**

**Problem:** `_batchUpdates` exists internally but isn't documented or exposed properly.

**Solution:** Public batch API:

```typescript
// Proposed API
cubit.batch(() => {
  cubit.updateField1('value1');
  cubit.updateField2('value2');
  cubit.updateField3('value3');
  // Only one re-render
});
```

**Priority:** 🟢 **LOW** - Performance optimization for bulk updates.

---

### 19. **Atomic Transactions**

**Problem:** No way to ensure multiple Bloc updates happen atomically.

**Solution:** Transaction API:

```typescript
// Proposed API
await Blac.transaction(async () => {
  await userCubit.updateProfile(profile);
  await settingsCubit.updatePreferences(prefs);
  await analyticsCubit.trackEvent('profile_updated');
  // All succeed or all rollback
});
```

**Inspiration:** Database transactions.

**Priority:** 🟢 **LOW** - Advanced use case.

---

### 20. **Visual State Graph Generator**

**Problem:** Hard to visualize Bloc dependencies and state flow in complex apps.

**Solution:** Generate dependency graphs:

```bash
# CLI command
npx blac graph --output ./state-graph.png

# Generates visual diagram showing:
# - All Blocs/Cubits
# - Instance management (shared/isolated/keepAlive)
# - Dependencies between Blocs
# - Event flow
```

**Inspiration:** MobX spy, Redux DevTools.

**Priority:** 🟢 **LOW** - Documentation/debugging tool.

---

## 📊 Priority Matrix

| Priority | Count | Examples |
|----------|-------|----------|
| 🔴 **CRITICAL** | 2 | AsyncCubit, useCubit hook |
| 🟡 **HIGH** | 6 | Middleware, Query/Mutation, DevTools, Retry, Optimistic updates, Parametric Blocs |
| 🟢 **MEDIUM** | 7 | Deduplication, Persistence, History, Computed helpers, Suspense, Error boundaries, Testing |
| 🟢 **LOW** | 5 | Profiler, Batch API, Transactions, State graph |

---

## 🎯 Recommended Implementation Order

### Phase 1: Developer Experience (0-3 months)
1. **useCubit hook** - Quick win, low effort
2. **AsyncCubit base class** - Massive DX improvement
3. **DevTools integration** - Essential debugging tool
4. **Testing utilities** - Enable TDD

### Phase 2: Advanced Features (3-6 months)
5. **Middleware API** - Ecosystem enabler
6. **Query/Mutation abstractions** - Competitive with TanStack Query
7. **Automatic retry logic** - Common pattern
8. **Optimistic updates** - Modern UX

### Phase 3: Performance & Scale (6-12 months)
9. **Request deduplication** - Performance
10. **Parametric Blocs** - Scale pattern
11. **Enhanced persistence** - Production readiness
12. **Computed helpers** - Performance
13. **Suspense integration** - Modern React

### Phase 4: Polish (12+ months)
14. Remaining features based on community feedback

---

## 💡 Competitive Analysis

| Feature | BlaC | Zustand | Jotai | TanStack Query | Recoil | MobX |
|---------|------|---------|-------|----------------|--------|------|
| Middleware | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| DevTools | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Async utilities | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Query/Mutation | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Persistence | 🟡 | ✅ | ✅ | ✅ | ❌ | ❌ |
| Testing utils | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSR support | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Suspense | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Parametric state | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Computed values | 🟡 | ❌ | ✅ | ❌ | ✅ | ✅ |

**Legend:**
- ✅ Full support
- 🟡 Partial support
- ❌ Not supported

---

## 🚀 Quick Wins (Low Effort, High Impact)

1. **useCubit hook** - 1 day, massive clarity improvement
2. **AsyncCubit base class** - 3-5 days, eliminates tons of boilerplate
3. **Retry decorator** - 2-3 days, common pattern
4. **Testing utilities** - 1 week, enables TDD
5. **Public batch API** - 1 day, already exists internally

---

## 📝 Community Feedback

Consider creating GitHub Discussions for:
- Which features would provide the most value?
- What pain points do developers face most often?
- What's preventing adoption of BlaC over alternatives?

---

## 🎓 Learning from Competitors

**From Zustand:**
- Simplicity wins (minimal API surface)
- Middleware ecosystem is powerful
- No Provider pattern is loved

**From Jotai:**
- Atomic, composable state is powerful
- Parametric state (atom families) is essential
- TypeScript-first approach

**From TanStack Query:**
- Specialized tools (queries/mutations) beat general-purpose
- Smart defaults (caching, retry, deduplication)
- Developer experience is everything

**From MobX:**
- Automatic reactivity is magical
- Computed values must be memoized
- Transactions for consistency

---

## ✅ Conclusion

BlaC has a solid foundation with Blocs, Cubits, and proxy-based tracking. However, to compete with modern state management libraries and reduce developer friction, the suggested improvements would:

1. **Reduce boilerplate** (AsyncCubit, retry, optimistic updates)
2. **Improve DX** (useCubit, DevTools, testing utilities)
3. **Enable advanced patterns** (middleware, parametric blocs, queries)
4. **Match competitors** (persistence, SSR, Suspense)

**Biggest opportunities:**
- AsyncCubit could be BlaC's "killer feature" (no other library has this)
- Middleware API enables community ecosystem
- Query/Mutation abstractions compete directly with TanStack Query

**Next Steps:**
1. Validate these suggestions with community feedback
2. Prioritize based on user pain points
3. Start with quick wins (useCubit, AsyncCubit)
4. Build incrementally with backward compatibility
