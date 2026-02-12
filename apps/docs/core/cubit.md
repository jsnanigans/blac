# Cubit

`Cubit` is a simple state container with public mutation helpers.

```ts
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.update((state) => ({ count: state.count - 1 }));
  reset = () => this.patch({ count: 0 });
}
```

## Methods

- `emit(newState)`
- `update(fn)`
- `patch(partial)` (shallow merge for object state only)

`patch()` throws if the current state is not an object.
