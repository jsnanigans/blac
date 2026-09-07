# Blac Performance Plan

Derived from `bench-report.md`, a code audit of `blac-core` / `dirtytalk-structural` /
`dirtytalk-engine`, and local measurement. Ordered by measured value, not by how bad the
report makes a number look.

## Ground rules

1. **Fix the benchmark before optimizing.** Several reported gaps are harness artifacts.
   Optimizing against them wastes effort and can regress real wins.
2. **The wins are load-bearing.** `patch 1 of 20 fields` (50µs vs Zustand 1.4ms, 27x),
   `notify 100 subscribers` (5µs vs 45µs), `subscriber with computed filter` (25µs vs 95µs),
   `getter track wide aggregate` (530µs vs 1.8ms) all come from path-tracked partial
   invalidation. Every change below must be re-checked against these four.
3. **Timer resolution is 5µs.** Every number in the report is a multiple of 5µs. Rows showing
   `StdDev 0µs / CV 0.0%` are _below resolution_, not precise. Any single-tick delta is noise;
   do not chase deltas under ~15µs.
4. **Measure per change.** Land each phase separately with before/after numbers.

---

## Phase 0 — Fix the harness (blocking, no library changes)

Until this is done the report cannot guide work.

### 0.1 Delete or rewrite the lifecycle ops — INVALID RESULTS

`apps/perf/src/libraries/zustand/pure-state.ts:322-339` — all three lifecycle ops are:

```js
const store = createStore(() => ({ count: 0 }));
void store.getState(); // no release, no dispose, no keying
```

Zustand has no acquire/release/dispose concept, so it allocates a closure and tears down
nothing. Blac does keyed registry lookup, refcounting, ownership tracking, activation and
real disposal. Redux's version has the same shape as Zustand's, which is why it also looks
absurd (332x / 346x).

The reported **179.7x** and **55.7x** measure "does refcounting exist", not speed.

Action: drop `acquire/release cycle`, `acquire shared instance` and `instance create/dispose`
from the cross-library comparison. Keep them as a **Blac-only** regression series (absolute
ms, no ratio column) — they are still useful for tracking Blac against itself.

### 0.2 Fix the React `Row` asymmetry

- `apps/perf/src/libraries/blac/FrameworkBenchmark.tsx:67` — every row calls
  `useBloc(DemoBloc)` and destructures `{ selected }`: 1000-10000 hook instances + subscriptions.
- `apps/perf/src/libraries/zustand/FrameworkBenchmark.tsx:82` — `Row` takes `isSelected` as a
  **prop** and subscribes only to two stable action fns.

These are different component architectures. Pick one shape for all libraries. This partly
explains `runLots` (699ms vs 615ms) and `add` (53ms vs 37ms).

### 0.3 Retire the mislabelled "proxy" read ops

`get state()` (`container.ts:135`) is `return this._state` — O(1), no proxy. The 455µs in
`proxy track 20 fields` / `proxy cache reuse` is 20 dynamic `` `field${j}` `` string lookups
in the _benchmark loop_. Zustand ties at exactly 455µs, which proves it measures JS property
access, not either library. Rename to `read 20 fields (baseline)` or drop.

### 0.4 Add a same-tick flush-boundary op

The Phase 1 bug only appears in a synchronous burst. Add an op that patches N times in one
tick then awaits a flush, parameterised over N = 1, 10, 100, 1000, so the O(n²) below is
visible and stays fixed.

### 0.5 Record methodology caveats

`apps/perf/README.md` documents none. Add: 5µs resolution, "ops are one sample of an
internal 1000-iteration loop", and that only Blac defines a `teardown`.

---

## Phase 1 — The real systemic bug: O(n²) same-tick mark accumulation

**This is the highest-value item and the only systemic one.** Everything else is constants.

### Mechanism (confirmed by reading, then measured)

`packages/dirtytalk-engine/src/dirty-channel.ts:60`:

```js
mark(r) {
  this.#accumulated = this.#space.union(this.#accumulated, r);   // every call
```

`pathSetUnion` (`packages/dirtytalk-structural/src/path-set.ts:12-21`) allocates a **fresh
`Set` and copies** whenever both sides are non-empty.

Blac passes **no scheduler**, so every Cubit takes the shared `MicrotaskScheduler` default
(`container.ts:40`). The flush therefore does not run until the tick ends — so a synchronous
loop of 1000 `patch()` calls never flushes, `#accumulated` grows monotonically, and each
`mark` copies the whole accumulated set. Total copying is **O(n²)** in the number of
same-tick marks.

This is live in production for any synchronous burst, not just in benchmarks.

### Correction (measured 2026-09-07): it only triggers with path-scoped consumers

`patch()` takes the zero-consumer branch (`container.ts:241`) and marks `ALL_PATHS` when no
consumer paths are registered — and `pathSetUnion` short-circuits on the `ALL_PATHS` symbol
without copying. So the O(n²) needs registered consumer paths to bite.

Instrumented `PathSetSpace.union` over 200 same-tick patches:

| scenario                       | union calls | real Set copies |
| ------------------------------ | ----------- | --------------- |
| with path-scoped consumer      | 199         | **198**         |
| without (zero-consumer branch) | 199         | **0**           |

`registerConsumerPaths` is called only from the React hooks (`blac-react/src/useBloc.ts:339`,
`dirtytalk-structural/src/react-hook.ts:33,60`) — never from the pure-state benchmarks.

**Consequences:**

- The bug is real and hits **real React apps** (any component subscribed via `useBloc` while
  something patches repeatedly in one tick), which is the case that matters most.
- It is **not** the cause of the `derived state computation` (2.7x) or
  `batch rapid updates` (2.0x) pure-state gaps — those have no consumer paths, so they never
  copy. My earlier attribution of those two rows to this bug was wrong; their residual gap
  belongs to the Phase 2 constants.
- Phase 0.4's new op must call `registerConsumerPaths` (or drive the burst through a mounted
  `useBloc` component), otherwise it will measure the zero-copy path and show nothing.

### Measured cost (median of 15, Node)

Simulating 1000 same-tick marks with the current `union`:

| distinct paths | current | mutable accumulator | speedup |
| -------------- | ------- | ------------------- | ------- |
| 1              | 72.4µs  | 47.4µs              | 1.5x    |
| 5              | 43.4µs  | 21.6µs              | 2.0x    |
| 20             | 98.6µs  | 24.2µs              | 4.1x    |

Even bounded at 1-20 paths this exceeds the entire 40µs budget of
`derived state computation` (40µs vs Zustand 15µs) and `batch rapid updates` (40µs vs 20µs).
It also explains the variance spikes (CV 90-168%, max 1.3-1.5ms) as `Set` growth + GC.

### Fix

Give the channel a **mutable accumulator**. `#accumulated` is private and wholly owned by
the channel; it is snapshotted and replaced at `dirty-channel.ts:90-91`, so mutating it in
place between flushes is unobservable.

Add an optional `unionInto(acc, r)` to the `Space` interface that may mutate `acc`, keeping
pure `union` as the fallback for spaces that do not implement it. For `PathSetSpace`,
`unionInto` adds `r`'s ids into `acc` and returns `acc` — zero allocation on the hot path.
Preserve the `ALL_PATHS` short-circuit and the `size === 0` fast paths exactly.

Rejected alternative: a subset pre-check before copying. Measured _worse_ in the common
1-5 path cases (50µs/61µs vs 47µs/22µs) and inconsistent. Discarded.

### Outcome (landed, measured 2026-09-07)

Implemented as `Space.unionInto?` (opt-in, documented exception to the purity contract),
resolved once in the `DirtyChannel` constructor, with `PathSetSpace.unionInto` adding in
place. `ALL_PATHS` absorption and the empty fast paths are preserved; the accumulator is
copied on first add so it can never alias a caller's set.

Verified on the real code path: per-mark `Set` copying during a 200-mark burst went
**198 → 0**, and a subscriber still gets one coalesced flush with the full path union.

Controlled A/B (median of 15, 1000 same-tick patches, `unionInto` toggled off/on):

| consumer paths | before  | after   | saved |
| -------------- | ------- | ------- | ----- |
| 1              | 506.0µs | 443.6µs | 12%   |
| 5              | 562.0µs | 490.3µs | 13%   |
| 20             | 602.5µs | 512.7µs | 15%   |

**Correction to the projection above:** the isolated microbenchmark predicted 1.5-4.1x, but
the real gain is 12-15%. The isolated test measured `union` in a vacuum; in the real `patch`
path `union` was only ~13% of the work, with `deepMerge` and `changedPathsFromPatch`
dominating. The O(n²) is genuinely gone — it just wasn't the majority of the cost. Treat the
earlier 1.5-4.1x table as an upper bound on the `union` component alone, not on `patch`.

This also means the remaining burst cost is now concentrated in `deepMerge` /
`changedPathsFromPatch`, which is where further work on this path should go (see Phase 2.5).

### Gotcha found while verifying

`@dirtytalk/engine` resolves to `dist/`, not `src/` — engine source edits do nothing until
`pnpm --filter @dirtytalk/engine run build` runs. The perf app aliased `structural` to source
but not `engine`, so it would have benchmarked a stale prebuilt engine and silently shown no
change. Alias added to `apps/perf/vite.config.ts`.

### Risk

Medium — touches the shared engine, so it affects every consumer, not just Blac.
`#accumulated` must never be handed out uncopied: `#flush` already replaces it with
`space.empty()` before invoking subscribers, so the snapshot passed to callbacks stays
immutable. Verify no other code path retains a reference. Full engine + structural + core
suites must pass unchanged.

---

## Phase 2 — Free, safe per-call constants

Individually small (single-digit to low-tens of ns); collectively they are most of the
residual gap on one-field containers once Phase 1 lands. All are local and low-risk.

### 2.1 Cache the interner as an instance field

`container.ts:139-141` — `get interner()` does a `WeakMap.get()` on **every** `patch`/`emit`
(`:249`, `:186`) and four more times inside the refine loop (`:372`, `:373`, `:397`, `:406`).
It is keyed by `this.constructor` and never changes for an instance. Assign it once in the
constructor. Free.

### 2.2 Hoist the `_refineAncestorMarks` fast exit

`container.ts:369-380` allocates a throwaway `Set` (`targetIds`) and `Array`
(`nonAncestorIds`) on every consumer-attached patch, then discovers at `:380` there was
nothing to refine and returns `rough` unchanged. For a plain-field patch — the common case —
that is two wasted allocations. Detect "no ancestor-watch marks" before allocating.

### 2.3 Drop the duplicate `generateSimpleId`

`StateContainer.ts:485-519` (`[INIT_CONFIG]`) recomputes `_instanceId` when the field
initializer at `:319` already computed one. Each call does `Date.now()` +
`Math.random().toString(36)`. Removes one per construction.

### 2.4 De-per-instance `createMeta`

`meta.ts:100-163` allocates **two** getter-bearing object literals, `Object.freeze`s both,
and calls `Object.defineProperty` on **every** instance. This is the single largest
construction cost. Move the getters to a shared prototype/shape so per-instance work is one
small object holding the closed-over fields. `$blac` is a documented public surface — keep
enumerability, freezing and the brand identical, and keep the meta tests green.

### 2.1 / 2.2 outcome: LANDED

Warmed A/B (median of 31, 1000 patches on a 20-field container, tracked consumer):

| consumer paths | interner uncached | cached (2.1 + 2.2) | saved |
| -------------- | ----------------- | ------------------ | ----- |
| 1              | 327.3µs           | 326.9µs            | ~0%   |
| 20             | 492.8µs           | 426.4µs            | 13%   |

As predicted, the win scales with how often the refine loop touches the interner: nothing
at one path, 13% at twenty. Note that an unwarmed harness reported 525µs/617µs for the same
code — always warm before comparing, or the noise swamps the effect.

### 2.3 outcome: LANDED, but no measurable headline effect

`_instanceId` is now generated on first `$blac.id` read instead of in a field initializer
(verified: `_instanceId` is `undefined` after `new`, materializes on read, stable across
reads). Construction stayed at ~1309µs vs the 1306µs baseline — the deferred `Date.now()` +
random base-36 string is a small slice of the ~1.3µs total. Kept because it is strictly less
work and correct, not because it shows up in the benchmark.

**Regression caught during this:** the first attempt made `_instanceId` a `private get`,
which put an accessor on the prototype. `devtools-connect` enumerates prototype getters to
find user-defined ones, so two of its tests failed with `expected { Object (_instanceId) }
to be undefined` — an internal was leaking into devtools output as bloc state. Fixed by
keeping `_instanceId` a plain optional field and moving the lazy fill into `createMeta`'s
`id` getter. Do not turn container internals into prototype accessors.

### 2.4 outcome: ABANDONED — measured, reverted

Confirmed the cost first: `createMeta` is **690µs per 1000 calls, ~53% of the 1306µs** that
1000 × (`new` + `dispose`) costs. So the target was real.

Tried moving the accessors to two shared frozen prototypes, with the container in one own
`Symbol` slot via `Object.create`. Result: construction **1306µs → 1129µs (14% faster)**, all
682 core tests green including the `isFrozen` and `META_BRAND` assertions.

But it silently changed observable public API. Prototype accessors are not own-enumerable, so:

- `Object.keys($blac)` returned `["hydration"]` instead of all seven keys.
- `JSON.stringify($blac)` returned `{"hydration":{}}` instead of the full object.

No test covered this, but `$blac` is a documented public surface, so that is a breaking
change, not a free win. Restoring enumerability with reused own-accessor descriptor
templates spread into `Object.create` measured **1877µs — 44% worse than baseline**: the
descriptor-map walk costs more than the original object literals it replaced.

Both viable outcomes are unacceptable, so this was reverted. The accessor-literal cost is
the price of `$blac`'s enumerable-live-getter contract. Do not retry without first changing
that contract (e.g. accepting non-enumerable members in a major version), and re-measure —
`Object.create` with descriptor maps is not the answer.

### 2.5 Single-key scalar fast path in `patch`

`container.ts:228` calls `deepMerge` before it can prove nothing changed. For the very common
single-key primitive patch, compare first and bail with zero allocation. Must preserve
`deepMerge`'s reference-return no-op contract that `changedPathsFromPatch` relies on.

### 2.5 outcome: SKIPPED — premise was wrong, no win available

The premise was that `deepMerge` allocates before it can prove nothing changed. It does not:
`out` is materialized only on the **first changed key** (`container.ts:468`), so a pure no-op
patch already allocates nothing and just compares.

Measured (median of 21, 1000 patches on a 2-field container):

| case                              | cost   | per patch |
| --------------------------------- | ------ | --------- |
| redundant patch, tracked consumer | 46.8µs | ~47ns     |
| changing patch, tracked consumer  | 246µs  | ~246ns    |
| redundant patch, no consumer      | 26.7µs | ~27ns     |

The no-op path is already ~5x cheaper than a real patch. A single-key scalar fast path would
save a fraction of ~47ns while adding a branch to the _hot_ changing path and more code to
`patch`'s already subtle no-op contract. Not worth it — skipped on YAGNI/KISS grounds.

The `changing patch` figure is the real remaining cost centre on this path
(`deepMerge` + `changedPathsFromPatch`), matching Phase 1's conclusion.

### Explicitly rejected

**Do not delete the `for...in` pre-check at `container.ts:222-227`.** It was suggested as
redundant. It is not: `deepMerge` (`:457`) returns `patch` **wholesale** when either side is
not a plain object, so the guard also protects the non-plain-patch path — and
`container.test.ts:145` tests it as an "allocation-free check". It is a ~2ns `for...in` over
an empty object. Removing it trades a documented invariant for nothing measurable.

---

## Phase 3 — Verify, then re-baseline

1. Re-run pure-state + React suites after **each** phase; keep the numbers.
2. Guard the four wins in ground rule 2 — treat >10% regression on any as a blocker.
3. Profile `derived state computation` and `batch rapid updates` in Chrome DevTools to
   confirm Phase 1 removed the `Set`-allocation/GC profile rather than just moving it.
   Static reading cannot settle GC attribution.
4. Re-check variance: CV on `redundant patch` and `proxy track 1 field` should collapse
   toward the other rows if Phase 1 was the cause.
5. Only then judge what remains. Expect the 1.2-1.5x band to be at or under the 5µs noise
   floor and not worth further work.

---

## Phase 4 — Constant-factor pass (landed 2026-09-07)

Profiled the report's slow rows in Node (`--cpu-prof` on a vitest bench that mirrors the
`apps/perf` ops) instead of reading code. The profile disagreed with the report's framing on
two points: `createMeta` was 44% of `construct + dispose`, and the tracked-consumer patch
lane was dominated by `_refineAncestorMarks` + ancestor-mark interning, not by `union`.
On the React side `buildTrackedProxy` (a full prototype walk per mounted component) was the
single largest library frame, ahead of `useBloc` itself.

### What changed

- **engine** — `DirtyChannel` keeps the first mark of a cycle by reference and only copies
  on the second (`#owned` flag), so no `empty()` Set per instance or per flush; the
  multi-subscriber flush iterates the map up to the flush-start id instead of `Array.from`.
- **structural** — `changedPathsFromPatch` emits no ancestor-watch mark for a
  primitive→primitive change (nothing can have read below a primitive), which makes
  `_refineAncestorMarks` exit before allocating on the common scalar patch;
  `internAncestorOf(id)` and `ancestorWatchIds(id)` memoize per id so the hot paths do no
  string work; `ancestorIds` marks complete entries final so unrelated interning no longer
  invalidates them; `_applyRefDelta` touches only the symmetric difference; `deepMerge`
  iterates with `for...in` and `isPlainPatchObject` drops the redundant `Array.isArray`;
  `_equalsByPathId` and the tracker's `pinned` set are allocated only when used; with a
  `ProxyCache` the tracker no longer allocates a per-render `WeakMap` + `Map`, and prune
  compares sessions instead of copying prefix keys into a Set.
- **core** — `$blac.hydration` is built on first access (9 closures + a freeze that most
  containers never used); `_systemEventHandlers`, `_deps`, `_config` start shared/null;
  `shallowEqualState` uses `for...in` (no key arrays); `patch`/`applyState` read raw state
  via `super.state` (inside a tracked getter `this.state` is the render proxy); the registry
  builds the `INIT_CONFIG` object only on create.
- **react** — prototype getters are collected once per class (`WeakMap`) instead of per
  mount; getters are passed to `[WITH_TRACKED_STATE]` directly (no thunk per read); the
  hook's dozen `useRef`s collapsed into the existing `Consumer` object; `ProxyCache` and the
  dep-wrapper map are allocated lazily; `disarm` runs in the commit layout effect instead
  of `queueMicrotask` (one microtask per render per hook gone); `expandWithAncestors` uses
  the memoized ids and returns `paths` itself when nothing expands.

### Measured (Node 24, same harness, before → after; core rows are per 1000 ops)

| op                                      | before       | after        | change |
| --------------------------------------- | ------------ | ------------ | ------ |
| patch 1 field, no consumer              | 51.1µs       | 45.0µs       | −12%   |
| emit + getter                           | 29.9µs       | 25.6µs       | −14%   |
| same-tick burst 1000 (tracked consumer) | 374µs        | 274µs        | −27%   |
| construct + dispose                     | 1.45ms       | 0.92ms       | −37%   |
| redundant patch / multi-store           | 28.7 / 150µs | 27.0 / 149µs | noise  |
| React: mount 1000 subscribed rows       | 32.6ms       | 26.0ms       | −20%   |
| React: add 1000 → 2000 rows             | 32.9ms       | 27.1ms       | −17%   |
| React: select (re-render 1000 rows)     | 11.9ms       | 8.6ms        | −28%   |

A Zustand-like `setState` control ran 18.5 → 17.9µs, so the harness itself did not move.
The browser report has not been re-run; the ratios there need `apps/perf` in Chrome.

### Not done, on purpose

- `IS_DEV` (`constants.ts`) is `true` whenever `process` is undefined, i.e. in a plain
  browser production bundle unless the bundler injects `process`. That ships the emit-rate
  breaker, the `APPLY_DEPS` collision scan and the acquire args-mismatch `structuralKey` into
  production. Flipping the default is a behaviour change worth its own decision.
- `createMeta` still allocates seven getter closures per instance; the enumerable-own-getter
  contract (see 2.4) is the floor without a contract change.
- Per-row `selected === item.id` reads re-render every row on select because tracking is
  value-level; `select:` is the tool for derived booleans. Same for Zustand without a
  selector.

## Phase 5 — Second profile pass (landed 2026-09-07, after the Phase 4 browser re-run)

The browser re-run confirmed Phase 4 (React sub-rows now beat Zustand on `run`/`add`,
`instance create/dispose` 695 → 455µs, `same-tick burst` 190 → 105µs) and left three
targets: the flat `patch`/`emit` fixed cost (~40 vs ~20µs per 1000), `acquire/release`
(2.3ms per 1000 cycles), and the React `swapRows` render column (1.8ms vs 0.8ms for
Zustand, on both row variants — i.e. the parent's list read, not the rows).

Profiling again found the causes elsewhere than expected:

- **`acquire/release` spent 48% constructing `AbortError` DOMExceptions**: every
  deactivation/dispose called `AbortController.abort()` with no reason, which builds a
  fresh exception (stack trace included).
- **Mapping 1000 rows through the tracked proxy cost ~600ns per element**, 79× the raw
  `map`. `Array.prototype.map` fires the `has` trap _and_ the `get` trap per index, each
  of which built `\`${prefix}.${key}\``and hashed it into the interner; the`ProxyCache`was keyed by that string too and pruned every touched target on`disarm`.
- **Bare construction still allocated five collections** (`_consumerPaths`,
  `_pathRefCounts`, `_skeletonSet`, the channel's subscriber map, and a registry `WeakMap`
  entry) that a container nobody tracks never uses.
- The Node harness resolved `@dirtytalk/engine` to its stale `dist`; the browser bench did
  not. `blac-core` and `blac-react` vite configs now alias the engine to source as well.

### What changed

- **engine** — `DirtyChannel.#subscribers` is allocated by the first `subscribe`; a flush
  with no subscriber map returns before entering flushing mode.
- **structural** — `patch` drops its empty-patch pre-scan (`deepMerge` already returns the
  target for an empty patch) and `deepMerge` recurses only when both sides are objects, so
  primitive leaves never call `isPlainPatchObject`; `PathInterner.internChild(parentId,
key)` resolves a child id through a per-parent cache (no string concat or re-hash) and
  both tracker traps use it; `ProxyCache` is keyed by `(target, prefix id)` and only entry
  maps that hold more than one prefix are pruned on `disarm` (a single-entry map cannot be
  stale); consumer bookkeeping lives in one `ConsumerIndex` allocated by the first
  `registerConsumerPaths`.
- **core** — `_abortActivation` aborts with one shared `AbortError` reason (same `name`,
  no per-call exception); the registry's `_entryByInstance` WeakMap is gone — `_entryById`
  plus an identity check already answers `_pruneEntry`, and a bare instance's `$blac.id`
  is a cheap `<name>:main` concat; `INIT_CONFIG` resolves the class name once.

### Measured (Node 24, same harness, Phase 4 landed → now; per 1000 ops)

| op                                  | before  | after   | change |
| ----------------------------------- | ------- | ------- | ------ |
| acquire/release cycle               | 8.15ms  | 1.76ms  | −78%   |
| map 1000 rows through tracked proxy | 0.594ms | 0.228ms | −62%   |
| emit + getter                       | 25.6µs  | 23.6µs  | −8%    |
| redundant patch                     | 27.0µs  | 24.6µs  | −9%    |
| patch 1 field, no consumer          | 45.0µs  | 44.1µs  | flat   |
| construct + dispose                 | 0.92ms  | 0.95ms  | noise  |

The jsdom React harness (mount/add/select/swap/unmount of 1000 subscribed rows) moved
within its ±10% run-to-run noise in both directions; the list-read saving is ~0.4ms on an
~8ms swap, so only the browser `swapRows` render column can resolve it.

### Not done, on purpose

- **`$blac` as a class** (prototype getters, one `#private` back-reference) measured
  `construct + dispose` 0.95 → 0.19ms per 1000 with all 682 core tests green, but it makes
  the members non-enumerable — the exact contract 2.4 decided to keep. Reverted; the
  numbers are here for when that contract is revisited.
- The `Object.getOwnPropertyDescriptor` guard before wrapping a child value is 12% of the
  list-read path, but it is what keeps a non-configurable, non-writable own property
  (frozen state) from throwing the Proxy `[[Get]]` invariant. Kept.
- `new AbortController()` is ~8% of an acquire/release cycle; skipping it when
  `onActivate` is not overridden and no plugin listens for `activated` needs the registry
  to tell `SET_ACTIVE` whether a signal is observed. Deferred.
- The remaining `patch` fixed cost (~44 vs ~18ns for a bare `Object.assign` store) is the
  two `Object.getPrototypeOf` plain-object checks, the three-level `patch` override chain
  and the mark/schedule call; nothing left there is a single hot spot.

## Expected outcome

- Phase 0: two bogus "critical" rows (179.7x, 55.7x) removed; React and read-op numbers
  become meaningful. No code change.
- Phase 1: the `derived state computation` (2.7x) and `batch rapid updates` (2.0x) gaps
  should largely close, and the variance spikes should disappear. Benefits any synchronous
  burst in real apps.
- Phase 2: shaves the remaining fixed overhead on tiny containers and cuts construction cost,
  which is what the (now Blac-only) lifecycle series measures.
- Phases 1+2 should move the geometric mean well below the reported 1.62x; the honest
  post-Phase-0 starting point will be lower than 1.62x anyway, since that figure includes
  the invalid rows.

## Non-goals

- `proxy track 20 fields` / `proxy cache reuse` vs Redux — measures benchmark string
  lookups, not Blac (see 0.3).
- Trading path-tracking for a lower per-patch constant. It is why Blac is 27x faster on
  `patch 1 of 20 fields`.
- Chasing sub-15µs deltas (below the 5µs-resolution noise floor).
