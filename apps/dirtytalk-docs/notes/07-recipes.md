# Recipes

Copy-paste starting points. Verify import paths against the package's
`package.json` exports.

## A. Object state + React (the common case)

```tsx
import { StructuralContainer } from '@dirtytalk/structural';
import { useStructural } from '@dirtytalk/structural/react';

interface CartState {
  items: Item[];
  total: number;
  shippingAddress: Address | null;
}

class CartContainer extends StructuralContainer<CartState> {
  constructor() {
    super({ items: [], total: 0, shippingAddress: null });
    // default scheduler = MicrotaskScheduler
  }

  addItem(i: Item) {
    const items = [...this.state.items, i];
    this.patch({ items, total: items.reduce((s, x) => s + x.price, 0) });
  }
}

const cart = new CartContainer();

function Total() {
  const [state] = useStructural(cart);      // records `total`
  return <span>{state.total}</span>;         // re-renders ONLY when total changes
}

function AddButton({ item }: { item: Item }) {
  const [, container] = useStructural(cart); // records nothing → never re-renders
  return <button onClick={() => container.addItem(item)}>Add</button>;
}
```

`AddButton` reads no state fields, so its interest set is empty and it never
re-renders on cart changes — it only needs the container handle.

## B. Core, no React — subscribe to the channel directly

```ts
import { StructuralContainer, ALL_PATHS } from '@dirtytalk/structural';
import { SyncScheduler } from '@dirtytalk/engine';

class Counter extends StructuralContainer<{ count: number; label: string }> {
  constructor() {
    super({ count: 0, label: 'c' }, { scheduler: new SyncScheduler() });
  }
  inc() { this.patch({ count: this.state.count + 1 }); }
}

const c = new Counter();

// Blanket interest: wake on any change.
const unsub = c.channel.subscribe(
  () => ALL_PATHS,
  (dirty) => console.log('state:', c.state, 'dirty:', dirty),
);

c.inc();   // SyncScheduler flushes inline
unsub();
```

For *selective* manual interest, build a `PathSet` of the paths you care about
using the class interner and return it from the thunk:

```ts
import { emptyPathSet } from '@dirtytalk/structural';

const interest = emptyPathSet() as Set<number>;
interest.add(c.interner.intern('count'));   // wake only on `count`
c.channel.subscribe(() => interest, () => { /* ... */ });
```

## C. Per-path custom equality

```ts
super(initial, {
  equality: new Map([
    ['updatedAt', (a, b) => true],                 // ignore timestamp churn
    ['tags', (a, b) => shallowArrayEqual(a, b)],    // value-compare an array leaf
  ]),
});
```

Only consulted by `emit`/`update`'s `diffAlongSkeleton` — `patch` ignores it.

## D. Engine with a custom (non-path) region

```ts
import { DirtyChannel, RAFScheduler, type Space } from '@dirtytalk/engine';

type Rect = { x: number; y: number; w: number; h: number };
const RectSpace: Space<Rect[]> = {
  empty: () => [],
  isEmpty: (r) => r.length === 0,
  union: (a, b) => [...a, ...b],                    // (coalesce/merge in real impl)
  intersects: (interest, dirty) =>
    interest.some((i) => dirty.some((d) => overlap(i, d))),
};

const channel = new DirtyChannel(RectSpace, new RAFScheduler());
const unsub = channel.subscribe(
  () => [widget.bounds()],                          // thunk: re-read each flush
  (dirty) => widget.repaint(dirty),
);
channel.mark([damageRect]);                          // only overlapping widgets repaint
```

## E. Deterministic tests with ManualScheduler

```ts
import { ManualScheduler } from '@dirtytalk/engine';

const sched = new ManualScheduler();
const c = new Counter(/* pass */ { scheduler: sched });

c.inc();
c.inc();          // marks coalesce — still one pending flush
expect(rendered).toBe(0);
sched.pump();      // exactly one flush delivers
expect(rendered).toBe(1);
```

## Scheduler picker

| Context            | Scheduler             |
| ------------------ | --------------------- |
| React app          | `MicrotaskScheduler` (default) |
| Canvas/GPU/animation | `RAFScheduler`      |
| Unit tests / SSR   | `SyncScheduler` or `ManualScheduler` |
