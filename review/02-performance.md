# 02 — Performance

Reference numbers from `perf.md` (Blac vs Zustand, median):

| Operation                | Blac   | Zustand | Ratio               |
| ------------------------ | ------ | ------- | ------------------- |
| acquire/release cycle    | 1.9 ms | 15 µs   | 123x                |
| instance create/dispose  | 1.3 ms | 20 µs   | 63x                 |
| multi-store coordination | 420 µs | 105 µs  | 4.0x                |
| cross-store propagation  | 245 µs | 70 µs   | 3.5x                |
| proxy track 1 field      | 135 µs | 40 µs   | 3.4x                |
| batch rapid updates      | 80 µs  | 35 µs   | 2.3x                |
| patch 1 of 20 fields     | 105 µs | 2.1 ms  | **Blac 20x faster** |
| redundant emit           | 15 µs  | 25 µs   | Blac wins           |

The wins are all in the engine (path-scoped patch, equality short-circuit).
The losses are all in the lifecycle and hook layers. The findings below map
directly onto the slow rows.

---

## 1. Every instance subscribes an ALL_PATHS bridge at construction

`StateContainer.ts:371`:

```ts
this._bridgeUnsub = this.channel.subscribe(
  () => ALL_PATHS,
  () => this._drainPending(),
);
```

This exists to turn channel flushes into the `stateChanged` system event. It is
installed for every instance whether or not anyone ever calls
`onSystemEvent('stateChanged')`. Effects:

- `DirtyChannel.#flush` has a fast path for `subscribers.size <= 1`
  (`dirty-channel.ts:106`). The bridge occupies that slot, so the first real
  consumer already pays the `Array.from(...)` snapshot per flush.
- `StructuralContainer.emit` cannot use the zero-consumer skip for channel
  purposes, and every flush runs the bridge callback, `_drainPending`, and its
  handler-set lookup even when there are no handlers.
- When the plugin manager exists it adds a second ALL_PATHS subscriber per
  instance (`PluginManager.attachStateBridge`). Watch adds a third.

### Fix

Subscribe lazily on the first `onSystemEvent('stateChanged', …)` and
unsubscribe when the last handler leaves:

```ts
protected onSystemEvent = (event, handler) => {
  // ...add to set...
  if (event === 'stateChanged' && this._bridgeUnsub === null) {
    this._bridgeUnsub = this.channel.subscribe(() => ALL_PATHS, () => this._drainPending());
  }
  return () => {
    handlers.delete(handler);
    if (event === 'stateChanged' && handlers.size === 0) {
      this._bridgeUnsub?.(); this._bridgeUnsub = null;
    }
  };
};
```

`_pendingChange` capture in `applyState`/`patch` can then be skipped entirely
when `_bridgeUnsub === null`.

---

## 2. Three notification pipelines per emit

For one `emit` with plugins installed and one React consumer:

1. `applyState` → `super.emit` → skeleton diff → `channel.mark` → microtask flush.
2. `applyState` → `registry.notifyStateChanged` → separate microtask →
   `registry.emit('stateChanged')`.
3. Flush → bridge → `_drainPending` → system-event handlers.
4. Flush → plugin bridge → `dispatchStateChange` → `buildContext` (allocates a
   14-method object) → plugin hooks.
5. Flush → consumer callbacks.

Two microtasks, two coalescing mechanisms, and up to three ALL_PATHS interest
evaluations per instance per flush.

### Fix

Make the channel the single pipeline. Registry `stateChanged` listeners and
plugin `onStateChange` both attach through _one_ per-container ALL_PATHS
subscription that the registry owns (attached on `created`, detached on
`disposed`), fed with `(prev, next, paths)`. Delete `notifyStateChanged`,
`_pendingStateChanges`, `flushStateChanged`. Cache one `PluginContext` per
container in a `WeakMap` instead of rebuilding per dispatch; the object only
closes over `registry` and `container`, both stable.

---

## 3. Per-instance allocation

`new Type()` + `[INIT_CONFIG]` allocates, per instance:

| Where                      | Allocation                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `StructuralContainer` ctor | `DirtyChannel`, `MicrotaskScheduler` (with its own `Set`), `_consumerPaths` Map, `_pathRefCounts` Map, `_skeletonSet` Set, `_equalsByPathId` Map, `emptyPathSet()` |
| `DirtyChannel` ctor        | `#subscribers` Map, `#boundFlush` closure, `space.empty()` Set                                                                                                     |
| `StateContainer` fields    | `_systemEventHandlers` Map, `_deps` object, `generateSimpleId` string + `Date.now()`, `_createdAt` `Date.now()`                                                    |
| `createMeta`               | two frozen objects, ~15 closures, `Object.defineProperty`                                                                                                          |
| `[INIT_CONFIG]`            | `{ ...config }`, second `generateSimpleId`, `getClassEquality` lookup, registry `created` emit → plugin bridge subscription + `buildContext`                       |
| registry                   | entry object, `refs` Map, `initialRefs` Map                                                                                                                        |

That is roughly 20 heap objects and several closures before the user's own
constructor runs, which lines up with the 63x create/dispose gap.

### Fix

- Lazily allocate every collection on first use (`??=` pattern). The
  structural maps are only needed once a path-scoped consumer registers;
  `_systemEventHandlers` only once a handler is added; `_equalsByPathId` only
  when `options.equality` is passed.
- Share one `MicrotaskScheduler` per registry (or module) instead of one per
  container. The scheduler already coalesces by flush-function identity, so a
  shared instance is safe and drains all containers in one microtask.
- Make `$blac` a small class with prototype getters and a single `_c` field:

  ```ts
  class Meta<S extends object> implements BlacMeta<S> {
    constructor(private readonly _c: MetaInternals<S>) {}
    get name() {
      return this._c._name;
    }
    // ...
  }
  ```

  It stays proxy-safe: `$blac` is an own data property, so the tracked proxy
  returns the real `Meta` object and its getters run with `this = meta`, never
  a Proxy. Freeze the prototype if immutability matters.

- Compute `_instanceId` once in `[INIT_CONFIG]`; the field initialiser's
  `generateSimpleId(...)` call is always overwritten.
- Drop the second `Date.now()`; reuse `_createdAt`.

---

## 4. Dispose is O(n) per instance

`_pruneEntry` (`StateContainerRegistry.ts:146-158`) scans the whole per-type
map to find the entry for a container. `clear()`/`clearAll()` therefore cost
O(n²), and each `release()` that disposes also triggers the scan via the
`disposed` listener even though `release` already knows the key.

### Fix

Store the key on the entry (`entry.key`) and keep a
`WeakMap<StateContainer, InstanceEntry>` for reverse lookup:

```ts
private readonly entryByInstance = new WeakMap<StateContainer, InstanceEntry>();
// on create: entryByInstance.set(instance, newEntry)
private _pruneEntry(container) {
  const entry = this.entryByInstance.get(container);
  if (!entry) return false;
  this.instancesByConstructor.get(entry.Type)?.delete(entry.key);
  return true;
}
```

`PluginContext.getRefIds(instanceId)` (`PluginManager.ts` `buildContext`) is
also a full scan over every type and instance; index by `$blac.id` in the same
`WeakMap`/Map.

---

## 5. `structuralKey` on the hot path

`structuralKey` (`utils/structural-key.ts`) is `JSON.stringify` with a
replacer that, for every object level, sorts keys and builds a new object.
The React hook caches the result by args reference, but:

- `makeDepWrapper.resolve` (`useBloc.ts:810-819`) calls `registry.resolveKey`
  → `structuralKey(args)` on **every** `.track()` / `.untracked()` call, which
  is every getter evaluation in every render for cross-bloc getters.
- `depend()`'s `resolve` in core does the same.
- `acquire` in dev computes it a second time for the args-mismatch warning.

### Fix

- Cache by args identity in a `WeakMap<object, string>` inside `structuralKey`
  for object args; primitives are cheap anyway.
- In `depend()`, precompute the default key once and only call
  `structuralKey` when `options.args` is supplied.
- Replace the sort-and-rebuild replacer with a hand-rolled stable serialiser
  that writes into a string directly (no intermediate objects). A 30-line
  recursive function is 3–5x faster than `JSON.stringify` + replacer for
  small objects.

---

## 6. Per-consumer hook cost

`useBloc` per mounted component: 17 `useRef`, 2 `useReducer`, 1 `useMemo`,
1 `useContext`, 1 no-op `useId`, 3 `useEffect`/`useLayoutEffect`. Per render:
`trackRender` allocates a `TrackSession` + `Set` + `WeakMap` + `Map`,
`queueMicrotask(disarm)`, `session.clear()` + `set`, and on any path change
`expandWithAncestors` does `lookup` + `lastIndexOf` + `slice` per path plus a
new `Set`.

### Fix

- One lazily-created consumer object:

  ```ts
  const c = (useRef<Consumer | null>(null).current ??= createConsumer(...));
  ```

  All per-consumer mutable state lives on `c`. This is what Zustand, Jotai and
  Valtio do; it cuts hook slots from ~25 to ~4.

- Memoise ancestor-watch ids per leaf id in `PathInterner`
  (`ancestorWatchIds(id): readonly PathId[]`), computed once per id, so
  `expandWithAncestors` becomes set unions with no string work.
- Return the same `Set` instance from `trackRender` across renders when the
  recorded paths are set-equal, so the layout effect's `pathSetEquals` check
  is a reference compare.
- Consider disarming synchronously at the end of the layout effect instead of
  `queueMicrotask`; the layout effect already runs after the synchronous
  render pass.

The `useSyncExternalStore` rewrite in [04 §1](./04-architecture.md) removes
the rebind reducer, `renderStateRef`, `prevBlocRef`, `lastSelectionRef`
seeding and the mount-gap checks outright.

---

## 7. Per-index array tracking has a size cliff

`tracker.ts` with `TRACK_ARRAY_ITERATION = true` binds array methods to the
proxy, so `items.map(i => i.title)` records `items.length`, `items.0.title`,
… `items.N.title`. For a 10k-item list:

- 10k+ path ids are interned **per class, forever** (the interner is
  append-only; it warns at 5000).
- `diffAlongSkeleton` reads 10k paths from `prev` and `next` on every emit.
- `expandWithAncestors` and `registerConsumerPaths` process 10k entries per
  commit that changes paths.
- The consumer's interest `Set` holds 10k ids and `PathSetSpace.intersects`
  iterates the smaller set per flush.

Small lists get precise re-render isolation; large lists get a linear cost per
emit that Zustand simply does not have.

### Fix

- Coarsen above a threshold: if an array has more than N elements (64 is a
  reasonable default), record only the array path and pin it, exactly as the
  `TRACK_ARRAY_ITERATION = false` branch does. Expose the threshold in
  `configureBlacReact`.
- Bound interner growth: intern numeric segments as a wildcard
  (`items.*.title`) with a side table for concrete indices, or evict paths
  not seen in the last K renders. This is the harder change but is the only
  way to make "unbounded dynamic keys" safe.

---

## 8. `patch` does the equality work twice

`StateContainer.patch` (`StateContainer.ts:499-547`) pre-scans
`Object.keys(partial)` with `Object.is` per key, then `super.patch` runs
`deepMerge`, which performs the same comparison and already returns `prev` by
reference for no-ops. The pre-scan exists only to avoid `_checkEmitRate`
counting a no-op. Move the rate check after `super.patch` behind
`Object.is(prev, next)` and delete the pre-scan.

---

## 9. Dev-only branches on the hot path

`APPLY_DEPS` runs an O(owners × keys) collision scan under
`process.env.NODE_ENV !== 'production'`. `acquire` computes a second
`structuralKey` for the mismatch warning on every acquire of an existing
entry. Both are correctly gated but bundlers that do not define `NODE_ENV`
(plain ESM, some Deno/Bun setups) ship them live. See
[03 §4](./03-bundle-and-packaging.md#4-dev--prod-conditions) for the
export-condition fix.
