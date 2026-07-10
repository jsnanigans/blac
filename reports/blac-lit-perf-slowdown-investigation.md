# Complex Investigation: @blac/lit benchmark — linear per-run slowdown ("Create 1,000 rows" gets +~50 ms slower each run while counters stay flat)

## Bottom Line
**Root Cause**: lit-html 3.3.3's `repeat` orphans **one comment marker per removed row into the *live* DOM** on every all‑new‑key update, because `removePart` deletes only the item ChildPart's `_$startNode` (+ the content up to, but not including, `_$endNode`) and never removes `_$endNode`. The benchmark's `run()` mints fresh monotonic ids (`data.ts` `buildData`, `nextId++`), so every "Create 1,000 rows" produces a fully disjoint key set and **never empties the list**, so `each`'s empty→`nothing` teardown never fires and the stray `_$endNode` markers accumulate in `<tbody>` unbounded. Each subsequent `repeat` reconcile + DOM traversal walks that ever‑growing sibling list → wall‑clock grows linearly, while the per‑operation logical counters (1000 body execs, 2000 patches, blac subs/refs/consumers) stay perfectly flat.
**Fix Location**: residual leak is upstream — `lit-html/directives/repeat.js` via `directive-helpers.js:172-175` (`removePart`) + `lit-html.js:1117-1126` (`_$clear` loop stops at `_$endNode`). The blac‑side mitigation point is `packages/blac-lit/src/control-flow.ts:17-31` (`each`).
**Confidence**: High. The leak reproduces with **pure lit‑html `repeat` and zero blac code**, does **not** reproduce with pure happy‑dom DOM churn, and happy‑dom `.remove()` is verified correct — so it is a genuine lit‑html behavior, not a harness artifact.

## Investigation Findings & Hypothesis

### The applied wrap fix IS effective — the documented leak class is gone
Mirroring `benchmark.ui.ts` (singleton `BenchmarkBloc`, `each(select(b, s=>s.data), item=>Row({id}), item=>item.id)`, `Row` = `component()` using `ctx.use` + two `select` bindings, plus `pulse()`), running `run()` K times with `@blac/lit` from **dist** (which contains the wrap fix, `dist/index.js:553`) and `@blac/core` from source, every blac‑owned resource returns to baseline every run:

| run | ms (noisy) | channel subs | registry refs | consumers | live MutationObservers | pulse.disconnected | live `<tr>` |
|----:|-----------:|-------------:|--------------:|----------:|-----------------------:|-------------------:|------------:|
| 1   | 211        | 2001         | 1001          | 2001*     | 1000                   | 0                  | 1000        |
| 2   | 693        | 2001         | 1001          | 2001      | 1000                   | 1000               | 1000        |
| 3   | 305        | 2001         | 1001          | 2001      | 1000                   | 2000               | 1000        |
| …   | …          | 2001         | 1001          | 2001      | 1000                   | +1000/run          | 1000        |
| 12  | 2469       | 2001         | 1001          | 2001      | 1000                   | 11000              | 1000        |

(*`consumerCount` reported 801 at 400 rows and 2001 at 1000 rows — 2 selects/row + 1 page `each`, flat.) `MutationObserver` created=12000 / disconnected=11000 / **live=1000** — pulse observers are correctly torn down. A WeakRef cohort of run‑1 `<tr>` nodes is **fully GC'd** after the next run (`aliveCohort = 0`). So: no subscription leak, no registry‑ref leak, no consumer leak, no detached‑DOM retention, no observer leak. **The `component()` wrap fix (`component.ts:472-475`) fully resolves the ref/subscription leak documented in `reports/blac-lit-leak-investigation.md`.**

### But heap still grows linearly — and it is upstream lit, not blac
Despite every blac counter being flat, `heapUsed` (measured *after a forced 2‑pass GC each run*) climbs monotonically with no plateau across 30 runs:

- blac full stack: **+~2.4 KB per row per run** (300 rows → +0.72 MB/run; 1000 rows → +2.5 MB/run).
- **Pure lit‑html `repeat`, no blac at all: +0.73 MB/run at 300 rows — identical slope.**
- **Pure happy‑dom DOM churn (createElement/removeChild), no lit: FLAT (26.5→26.8 MB over 28 runs).**

Bisection therefore localizes the leak to **lit‑html's `repeat`**, above blac and above the DOM implementation.

### The retained objects are orphaned comment markers in the LIVE tree
A heap‑snapshot histogram diff (4 runs → 34 runs, 300 rows) shows the dominant growth is `object:Comment` (+9000 = exactly rows×runs) plus the happy‑dom node internals hanging off them (`Map`/`array`). A live‑tree node census (walking `container.childNodes` recursively) is decisive:

```
run | elements | comments | text | tr
  1 |      302 |      402 |  200 | 100
  2 |      302 |      502 |  200 | 100
  5 |      302 |      802 |  200 | 100
 20 |      302 |     2302 |  200 | 100
```
Elements and text are flat; **comments grow by exactly ROWS every run** — the orphans are *in the live DOM*, not merely JS‑retained. Confirmed identically through the full blac `each()` stack (100 rows: comments 601→701→…→1701, `<tr>` flat at 100).

### Exact mechanism (lit‑html 3.3.3)
- `insertPart` (`directive-helpers.js:72-79`) creates each repeat item ChildPart with **two** marker comments: `_$startNode` and `_$endNode`.
- `removePart` (`directive-helpers.js:172-175`): `part._$clear(); part._$startNode.remove();` — removes the start marker only.
- `_$clear(start = startNode.nextSibling, from)` (`lit-html.js:1117-1126`): `while (start !== this._$endNode) { …remove… }` — removes content **up to but excluding** `_$endNode`.
- Net: every `removePart` (one per removed key) leaves the item part's **`_$endNode` comment orphaned** in the container.

In normal `repeat` usage keys are mostly stable → parts are reused/moved, `removePart` is rare, and any orphans are swept when the parent part is eventually cleared. The benchmark is the pathological case: **every run removes all N keys and adds N brand‑new keys, and the parent part is never cleared**, so N orphan end‑markers are added to `<tbody>` per run, forever.

### Why this presents as a *linear* slowdown with *flat* counters
`devStats.bumpBody()` counts render‑body executions (1000/run) and `pulse` counts raw `MutationRecord`s (≈2000/run) — both are per‑operation logical work and are genuinely constant. The cost that grows is O(prior‑runs): `repeat`'s reconciler and lit's DOM insertion walk the growing set of sibling nodes in `<tbody>`, and the browser's live‑DOM operations degrade as the child list bloats. That is exactly the "constant logical work, linearly growing wall‑clock" signature reported (372→…→844 ms).

### Mitigation proof
Rendering `nothing` between runs (the `each` empty‑teardown path, `control-flow.ts:28`, which tears down the whole `repeat` so the parent ChildPart's `_$clear` sweeps every orphan) holds comments **flat at 2** across all runs and holds heap flat. This both proves the mechanism and points at the fix.

## Evidence & Diagnostics
- **Key Trace**: `node_modules/.pnpm/lit-html@3.3.3/.../directive-helpers.js:172-175` (`removePart` removes only `_$startNode`) + `lit-html.js:1117-1126` (`_$clear` loop excludes `_$endNode`) + `directive-helpers.js:72-79` (`insertPart` allocates both markers). The unremoved `_$endNode` is the orphan.
- **Key Trace**: `apps/lit-demo/src/benchmark/data.ts:66-77` — `buildData` mints fresh monotonic ids, guaranteeing a fully disjoint key set every `run()`; `benchmark.bloc.ts:21-23` `run()` uses `emit` (full replace) and never empties → `control-flow.ts:28` `nothing` teardown never fires.
- **Key Trace (fix is effective)**: `packages/blac-lit/src/component.ts:472-475` wrap; teardown at `component.ts:342-354`/`:407-422` and `binding-session.ts:70-73`/`:151-173` all run on row removal — verified flat subs/refs/consumers/observers and GC'd `<tr>` cohort.
- **Diagnostic output** (node + happy-dom 20.9.0, lit-html 3.3.3, tsx; each run does a 2‑pass forced GC):
  - Pure happy‑dom DOM churn (300 rows ×30): heap 26.5→26.8 MB (flat), cohort GC'd.
  - Pure lit‑html `repeat` (300 rows ×30): heap 30.9→51.4 MB (+0.73 MB/run), cohort GC'd, **live comments +ROWS/run**.
  - Full blac `each()` (300 rows ×30): heap 37.6→58.2 MB (+0.72 MB/run); all blac counters flat; **live comments +ROWS/run**.
  - happy‑dom `Comment.remove()` / `Element.remove()` / `Text.remove()` all correctly detach (so not a harness `.remove()` bug).
  - Collapse‑to‑`nothing` between runs: comments flat at 2, heap flat.
- **Commands run** (from repo root `/Users/brendanmullins/Projects/blac`, fish shell):
  - `NODE_OPTIONS='--expose-gc' ROWS=1000 RUNS=12 PULSE=1 node_modules/.bin/tsx <scratch>/repro2.mts`
  - `NODE_OPTIONS='--expose-gc' ROWS=1000 RUNS=12 PULSE=0 node_modules/.bin/tsx <scratch>/repro2.mts`
  - `NODE_OPTIONS='--expose-gc' ROWS=300 RUNS=30 node_modules/.bin/tsx <scratch>/probe2.mts` (WeakRef cohorts)
  - `NODE_OPTIONS='--expose-gc' ROWS=300 RUNS=30 node_modules/.bin/tsx <scratch>/repro4-purelit.mts`
  - `NODE_OPTIONS='--expose-gc' ROWS=300 RUNS=30 node_modules/.bin/tsx <scratch>/repro5-puredom.mts`
  - `NODE_OPTIONS='--expose-gc' node_modules/.bin/tsx <scratch>/repro6-snapshot.mts` (heap histogram diff)
  - `ROWS=100 RUNS=20 node_modules/.bin/tsx <scratch>/repro7-comments.mts` (live‑tree census)
  - `node_modules/.bin/tsx <scratch>/repro8-remove.mts` (happy‑dom `.remove()` correctness)
  - `node_modules/.bin/tsx <scratch>/repro9-inspect.mts` (orphan marker + `nothing` reset)
  - `ROWS=100 RUNS=12 node_modules/.bin/tsx <scratch>/repro10-blac-census.mts` (full blac stack census)
  - `<scratch>` = `/private/tmp/claude-502/-Users-brendanmullins-Projects-blac/4ba542e3-69c1-4158-9642-8f876ee27fde/scratchpad`. `@blac/lit` was imported from its built `dist` (which carries the wrap fix, `dist/index.js:553`); `@blac/core`/`@dirtytalk/structural`/`lit-html` resolved via `createRequire`. Only these throwaway scripts were run; no repo build/test/lint suite was invoked.

## Recommended Mitigations
1. **(Primary, blac‑side) Force `each` to tear its `repeat` down on a full key turnover.** In `control-flow.ts:17-31`, track the previous render's key set; when the incoming key set is **disjoint** from it (0 overlap — the benchmark's exact pattern), commit `nothing` for that update *before* committing the fresh `repeat`, so the parent ChildPart's `_$clear` sweeps the orphaned `_$endNode` markers (proven flat by the collapse‑to‑`nothing` experiment). This needs a small stateful directive (the current plain `bind` projection returns a single value per compute); the empty‑list `nothing` path already there is the same teardown, just also triggered on turnover. Partial updates (`add`/`updateEveryTenth`/`swapRows`/`remove`) keep most keys and do not trigger it, so their fast‑path reuse is preserved.
2. **(Alternative) Give the `repeat` a fresh part identity per turnover** so lit rebuilds it (e.g. host it in a keyed wrapper whose key is the turnover generation), achieving the same teardown without a custom directive. Prefer option 1 if directive complexity is acceptable; this avoids a bespoke directive but adds a wrapper template.
3. **(Upstream) File a lit‑html issue.** `removePart` (`directive-helpers.js`) removes only `_$startNode`; the item ChildPart's `_$endNode` comment is never removed, so `repeat` leaks one comment marker per removed key into the live DOM whenever the directive persists across all‑new‑key updates. A fix there removes the need for the blac workaround. Until then, consider pinning/patching or documenting the churn pattern.
4. **(Benchmark hygiene, optional)** The demo's `data.ts buildData` mints globally‑fresh ids so "Create 1,000 rows" is always a full turnover. If the benchmark intends to *measure* create‑from‑scratch, have `run()` `clear()` (→`nothing`, full teardown) before repopulating; that both matches js‑framework‑benchmark semantics and sidesteps the lit orphan accumulation. This is a measurement‑harness change, not a fix for real apps.
5. **(Regression guard)** Add a happy‑dom test asserting the live‑tree comment count (walk `container.childNodes`, count `nodeType === 8`) returns to baseline after each all‑new‑key `each` update — today it grows by ROWS/run. `<scratch>/repro7-comments.mts` and `repro10-blac-census.mts` are ready templates.
