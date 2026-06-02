# Concepts

This page explains the model behind `@dirtytalk/engine`: why a region carries "what changed", what the `Space` algebra guarantees, how the four schedulers differ, and exactly what happens inside a flush. It is the "why" companion to the task-oriented [Getting Started](/dirtytalk/engine/getting-started) and the lookup-oriented [API Reference](/dirtytalk/engine/api-reference).

## The single-dirty-bit problem

The naive way to track change is a boolean: "something is dirty, re-run everything." It is cheap to set and useless to act on. When a single value changes, every subscriber wakes up, recomputes, and most of them discover they did not care. A renderer with one dirty bit repaints the whole canvas. A state container with one dirty bit walks the entire tree once per consumer.

The fix is to make the dirty signal carry information: not _that_ something changed, but _what_ changed. If "what changed" is a value subscribers can cheaply test their own interest against, then a flush can skip every subscriber that does not overlap. That value is the **`Region`** — and the engine's only opinion is that "what changed" and "what I care about" are the same kind of value, so they can be intersected.

This is not a hypothetical generalization. Two real libraries motivated it: `insomni`, a WebGPU renderer whose region is a union of damage rectangles, and `blac`, a state-container library whose region is a set of interned path IDs. Different domains, identical algebra. The engine is that algebra plus the scheduling glue, and nothing else.

## The Space algebra

A `Space<Region>` is the contract a consuming library implements to describe its notion of change. It is four pure functions:

```ts
interface Space<Region> {
  empty(): Region;
  isEmpty(r: Region): boolean;
  union(a: Region, b: Region): Region;
  intersects(interest: Region, dirty: Region): boolean;
}
```

Read it as a small algebra over regions:

- `empty()` is the **zero region** — the identity element. "Nothing changed."
- `isEmpty(r)` recognizes that zero. The channel uses it for a no-op fast-path.
- `union(a, b)` **accumulates** two dirty regions into one. This is how many marks become a single flush payload.
- `intersects(interest, dirty)` is the **delivery predicate** — the one decision the engine makes per subscriber per flush.

### The contracts, and why they exist

Two laws are non-negotiable:

1. **`union(empty(), r)` equals `r`.** `empty()` is the identity for `union`. The channel starts each window with `empty()` and folds every mark into it; if `empty()` were not the identity, the first mark of every window would be corrupted.
2. **`intersects(empty(), _)` returns `false`.** An empty interest is interest in nothing. A subscriber whose thunk returns `empty()` must never be called. (The channel separately skips the _whole_ loop when the _dirty_ region is empty, but this law covers the per-subscriber case.)

On top of those, every operation must be **pure**: same inputs produce the same output, with no side effects. The channel calls `union`, `intersects`, `isEmpty`, and `empty` many times across a flush and relies on stable results. A `Space` that mutates its arguments, caches statefully, or returns different answers for the same inputs will produce undefined behavior. Do not, for example, put logging or lazy initialization inside `intersects`.

### Worked example: `StringSet`

A region that is a set of changed string keys satisfies the algebra cleanly:

```ts
import type { Space } from '@dirtytalk/engine';

const StringSetSpace: Space<Set<string>> = {
  empty: () => new Set(), // zero = the empty set
  isEmpty: (r) => r.size === 0, // recognizes the empty set
  union: (a, b) => new Set([...a, ...b]), // set union accumulates
  intersects: (interest, dirty) => {
    for (const k of interest) {
      if (dirty.has(k)) return true; // any shared key = overlap
    }
    return false; // empty interest can never match
  },
};
```

Check the laws: `union(new Set(), r)` is a fresh set with exactly `r`'s elements — equal to `r`. `intersects(new Set(), _)` loops zero times and returns `false`. Both operations are pure (each `union` allocates a new set rather than mutating an input). A bitset (`Region = number`, `union = a | b`, `intersects = (i & d) !== 0`) satisfies the same laws and is even cheaper.

## The four schedulers

The `Space` decides _what_ and _who_. The `Scheduler` decides _when_. A scheduler receives a `flush` callback via `request(flush)` and is responsible for invoking it. The contract: within a scheduling window, `request` is idempotent — N calls before the first flush produce **one** flush, not N. (`SyncScheduler` is the deliberate exception: each `request` is its own window and flushes immediately.) An optional `cancel()` prevents a pending flush.

The engine ships four implementations:

| Scheduler            | When it flushes                                         | Coalesces?                 | `cancel()`? | Use it for                                    |
| -------------------- | ------------------------------------------------------- | -------------------------- | ----------- | --------------------------------------------- |
| `SyncScheduler`      | Immediately, inside `request`                           | No (every request flushes) | No          | Tests, synchronous-emit compatibility         |
| `ManualScheduler`    | Only when you call `pump()`                             | Yes (until pumped)         | No          | Tests, replay, SSR — deterministic timing     |
| `MicrotaskScheduler` | End of the current microtask queue                      | Yes (one per tick)         | Yes         | `blac` (the default) — batch within a JS turn |
| `RAFScheduler`       | Next `requestAnimationFrame`, else `setTimeout(fn, 16)` | Yes (one per frame)        | Yes         | `insomni` — frame-aligned repaints            |

A few details worth internalizing:

- **`SyncScheduler` does not coalesce at the scheduler level.** Every `request` flushes synchronously. With `SyncScheduler`, each `mark` therefore flushes immediately. Coalescing of marks within a window — when it happens at all — comes from the `DirtyChannel`'s own scheduled-flag guard, not from this scheduler.
- **`ManualScheduler.pump()` clears its pending state _before_ invoking the flush.** A re-entrant `request` made during that flush is preserved for the _next_ `pump`, not cascaded synchronously. A `pump` with nothing pending is a harmless no-op.
- **`MicrotaskScheduler` and `RAFScheduler` store the latest flush and coalesce.** Multiple requests within the same tick/frame collapse to one drain; the last stored flush wins. Both implement `cancel()` to drop a pending drain.
- **`RAFScheduler` chooses rAF-vs-setTimeout once, at construction.** It captures `typeof globalThis.requestAnimationFrame === 'function'` in the constructor. If you polyfill `requestAnimationFrame` _after_ building the instance, it will keep using `setTimeout`.

## The DirtyChannel lifecycle

A `DirtyChannel<Region>` ties a `Space` and a `Scheduler` together. Here is the full flow, narrated, from a mark to a delivered callback.

### mark → accumulate

```ts
channel.mark(region);
```

Every `mark` folds the region into the channel's internal accumulator via `space.union(accumulated, region)` — once per mark, regardless of whether a flush is in progress. Then, _only if_ the channel is not already flushing and has not already scheduled, it sets a scheduled flag and calls `scheduler.request(flush)`. This guard is what turns N marks into one flush request: the second through Nth marks see the flag already set and just accumulate.

### scheduler window → flush

The scheduler decides when to invoke the flush callback (immediately, on `pump`, on a microtask, on a frame). The channel always hands the scheduler the **same bound function instance**, allocated once at construction. This avoids GC churn and lets identity-keying schedulers dedupe correctly.

### flush: snapshot, evaluate, deliver

When the flush finally runs, it executes in a fixed order:

1. **Snapshot and reset.** The accumulated region is captured into a local `dirty`, the accumulator is reset to `empty()`, and the scheduled flag is cleared — all _before_ any callback runs. This is what lets re-entrant marks land cleanly in the fresh accumulator.
2. **Empty fast-path.** If `space.isEmpty(dirty)`, the flush returns immediately. The subscriber loop is skipped entirely and **interest thunks are not even called**. A no-op flush fires nothing.
3. **Enter flushing mode** — a flag the channel uses to recognize re-entrant marks.
4. **Snapshot the subscriber list.** Subscribers added during this flush are not in the snapshot and will not run this cycle.
5. **Iterate in registration order.** For each entry: skip it if it has been unsubscribed (an `alive` flag checked on the entry, so unsubscribing a _later_ subscriber from an _earlier_ callback works); evaluate its interest thunk; if `space.intersects(interest, dirty)` is false, skip; otherwise invoke its callback with `dirty`.
6. **Exit flushing mode.**
7. **Schedule any follow-up.** If a mark arrived during dispatch, the accumulator is now non-empty, so the channel re-sets the scheduled flag and requests the next flush — done _after_ clearing the flushing flag so `mark`'s guard does not double-schedule.
8. **Surface errors** (described below).

### Coalescing

Many marks in one window → one flush, carrying the single unioned `dirty` region. The subscriber sees the whole batch at once, not one callback per mark. This is the core efficiency win and it falls directly out of the `union`-on-mark plus the scheduled-flag guard.

### Re-entrant marks defer to the next flush

If a subscriber callback calls `mark` during a flush, that region accumulates into the _next_ flush's payload — it never re-enters the current dispatch synchronously. The follow-up is scheduled at step 7 once the current flush is fully done. This bounds the work per tick and makes infinite synchronous loops impossible within a single flush.

::: warning Signal does the opposite
A re-entrant _write_ inside a `Signal` subscriber recurses synchronously — a fresh, fully synchronous notify cycle. `DirtyChannel` defers; `Signal` recurses. Do not assume one behaves like the other.
:::

### Error isolation and AggregateError

A throwing interest thunk is treated as "no interest this flush": the error is recorded and the subscriber is skipped. A throwing callback is likewise recorded, and iteration continues to the remaining subscribers. Errors surface only **after** the whole flush completes and the channel's state is clean (including any follow-up scheduling):

- 0 errors → nothing thrown.
- exactly 1 error → that error is re-thrown **as-is**, unwrapped.
- more than 1 → thrown as `new AggregateError(errors, 'DirtyChannel: subscriber errors during flush')`.

One subscriber throwing never starves the others. If you want per-callback isolation that never throws, wrap your own callbacks.

### Subscribe / unsubscribe during a flush is safe

Because the subscriber list is snapshotted at step 4, a `subscribe` during a callback adds an entry that runs on the _next_ flush, not the current one. An `unsubscribe` during a callback flips the entry's `alive` flag and removes it from the map immediately, so a not-yet-visited subscriber in the snapshot is skipped this cycle. Unsubscribe is idempotent — safe to call any number of times, including mid-flush.

### Interest is a thunk

The interest passed to `subscribe` is a function, re-evaluated lazily once per flush per subscriber — never snapshotted at subscribe time, and skipped entirely on empty-dirty flushes. This lets a subscriber move, resize, or reconfigure between flushes and always be matched against its _current_ interest. The flip side: do not put load-bearing side effects in an interest thunk (it may not run on a given flush), and keep it pure-ish — a throw is swallowed-as-error and skips that subscriber for that flush.

## The Signal / Observable layer

Alongside the channel, the engine exposes a much simpler primitive for single observable values that do not need region machinery.

```ts
interface Observable<T> {
  peek(): T;
  subscribe(cb: (value: T) => void): () => void;
}
```

`Signal<T>` is the only built-in implementation. It holds one value, notifies subscribers synchronously when that value changes, and short-circuits the notify when the new value is equal to the old (by `Object.is`, or a custom comparator you pass). There is no scheduler and no coalescing — set the value, subscribers run now.

How it differs from `DirtyChannel`:

|                    | `Signal<T>`                                                               | `DirtyChannel<Region>`                                                              |
| ------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Carries            | one value `T`                                                             | a region of "what changed"                                                          |
| Notification       | synchronous on set                                                        | deferred to a scheduler window                                                      |
| Coalescing         | none                                                                      | many marks → one flush                                                              |
| Selective delivery | none (every subscriber notified)                                          | interest ∩ dirty per subscriber                                                     |
| Re-entrancy        | recurses synchronously                                                    | defers to next flush                                                                |
| Error surfacing    | single re-thrown / `AggregateError('Signal: multiple subscriber errors')` | single re-thrown / `AggregateError('DirtyChannel: subscriber errors during flush')` |

Reach for `Signal` when you have "one value, tell everyone now". Reach for `DirtyChannel` when you have "many things, tell the right people once, when the moment is right".

## What it is not

The engine is deliberately small. It is not a reactivity framework, and it leaves several things to the layers above it:

- **No concrete `Space`.** The package ships zero region implementations. You (or `@dirtytalk/spatial` / `@dirtytalk/structural`) supply one.
- **No auto-tracked computed values.** There is no `computed(() => a + b)` with a hidden dependency graph. Derived values are built above this layer.
- **No effect system with cleanups.** `subscribe` returns an unsubscribe function; that is the entire cleanup story.
- **No selector or memoization helpers.** That is a consumer concern (React's `useMemo`, blac's per-consumer tracker).
- **No diffing utilities.** Turning a mutation into a `Region` is the consuming library's job. The engine only `union`s and `intersects`.
- **No glitch-free dependency graph.** There is no dependency graph at this layer at all.
- **Not coupled to any framework.** React, the DOM, and the GPU are never referenced. There is no React entry point — the only entries are `.` and `./primitives`.

## See also

- [Getting Started](/dirtytalk/engine/getting-started) — build a channel and watch these mechanics in action.
- [API Reference](/dirtytalk/engine/api-reference) — exact signatures, parameters, and behavior notes for every export.
- [Structural: concepts](/dirtytalk/structural/concepts) — a real `Space` over interned path-ID sets.
- [Spatial: concepts](/dirtytalk/spatial/concepts) — a real `Space` over damage rectangles, with a frame-aligned scheduler.
