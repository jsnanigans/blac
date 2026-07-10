# Static performance review: `apps/lit-demo`

## Scope and constraints

This is a read-only/static trace of the benchmark path in `apps/lit-demo`, with
targeted tracing into `packages/blac-lit`, `packages/blac-core`,
`packages/dirtytalk-structural`, and `packages/dirtytalk-engine`. No build,
test, typecheck, browser automation, dev server, or benchmark was run.

The screenshot timings should not currently be treated as framework benchmark
results. They combine application work, Blac dispatch, Lit reconciliation,
instrumentation, browser frame latency, and rendering work, while the displayed
"DOM patches" metric observes only one small subtree per row.

## Executive conclusion

The screenshot is plausibly slow for two separate reasons:

1. **A runtime integration gap defeats fine-grained fanout.** `BindDirective`
   subscribes with a path interest, but never registers that interest in the
   structural container's consumer skeleton
   (`packages/blac-lit/src/live.ts:54-58`). In this demo that leaves
   `_consumerPaths.size === 0`, so every real `emit`/`patch` is deliberately
   converted to `ALL_PATHS` (`packages/dirtytalk-structural/src/container.ts:169-199`,
   `:230-237`). With 1,000 rows, the benchmark bloc has roughly 2,002 direct
   subscribers: the core bridge, the list binding, and two selectors per row.
   Consequently, operations such as update/swap/select can recompute nearly
   every selector even though component-body executions remain at zero.

2. **The demo's instrumentation and measurement boundary are too invasive and
   too broad to diagnose that cost.** It creates one `MutationObserver` per row,
   starts Web Animations for changed labels, synchronously rewrites the HUD on
   every counter notification, and measures through `requestAnimationFrame`
   plus a timer. The reported duration therefore includes data/index creation,
   reactive work, DOM work, observer delivery, animation setup, style/layout/
   paint, and arbitrary wait-to-frame latency.

The first priority is to restore true path registration in `@blac/lit` and add
targeted fanout tests. The second is to split the demo into an uninstrumented,
repeatable benchmark and a separately instrumented visualization. Only after
those changes will browser profiling reveal whether remaining time belongs to
Lit reconciliation, table layout/paint, or Blac internals.

## Finding summary

| ID | Finding | Expected impact | Confidence |
| --- | --- | --- | --- |
| P0-1 | `@blac/lit` bindings never register consumer paths, so the source emits `ALL_PATHS` and wakes every binding | Very high for update/select/swap and the live market | High |
| P0-2 | "DOM patches" is a partial `MutationRecord` count, not a DOM-patch count; swap/removal/class changes are invisible | Metric correctness: critical | High |
| P0-3 | Instrumentation performs substantial work inside the timed window | High for create/update; particularly bad at 1,000+ rows | High |
| P1-1 | The end-to-end timer conflates mutation, scheduler, reconciliation, frame wait, layout and paint | Metric attribution: critical; absolute values unstable | High |
| P1-2 | `indexById` is rebuilt for every operation and its `Map` identity makes every label selector coarse | High after P0-1 is fixed; medium today because all bindings already wake | High |
| P1-3 | One nested component per row adds 1,000 registry refs, 2,000 bindings, proxies, closures, subscriptions and microtasks | Medium-high create/memory/teardown overhead | High |
| P1-4 | Default table layout, changing label lengths, row moves, nth-child styling, sticky header and animations can trigger broad rendering work | Medium-high, browser-dependent | Medium-high |
| P1-5 | Unknown row removal duplicates the dataset and can invalidate later results | Correctness: high/catastrophic when triggered | High |
| P2-1 | Runs are neither isolated nor repeatable; overlapping timers and evolving state can cross-contaminate samples | Medium for manual results | High |
| P2-2 | "Body execs" staying flat hides binding recomputation and is not a render-work metric | Metric interpretation: high | High |

## Detailed findings

### P0-1: fine-grained path registration is missing

`BindDirective.compute()` correctly tracks read paths and expands ancestor
interests (`packages/blac-lit/src/live.ts:42-51`). Its subscription uses that
interest (`:54-58`), but the directive never calls
`registerConsumerPaths`. `Trackable` even declares that method as optional
(`packages/blac-lit/src/internal/track.ts:15-25`), which strongly suggests the
registration half of the bridge was left incomplete. `ModelDirective` has the
same pattern (`packages/blac-lit/src/forms.ts:50-59`, `:74-78`). There is no
corresponding `unregisterConsumer` surface in the adapter type either.

This matters because direct channel subscriptions and structural consumers are
different concepts. `StructuralContainer` only builds a diff skeleton from
`registerConsumerPaths` calls (`packages/dirtytalk-structural/src/container.ts:92-103`,
`:265-275`). When that registry is empty, `emit` and `patch` intentionally skip
path diffing and mark `ALL_PATHS` (`:169-199`, `:230-237`). The dirty channel
then treats every non-empty binding interest as intersecting `ALL_PATHS`
(`packages/dirtytalk-structural/src/path-set.ts:41-49`).

#### Concrete benchmark fanout

Each benchmark row installs one selector for `selected` and one for its label
(`apps/lit-demo/src/benchmark/benchmark.ui.ts:43-66`). The list installs another
binding (`:157-161`). After 1,000 rows exist, any real BenchmarkBloc change can
therefore make the channel inspect approximately 2,002 subscribers and invoke
almost every live binding callback.

That explains the apparently contradictory screenshot:

- **Update every tenth:** component bodies stay at 0, but the list plus roughly
  2,000 row bindings can recompute. Only 100 labels finally differ, hence the
  displayed 100 observed mutations.
- **Swap rows:** the same broad recomputation occurs and Lit's keyed `repeat`
  moves two keyed row parts, but the observer is inside the label cell, so it
  reports 0.
- **Select row:** even the data list and every label selector can wake for a
  `selected`-only patch.
- **Live market:** every frame's instrument patch can also wake controls and
  every cell binding, contradicting the demo's claim that only changed cells
  are reactively evaluated (`apps/lit-demo/src/market/market.ui.ts:69-73`). Lit
  may still suppress equal DOM writes, but the selector work has already run.

`DirtyChannel` itself is doing what it is told: it snapshots every subscriber,
evaluates every interest, then invokes callbacks whose interest intersects the
dirty set (`packages/dirtytalk-engine/src/dirty-channel.ts:88-141`). The source
dirty set is simply too coarse because the adapter did not register consumers.

#### Recommendation

Give every `BindDirective` and `ModelDirective` a stable consumer ID. After
each tracked compute, register its current expanded path set with the bloc;
when the read changes, replace that registration; on disconnect or bloc
replacement, unregister it. Subscription replacement also needs to handle a
directive instance being reused with a different bloc/read function.

Targeted tests should prove, with explicit callback counters, that:

- `patch({ selected })` does not recompute a `data`/label binding;
- replacing an array wakes only changed indexed leaves plus consumers of the
  array as a whole;
- interests update after a row's lookup/index changes;
- disconnect removes both the channel subscriber and structural consumer;
- `model` has identical lifecycle semantics.

Expected impact: **very high** for update/select/swap and the market demo.
Confidence: **high**.

### P0-2: "DOM patches" is not a valid DOM-patch metric

The benchmark puts `pulse()` only on the label `<td>`
(`apps/lit-demo/src/benchmark/benchmark.ui.ts:48-62`). The directive observes
that element's subtree (`apps/lit-demo/src/dev/pulse.ts:39-49`) and increments
the counter by `mutations.length` (`:52-56`). It cannot see:

- keyed `<tr>` insertions, removals, or moves at `<tbody>`;
- selection class changes on `<tr>`;
- ID-cell or remove-link work;
- JS property assignments (already acknowledged at `pulse.ts:14-16`);
- Lit reconciliation that computes and compares an equal value without a DOM
  mutation.

Conversely, a `MutationRecord` is not definitionally one DOM operation. A
child-list record can contain multiple added/removed nodes, record coalescing
and delivery are observer/browser details, and initial construction of a
watched subtree can yield multiple records for what users perceive as one
label. The `2,000` shown for creating 1,000 rows is consistent with observer
records from label subtree construction; it does **not** mean the whole table
required exactly two patches per row. The `0` for swap proves the blind spot:
keyed DOM movement occurs outside the watched label cells.

The HUD description says the metric "proves render-once + fine-grained"
(`apps/lit-demo/src/dev/hud.ui.ts:1-3`) and labels it "DOM patches" (`:56-58`).
That wording overclaims what is measured.

#### Recommendation

Use separate metrics with precise names:

- `binding callbacks` / `selector computes` (instrument `BindDirective`);
- `Lit commits attempted` and, if obtainable, `value changed`;
- `MutationObserver records` by type, observed once at the measured root;
- added/removed/moved row counts derived from keys in the benchmark harness;
- browser style/layout/paint from a performance trace, not inferred from
  mutations.

Keep visual pulses as an optional teaching mode, explicitly excluded from
timed samples. Expected impact: **critical for trustworthy conclusions**.
Confidence: **high**.

### P0-3: instrumentation is materially inside the measured workload

Creating 1,000 rows creates 1,000 `MutationObserver` instances and attaches one
to each label cell (`pulse.ts:22-49`). Each observed callback calls
`devStats.bumpPatch`, which synchronously notifies every listener
(`apps/lit-demo/src/dev/devStats.ts:12-20`). The HUD listener then assigns the
body count, patch count, and pulse button text on every notification
(`apps/lit-demo/src/dev/hud.ui.ts:15-27`).

Row component creation is also instrumented. Every body calls `bumpBody`
(`apps/lit-demo/src/dev/component.ts:17-27`), causing the same synchronous HUD
writes. A 1,000-row create therefore causes at least 1,000 synchronous HUD
notifications from body instrumentation, followed by observer notifications.
Changed labels additionally start or cancel a 450 ms Web Animation
(`apps/lit-demo/src/dev/pulse.ts:59-77`). Turning "pulses" off only skips the
animation; observers, counters, listener notifications, and HUD setters remain
active (`:52-57`).

The FPS display is a perpetual `requestAnimationFrame` loop that changes text
and style each frame (`apps/lit-demo/src/dev/hud.ui.ts:29-42`), so it also
competes in the same frame used by the timer. The fixed HUD has a
`backdrop-filter` (`apps/lit-demo/src/styles.css:257-270`), adding another
browser-dependent compositing/paint confounder.

#### Recommendation

Provide two explicit modes:

1. **Benchmark mode:** no HUD, pulses, observers, animations, FPS rAF, or dev
   counters anywhere in the measured root.
2. **Explain mode:** coalesce stats notification to at most once per frame,
   update HUD fields only when their value changes, prefer one observer at a
   stable root, and never label observer records as exact DOM patches.

Expected impact: **high** for create/update timings and variance. Confidence:
**high** that the work exists; its precise millisecond share requires profiling.

### P1-1: the timer has no attributable performance boundary

`measureEndToEnd` starts before the operation, calls it synchronously, then
ends in a `setTimeout(0)` scheduled from the next rAF
(`apps/lit-demo/src/benchmark/timing.ts:1-20`). The resulting number includes:

- `buildData`, random generation, strings, copies, `Map` creation, `findIndex`,
  and state merge/diff work;
- the microtask-scheduled Blac channel flush
  (`packages/dirtytalk-engine/src/scheduler.ts:54-82`);
- selector tracking, Lit `repeat`, DOM mutation, observer delivery and HUD
  writes;
- wait time until the next animation frame and timer task;
- style/layout/paint work the browser chooses to perform around that frame.

It does not identify which of those stages consumed time. The wait to the next
rAF alone depends on where the click task lands within the current frame. A
long operation can miss one or more frames. Timer scheduling can add further
delay. Thus a 50 ms swap with "0 patches" is not contradictory: it can contain
broad binding recomputation, keyed row movement, layout, paint and frame wait
that the label-cell observer cannot see.

The benchmark also does not record browser, production/development mode,
warmup, sample count, median, p95, GC, CPU throttling, background-tab state, or
a no-op scheduling baseline. The package has buttons, not a benchmark harness
(`apps/lit-demo/package.json:7-12`).

#### Recommendation: report three boundaries

1. **Mutation/application time:** time only `b[op]()`; separately report data
   generation and index/model maintenance if renderer performance is the goal.
2. **Reactive commit time:** from state write through the channel flush and
   synchronous Lit commits, using an explicit scheduler/adapter "settled"
   hook rather than guessing with timers.
3. **Visual end-to-end:** a clearly documented paint-oriented boundary (often
   a double-rAF strategy) with a measured no-op baseline. Report it as
   frame-quantized visual latency, not framework JS time.

Run deterministic setup, warmups, many isolated iterations, and report median,
p95, min/max and raw samples in a production build. For framework comparisons,
adopt the established js-framework-benchmark operation contract/harness rather
than comparing these manual numbers directly.

Expected impact: **critical for attribution and variance**, not necessarily a
runtime speedup. Confidence: **high**.

### P1-2: derived `indexById` work is O(n) and makes label reads coarse

Every mutating data operation calls `withIndex`, which allocates an intermediate
`data.map(...)` array and a new `Map` for the entire dataset
(`apps/lit-demo/src/benchmark/benchmark.bloc.ts:10-14`, `:21-40`, `:60-68`).
So "update 100 rows" and "swap 2 rows" both pay an O(n) index rebuild before
rendering.

Every label selector reads that `Map`, then the array leaf
(`apps/lit-demo/src/benchmark/benchmark.ui.ts:55-59`). `Map` is intentionally an
atomic tracking leaf, so the tracked interest includes the whole `indexById`
reference. Once P0-1 is fixed, replacing the map will still wake **every label
selector**, even if structural array diffing correctly narrows `data.i.label`
to 100 changed leaves. The map workaround exists because component args are
one-shot and an index argument becomes stale after reordering
(`benchmark.ui.ts:39-42`; `packages/blac-lit/src/component.ts:57-65`).

#### Recommendation

Model stable identity directly rather than rebuilding a coarse derived map.
Two viable directions are:

- normalized state: stable `order` plus per-ID row storage, so swap changes
  `order` only and label updates change per-ID label leaves only; or
- improve `component`/keyed item ergonomics so a retained row directive can
  receive updated args/item data safely, removing the state-level index map.

If dynamic ID paths are used in normalized plain objects, account for the
per-class interner being append-only (`packages/dirtytalk-structural/src/path-interner.ts:157-164`);
an endlessly repeated benchmark should reset identity or use a bounded model.

Expected impact: **high after P0-1**, especially swap/update. Confidence:
**high**.

### P1-3: per-row component structure adds large fixed overhead

Each row is a component that calls `ctx.use(BenchmarkBloc)`
(`apps/lit-demo/src/benchmark/benchmark.ui.ts:43-46`). `component.acquire`
resolves the registry key, allocates a ref ID, acquires a counted registry ref,
and retains release metadata (`packages/blac-lit/src/component.ts:90-105`).
Creating 1,000 rows therefore adds 1,000 refs to the same bloc in addition to
the page's ref. Clearing/replacing rows performs the symmetrical unsubscribe,
observer disconnect, callback cleanup, registry release and metadata teardown
(`packages/blac-lit/src/component.ts:123-131`).

Each row also creates:

- two `BindDirective`s and two channel subscriptions;
- tracking sessions, sets/weak maps and proxies per selector compute
  (`packages/blac-lit/src/live.ts:42-58`;
  `packages/dirtytalk-structural/src/tracker.ts:286-360`);
- one queued `disarm` microtask per compute (`live.ts:49`);
- event-handler and selector closures;
- one observer and optional animation.

This architecture is useful to demonstrate render-once nested components, but
it is not a neutral Lit table benchmark. The displayed `bodyExecs = 1,000`
is evidence of this setup cost, not of 1,000 DOM patches.

#### Recommendation

Benchmark at least two deliberate shapes:

- **canonical keyed Lit list:** one reactive list + keyed item templates,
  measuring reconciliation/DOM performance;
- **fine-grained Blac rows:** stable row-level bindings, measuring isolation
  and fanout, but without one registry ownership ref per row if the parent
  already owns the shared bloc.

An adapter-level inherited/borrowed context or a keyed row-scope primitive
could preserve Blac's no-prop-drilling ergonomics while avoiding redundant
ownership refs. Do not optimize this before P0-1 is fixed and profiled.

Expected impact: **medium-high** on creation, memory and teardown. Confidence:
**high** that the fixed work exists; exact timing share needs a browser profile.

### P1-4: table/layout/paint costs can dominate end-to-end results

The benchmark renders all rows into a normal auto-layout table with
`border-collapse`, per-cell padding/borders, alternating-row selectors, a
sticky header, rounded overflow, and no containment or virtualization
(`apps/lit-demo/src/styles.css:452-487`). Updating every tenth row appends
`" !!!"` to 100 labels (`apps/lit-demo/src/benchmark/benchmark.bloc.ts:33-39`).
Changed text length can alter intrinsic column sizing and line wrapping,
causing table-wide layout. Keyed row moves can invalidate nth-child styling
and table layout even when label text is unchanged. One hundred simultaneous
background/box-shadow animations further add style/paint work.

Creating 10,000 full DOM rows is also not representative of a production data
grid, where windowing/virtualization is normally the dominant optimization.
Virtualization should not be used in a framework benchmark whose contract
requires 10,000 actual rows, but it should be the recommended application DX
for real large datasets.

#### Recommendation

- For a comparable full-DOM benchmark, use minimal standardized CSS and
  `table-layout: fixed` where compatible with the benchmark contract.
- Put timing/log UI outside or under containment from the measured root.
- Disable animations during samples.
- Keep a separate virtualized demo as the production-oriented example.
- Use a browser performance trace to quantify scripting vs style/layout/paint;
  do not infer those shares from MutationObserver counts.

Expected impact: **medium-high but browser/data dependent**. Confidence:
**medium-high**.

### P1-5: removing an unknown ID corrupts the benchmark dataset

`remove` does not handle `findIndex` returning `-1`
(`apps/lit-demo/src/benchmark/benchmark.bloc.ts:46-53`). For `idx = -1`, it
constructs `data.slice(0, -1) + data.slice(0)`: nearly two copies of the current
data with duplicate IDs. The UI accepts any numeric row ID
(`apps/lit-demo/src/benchmark/benchmark.ui.ts:111-120`), so this is reachable.
Duplicate keys violate the assumptions of Lit's keyed `repeat` and make every
later measurement untrustworthy.

Recommendation: return early if `idx < 0` and surface a validation message.
Expected impact: **critical correctness when triggered**. Confidence: **high**.

### P2-1: manual samples are not isolated or repeatable

`runTimed` has no in-flight guard (`apps/lit-demo/src/benchmark/benchmark.ui.ts:73-83`),
and every click starts an async measurement without awaiting/locking the
controls (`:88-95`). Rapid clicks can overlap. Their `devStats` snapshots then
include each other's body/mutation activity, while both timers include shared
main-thread work.

Workloads also evolve:

- `nextId` and random labels persist globally (`apps/lit-demo/src/benchmark/data.ts:64-76`);
- repeated updates make strings progressively longer (`benchmark.bloc.ts:33-39`);
- the timing log grows to eight rows and changes page layout after each sample
  (`benchmark.bloc.ts:78-88`; `benchmark.ui.ts:123-146`);
- JIT warmup, observer/animation reuse, table column widths and previous
  selection vary between clicks.

The screenshot's update samples ranging from roughly 43 to 142 ms are exactly
the kind of variance this design cannot explain.

Recommendation: scripted isolated scenarios, deterministic seeded/prebuilt
data, fixed initial state per iteration, an in-flight lock, warmups, and raw
sample export. Keep log rendering outside the measured layout. Expected impact:
**medium on values, high on trustworthiness**. Confidence: **high**.

### P2-2: body executions hide the hot work

The wrapper increments `bodyExecs` only when a component render body runs
(`apps/lit-demo/src/dev/component.ts:17-27`). A self-updating binding can still
execute its selector, allocate/repoint tracking proxies, rebuild its interest,
queue a microtask, format a value, and call Lit's `setValue`, all while
`bodyExecsDelta` remains zero (`packages/blac-lit/src/live.ts:42-58`).

Therefore "body execs stay flat" demonstrates the render-once component API,
but it says nothing about total reactive computation. In the current adapter,
the flat metric actively masks P0-1.

Recommendation: show body executions alongside binding callbacks, selectors
skipped by dirty-path fanout, selector computes, and actual observed mutations.
Expected impact: **high for diagnosis/claims**, no direct runtime speedup.
Confidence: **high**.

## Operation-by-operation attribution

| Operation | Synchronous application work | Reactive/Lit work today | Browser/metric caveat |
| --- | --- | --- | --- |
| Create 1,000 | 3,000 random picks, 1,000 objects/strings, pair array + `Map`, full `emit` | list creates 1,000 components, refs, 2,000 bindings, observers and initial DOM | 2,000 is label-subtree observer records, not total patches; HUD receives at least 1,000 body notifications |
| Create 10,000 | Same at 10x plus a 10,000-entry index | 10,000 refs, 20,000 bindings and observers; very large DOM | full-DOM table layout/paint and instrumentation likely dominate; not a production-grid scenario |
| Append 1,000 | generate 1,000, copy all old rows, rebuild full index | broad `ALL_PATHS`; keyed repeat adds 1,000 | result depends on existing row count |
| Update every 10th | clone array, replace n/10 objects, rebuild full index | broad `ALL_PATHS` wakes list/class/label bindings; only n/10 labels differ | label length and 100 animations can trigger layout/paint; body delta 0 hides recomputation |
| Swap rows | clone array, swap 2, rebuild full index | broad `ALL_PATHS`; keyed repeat moves 2 parts; all selectors may compute | 0 observed patches is false-negative because row movement occurs outside label observers |
| Select row | patch one scalar | broad `ALL_PATHS`; list and label bindings can compute in addition to all selection bindings | only `<tr>` classes change, outside observer, so patch count can remain 0 |
| Remove row | O(n) search/copy/index rebuild | broad list change + component/observer/subscription/ref teardown | invalid ID nearly doubles data and introduces duplicate keys |
| Clear | full emit to empty | keyed removal and teardown of every row | observers are inside removed rows, so their own removal is invisible |

## Prioritized implementation plan

1. **Correctness/fanout:** register and unregister binding/model consumer paths;
   add narrow lifecycle and callback-count tests.
2. **Measurement honesty:** add a no-instrumentation benchmark mode and rename/
   split diagnostic counters.
3. **Repeatability:** deterministic harness, isolated setup, production build,
   warmups and distribution reporting.
4. **State shape:** remove the rebuilt `Map`; use stable identity/order or
   updateable keyed component args.
5. **Profile:** capture scripting/style/layout/paint after steps 1-4; optimize
   the demonstrated hot path, not the current mixed number.
6. **Application DX:** document virtualization/windowing for real 10k-row UIs,
   while retaining a standardized full-DOM benchmark for comparisons.

## Validation not performed

Per task constraints, no commands that execute code were run. All impact
ratings are static predictions. In particular, the percentage of screenshot
time attributable to selector fanout, observers/HUD, Lit reconciliation and
browser layout/paint must be confirmed with targeted tests and a production
browser trace after explicit authorization.
