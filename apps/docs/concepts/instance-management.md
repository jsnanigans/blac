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

1. **Class name** (default) - Used as the instance ID
2. **Custom instance ID** (when provided via `instanceId` option)
3. **Generated ID from props** (when using `staticProps`)

```typescript
// Default: Uses class name as instance ID
const [state1] = useBloc(UserCubit); // Instance ID: "UserCubit"

// Custom instance ID: Creates separate instance
const [state2] = useBloc(UserCubit, { instanceId: 'admin-user' }); // Instance ID: "admin-user"

// Generated from props: Primitive values in staticProps create deterministic IDs
const [state3] = useBloc(UserCubit, { 
  staticProps: { userId: 123, role: 'admin' } 
}); // Instance ID: "role:admin|userId:123"

// Different instances, different states
```

### How Instance IDs are Generated from Props

When you provide `staticProps`, BlaC can automatically generate a deterministic instance ID by:
- Extracting primitive values (string, number, boolean, null, undefined)
- Ignoring complex types (objects, arrays, functions)
- Sorting keys alphabetically
- Creating a formatted string like "key1:value1|key2:value2"

This is useful for creating unique instances based on props without manually specifying IDs.

## Static Properties

BlaC supports several static properties to control instance behavior:

### `static isolated = true`

Makes each component get its own instance:

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

### `static keepAlive = true`

Prevents the instance from being disposed when no components use it:

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

### `static plugins = []`

Attach plugins directly to a specific Bloc/Cubit class:

```typescript
import { PersistencePlugin } from '@bloc/persistence';

class SettingsCubit extends Cubit<SettingsState> {
  static plugins = [
    new PersistencePlugin<SettingsState>({
      key: 'app-settings',
      storage: localStorage,
    })
  ];

  constructor() {
    super({ theme: 'light', language: 'en' });
  }
}
```

## Isolated Instances

Sometimes you want each component to have its own instance. Use the `static isolated = true` property shown above, or alternatively, use unique instance IDs:

```typescript
function DynamicForm({ formId }: { formId: string }) {
  // Each formId gets its own instance
  const [state, form] = useBloc(FormCubit, { instanceId: formId });
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


## Static Props and Dynamic Instances

Pass static props to customize instance initialization:

```typescript
interface ChatProps {
  roomId: string;
  userId: string;
}

class ChatCubit extends Cubit<ChatState> {
  constructor(props?: ChatProps) {
    super({ messages: [], connected: false });
    // Access props via constructor parameter
    this.roomId = props?.roomId;
    this.userId = props?.userId;
    
    // Optional: Set a custom name for debugging
    this._name = `ChatCubit_${props?.roomId}`;
  }

  private roomId?: string;
  private userId?: string;

  connect = () => {
    if (!this.roomId) return;
    const socket = io(`/room/${this.roomId}`);
    // ...
  };
}

// Usage
function ChatRoom({ roomId, userId }: { roomId: string; userId: string }) {
  const [state, chat] = useBloc(ChatCubit, {
    instanceId: `chat-${roomId}`, // Unique instance per room
    staticProps: { roomId, userId }
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
  const [projects] = useBloc(ProjectsCubit, { instanceId: `workspace-${workspaceId}` });
  const [members] = useBloc(MembersCubit, { instanceId: `workspace-${workspaceId}` });

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
    instanceId: product.id // New instance per product
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
- **Flexible identification**: Use class names, custom instance IDs, or auto-generated IDs from props
- **Static configuration**: Control behavior with `isolated`, `keepAlive`, and `plugins` properties
- **Memory efficiency**: Automatic cleanup and weak references
- **Flexible scoping**: Global, feature, or component-level instances
- **React compatibility**: Handles Strict Mode and concurrent features

Key options for `useBloc`:
- `instanceId`: Custom instance identifier
- `staticProps`: Props passed to constructor, can generate instance IDs
- `dependencies`: Re-create instance when dependencies change
- `onMount`/`onUnmount`: Lifecycle callbacks

This intelligent system lets you focus on your business logic while BlaC handles the infrastructure.
