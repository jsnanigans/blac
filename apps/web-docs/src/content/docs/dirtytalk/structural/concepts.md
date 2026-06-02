---
title: Concepts
description: The model behind @dirtytalk/structural — the quadratic diffing problem, interned path IDs, the observed skeleton, the proxy recorder, and the React adapter.
---

This page explains the model behind `@dirtytalk/structural`: the diffing-cost problem it solves, how paths become interned IDs, what the _skeleton_ is, how the proxy recorder works, and how the React adapter ties it all together. Read it after [Getting Started](/dirtytalk/structural/getting-started) when you want to understand _why_ the package is shaped the way it is.

## The problem: per-consumer diffing is quadratic

State containers and UI renderers both ask the same question after a mutation: _what changed, who cares, and when do we tell them?_ For structural state — objects and arrays whose consumers track named paths — the honest answer is a set of changed paths matched against each consumer's set of observed paths.

The naive way to compute this is **per-consumer diffing**: for each of `N` consumers, walk the previous and next state comparing the paths that consumer observes. When many consumers share one container and observe overlapping shapes, this is roughly `N` consumers × `N` redundant tree walks, doing the same equality checks over and over. The cost grows quadratically with consumer count exactly when you least want it to — a busy container with many subscribers.

The fix this package implements is **one walk plus N intersections**:

1. Maintain a single _skeleton_ — the union of every live consumer's observed paths.
2. On a mutation, do **one** diff walk bounded to that skeleton, producing a set of changed path IDs (the _dirty_ set).
3. Decide who to wake with `N` cheap **set intersections**: a consumer wakes iff its observed path set intersects the dirty set.

The expensive part (the tree walk) happens once per mutation instead of once per consumer. The per-consumer part collapses to set-membership checks. The saving is proportional to `N` when consumers share a container. This is the lineage of BlaC's per-consumer path tracking, extracted and built on top of [`@dirtytalk/engine`](/dirtytalk/engine/concepts)'s `DirtyChannel`, `Space`, and `Scheduler`.

## Paths as interned IDs: `PathInterner`

Comparing and unioning dotted path strings (`"user.name"`) over and over would be wasteful. So every path is **interned** into a small integer `PathId` once, and all set operations work on those integers.

`PathInterner` is a bidirectional string ↔ ID table. `intern(path)` returns a stable ID, assigning the next sequential integer (starting from `0`) the first time it sees a string and returning the same ID forever after. `lookup(id)` is the reverse. Same string, same ID — always.

```ts
import { PathInterner } from '@dirtytalk/structural';

const interner = new PathInterner();
interner.intern('user.name'); // 0
interner.intern('user.email'); // 1
interner.intern('user.name'); // 0 again — idempotent
interner.lookup(0); // 'user.name'
interner.size; // 2
```

### One interner per container class

IDs are only comparable within a single interner's namespace — `0` means `"user.name"` in one interner and could mean anything in another. So `StructuralContainer` keeps **one interner per subclass**, keyed by constructor in a `WeakMap` (`StructuralContainer.getInternerFor`). Every instance of the same subclass shares it, so their path IDs line up and can be unioned and intersected freely. Distinct subclasses get distinct interners even if their state shapes are identical — IDs never bleed across classes. The `WeakMap` lets a constructor (and its interner) be garbage-collected once all instances are gone.

## Path sets and the `ALL_PATHS` sentinel

A `PathSet` is the unit of "interest" and "dirtiness." It is either a concrete `Set<PathId>` or the special `ALL_PATHS` sentinel.

`ALL_PATHS` is a registered symbol (`Symbol.for('@dirtytalk/structural/ALL_PATHS')`), so its identity is stable even across module realms that share the symbol registry. It means "every possible path." Its key property is intersection behaviour: an `ALL_PATHS` interest intersects any non-empty dirty set, and any non-empty interest intersects an `ALL_PATHS` dirty set. (An _empty_ interest never wakes, even against `ALL_PATHS` — empty means "I care about nothing.")

`ALL_PATHS` shows up in two places:

- **Source-side signalling.** When the container can't or won't compute a precise dirty set, it marks `ALL_PATHS` to wake everyone (see the single-consumer skip below).
- **Opt-in blanket interest.** A devtools panel or plugin can `subscribe(() => ALL_PATHS, …)` to hear about every change.

The set algebra lives in a handful of pure functions:

| Function              | Meaning                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `emptyPathSet()`      | A fresh empty `Set<PathId>` (never `ALL_PATHS`).                                                                |
| `pathSetUnion(a, b)`  | Pure union; `ALL_PATHS` if either side is `ALL_PATHS`. Does not mutate inputs.                                  |
| `pathSetEquals(a, b)` | Value equality; both `ALL_PATHS`, or two Sets with the same members.                                            |
| `PathSetSpace`        | The `Space<PathSet>` the engine's `DirtyChannel` consumes (provides `empty`, `isEmpty`, `union`, `intersects`). |

These satisfy the engine's [`Space` contract](/dirtytalk/engine/concepts): `union(empty(), r)` equals `r` by value, `intersects(empty(), _)` is `false`, and every operation is pure.

### The single-consumer skip

The skeleton-based diff only pays off when there are multiple consumers to share the walk across. With **0 or 1** registered consumers, `emit` and `update` skip the diff entirely and just mark `ALL_PATHS` — the sole consumer (if any) wakes regardless of whether the change touched a path it observes. Cheaper than building a dirty set when there is nobody to discriminate between. Fine-grained isolation begins at two or more registered consumers.

Note that `patch` does **not** take this shortcut: it always value-diffs the patch shape (more on this below), independent of consumer count.

## The observed skeleton

The **skeleton** is the union of all currently registered consumers' path sets. It is the bound on the diff walk: `emit`/`update` only check whether the paths _somebody_ observes have changed, ignoring fields no live consumer reads.

It is maintained through the consumer registry:

- `registerConsumerPaths(id, paths)` records (or replaces) one consumer's observed set, then recomputes the skeleton as the union of all registered sets. There is a fast-path skip: if the new set is `pathSetEquals` to the previously stored one, nothing is recomputed.
- `unregisterConsumer(id)` drops a consumer and recomputes the skeleton if it was present.

Recompute is `O(consumers × paths)` — a full re-union on every registry change (incremental update is a future optimisation). The skeleton is consulted **only** by `emit`/`update`. `patch` ignores it (it value-diffs the patch directly), and raw `subscribe` callers never touch the registry — so a path observed only by a raw subscriber is invisible to `emit`'s skeleton diff, though `patch` will still wake it via value-filtered marking.

## `trackRender`: the Proxy recorder

How does a consumer declare which paths it observes without writing a selector? It just _reads_ the state, and a recording proxy notes what was read.

`trackRender(state, interner)` wraps `state` in a `Proxy` and returns `{ value, paths }`. `value` is the proxy; `paths` is a **live** `Set<PathId>` that grows as you read properties off `value`. It is empty until you read, and it is mutated _after_ `trackRender` returns. `paths` is always a concrete `Set` — never `ALL_PATHS`.

The recording rules are deliberate, and they are what make sibling isolation work:

- **Leaf-only (maximal) recording.** Reading `a.b.c` records only `a.b.c`. As each deeper read descends, the immediate parent path is dropped from the set. So a consumer reading `user.name` records exactly `user.name` — not `user`. When an immutable update replaces the whole `user` object because a _sibling_ (`user.address`) changed, the consumer of `user.name` does **not** wake: its recorded leaf still resolves to the same value. A consumer that reads the whole `user` object (no deeper key) keeps `user` as its leaf and wakes on any change to it.
- **Own, non-symbol reads only.** Symbol keys (`Symbol.iterator`, `Symbol.toStringTag`) and inherited/prototype properties never record. Re-reading a path does not re-record (idempotent via the Set). Conditional reads record only the branch actually taken.
- **Primitives pass through.** Reading a field whose value is a primitive, `null`, or `undefined` returns it as-is — but reading the key still records that field's path.
- **Nested plain objects and arrays return child proxies** recording into the same `paths` set, cached per target in a per-call `WeakMap` so `value.user === value.user` within one render. The cache dies with the call frame, so each `trackRender` call records independently.
- **Iteration coarsens.** `for..of`, `.map`, `.find`, `.reduce` and friends on an array record the **entry path** (e.g. `items`) but **not** per-index paths (`items.0`) or `items.length`. Array prototype methods are bound to the raw target so their internal index reads bypass the proxy, and callbacks receive raw (un-proxied) values. Direct index access _does_ record the leaf — `value.items[2].name` records `items.2.name`.
- **Leaf collection types are not recursed.** `Map`, `Set`, `Date`, and class instances are returned raw (wrapping them would rebind receiver-checked built-ins like `Map.prototype.get` and throw). Reading the field records the field's path only; a reference change to the whole value still wakes the consumer. The wrappable predicate is: arrays, or objects whose prototype is `Object.prototype` or `null`.
- **Own methods on non-array objects are bound to the proxy** so their internal `this.x` reads keep recording when invoked. Reading a method without calling it does not record (methods live on the prototype).

This is why the React hook needs no selector: the JSX _is_ the dependency declaration.

## The diff helpers and when each applies

Two questions, two helpers. "Did the paths somebody observes change?" is answered by walking the skeleton. "Which paths did this patch actually change?" is answered by walking the patch. `getAt` is the shared path-read primitive.

| Helper                                                          | Walks           | Used by                             | Question it answers                                           |
| --------------------------------------------------------------- | --------------- | ----------------------------------- | ------------------------------------------------------------- |
| `getAt(state, path)`                                            | one dotted path | the others, internally              | What value lives at this path? (never throws)                 |
| `diffAlongSkeleton(prev, next, skeleton, interner, equalsAt?)`  | the skeleton    | `emit` / `update`                   | Which observed paths changed value between `prev` and `next`? |
| `pathsFromPatch(patch, interner)`                               | the patch shape | exported, not used by the container | Which paths does this patch _touch_ (regardless of value)?    |
| `changedPathsFromPatch(prev, next, patch, interner, equalsAt?)` | the patch shape | `patch`                             | Which patched paths actually changed value?                   |

- **`diffAlongSkeleton`** reads each skeleton path in both states and includes it iff the values differ under `equalsAt` (default `Object.is`). It short-circuits: `ALL_PATHS` skeleton returns `ALL_PATHS`, empty skeleton returns empty. It is pure. Because the default is reference equality, an intermediate path like `user` _is_ flagged if the outer object got a new reference even when its leaves are unchanged — which is correct for a consumer that observes `user` as a leaf.
- **`pathsFromPatch`** flattens a patch tree to interned paths with **tree-pulses-up** semantics: each plain-object branch contributes its own path _and_ recurses, so `{ user: { email: 'x' } }` yields both `"user"` and `"user.email"`. Arrays, primitives, class instances, `Date`, `Map`, `Set` are leaves (recorded then stopped). It does not compare values — it is shape-based. The container does not use it for marking, but it is exported for callers who want shape-based marking.
- **`changedPathsFromPatch`** is `pathsFromPatch` with a value filter: it pulses up the same branches but compares `prev[key]` vs `next[key]` at each step and skips paths whose value did not change. Crucially it **prunes recursion** into unchanged branches — relying on the invariant that an unchanged subtree keeps its reference. This makes patch marking precise and skeleton-independent, so a raw channel subscriber wakes correctly while an over-spread patch (spreading a whole parent when one field changed) does not over-wake siblings.

For example, an over-spread patch `{ user: { name: 'Grace', email: 'a@x.io' } }` where only `name` actually changed marks `['user', 'user.name']` — not `user.email`.

## `emit` vs `patch` vs `update`, and the immutable-replacement requirement

All three mutators install a **new** immutable value and then mark the channel. None of them mutate state in place, and there is no primitive that does.

- **`emit(next)`** replaces the whole state with `next`. It short-circuits to a no-op if `Object.is(state, next)`. Otherwise it sets the new state, then computes the dirty set: `ALL_PATHS` under the single-consumer skip, else `diffAlongSkeleton` against the observed skeleton. Then it marks the channel.
- **`patch(partial)`** deep-merges a `DeepPartial<S>` into the current state. An empty patch is a no-op. The merge walks plain-object branches only; arrays, class instances, `Date`, `Map`, `Set`, and primitives replace their slot atomically. If the merge produces no actual change it returns the original reference and the whole call is a no-op. State is applied **before** marking (so consumers reading `state` inside the dirty callback see the new value), and marking uses `changedPathsFromPatch` — value-filtered and skeleton-independent.
- **`update(fn)`** is sugar for `this.emit(fn(this.state))`. Same semantics as `emit`, including the single-consumer skip and the reference-equal no-op.

:::caution[In-place mutation is invisible]
Because change detection relies on reference comparison (`Object.is`) and on unchanged subtrees keeping their references, **mutating `state` in place is silently invisible** to tracking. `container.state.items.push(x)` will not wake anyone. Always replace immutably: `patch({ ... })`, or `update(s => ({ ...s, items: [...s.items, x] }))`.
:::

## The React adapter

`useStructural(container)` connects a component to a container with per-render path tracking. The mechanics:

- It derives a stable consumer id from React's `useId()`, and forces re-renders with `useReducer((x) => x + 1, 0)` — there is no virtual DOM here; React's own reconciliation handles the update.
- On each render it calls `trackRender(container.state, container.interner)` and stashes the live `paths` set in a ref. It deliberately does **not** call `registerConsumerPaths` in the render body: the proxy has not been read yet, so `paths` is empty — registering it then would freeze an empty skeleton and silently drop wakeups.
- A `useLayoutEffect` with no deps runs after every render and registers the now-populated path set. Conditional reads therefore reshape the skeleton automatically, render to render — no selector to keep in sync.
- A `useEffect` keyed on `[container, consumerId]` re-registers the paths (covering StrictMode cleanup cycles where the render body did not re-run) and subscribes `() => pathRef.current` to the channel, forcing a re-render when the interest intersects the dirty set. Cleanup unsubscribes and unregisters the consumer.

The result is StrictMode-safe: double-invocation leaves a clean registry, unmount returns `consumerCount` to zero, and two components on one container get distinct consumer ids. Raw `subscribe` plugins coexist with hook consumers. The `options` argument is reserved (`select?: never`) and currently inert — path recording replaces selectors, so there is no selector API to configure.

## Lineage to BlaC

This package is the per-consumer path tracking from BlaC, extracted and rebuilt as a standalone, engine-backed container. If you know BlaC's [tracked state](/core/tracked) and [`useBloc` dependency tracking](/react/dependency-tracking), the model maps cleanly: read the fields you need during render, re-render only when those fields change. For the BlaC mental model in full, see [BlaC: Mental Model](/guide/mental-model). `@dirtytalk/structural` is the focused, framework-light distillation of that idea on top of `@dirtytalk/engine`.

## What it is not

- **Not a computed/derived-value system.** There is no dependency graph and no auto-tracked computeds. Build derived values in a layer above the container.
- **Not an effect system.** The unsubscribe function returned by `subscribe` is the only cleanup primitive.
- **Not a mutable store.** No in-place mutation primitive exists; all updates are immutable replacements via `emit`/`patch`/`update`.
- **Not a virtual DOM.** The React adapter forces a re-render via `useReducer`; reconciliation is React's job.
- **Not glob/pattern equality.** The `equality` option keys are exact dotted-path strings only — pattern matching is a follow-up.
- **Not a scheduler provider.** Schedulers live in `@dirtytalk/engine`; this package forces none and injects whatever you give it.

## See also

- [Structural: Getting Started](/dirtytalk/structural/getting-started) — install and build your first container.
- [Structural: API Reference](/dirtytalk/structural/api-reference) — exhaustive signatures for every export.
- [Engine: Concepts](/dirtytalk/engine/concepts) — the `Space` algebra, schedulers, and `DirtyChannel` this package builds on.
- [React: Dependency Tracking](/react/dependency-tracking) — the BlaC ancestor of this model.
