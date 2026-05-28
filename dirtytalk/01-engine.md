# Engine — `@reactive/dirty-channel`

The shared reactive engine. Provides:

1. Notification primitives (`Observable<T>`, `Signal<T>`).
2. A generic dirty-tracking channel (`DirtyChannel<Region>`) parameterised over a `Space<Region>`.
3. A `Scheduler` interface for deciding *when* dirty notifications flush.

The engine has **no knowledge of rects, paths, React, the DOM, the GPU, or state containers**. Those are concerns of the consuming libraries.

---

## Design principles

1. **Allocation-free hot path.** A mutation should cost: one equality check, one assignment, one Set iteration over typically one listener. No object spreads, no Proxy traversal, no microtask schedule per write.
2. **Explicit deps over auto-tracking.** No `Computed`/`Effect` with hidden Proxy dependency graphs. If you want derived values, build them above this layer. The engine notifies; it does not compute.
3. **Coalescing at the flush boundary, not the write boundary.** Writes mark; the scheduler decides when to flush. Many writes in the same tick produce one notification cycle.
4. **Pluggable Space.** The engine is generic over what "a region" means. Rects and path-sets are first-class; tile coordinates, entity IDs, anything else with `union`/`intersects` works.
5. **Pluggable Scheduler.** RAF, microtask, sync, custom — the engine doesn't care.

---

## Layer 1 — Notification primitives

```ts
interface Observable<T> {
  peek(): T                          // read without subscribing
  subscribe(cb: (value: T) => void): () => void
}

class Signal<T> implements Observable<T> {
  constructor(initial: T, equals?: (a: T, b: T) => boolean)
  get value(): T
  set value(next: T): void           // skips notify if equals(prev, next)
  peek(): T
  subscribe(cb: (value: T) => void): () => void
}
```

**Implementation notes**

- Backing storage: one `T` field, one `Set<cb>`.
- `equals` defaults to `Object.is`. Override for custom value equality (rare).
- `subscribe` returns an unsubscribe function; idempotent (calling twice is a no-op).
- Notification is **synchronous** by default at this layer. Coalescing is the `DirtyChannel`'s job.

These primitives are *not* the dirty-tracking system; they are the building blocks. Both libraries use them directly for one-off observable values that don't need the full DirtyChannel ceremony (e.g., a viewport position, a current selection).

---

## Layer 2 — `Space<Region>`

The algebra of "what changed" and "what I care about." Both are values of type `Region`.

```ts
interface Space<Region> {
  empty(): Region
  isEmpty(r: Region): boolean
  union(a: Region, b: Region): Region          // accumulate dirty
  intersects(interest: Region, dirty: Region): boolean  // does this consumer care?
}
```

**Contracts**

- `union(empty(), r) === r` (up to value equality).
- `intersects(empty(), _)` returns `false`.
- `union` should be cheap; called once per `mark()` call.
- `intersects` should be very cheap; called once per (consumer, flush) pair.
- Operations must be **pure** — no side effects, no time-dependent results. Same inputs, same output.

**Why no `subtract`?** The engine doesn't need it. Dirty accumulates within a flush window; on `flush()`, the accumulator resets to `empty()`. Nothing inside the engine asks "what's left after removing X."

**Why no `equals`?** Same reason. The engine cares only about emptiness (skip flush) and intersection (deliver or not).

---

## Layer 3 — `Scheduler`

```ts
interface Scheduler {
  request(flush: () => void): void   // ensure flush runs once, soon
  cancel(): void                     // optional, for teardown
}
```

**Contract:** after `request()` is called, the engine's `flush` callback must be invoked at least once, and `request()` should be **idempotent within a single scheduling window** — calling it ten times before the next flush results in one flush, not ten.

**Provided implementations** (in the engine package):

- `MicrotaskScheduler` — `request` queues a microtask if none pending. Used by blac.
- `RAFScheduler` — `request` calls `requestAnimationFrame` if none pending. Used by insomni.
- `SyncScheduler` — `request` invokes `flush` immediately. Used by tests and by blac's "synchronous emit" compatibility mode.
- `ManualScheduler` — `request` records that a flush is wanted; the consumer drives `pump()` explicitly. Used by tests, by replay tools, by server-side rendering.

---

## Layer 4 — `DirtyChannel<Region>`

```ts
class DirtyChannel<Region> {
  constructor(space: Space<Region>, scheduler: Scheduler)

  mark(r: Region): void
  subscribe(
    interest: () => Region,
    cb: (dirty: Region) => void,
  ): () => void
}
```

**Behaviour**

1. `mark(r)`:
   - `accumulated = space.union(accumulated, r)`
   - if not already scheduled, `scheduler.request(flush)`.
2. `flush()`:
   - Snapshot `dirty = accumulated`; reset `accumulated = space.empty()`.
   - If `space.isEmpty(dirty)`, return early.
   - For each subscriber, evaluate `interest()` (lazy thunk; see below). If `space.intersects(interestRegion, dirty)`, invoke `cb(dirty)`.
   - The order of subscriber invocation is registration order. Subscribers added during flush are not invoked in the current flush; they will see the next one.
3. `subscribe(...)`:
   - Returns an unsubscribe function. Unsubscribing during a flush takes effect immediately (the unsubscribed callback will not be invoked, even if it hasn't been visited yet in the current flush).

**Why is `interest` a thunk and not a value?**

Subscribers' interests change over time. A `SceneNode` moves and resizes; its bounds shift. A React consumer reads different paths on different renders (conditional branches). If `interest` were a captured snapshot at subscribe time, the engine would miss changes and silently under- or over-notify.

The thunk is called at most once per flush per subscriber — cheap, and aligns dirty tracking with the consumer's actual current state.

**Why does `cb` receive `dirty`?**

So the subscriber can compute the *intersection* if it needs to know precisely which subset is dirty (e.g., a node that wants to only re-rasterise a sub-rect of itself). For most subscribers, knowing "yes you're dirty, here's the union" is enough; they ignore the payload.

---

## What's NOT in the engine

The engine does not provide, and will not provide:

- **Auto-tracked computed values.** No `computed(() => a.value * 2)` with hidden dep graphs. Build above this layer if needed.
- **Effect system with cleanups.** No `effect(() => { ...; return cleanup })`. `subscribe` returns an unsubscribe; that's enough.
- **Selector/memoization helpers.** Consumer-side concern (React's `useMemo`, blac's per-consumer tracker).
- **Diffing utilities.** Producing a `Region` from a state mutation is the consuming library's job (insomni: bounds intersection; blac: skeleton-walk diff).
- **Glitch-free guarantees across dependency graphs.** There is no dependency graph at this layer.

If any of those features are wanted, they live in a higher-level package built on top.

---

## Package layering

```
@reactive/primitives          Observable, Signal
       ↑
@reactive/dirty-channel       Space, Scheduler, DirtyChannel, provided schedulers
       ↑                  ↑
   insomni            blac
   (RectSpace,       (PathSetSpace,
    SceneNode,        Bloc adapter,
    FrameScheduler)   per-consumer tracker)
```

Both libraries depend on `@reactive/dirty-channel`. Neither depends on the other. The engine has zero runtime dependencies.

**Why two packages and not one?** `@reactive/primitives` is useful on its own — small consumers want `Signal<T>` without the full dirty-channel machinery. Splitting keeps the dependency footprint honest for those cases.

---

## API sketch (full surface)

```ts
// @reactive/primitives
export interface Observable<T> { peek(): T; subscribe(cb: (v: T) => void): () => void }
export class Signal<T> implements Observable<T> { ... }

// @reactive/dirty-channel
export interface Space<R> { empty(): R; isEmpty(r: R): boolean; union(a: R, b: R): R; intersects(i: R, d: R): boolean }
export interface Scheduler { request(flush: () => void): void; cancel?(): void }
export class DirtyChannel<R> { ... }

// Provided schedulers
export class MicrotaskScheduler implements Scheduler { ... }
export class RAFScheduler implements Scheduler { ... }
export class SyncScheduler implements Scheduler { ... }
export class ManualScheduler implements Scheduler { pump(): void }
```

That's the whole engine. Probably under 200 lines of implementation.

---

## Decisions

1. **Re-entrancy during flush** — defer. `mark()` calls inside a subscriber callback are accumulated into the *next* flush, not the current one. Bounded work per flush, no infinite-loop risk. Cascading damage in insomni costs one extra frame.
2. **Error handling in subscribers** — continue. If a callback throws, collect the error, keep invoking remaining subscribers, surface a single `AggregateError` at end of flush.
3. **Per-Channel vs per-source accumulator** — one accumulator per `DirtyChannel`. Blac: one channel per Bloc instance. Insomni: one channel per render root. No channel composition in v1.
4. **Backpressure** — none in the engine. `Space.union` must be cost-idempotent on repeated inputs (union of a rect with itself is the same rect); Space implementations enforce this.
5. **TypeScript inference for `Region`** — assumed to flow cleanly through `DirtyChannel<R>` → `Space<R>` → thunks. Verify in prototype; treat as implementation detail, not a blocker.

## Open questions

(none — all engine-layer questions resolved)
