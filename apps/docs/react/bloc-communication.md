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

## Pattern 2: Getter Dependencies (Auto-tracked)

Access other blocs in getters. Dependencies are automatically tracked separately in each component that uses the getter to ensure re-rendering when any dependency changes.

Avoid circular dependencies between getters, the tracker will stop at a reasonable depth but it can lead to unexpected behavior and memory leaks.

```typescript
import { borrow } from '@blac/core';

class CartCubit extends Cubit<CartState> {
  get totalWithShipping() {
    // borrow() in getter = auto-tracked for React
    const shipping = borrow(ShippingCubit);
    return this.itemTotal + shipping.state.cost;
  }

  get orderSummary() {
    const shipping = borrow(ShippingCubit);
    const tax = borrow(TaxCubit);
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

**Important:** Use `borrow()`, `borrowSafe()`, or `ensure()` in getters. Never `acquire()`.

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

Create dependencies only when needed using `ensure()`.

```typescript
import { ensure, borrowSafe } from '@blac/core';

class UserProfileCubit extends Cubit<ProfileState> {
  loadProfile = async () => {
    const profile = await api.getProfile();
    this.patch({ profile });

    // Create analytics only when profile loads
    const analytics = ensure(AnalyticsCubit);
    analytics.trackEvent('profile_loaded');
  };

  get premiumFeatures() {
    // Check if feature flags exist
    const result = borrowSafe(FeatureFlagCubit);
    if (result.error) return [];
    return result.instance.state.premiumFeatures;
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
| Getter `borrow()`        | No       | No change | None     | Yes          |
| Constructor `acquire()`  | Yes      | +1        | Required | No           |
| Lazy `ensure()`          | Yes      | No change | None     | In getters   |
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

type ChannelEvent =
  | { type: 'receiveMessage'; message: Message }
  | { type: 'markAsRead' };

class ChannelBloc extends Vertex<ChannelState, ChannelEvent> {
  constructor(props: { channelId: string }) {
    super({ messages: [], channelId: props.channelId });

    this.createHandlers({
      // Pattern 1: Event handler borrowing
      receiveMessage: (event, emit) => {
        emit({ ...this.state, messages: [...this.state.messages, event.message] });

        const notifications = borrow(NotificationCubit);
        notifications.incrementUnread(props.channelId);
      },
      markAsRead: (_, emit) => {
        const notifications = borrow(NotificationCubit);
        notifications.clearUnread(this.state.channelId);
        emit(this.state);
      },
    });
  }

  // Pattern 2: Getter with auto-tracking
  get unreadCount() {
    const notifications = borrow(NotificationCubit);
    return notifications.state.unreadCounts.get(this.state.channelId) || 0;
  }

  // Convenience methods
  receiveMessage = (message: Message) => this.add({ type: 'receiveMessage', message });
  markAsRead = () => this.add({ type: 'markAsRead' });
}

// === Components ===

// Sidebar shows counts without loading heavy ChannelBloc
function ChannelListItem({ channelId }) {
  const [notifications] = useBloc(NotificationCubit);
  const count = notifications.unreadCounts.get(channelId) || 0;
  return <div>#{channelId} {count > 0 && <Badge>{count}</Badge>}</div>;
}

// Channel view uses full ChannelBloc
function ChannelView({ channelId }) {
  const [, bloc] = useBloc(ChannelBloc, {
    instanceId: channelId,
    props: { channelId }
  });

  // Getter auto-tracks NotificationCubit
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
