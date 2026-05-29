# API Reference

The exhaustive surface of `@dirtytalk/engine`, organized by export. Every signature here is quoted from the source. For the conceptual model behind these types see [Concepts](/dirtytalk/engine/concepts); for a guided introduction see [Getting Started](/dirtytalk/engine/getting-started).

## Entry points

The package has two entry points:

| Import path | Exports |
| --- | --- |
| `@dirtytalk/engine` | `Observable`, `Signal`, `Space`, `Scheduler`, `SyncScheduler`, `ManualScheduler`, `MicrotaskScheduler`, `RAFScheduler`, `DirtyChannel` |
| `@dirtytalk/engine/primitives` | `Observable`, `Signal` |

`Observable`, `Space`, and `Scheduler` are **type-only** exports (interfaces). The rest are runtime classes.

```ts
// Everything:
import {
  Signal,
  SyncScheduler,
  ManualScheduler,
  MicrotaskScheduler,
  RAFScheduler,
  DirtyChannel,
} from '@dirtytalk/engine';
import type { Observable, Space, Scheduler } from '@dirtytalk/engine';

// Just the primitive:
import { Signal } from '@dirtytalk/engine/primitives';
import type { Observable } from '@dirtytalk/engine/primitives';
```

---

## `Observable<T>`

A read-and-subscribe interface. `Signal<T>` is the only built-in implementation; the interface exists so consumers can accept any observable value.

```ts
interface Observable<T> {
  peek(): T;
  subscribe(cb: (value: T) => void): () => void;
}
```

| Member | Signature | Description |
| --- | --- | --- |
| `peek` | `(): T` | Read the current value without subscribing. |
| `subscribe` | `(cb: (value: T) => void): () => void` | Register a callback invoked with the new value on change. Returns an unsubscribe function. |

---

## `Signal<T>`

`class Signal<T> implements Observable<T>` — a synchronous notification primitive for a single observable value. No scheduler, no coalescing.

### Constructor

```ts
constructor(initial: T, equals?: (a: T, b: T) => boolean)
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `initial` | `T` | yes | Starting value. |
| `equals` | `(a: T, b: T) => boolean` | no | Equality predicate used to short-circuit notifications. Defaults to `Object.is`. |

Because the default is `Object.is`: `NaN` is considered equal to `NaN` (so writing `NaN` over `NaN` does not notify), and `+0`/`-0` are considered distinct (so writing one over the other *does* notify).

### Members

```ts
get value(): T
set value(next: T)
peek(): T
subscribe(cb: (value: T) => void): () => void
```

| Member | Signature | Returns | Description |
| --- | --- | --- | --- |
| `value` (get) | `get value(): T` | `T` | The current value. |
| `value` (set) | `set value(next: T)` | `void` | Assign with an equality guard (see below). |
| `peek` | `peek(): T` | `T` | Read without subscribing. Identical result to the `value` getter; provided for `Observable` conformance and intent clarity. |
| `subscribe` | `subscribe(cb: (value: T) => void): () => void` | unsubscribe `() => void` | Add `cb` to the subscriber set. Returns an idempotent unsubscribe closure. |

**`set value` behavior.** If `equals(current, next)` is true, the setter returns immediately — no store, no notify. Otherwise it stores `next`, snapshots the current subscribers (`Array.from`), and invokes each with `next`. Subscribers are stored in a `Set`, so they run in registration (insertion) order. Errors thrown by callbacks are collected, not aborted on; after all subscribers run, a single error is re-thrown as-is, and multiple errors are thrown as `new AggregateError(errors, 'Signal: multiple subscriber errors')`.

**`subscribe` behavior.** Adds `cb` to the internal set and returns a closure that removes it. The closure is idempotent (guarded by a local flag) — calling it more than once is safe. Because subscribers are snapshotted before a notify, unsubscribing during a notify still lets the already-snapshotted callback run on the *current* set, but not on the next.

::: tip Re-entrant writes recurse
Setting `value` from inside a subscriber triggers a fresh, fully synchronous notify cycle — unlike `DirtyChannel`, whose re-entrant marks defer to the next flush.
:::

```ts
import { Signal } from '@dirtytalk/engine/primitives';

const count = new Signal(0);
const unsub = count.subscribe((v) => console.log('count:', v));

count.value = 1; // => "count: 1"
count.value = 1; // no notify — Object.is(1, 1) is true
count.peek(); // 1
unsub();

// custom equality:
const user = new Signal({ id: 1 }, (a, b) => a.id === b.id);
user.subscribe((u) => console.log(u));
user.value = { id: 1 }; // no notify — same id
user.value = { id: 2 }; // notifies
```

---

## `Space<Region>`

The algebra of "what changed" and "what I care about". Both are values of type `Region`. The package ships **no** concrete implementation — consuming libraries supply one.

```ts
interface Space<Region> {
  empty(): Region;
  isEmpty(r: Region): boolean;
  union(a: Region, b: Region): Region;
  intersects(interest: Region, dirty: Region): boolean;
}
```

| Member | Signature | Description |
| --- | --- | --- |
| `empty` | `(): Region` | The identity/zero region — "nothing changed". |
| `isEmpty` | `(r: Region): boolean` | True iff `r` is the empty region. Used for the no-op flush fast-path. |
| `union` | `(a: Region, b: Region): Region` | Accumulate two dirty regions. |
| `intersects` | `(interest: Region, dirty: Region): boolean` | The delivery predicate: does this subscriber's interest overlap the dirty region? |

**Contracts (required):**

- `union(empty(), r)` must equal `r`.
- `intersects(empty(), _)` must return `false`.
- All four operations must be **pure** — same inputs, same output, no side effects. `DirtyChannel` calls them many times per flush and relies on stable results.

```ts
import type { Space } from '@dirtytalk/engine';

// A bitset Space: Region = number.
const BitsetSpace: Space<number> = {
  empty: () => 0,
  isEmpty: (r) => r === 0,
  union: (a, b) => a | b,
  intersects: (i, d) => (i & d) !== 0,
};
```

---

## `Scheduler`

Controls when a flush runs. A `DirtyChannel` hands the scheduler a flush callback via `request`; the scheduler is responsible for invoking it.

```ts
interface Scheduler {
  request(flush: () => void): void;
  cancel?(): void;
}
```

| Member | Signature | Required | Description |
| --- | --- | --- | --- |
| `request` | `(flush: () => void): void` | yes | Ask for `flush` to be invoked. Must be idempotent within a scheduling window: N requests before the first flush produce one flush. (`SyncScheduler` is the deliberate exception.) Implementations store the latest `flush` passed. |
| `cancel` | `(): void` | optional | Teardown that prevents a pending flush. Implemented by `MicrotaskScheduler` and `RAFScheduler`; **not** implemented by `SyncScheduler` or `ManualScheduler`. |

---

## `SyncScheduler`

`class SyncScheduler implements Scheduler` — flushes immediately and synchronously on every `request`.

```ts
class SyncScheduler implements Scheduler {
  request(flush: () => void): void;
}
```

| Member | Signature | Description |
| --- | --- | --- |
| `request` | `(flush: () => void): void` | Calls `flush()` immediately and synchronously, before `request` returns. Every request flushes — there is no dedupe. |

No constructor arguments. No `cancel`. Intended for tests and synchronous-emit compatibility. Because each request flushes at once, every `mark` on a channel using `SyncScheduler` flushes immediately.

```ts
import { DirtyChannel, SyncScheduler } from '@dirtytalk/engine';

const ch = new DirtyChannel(BitsetSpace, new SyncScheduler());
ch.subscribe(() => 0b1, (d) => console.log('dirty =', d));
ch.mark(0b1); // => "dirty = 1" (synchronous)
```

---

## `ManualScheduler`

`class ManualScheduler implements Scheduler` — defers every flush until you call `pump()`.

```ts
class ManualScheduler implements Scheduler {
  request(flush: () => void): void;
  pump(): void;
}
```

| Member | Signature | Description |
| --- | --- | --- |
| `request` | `(flush: () => void): void` | Marks a flush pending and stores `flush` as the latest pending callback. Does **not** invoke it. |
| `pump` | `(): void` | If nothing is pending, returns immediately (no-op). Otherwise clears the pending and stored-flush state **first**, then invokes the stored callback. |

No constructor arguments. No `cancel`. Because `pump` clears state before invoking, a re-entrant `request` made during the flush is preserved for the *next* `pump` rather than cascading synchronously. Intended for tests, replay, and SSR.

```ts
import { DirtyChannel, ManualScheduler } from '@dirtytalk/engine';

const sched = new ManualScheduler();
const ch = new DirtyChannel(BitsetSpace, sched);

const calls: number[] = [];
ch.subscribe(() => 0b1, (d) => calls.push(d));

ch.mark(0b1);
ch.mark(0b1); // nothing has run yet
sched.pump(); // flush now
console.log(calls); // [1] — one coalesced flush
sched.pump(); // no-op, nothing pending
```

---

## `MicrotaskScheduler`

`class MicrotaskScheduler implements Scheduler` — coalesces requests within a tick into a single flush at the end of the microtask queue.

```ts
class MicrotaskScheduler implements Scheduler {
  request(flush: () => void): void;
  cancel(): void;
}
```

| Member | Signature | Description |
| --- | --- | --- |
| `request` | `(flush: () => void): void` | Stores `flush` as the latest. If not already pending, schedules a drain via `queueMicrotask`. All requests within a tick coalesce into one microtask; the last stored flush wins. |
| `cancel` | `(): void` | Clears pending state and the stored flush, preventing the scheduled drain from running anything. After `cancel`, a fresh `request` works normally. |

No constructor arguments. Drains at the end of the current microtask queue. The intended default for `blac`.

```ts
import { DirtyChannel, MicrotaskScheduler } from '@dirtytalk/engine';

const ch = new DirtyChannel(BitsetSpace, new MicrotaskScheduler());
ch.subscribe(() => 0b011, (dirty) => console.log('flush dirty =', dirty));

ch.mark(0b001);
ch.mark(0b010); // both coalesce into ONE flush
await Promise.resolve(); // => "flush dirty = 3"
```

---

## `RAFScheduler`

`class RAFScheduler implements Scheduler` — coalesces requests to a single flush per animation frame, with a timer fallback.

```ts
class RAFScheduler implements Scheduler {
  constructor();
  request(flush: () => void): void;
  cancel(): void;
}
```

| Member | Signature | Description |
| --- | --- | --- |
| `constructor` | `()` | Takes no arguments. Captures whether `requestAnimationFrame` is available **once**, at construction (`typeof globalThis.requestAnimationFrame === 'function'`). |
| `request` | `(flush: () => void): void` | Stores `flush` as the latest. If no drain is currently scheduled, schedules one via `requestAnimationFrame` when available, otherwise `setTimeout(fn, 16)`. Coalesces to one flush per frame/tick; last flush wins. |
| `cancel` | `(): void` | If a drain is pending, unschedules it (`cancelAnimationFrame` or `clearTimeout`), nulls the handle, and clears the stored flush. |

Intended for `insomni` (frame-aligned repaints).

::: warning rAF detection is one-time
The rAF-vs-`setTimeout` choice is fixed at construction. Polyfilling `requestAnimationFrame` *after* the instance is built will not change its behavior.
:::

```ts
import { DirtyChannel, RAFScheduler } from '@dirtytalk/engine';

const ch = new DirtyChannel(BitsetSpace, new RAFScheduler());
ch.subscribe(() => 0b1, (dirty) => repaint(dirty));
ch.mark(0b1);
ch.mark(0b1); // coalesced; one repaint next frame
```

---

## `DirtyChannel<Region>`

`class DirtyChannel<Region>` — the core engine. Accumulates `mark`s within a scheduler window, then delivers the unioned dirty region to interested subscribers in one flush.

```ts
class DirtyChannel<Region> {
  constructor(space: Space<Region>, scheduler: Scheduler);
  mark(r: Region): void;
  subscribe(interest: () => Region, cb: (dirty: Region) => void): () => void;
}
```

### Constructor

```ts
constructor(space: Space<Region>, scheduler: Scheduler)
```

| Parameter | Type | Description |
| --- | --- | --- |
| `space` | `Space<Region>` | The region algebra. |
| `scheduler` | `Scheduler` | Controls when flush runs. |

On construction the channel initializes its accumulator to `space.empty()` and allocates a single stable bound flush function once (to avoid GC churn and let identity-keying schedulers dedupe). Construction does **not** call `scheduler.request`.

### `mark`

```ts
mark(r: Region): void
```

| Parameter | Type | Description |
| --- | --- | --- |
| `r` | `Region` | The region that just changed. |

**Returns:** `void`.

**Behavior.** Always folds `r` into the accumulator via `space.union(accumulated, r)` — once per mark, regardless of flushing state. It then requests a flush **only if** the channel is neither currently flushing nor already scheduled. A mark made during a flush accumulates into the next flush's payload; the tail of the current flush schedules that follow-up. This guard is what coalesces N marks into a single flush.

### `subscribe`

```ts
subscribe(interest: () => Region, cb: (dirty: Region) => void): () => void
```

| Parameter | Type | Description |
| --- | --- | --- |
| `interest` | `() => Region` | A thunk returning the region this subscriber cares about. Re-evaluated lazily, once per flush per subscriber — not snapshotted at subscribe time. Skipped entirely on empty-dirty flushes. |
| `cb` | `(dirty: Region) => void` | Invoked with the accumulated dirty region when `space.intersects(interest(), dirty)` is true. |

**Returns:** an unsubscribe function `() => void`.

**Behavior.** Assigns a monotonic id, stores a live entry in a registration-ordered map, and returns an idempotent unsubscribe closure that marks the entry dead and removes it. The unsubscribe is safe to call at any time, including from inside a callback mid-flush.

**Flush semantics** (the ordered behavior of an internal flush):

1. Snapshot `dirty = accumulated`, reset the accumulator to `empty()`, clear the scheduled flag — all before any callback runs.
2. If `space.isEmpty(dirty)`, return immediately. The subscriber loop is skipped and interest thunks are **not** evaluated.
3. Enter flushing mode.
4. Snapshot the subscriber list. Subscribers added during this flush will not run this cycle.
5. Iterate the snapshot in registration order. Skip dead entries (checked on the entry's `alive` flag); evaluate the interest thunk in a try/catch (a throw is recorded and the subscriber is skipped); skip if `intersects` is false; otherwise invoke the callback in a try/catch (a throw is recorded and iteration continues).
6. Exit flushing mode.
7. If a re-entrant mark left the accumulator non-empty, schedule the next flush.
8. Surface errors: 0 → nothing; exactly 1 → re-throw as-is; more than 1 → `throw new AggregateError(errors, 'DirtyChannel: subscriber errors during flush')`. Interest-thunk errors and callback errors both count toward the aggregate.

```ts
import { DirtyChannel, SyncScheduler } from '@dirtytalk/engine';
import type { Space } from '@dirtytalk/engine';

const StringSetSpace: Space<Set<string>> = {
  empty: () => new Set(),
  isEmpty: (r) => r.size === 0,
  union: (a, b) => new Set([...a, ...b]),
  intersects: (interest, dirty) => {
    for (const k of interest) if (dirty.has(k)) return true;
    return false;
  },
};

const channel = new DirtyChannel(StringSetSpace, new SyncScheduler());

const unsub = channel.subscribe(
  () => new Set(['users', 'session']), // interest thunk, re-run each flush
  (dirty) => console.log('dirty keys:', [...dirty]),
);

channel.mark(new Set(['users'])); // => "dirty keys: [ 'users' ]"
channel.mark(new Set(['theme'])); // => no output: doesn't intersect interest
unsub();
```

---

## See also

- [Concepts](/dirtytalk/engine/concepts) — the Space algebra, scheduler comparison, and full flush lifecycle.
- [Getting Started](/dirtytalk/engine/getting-started) — install and build your first channel.
- [Structural: api reference](/dirtytalk/structural/api-reference) — a higher-level package built on this engine.
- [Spatial: api reference](/dirtytalk/spatial/api-reference) — the engine applied to 2D scene damage.
