# @dirtytalk/structural

Path-based dirty-tracking instantiation of @dirtytalk/engine, for state containers and structural data.

## Why this exists

Both state containers and UI renderers ask the same question after a mutation: _what changed, who
cares, and when do we tell them?_ The shared answer in `@dirtytalk/engine` is to compute "what
changed" once at the source, in a format every subscriber can intersect cheaply. For structural
data — objects and arrays whose consumers track named paths through them — that format is a set of
interned path IDs. This package supplies that format plus the container and adapter that make it
work end-to-end.

The problem with per-consumer diffing is cost: N consumers × per-emit walks of the state tree →
N separate traversals doing the same equality checks over and over. This package replaces that
pattern with one walk per emit (bounded to the observed skeleton of paths any live consumer
actually reads) plus N cheap set-intersections to decide which consumers care. With few consumers
the absolute cost is similar; with many consumers sharing the same container the win is
proportional to N.

## What's in the box

- `StructuralContainer<S>` — the base class. Holds state, owns a `DirtyChannel<PathSet>`, maintains
  the observed skeleton across consumers, and exposes `emit`, `patch`, and `update`.
- `PathInterner` — per-class string-to-ID interning. Stable across all instances of the same
  container class.
- `PathSet` — a compact set of `PathId` numbers with `ALL_PATHS` sentinel and `PathSetSpace` — the
  `Space<PathSet>` implementation consumed by the engine. `ALL_PATHS` is used when the
  single-consumer-skip fires (or for opt-in blanket interest), making `intersects` unconditionally
  true without enumerating paths.
- `trackRender` — Proxy-based per-consumer path recorder. Wraps state, records every field access
  as an interned `PathId`, and returns the access set alongside the proxied value.
- `diffAlongSkeleton`, `pathsFromPatch`, `getAt` — diffing helpers. `pathsFromPatch` extracts
  dotted paths from a partial object; `diffAlongSkeleton` walks only the observed skeleton to find
  changed paths; `getAt` reads a value at a dotted path string.
- React adapter at `@dirtytalk/structural/react`: `useStructural` — subscribes a component to a
  container's dirty channel and records paths per render.

## Install

```bash
pnpm add @dirtytalk/structural @dirtytalk/engine
```

`@dirtytalk/engine` is a runtime dependency. Both packages are versioned together in this
monorepo; installing structural without engine would produce a missing peer at runtime.

## Quick example — core (no React)

```ts
import { StructuralContainer, SyncScheduler } from '@dirtytalk/structural';
import { MicrotaskScheduler } from '@dirtytalk/engine';

interface CounterState {
  count: number;
  label: string;
}

class CounterContainer extends StructuralContainer<CounterState> {
  constructor() {
    super({ count: 0, label: 'counter' }, new MicrotaskScheduler());
  }

  increment() {
    this.patch({ count: this.state.count + 1 });
  }
}

const counter = new CounterContainer();

// Subscribe via the underlying dirty channel.
// Interest thunk returns the path set of paths this subscriber cares about.
// For a simple subscriber that wants everything, use ALL_PATHS.
import { ALL_PATHS } from '@dirtytalk/structural';

const unsub = counter.channel.subscribe(
  () => ALL_PATHS,
  (dirty) => {
    console.log('state:', counter.state, 'dirty:', dirty);
  },
);

counter.increment();
// After the microtask flushes:
// => state: { count: 1, label: 'counter' }  dirty: PathSet { count }

unsub();
```

`patch` produces a `PathSet` directly from the keys of the partial object — no diff needed.
`emit` and `update` walk `diffAlongSkeleton` against the observed skeleton so only paths that
actually changed are marked.

## Quick example — React

```tsx
import { useStructural } from '@dirtytalk/structural/react';

const counter = new CounterContainer();

function CounterDisplay() {
  const [state, container] = useStructural(counter);

  // Only the paths read inside this render are recorded.
  // Accessing state.count registers "count" in this consumer's PathSet.
  // A patch to "label" will not re-render this component.
  return <button onClick={() => container.increment()}>{state.count}</button>;
}
```

On each render, `useStructural` wraps `state` in a recording Proxy, collects the accessed paths,
and stores them as the subscription interest for the next flush. If props or context change what
fields are read, the interest updates automatically on the next render — no selector declaration
required.

## API surface — public exports

| Export                            | Role                                                            |
| --------------------------------- | --------------------------------------------------------------- |
| `StructuralContainer<S>`          | Base class: state, channel, skeleton, `emit`/`patch`/`update`   |
| `PathInterner`                    | Interning: `intern(path): PathId`, `lookup(id): string`, `size` |
| `PathSet`                         | Type alias for the compact path-set value                       |
| `PathSetSpace`                    | `Space<PathSet>` implementation for the engine                  |
| `ALL_PATHS`                       | Sentinel `PathSet` — `intersects` always returns true           |
| `pathSetUnion`                    | Pure union of two `PathSet` values                              |
| `pathSetEquals`                   | Equality check for two `PathSet` values                         |
| `trackRender`                     | `(state, interner) => { value: S, paths: PathSet }`             |
| `diffAlongSkeleton`               | `(prev, next, skeleton, interner) => PathSet`                   |
| `pathsFromPatch`                  | `(partial, interner) => PathSet`                                |
| `getAt`                           | `(obj, dottedPath) => unknown`                                  |
| `useStructural` _(react subpath)_ | `(container, options?) => [state, container]`                   |

## What it is not

- **No auto-tracked computed values.** There is no `computed(() => a + b)` with a hidden
  dependency graph. Build derived values above this layer.
- **No effect system with cleanups.** The channel's `subscribe` returns an unsubscribe function;
  that is the cleanup primitive.
- **No scheduler opinions.** The scheduler is injected into `StructuralContainer`. The engine
  provides `SyncScheduler`, `ManualScheduler`, `MicrotaskScheduler`, and `RAFScheduler`; choose
  what fits your context. This package does not force one.
- **No mutation primitive.** All updates go through `emit`, `patch`, or `update` — immutable
  replacement only. In-place mutation of `state` bypasses change tracking silently.
- **No virtual DOM.** The React adapter triggers re-renders via `useReducer`; the actual
  reconciliation is React's job.

## License

MIT — see LICENSE.
