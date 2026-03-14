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

| Approach | Use when |
|----------|----------|
| `this.depend(Class)` | Ongoing dependency used in getters or multiple methods |
| `ensure(Class)` | One-off access; creates if missing |
| `borrow(Class)` | One-off access; instance must already exist |

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

See also: [Instance Management](/core/instance-management), [useBloc](/react/use-bloc)
