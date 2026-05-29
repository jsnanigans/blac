# Structural internals — `@dirtytalk/structural`

`Region = PathSet`. This is the engine instantiated for objects/arrays whose
consumers track named paths.

## `PathSet` + `PathSetSpace`

Source: `path-set.ts`. `PathSet = Set<PathId> | ALL_PATHS`.

- **`ALL_PATHS`** is a `Symbol.for(...)` sentinel meaning "everything". In the
  `Space` algebra it makes `intersects` true against any non-empty region
  without enumerating paths. Used for the single-consumer skip and opt-in
  blanket interest.
- `intersects` **iterates the smaller set, looks up in the larger**
  (`path-set.ts:42`) — keeps the predicate cheap regardless of which side is
  bigger.
- `pathSetEquals` powers the hook's fast-path skip (don't re-register identical
  interest).

## `PathInterner` — strings → numbers

Source: `path-interner.ts`. Dead simple: a `Map<string, PathId>` plus a
`string[]`; `PathId` is just the array index. Interning turns every path
comparison/union into integer-set ops instead of string ops.

**Per-class, not per-instance.** `StructuralContainer.getInternerFor(ctor)`
keys a `WeakMap` by constructor (`container.ts:66`), so all instances of one
container class share an interner (and IDs are stable across them), while the
`WeakMap` lets it be GC'd once the class is gone.

## `trackRender` — the recording Proxy

Source: `tracker.ts`. Wraps `state` in a Proxy and returns
`{ value, paths: Set<PathId> }`. Recording rules (subtle — read carefully):

- **Only own, non-symbol property reads record.** Symbol keys
  (`Symbol.iterator`, etc.) and inherited/prototype props don't.
- **Ancestors pulse up.** Reading `a.b.c` records `a`, `a.b`, and `a.b.c` — a
  change at *any* ancestor must wake the consumer.
- **Primitives/null/undefined** return as-is (no child proxy).
- **Per-call proxy cache** (`WeakMap`) so `value.user === value.user` within one
  render. It dies with the function frame — each render gets fresh recordings.
- **Iteration coarsens.** `for..of`, `.map`, `.find`, `.reduce` record the
  *entry* path (e.g. `users`) but **not** per-index paths; callbacks receive raw
  underlying values. This is deliberate — it bounds the path set and avoids a
  re-render storm on every array element.
- **Methods bind to the proxy** (non-array objects) so internal `this.x` reads
  keep recording. Reading a method without calling it records nothing (methods
  live on the prototype).
- The returned set is **always a real `Set`, never `ALL_PATHS`** — that sentinel
  is source-side only.

## `diff.ts` — three helpers

- **`pathsFromPatch(partial)`** — flattens a patch object into a `PathSet` from
  its *keys/shape*. **No value comparison.** Tree pulses up: `{ user: { email }}`
  records both `user` and `user.email`. Leaves (arrays, primitives, class
  instances, `Date`, `Map`, `Set`) record their path and stop — **arrays are
  atomic replacements** in patch semantics.
- **`diffAlongSkeleton(prev, next, skeleton, interner, equalsAt?)`** — walks
  *only the skeleton* (union of all live consumers' read-paths), reads each path
  in both states via `getAt`, includes the id iff values differ. Default
  equality is `Object.is` (immutable updates rely on `===` fast-skip); a
  per-path `equalsAt` hook overrides it. `ALL_PATHS` skeleton → `ALL_PATHS`;
  empty skeleton → empty.
- **`getAt(obj, "a.b.c")`** — dotted-path read, returns `undefined` for any
  missing intermediate, never throws.

## `StructuralContainer<S>` — the three mutators

Source: `container.ts`.

### `patch(partial)` — no diffing

```ts
patch(partial) {
  if (Object.keys(partial).length === 0) return;
  const paths = pathsFromPatch(partial, this.interner);  // from keys/shape
  this._state = deepMerge(this._state, partial);          // applied BEFORE mark
  this._channel.mark(paths);
}
```

Marks the paths *named by the partial* — does **not** consult the skeleton and
does **not** compare values. Patching a field to its current value still wakes
its consumers. `deepMerge` mirrors `pathsFromPatch`'s leaf/branch decision
exactly (plain objects merge; everything else replaces wholesale).

### `emit(next)` — diffs, but only sometimes

```ts
emit(next) {
  if (Object.is(this._state, next)) return;     // ref-equal short-circuit
  this._state = next;
  let dirty;
  if (this._consumerPaths.size <= 1) {
    dirty = ALL_PATHS;                            // single-consumer skip
  } else {
    dirty = diffAlongSkeleton(prev, next, this._skeleton, interner, equalsAt?);
  }
  this._channel.mark(dirty);
}
```

Three branches: ref-equal → nothing; ≤1 consumer → `ALL_PATHS` (skip diff);
≥2 consumers → diff along skeleton.

### `update(fn)` — just `emit(fn(state))`

Inherits all of `emit`'s behaviour.

### patch vs emit — the asymmetry

| | diffs values? | scope | uses skeleton? |
| --- | --- | --- | --- |
| `patch` | **no** | keys of the partial | no |
| `emit`/`update` (≥2 consumers) | **yes** | observed skeleton only | yes |
| `emit`/`update` (≤1 consumer) | no | `ALL_PATHS` | no |

The "minimal notify" guarantee is strongest exactly when many consumers exist —
which is the only time it matters.

## The skeleton

`_skeleton = union of every live consumer's read-paths`, recomputed on every
`registerConsumerPaths` / `unregisterConsumer` (`container.ts:199`,
`O(consumers × paths)` — flagged as a future incremental-update target). It
bounds the `emit` diff: only paths *someone actually reads* are ever compared.
