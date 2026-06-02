---
title: API Reference
description: The complete export-by-export reference for @dirtytalk/structural — PathInterner, the PathSet algebra, trackRender, the diff helpers, StructuralContainer, and useStructural.
---

The complete, export-by-export reference for `@dirtytalk/structural`. The package has two entry points: the main module `@dirtytalk/structural` (core, no React) and the React adapter `@dirtytalk/structural/react`. For the concepts behind these APIs, read [Concepts](/dirtytalk/structural/concepts); for a guided tour, [Getting Started](/dirtytalk/structural/getting-started).

## Module map

| Subpath                       | Exports                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@dirtytalk/structural`       | `PathId`, `ConsumerId` (types); `PathInterner`; `ALL_PATHS`, `emptyPathSet`, `pathSetUnion`, `pathSetEquals`, `PathSetSpace`, `PathSet`, `AllPaths`; `trackRender`, `TrackResult`; `diffAlongSkeleton`, `pathsFromPatch`, `changedPathsFromPatch`, `getAt`; `StructuralContainer`, `StructuralContainerOptions`, `DeepPartial` |
| `@dirtytalk/structural/react` | `useStructural` (the `UseStructuralOptions` and `UseStructuralResult` interfaces are declared alongside the hook and describe its parameter and return shapes)                                                                                                                                                                 |

:::caution[Schedulers are not re-exported]
`SyncScheduler`, `ManualScheduler`, `MicrotaskScheduler`, and `RAFScheduler` are **not** exported from `@dirtytalk/structural`. Import them from [`@dirtytalk/engine`](/dirtytalk/engine/api-reference). The container takes a scheduler via `StructuralContainerOptions.scheduler`, not as a positional argument.
:::

## Type aliases

```ts
/** An interned identifier for a path through state. Stable per Container class. */
export type PathId = number;

/** Opaque consumer identifier. */
export type ConsumerId = string | symbol;
```

`PathId` is the integer a `PathInterner` assigns to a dotted path string. `ConsumerId` identifies a registered consumer in a container's registry (the React hook uses the string from `useId()`).

## `PathInterner`

A bidirectional string ↔ `PathId` table. IDs are assigned monotonically from `0` in insertion order. One interner is shared per container _class_, but the class is standalone and directly instantiable.

```ts
export class PathInterner {
  intern(path: string): PathId;
  lookup(id: PathId): string;
  get size(): number;
}
```

### `intern(path)`

|           |                                |
| --------- | ------------------------------ |
| Signature | `intern(path: string): PathId` |
| Returns   | The `PathId` for `path`        |

Idempotent. Returns the existing ID if `path` was already interned; otherwise assigns the next sequential ID (`0, 1, 2, …`) and returns it. The same string always maps to the same ID.

### `lookup(id)`

|           |                                                              |
| --------- | ------------------------------------------------------------ |
| Signature | `lookup(id: PathId): string`                                 |
| Returns   | The dotted path string for `id`                              |
| Throws    | `RangeError` if `id < 0`, is not an integer, or `id >= size` |

Reverse lookup. The error message is `PathInterner.lookup: unknown PathId ${id} (size=${size})`.

### `get size()`

|           |                                |
| --------- | ------------------------------ |
| Signature | `get size(): number`           |
| Returns   | Count of unique interned paths |

Re-interning an already-seen string does not increase `size`.

```ts
import { PathInterner } from '@dirtytalk/structural';

const interner = new PathInterner();
const a = interner.intern('user.name'); // 0
const b = interner.intern('user.email'); // 1
interner.intern('user.name'); // 0 (idempotent)
interner.lookup(a); // 'user.name'
interner.size; // 2
interner.lookup(99); // throws RangeError
```

Independent instances have independent namespaces — both start at ID `0` for the same string.

## PathSet algebra

### `ALL_PATHS` and types

```ts
export const ALL_PATHS: unique symbol; // Symbol.for('@dirtytalk/structural/ALL_PATHS')
export type AllPaths = typeof ALL_PATHS;
export type PathSet = Set<PathId> | AllPaths;
```

`ALL_PATHS` is a registered sentinel symbol meaning "every possible path." Because it is created with `Symbol.for`, its identity is stable across module realms sharing the registry. A `PathSet` is either a concrete `Set<PathId>` or `ALL_PATHS`.

### `emptyPathSet()`

|           |                                                 |
| --------- | ----------------------------------------------- |
| Signature | `emptyPathSet(): PathSet`                       |
| Returns   | A fresh empty `Set<PathId>` (never `ALL_PATHS`) |

Allocates a new empty set on every call.

### `pathSetUnion(a, b)`

|           |                                                      |
| --------- | ---------------------------------------------------- |
| Signature | `pathSetUnion(a: PathSet, b: PathSet): PathSet`      |
| Returns   | The union; `ALL_PATHS` if either side is `ALL_PATHS` |

Pure. When both are Sets, allocates a new `Set` copy of `a` and adds all of `b`. Never mutates its inputs. `pathSetUnion(emptyPathSet(), r)` is a fresh set equal by value to `r` (not the same reference).

### `pathSetEquals(a, b)`

|           |                                                                               |
| --------- | ----------------------------------------------------------------------------- |
| Signature | `pathSetEquals(a: PathSet, b: PathSet): boolean`                              |
| Returns   | `true` iff both are `ALL_PATHS`, or both Sets of equal size with the same IDs |

Order-independent. `ALL_PATHS` is never equal to any Set, including an empty one.

### `PathSetSpace`

```ts
export const PathSetSpace: Space<PathSet>;
```

The `Space<PathSet>` implementation consumed by the engine's `DirtyChannel`. Its members:

| Member                        | Behaviour                                                              |
| ----------------------------- | ---------------------------------------------------------------------- |
| `empty()`                     | `emptyPathSet()`                                                       |
| `isEmpty(r)`                  | `r !== ALL_PATHS && r.size === 0` (so `isEmpty(ALL_PATHS)` is `false`) |
| `union(a, b)`                 | `pathSetUnion(a, b)`                                                   |
| `intersects(interest, dirty)` | See below                                                              |

`intersects` semantics (load-bearing for wake-up decisions):

| `interest`  | `dirty`     | Result                                                                                        |
| ----------- | ----------- | --------------------------------------------------------------------------------------------- |
| `ALL_PATHS` | `ALL_PATHS` | `true`                                                                                        |
| `ALL_PATHS` | Set         | `true` iff `dirty` is non-empty                                                               |
| Set         | `ALL_PATHS` | `true` iff `interest` is non-empty                                                            |
| Set         | Set         | iterates the smaller set, looks up in the larger; `true` on the first shared ID, else `false` |

A consequence: `intersects(emptyPathSet(), ALL_PATHS)` is `false` — an empty interest never wakes.

```ts
import {
  ALL_PATHS,
  emptyPathSet,
  pathSetUnion,
  pathSetEquals,
  PathSetSpace,
} from '@dirtytalk/structural';

const a = new Set([0, 1]);
const b = new Set([1, 2]);
pathSetUnion(a, b); // Set { 0, 1, 2 } (new set; a and b untouched)
pathSetEquals(a, new Set([1, 0])); // true
PathSetSpace.intersects(a, b); // true (share 1)
PathSetSpace.intersects(emptyPathSet(), ALL_PATHS); // false
```

## `trackRender`

```ts
export interface TrackResult<S> {
  value: S; // the recording Proxy (or raw value for non-objects)
  paths: PathSet; // ALWAYS a Set<PathId>, NEVER ALL_PATHS
}

export const trackRender: <S>(
  state: S,
  interner: PathInterner,
) => TrackResult<S>;
```

| Param      | Type           | Meaning                                   |
| ---------- | -------------- | ----------------------------------------- |
| `state`    | `S`            | The state to wrap and record reads on     |
| `interner` | `PathInterner` | Interner used to assign IDs to read paths |

Returns `{ value, paths }`. `value` is a recording `Proxy` (or the raw value if `state` is not a wrappable object). `paths` is a **live** `Set<PathId>` that is empty on return and **grows as you read properties off `value`** — it is mutated after `trackRender` returns. `paths` is never `ALL_PATHS`.

Recording rules (exact):

- **Non-object short-circuit.** If `state` is a primitive, `null`, or `undefined`, returns `{ value: state, paths: <empty Set> }` with no proxy.
- **Own, non-symbol reads only.** Symbol keys and inherited/prototype properties never record. Re-reads do not re-record. Conditional reads record only the taken branch.
- **Leaf-only recording.** Reading `a.b.c` records `a.b.c` and drops the immediate parent (`a.b`) as it descends, yielding sibling-leaf isolation.
- **Primitives, `null`, `undefined` returned as-is** — but reading the key still records that field's path.
- **Nested plain objects/arrays** return child proxies recording into the same `paths` set, cached per target in a per-call `WeakMap` (so `value.user === value.user` within one render; independent across calls).
- **Iteration coarsens.** Array methods (`for..of`, `.map`, `.find`, `.reduce`, …) record the entry path only, not per-index paths or `.length`; their callbacks receive raw values. Direct index access records the leaf (`value.items[2].name` → `items.2.name`).
- **Leaf collection types** (`Map`, `Set`, `Date`, class instances) are not recursed; the field's path is recorded and the raw value returned. Wrappable = arrays, or objects whose prototype is `Object.prototype` or `null`.
- **Own methods on non-array objects are bound to the proxy** so internal `this.x` reads keep recording when invoked. Reading a method without invoking does not record.

```ts
import { PathInterner, trackRender } from '@dirtytalk/structural';

const interner = new PathInterner();
const { value, paths } = trackRender(
  { user: { name: 'a' }, items: [1, 2, 3] },
  interner,
);

void value.user.name; // records "user.name" (drops "user")
value.items.reduce((s, n) => s + n, 0); // records "items" only — not items.0/.length
// `paths` is now a Set<PathId> containing the IDs for "user.name" and "items".
```

## Diff helpers

```ts
export const getAt: (state: unknown, path: string) => unknown;

export const diffAlongSkeleton: <S>(
  prev: S,
  next: S,
  skeleton: PathSet,
  interner: PathInterner,
  equalsAt?: (pathId: PathId, prev: unknown, next: unknown) => boolean,
) => PathSet;

export const pathsFromPatch: <S>(
  patch: Partial<S>,
  interner: PathInterner,
  basePath?: string, // default '', internal recursion seed; callers omit
) => PathSet;

export const changedPathsFromPatch: <S>(
  prev: S,
  next: S,
  patch: Partial<S>,
  interner: PathInterner,
  equalsAt?: (pathId: PathId, prev: unknown, next: unknown) => boolean,
) => PathSet;
```

### `getAt(state, path)`

Reads the value at a dot-separated `path` (`""`, `"a"`, `"user.email"`, `"items.5.name"` — numeric segments index arrays via bracket access). An empty path returns `state` itself. Returns `undefined` for any missing, `null`, or primitive intermediate — **never throws**. Only own-property bracket access; no extra prototype walking.

### `diffAlongSkeleton(prev, next, skeleton, interner, equalsAt?)`

Walks each `PathId` in `skeleton`, reads the value at its path in `prev` and `next` via `getAt`, and includes the ID iff the values are not equal under `equalsAt` (default `Object.is`).

- `skeleton === ALL_PATHS` short-circuits to `ALL_PATHS`.
- An empty skeleton short-circuits to a fresh empty set, regardless of states.
- Pure — does not mutate `prev`, `next`, or `skeleton`.
- With the default `Object.is`: `NaN` compares equal; shared sub-tree references compare equal (no entry). An intermediate path (e.g. `user`) _is_ flagged if the outer object got a new reference, even when its leaves are unchanged.
- `equalsAt` is invoked as `(pathId, prevValue, nextValue)` — the per-path custom-equality seam.

```ts
import { PathInterner, diffAlongSkeleton } from '@dirtytalk/structural';

const interner = new PathInterner();
const skeleton = new Set([
  interner.intern('user.name'),
  interner.intern('user.email'),
]);

const prev = { user: { name: 'Ada', email: 'a@x.io' } };
const next = { user: { name: 'Grace', email: 'a@x.io' } };

const dirty = diffAlongSkeleton(prev, next, skeleton, interner) as Set<number>;
dirty.has(interner.intern('user.name')); // true
dirty.has(interner.intern('user.email')); // false
```

### `pathsFromPatch(patch, interner, basePath?)`

Flattens a patch tree into a `PathSet` of interned dotted paths with **tree-pulses-up** semantics: each plain-object branch contributes its own path _and_ recurses. `{ user: { email: 'x' } }` records both `"user"` and `"user.email"`. Leaves — arrays, primitives, `null`, `undefined`, class instances, `Date`, `Map`, `Set` — record their path and stop (arrays are atomic). An empty patch yields an empty set with nothing interned. Does not mutate input. `basePath` is an internal recursion seed; callers omit it.

:::note[Shape-based, not value-based]
`pathsFromPatch` is exported, but the container marks with `changedPathsFromPatch` instead. Use `pathsFromPatch` only when you want shape-based marking without value comparison.
:::

### `changedPathsFromPatch(prev, next, patch, interner, equalsAt?)`

Like `pathsFromPatch` but **value-filtered**: a path is included only when its value actually changed. It walks the same plain-object branches and pulses up, but compares `prev[key]` vs `next[key]` at each step (threading the parallel subtrees down — equivalent to `getAt` but without re-walking from the root). It **prunes recursion** into unchanged branches: a branch whose reference is `Object.is`-equal (and, by the immutable-update invariant, its entire subtree) is skipped. This makes patch-marking precise and skeleton-independent, so raw channel subscribers wake correctly while over-spread patches do not over-wake siblings. `equalsAt` is the same `(pathId, prev, next)` seam; default `Object.is`. Returns an empty set when nothing changed.

Example outcomes:

- Over-spread `{ user: { name: 'Grace', email: 'a@x.io' } }` where only `name` changed → `['user', 'user.name']`.
- Swapping a nested object → `['user', 'user.address', 'user.address.city']`.
- A custom equality treating equal-content arrays as equal → `[]`.

## `StructuralContainer<S>`

Abstract base class. Owns a piece of state `S`, a `DirtyChannel<PathSet>`, and a consumer registry. Subclass it; instances of the same subclass share one `PathInterner` (keyed by constructor).

### Options and types

```ts
export interface StructuralContainerOptions {
  /** Scheduler for the underlying DirtyChannel.
   *  Default: a fresh MicrotaskScheduler per instance. Tests/SSR should pass SyncScheduler. */
  scheduler?: Scheduler;
  /** Per-path-pattern equality override. Keys are EXACT dotted path strings
   *  (interned at construction). Glob/pattern matching is a follow-up — not supported. */
  equality?: ReadonlyMap<string, (a: unknown, b: unknown) => boolean>;
}

export type DeepPartial<T> =
  T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends Date | Map<unknown, unknown> | Set<unknown> | RegExp
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;
```

`DeepPartial<T>` recurses plain-object branches so nested patches type-check without casts; arrays become `ReadonlyArray<DeepPartial<U>>` (matching runtime: arrays are leaves, not per-index expandable); `Date | Map | Set | RegExp` pass through whole; primitives and functions are unchanged.

### Constructor

```ts
constructor(initial: S, options?: StructuralContainerOptions)
```

| Param               | Type                                     | Default                                         | Meaning                                                                                                      |
| ------------------- | ---------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `initial`           | `S`                                      | —                                               | The starting state                                                                                           |
| `options.scheduler` | `Scheduler`                              | `new MicrotaskScheduler()` (fresh per instance) | The scheduler for the underlying channel. Pass `SyncScheduler` for synchronous tests/SSR.                    |
| `options.equality`  | `ReadonlyMap<string, (a, b) => boolean>` | `undefined`                                     | Exact dotted-path → equality fn map; each key is interned at construction into an internal `Map<PathId, eq>` |

### Static

```ts
static getInternerFor(ctor: object): PathInterner
```

Returns the lazily-created `PathInterner` for a constructor, creating one on first call. Backed by a private static `WeakMap<object, PathInterner>` so constructors can be garbage-collected once all instances are gone. Same constructor → same interner; distinct constructors → distinct interners, even with identical state shapes. Path IDs never bleed across subclasses.

### Read accessors

| Accessor              | Type                    | Returns                                                |
| --------------------- | ----------------------- | ------------------------------------------------------ |
| `get state()`         | `S`                     | Current state. Immutable — do not mutate in place.     |
| `get interner()`      | `PathInterner`          | `StructuralContainer.getInternerFor(this.constructor)` |
| `get channel()`       | `DirtyChannel<PathSet>` | The underlying engine channel                          |
| `get consumerCount()` | `number`                | Number of registered consumers (registry size)         |

### Mutations

```ts
emit(next: S): void
patch(partial: DeepPartial<S>): void
update(fn: (state: S) => S): void
```

#### `emit(next)`

Replaces state with `next`.

- **Reference-equal short-circuit:** if `Object.is(state, next)`, a complete no-op (no mark, no notify).
- Sets the new state first.
- **Single-consumer skip:** if `consumerCount <= 1` (0 or 1 registered consumers), marks `ALL_PATHS` instead of diffing — the sole consumer (if any) wakes regardless of whether its interest overlaps the change.
- Otherwise (≥2 consumers): `diffAlongSkeleton(prev, next, skeleton, interner, equalsFn)` marks only observed-skeleton paths that actually changed.
- Then marks the channel.

#### `patch(partial)`

Shallow-or-deep merge of a `DeepPartial<S>`.

- **Empty patch is a no-op** (`Object.keys(partial).length === 0`).
- Computes `next` via an internal `deepMerge` that walks plain-object branches only; arrays, class instances, `Date`, `Map`, `Set`, primitives, `null`, `undefined` replace their slot atomically. It returns the **original `prev` reference when nothing actually changed** and keeps untouched subtree references stable.
- If `Object.is(prev, next)` (no-op merge), returns without marking.
- Applies the new state **before** marking, so consumers reading `state` inside the dirty callback see the new value.
- Marks via `changedPathsFromPatch` (value-filtered, skeleton-independent). `patch` ignores the skeleton and always value-diffs, regardless of consumer count.

#### `update(fn)`

Sugar for `this.emit(fn(this.state))`. Same semantics as `emit`, including the single-consumer skip and the reference-equal no-op.

:::caution[No in-place mutation]
There is no in-place mutation primitive. Mutating `state` directly bypasses change tracking silently. All updates must be immutable replacements via `emit`/`patch`/`update`.
:::

### Subscriptions and consumer registry

```ts
subscribe(interest: () => PathSet, cb: (dirty: PathSet) => void): () => void
registerConsumerPaths(id: ConsumerId, paths: PathSet): void
unregisterConsumer(id: ConsumerId): void
```

#### `subscribe(interest, cb)`

Pass-through to `channel.subscribe`. Returns an unsubscribe function. For devtools, plugins, and manual subscribers that bypass the tracker registry. These subscribers do **not** affect the skeleton or `consumerCount`. `interest` is a thunk evaluated lazily once per flush per subscriber; return `ALL_PATHS` for "wants everything."

```ts
import { ALL_PATHS } from '@dirtytalk/structural';

const unsub = container.subscribe(
  () => ALL_PATHS,
  (dirty) => console.log('changed', dirty),
);
// later:
unsub();
```

#### `registerConsumerPaths(id, paths)`

Records a consumer's observed `PathSet`, used to build the skeleton that `emit`/`update` diff against. **Fast-path skip:** if the previous paths for `id` are `pathSetEquals` to the new ones, returns without recomputing. Otherwise stores them and recomputes the skeleton (the union of all consumer paths). Re-registering an existing `id` replaces (does not add) — `consumerCount` is keyed by `id`.

#### `unregisterConsumer(id)`

Removes the consumer and recomputes the skeleton only if the `id` was present.

### Equality and the skeleton

- **Custom equality** (`options.equality`) is used by both `emit` (via `diffAlongSkeleton`) and `patch` (via `changedPathsFromPatch`). When configured, the per-path callback resolves the matched path's function, falling back to `Object.is` for unmatched paths. When no overrides exist, the helpers use plain `Object.is` (the fast path). A custom equality returning `true` suppresses the diff entry even for a real value change.
- **The skeleton** is the union of all registered consumers' `PathSet`s, recomputed (`O(consumers × paths)`) on every registry change. It is consulted only by `emit`/`update`; `patch` ignores it.

### Full example

```ts
import { StructuralContainer, ALL_PATHS } from '@dirtytalk/structural';
import { SyncScheduler } from '@dirtytalk/engine';

interface CounterState {
  count: number;
  label: string;
}

class Counter extends StructuralContainer<CounterState> {
  increment() {
    this.patch({ count: this.state.count + 1 });
  }
}

const c = new Counter(
  { count: 0, label: 'counter' },
  { scheduler: new SyncScheduler() },
);

const unsub = c.subscribe(
  () => ALL_PATHS, // plugin-style: wants everything
  (dirty) => console.log(c.state, dirty),
);

c.increment(); // SyncScheduler → fires synchronously: { count: 1, ... }
unsub();
```

## `useStructural` (`@dirtytalk/structural/react`)

```ts
export interface UseStructuralOptions {
  select?: never; // reserved; no selector option is supported
}

export interface UseStructuralResult<S, C extends StructuralContainer<S>> {
  0: S;
  1: C;
  readonly length: 2;
  [Symbol.iterator](): IterableIterator<S | C>;
}

export function useStructural<S, C extends StructuralContainer<S>>(
  container: C,
  _options?: UseStructuralOptions,
): readonly [S, C];
```

| Param       | Type                               | Meaning                                 |
| ----------- | ---------------------------------- | --------------------------------------- |
| `container` | `C extends StructuralContainer<S>` | The container instance to bind to       |
| `_options`  | `UseStructuralOptions`             | Reserved and currently inert (see note) |

Returns `[state, container]` (a readonly tuple). `state` is a recording proxy for this render: reading fields off it during render records this component's observed paths, and only those paths trigger re-renders.

Mechanics:

- Consumer id from React's `useId()`. Re-renders are forced via `useReducer((x) => x + 1, 0)` — no virtual DOM; React reconciles.
- Each render calls `trackRender(container.state, container.interner)` and stores the live `paths` set in a ref. `registerConsumerPaths` is intentionally **not** called in the render body (paths are empty until JSX reads the proxy; registering then would freeze an empty skeleton and silently drop wakeups).
- A `useLayoutEffect` (every render, no deps) registers the now-populated path ref after render — keeping the container's skeleton in sync with what was actually read. Conditional reads adapt the skeleton automatically; no selector needed.
- A `useEffect` keyed on `[container, consumerId]` re-registers paths (handling StrictMode cleanup re-runs where the render body did not re-run) and subscribes `() => pathRef.current` to force re-renders. Cleanup unsubscribes and unregisters the consumer.
- StrictMode-safe: double-invoke leaves a clean registry; unmount returns `consumerCount` to 0; two components on one container get distinct consumer ids; raw `subscribe` plugins coexist with hook consumers.

:::note[The options arg is inert]
The `_options` argument is reserved by the `select?: never` typing — there is no selector API. Path recording replaces selectors, so passing anything has no effect today.
:::

```tsx
import { useStructural } from '@dirtytalk/structural/react';

function CounterDisplay({ counter }: { counter: Counter }) {
  const [state, container] = useStructural(counter);
  // Reading state.count records "count"; a patch to "label" won't re-render this.
  return <button onClick={() => container.increment()}>{state.count}</button>;
}
```

## See also

- [Structural: Getting Started](/dirtytalk/structural/getting-started) — install and first container.
- [Structural: Concepts](/dirtytalk/structural/concepts) — path sets, the skeleton, the tracker, the diff model.
- [Engine: API Reference](/dirtytalk/engine/api-reference) — `DirtyChannel`, `Space`, and the schedulers you inject.
- [Engine: Concepts](/dirtytalk/engine/concepts) — the flush/coalescing model these mutations rely on.
