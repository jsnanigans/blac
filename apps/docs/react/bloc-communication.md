# Bloc Communication

Patterns for blocs to communicate with each other.

## Pattern 1: Event Handler Borrowing

Access other blocs in methods using `borrow()`. Most common pattern.

```typescript
import { borrow } from '@blac/core';

class UserCubit extends Cubit<UserState> {
  login = async (email: string, password: string) => {
    const user = await api.login(email, password);
    this.patch({ user });

    // Borrow analytics - no memory leak, no cleanup needed
    const analytics = borrow(AnalyticsCubit);
    analytics.trackEvent('user_login', { email });
  };
}
```

**Use when:**

- One-off interactions between blocs
- Event handling that triggers side effects
- You don't want ownership (no ref count increment)

## Pattern 2: Getter Dependencies with `depend()`

Declare cross-bloc dependencies using `this.depend()` in the class body, then use them in getters. BlaC automatically subscribes to all declared dependencies and re-renders when any of them change.

Avoid circular dependencies between blocs, the resolver will detect cycles but it can lead to unexpected behavior.

```typescript
class CartCubit extends Cubit<CartState> {
  // Declare dependencies in the class body
  private getShipping = this.depend(ShippingCubit);
  private getTax = this.depend(TaxCubit);

  get totalWithShipping() {
    const shipping = this.getShipping();
    return this.itemTotal + shipping.state.cost;
  }

  get orderSummary() {
    const shipping = this.getShipping();
    const tax = this.getTax();
    return {
      subtotal: this.itemTotal,
      shipping: shipping.state.cost,
      tax: tax.state.amount,
      total: this.itemTotal + shipping.state.cost + tax.state.amount
    };
  }
}

// Component re-renders when CartCubit, ShippingCubit, OR TaxCubit changes
function CheckoutTotal() {
  const [, cart] = useBloc(CartCubit);
  return <span>Total: ${cart.totalWithShipping}</span>;
}
```

**Use when:**

- Computed values depend on multiple blocs
- You want automatic re-rendering when dependencies change

**How `depend()` works:**

- `this.depend(BlocClass)` returns a getter function that lazily resolves the dependency via `ensure()`
- Dependencies are declared explicitly, enabling BlaC to resolve transitive dependencies via BFS
- No ref count increment — the dependency is not owned
- Cannot be used with isolated blocs

## Pattern 3: Constructor Dependencies

Own dependencies for the bloc's lifetime. Must release on dispose.

```typescript
import { acquire, release } from '@blac/core';

class AppCubit extends Cubit<AppState> {
  // Own these dependencies
  private auth = acquire(AuthCubit);
  private notifications = acquire(NotificationCubit);

  constructor() {
    super(initialState);

    // Must release on dispose
    this.onSystemEvent('dispose', () => {
      release(AuthCubit);
      release(NotificationCubit);
    });
  }
}
```

**Use when:**

- Bloc needs dependency throughout its lifetime
- You want to ensure dependency stays alive

**Warning:** Must call `release()` on dispose to prevent memory leaks.

## Pattern 4: Lazy/On-Demand

Create dependencies only when needed using `ensure()` in methods, or use `depend()` for getter-based access.

```typescript
import { ensure } from '@blac/core';

class UserProfileCubit extends Cubit<ProfileState> {
  // Use depend() if you need the dependency in getters
  private getFeatureFlags = this.depend(FeatureFlagCubit);

  loadProfile = async () => {
    const profile = await api.getProfile();
    this.patch({ profile });

    // ensure() in methods — lazily creates the instance
    const analytics = ensure(AnalyticsCubit);
    analytics.trackEvent('profile_loaded');
  };

  get premiumFeatures() {
    // depend() resolves via ensure() internally
    return this.getFeatureFlags().state.premiumFeatures;
  }
}
```

**Use when:**

- Optional dependencies (may or may not exist)
- Conditional logic based on bloc existence
- Creating dependencies on-demand

## Pattern 5: Shared Services

Use `keepAlive` for services accessed by many blocs.

```typescript
import { borrow } from '@blac/core';

@blac({ keepAlive: true })
class AnalyticsService extends Cubit<AnalyticsState> {
  trackEvent = (name: string, data: Record<string, any>) => {
    this.update((state) => ({
      ...state,
      events: [...state.events, { name, data, timestamp: Date.now() }],
    }));
  };
}

// Any bloc can safely access it
class TodoCubit extends Cubit<TodoState> {
  addTodo = (text: string) => {
    this.update((state) => ({
      ...state,
      todos: [...state.todos, { text, done: false }],
    }));

    // Service is always available
    const analytics = borrow(AnalyticsService);
    analytics.trackEvent('todo_added', { text });
  };
}
```

**Use when:**

- Logging, analytics, monitoring
- Feature flags, configuration
- Shared utilities

## Comparison Table

| Pattern                  | Creates? | Ref Count | Cleanup  | Auto-tracked |
| ------------------------ | -------- | --------- | -------- | ------------ |
| Event Handler `borrow()` | No       | No change | None     | No           |
| Getter `depend()`        | Yes      | No change | None     | Yes          |
| Constructor `acquire()`  | Yes      | +1        | Required | No           |
| Lazy `ensure()`          | Yes      | No change | None     | No           |
| Service `borrow()`       | No       | No change | None     | No           |

## Real-World Example: Messenger App

```typescript
import { borrow } from '@blac/core';

// === Shared Services (keepAlive) ===

@blac({ keepAlive: true })
class NotificationCubit extends Cubit<{ unreadCounts: Map<string, number> }> {
  incrementUnread = (channelId: string) => { /* ... */ };
  clearUnread = (channelId: string) => { /* ... */ };
}

// === Per-Entity Instances ===

interface ChannelState {
  messages: Message[];
  channelId: string;
}

class ChannelCubit extends Cubit<ChannelState> {
  // Pattern 2: Declare dependency for getters
  private getNotifications = this.depend(NotificationCubit);

  constructor(props: { channelId: string }) {
    super({ messages: [], channelId: props.channelId });
  }

  // Pattern 1: Event handler borrowing
  receiveMessage = (message: Message) => {
    this.update((state) => ({
      ...state,
      messages: [...state.messages, message],
    }));

    // borrow() in methods — no auto-tracking, just one-off access
    const notifications = borrow(NotificationCubit);
    notifications.incrementUnread(this.state.channelId);
  };

  markAsRead = () => {
    const notifications = borrow(NotificationCubit);
    notifications.clearUnread(this.state.channelId);
  };

  // Pattern 2: Getter using declared dependency
  get unreadCount() {
    const notifications = this.getNotifications();
    return notifications.state.unreadCounts.get(this.state.channelId) || 0;
  }
}

// === Components ===

// Sidebar shows counts without loading heavy ChannelBloc
function ChannelListItem({ channelId }) {
  const [notifications] = useBloc(NotificationCubit);
  const count = notifications.unreadCounts.get(channelId) || 0;
  return <div>#{channelId} {count > 0 && <Badge>{count}</Badge>}</div>;
}

// Channel view uses full ChannelCubit
function ChannelView({ channelId }) {
  const [, bloc] = useBloc(ChannelCubit, {
    instanceId: channelId,
    props: { channelId }
  });

  // Getter automatically tracked via depend() declaration
  return (
    <div>
      {bloc.unreadCount > 0 && <span>{bloc.unreadCount} unread</span>}
      {/* ... messages */}
    </div>
  );
}
```

## See Also

- [Instance Management](/core/instance-management) - Function details
- [Shared vs Isolated](/react/shared-vs-isolated) - Instance patterns
- [Configuration](/core/configuration) - `@blac()` options
