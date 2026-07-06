# Reliability & Bugs

Prefixes: **E** = engine, **T** = structural, **S** = spatial. Confidence: `confirmed` = code path traced end-to-end; `plausible` = strong reading, wants a repro test.

---

## Engine

### E1 · high · Schedulers have one flush slot — sharing a scheduler across channels deadlocks the loser

`confirmed` — `dirtytalk-engine/src/scheduler.ts:20-36, 42-66, 73-120`; `dirty-channel.ts:52-55`

`ManualScheduler`, `MicrotaskScheduler`, and `RAFScheduler` all store a single `#flush` and **overwrite it** on each `request()`. Two channels sharing one scheduler:

```
channelA.mark(x)   → scheduler.request(flushA)   // #flush = flushA
channelB.mark(y)   → scheduler.request(flushB)   // #flush = flushB (A's overwritten)
… drain            → only flushB runs
```

Channel A is now **permanently dead**: its `#scheduled` flag is still `true`, so every future `mark()` takes the "already scheduled" branch and never re-requests (`dirty-channel.ts:52`). Accumulated dirt grows forever; no subscriber ever fires; no error surfaces.

The API invites this: `Scheduler` is a constructor-injected option on both `StructuralContainer` and `SceneRoot`, and the docs say "Tests and SSR should pass SyncScheduler" — implying scheduler instances are interchangeable values. `SyncScheduler` happens to be safe (no state); `ManualScheduler` in a test pumping two containers is the likeliest real hit: only the last-marked container flushes per `pump()`, the other deadlocks. `plausible` that this has already produced confusing test behavior.

**Fix direction.** Hold a `Set<() => void>` of pending flushes (drain all), or document loudly that a scheduler instance must be exclusive to one channel and assert on `request` with a different fn while pending.

### E2 · medium · Flush rethrows subscriber errors as unhandled scheduler-context exceptions

`confirmed` — `dirty-channel.ts:89-134`

Errors from interest thunks and callbacks are collected and **rethrown after the loop** — inside a microtask/RAF tick, so they surface as `window.onerror`/`uncaughtException` with no channel context, and an `AggregateError` when multiple. Isolation between subscribers is good (one bad callback doesn't starve the rest); the *reporting* has no seam — no `onError` option, so embedders (blac, spatial) can't route these to their error infrastructure. Also note the throw happens *after* the next flush is scheduled (step 9 before step 8 — the comment numbering itself says 9-then-8), which is correct behavior but reads like an accident; a comment fix would help.

### E3 · low · No teardown on `DirtyChannel`

`confirmed` — `dirty-channel.ts`

No `dispose()`: a scheduled flush holds `#boundFlush` → the channel → the space and all subscriber closures until it drains; `Scheduler.cancel()` exists but nothing calls it. Embedders (SceneRoot — S8; StructuralContainer) can't cleanly kill a channel. Minor memory/lifecycle gap that each consumer currently papers over by leaking.

### E4 · low · `Signal` setter throws other subscribers' errors at the assignment site

`confirmed` — `primitives.ts:20-35`

`signal.value = x` synchronously throws the first subscriber error (or an `AggregateError`) at the *writer's* call site — the writer is punished for a listener's bug, and later application logic after the assignment is skipped even though the value *was* updated and other subscribers *did* run. Either swallow-and-report (like the channel + an error seam) or document the throw contract. Note `Signal` has zero consumers in the repo (see S-list) — this is latent.

---

## Structural

### T1 · critical · `emit()` under-marks: changes outside the consumer skeleton never flush

`confirmed` — `container.ts:135-155`, `diff.ts:55-75`, `dirty-channel.ts:80`

Owning-package restatement of review-884 R1. With ≥2 registered consumers, `emit` computes `dirty = diffAlongSkeleton(prev, next, skeleton)` — and the skeleton is only the union of *registered consumer* paths. Raw `channel.subscribe` users with `ALL_PATHS` interest (blac's system-event bridge, plugins, `watch`, select-mode) contribute nothing to the skeleton, so an emit that changes only un-tracked fields produces an **empty** dirty set → `mark(empty)` → flush early-returns → nobody wakes, ever.

`patch()` upholds the correct invariant and documents it (`diff.ts:129-131`: marks are "independent of any consumer skeleton, so raw channel subscribers wake correctly"). `emit`/`update` violate it. The single-consumer `ALL_PATHS` shortcut (`container.ts:141-145`) masks the bug in small scenes, making it a "works until the second component mounts" class of failure.

**Fix direction (here, not in blac):** when the skeleton diff returns empty but `Object.is(prev, next)` is false, mark a reserved root id (or `ALL_PATHS`); or always union the diff with a root-changed mark — leaf-interest consumers won't intersect it, `ALL_PATHS` subscribers will.

### T2 · high · Tracker proxy cache ignores the path — aliased subtrees record the wrong paths

`confirmed` — `tracker.ts:97-103, 225-227`

`proxyByTarget` is a per-render `WeakMap<object, proxy>`, but each proxy's `prefix` is baked into its closure at first wrap. If the same object is reachable at two paths — `state.selected === state.items.3` (a normalized/aliased state, or a shared default object) — whichever path is read first wins the cache; reads through the second path record ids under the **first** path:

```
state.selected.name   // wraps target under prefix 'selected' → records selected.name
state.items.3.name    // cache hit on same target → ALSO records selected.name (!)
```

Now an immutable update that replaces `items.3` (leaving `selected` pointing at the old object, or vice versa) changes the value the consumer actually rendered via `items.3.name`, but the skeleton diff checks `selected.name` — unchanged → **no wake, stale UI**. The reverse direction over-wakes (annoying but safe); the under-wake direction is silent data staleness.

**Fix direction.** Key the cache by `(target, prefix)` (nested map or `${prefix}` map of WeakMaps), or record into *both* paths by keeping per-target a set of prefixes. Note the cache also serves `value.user === value.user` identity within a render — a compound key preserves that for same-path reads.

### T3 · high · Frozen state throws inside the tracker proxy

`confirmed` (mechanism; `plausible` in the wild) — `tracker.ts:217-221, 225`

For a **frozen** target (`Object.freeze(state)` — a common dev-mode discipline for immutable state, and cheap to hit via libraries that freeze in dev), a nested object property is non-writable + non-configurable. The JS Proxy `[[Get]]` invariant then requires the trap to return the *exact* target value — but the tracker returns a sub-proxy (`wrap(value, path)`), so the runtime throws:

> TypeError: 'get' on proxy: property 'user' is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value

Nothing in structural/blac freezes state today, which is why tests pass — the first user who freezes their initial state (or emits a frozen object from a lib) crashes on first render.

**Fix direction.** In the recurse branch, check the descriptor (`Object.getOwnPropertyDescriptor(t, key)`; if `!desc.configurable && !desc.writable`, return the raw value and record the path as a coarse leaf) — or document "do not freeze state" and dev-assert on frozen roots in `trackRender`.

### T4 · medium · Object key enumeration is invisible to tracking

`confirmed` — `tracker.ts:116-222` (no `ownKeys`/`has`/`getOwnPropertyDescriptor` traps)

Arrays get `length` as a change signal; plain objects have nothing equivalent and enumeration doesn't go through `get`:

- `Object.keys(state.dict).map(...)` — `[[OwnPropertyKeys]]` is untrapped → **zero paths recorded**. Adding/removing a dict entry never re-renders the consumer.
- `Object.values`/`entries`/spread — record each *existing* key's path (they `get` each one), but a **newly added** key has no recorded path → consumer sleeps through additions. Removals only wake if the removed key's own path diffs (it does — value → `undefined` — *if* the consumer read that key; a keys-only consumer recorded nothing).
- `key in state.dict` (`has` trap) — untracked.
- `for..in` — untracked.

This is the object-shaped sibling of the array-iteration problem the tracker already solves with pinning; record-like state (`Record<string, T>` keyed by id) is bread-and-butter state shape.

**Fix direction.** Add an `ownKeys` trap that pins the object's own entry path (coarse: any change under the object wakes — matching the pre-`TRACK_ARRAY_ITERATION` array behavior), and a `has` trap recording the queried child path.

### T5 · medium · Sub-proxies leak into identity comparisons and derived arrays

`confirmed` — `tracker.ts:146-176`

`includes`/`indexOf`/`lastIndexOf` are special-cased to bind the raw target (correct). But with `TRACK_ARRAY_ITERATION` on:

- **User callbacks get sub-proxies**: `items.find(x => x === selectedItem)`, `items.indexOf` was fixed but `findIndex(x => x === raw)`, `.some(x => x === raw)`, `Set.has`-style lookups inside callbacks — all silently never match (proxy ≠ raw). This class of bug already bit blac (the messenger delivered-status incident in project memory is adjacent). Nothing warns.
- **Derived arrays contain proxies**: `.slice()`, `.filter()`, `.concat()`, `.map(x => x)` bind to the proxy, so ArraySpeciesCreate fills the *result* with sub-proxies. The result frequently escapes the render (stored in a ref, passed to an event handler, memoized) — later reads go through a dead-set-recording proxy over a **stale** target array from a previous state. Reads work but return old data; identity checks against fresh state fail.

**Fix direction.** Unwrap proxies at comparison boundaries is impossible generically — instead: (a) maintain a `proxy → target` WeakMap and expose a `raw(v)` helper; (b) extend the raw-bound list to all identity-sensitive methods; (c) dev-mode: tag sub-proxies with a symbol and warn when one is written anywhere outside the render (hard); at minimum document the two hazards prominently — today neither is mentioned.

### T6 · medium · `useStructural` has the mount-gap miss

`confirmed` — `react-hook.ts:26-41`; `dirty-channel.ts:58` (no replay)

Same defect as review-884 R2, in this package's own hook: snapshot read during render, subscribe in a **passive** effect, no post-subscribe recheck. Any flush between render and effect (layout-effect emit elsewhere, microtask from a fast async) is missed; the component stays stale until the next intersecting emit. Fix identically (recheck after subscribe, or uSES).

### T7 · low · Dead binding branch in the tracker; detached method calls silently untracked

`confirmed` — `tracker.ts:27-28, 193-210`

`isWrappable` requires `typeof v === 'object'`, so a function-valued own property returns raw at line 194 — the entire "own function on a non-array object: bind to the proxy" block (`tracker.ts:198-210`) is **unreachable**, and the docstring (lines 71-74) describes behavior that doesn't exist. In practice method-call syntax still tracks (`state.obj.fn()` invokes with the proxy as receiver), but a detached call (`const f = state.obj.fn; f(...)`) reads raw state with no recording — silent tracking hole. Either delete the dead block + fix the doc, or hoist the function check above the wrappable check to make the documented binding real.

### T8 · low · Dotted / NUL-prefixed property names corrupt path semantics

`confirmed` — `tracker.ts:24-25`, `diff.ts:29`, `path-interner.ts:20`

Paths are dot-joined strings: a state key containing a dot (`{"a.b": 1}`) interns the same path as nested `{a:{b:1}}`, and `getAt` splits on `.` so it reads the wrong slot during diffs → phantom wakes or misses. A key starting with `\0` could collide with the ancestor-sentinel lane. Both are pathological state shapes, but the failure is silent misrouting; a dev-mode assert on `.`/`\0` in keys during `trackRender`/`walkPatch` would make it loud.

### T9 · low · Per-class interner grows without bound and is shared across instances

`confirmed` — `container.ts:64-76`, `path-interner.ts:22-24`

The interner is per-*class* (static WeakMap) and append-only. State shapes with unbounded dynamic keys (`items.<uuid>.name` under array-index or record tracking) intern a new path per entity per class **forever** — `_map` + `_paths` grow for the life of the app, shared by every instance of the class. Long sessions over churning collections accrete permanently. Consider per-instance interners (costs cross-instance id sharing, which nothing seems to rely on) or an LRU/compaction story; at minimum expose `interner.size` in a devtools/leak report.

---

## Spatial

### S1 · high · Zero-area geometry silently disables rendering

`confirmed` — `scene-root.ts:68-83`, `rect.ts:3-11`, `scene-node.ts:31`

`rectOverlaps` requires **both** rects to have positive area. Two consequences:

1. **Default-constructed `SceneRoot` never renders.** `bounds` defaults to `{0,0,0,0}`; the root's own channel subscription uses `() => [{ rect: this.bounds, … }]` as interest — a zero-area interest never intersects anything, so `_renderFrame` never runs. No warning; the scene is just black. Every consumer must know to pass `bounds` or set it before first damage (and setting `root.bounds = …` directly — a public field — doesn't damage; only `setBounds` does).
2. **Zero-area damage is dropped.** `markDamaged('data')` from a node whose bounds are not laid out yet (`{0,0,0,0}` — exactly the state of a fresh node needing its first `rebuildData`/`doLayout`) produces damage that intersects nothing → no frame → its layout never runs → bounds stay zero. Data-first pipelines can deadlock at bootstrap; the escape hatch is that some *other* node's paint damage triggers a frame, which only helps if this node's `doLayout` gets called — but stages iterate *damage entries*, not the tree, so it wouldn't be (`scene-root.ts:126-134`).

**Fix direction.** Treat `kind !== 'paint'` damage as always-interesting (data/layout are not spatially cullable in general), or give zero-area rects a "point damage" semantics in `rectOverlaps`, or dev-warn on zero-area root bounds and zero-area non-paint damage.

### S2 · medium · Hit-testing ignores clipping — invisible content is interactive

`confirmed` — `scene-root.ts:160-173`, `scene-node.ts:130-138`

Damage is clipped to ancestor `clipsOverflow` bounds (`_clipRect`), so a child hanging outside a clipping parent is never *painted* there — but `hitTestNode` tests raw `child.bounds` with no clip walk. A node scrolled/clipped out of view still captures pointer-downs at its unclipped coordinates, over whatever is actually visible there. Visual model and interaction model disagree.

**Fix.** During hit-testing, skip descent into a `clipsOverflow` node when the point is outside its bounds; equivalently clip the effective hit rect the same way `_clipRect` clips damage.

### S3 · medium · `batch()` only batches the same node's damage, contrary to its comment

`confirmed` — `scene-node.ts:36-37, 66-77`

`_batchBuffer` is an instance field; `markDamaged` consults `this._batchBuffer`. A child's `markDamaged` during a parent's `batch(fn)` finds the **child's** buffer `null` and emits immediately — the comment "nested batch — outer batch absorbs everything" is only true for re-entrant batches on the *same node*. So `parent.batch(() => layoutChildren())` (the natural use) batches nothing. Also `_emitBatchedDamage` re-attributes merged damage to `node: this`, so per-kind stage dispatch (`rebuildData`/`doLayout` are looked up on `d.node`) would run on the batching node instead of the damaged one — another reason cross-node batching can't just reuse the current merge.

**Fix direction.** Make the buffer root-scoped (root holds the in-flight batch; `markDamaged` routes through `_root()` first), keep per-node attribution in the buffer, and merge rects only for `paint` damage where attribution doesn't matter.

### S4 · medium · Pipeline stages run once per damage entry, not per node

`confirmed` — `scene-root.ts:126-134`

`_renderFrame` iterates damage entries: a node that marked `data` three times in one frame gets `rebuildData()` **three times**, then `doLayout()` three times (kind `data` also enters the layout loop). Coalescing is the whole point of the channel; the stages un-coalesce it. Dedupe by node per stage (a `Set` per loop) — also fixes the related oddity that a `data` damage on a node *without* `doLayout` silently drops the "data implies layout" contract for its ancestors.

### S5 · medium · PointerRouter: capture survives detach; no release; no fallthrough

`confirmed` — `pointer-router.ts:23-58`

- A node removed from the tree mid-drag stays in `_captured` and keeps receiving `move`/`up` (with a `null` root path and stale bounds) until pointer-up. There's no `releaseCapture()` and no reaction to scene mutations.
- If the hit node implements none of the handler methods, the event is consumed anyway (`dispatch` returns the node, no bubbling to an ancestor that *does* handle it). Interactive containers with decorative children need every leaf to forward manually.
- No enter/leave synthesis for uncaptured moves — hover states can't be built on this without an external tracker re-deriving hits.

### S6 · low · `children` is a public mutable array

`scene-node.ts:23` — pushing into `node.children` directly bypasses `adoptChild`'s parent-pointer and adopt-damage logic; nothing prevents or detects it. Make it `readonly SceneNode[]` publicly (private `_children` internally).

### S7 · low · Adopt-time damage covers only the subtree root's bounds

`scene-node.ts:106-113` — `adoptChild` damages `child.bounds` only; a non-clipping subtree whose descendants extend beyond the subtree root's bounds attaches without damaging those regions → stale pixels until something else touches them. Union descendants (or document that subtree roots must enclose descendants unless `clipsOverflow`).

### S8 · low · No `SceneRoot` teardown

`scene-root.ts:56-83` — the root subscribes to its own channel and never unsubscribes; there's no `destroy()` to `Scheduler.cancel()` a pending RAF. Tearing down a canvas (SPA route change) leaves a scheduled `_renderFrame` that paints into a dead renderer once more, and the RAF/scheduler pins the whole scene graph until it fires.

### S9 · low · Root detection duck-types on a private-by-convention method

`scene-node.ts:13-15` — `isSceneRoot` checks `typeof n._emitDamage === 'function'`. Any node that happens to define `_emitDamage` becomes a damage sink for its subtree, silently severing it from the real root. Use a symbol brand (same pattern as structural's `META_BRAND` cousin in blac).
