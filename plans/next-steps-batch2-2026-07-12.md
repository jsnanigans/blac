# Plan: Next-Steps Roadmap (Batch 2 full spec + Batch 3+ sketches)

Verified against HEAD `31df4ae9` (fish shell for all commands below). Batch 1
(`cda18072`/`b0149392`/`d4cf1fae`/`2059ba9e`) is fully shipped and excluded.
Re-verification during this planning pass found **three more items already
shipped** that the source reports listed as open — noted inline and excluded.

## Decision
**Approach**: Batch 2 = every remaining item ranked correctness/leak or
reliability-latent-hazard, plus the two zero-risk dead-code deletions, grouped
into 6 small commits across 3 files/packages. All perf-tier items (DirtyChannel
fast-path, PathInterner memo, `deepMerge` lazy-clone, path-trie, inverted
index) move to Batch 3+ — per the stated priority order
(correctness/leaks > latent hazards > perf > hygiene), and because batch
cohesion favors keeping this batch to "one sitting" the size of batch 1.
**Why**: R3 (PluginManager backfill) and the ProxyCache leak are the only
remaining items that hit real running apps today; the Scheduler
cross-contamination bug is a latent hazard worth closing before anyone adopts
shared schedulers (a plausible follow-on to the shipped per-flush perf work);
`getConsumerPaths()` and the two dead-code deletions are free wins that round
out the batch without adding risk.
**Risk Level**: Medium (ProxyCache eviction + Scheduler interface touch are
the two real-risk items; everything else is Low).

## Already-shipped items found during re-verification (exclude, do not re-plan)
- **F1** (`path-set.ts` `intersects` 2-element array alloc) — fixed in
  `31df4ae9` (branch-free small/large selection, no destructure).
- **F4** (registry dev-warn double-`structuralKey`) — fixed in the same
  commit (`entry.argsKey ??= structuralKey(entry.args)`,
  `StateContainerRegistry.ts:390`).
- **F3 / review #2** (`deepMerge` `__proto__` pollution) — fixed in batch 1
  (`setMergedKey` helper, `container.ts:436-451`), including the forward
  comment flagging the lazy-clone rewrite must carry the guard.
- **R1/R2/R4** (registry self-prune, `depend()` dependent-edge sweep, `dispose()`
  footgun) — fixed in batch 1 (`StateContainerRegistry.ts` constructor,
  `_handleDisposed`/`_pruneEntry`/`_releaseDependent`; `depend()` now calls
  `acquire(..., { dependent: this })`, `StateContainer.ts:321-326`).

## Prioritized Roadmap

| Item | Batch | Category | Effort | Risk | Rationale |
|---|---|---|---|---|---|
| PluginManager.install() backfill existing instances | 2 | Reliability | S/M | Low | Real ordering bug: late-installed plugins silently miss live instances |
| Scheduler.cancel(flush) scoped cancel | 2 | Reliability | M | Med | Latent cross-container hazard; gates future shared-scheduler use |
| ProxyCache prune to touched prefixes | 2 | Memory | M | Med | Real unbounded leak on reorder/filter workloads |
| getConsumerPaths() returns snapshot, not live Map | 2 | Architecture | S | Low | Cheap safety fix, no behavior change for existing callers |
| Delete dead `generateId`/`globalCounters`/`createIdGenerator`/`__resetIdCounters` | 2 | Hygiene | S | None | Confirmed zero callers outside own tests |
| Delete dead `Signal`/`primitives.ts` | 2 | Hygiene | S | None | Confirmed zero callers, not exported from index.ts |
| DirtyChannel `size<=1` flush fast-path | 3 | Perf | S | Med | Re-entrancy contract needs care; ready to ship, just perf-tier |
| PathInterner `_ancestorIds` length-versioned memo | 3 | Perf | M | Med | Needs the leaf-only-consumer regression test first |
| PathInterner dev-mode size-threshold warning | 3 | Memory/DX | S | Low | Cheap add-on once path-interner.ts is open for the memo fix |
| `deepMerge` lazy-clone rewrite (execute `plans/patch-emit-redundant-diff-clone.md`) | 3 | Perf | S/M | Low-Med | Plan already fully written; just needs an implementer slot |
| `_refineAncestorMarks` path-trie | 3 | Perf | L | Med | Needs real trie design; sketch only until then |
| `dirty-channel` onError default / doc | 3 | Reliability | S (doc) / API (default) | Low (doc) | Default-onError changes a pinned test (`dirty-channel.test.ts:419-428`); doc-only is safe, behavior default needs sign-off |
| `watch()` per-instance dispose hook (F6) | 3 | Perf/API | M | Med | Needs new lifecycle API design |
| `emit()` opt-in `skipEqualityCheck` (F5) | 3 | Perf/API | S | Med | Public surface change, needs maintainer sign-off |
| `useStructural`/`useBloc` shared mount-gap helper | 3 | Architecture | M | Med | Needs a home (new shared internal module) design decision |
| DirtyChannel inverted index (F3, large ceiling) | 4 | Perf | L | Med | Prototype behind `hotpath.bench.ts` before committing, per report |

## Batch 2 — Full Spec

### 1. `PluginManager.install()` backfills existing instances
**File**: `packages/blac-core/src/plugin/PluginManager.ts`
- In `install()` (`:98-138`), after `plugin.onInstall` succeeds, iterate
  `this.registry.getTypes()` and for each `Type`, `this.registry.getAll(Type)`
  (skips disposed automatically). For each live instance: call
  `this.attachStateBridge(instance)` (idempotent — already guards
  `containerBridges.has(container)` at `:267`) and
  `this.notifyPlugins('onCreated', instance)` scoped to the newly-installed
  plugin only (build a one-off dispatch, not the broadcast `notifyPlugins`
  which would re-notify *all* plugins of *all* instances — only the new
  plugin should see the backfill "created").
- Concretely: add a private `backfillPlugin(installed: InstalledPlugin): void`
  that loops `getTypes()`/`getAll()`, calls `attachStateBridge(instance)`, and
  — only if `installed.plugin.onCreated` exists — calls it directly with a
  freshly-built context (reuse `buildContext(instance)`), inside the same
  try/catch pattern as `notifyPlugins`. Call `this.backfillPlugin(this.plugins.get(plugin.name)!)`
  right after the `this.plugins.set(...)` line, before `plugin.onInstall`
  fires (existing instances should be visible when `onInstall` runs, matching
  what a plugin installed at app-start would see).

### 2. Scheduler cancel scoped to the caller, not the whole scheduler
**Files**: `packages/dirtytalk-engine/src/scheduler.ts`,
`packages/dirtytalk-engine/src/dirty-channel.ts`
- Change the `Scheduler` interface: `cancel?(flush: () => void): void` (widening
  from 0-arg; existing 0-arg implementers remain structurally assignable —
  TS allows fewer params — so this is not a breaking type change for any
  external `Scheduler` implementer who ignores the argument).
- `MicrotaskScheduler.cancel`/`RAFScheduler.cancel` (`scheduler.ts:68-71`,
  `:135-140`): accept `flush`, `this.#pending.delete(flush)` instead of
  reassigning a new `Set()`; only clear `#scheduled` when `#pending.size === 0`
  after the delete (leave other callers' pending flushes untouched and still
  scheduled).
- `RAFScheduler.cancel` additionally must NOT call `#unschedule()` (which
  cancels the rAF/timeout entirely) unless `#pending` becomes empty after the
  delete — otherwise one container's cancel would still kill the shared
  frame callback for every other pending flush.
- `dirty-channel.ts` `dispose()` (`:166-169`): change
  `this.#scheduler.cancel?.()` to `this.#scheduler.cancel?.(this.#boundFlush)`.
- `ManualScheduler` has no `cancel` method today (optional in the interface) —
  leave as-is, out of scope.

### 3. ProxyCache prunes stale `(target, prefix)` entries per render
**File**: `packages/dirtytalk-structural/src/tracker.ts`
- In `trackRender` (`:266-`), when `cache !== undefined`, track which targets
  were touched this call: add `const touchedTargets = cache !== undefined ? new Set<object>() : undefined;`
  near `proxyByTarget` (`:304`), and `touchedTargets?.add(target)` at the top
  of `wrap()` (`:306`) before the cache lookup.
- After the tracked value is fully computed (end of `trackRender`, where the
  result is returned), if `touchedTargets` is defined, for each `target` in
  it: read `proxyByTarget.get(target)` (the per-call `Map<prefix, proxy>` —
  this call's authoritative touched-prefix set for that target) and replace
  `cache`'s stored `Map` for that target with a fresh one containing only
  those prefixes' cache entries (look each up via `cache._get(target, prefix)`
  before it's overwritten, or track `CachedProxyEntry` objects directly
  instead of re-deriving). Simplest implementation: add a
  `ProxyCache.prune(target: object, keepPrefixes: Iterable<string>): void`
  internal method that rebuilds `byTarget.get(target)` filtered to
  `keepPrefixes`, called once per touched target after tracking completes.
- Zero-cost when no `cache` is supplied (matches existing "cache=undefined
  path allocates nothing new" invariant pinned by tests).

### 4. `getConsumerPaths()` returns a safe read
**File**: `packages/dirtytalk-structural/src/container.ts`
- `getConsumerPaths()` (`:156-158`): return `new Map(this._consumerPaths)`
  instead of the live Map. `ReadonlyMap` return type is unchanged; this only
  removes the ability for a caller to mutate the real registry. Devtools/inspection-only,
  no hot-path caller exists today (confirm via `rg -n "getConsumerPaths"` before
  changing — only test/inspection call sites expected).

### 5 & 6. Dead-code deletions
- **`packages/blac-core/src/utils/idGenerator.ts`**: delete `generateId`,
  `globalCounters`, `createIdGenerator`, `__resetIdCounters`; keep
  `generateSimpleId` (the only consumed export, used by
  `StateContainer.ts:271,380`). Trim `idGenerator.test.ts` to only the
  `generateSimpleId()` and `Edge Cases` (`generateId`-only cases removed)
  describe blocks — delete the `generateId()`, `createIdGenerator()`, and
  `__resetIdCounters()` describe blocks (lines 17-71, 108-171, 173-198)
  and the `resetState`/`beforeEach`/`afterEach` wiring if nothing else needs it.
- **`packages/dirtytalk-engine/src/primitives.ts`** and
  **`primitives.test.ts`**: delete both files (confirmed unexported from
  `index.ts`, zero external callers via `rg -n "primitives|Signal\b"` across
  `packages`/`apps`).

## Tests (batch 2)
- `PluginManager.test.ts` (or new): install plugin B after instance A of some
  registered Type already exists → B's `onCreated` fires for A, and B's
  `onStateChange` fires on A's next flush (bridge attached).
- `scheduler.test.ts`: two `request()` calls with different flush fns →
  `cancel(flushA)` only prevents `flushA`; `flushB` still runs on next
  drain/pump/rAF tick. Update existing 0-arg `cancel()` call sites
  (`scheduler.test.ts:213,223,304`) to pass a flush reference.
- `dirty-channel.test.ts` tests 25/26/28 (`cancel` call-count assertions):
  update spy assertions to also check the `flush` arg was `#boundFlush`
  (`toHaveBeenCalledWith`), or leave as call-count-only if that's sufficient.
- `tracker.test.ts`: new case — read `list[3].name` across 3 renders, each
  time an item shifts to a new index; after the 3rd render, cache's retained
  prefix count for the shared object stays bounded (only the current index's
  prefix survives), not growing per render.
- `container.test.ts`: `getConsumerPaths()` returned Map mutation does not
  affect a subsequent `emit`'s skeleton/dirty computation.
- `idGenerator.test.ts`: trimmed suite still passes for `generateSimpleId`.

## Changesets / semver
- `@blac/core`: patch (PluginManager backfill is additive/bugfix; idGenerator
  deletion is internal, unexported symbols).
- `@dirtytalk/engine`: minor (widened `Scheduler.cancel` signature is a public
  type surface change, even though non-breaking structurally); Signal deletion
  noted in the same changeset as "removed unused, never-exported experimental API."
- `@dirtytalk/structural`: patch (ProxyCache/getConsumerPaths are internal-behavior
  fixes, no public API shape change).

## Suggested Commit Breakdown
1. `fix(blac-core): backfill existing instances on plugin install`
2. `fix(dirtytalk-engine): scope scheduler cancel to the caller's flush`
3. `fix(dirtytalk-structural): evict stale ProxyCache entries per render`
4. `fix(dirtytalk-structural): return a snapshot from getConsumerPaths`
5. `chore(blac-core): remove unused generateId/globalCounters`
6. `chore(dirtytalk-engine): remove unused Signal primitive`

## Batch 3+ Sketches (design-decision level)
- **DirtyChannel `size<=1` fast-path**: key question — does the single-entry
  fast path check `entry.alive` and re-verify no new subscriber landed via
  `interest()`'s own side effects before invoking `cb` directly? Answer that,
  then it's a small diff in `#flush` (`dirty-channel.ts:104`).
- **PathInterner ancestor-memo versioning**: key question — version by
  `_paths.length` snapshot at cache time (report's recommendation) vs.
  invalidate only entries whose path is a prefix-superset of the newly
  interned path. Recommend length-versioning (O(1) check); write the
  leaf-only-consumer regression test *before* touching `intern()`/`ancestorIds()`.
- **`deepMerge` lazy-clone**: execute `plans/patch-emit-redundant-diff-clone.md`
  as-is (Option B already chosen there); no new design decision, just needs
  an implementer slot in a batch that isn't already deep in `container.ts`
  churn (batch 2 doesn't touch `container.ts`'s `deepMerge`, so batch 3 is clean).
- **`_refineAncestorMarks` path-trie**: key question — trie node granularity
  (per-segment vs per-full-path) and whether it's built lazily per-skeleton-change
  or maintained incrementally alongside `_pathRefCounts`. Needs a spike before
  a real plan.
- **DirtyChannel inverted index (F3)**: key question — incremental index
  upkeep cost on interest change vs. rebuild-on-change; report says prototype
  behind `hotpath.bench.ts` and measure before committing to the design.
- **`watch()` per-instance dispose hook (F6)**: key question — does the
  registry gain a per-Type or per-instance disposal channel (avoiding the
  current O(watchers × app-disposals) global listener), and is that channel
  public API or `@internal`?
- **`emit()` skipEqualityCheck (F5)**: key question — opt-in per-call
  (`emit(next, {skipEqualityCheck:true})`) vs. per-class static flag; per-call
  is safer (caller has proof this specific call built a fresh object) — needs
  maintainer sign-off since it's new public surface.
- **`useStructural`/`useBloc` shared helper**: key question — where does the
  shared register→subscribe→mount-gap→layout-effect helper live (new
  `@dirtytalk/react-shared`-style internal module vs. one package depending
  on the other)? `dirtytalk-structural` cannot depend on `blac-react`
  (wrong direction), so the helper likely needs a new home or moves into
  `dirtytalk-structural`'s `react.ts` for both to import.
- **`dirty-channel` onError default/doc**: ship the doc-only fix anytime
  (README/JSDoc on `StructuralContainerOptions.onError` warning that omitting
  it + `MicrotaskScheduler`/`RAFScheduler` throws inside a bare microtask/rAF
  callback — no test impact). The default-to-`console.error` behavior change
  is a separate, maintainer-approved decision (breaks
  `dirty-channel.test.ts:419-428`'s pinned "rethrows" case intentionally).

## Not Doing (with why)
- **`react-hook.ts` missing `ProxyCache`** (dirtytalk render-perf report) —
  affects only direct `dirtytalk-structural` React users, not blac's
  `useBloc` (which already has its own cache). No blac consumer; low priority,
  revisit only if a direct-`dirtytalk-react` user reports it.
- **Spatial perf items** (`rect-space.ts` P2, `intersects` P3, `scene-node.ts`
  P7) — `dirtytalk-spatial` has a real consumer (`apps/examples` canvas) but
  none of it sits on blac's render path; defer until/unless someone profiles
  the canvas demo specifically.
- **Signal-set P8** ("Signal snapshot+eager errors per set") — moot once
  batch 2's dead-code deletion removes `Signal` entirely.
- **Re-depend-with-different-args overwrite quirk in `_dependencies`** —
  pre-existing, already explicitly tested/accepted behavior per batch 1's
  own out-of-scope note; not a bug.
- **`StateContainer.patch()`'s own pre-check / `emit()`'s `shallowEqualState`
  full scan** (Option A/C from `patch-emit-redundant-diff-clone.md`) —
  explicitly rejected in that plan: pre-check gates other bookkeeping,
  `shallowEqualState` is the only safety net against caller-mutated-in-place
  objects and is user-configurable; not worth the correctness risk for a
  marginal win once the `deepMerge` lazy-clone lands.
- **`ManualScheduler.cancel`** — no `cancel` method exists and no report asked
  for one; adding it speculatively is out of scope.

## Risks & Mitigations (batch 2 overall)
**Main Risk**: the Scheduler interface change and ProxyCache eviction are the
two items touching shared/cached state; a bug in either silently drops a
legitimate pending flush or a legitimate cached proxy (correctness regression,
not a crash). **Mitigation**: the test list above pins exact behavior (two
independent flushes; bounded-cache-size-under-index-churn) before either
ships; both are single-file, single-mechanism changes reviewable independently
of the other batch-2 items.

## Validation (targeted only — do not run repo-wide)
```fish
cd packages/blac-core; vp test run PluginManager.test.ts idGenerator.test.ts
cd packages/dirtytalk-engine; vp test run scheduler.test.ts dirty-channel.test.ts
cd packages/dirtytalk-structural; vp test run tracker.test.ts container.test.ts
vp run format:check  # scoped to touched files per CLAUDE.md guidance
```

## Out of Scope
- Everything in the Batch 3+ / Not-Doing sections above (see rationale there).
- Any repo-wide test/lint/typecheck run — implementer runs only the targeted
  suites listed above.
