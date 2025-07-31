# Instance Management

BlaC automatically manages the lifecycle of your Cubits and Blocs, handling creation, sharing, and disposal. This guide explains how BlaC's intelligent instance management works behind the scenes.

## Automatic Instance Creation

When you use `useBloc`, BlaC automatically creates instances as needed:

```typescript
function MyComponent() {
  // BlaC creates a CounterCubit instance if it doesn't exist
  const [count, counter] = useBloc(CounterCubit);

  return <div>{count}</div>;
}
```

No providers, no manual instantiation - BlaC handles it all.

## Instance Sharing

By default, all components using the same Cubit/Bloc class share the same instance:

```typescript
// Component A
function HeaderCounter() {
  const [count] = useBloc(CounterCubit);
  return <span>Header: {count}</span>;
}

// Component B
function MainCounter() {
  const [count, counter] = useBloc(CounterCubit);
  return (
    <div>
      Main: {count}
      <button onClick={counter.increment}>+</button>
    </div>
  );
}

// Both components share the same CounterCubit instance
// Clicking + in MainCounter updates HeaderCounter too
```

## Instance Identification

BlaC identifies instances using:

1. **Class name** (default)
2. **Custom ID** (when provided)

```typescript
// Default: Uses class name as ID
const [state1] = useBloc(UserCubit); // ID: "UserCubit"

// Custom ID: Creates separate instance
const [state2] = useBloc(UserCubit, { id: 'admin-user' }); // ID: "admin-user"

// Different instances, different states
```

## Isolated Instances

Sometimes you want each component to have its own instance. Use the `static isolated = true` property:

```typescript
class FormCubit extends Cubit<FormState> {
  static isolated = true; // Each component gets its own instance

  constructor() {
    super({ name: '', email: '' });
  }
}

// Component A
function FormA() {
  const [state, form] = useBloc(FormCubit); // Instance A
  // ...
}

// Component B
function FormB() {
  const [state, form] = useBloc(FormCubit); // Instance B (different!)
  // ...
}
```

Alternatively, use unique IDs:

```typescript
function DynamicForm({ formId }: { formId: string }) {
  // Each formId gets its own instance
  const [state, form] = useBloc(FormCubit, { id: formId });
  // ...
}
```

## Lifecycle Management

### Creation

Instances are created on first use:

```typescript
// First render - creates new instance
function App() {
  const [state] = useBloc(AppCubit); // New instance created
  return <div>{state.data}</div>;
}
```

### Reference Counting

BlaC tracks how many components are using each instance:

```typescript
function Parent() {
  const [showA, setShowA] = useState(true);
  const [showB, setShowB] = useState(true);

  return (
    <>
      {showA && <ComponentA />} {/* Uses CounterCubit */}
      {showB && <ComponentB />} {/* Also uses CounterCubit */}
      <button onClick={() => setShowA(!showA)}>Toggle A</button>
      <button onClick={() => setShowB(!showB)}>Toggle B</button>
    </>
  );
}

// CounterCubit instance:
// - Created when first component mounts
// - Stays alive while either component is mounted
// - Disposed when both components unmount
```

### Disposal

Instances are automatically disposed when no components use them:

```typescript
class WebSocketCubit extends Cubit<ConnectionState> {
  private ws?: WebSocket;

  constructor() {
    super({ status: 'disconnected' });
    this.connect();
  }

  connect = () => {
    this.ws = new WebSocket('wss://example.com');
    // ... setup
  };

  // Called automatically when disposed
  onDispose = () => {
    console.log('Cleaning up WebSocket');
    this.ws?.close();
  };
}

// WebSocket closes automatically when last component unmounts
```

## Keep Alive Pattern

Keep instances alive even when no components use them:

```typescript
class SessionCubit extends Cubit<SessionState> {
  static keepAlive = true; // Never dispose this instance

  constructor() {
    super({ user: null, token: null });
    this.loadSession();
  }

  // Stays in memory for entire app lifecycle
}
```

Use cases for `keepAlive`:

- User session management
- App-wide settings
- Cache management
- Background data syncing

## Props and Dynamic Instances

Pass props to customize instance initialization:

```typescript
interface ChatProps {
  roomId: string;
  userId: string;
}

class ChatCubit extends Cubit<ChatState, ChatProps> {
  constructor() {
    super({ messages: [], connected: false });
  }

  // Access props via this.props
  connect = () => {
    const socket = io(`/room/${this.props.roomId}`);
    // ...
  };
}

// Usage
function ChatRoom({ roomId, userId }: { roomId: string; userId: string }) {
  const [state, chat] = useBloc(ChatCubit, {
    id: `chat-${roomId}`, // Unique instance per room
    props: { roomId, userId }
  });

  return <div>{/* Chat UI */}</div>;
}
```

## Advanced Patterns

### Factory Pattern

Create instances with custom logic:

```typescript
class DataCubit<T> extends Cubit<DataState<T>> {
  static create<T>(fetcher: () => Promise<T>) {
    return class extends DataCubit<T> {
      constructor() {
        super();
        this.fetch(fetcher);
      }
    };
  }
}

// Usage
const UserDataCubit = DataCubit.create(() => api.getUser());
const PostsDataCubit = DataCubit.create(() => api.getPosts());

function UserProfile() {
  const [userData] = useBloc(UserDataCubit);
  const [postsData] = useBloc(PostsDataCubit);
  // ...
}
```

### Singleton Pattern

Ensure only one instance exists globally:

```typescript
let globalInstance: AppCubit | null = null;

class AppCubit extends Cubit<AppState> {
  static isolated = false;
  static keepAlive = true;

  constructor() {
    if (globalInstance) {
      return globalInstance;
    }
    super(initialState);
    globalInstance = this;
  }
}
```

### Scoped Instances

Create instances scoped to specific parts of your app:

```typescript
// Workspace-scoped instances
function Workspace({ workspaceId }: { workspaceId: string }) {
  // All children share these workspace-specific instances
  const [projects] = useBloc(ProjectsCubit, { id: `workspace-${workspaceId}` });
  const [members] = useBloc(MembersCubit, { id: `workspace-${workspaceId}` });

  return (
    <div>
      <ProjectList projects={projects} />
      <MemberList members={members} />
    </div>
  );
}
```

## Memory Management

### Weak References

BlaC uses WeakRef for consumer tracking to prevent memory leaks:

```typescript
// Internally, BlaC tracks consumers without preventing garbage collection
class BlocInstance {
  private consumers = new Set<WeakRef<Consumer>>();

  addConsumer(consumer: Consumer) {
    this.consumers.add(new WeakRef(consumer));
  }
}
```

### Cleanup Best Practices

Always clean up resources in `onDispose`:

```typescript
class TimerCubit extends Cubit<number> {
  private timer?: NodeJS.Timeout;

  constructor() {
    super(0);
    this.startTimer();
  }

  startTimer = () => {
    this.timer = setInterval(() => {
      this.emit(this.state + 1);
    }, 1000);
  };

  onDispose = () => {
    // Clean up timer to prevent memory leaks
    if (this.timer) {
      clearInterval(this.timer);
    }
  };
}
```

### Monitoring Instances

Debug instance lifecycle:

```typescript
class DebugCubit extends Cubit<State> {
  constructor() {
    super(initialState);
    console.log(`[${this.constructor.name}] Created`);
  }

  onDispose = () => {
    console.log(`[${this.constructor.name}] Disposed`);
  };
}

// Enable BlaC logging
Blac.enableLog = true;
```

## React Strict Mode

BlaC handles React Strict Mode's double-mounting gracefully:

```typescript
// React Strict Mode calls effects twice in development
function StrictModeComponent() {
  const [state] = useBloc(MyCubit);
  // BlaC ensures only one instance is created
  // despite double-mounting
}
```

The disposal system uses atomic state transitions to handle this:

1. First unmount: Marks for disposal
2. Quick remount: Cancels disposal
3. Final unmount: Actually disposes

## Common Patterns

### Global State

App-wide state that persists:

```typescript
class ThemeCubit extends Cubit<Theme> {
  static keepAlive = true; // Never dispose

  constructor() {
    super(loadThemeFromStorage() || 'light');
  }

  setTheme = (theme: Theme) => {
    this.emit(theme);
    saveThemeToStorage(theme);
  };
}
```

### Feature-Scoped State

State tied to specific features:

```typescript
class TodoListCubit extends Cubit<TodoState> {
  // Shared across all todo list views
  // Disposed when leaving todo feature entirely
}
```

### Component-Local State

State for individual component instances:

```typescript
class DropdownCubit extends Cubit<DropdownState> {
  static isolated = true; // Each dropdown is independent

  constructor() {
    super({ isOpen: false, selectedItem: null });
  }
}
```

## Performance Considerations

### Instance Reuse

Reusing instances improves performance:

```typescript
// ✅ Good: Reuses existing instance
function ProductList() {
  const [products] = useBloc(ProductsCubit);
  return products.map(p => <ProductItem key={p.id} product={p} />);
}

// ❌ Avoid: Creates new instance each time
function ProductItem({ product }: { product: Product }) {
  const [state] = useBloc(ProductCubit, {
    id: product.id // New instance per product
  });
}
```

### Lazy Initialization

Instances are created only when needed:

```typescript
class ExpensiveService {
  constructor() {
    console.log('Expensive initialization');
    // ... heavy setup
  }
}

class ServiceCubit extends Cubit<ServiceState> {
  private service?: ExpensiveService;

  // Lazy initialize expensive resources
  get expensiveService() {
    if (!this.service) {
      this.service = new ExpensiveService();
    }
    return this.service;
  }
}
```

## Summary

BlaC's instance management provides:

- **Automatic lifecycle**: No manual creation or disposal
- **Smart sharing**: Instances shared by default, isolated when needed
- **Memory efficiency**: Automatic cleanup and weak references
- **Flexible scoping**: Global, feature, or component-level instances
- **React compatibility**: Handles Strict Mode and concurrent features

This intelligent system lets you focus on your business logic while BlaC handles the infrastructure.
