# Complex Investigation: @blac/lit Benchmark O(N) Fan-out (swap/select/update/remove hundreds of ms)

## Bottom Line
**Root Cause**: Every per-row `select` binding subscribes at a *whole-value* granularity that changes identity on every op — the label binding depends on the entire `indexById` Map (an opaque leaf that `withIndex()` re-allocates on every mutation) and the class binding depends on `selected` — so a single-row change marks a path that intersects **all N rows' interests**, waking and recomputing every one of the ~2N bindings; the outer `each` compounds it by re-running full keyed reconciliation over all 1000 rows because its selector returns a brand-new `s.data` array reference each op.
**Fix Location**: `apps/lit-demo/src/benchmark/benchmark.ui.ts:56-59` (label selector reads whole `indexById`) + `apps/lit-demo/src/benchmark/benchmark.bloc.ts:10-14` (`withIndex` re-allocates the Map every op) + `packages/dirtytalk-structural/src/tracker.ts:485-491` (Map is an opaque leaf, so `.get(id)` cannot create per-key deps).
**Confidence**: High for the O(N) fan-out and the "no unbounded leak" verdict; Medium for the exact `updateEveryTenth = 1000 patches` count (see anomaly section — needs one confirming trace).

## Investigation Findings & Hypothesis

### The reactive pipeline (how a wake happens)
1. A bloc op mutates state via `patch`/`emit`. `StructuralContainer` (`packages/dirtytalk-structural/src/container.ts`) diffs the new state along the consumer skeleton and calls `this._channel.mark(dirty)` with the set of changed path-ids.
2. On the next microtask, `DirtyChannel.#flush()` (`packages/dirtytalk-engine/src/dirty-channel.ts:87-160`) **iterates every live subscriber**, evaluates each subscriber's `interest()` thunk, and tests `intersects(interest, dirty)` (`packages/dirtytalk-structural/src/path-set.ts:41-53`). Every intersecting subscriber's callback runs.
3. Each `select(...)` binding is one subscriber (`BindingSession.attachContainer` → `channel.subscribe(() => rec.interest, () => this.apply(this.computeCurrent()))`, `packages/blac-lit/src/internal/binding-session.ts:334-356`). Its callback re-runs `computeCurrent()` — a fresh `trackRender` proxy pass + the selector + `expandWithAncestors` + `registerConsumerPaths` (`binding-session.ts:132-185`).

So cost per op ≈ (subscribers whose interest is *evaluated*) + (subscribers that *intersect* × full recompute). The benchmark table has 1000 rows × 2 select bindings = **~2000 subscribers on the one singleton `BenchmarkBloc` channel**, plus the outer `each` binding.

### Root cause #1 — label binding depends on the WHOLE `indexById` Map (primary O(N) driver)
`benchmark.ui.ts:56-59` label selector:
```ts
select(b, (s) => { const i = s.indexById.get(id); return i === undefined ? '' : s.data[i].label; })
```
The structural tracker treats a `Map` as an **opaque leaf** (`tracker.ts:485-491`, predicate `isStructurallyWrappable` at `tracker.ts:143-146`): reading `s.indexById` records the single path `indexById`, and `.get(id)` cannot create a per-key dependency. Therefore **every one of the 1000 label bindings has `indexById` in its interest set.**

`withIndex()` (`benchmark.bloc.ts:10-14`) builds a **new `Map` on every mutating op** (`run`/`add`/`updateEveryTenth`/`remove`/`swapRows`). A new Map = new reference = the `indexById` path is marked dirty every single op. Result: the channel flush wakes **all 1000 label bindings** and each re-runs its full selector — regardless of whether that row's label actually changed. This is the O(N)-per-op cost behind swap (500ms) and updateEveryTenth (610-800ms).

### Root cause #2 — class binding depends on whole `selected` (explains select-slow + 0 patches)
`benchmark.ui.ts:49-51`: `class=${select(b, (s) => s.selected === id ? 'selected' : '')}`. All 1000 `<tr>` class bindings pin `selected`. `select(id)` (`benchmark.bloc.ts:42-44`) does `patch({ selected: id })`, marking `selected` dirty → **all 1000 class bindings wake and recompute** for a change that alters at most 2 rows. That is the 190-340ms.
- **Why select reports patches Δ 0**: `pulse()` is attached only to the label `<td>` (`benchmark.ui.ts:54`), never to `<tr>`. Class-attribute mutations on `<tr>` are invisible to every pulse `MutationObserver` (each observes only its own td subtree). So real class writes happen but the HUD counts none. Genuine defect (slow), harness artifact (the "0").
- Select does NOT touch `data`/`indexById`, so the outer `each` does not wake — that is why select is cheaper than swap.

### Root cause #3 — outer `each` re-reconciles all 1000 rows every data op
`benchmark.ui.ts:157-162`: `each(select(b, s => s.data), item => BenchmarkRow({id:item.id}), item => item.id)`. `s.data` is a brand-new array reference every op (`slice(0)` / spread in the bloc), so the `each` binding wakes on every data op. `EachDirective.apply` (`control-flow.ts:62-86`) rebuilds `repeat(arr, keyFn, renderItem)`, which **re-invokes `renderItem` for all 1000 items** (1000 fresh `BenchmarkRow(...)` template results) and re-diffs 1000 keys — even for a 2-row swap or a 1-row remove. lit `repeat` reuse keeps this O(N) rather than O(N²), and the `ComponentDirective` identity check (`component.ts:166-178`) prevents body re-exec (bodyExecs Δ 0 ✓), but the per-op O(N) allocation + diff is real and stacks on top of #1.

### Root cause #4 — rows recompute TWICE per data op (redundant work)
On a data-changing op both paths fire in the same flush: (a) the `each`/`repeat` re-commit re-renders every row's `select` directives (recompute #1), and (b) each label binding's own channel subscription fires later in the same subscriber loop (recompute #2, via the `indexById` fan-out of #1's root cause). So each of the 1000 label selectors runs twice per data op. Pure waste; halving it is a quick win once #1/#3 are addressed.

### `each` keyed-diff complexity
The `each` collapse-to-`nothing`-on-disjoint-turnover logic (`control-flow.ts:62-99`) is O(N) (two Set builds + a min-size disjoint scan). It only collapses on a *full key turnover* (`run`, `clear`, `runLots`), never on swap/update/remove/select. It is not O(N²) and not the swap culprit. It is the mechanism that fixed the prior orphan-marker leak (commit 8895b6bd), and it is working as intended.

## Evidence & Diagnostics
- **Whole-Map leaf semantics**: `packages/dirtytalk-structural/src/tracker.ts:133-146` and `:484-491` — Map/Set/Date/class instances are leaves; "a reference change to the value still wakes the consumer." Confirms label bindings can only pin `indexById` as a whole.
- **Map re-allocated every op**: `apps/lit-demo/src/benchmark/benchmark.bloc.ts:10-14` (`new Map(...)`), called by swap `:61-69`, update `:33-40`, remove `:46-55`, add `:29-31`, run `:21-23`.
- **Flush iterates all subscribers**: `packages/dirtytalk-engine/src/dirty-channel.ts:104-139` — `Array.from(this.#subscribers.values())` then loops, evaluating `interest()` + `intersects` for every subscriber; matching ones invoke `cb`. With ~2000 subscribers this is O(N) minimum per op.
- **Recompute per wake**: `packages/blac-lit/src/internal/binding-session.ts:334-356` (subscribe wires `() => this.apply(this.computeCurrent())`) and `:132-185` (computeCurrent = trackRender + selector + expandWithAncestors + registerConsumerPaths).
- **class binding on `<tr>`, pulse on `<td>`**: `apps/lit-demo/src/benchmark/benchmark.ui.ts:49-54` — explains select/swap/remove patches Δ 0.
- **each re-invokes renderItem for all items**: `packages/blac-lit/src/control-flow.ts:78-86` returns a fresh `repeat(arr, ...)` each apply; `benchmark.ui.ts:157-162` selector returns new `s.data` each op.
- **Harness floor**: `apps/lit-demo/src/benchmark/timing.ts:6-8` — every measurement waits `requestAnimationFrame` → `setTimeout(0)`, adding ~1 frame (~16ms+) and deferring past the channel microtask flush. Sets a floor; does not create the hundreds-of-ms.
- **pulse honesty**: `apps/lit-demo/src/dev/pulse.ts:52-57` counts `mutations.length` (every DOM op, not per-batch); flash uses WAAPI so it does not self-trigger. `devStats.snapshot()` (`dev/devStats.ts:33-35`) is O(1) — NOT a tree walk, so it is not the overhead.

### The `updateEveryTenth = 1000 patches` anomaly (flagged, needs one trace)
Only 100 labels actually change text (`benchmark.bloc.ts:33-40` mutates every 10th; the other 900 keep their exact object reference, so `s.data[i].label` is byte-identical and lit's ChildPart dedupes an equal string to `noChange` → 0 mutation). By that reasoning the honest DOM-mutation count should be ~100, not 1000. Two candidate explanations, in order of likelihood:
1. **Every row's label binding is force *re-evaluated*** (all 1000 wake via the `indexById` fan-out of #1 and again via the `each` re-commit of #3/#4). If the reported figure is really counting re-evaluations rather than DOM writes somewhere, it lines up exactly with N=1000. This is consistent with the "or every row's binding is re-evaluated" framing.
2. **The label ChildParts are being cleared+recreated rather than updated** on the `each` rebuild (which would make lit emit a childList remove+add per row = real mutations pulse counts). This would be a genuine `each`/`repeat` reuse defect.
Recommended 5-minute diagnostic: in `pulse.onMutations` log `mutation.type` + target, and in `BindDirective.render` log setValue-vs-committed for the label site during one `updateEveryTenth`. If mutations are ~100 characterData → the HUD figure conflates re-eval with patch (harness attribution). If ~1000 childList → repeat is not reusing (real defect).

## Leak Verdict: NO unbounded leak for the reported slow ops
- swap/select/update/remove/add are **partial updates that keep the same key set** — no row `ComponentDirective` is torn down or re-added, so no per-op accumulation of registry refs, consumer registrations, or channel subscriptions. Subscriber count stays flat at ~2N. `computeCurrent` re-registers the *same* paths (`binding-session.ts:181`) with net-zero skeleton refcount churn (`container.ts:296-330`) and does not re-subscribe (`attachContainer` early-returns when `rec.unsubscribe` is set, `binding-session.ts:335`).
- The only leak *class* that ever existed here is the keyed full-turnover orphan-marker / repeat-retention case (`run`/`clear`/`runLots`), already fixed (commits 8895b6bd, 73b062bb) and covered by `packages/blac-lit/src/leak.test.ts` ("replace mode holds row count flat", "does not orphan comment markers", WeakRef/heap monitor). Those tests assert return-to-baseline and are the right coverage.
- **What `leak.test.ts` does NOT cover**: partial-update ops (swap/select/update/remove). They have no leak, but there is also no regression test asserting the O(N)-fan-out *cost* — a "swap wakes ≤ K bindings" style perf-budget assertion would catch #1/#2 regressions.

**Conclusion: the benchmark is slow because of algorithmic O(N)-per-op fan-out, not because of a growing leak.**

## Real defects vs harness artifacts
| Symptom | Verdict |
|---|---|
| swap 358-672ms, patches Δ 0 | **Real defect** (#1 indexById fan-out wakes 1000 labels + #3 each rebuild + #4 double-compute). The "0" is a **harness artifact** (labels recompute to identical values → noChange; swap only reorders, never changes a label's text). |
| updateEveryTenth 610-800ms, patches Δ 1000 | **Real defect** for the time (#1 + #3 + #4). The "1000" count is **anomalous** — flagged above; likely re-eval-vs-patch attribution (harness) but possibly a repeat-reuse defect. |
| select 190-340ms, patches Δ 0 | **Real defect** (#2 `selected` fan-out wakes 1000 class bindings). The "0" is a **harness artifact** (`pulse` is on `<td>`, class binding is on `<tr>`). |
| remove 55-67ms, patches Δ 0 | **Real defect** (#1 + #3), cheaper than swap because remove does no DOM node moves. The "0" is a **harness artifact** (a removed td's own MutationObserver cannot observe its own removal from the tbody). |
| rAF+setTimeout floor | **Harness artifact** — sets ~1-frame minimum, not the hundreds of ms. |
| `withIndex` Map rebuild O(N) | **Bloc/data-model choice**, not a @blac/lit defect — but it is the *trigger* for #1 (atomic Map replacement every op). |
| pulse/devStats overhead | **Not the cause** — devStats.snapshot is O(1); pulse counts real mutations only; WAAPI flash does not self-trigger. |

## Recommended Mitigations (do not implement — directions only)
1. **Break the whole-Map dependency (highest impact, fixes swap/update/remove fan-out).** Do not read `s.indexById` inside the per-row label selector. Options: (a) look the row up by identity within `data` without the Map, or better (b) drive per-row labels by a per-element path the tracker *can* pin — e.g. select `s.data` once at the list level and pass each item's label down as a prop, or key rows so each row selects `s.data[knownIndex].label` only. Anything that makes a row's interest a per-element leaf instead of the shared `indexById` reference stops the N-way wake.
2. **Stop re-allocating shared identity every op in the bloc.** `withIndex` replacing the whole `indexById` Map (and `data` array) on every op is what makes the coarse deps fire globally. If the index must exist, keep it out of the reactive state path the rows read, or mutate in place behind a stable reference the tracker does not pin per-row.
3. **Narrow the selection dependency (#2).** Instead of every `<tr>` pinning `selected`, give rows a per-id "am I selected" signal (e.g. derive selection as a per-row boolean the row pins by its own id path), so `select(id)` wakes at most the old + new row.
4. **Avoid re-reading the full array in the outer `each` (#3).** Feeding `each` a brand-new `s.data` each op forces a 1000-item repeat reconciliation. A stable/append-aware source or list-diff would let repeat's fast path do 2 moves for a swap instead of a full re-walk.
5. **Eliminate the double-compute (#4).** Rows should be updated by *either* the `each` re-commit *or* the per-binding subscription, not both. Once #1/#3 land, ensure a data op does not both re-render the row via repeat and separately wake its label subscription.
6. **Add a perf-budget regression test** alongside `leak.test.ts`: assert that a single-row swap/select wakes ≤ K bindings (not N), so #1/#2 cannot silently regress.
7. **Confirm the 1000-patch anomaly** with the mutation-type trace above before deciding whether a repeat-reuse fix is also needed.
