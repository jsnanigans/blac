# TanStack Query Integration Analysis: Could it Replace AsyncCubit?

**Date**: 2025-01-16
**Question**: Should BlaC leverage TanStack Query for AsyncCubit/LoadingCubit instead of building from scratch?

---

## TL;DR

**Short Answer**: Yes and No.

- **YES** for data fetching (queries/mutations) - TanStack Query is battle-tested and feature-rich
- **NO** for general async operations - BaseCubit pattern is broader than just data fetching
- **BEST**: Hybrid approach - integrate both, use each for what it's best at

---

## Understanding the Two Tools

### What TanStack Query Provides

TanStack Query is a **server state management** library focused on data fetching:

```typescript
// TanStack Query usage
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => api.getUser(userId),
  staleTime: 5000,
  retry: 3,
});

const mutation = useMutation({
  mutationFn: (user) => api.updateUser(user),
  onSuccess: () => {
    queryClient.invalidateQueries(['users']);
  },
});
```

**Features**:
- ✅ Automatic caching with configurable TTL
- ✅ Background refetching / stale-while-revalidate
- ✅ Request deduplication
- ✅ Retry with exponential backoff
- ✅ Loading/error state management
- ✅ Optimistic updates
- ✅ Query invalidation and cache management
- ✅ Pagination / infinite scrolling
- ✅ DevTools for debugging
- ✅ SSR/hydration support
- ✅ Offline support with persister plugins

---

### What BaseCubit Provides

BaseCubit (from real-world usage analysis) is a **general async operation tracker**:

```typescript
// BaseCubit usage (from production code)
class UserCubit extends BaseCubit<UserState> {
  fetchUser = async (id: string) => {
    this.startLoading('fetch-user');  // Track this specific operation
    try {
      const user = await api.getUser(id);
      this.emit({ ...this.state, user });
    } finally {
      this.stopLoading('fetch-user');
    }
  };

  deleteUser = async (id: string) => {
    this.startLoading(`delete-${id}`);  // Multiple concurrent operations
    try {
      await api.deleteUser(id);
      this.emit({
        ...this.state,
        users: this.state.users.filter(u => u.id !== id)
      });
    } finally {
      this.stopLoading(`delete-${id}`);
    }
  };

  // Can track ANY async operation, not just API calls
  processFile = async (file: File) => {
    this.startLoading('process-file');
    try {
      await someComplexOperation(file);
    } finally {
      this.stopLoading('process-file');
    }
  };
}

// State includes loading tracking
interface UserState {
  loading: string[];           // ['fetch-user', 'delete-123']
  isLoading: boolean;
  users: User[];
  // ... other state
}
```

**Features**:
- ✅ Multi-key loading state (track multiple operations)
- ✅ Timeout protection (90s default - prevents infinite spinners)
- ✅ Analytics integration (track operation duration)
- ✅ Part of larger state object (loading + data + UI state together)
- ✅ Works for ANY async operation (not just data fetching)
- ✅ Granular UI control (can show loading on specific buttons)

---

## Key Differences

| Aspect | TanStack Query | BaseCubit |
|--------|----------------|-----------|
| **Purpose** | Server state (data fetching) | General async operations |
| **Scope** | Queries/mutations only | Any async operation |
| **State** | Separate from app state | Part of app state |
| **Caching** | Automatic with TTL | Manual |
| **Retry** | Built-in exponential backoff | Manual |
| **Loading** | Single operation per query | Multiple concurrent operations |
| **Timeout** | No built-in timeout | 90s timeout protection |
| **Analytics** | No built-in tracking | Built-in duration tracking |
| **Architecture** | Hooks-based | Class-based (Cubit) |
| **Integration** | Separate system | Part of BlaC ecosystem |

---

## Real-World Usage Comparison

### Scenario 1: Simple Data Fetching

**With TanStack Query**:
```typescript
function UserProfile({ userId }: Props) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <Profile user={user} />;
}
```

**With BaseCubit**:
```typescript
class UserCubit extends BaseCubit<UserState> {
  fetchUser = async (id: string) => {
    this.startLoading('fetch-user');
    try {
      const user = await api.getUser(id);
      this.emit({ ...this.state, user });
    } catch (error) {
      this.emit({ ...this.state, error: error.message });
    } finally {
      this.stopLoading('fetch-user');
    }
  };
}

function UserProfile({ userId }: Props) {
  const [state, cubit] = useBloc(UserCubit);

  useEffect(() => {
    cubit.fetchUser(userId);
  }, [userId]);

  if (state.isLoading) return <Spinner />;
  if (state.error) return <Error message={state.error} />;
  return <Profile user={state.user} />;
}
```

**Winner**: TanStack Query - Less boilerplate, automatic caching, better DX.

---

### Scenario 2: Multiple Concurrent Operations

**With TanStack Query**:
```typescript
function UserList() {
  // Each query tracks its own loading state
  const users = useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries(['users']),
  });

  return (
    <div>
      {users.isLoading && <Spinner />}
      {users.data?.map(user => (
        <div key={user.id}>
          {user.name}
          <button
            onClick={() => deleteUser.mutate(user.id)}
            disabled={deleteUser.isLoading}
          >
            {/* ❌ Problem: Can't show loading on specific row */}
            {deleteUser.isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

**With BaseCubit**:
```typescript
class UserCubit extends BaseCubit<UserState> {
  deleteUser = async (id: string) => {
    this.startLoading(`delete-${id}`);  // ✅ Unique key per user
    try {
      await api.deleteUser(id);
      this.emit({
        ...this.state,
        users: this.state.users.filter(u => u.id !== id),
      });
    } finally {
      this.stopLoading(`delete-${id}`);
    }
  };
}

function UserList() {
  const [state, cubit] = useBloc(UserCubit);

  return (
    <div>
      {state.users.map(user => (
        <div key={user.id}>
          {user.name}
          <button
            onClick={() => cubit.deleteUser(user.id)}
            disabled={cubit.isLoadingKey(`delete-${user.id}`)}
          >
            {/* ✅ Can show loading on specific button */}
            {cubit.isLoadingKey(`delete-${user.id}`)
              ? 'Deleting...'
              : 'Delete'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Winner**: BaseCubit - Granular loading state per row, better UX.

---

### Scenario 3: Non-Data-Fetching Async Operations

**Example**: File upload with progress tracking

**With TanStack Query**:
```typescript
// ❌ Doesn't fit well - not really a "query" or "mutation"
const uploadMutation = useMutation({
  mutationFn: (file: File) => uploadFile(file),
});

// No built-in progress tracking
// Need custom state management anyway
```

**With BaseCubit**:
```typescript
class UploadCubit extends BaseCubit<UploadState> {
  uploadFile = async (file: File) => {
    this.startLoading('upload');
    try {
      // Can track progress as part of state
      await uploadWithProgress(file, (progress) => {
        this.emit({
          ...this.state,
          uploadProgress: progress
        });
      });
      this.emit({ ...this.state, uploadComplete: true });
    } finally {
      this.stopLoading('upload');
    }
  };
}
```

**Winner**: BaseCubit - TanStack Query isn't designed for this.

---

### Scenario 4: Complex State + Data Fetching

**Example**: Chat application with local state + API calls

**With TanStack Query Alone**:
```typescript
// ❌ Need to manage local state separately
const messages = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: () => api.getMessages(conversationId),
});

// ❌ Local state separate from server state
const [typingUsers, setTypingUsers] = useState([]);
const [messageQueue, setMessageQueue] = useState([]);
const [isConnected, setIsConnected] = useState(false);

// ❌ Becomes fragmented
```

**With BaseCubit**:
```typescript
class ChatCubit extends BaseCubit<ChatState> {
  // ✅ All state in one place
  state = {
    messages: [],
    typingUsers: [],
    messageQueue: [],
    isConnected: false,
    loading: [],
    isLoading: false,
  };

  // Data fetching
  fetchMessages = async (conversationId: string) => {
    this.startLoading('fetch-messages');
    // ...
  };

  // Local state
  addTypingUser = (userId: string) => {
    this.emit({
      ...this.state,
      typingUsers: [...this.state.typingUsers, userId],
    });
  };
}
```

**Winner**: BaseCubit - Better for complex state that mixes local + server state.

---

## Integration Strategies

### Strategy 1: Replace AsyncCubit with TanStack Query (❌ Not Recommended)

**Approach**: Use only TanStack Query, remove BlaC entirely for data fetching.

```typescript
// Only use TanStack Query
function UserProfile() {
  const { data, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: api.getUser,
  });

  // ❌ But what about non-data-fetching state?
  // Need useState/useReducer anyway
  const [uiState, setUiState] = useState({});
}
```

**Pros**:
- Don't reinvent the wheel
- Mature ecosystem with great features

**Cons**:
- Doesn't replace BaseCubit - only covers data fetching
- Loses BlaC's unified state management
- Need separate solution for UI/app state
- Doesn't integrate with BlaC ecosystem
- No solution for non-API async operations

**Verdict**: ❌ **Not viable** - TanStack Query doesn't cover all use cases.

---

### Strategy 2: QueryCubit - Wrap TanStack Query Inside BlaC (🟡 Possible)

**Approach**: Create a `QueryCubit` that uses TanStack Query internally but exposes BlaC API.

```typescript
// Proposed: QueryCubit that wraps TanStack Query
class UserCubit extends QueryCubit<User[]> {
  constructor() {
    super({
      queryKey: ['users'],
      queryFn: () => api.getUsers(),
      staleTime: 5000,
    });
  }

  // Automatically provides:
  // - this.state.data: User[]
  // - this.state.isLoading: boolean
  // - this.state.error: Error | null
  // - this.refetch()
  // - this.invalidate()

  // Can extend with custom logic
  deleteUser = async (id: string) => {
    await api.deleteUser(id);
    this.invalidate(); // Refetch
  };
}

// Usage - looks like normal BlaC
function UserList() {
  const [state, cubit] = useBloc(UserCubit);

  if (state.isLoading) return <Spinner />;
  return <List data={state.data} />;
}
```

**Implementation**:
```typescript
import { useQueryClient, useQuery, QueryKey, QueryFunction } from '@tanstack/react-query';

interface QueryCubitOptions<T> {
  queryKey: QueryKey;
  queryFn: QueryFunction<T>;
  staleTime?: number;
  cacheTime?: number;
  retry?: number;
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export class QueryCubit<T> extends Cubit<QueryState<T>> {
  protected queryKey: QueryKey;
  protected queryFn: QueryFunction<T>;
  protected options: QueryCubitOptions<T>;

  constructor(options: QueryCubitOptions<T>) {
    super({
      data: null,
      isLoading: false,
      error: null,
    });

    this.queryKey = options.queryKey;
    this.queryFn = options.queryFn;
    this.options = options;
  }

  // These would be called by a custom useQueryCubit hook
  // that integrates with TanStack Query under the hood
}

// Custom hook that bridges BlaC and TanStack Query
function useQueryCubit<T>(
  CubitClass: new () => QueryCubit<T>
): [QueryState<T>, QueryCubit<T>] {
  const cubit = useMemo(() => new CubitClass(), []);

  // Use TanStack Query internally
  const { data, isLoading, error } = useQuery({
    queryKey: cubit.queryKey,
    queryFn: cubit.queryFn,
    staleTime: cubit.options.staleTime,
  });

  // Sync TanStack Query state to Cubit state
  useEffect(() => {
    cubit.emit({ data, isLoading, error });
  }, [data, isLoading, error]);

  return [cubit.state, cubit];
}
```

**Pros**:
- Leverage TanStack Query's features (caching, retry, etc.)
- Keep BlaC API consistent
- Best of both worlds
- Can extend with custom logic

**Cons**:
- Additional abstraction layer
- Potential performance overhead
- Might not expose all TanStack Query features
- Complex internal implementation
- Doesn't solve non-data-fetching use cases

**Verdict**: 🟡 **Possible but complex** - Could work but adds significant complexity.

---

### Strategy 3: Hybrid - Use Both (✅ Recommended)

**Approach**: Use TanStack Query for **server state**, BlaC for **application/UI state**.

```typescript
// TanStack Query for data fetching
function UserProfile() {
  // ✅ Use TanStack Query for server state
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
    staleTime: 60000,
  });

  // ✅ Use BlaC for UI/app state
  const [uiState, uiCubit] = useBloc(UserProfileUICubit);

  return (
    <div>
      {isLoading && <Spinner />}
      {user && (
        <>
          <Profile user={user} />
          <EditButton
            onClick={() => uiCubit.openEditModal()}
            disabled={uiState.editModalOpen}
          />
          {uiState.editModalOpen && <EditModal />}
        </>
      )}
    </div>
  );
}

// BlaC for UI state only
class UserProfileUICubit extends Cubit<UIState> {
  constructor() {
    super({
      editModalOpen: false,
      selectedTab: 'info',
    });
  }

  openEditModal = () => {
    this.emit({ ...this.state, editModalOpen: true });
  };

  closeEditModal = () => {
    this.emit({ ...this.state, editModalOpen: false });
  };

  selectTab = (tab: string) => {
    this.emit({ ...this.state, selectedTab: tab });
  };
}
```

**Division of Responsibilities**:

```
┌─────────────────────────────────────────────────┐
│                Application State                 │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────┐      ┌─────────────────┐  │
│  │  TanStack Query │      │      BlaC       │  │
│  │   (Server State) │      │  (App/UI State) │  │
│  ├─────────────────┤      ├─────────────────┤  │
│  │ • User data     │      │ • Modal state   │  │
│  │ • Posts         │      │ • Tab selection │  │
│  │ • Comments      │      │ • Form state    │  │
│  │ • Cached API    │      │ • UI toggles    │  │
│  │ • Mutations     │      │ • View state    │  │
│  │ • Invalidation  │      │ • Workflows     │  │
│  └─────────────────┘      └─────────────────┘  │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Guidelines**:

| Use TanStack Query When | Use BlaC When |
|-------------------------|---------------|
| Fetching data from API | Managing UI state (modals, tabs) |
| Caching server responses | Local form state |
| Mutations with invalidation | Application workflows |
| Paginated/infinite queries | Component-level state |
| Real-time data sync | State that doesn't come from server |
| Need automatic retry | Complex state machines |
| Need stale-while-revalidate | Need class-based architecture |
| SSR/hydration | Need BlaC ecosystem features |

**Example: Complex Chat Application**:

```typescript
// TanStack Query for message fetching
const messages = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: () => api.getMessages(conversationId),
  staleTime: 0, // Always fresh
});

const sendMessage = useMutation({
  mutationFn: (message) => api.sendMessage(message),
  onSuccess: () => {
    queryClient.invalidateQueries(['messages', conversationId]);
  },
});

// BlaC for chat UI state
const [chatState, chatCubit] = useBloc(ChatUICubit);

// ChatUICubit manages:
// - typing indicators
// - scroll position
// - reply-to state
// - emoji picker open/closed
// - message queue (offline)
// - connection status
```

**Pros**:
- ✅ Use each tool for what it's best at
- ✅ No reinventing the wheel for data fetching
- ✅ Keep BlaC for what it's good at (app/UI state)
- ✅ Industry-standard pattern (like Redux + React Query)
- ✅ Can adopt incrementally
- ✅ Clear separation of concerns

**Cons**:
- Need to learn both libraries
- Two sources of truth (but different concerns)
- Slightly more boilerplate

**Verdict**: ✅ **STRONGLY RECOMMENDED** - This is the industry-standard approach.

---

## What About BaseCubit Then?

With the hybrid approach, BaseCubit still has value for:

### Use Case 1: Non-API Async Operations

```typescript
class FileProcessingCubit extends BaseCubit<FileState> {
  processFile = async (file: File) => {
    this.startLoading('process-file');
    try {
      // Complex local operation, not an API call
      const processed = await processFileLocally(file);
      this.emit({ ...this.state, processed });
    } finally {
      this.stopLoading('process-file');
    }
  };
}
```

### Use Case 2: Multi-Operation Loading State

```typescript
class BatchOperationCubit extends BaseCubit<BatchState> {
  processBatch = async (items: Item[]) => {
    // Track each item separately
    for (const item of items) {
      this.startLoading(`process-${item.id}`);
      try {
        await processItem(item);
      } finally {
        this.stopLoading(`process-${item.id}`);
      }
    }
  };
}

// UI can show loading per item
<Button disabled={isLoadingKey(`process-${item.id}`)}>
  Process
</Button>
```

### Use Case 3: Timeout Protection

```typescript
// TanStack Query has retry, but no hard timeout
const query = useQuery({
  queryKey: ['data'],
  queryFn: api.getData,
  retry: 3,
  // ❌ No way to say "stop after 90 seconds no matter what"
});

// BaseCubit has hard timeout
class DataCubit extends BaseCubit<State> {
  fetchData = async () => {
    this.startLoading('fetch-data'); // ✅ Auto-stops after 90s
    try {
      const data = await api.getData();
      this.emit({ ...this.state, data });
    } finally {
      this.stopLoading('fetch-data');
    }
  };
}
```

---

## Recommended Approach for BlaC

### 1. Document the Hybrid Pattern (Immediate)

**Add to documentation**:

```markdown
# Data Fetching with TanStack Query

BlaC is designed to work seamlessly with TanStack Query. We recommend:

- **Use TanStack Query** for server state (API calls, caching)
- **Use BlaC** for application and UI state

## Example

\`\`\`typescript
import { useQuery } from '@tanstack/react-query';
import { useBloc } from '@blac/react';

function UserDashboard() {
  // Server state with TanStack Query
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: api.getUser,
  });

  // UI state with BlaC
  const [uiState, uiCubit] = useBloc(DashboardUICubit);

  return (
    <Dashboard user={user} uiState={uiState} />
  );
}
\`\`\`

## Why This Approach?

TanStack Query excels at:
- Automatic caching
- Background refetching
- Request deduplication
- Retry logic

BlaC excels at:
- Complex state machines
- Class-based architecture
- Application workflows
- UI state management
```

---

### 2. Keep BaseCubit for Non-Query Operations

**Don't remove BaseCubit** - it has value for:
- Non-API async operations
- Multi-operation loading state
- Timeout protection
- Operations that need custom loading logic

**Rename for clarity**:
```typescript
// Current name is confusing
class BaseCubit<T> extends Cubit<T> {}

// Better names
class LoadingCubit<T> extends Cubit<T> {}
// or
class AsyncOperationCubit<T> extends Cubit<T> {}
```

---

### 3. Create Integration Helper (Optional)

**For developers who want TanStack Query inside BlaC**:

```typescript
// Optional helper for tight integration
import { createQueryCubit } from '@blac/react-query';

// Wraps TanStack Query in BlaC API
const UserCubit = createQueryCubit({
  queryKey: ['user'],
  queryFn: api.getUser,
});

// Still works with useBloc
const [state, cubit] = useBloc(UserCubit);
```

**But don't make this the primary approach** - the hybrid pattern is better.

---

## Industry Examples

### How Others Do It

**1. Redux + React Query (Common Pattern)**:
```typescript
// Redux for app state
const dispatch = useDispatch();
const uiState = useSelector(state => state.ui);

// React Query for server state
const { data } = useQuery(['users'], api.getUsers);
```

**2. Zustand + React Query**:
```typescript
// Zustand for app state
const uiState = useStore(state => state.ui);

// React Query for server state
const { data } = useQuery(['users'], api.getUsers);
```

**3. Jotai + React Query (Recommended by Jotai)**:
```typescript
// Jotai for atoms
const [count] = useAtom(countAtom);

// React Query for queries
const { data } = useQuery(['users'], api.getUsers);
```

**Pattern**: Separate tools for server state vs app state is the **industry standard**.

---

## Conclusion

### Should BlaC Leverage TanStack Query?

**For AsyncCubit specifically**:
- ❌ **No** - Don't build AsyncCubit as a wrapper around TanStack Query
- ❌ **No** - Don't try to replace TanStack Query
- ✅ **YES** - Document how to use them together (hybrid approach)
- ✅ **YES** - Keep BaseCubit for non-query async operations

### Recommended Path Forward

1. **Document the hybrid pattern** (BlaC + TanStack Query)
2. **Keep BaseCubit** but rename to `LoadingCubit` or `AsyncOperationCubit`
3. **Show clear examples** of when to use each
4. **Optional**: Provide `@blac/react-query` integration package for those who want tight integration

### Why This Works

```
┌────────────────────────────────────────────┐
│         Your Application                    │
├────────────────────────────────────────────┤
│                                             │
│  Server State           App/UI State       │
│  ┌─────────────┐        ┌─────────────┐   │
│  │  TanStack   │        │    BlaC     │   │
│  │    Query    │        │             │   │
│  │             │        │             │   │
│  │ • Caching   │        │ • Modals    │   │
│  │ • Retry     │        │ • Forms     │   │
│  │ • Refetch   │        │ • Workflows │   │
│  │ • SSR       │        │ • UI state  │   │
│  └─────────────┘        └─────────────┘   │
│         ↓                       ↓           │
│  ┌─────────────────────────────────────┐  │
│  │         React Components             │  │
│  └─────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**Each tool does what it's best at**:
- TanStack Query: Server state (battle-tested, feature-rich)
- BlaC: Application state (class-based, state machines, BLoC pattern)

This is **not a compromise** - it's the **best of both worlds**.

---

## Action Items

### For BlaC Documentation

1. Add "Data Fetching" guide showing TanStack Query integration
2. Add "When to use TanStack Query vs BlaC" decision matrix
3. Show hybrid pattern examples
4. Clarify BaseCubit is for non-query operations

### For BlaC API

1. Keep `BaseCubit` (or rename to `LoadingCubit`)
2. Don't build AsyncCubit as TanStack Query wrapper
3. Optional: Create `@blac/react-query` package for tight integration

### For Community

1. Create example app using both libraries
2. Blog post: "BlaC + TanStack Query: Best Practices"
3. Migration guide for apps using only BlaC for data fetching

---

**Final Recommendation**: Use TanStack Query for what it's designed for (server state), and BlaC for what it's designed for (app/UI state). Don't try to replace one with the other - they're complementary tools.
