# Patterns & Recipes

Common patterns for structuring BlaC applications. Each pattern is drawn from real examples in the codebase.

## Async operations

### Loading / error / success

Model async state explicitly. Use a request ID to handle race conditions when multiple requests overlap.

```ts
interface FeedState {
  articles: Article[];
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
}

class FeedCubit extends Cubit<FeedState> {
  private requestId = 0;

  constructor() {
    super({ articles: [], status: 'idle', error: null });
  }

  loadArticles = async (category: string) => {
    const id = ++this.requestId;
    this.patch({ status: 'loading', error: null });

    try {
      const articles = await api.fetchArticles(category);
      // Ignore stale responses
      if (id !== this.requestId) return;
      this.emit({ articles, status: 'success', error: null });
    } catch (e) {
      if (id !== this.requestId) return;
      this.patch({ status: 'error', error: String(e) });
    }
  };
}
```

The `requestId` pattern is simpler than AbortController for most cases. Each new call invalidates previous in-flight responses.

### Hydration-aware loading

When using the persistence plugin, state may arrive asynchronously from IndexedDB. Wait for hydration before making API calls:

```ts
class SettingsCubit extends Cubit<SettingsState> {
  constructor() {
    super({ theme: 'light', locale: 'en' });
  }

  init = async () => {
    await this.waitForHydration();
    // Now this.state has restored values from IndexedDB
    await this.refreshFromServer();
  };
}
```

## Action-only components

Components that only trigger actions and never display state don't need tracking at all. Disable it to avoid unnecessary re-renders:

```tsx
function QuickAdd() {
  const [, todo] = useBloc(TodoCubit, { autoTrack: false });

  return (
    <button onClick={() => todo.addItem('New item')}>
      Add Item
    </button>
  );
}
```

This component renders once and never re-renders, regardless of state changes.

## Named instances

Use `instanceId` when you need multiple independent instances of the same Cubit class. Each key gets its own instance with its own state and lifecycle.

```tsx
function FormPage() {
  return (
    <>
      <FormSection instanceId="billing" />
      <FormSection instanceId="shipping" />
    </>
  );
}

function FormSection({ instanceId }: { instanceId: string }) {
  const [state, form] = useBloc(FormCubit, { instanceId });
  // Each section has independent state
  return <input value={state.email} onChange={(e) => form.setEmail(e.target.value)} />;
}
```

Named instances are ref-counted independently. When all components using `"billing"` unmount, that instance is disposed while `"shipping"` stays alive.

## Persisting state outside React

Use `watch` to observe state changes from non-React code — saving to localStorage, syncing to a server, or feeding analytics:

```ts
import { watch } from '@blac/core/watch';

watch(TodoCubit, (state) => {
  localStorage.setItem('todos', JSON.stringify(state.items));
});
```

`watch` uses the same proxy-based tracking as `useBloc`. In this example, only changes to `state.items` trigger the callback. Changes to `state.filter` are ignored.

To stop watching, either call the returned function or return `watch.STOP` from the callback:

```ts
const stop = watch(AuthCubit, (state) => {
  if (state.user) {
    analytics.identify(state.user.id);
    return watch.STOP; // one-shot
  }
});
```

## Cross-bloc communication

### Reading state from another bloc

Use `depend()` to declare a dependency. It returns a lazy getter that resolves the instance from the registry on demand.

```ts
class CartCubit extends Cubit<CartState> {
  private getShipping = this.depend(ShippingCubit);

  get total() {
    const subtotal = this.state.items.reduce((sum, i) => sum + i.price, 0);
    return subtotal + this.getShipping().state.rate;
  }
}
```

### Triggering side effects across blocs

Call methods on dependencies to coordinate behavior:

```ts
class ChannelCubit extends Cubit<ChannelState> {
  private getNotifications = this.depend(NotificationCubit);

  receiveMessage = (message: Message) => {
    this.patch({ messages: [...this.state.messages, message] });
    this.getNotifications().incrementUnread(this.state.channelId);
  };
}
```

### Lazy instance creation

When a dependency might not exist yet, use `borrowSafe` to check and `acquire` to create on demand:

```ts
import { borrowSafe, acquire } from '@blac/core';

class ChannelCubit extends Cubit<ChannelState> {
  private ensureUserCubit(userId: string) {
    const { error } = borrowSafe(UserCubit, userId);
    if (!error) return;
    acquire(UserCubit, userId).setUserId(userId);
  }

  receiveMessage = (message: Message) => {
    this.ensureUserCubit(message.userId);
    // ...
  };
}
```

## Saving state on disposal

Use `onSystemEvent('dispose')` to persist data when an instance is cleaned up:

```ts
class ChannelCubit extends Cubit<ChannelState> {
  constructor() {
    super({ channel: null, messages: [] });
    this.onSystemEvent('dispose', () => {
      if (this.state.channel) {
        persistenceService.save(this.state.channel.id, this.state.messages);
      }
    });
  }
}
```

## Custom plugins

Plugins observe lifecycle events across all state containers. Use them for cross-cutting concerns like analytics, logging, or monitoring.

```ts
const analyticsPlugin: BlacPlugin = {
  name: 'analytics',
  version: '1.0.0',

  onInstanceCreated(instance) {
    analytics.track('bloc_created', { name: instance.name });
  },

  onStateChanged(instance, prev, next) {
    analytics.track('state_changed', {
      name: instance.name,
      from: prev,
      to: next,
    });
  },

  onInstanceDisposed(instance) {
    analytics.track('bloc_disposed', { name: instance.name });
  },
};

getPluginManager().install(analyticsPlugin);
```

## Keep-alive instances

For app-wide singletons that should never be disposed (auth, theme, feature flags), use `keepAlive`:

```ts
@blac({ keepAlive: true })
class ThemeCubit extends Cubit<{ mode: 'light' | 'dark' }> {
  constructor() {
    super({ mode: 'light' });
  }

  toggle = () => {
    this.patch({ mode: this.state.mode === 'light' ? 'dark' : 'light' });
  };
}
```

The instance is created on first use and stays alive for the entire app session, even if all components using it unmount.

## Getter-based computed values

Define getters on your Cubit for derived state. The tracking system detects getter access and only re-renders when the computed result changes.

```ts
class TodoCubit extends Cubit<TodoState> {
  get activeCount() {
    return this.state.items.filter((t) => !t.done).length;
  }

  get completedCount() {
    return this.state.items.filter((t) => t.done).length;
  }

  get filteredItems() {
    if (this.state.filter === 'all') return this.state.items;
    const isDone = this.state.filter === 'done';
    return this.state.items.filter((t) => t.done === isDone);
  }
}
```

```tsx
function TodoStats() {
  const [, todo] = useBloc(TodoCubit);
  // Only re-renders when activeCount or completedCount changes
  return <span>{todo.activeCount} active, {todo.completedCount} done</span>;
}
```

See also: [Cubit](/core/cubit), [Bloc Communication](/core/bloc-communication), [Instance Management](/core/instance-management)
