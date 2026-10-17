# dirtytalk review: engine, spatial, structural

Date: 2026-10-17. Scope: `packages/dirtytalk-engine`, `packages/dirtytalk-spatial`,
`packages/dirtytalk-structural` (plus the `@blac/react` callers they affect).

Every bug below has a regression test. Each test fails on the original code and
passes after the fix. All suites pass: engine 64, spatial 100, structural 211,
blac-core 703, blac-react 202, plugin-persist 18, devtools-connect 30,
logging-plugin 5. Lint, typecheck and format are clean, and all three packages
build.

## Summary

| Package    | Bugs fixed | Perf work                                                     |
| ---------- | ---------- | ------------------------------------------------------------- |
| engine     | 3          | Unified flush loop, no per-drain allocations in schedulers    |
| spatial    | 7          | In-place mark accumulation, bounded regions, per-frame dedupe |
| structural | 5          | Tracker rewrite, early-exit diffs, string-free patch walk     |

## Benchmarks (Node, vitest bench, ops/s, higher is better)

Committed `hotpath.bench.ts`:

| Bench                              | Before    | After     | Δ        |
| ---------------------------------- | --------- | --------- | -------- |
| P4a emit, 1000 deep-path consumers | 7,599     | 9,546     | +26%     |
| P4b patch array-refine, 100-path   | 1,647,225 | 1,997,161 | +21%     |
| P4b patch array-refine, 500-path   | 1,610,916 | 2,093,234 | +30%     |
| P5 register+unregister, N=1000     | 5,330     | 4,631     | **−13%** |
| P5 register+unregister, N=2000     | 2,574     | 2,059     | **−20%** |
| PC1 swap rows, ProxyCache          | 3,212     | 3,522     | +10%     |

Scratch benches (not committed):

| Bench                                       | Before | After  | Δ    |
| ------------------------------------------- | ------ | ------ | ---- |
| T2 re-render 1000 items, ProxyCache         | 1,688  | 2,389  | +41% |
| T1 first render 1000 items × 3 fields (p75) | 0.83ms | 0.77ms | ~+8% |
| D1 emit, 1-item change, 1000 consumers      | 12,508 | 18,564 | +48% |
| D2 array patch, 1000 consumers              | 7,871  | 9,428  | +20% |
| E1/E2 engine mark/flush                     | —      | —      | flat |

T1 and T3 (first render) are GC-dominated and noisy; their medians improved
30–80% in isolated runs. P5 is slower on purpose: registration now copies the
set to fix the refcount-corruption bug (S1).

---

## @dirtytalk/engine

### Bugs (fixed)

- **E1. A throwing `Space` method wedged the channel for good.** `#flushing`
  was reset outside any `finally`, so if `space.intersects` threw, `mark()`
  never scheduled again. Now each subscriber's interest, intersect and
  callback run inside the error-isolation block, and `#flushing` resets in
  `finally`.
- **E2. `dispose()` from inside a callback did not stop the flush.** Later
  subscribers still ran against a disposed channel. The loop now stops on
  `#disposed`.
- **E3. `ManualScheduler` had no `cancel`.** A disposed channel stayed in
  `pending` until the next `pump()`. Added `cancel(flush)`.

### Cleanups / perf

- Merged the duplicated single-subscriber and multi-subscriber flush paths
  into one loop. Each entry now stores its own id, so the loop iterates
  `values()` instead of `[id, entry]` tuples. The single-subscriber path had
  also skipped the `interest == null` guard; that inconsistency is gone.
- Schedulers share one `runAll` drain helper with a lazy errors array. The
  drain functions are bound once rather than allocating a closure each
  window. `MicrotaskScheduler.cancel` no longer resets `#scheduled` while a
  microtask is still queued, and `RAFScheduler` lost its `any` handle.
- README: `cancel?(flush)` signature, `unionInto`, `onError`, `dispose`, error
  semantics.

---

## @dirtytalk/spatial

### Bugs (fixed)

- **P1. `data`/`layout` damage on a zero-size or off-screen node never ran.**
  `RectSpace.intersects` required positive area overlap with the root bounds.
  A new node with default `{0,0,0,0}` bounds that marked `data` therefore
  never got `rebuildData`, and that work was lost rather than deferred. Now
  non-`paint` damage intersects any non-empty interest.
- **P2. `rebuildData` / `doLayout` ran once per mark.** N marks in a frame
  meant N rebuilds. Each node now runs each stage at most once per frame.
- **P3. `setBounds` re-laid-out the child, not the parent.** The comment,
  the `if (this.parent)` guard and the README all said parent, but the damage
  carried `node: this`. It now targets the parent.
- **P4. `batch` dropped damage when `fn` threw.** Partial mutations were
  never repainted. Damage is now emitted in `finally`.
- **P5. `adoptChild` accepted an ancestor.** This created a cycle, and every
  later parent walk looped forever (the regression test hangs on the old
  code). It now throws.
- **P6. No way to tear down a `SceneRoot`.** Its RAF stayed scheduled. Added
  `dispose()`.
- **P7. `beginFrame` regions were raw and unbounded.** They included
  duplicates, rects nested inside others, zero-area rects and rects outside
  the canvas. The culled paint walk is O(children × regions). Regions are now
  clamped to the root, empty and contained rects are dropped, and more than
  16 collapse to their bounding rect.

### Perf

- `RectSpace.unionInto` appends in place. Before, every same-frame mark
  copied the whole damage list, O(N²) per frame.
- `SceneNode` makes one parent walk per mark that both clips and finds the
  root (was two). Batched damage no longer builds a `Map` per batch.
- The root's interest region is allocated once, not on every flush.

### Behaviour changes to note

- Frames with only `data`/`layout` damage and nothing visible skip
  `beginFrame`/`endFrame` and `onFrameTiming`.
- README updated (it still described the old single-`paintRegion` contract).

---

## @dirtytalk/structural

### Bugs (fixed)

- **S1. Consumer refcounts were corrupted by live sets.**
  `registerConsumerPaths` stored the caller's set by reference. Tracking sets
  keep growing after registration (`useStructural` never disarmed; see also
  R1). On unregister, ids added after registration were decremented without
  ever being counted, which deleted them from the skeleton while another
  consumer still needed them. That consumer then stopped receiving updates.
  The registry now stores a snapshot (the cause of the P5 slowdown).
- **S2. `patch` could swallow a real state change.** When per-path
  `equality` called every patched value equal, the mark set was empty and
  the channel's empty fast-path skipped `ALL_PATHS` subscribers (the blac
  bridge, plugins, watch). `emit` already handled this with the root
  sentinel. Both now share `_markChanged`.
- **S3. `useStructural` never disarmed its tracker.** Reads in handlers and
  effects kept adding paths after commit. It now disarms in the layout
  effect.
- **S4. `useStructural` missed atomic parent replacements.** Its interest was
  not ancestor-expanded, so when the skeleton was `ALL_PATHS` (refinement
  skipped), a reader of `items.length` missed `patch({ items })`. It now uses
  `expandWithAncestors`, moved here from `@blac/react` (which now imports it)
  so there's one copy.
- **S5. Dead code in the tracker.** The own-function bind branch was
  unreachable because `isWrappable` excludes functions, and the
  `TRACK_ARRAY_ITERATION = false` branches were dead. Both removed.

### Perf

- **Tracker rewrite.** Each proxy now has one `TrackHandler` instance as its
  `ProxyHandler`, and its traps run with `this` bound to it. This replaces a
  handler object, 6 trap closures, a `pinArrayPath` closure and a separate
  cache entry per proxy. A reused proxy is repointed at a new render by
  swapping its `ctx`.
- The tracker builds no path strings. Prefix strings were concatenated on
  every nested read but only used by trace events, which now resolve them
  from the interner when a trace hook is installed.
- Array methods are no longer re-`bind`ed on every access. Called on the
  proxy, they already get it as receiver. Only
  `includes`/`indexOf`/`lastIndexOf` bind to the raw array.
- `ProxyCache` keeps a per-target linked list of handlers instead of a
  `Map<prefixId, entry>` per target, and the per-call cache is a plain `Map`.
- `diffAlongSkeleton` and `_refineAncestorMarks` stop a path at the first
  reference-equal ancestor (`changedAtSegments`), so an immutable update only
  walks what it replaced. When a custom `equality` is configured they read
  the full path, as before.
- `changedPathsFromPatch` interns via `internChild(parentId, key)`: no string
  concatenation and no per-call closure.
- `_refineAncestorMarks` detects ancestor-watch ids with one array read
  (`ancestorTargetId`) instead of a string `charCodeAt` check plus a second
  lookup.

### Measured and rejected

- Skipping the frozen-property descriptor check gives +12–20%, but it's
  unsound: the Proxy invariant throws for any non-writable, non-configurable
  object property. Gating it on `Object.isExtensible` gives only +6% and is
  still unsound for `defineProperty`'d props. Kept the sound check.
- Replacing the `raw()` WeakMap with a symbol trap gave no measurable gain on
  creation and would invoke foreign proxies' traps. Kept the WeakMap.

---

## Open items (not changed)

- **R1. `@blac/react` dep tracking never disarms.** Fixed in the second pass
  (S9).
- **R2. `process.env.NODE_ENV` in library code.** Fixed in the third pass.
- **R3. Per-index array tracking still has a size cliff.** Tried in the third
  pass (arrays over 256 tracked whole), reverted in the fourth: it made one
  row component per item 16× slower.
- **R4. `deepMerge` drops a null prototype.** Fixed in the third pass.
- **R5. `ProxyCache` keys on `(target, prefixId)` without the interner.** Not
  a bug: a reused handler stores only `prefixId`, and its `ctx` (with the
  interner) is repointed on reuse, so the id is always resolved in the
  interner that produced it.
- **R6. `apps/examples` `tsc` crashes ("Debug Failure").** Fixed in the third
  pass.

## Second pass (2026-10-17)

A fresh review of structural and of blac-core/blac-react's use of it, plus
linking insomni to the local engine/spatial. Every bug below has a regression
test that fails on the first-pass code. Suites: engine 64, spatial 101,
structural 214, blac-core 703, blac-react 203, plugins 53; insomni 1782,
plot 745. Lint and typecheck are clean. Benches are unchanged within noise
(P4a, P4b, P5, PC1 all ±3%).

### Bugs (fixed)

- **S6. A reused root proxy recorded nothing.** With a `ProxyCache` the root
  proxy was the same object on every render while state was unchanged. A
  render that read nothing (`useMemo(() => state.user.name, [state])` after a
  local re-render) registered an empty path set, and the component never woke
  again. This predates the first pass and affected `useBloc` too. The root
  proxy is now always fresh; children stay cached, since a reused child is
  only reachable through a `get` that records it.
- **S7. Root-shape reads recorded nothing.** `Object.keys(state)`, `for..in`
  and `in` on the root pinned nothing (the pin returned early at the root), so
  adding a root key never woke the reader. The root now pins the root id, and
  the container marks it on every change while a root-shape reader is
  registered.
- **S8. A change between render and commit was missed.** It was diffed
  against the previous skeleton, which lacks paths only the new render read.
  `useStructural` (sync schedulers) and `useBloc` (when a time-sliced render
  yields and the microtask flush runs before commit) now re-render when state
  moved since render.
- **S9. `useBloc` dep tracking never disarmed (was R1).** `DepSession` now
  collects each dep's `disarm` and `useBloc` calls them at commit, before
  `isUnchanged()`, so late reads no longer grow the compared sets or force a
  spurious reconcile, and the dep `ProxyCache` gets pruned.

### Perf

- `useStructural` skips `registerConsumerPaths` and `expandWithAncestors` when
  the committed paths are unchanged, instead of re-expanding (one allocation
  per path) on every commit.

### Spatial / insomni

- New `protected SceneRoot.paintFrame(regions)` hook: subclasses replace the
  paint stage and keep the data/layout stages, region clamping and timing.
- insomni (`pnpm-workspace.yaml` overrides link `@dirtytalk/engine` and
  `@dirtytalk/spatial` to this repo):
  - `GpuSceneRoot` ran its own copy of the pipeline through a second channel
    (`FrameSpine`), so it had P2 (rebuild per mark) and P7 (raw, unbounded
    regions), and the base channel subscribed for nothing. It now overrides
    `paintFrame` with its recursive cull and inherits everything else,
    including `dispose()`.
  - `FrameSpine.dispose` called `scheduler.cancel()` with no argument (the
    0.0.3 signature), which no longer cancels the pending flush. It now calls
    `channel.dispose()`.
  - Dropped the `Signal`/`Observable` re-exports from `insomni/spatial`; the
    engine removed them and nothing imported them.
  - Behaviour change: `GpuSceneRoot`'s interest is now its bounds (was the
    whole plane), so paint damage outside the root bounds is dropped, and
    frames with only data/layout damage and nothing visible skip
    `gpu.render`.

### blac-core

- No hot-path changes needed: `_pendingChange` is per tick, plugin contexts
  are cached, the bridge exists only while a plugin has `onStateChange`.
- Docs: `onStateChange` paths may include the root id; removed stale
  "single-consumer skip" notes (there is no such skip; plugins just cost a
  callback per flush).

### Still open

- See the third pass.

## Third pass (2026-10-17)

Suites: structural 219, blac-core 703, blac-react 203, devtools-ui 20,
devtools-connect 30, logging 5, persist 18. Typecheck and lint are clean,
including `apps/examples`. Each fix has a test that fails without it.

- **R2.** The tracker's read-only traps and the interner's size warning read
  `process.env.NODE_ENV` through `isDev()` (`src/env.ts`). A missing
  `process` counts as production, matching blac-core's `IS_DEV`.
- **R3.** Arrays longer than `MAX_TRACKED_ARRAY_LENGTH` (256) are returned
  raw and recorded at their own path; a large root array records the root
  id. Render plus emit of one changed item, reading every `title`/`done`:

  | Items  | Before  | After    |
  | ------ | ------- | -------- |
  | 100    | 0.07 ms | 0.07 ms  |
  | 1,000  | 0.89 ms | 0.014 ms |
  | 10,000 | 9.7 ms  | 0.13 ms  |

  Trade-off: a consumer of a large list wakes on any change to it (the
  Zustand model) rather than only on the fields it read. **Reverted in the
  fourth pass.** The web-docs tracking pages now describe per-item tracking.

- **R4.** `deepMerge` clones a null-prototype branch with `Object.create(null)`;
  everything else still uses spread.
- **R5.** Not a bug (see above).
- **R6.** `apps/examples/tsconfig.json` mapped `@blac/react/testing` to
  `testing.ts`; the file is `testing.tsx`. TS 6 resolved the `.tsx` fallback
  and then hit an internal assertion instead of reporting it.
- **Root id display.** `interner.lookup(rootId)` returns `''` (the whole
  state, as in `getAt`) instead of `\0root`; devtools chips show `<root>`.
- **insomni.** `FrameSpine` stays: it's a documented public export. The
  damage docs no longer say `GpuSceneRoot` owns one.

Not done:

- `_refineAncestorMarks` stays O(skeleton × depth). Superseded by the
  fourth pass's skeleton trie.
- insomni now declares `@dirtytalk/engine` ^0.2.2 and `@dirtytalk/spatial`
  ^0.2.0 (the pending changeset versions; `paintFrame` isn't in 0.1.1).
  Release these before publishing insomni.

## Fourth pass (2026-10-17)

An end-to-end A/B (`useBloc` + React `act`, happy-dom, medians of 5
alternating runs, pre-review `d298d147` vs this pass) showed R3 made the
common "one row component per item" pattern 16× slower: every row read
`items`, so every change re-rendered all of them. R3 is reverted, and that
pattern is now the optimization target.

- **Skeleton trie.** `emit` and the `patch` refine walk the consumer skeleton
  as a path trie (`src/skeleton-trie.ts`) and stop at every unchanged
  reference, instead of walking each skeleton path from the root. Built by
  the first diff, then kept in step by the refcount delta. Single-child
  chains are followed in a loop so deep paths don't pay a call per level.
- **Indexed dispatch.** `StructuralContainer.subscribePaths(cb)` returns a
  subscription with `setInterest(paths)`. One channel subscriber looks up each
  dirty id in a path→subscription index (`src/path-index.ts`), so a flush
  costs the consumers it wakes, not an interest check per subscriber.
  `useBloc`, its dep tracking and `useStructural` use it.
- Removed `PathInterner.ancestorIds` (its only user was the old refine loop).
- Docs: the internals page and plugins page described a "single-consumer
  skip" that no longer exists (only zero consumers skip the diff).

Structural only (`hotpath.bench.ts` R1 and a scratch 1,000-row bench, µs per
change of one item):

| Case                   | Before | Trie | Trie + index |
| ---------------------- | ------ | ---- | ------------ |
| emit, 1,000 row comps  | 65     | 22   | 12           |
| patch, 1,000 row comps | 102    | 29   | 12.5         |
| emit, 10,000 row comps | 760    | 330  | 160          |

End to end (ms per 10 updates, or per mount):

| Scenario                                  | Pre-review | Now  | Δ     |
| ----------------------------------------- | ---------- | ---- | ----- |
| Mount 1,000 rows                          | 10.6       | 10.6 | same  |
| Toggle 1 item, 100 row components         | 0.60       | 0.54 | 1.12× |
| Toggle 1 item, 1,000 row components       | 3.34       | 2.39 | 1.40× |
| Patch 1 title, 1,000 row components       | 3.79       | 2.33 | 1.63× |
| Toggle 1 item, 1 list component of 1,000  | 28.8       | 27.0 | 1.07× |
| Patch 1 key of 1,000-key map, 1,000 comps | 4.38       | 3.48 | 1.26× |

The map case was 20–40% slower than pre-review from the first pass on; the
indexed dispatch fixes it. What remains per row update is mostly React: an
update to one row clones the fibers of all its siblings, and the dev build's
profiler timers (`performance.now`) cost ~17%. P4a (every path changes) is
within ~5% of the old diff; P4b is 1.1–1.7× faster.

## Files

- engine: `src/dirty-channel.ts`, `src/scheduler.ts`, `README.md`, tests
- spatial: `src/rect-space.ts`, `src/scene-node.ts`, `src/scene-root.ts`,
  `README.md`, tests
- structural: `src/tracker.ts`, `src/container.ts`, `src/diff.ts`,
  `src/path-set.ts`, `src/react-hook.ts`, `src/index.ts`, `README.md`, tests
- blac-react: `src/expandWithAncestors.ts` deleted, imports moved to structural
- second pass: structural `tracker.ts`, `container.ts`, `react-hook.ts`,
  `path-interner.ts`, `path-set.ts`; blac-react `depSession.ts`, `useBloc.ts`;
  blac-core plugin/watch docs; spatial `scene-root.ts`; changesets
  `dirtytalk-structural-wakeups.md`, `dirtytalk-spatial-paint-frame.md`
- insomni: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `src/spatial.ts`,
  `src/damage/scene-root.ts`, `src/damage/spine.ts`, scene-root test
- changesets: `dirtytalk-engine-stability.md` (patch),
  `dirtytalk-spatial-pipeline.md` (minor), `dirtytalk-structural-perf.md`
  (structural minor, react patch)
