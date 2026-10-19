# @dirtytalk/structural

## 0.1.4

### Patch Changes

- 55c9bd3: Faster tracking and mounting. Tracking proxies no longer register in a global `WeakMap` for `raw()`, a child proxy drops its parent path once per render instead of on every read, and own properties are read without `Reflect.get`. A getter defined on a state object itself now runs against the raw object: its path is still tracked, but the reads inside it are not recorded separately. Path subscriptions, skeleton diffs and `useBloc`'s dependency session allocate less per consumer.
- d29adc5: Reading a key the state doesn't have yet (`item.done` before it is set) now tracks that path, so the component re-renders when the key is added. Previously the read was ignored: a component that also read a sibling field never woke for the new key, and one that read nothing else woke on every change to the parent object.
- d46c53b: Don't throw when `process` is undefined (unbundled browser ESM); treat it as production.
- 7d88540: `patch` keeps the null prototype of an `Object.create(null)` branch.
- 34f744c: Faster tracking and diffing: `trackRender` uses a single handler object per
  proxy (no per-proxy closures or path strings), `emit` and array `patch` stop
  diffing a path at the first shared reference, and `patch` builds no path
  strings. `registerConsumerPaths` stores a snapshot, so a tracking set that
  keeps growing after registration no longer corrupts the skeleton for other
  consumers. `patch` now wakes `ALL_PATHS` subscribers when per-path equality
  calls every patched value equal. `useStructural` disarms its tracker at
  commit, reuses proxies across renders and expands its interest with ancestor
  watches. Exports `expandWithAncestors`, which `@blac/react` now imports
  instead of keeping its own copy.
- b15a2bc: `interner.lookup(rootId)` returns `''` instead of the internal `\0root`
  sentinel; devtools shows it as `<root>`.
- 5a0f7ad: Faster updates with many row consumers. `emit` and `patch` diff along the consumer skeleton as a path trie, skipping unchanged subtrees by reference, and the new `subscribePaths(cb)` dispatches a flush by looking up the changed paths instead of checking every subscriber. `useStructural` and `useBloc` use it. One changed item of a 1,000-row list now costs ~10 µs in structural (was ~65 µs for `emit`, ~100 µs for `patch`). Removed `PathInterner.ancestorIds`, which nothing uses any more.
- 5a361e5: Fix missed re-renders:
  
  - The root tracking proxy is no longer reused across renders, so a
    `useMemo(..., [state])` that skips its reads still tracks.
  - `Object.keys(state)`, `for..in` and `'k' in state` on the root now wake
    when a root key is added.
  - `useStructural` and `useBloc` re-render when state changed between render
    and commit.
  - `useBloc` stops dep tracking at commit, so reads in effects and handlers no
    longer add dep paths.
- Updated dependencies [b3309b2]
  - @dirtytalk/engine@0.2.2

## 0.1.3

### Patch Changes

- Rebuild against the new `@blac/core` and `@blac/react` releases.

## 0.1.2

### Patch Changes

- Trim per-call and per-instance overhead on tracked reads: consumer
  bookkeeping is deferred, tracked child path ids are cached, and tracked
  path processing is streamlined.
- Updated dependencies
  - @dirtytalk/engine@0.2.1

## 0.1.1

### Patch Changes

- 6c8f484: Nothing but a patch to pick up the protected-mutation change.

  Both packages already sit on `0.1.0`, where `^0.1.0` admits patches as
  intended — on `0.0.x` a caret carried no range at all, so dependents such as
  `@blac/core` pinned a single structural patch.

- 7fdcfb1: Make state mutation protected; `Cubit` is the public-mutation variant.

  `emit`, `patch` and `update` are now `protected` on `StructuralContainer` and
  `StateContainer`, and public on `Cubit`. Previously both classes exposed all
  three publicly, so `Cubit` was an empty subclass that made no difference and
  the choice between the two meant nothing — while the docs described the
  encapsulation the code did not enforce.

  `Cubit` is unchanged for callers: it re-declares the three as public, so every
  bloc that extends `Cubit` and every external `bloc.emit(...)` keeps working.

  **Migration.** A class that extends `StateContainer` (or `StructuralContainer`)
  _and_ is mutated from outside must either extend `Cubit` instead, or expose its
  own method that calls the protected mutator internally — the latter is the
  pattern the docs already recommend:

  ```ts
  class Counter extends StateContainer<{ n: number }> {
    increment() {
      this.patch({ n: this.state.n + 1 }); // internal calls are unaffected
    }
  }
  ```

  Mutating a bloc from inside its own methods is unaffected, whichever base
  class it uses.

## 0.0.8

### Patch Changes

- Sync
- d4cf1fa: Fix `deepMerge` prototype pollution via a `"__proto__"` own key in a patch
  (e.g. one produced by `JSON.parse`). The merge loop now routes that one key
  through `Object.defineProperty` instead of bracket assignment, so it lands as
  a plain own property on the merged result instead of rewriting the result's
  prototype.
- 9012194: Two internal hot-path rewrites, no public shape change:
  - `PathInterner.ancestorIds` memo is now length-versioned instead of fully
    cleared on every `intern()` — a cached entry recomputes only when it is
    re-queried after the interner has grown, moving the cost from O(all
    cached entries) per intern to O(1) amortized per read. A dev-only
    warning fires once when an interner crosses 5000 paths (unbounded
    dynamic keys). Staleness guarantees are identical.
  - `deepMerge` now clones lazily: the merged object is created only on the
    first actually-changed key, and a fully no-op merge returns the target
    by reference, preserving reference identity for unchanged state.

- 0f40f5a: Fix two internal `dirtytalk-structural` issues: `ProxyCache` no longer
  accumulates one cache entry per prefix an object has ever been read at (e.g.
  an item that shifts index across renders) — `disarm()` now prunes each
  touched target down to just the prefixes read during that render. Also,
  `StructuralContainer.getConsumerPaths()` now returns a detached snapshot
  `Map` instead of the live per-consumer registry, so callers can no longer
  mutate live path-tracking state through the inspection API.
- Updated dependencies
- Updated dependencies [9012194]
- Updated dependencies [9012194]
- Updated dependencies [f592ebd]
  - @dirtytalk/engine@0.2.0

## 0.0.7

### Patch Changes

- Fix tracker aliasing/frozen-object/enumeration edge cases and ensure precise emit on off-skeleton wakes for `ALL_PATHS` subscribers. Add a `ProxyCache` for cross-render proxy reuse, a segment cache with integer ancestor lookup, a union fast-path with closureless refine and lazy prefix/equals memoization, and skip patch diffing when there are no consumers.
- Updated dependencies
  - @dirtytalk/engine@0.1.0

## 0.0.6

### Patch Changes

- Refine structural diff and path tracking: pin the array path when iterating and
  reading `.length` so array reads subscribe correctly, with related updates to
  the container, diff, path-interner, and tracker.

## 0.0.5

### Patch Changes

- Add per-index array iteration tracking and fix array identity-search so that
  iterating and reading array entries records the precise paths touched.

## 0.0.4

### Patch Changes

- Pin the array entry path during iteration. Iterating an array and reading entry properties (or `.length`) now tracks the stable array path rather than a transient per-iteration path, fixing missed subscriptions for array-derived state.
- Updated dependencies
  - @dirtytalk/engine@0.0.4

## 0.0.3

### Patch Changes

- Add dts
- Updated dependencies
  - @dirtytalk/engine@0.0.3

## 0.0.2

### Patch Changes

- replace core
- Updated dependencies
  - @dirtytalk/engine@0.0.2
