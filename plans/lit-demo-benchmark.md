# Plan: lit-demo Benchmark Page

## Decision
**Approach**: Port `apps/perf`'s `DemoBloc`/`DemoPage`/timing harness into a new `apps/lit-demo/src/benchmark/` module using existing `@blac/lit` primitives (`component`/`select`/`each`/`pulse`), storing a plain `indexById: Map<number,number>` in bloc state to avoid two lit-specific pitfalls.
**Why**: Keeps action semantics byte-for-byte identical to perf's canonical bloc; the `indexById` field sidesteps (a) `ComponentDirective` ignoring a row's `args` after first mount (`packages/blac-lit/src/component.ts:63`, `if (this.started) return this.result`) — so an `index` arg goes stale once `remove`/`swapRows` reorder existing rows — and (b) the documented getter-tracking gotcha (memoized getters don't reliably register tracked paths). A naive `.find(id)` per row is correct but O(n) per row = O(n²) at 10,000 rows, defeating the point of a perf demo.
**Risk Level**: Medium — mechanically simple, but the row-identity pitfall is non-obvious and easy to "simplify away" incorrectly.

## Implementation Steps
1. **New `benchmark/data.ts`** — port `buildData(count)` verbatim from `apps/perf/src/shared/data.ts` (same `A`/`C`/`N` word lists, same `random`/incrementing-id logic). Skip `resetId` — unused by perf's own interactive DemoPage.
2. **New `benchmark/timing.ts`** — port `measureEndToEnd(fn)` verbatim from `apps/perf/src/harness/timing.ts` (mark/measure wrapping `fn`, one rAF + `setTimeout(0)` before stopping the clock). Skip unused `waitForRenderComplete`/`delay`.
3. **New `benchmark/benchmark.bloc.ts`**:
   - `DataItem {id:number; label:string}`; `BenchmarkState {data:DataItem[]; indexById:Map<number,number>; selected:number|null}`.
   - Helper `withIndex(data) => ({data, indexById: new Map(data.map((d,i)=>[d.id,i]))})`, used by every mutating action.
   - Actions mirror `FrameworkBenchmark.tsx`'s `DemoBloc` exactly: `run` (emit `{...withIndex(buildData(1000)), selected:null}`), `runLots` (10000), `add` (patch `withIndex([...data,...buildData(1000)])`), `updateEveryTenth` (copy array, every 10th row's `label += ' !!!'`, patch `withIndex(...)`), `select(id)` (patch `{selected:id}`), `remove(id)` (splice by id, patch `withIndex(...)`), `clear` (emit `{data:[],indexById:new Map(),selected:null}`), `swapRows` (swap indices 1/998 if `length>998`, patch `withIndex(...)`).
   - Co-locate a second, small `TimingLogBloc extends Cubit<{entries: TimingEntry[]}>` in this same file (`TimingEntry {label; endToEnd; bodyExecsDelta; patchesDelta}`), with one action `logEntry(e)` that unshifts and slices to 8. Kept separate from `BenchmarkState` so the ported row-benchmark logic stays a clean 1:1 port; reusable by future pages.
4. **New `benchmark/benchmark.ui.ts`**:
   - `BenchmarkRow = component<{id:number}>((ctx) => {...})` using `ctx.use(BenchmarkBloc)`. **Args must be `{id}` only — never an index.** Template: `<tr class=${select(b,s=>s.selected===id?'selected':'')}>`, `<td>${id}</td>`, a label `<td ${pulse()}><a @click=${()=>b.select(id)}>${select(b,s=>{const i=s.indexById.get(id); return i===undefined?'':s.data[i].label;})}</a></td>`, a remove `<td><a @click=${()=>b.remove(id)}>×</a></td>` (mirrors the `glyphicon-remove` cell).
   - `BenchmarkPage = component(BenchmarkBloc, (b, ctx) => {...})`: local `OPERATION_LABELS`-equivalent const object (port from `apps/perf/src/shared/types.ts`, dropping the React-only `BenchmarkAPI`/`ProfilerMetric` types), one button per op (`run`,`runLots`,`add`,`updateEveryTenth`,`clear`,`swapRows`) each wrapped by a local `runTimed(label, fn)` that snapshots `devStats.snapshot()` (import from `../dev/devStats`) before/after `measureEndToEnd(fn)`, then calls `TimingLogBloc`'s `logEntry`.
   - Select/remove-by-id: two plain `<input>` + `<form>` pairs using `createRef`/`ref()` from `lit-html/directives/ref.js` (same pattern as `dev/hud.ui.ts`) — read `.value` on submit, parse int, call the bloc action inside `runTimed`. No new bloc-state fields needed for these inputs.
   - Timing log table: `each(select(logBloc, s=>s.entries), (e)=>html\`<tr>...\`, (e,i)=>i)` rendering `label | endToEnd.toFixed(2) | bodyExecsDelta | patchesDelta`. (No lit equivalent to React's Profiler actualDuration/baseDuration — replaced with devStats deltas.)
   - Row table body: `each(select(b, s=>s.data), (item)=>BenchmarkRow({id:item.id}), item=>item.id)`.
5. **`router/router.bloc.ts`** — add `'benchmark'` to the `Route` union (line 3); add `{path:'benchmark', label:'Benchmark'}` to `ROUTES` (after line 7).
6. **`app.ts`** — import `BenchmarkPage` from `./benchmark/benchmark.ui`; add a `benchmark: () => html\`<div class="route route--benchmark">${BenchmarkPage()}</div>\`` case inside the existing `match()` (after the `market` case, ~line 33), as its own distinct `html` template per the file's existing comment.
7. **`styles.css`** — append after line 431 (end of `.market` block): `.benchmark-controls`/`.benchmark-forms` (flex+gap, mirror `.market-toolbar`), `.benchmark-table` (copy `.market`'s box model; add `tr.selected { background: rgba(255,107,122,.14); }` reusing `--danger`), `.bench-log` (small table, same visual language as `.market`).

## Files to Change
- `apps/lit-demo/src/benchmark/data.ts` — new, `buildData` port.
- `apps/lit-demo/src/benchmark/timing.ts` — new, `measureEndToEnd` port.
- `apps/lit-demo/src/benchmark/benchmark.bloc.ts` — new, `BenchmarkBloc` + `TimingLogBloc`.
- `apps/lit-demo/src/benchmark/benchmark.ui.ts` — new, `BenchmarkPage` + `BenchmarkRow`.
- `apps/lit-demo/src/router/router.bloc.ts` — add `'benchmark'` route + nav entry.
- `apps/lit-demo/src/app.ts` — add import + `match()` case.
- `apps/lit-demo/src/styles.css` — new benchmark CSS block.

## Acceptance Criteria
- [ ] All 6 ops (`run`/`runLots`/`add`/`updateEveryTenth`/`clear`/`swapRows`) behave identically to `apps/perf`'s DemoBloc, same button labels.
- [ ] Select-by-id and remove-by-id forms work.
- [ ] After `remove` or `swapRows`, every visible row shows its own correct label/id (validates `indexById`, not a stale index).
- [ ] Timing log shows endToEnd ms + body-exec/patch deltas, newest first, capped at 8.
- [ ] HUD body-exec count stays flat during label-only updates; only `pulse()`'d cells flash.
- [ ] Nav shows "Benchmark"; `#/benchmark` renders the page; other routes unaffected.

## Risks & Mitigations
**Main Risk**: An implementer "simplifies" row lookups back to an `index` arg or a memoized getter, silently breaking correctness after `remove`/`swapRows` (or reintroducing O(n²) cost).
**Mitigation**: This plan mandates `indexById` as plain emitted bloc state, read via `select`, exactly as specified in Step 3/4 — do not deviate.

## Out of Scope
- Porting the automated Dashboard benchmark suite / pureState microbenchmarks.
- A React-Profiler equivalent (no lit analog exists); replaced with devStats deltas.
- Any change to `plans/lit-demo-fullapp.md` or existing pages/routes.
