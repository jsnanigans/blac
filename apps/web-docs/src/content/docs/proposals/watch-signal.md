---
title: 'Proposal: Watch With a Signal'
description: Adoption preview of watch(..., { signal }) and onActivated(), which replace hand-written subscription bridges between containers.
---

:::note[Built — adoption preview]
`watch({ signal })` and `onActivated` are implemented in `@blac/core` and documented in [watch()](/core/watch/) and [Cubit](/core/cubit/). This page shows what adopting them replaces. The "before" code is a typical shape, not a copy of a real app.
:::

## Problem

A container often needs to react to another container: when the active workspace changes, reload; when the cart empties, close a drawer. The hand-written bridge looks like this:

- Subscribe to the other container's observer in the constructor or a mount effect.
- Store the unsubscribe function in a field.
- Remember to call it on dispose, on every path that can tear the container down.

Miss one path and the bridge leaks: a disposed container keeps reacting to events.

## API

```ts
import { onActivated, watch } from '@blac/core';

watch(CartCubit, callback, { signal }); // stops when the signal aborts

onActivated(host, (signal) => {
  // runs on each activation; `signal` aborts on deactivation
});
```

- An aborted signal is equivalent to calling the returned `stop()`. An already-aborted signal returns a no-op `stop()` without subscribing.
- `onActivated` runs on every activation of the container, and immediately if it is already active. Its signal aborts when the container deactivates.

## Before and after

```ts title="Before — a manual bridge"
class SidebarCubit extends Cubit<SidebarState> {
  private unsubscribe?: () => void;

  constructor() {
    super({ open: false });
    this.unsubscribe = getBloc(CartCubit).subscribe((cart) => {
      if (cart.items.length === 0) this.patch({ open: false });
    });
  }

  dispose() {
    this.unsubscribe?.(); // easy to forget on a second teardown path
    super.dispose();
  }
}
```

```ts title="After — scoped to the container's activation"
class SidebarCubit extends Cubit<SidebarState> {
  constructor() {
    super({ open: false });
    onActivated(this, (signal) => {
      watch(
        CartCubit,
        (cart) => {
          if (cart.state.items.length === 0) this.patch({ open: false });
        },
        { signal },
      );
    });
  }
}
```

What goes away: the `unsubscribe` field and the `dispose` override. The subscription lives exactly as long as the container is active, and nothing can forget to remove it.

The same signal can tie several watches, fetches and timers to one lifetime.

## Differences to review

- **Activation vs construction.** A bridge made in the constructor lives from creation. One made in `onActivated` lives while the container has owners, and is recreated on reactivation (relevant for `keepAlive` containers).
- **Immediate first call.** `watch` runs the callback once immediately with the current instance, then on every change. A bridge that should react only to changes must ignore that first call. The "before" subscription above did not fire on setup.
- **No ref held.** `watch` does not keep the watched container alive, so it can be disposed if nothing else owns it.

## Open questions

- Should `onActivated` document a recommended place in the constructor, given that field initializers run before the container is configured (`args` are not yet set there)?
