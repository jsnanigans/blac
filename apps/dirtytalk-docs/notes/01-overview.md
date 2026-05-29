# dirtytalk — Overview

> Working notes on the `dirtytalk` reactive engine. Source-grounded against
> `packages/dirtytalk-engine` and `packages/dirtytalk-structural`.

## The one problem

Every reactive system asks the same question after a mutation:

> **What changed, who cares, and when do we tell them?**

The naive answer is *per-consumer*: each of N subscribers re-checks the whole
state to decide whether its slice moved. That's N traversals of the same data
on every change — O(N × state-size) per mutation.

`dirtytalk` flips it. Compute "what changed" **once at the source**, encoded as
a value (a `Region`) that every subscriber can cheaply intersect against its own
declared interest. The cost becomes **one walk + N cheap set-intersections**.
With few consumers the absolute cost is similar; with many consumers sharing one
source the win is proportional to N.

That is the entire thesis. Everything else is plumbing around it.

## Two layers

### `@dirtytalk/engine` — the abstract algebra

Framework-agnostic, zero deps. Knows nothing about React, objects, or the DOM.
You supply:

- **`Space<Region>`** — your definition of "what changed":
  `empty / isEmpty / union / intersects`. `Region` can be *anything*: a set of
  strings, a union of damage rectangles, a bitmask, a set of path IDs.
- **`Scheduler`** — *when* to flush: `Sync`, `Manual`, `Microtask`, `RAF`.
- **`DirtyChannel<Region>`** — accumulates `mark(region)` calls within a
  scheduler window, coalesces them via `union`, then delivers the merged dirty
  region to **only** the subscribers whose interest `intersects` it.

Also ships `Signal<T>` / `Observable<T>` primitives (sync notification, no
channel ceremony) on the `./primitives` subpath.

### `@dirtytalk/structural` — one concrete instantiation

`Region = a set of interned path IDs` (`PathSet`). The version for objects and
arrays whose consumers read named paths (`user.name`, `items.3.title`). Adds:

- `StructuralContainer<S>` — owns state, a `DirtyChannel<PathSet>`, and a
  consumer registry. Mutate via `emit` / `patch` / `update`.
- `PathInterner` — per-class string→numeric-ID interning.
- `PathSet` / `PathSetSpace` / `ALL_PATHS` — the engine `Space` implementation.
- `trackRender` — a Proxy that records every path a consumer reads.
- `useStructural` (React subpath) — auto-tracks read paths per render.

## The motivating pair (from the engine README)

The engine was extracted because **two unrelated domains had the same shape**:

| Library    | Domain          | `Region`                 | Scheduler  |
| ---------- | --------------- | ------------------------ | ---------- |
| **blac**   | state container | set of interned path IDs | Microtask  |
| **insomni**| WebGPU renderer | union of damage rects    | RAF        |

Same algebra (`empty` / `union` / `intersects`), two regions. blac stops walking
state N times per emit; insomni stops repainting the whole canvas and repaints
only dirty rectangles.

## See also

- `02-when-to-use.md` — fit criteria + real-world shapes
- `03-engine-internals.md` — DirtyChannel flush algorithm, schedulers
- `04-structural-internals.md` — PathSet, interner, tracker, patch vs emit
- `05-react-adapter.md` — useStructural and its registration-timing subtlety
- `06-gotchas.md` — sharp edges worth knowing before you ship
