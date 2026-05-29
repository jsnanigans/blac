# Getting Started

This page gets you from an empty file to a working `DirtyChannel` you can mark and observe, then shows how swapping the scheduler changes timing. It is the hands-on introduction to `@dirtytalk/engine`; for the reasoning behind the design see [Concepts](/dirtytalk/engine/concepts), and for the exhaustive surface see the [API Reference](/dirtytalk/engine/api-reference).

## Install

::: code-group

```bash [pnpm]
pnpm add @dirtytalk/engine
```

```bash [npm]
npm install @dirtytalk/engine
```

```bash [yarn]
yarn add @dirtytalk/engine
```

:::

The package is ESM-first (`"type": "module"`), side-effect free, and has zero runtime dependencies. It ships a main entry point and one subpath, `@dirtytalk/engine/primitives`, for the standalone `Signal` and `Observable` types.

## The one idea

Every reactive system eventually answers the same three questions after a mutation: **what changed, who cares, and when do we tell them?** The engine's whole job is to answer those three questions once, cheaply, at the source. You describe "what changed" as a `Region` (a value in an algebra you supply), the channel accumulates regions from many `mark` calls into a single union, a `Scheduler` decides when to flush, and at flush time each subscriber's declared interest is intersected against the accumulated dirty region to decide whether its callback runs. That is the entire model. Everything else on this page is filling in the blanks.

## A complete walkthrough

Let's build the smallest useful channel: a `Region` that is a `Set<string>` of keys. Marking `{ "users" }` means "the users data changed"; a subscriber interested in `{ "users", "session" }` should hear about it, while one interested only in `{ "theme" }` should not.

### 1. Define a Space

The engine ships **no** concrete `Region` types — you bring your own by implementing the `Space<Region>` interface. A `Space` is four pure functions over your region type.

```ts
import type { Space } from '@dirtytalk/engine';

// Region = Set<string>: a set of string keys that changed.
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
```

Two contracts make the channel work correctly: `union(empty(), r)` must equal `r`, and `intersects(empty(), _)` must be `false`. The set implementation satisfies both for free. (More on why these matter in [Concepts](/dirtytalk/engine/concepts).)

### 2. Construct a channel

A `DirtyChannel` takes your `Space` and a `Scheduler`. We start with `SyncScheduler`, which flushes immediately on every request — the easiest thing to reason about while learning.

```ts
import { DirtyChannel, SyncScheduler } from '@dirtytalk/engine';

const channel = new DirtyChannel(StringSetSpace, new SyncScheduler());
```

Construction does nothing observable: it does not request a flush and does not touch the scheduler. The channel just holds an empty accumulator until you `mark`.

### 3. Subscribe with an interest thunk

`subscribe` takes two functions. The first is an **interest thunk** — it returns the region this subscriber cares about, and it is re-evaluated on every flush (not snapshotted now). The second is the **callback** that fires with the accumulated dirty region when the interest intersects it.

```ts
const unsub = channel.subscribe(
  () => new Set(['users', 'session']), // interest, re-run each flush
  (dirty) => {
    console.log('dirty keys:', [...dirty]);
  },
);
```

### 4. Mark and observe

Now drive the channel. With `SyncScheduler`, each `mark` flushes synchronously before `mark` returns.

```ts
channel.mark(new Set(['users']));
// => "dirty keys: [ 'users' ]"
// 'users' is in our interest, so the callback fires.

channel.mark(new Set(['theme']));
// => (no output)
// 'theme' does not intersect { 'users', 'session' }, so the callback is skipped.

unsub();
channel.mark(new Set(['users']));
// => (no output) — we unsubscribed.
```

That contrast — delivery for `users`, silence for `theme` — is the selective fan-out the engine exists to provide. The subscriber is never told about changes it did not declare interest in.

::: tip Why a thunk and not a value?
Because subscribers move. A rendered node that has scrolled, a query whose key set grew — the interest you cared about last frame may not be the one you care about now. Returning it fresh each flush keeps the subscription correct without re-subscribing. See [interest is a thunk](/dirtytalk/engine/concepts#interest-is-a-thunk).
:::

## Swapping the scheduler

The `Space` answers "what changed" and "who cares". The `Scheduler` answers "when do we tell them". Swapping it is a one-line change and the rest of your code is untouched.

### Microtask: coalesce a burst into one flush

`MicrotaskScheduler` defers the flush to the end of the current microtask queue, so many marks in the same tick collapse into a single flush with a single unioned region.

```ts
import { DirtyChannel, MicrotaskScheduler } from '@dirtytalk/engine';

const channel = new DirtyChannel(StringSetSpace, new MicrotaskScheduler());

channel.subscribe(
  () => new Set(['users']),
  (dirty) => console.log('flush dirty:', [...dirty]),
);

channel.mark(new Set(['users']));
channel.mark(new Set(['session'])); // does not intersect, but still accumulates
channel.mark(new Set(['users'])); // same window

await Promise.resolve();
// => "flush dirty: [ 'users', 'session' ]"
// ONE flush, with the union of all three marks.
```

Compare this with `SyncScheduler`, where those three marks would have produced up to three separate flushes. The subscriber logic did not change — only the timing did.

### Manual: flush exactly when you say

`ManualScheduler` never flushes on its own. You call `pump()` to drain. This is the deterministic choice for tests, replay, and server-side rendering.

```ts
import { DirtyChannel, ManualScheduler } from '@dirtytalk/engine';

const scheduler = new ManualScheduler();
const channel = new DirtyChannel(StringSetSpace, scheduler);

const seen: string[][] = [];
channel.subscribe(
  () => new Set(['users']),
  (dirty) => seen.push([...dirty]),
);

channel.mark(new Set(['users']));
channel.mark(new Set(['users']));
// Nothing has fired yet.

scheduler.pump();
console.log(seen); // [ [ 'users' ] ] — one coalesced flush

scheduler.pump();
console.log(seen); // unchanged — nothing pending, pump is a no-op
```

There is also a fourth built-in, `RAFScheduler`, which flushes once per animation frame (falling back to `setTimeout(fn, 16)` when `requestAnimationFrame` is unavailable). It is the right choice for frame-aligned repaints. All four are compared in the [scheduler table](/dirtytalk/engine/concepts#the-four-schedulers).

## The Signal primitive

Sometimes you have a single observable value that does not need the full channel ceremony — no regions, no interest, no coalescing window. For that, the engine exposes `Signal<T>`, a synchronous notification primitive, on the `/primitives` subpath.

```ts
import { Signal } from '@dirtytalk/engine/primitives';

const count = new Signal(0);

const unsub = count.subscribe((v) => console.log('count:', v));

count.value = 1; // => "count: 1"
count.value = 1; // skipped — Object.is equality short-circuits the notify
count.peek(); // 1 — read without subscribing
unsub();
```

`Signal` notifies synchronously the moment you set `value`, guarded by an equality check that defaults to `Object.is`. You can pass a custom comparator as the second constructor argument:

```ts
import { Signal } from '@dirtytalk/engine/primitives';

const user = new Signal({ id: 1, name: 'a' }, (a, b) => a.id === b.id);
user.subscribe((u) => console.log('user:', u));

user.value = { id: 1, name: 'b' }; // no notify — same id
user.value = { id: 2, name: 'b' }; // => "user: { id: 2, name: 'b' }"
```

`Signal` is intentionally not a `DirtyChannel`: it has no scheduler and no coalescing, and a re-entrant write inside a subscriber recurses synchronously rather than deferring. Pick `Signal` for "one value changed, tell everyone now"; pick `DirtyChannel` for "many things changed, tell the right people once". The difference is covered in [Concepts](/dirtytalk/engine/concepts#the-signal-observable-layer).

## When to use the engine directly

`@dirtytalk/engine` is the unopinionated core. You implement the `Space`, you wire the `Scheduler`, you produce regions from your mutations. That is the right level when you are building a notification layer for a new domain, or you want full control over the region algebra.

If you are working in an already-modeled domain, reach for a higher-level package instead:

| You want to... | Use |
| --- | --- |
| A scene graph with rect-level damage, a render pipeline, and pointer routing | [`@dirtytalk/spatial`](/dirtytalk/spatial/getting-started) |
| Path-set tracking over structured state (interned path IDs, skeletons) | [`@dirtytalk/structural`](/dirtytalk/structural/getting-started) |
| The raw region/scheduler/channel machinery, with your own `Space` | `@dirtytalk/engine` (this package) |

Both `spatial` and `structural` are built on this engine — they supply the concrete `Space` (rect unions, path-ID sets) and the ergonomics. If one of them fits your domain, start there and drop down to the engine only when you need something neither provides.

## See also

- [Concepts](/dirtytalk/engine/concepts) — the Space algebra, the four schedulers, and the DirtyChannel lifecycle in depth.
- [API Reference](/dirtytalk/engine/api-reference) — exhaustive signatures for every export.
- [DirtyTalk overview](/dirtytalk/) — the shared thesis and how the three packages relate.
- [Spatial: getting started](/dirtytalk/spatial/getting-started) — the engine applied to 2D scenes.
