# waitUntil

`waitUntil` is not part of the current `@blac/core` API.

For async flows, you can use `watch` and resolve a promise when a condition is met:

```ts
import { watch } from '@blac/core';

function waitForCountTen() {
  return new Promise<void>((resolve) => {
    const stop = watch(CounterCubit, (counter) => {
      if (counter.state.count >= 10) {
        stop();
        resolve();
      }
    });
  });
}
```
