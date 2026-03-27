# Bloc Communication

State containers often need to read state from other containers. BlaC provides `depend()` for declaring cross-bloc dependencies.

## Using `depend()`

Call `this.depend(OtherClass)` inside your Cubit to get a lazy getter function that resolves the other instance from the registry.

```ts
import { Cubit } from '@blac/core';

class ShippingCubit extends Cubit<{ rate: number }> {
  constructor() {
    super({ rate: 5.99 });
  }
}

class CartCubit extends Cubit<{ items: CartItem[] }> {
  private getShipping = this.depend(ShippingCubit);

  constructor() {
    super({ items: [] });
  }

  get total() {
    const subtotal = this.state.items.reduce((sum, i) => sum + i.price, 0);
    return subtotal + this.getShipping().state.rate;
  }
}
```

### How it works

1. `this.depend(ShippingCubit)` returns a function `() => ShippingCubit`
2. Calling that function resolves the instance via `ensure()` from the registry
3. The dependency is lazily resolved — it's looked up when you call the getter, not when you declare it
4. The tracking system records this as a dependency, so components reading `cart.total` will re-render when `ShippingCubit` state changes

### Named instance dependencies

To depend on a specific named instance:

```ts
private getEditor = this.depend(EditorCubit, 'doc-42');
```

## Alternatives

### `ensure()` and `borrow()`

For one-off access outside the class constructor, use registry functions directly:

```ts
import { ensure, borrow } from '@blac/core';

// Inside a method
class NotificationCubit extends Cubit<NotificationState> {
  showUserError = () => {
    const user = borrow(UserCubit); // must already exist
    this.patch({ message: `Error for ${user.state.name}` });
  };
}
```

### When to use which

| Approach             | Use when                                               |
| -------------------- | ------------------------------------------------------ |
| `this.depend(Class)` | Ongoing dependency used in getters or multiple methods |
| `ensure(Class)`      | One-off access; creates if missing                     |
| `borrow(Class)`      | One-off access; instance must already exist            |

## Calling methods on dependencies

Dependencies aren't just for reading state — you can call methods on them to trigger side effects in other blocs.

```ts
class ChannelCubit extends Cubit<ChannelState> {
  private getNotifications = this.depend(NotificationCubit);

  receiveMessage = (message: Message) => {
    this.emit({
      ...this.state,
      messages: [...this.state.messages, message],
    });

    // Trigger a side effect in another bloc
    this.getNotifications().incrementUnread(this.state.channelId);
  };

  markAsRead = () => {
    this.getNotifications().clearUnread(this.state.channelId);
  };
}
```

This keeps notification logic in `NotificationCubit` while letting `ChannelCubit` coordinate when it fires.

## Derived getters across blocs

Getters that read from multiple blocs are fully tracked. Components only re-render when the computed result changes.

```ts
class DashboardCubit extends Cubit<{}> {
  private getAuth = this.depend(AuthCubit);
  private getCart = this.depend(CartCubit);

  constructor() {
    super({});
  }

  get summary() {
    const user = this.getAuth().state.user;
    const itemCount = this.getCart().state.items.length;
    return `${user?.name ?? 'Guest'} has ${itemCount} items`;
  }
}
```

## On-demand instance creation

Sometimes a dependency doesn't exist yet and needs to be created conditionally. Use `borrowSafe` to check and `acquire` to create on demand:

```ts
import { Cubit, borrowSafe, acquire } from '@blac/core';

class ChannelCubit extends Cubit<ChannelState> {
  private ensureUserCubit(userId: string) {
    const result = borrowSafe(UserCubit, userId);
    if (!result.error) return; // already exists

    // Create on demand with a named instance
    acquire(UserCubit, userId).setUserId(userId);
  }

  receiveMessage = (message: Message) => {
    this.ensureUserCubit(message.userId);
    // ...
  };
}
```

::: tip
Use `borrowSafe` over `borrow` when the instance may not exist yet. `borrow` throws, while `borrowSafe` returns `{ error, instance }` so you can handle the missing case gracefully.
:::

## Combining patterns

A real-world bloc often combines multiple dependency patterns: declared dependencies via `depend()`, method calls on those dependencies, and on-demand instance creation.

```ts
class ChannelCubit extends Cubit<ChannelState> {
  // Declared dependencies — lazy getters
  private getContacts = this.depend(ContactsCubit);
  private getNotifications = this.depend(NotificationCubit);

  constructor() {
    super({ channel: null, messages: [], unreadCount: 0 });
  }

  // Read state from a dependency during init
  init = ({ channelId }: { channelId: string }) => {
    const channel = this.getContacts().state.channels.find(
      (c) => c.id === channelId,
    );
    if (channel) this.emit({ ...this.state, channel });
  };

  // Call methods on dependencies for side effects
  receiveMessage = (message: Message) => {
    this.ensureUserCubit(message.userId);
    this.emit({
      ...this.state,
      messages: [...this.state.messages, message],
    });
    this.getNotifications().incrementUnread(this.state.channel!.id);
  };

  // On-demand instance creation with borrowSafe + acquire
  private ensureUserCubit(userId: string) {
    const { error } = borrowSafe(UserCubit, userId);
    if (!error) return;
    acquire(UserCubit, userId).setUserId(userId);
  }
}
```

See also: [Instance Management](/core/instance-management), [useBloc](/react/use-bloc)
