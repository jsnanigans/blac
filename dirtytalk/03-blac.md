# Blac Instantiation — Path-based Diffing

Blac's instantiation of the shared engine. Replaces per-consumer state diffing with **per-source path diffing**: compute "which paths changed" once at the source per emit, then have N consumers do cheap set-intersection against their tracked paths instead of N individual state walks.

---

## Today's problem

Blac currently does change detection per consumer:

1. `cubit.emit(newState)` or `cubit.patch({...})` fires.
2. Each consumer (per `useBloc` call) receives the notification.
3. Each consumer's per-instance Proxy tracker walks the new state along its previously-recorded access pattern, comparing values to decide whether to re-render.

Cost: N consumers × K tracked fields × M emits/sec → N×K×M Proxy traversals and equality checks per second. The same diffing work happens N times.

This is fine for N ≤ a few — and most blac apps are in that regime — but it scales poorly when many consumers subscribe to the same Bloc instance (e.g., a list of N items each rendering a slice of one shared data Cubit). It also gives plugins and devtools nothing for free: anything that wants path-level change info has to re-diff state from scratch.

---

## Design overview

Blac adopts the engine with these additions:

- **`PathId`** — an interned numeric identifier for a path through state (e.g., `users.5.email`). Stable per Bloc class.
- **`PathSet`** — a compact set of `PathId`s. Bitset for small sets (≤64 paths), `Set<number>` for larger.
- **`PathSetSpace`** — the `Space` implementation. `empty()` → empty bitset; `union` → bitwise OR; `intersects` → bitwise AND non-zero.
- **Per-Bloc `DirtyChannel<PathSet>`** — each Bloc instance owns one.
- **`MicrotaskScheduler`** — the default scheduler. Flushes at microtask end; coalesces sync bursts of `patch`/`emit` calls.
- **Per-consumer `PathSet` recording** — the existing Proxy tracker is repurposed to produce a `PathSet` (interned) rather than a value-comparison snapshot.
- **`observedSkeleton`** per Bloc — the union of all live consumers' current `PathSet`s. Used at emit time to bound the diff.

These live in `packages/blac-core/src/reactive/` (or replace the existing tracker module).

---

## `PathId` interning

Paths are strings (`"users.5.email"`) but compared and stored as small integers.

```ts
class PathInterner {
  private next = 0
  private byPath = new Map<string, number>()

  intern(path: string): PathId {
    let id = this.byPath.get(path)
    if (id === undefined) {
      id = this.next++
      this.byPath.set(path, id)
    }
    return id
  }
}
```

**One interner per Bloc class** (not per instance). All instances of `UserCubit` share path IDs, so `state.user.email` is the same `PathId` across instances. Fixed memory; the interner grows to the set of paths ever accessed across the app.

**Bitset boundary:** if `interner.size ≤ 64`, store `PathSet` as a `bigint` (one machine word). Past 64, fall back to `Set<number>` or a `BitSet` with multiple words. Most Blocs will stay under 64 — choose the representation per-class at intern-time.

---

## Recording: per-consumer path sets

The existing per-consumer Proxy tracker stays in place with one change: instead of (or in addition to) value comparison, it **records the access path as a `PathId`** into a per-consumer `PathSet`.

```ts
function trackRender<S>(state: S, interner: PathInterner): { value: S; paths: PathSet } {
  const paths = emptyPathSet()
  const proxy = wrapState(state, '', (path) => paths.add(interner.intern(path)))
  return { value: proxy, paths }
}
```

Conditional/loop reads are handled correctly because the consumer always runs against the **real state** (via the Proxy), not a shim. Math, coercion, iteration, `.find(...)` — all behave as today. Path recording is a side effect of access, not a substitute for it.

**Every render re-records.** The Proxy runs fresh per render, replaces the consumer's stored `PathSet`, and triggers the skeleton update. There is no cross-render caching of the consumer's `PathSet` — a re-render is the only signal that the consumer's access pattern might have changed, but it is *always* the signal that triggers refresh. (See [Conditional reads](#conditional-reads-and-the-every-render-rule) below.)

---

## The observed skeleton

Per Bloc instance: a `PathSet` that is the union of all currently-live consumers' `PathSet`s.

```ts
class Bloc<S> {
  private observedSkeleton: PathSet = emptyPathSet()
  private consumerPaths = new Map<ConsumerId, PathSet>()

  registerConsumerPaths(id: ConsumerId, paths: PathSet): void {
    const prev = this.consumerPaths.get(id)
    this.consumerPaths.set(id, paths)
    if (prev) this.recomputeSkeleton()
    else this.observedSkeleton = pathSetUnion(this.observedSkeleton, paths)
  }

  unregisterConsumer(id: ConsumerId): void {
    if (this.consumerPaths.delete(id)) this.recomputeSkeleton()
  }

  private recomputeSkeleton(): void {
    let s = emptyPathSet()
    for (const p of this.consumerPaths.values()) s = pathSetUnion(s, p)
    this.observedSkeleton = s
  }
}
```

**Incremental option:** when a consumer's paths change, subtract its old paths and add its new paths to maintain the skeleton in O(consumer paths) rather than O(all consumers). Requires bitset subtraction; safe with bitsets, careful with Sets (must check that no other consumer still has those paths). Premature; do the recompute version first.

---

## Diffing at emit / patch / update

Three mutation paths, two diffing strategies.

### `patch(partial)` — free, exact

`patch` is the simplest case: the keys of `partial` *are* the changed paths. No diff needed.

```ts
patch(p: Partial<S>): void {
  this._state = { ...this._state, ...p }
  const paths = pathSetFromKeys(p, this.interner)
  this.channel.mark(paths)
}
```

For nested patch objects (`patch({ user: { email: "x" } })`), recursively walk the patch tree to produce dotted paths (`user.email`). Cost: O(size of patch object), which is exactly what changed.

### `emit(newState)` and `update(fn)` — skeleton diff

Without immutability guarantees from the caller, we cannot rely on reference equality at every level. But we can rely on it **for the leaves the consumers actually care about**, by walking only the `observedSkeleton`.

```ts
emit(next: S): void {
  if (this._state === next) return
  const prev = this._state
  this._state = next
  const paths = diffAlongSkeleton(prev, next, this.observedSkeleton, this.interner)
  this.channel.mark(paths)
}

function diffAlongSkeleton<S>(prev: S, next: S, skeleton: PathSet, interner: PathInterner): PathSet {
  const dirty = emptyPathSet()
  for (const pathId of skeleton) {
    const pathStr = interner.lookup(pathId)
    if (!isEqual(getAt(prev, pathStr), getAt(next, pathStr))) dirty.add(pathId)
  }
  return dirty
}
```

Cost: O(observed leaves), not O(state size). With few consumers, the skeleton is small; the diff is cheap. With no consumers, the skeleton is empty; the diff is zero cost (the channel still marks-and-flushes, but no subscriber notifies).

### `update(fn)` — same as `emit`

```ts
update(fn: (state: S) => S): void {
  this.emit(fn(this._state))
}
```

---

## Single-consumer skip

When `consumerPaths.size <= 1`, skip the diff entirely and unconditionally mark "everything dirty" — the single consumer will run its own equality check or re-render unconditionally (it's already going to do exactly one walk regardless).

```ts
emit(next: S): void {
  ...
  if (this.consumerPaths.size <= 1) this.channel.mark(allPathsSentinel)
  else this.channel.mark(diffAlongSkeleton(prev, next, this.observedSkeleton, this.interner))
}
```

Why: the source-diff is only a win when the diff cost is amortised across multiple consumers. For one consumer (the common case in small apps), it's pure overhead. The branch is one comparison; the saving on small apps is real.

`allPathsSentinel` is a special `PathSet` value where `intersects` always returns true.

---

## Microtask coalescing

The default scheduler for blac is `MicrotaskScheduler`. Multiple `patch`/`emit`/`update` calls within the same synchronous burst accumulate into one `PathSet` and produce one notification per consumer.

```ts
cubit.patch({ a: 1 })
cubit.patch({ b: 2 })
cubit.patch({ c: 3 })
// → one microtask-end flush → one consumer notification → state is { a:1, b:2, c:3 }
```

**Trade-off:** changes timing semantics. Consumers that today rely on synchronous emit (tests, sync devtools, "I called `patch` and immediately read from another bloc that depends on this one") break.

**Mitigation:** offer a `SyncScheduler` per-Bloc as opt-out, and a `flushNow()` API on the channel for tests. Possibly default to `SyncScheduler` for now and ship `MicrotaskScheduler` as opt-in until adoption is broad.

This also subsumes the existing circuit-breaker logic (`configureBlac` for emit-rate guards) — a microtask-coalesced channel cannot produce more than one notification per microtask per Bloc, full stop.

---

## React adapter (`@blac/react`)

`useBloc` subscribes to the Bloc's `DirtyChannel` with the lazy interest thunk being "the path set I recorded on my last render."

```ts
function useBloc<S>(BlocClass): [S, Bloc] {
  const consumerId = useId()
  const bloc = acquire(BlocClass)
  const pathRef = useRef<PathSet>(emptyPathSet())
  const [, force] = useReducer(x => x + 1, 0)

  useEffect(() => {
    const unsub = bloc.channel.subscribe(
      () => pathRef.current,                  // lazy interest
      (_dirty) => force(),                    // dirty: PathSet, but we just force re-render
    )
    return () => { unsub(); bloc.releaseConsumer(consumerId) }
  }, [bloc])

  const recorded = trackRender(bloc.state, bloc.interner)
  pathRef.current = recorded.paths
  bloc.registerConsumerPaths(consumerId, recorded.paths)

  return [recorded.value, bloc]
}
```

The `force()` triggers React to re-render this component. On re-render, `trackRender` produces a fresh `PathSet`, `pathRef.current` updates, and `registerConsumerPaths` refreshes the Bloc's skeleton. The next flush evaluates the thunk and sees the fresh paths.

**`select()` still works** as today's manual escape hatch. Treat its declared dependencies as a synthetic `PathSet` (built from the selector's tracked accesses, or supplied explicitly).

---

## Conditional reads and the "every render" rule

A consumer that reads state conditionally based on external triggers (props, other Cubits, context) is the case where naive path-caching breaks. Worked example:

```tsx
function Item({ showEmail }) {
  const [state] = useBloc(UserBloc)
  return showEmail ? <span>{state.email}</span> : <span>{state.name}</span>
}
```

Sequence:

1. First render with `showEmail=false`. Proxy records `["name"]`. Consumer's `PathSet = {name}`. Skeleton includes `name`.
2. Parent changes `showEmail=true`. React re-renders `Item`. Proxy records `["email"]`. Consumer's `PathSet = {email}`. Skeleton update: remove `name` (if no other consumer holds it), add `email`.
3. Later, `userBloc.patch({ email: "x" })`. Diff along skeleton (contains `email`) → marks `email` dirty → consumer notified → re-renders.

The rule that makes this correct: **every render re-records** the consumer's `PathSet`. There is no cross-render path-cache to go stale. The skeleton is a *derived view* over current live recordings, refreshed as a byproduct of any render — including renders not caused by the Bloc itself.

---

## Plugin / devtools payload

Plugins receive `(prev, next, dirty: PathSet)` instead of just `(prev, next)`. Devtools and logging get path-level change info **without doing their own diffing** — it's already computed at the source.

```ts
interface PluginEvent<S> {
  bloc: Bloc<S>
  prev: S
  next: S
  dirty: PathSet
  interner: PathInterner   // for dirty → string[] translation in UI
}
```

This is a net simplification: today's devtools must re-walk state to produce the "what changed" diff display; tomorrow it can `dirty.toArray().map(interner.lookup)` and be done.

---

## Caveats and limitations

- **Reads outside render are not captured.** Path tracking only works during the render closure (via the Proxy). Reads in event handlers, effects, async callbacks don't register paths. Same as today; the escape hatches are `select()` for declared dependencies and `bloc.subscribe()` for manual subscriptions.
- **Dynamic / computed reads coarsen.** `state.users.find(u => u.active).name` — the path can be recorded only as `users` (the entry point of the dynamic access). The consumer over-renders slightly when any user changes. Acceptable; matches every other path-tracking system.
- **Array index reads are fine but inserts coarsen.** Reading `users[5].name` records `users.5.name`. But an insert at index 0 shifts everything; the resulting "what changed" must mark `users` (the collection root) dirty, which any subpath consumer treats as a re-render trigger. Loss of granularity is structural, not a bug.
- **In-place mutation of state still silently fails.** If a caller mutates `bloc.state.user.email = "x"` directly instead of going through `patch/emit/update`, change tracking is bypassed. Same as today.
- **Single-consumer case has overhead.** Mitigated by the `consumerPaths.size <= 1` skip. With one consumer, behaviour matches today's "consumer does its own check."

---

## Migration order

Same shippability constraint as insomni: every commit leaves blac working.

**Stage 0 — engine landing.** Add `@reactive/primitives` and `@reactive/dirty-channel`. No blac changes.

**Stage 1 — internal channel, external behaviour unchanged.** Wrap the current notification path so each Bloc has a `DirtyChannel<PathSet>` with `MicrotaskScheduler` set to `SyncScheduler` initially. All consumers subscribe with `allPathsSentinel` as interest (every change notifies every consumer). No diffing yet. Verify nothing breaks.

**Stage 2 — path recording.** Add `PathInterner` per Bloc class. Modify the per-consumer Proxy tracker to produce a `PathSet`. Plumb `registerConsumerPaths` through `useBloc`. Skeleton maintained but unused (subscribe interest still `allPathsSentinel`).

**Stage 3 — source-diff for `patch`.** `patch` produces a `PathSet` directly. Consumers subscribe with their actual `PathSet`s. `emit`/`update` continue with `allPathsSentinel` (no skeleton diff yet). Validate against the current behaviour with a test suite that exercises conditional reads, loops, derived selectors.

**Stage 4 — source-diff for `emit`/`update`.** Implement `diffAlongSkeleton`. Enable per-class via a feature flag; flip the default once production usage is verified.

**Stage 5 — microtask coalescing.** Flip the default scheduler from `SyncScheduler` to `MicrotaskScheduler`. Provide opt-out for Blocs that need synchronous semantics. Existing circuit-breaker config becomes a thin wrapper that selects the scheduler and configures batching limits.

**Stage 6 — plugin payload upgrade.** Add `dirty: PathSet` and `interner` to the plugin event. Update devtools to consume.

Stages 0–2 are pure plumbing. Stage 3 enables the path-based optimization for the easy case. Stages 4–6 are the full payoff.

---

## Decisions

1. **`PathSet` representation crossover** — **deferred, post-MVP.** Don't optimise prematurely. v1 picks one representation (likely `Set<number>` for simplicity; bitset upgrade is a future perf pass). Revisit after the system is in use and we have real path-count distributions.
2. **Inter-Bloc dependencies via `depend()`** — **microtask coalescing handles it.** No unified cross-Bloc path graph. When a method on Bloc A writes to Bloc B and then to A within the same tick, both Blocs accumulate their dirty `PathSet`s independently and both flush at the microtask boundary. Consumers observing both Blocs see one consistent snapshot per flush; ordering between Blocs within the flush is registration order (deterministic, but not call-order-dependent).
3. **Custom equality per path** — **in scope for v1.** Per-path equality is important enough to design in from the start, not bolt on later. Likely API: `@blac` config accepts an `equality` map keyed by path (or path-pattern), with a default fallback. Used at diff time: `diffAlongSkeleton` looks up the configured comparator per `PathId` instead of always using `Object.is`. Concrete API shape is TBD — flag for the implementation pass.
4. **`registerConsumerPaths` on every render** — cheap-equality fast-path skip. On every `registerConsumerPaths` call, compare the new `PathSet` to the stored one; if equal, skip the skeleton recompute. For `Set<number>` (v1 representation), equality is size check then iterate-and-`has` — fine for typical small consumer path sets. Confirm cost is acceptable during implementation.
5. **Server-side rendering** — `SyncScheduler` per request; `PathInterner` and per-Bloc state instantiated fresh per request (no module-level singletons). Consumers render once, read state, no microtask flush needed. Document the "no module-level Bloc singletons in SSR" rule for users.
6. **Multi-Bloc ordering under coalescing** — registration order within a flush is the contract. Document it explicitly. Consumers that depended on synchronous-call-order semantics opt out via `SyncScheduler` per-Bloc.
7. **TypeScript ergonomics for `interner.lookup`** — `string` paths are fine for devtools and for the per-path equality config keys (Decision 3). Type-safe selector layer (state-type-parameterised paths) is above-engine future work, not v1.

## Open questions

(none — all blac-layer questions resolved)
