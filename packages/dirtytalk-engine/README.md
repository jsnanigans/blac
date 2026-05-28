# @dirtytalk/engine

A reactive dirty-tracking and notification engine. Zero deps, pluggable space, pluggable scheduler.

## Why this exists

Both insomni (a WebGPU renderer) and blac (a state container library) solve the same problem
in different domains: after a mutation, *what changed, who cares, and when do we tell them?*
Today both answer this per-consumer — insomni repaints the entire canvas because it has no
rect-level damage info; blac walks state N times for N consumers.

The shared move is to compute "what changed" once at the source, in a format every subscriber
can intersect cheaply. Insomni's format is a union of damage rects. Blac's format is a set of
interned path IDs. Both are the same algebra: a region with `empty`, `union`, and `intersects`.
This package is that algebra plus the scheduling glue.

## What's in the box

- `Signal<T>` / `Observable<T>` — synchronous notification primitives for one-off observable
  values that don't need the full dirty-channel ceremony.
- `Space<Region>` interface — the algebra a consuming library must implement to describe its
  notion of "what changed" (e.g., rect unions, path sets).
- `Scheduler` interface + four built-in implementations (`SyncScheduler`, `ManualScheduler`,
  `MicrotaskScheduler`, `RAFScheduler`) — controls when a flush runs.
- `DirtyChannel<Region>` — the main event: accumulates marks within a scheduler window,
  then delivers to interested subscribers in one flush.

## Install

```bash
pnpm add @dirtytalk/engine
```

If you only want `Signal` and `Observable`, import from the `./primitives` subpath:

```ts
import { Signal } from '@dirtytalk/engine/primitives';
```

## Quick example

```ts
import {
  DirtyChannel,
  SyncScheduler,
} from '@dirtytalk/engine';
import type { Space } from '@dirtytalk/engine';

// A trivial Space where Region = Set<string>.
const StringSetSpace: Space<Set<string>> = {
  empty: () => new Set(),
  isEmpty: (r) => r.size === 0,
  union: (a, b) => new Set([...a, ...b]),
  intersects: (interest, dirty) => {
    for (const k of interest) {
      if (dirty.has(k)) return true;
    }
    return false;
  },
};

const channel = new DirtyChannel(StringSetSpace, new SyncScheduler());

// Subscribe with an interest thunk (re-evaluated each flush).
const unsub = channel.subscribe(
  () => new Set(['users', 'session']),
  (dirty) => {
    console.log('dirty keys:', [...dirty]);
  },
);

channel.mark(new Set(['users']));
// => "dirty keys: [ 'users' ]"  (SyncScheduler flushes immediately)

channel.mark(new Set(['theme']));
// => no output — 'theme' doesn't intersect our interest

unsub();
```

## Primitives — `Signal<T>`

```ts
import { Signal } from '@dirtytalk/engine';

const count = new Signal(0);

const unsub = count.subscribe((v) => console.log('count:', v));

count.value = 1; // => "count: 1"
count.value = 1; // skipped — Object.is equality short-circuits notify

unsub();

count.peek(); // read without subscribing
```

`Signal` accepts an optional second argument `equals?: (a: T, b: T) => boolean` to override
the default `Object.is` check. Notification is synchronous at this layer; coalescing is
`DirtyChannel`'s job.

## The `Space<Region>` interface

```ts
interface Space<Region> {
  empty(): Region;
  isEmpty(r: Region): boolean;
  union(a: Region, b: Region): Region;       // accumulate dirty marks
  intersects(interest: Region, dirty: Region): boolean; // delivery predicate
}
```

Contracts:
- `union(empty(), r)` is equivalent to `r`.
- `intersects(empty(), _)` returns `false`.
- Both operations must be **pure** — no side effects, stable output for stable inputs.

This package provides **no concrete Space implementations**. Those live in the consuming
libraries. Insomni's `RectSpace` and blac's `PathSetSpace` are the motivating examples.

## Scheduler interface + provided implementations

```ts
interface Scheduler {
  request(flush: () => void): void; // call flush at most once per scheduling window
  cancel?(): void;                  // optional teardown
}
```

`request` must be idempotent within a window: ten calls before the first flush produce
one flush, not ten.

| Scheduler | When it flushes | Intended use |
|---|---|---|
| `SyncScheduler` | Immediately on `request` | Tests, sync emit compatibility |
| `ManualScheduler` | When `.pump()` is called | Tests, replay, SSR |
| `MicrotaskScheduler` | End of current microtask queue | blac (default) |
| `RAFScheduler` | Next `requestAnimationFrame` (falls back to `setTimeout(_, 16)`) | insomni |

## `DirtyChannel<Region>`

```ts
class DirtyChannel<Region> {
  constructor(space: Space<Region>, scheduler: Scheduler);
  mark(r: Region): void;
  subscribe(interest: () => Region, cb: (dirty: Region) => void): () => void;
}
```

`mark` accumulates into an internal dirty accumulator and requests a flush. `subscribe`
registers an interest thunk and a callback; both are evaluated at flush time, not at
subscribe time.

```ts
const unsub = channel.subscribe(
  () => myNode.bounds(),   // re-evaluated every flush
  (dirty) => myNode.repaint(dirty),
);
```

Returns an unsubscribe function. Safe to call at any time, including from inside a callback.

## Behaviour notes

- **Marks coalesce.** Many `mark` calls within the same scheduler window produce one flush.
  `Space.union` is called per `mark`; the result is a single accumulated region.
- **Interest is a thunk.** Re-evaluated on every flush, so subscribers can move, resize, or
  reconfigure freely between flushes. If you snapshot at subscribe time, you miss updates.
- **Re-entrant marks defer.** Calling `mark` from inside a subscriber callback accumulates
  into the *next* flush. No infinite loops; bounded work per flush tick.
- **Error isolation.** If a subscriber callback throws, the error is collected and the flush
  continues to completion. A single error is re-thrown as-is; multiple errors are wrapped in
  an `AggregateError`.
- **Subscribe/unsubscribe during flush is safe.** New subscribers see the next flush, not
  the current one. Unsubscribed callbacks are skipped immediately, even mid-flush.

## What it is not

- **No auto-tracked computed values.** No `computed(() => a.value + b.value)` with hidden
  dependency graphs. Build derived values above this layer.
- **No effect system with cleanups.** `subscribe` returns an unsubscribe; that's the cleanup.
- **No selector/memoization helpers.** Consumer-side concern (React's `useMemo`, blac's
  per-consumer tracker).
- **No diffing utilities.** Producing a `Region` from a mutation is the consuming library's
  job. The engine only unions and intersects.
- **No glitch-free guarantees across a dependency graph.** There is no dependency graph at
  this layer.
- **Not coupled to any framework.** React, the DOM, and the GPU are not referenced here.

## License

MIT — see LICENSE.
