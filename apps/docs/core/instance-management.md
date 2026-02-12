# Instance Management

The registry manages instance lifecycle and ref counting.

```ts
import {
  acquire,
  ensure,
  borrow,
  borrowSafe,
  release,
  hasInstance,
  getRefCount,
  getAll,
  forEach,
  clear,
  clearAll,
} from '@blac/core';

const counter = acquire(CounterCubit); // refCount +1
const shared = ensure(CounterCubit); // no ref count
const existing = borrow(CounterCubit); // must exist
const maybe = borrowSafe(CounterCubit); // { error, instance }

release(CounterCubit); // refCount -1, dispose at 0 unless keepAlive

if (hasInstance(CounterCubit)) {
  console.log(getRefCount(CounterCubit));
}

forEach(CounterCubit, (inst) => console.log(inst.state));
getAll(CounterCubit);

clear(CounterCubit);
clearAll();
```

## Isolated and KeepAlive

Use `@blac({ isolated: true })` for component-scoped instances, and
`@blac({ keepAlive: true })` to disable auto-dispose when ref count reaches 0.
