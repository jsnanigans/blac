# Bloc Communication

Use core registry helpers to communicate between blocs. A common pattern is to use `depend()` inside a `StateContainer` to declare dependencies and resolve them lazily.

```ts
import { Cubit } from '@blac/core';

class ShippingCubit extends Cubit<{ cost: number }> {
  constructor() {
    super({ cost: 0 });
  }
}

class CartCubit extends Cubit<{ total: number }> {
  constructor() {
    super({ total: 0 });
  }

  private getShipping = this.depend(ShippingCubit);

  get totalWithShipping() {
    return this.state.total + this.getShipping().state.cost;
  }
}
```

For one-off access, you can use `ensure()` or `borrow()` from `@blac/core` in non-React code.
