# Phase 1 — Island demos (parallel after 0.1)

Real, non-editable `@blac/react` demos. Each task owns **disjoint** demo
components + doc pages, so the group is dependency-free (see README execution
note for the no-worktree caveat). All demos reuse `DemoFrame`/`RenderCounter`
from Phase 0. Pages receiving a demo are renamed `.md`→`.mdx`.

**Read README.md hard rules first. Depends on: 0.1 committed.**

> ~8 islands, concentrated on the React re-render value prop. The principle:
> islands defend the *claims*. The render-counter demo is the recurring star.

---

## Task 1.A — Value-prop render-counter islands (the "aha")

- **Model / effort:** **Sonnet 4.6 / high.** _Rationale: this is the hero demo
  that proves BlaC's headline (only the reading component re-renders).
  Correctness of the claim — and the framing — matters most here._
- **Owns:** `demos/RenderCounterDemo.tsx` (+ small variants) and pages
  `guide/introduction.mdx` (already `.mdx` from 0.1), `guide/mental-model.mdx`,
  `guide/concepts.mdx`.
- **CHECK:** Read the three pages; identify the exact spot each makes the
  re-render claim so the demo lands next to the prose.
- **IMPLEMENT:** A two-component demo where one reads `count`, one reads `name`;
  render-counters show only the reader of changed state re-renders. Reuse on
  mental-model (annotated) and concepts (lightweight single cubit).
- **VERIFY:** build exit 0; demos hydrate; counters reflect real renders.
  `vp fmt` + `format:check` on owned files.
- **TEST:** manual `dev` smoke per page.
- **COMMIT:** `feat(web-docs): add re-render demos to value-prop pages`

---

## Task 1.B — React feature islands (headline-validating)

- **Model / effort:** **Sonnet 4.6 / high.** _Rationale: dependency-tracking is
  the demo that *proves* automatic tracking — the most scrutinized claim. Worth
  the careful model._
- **Owns:** `demos/DependencyTrackingDemo.tsx`, `demos/PerformanceDemo.tsx`,
  `demos/UseBlocDemo.tsx` and pages `react/dependency-tracking.mdx`,
  `react/performance.mdx`, `react/use-bloc.mdx`.
- **CHECK:** Confirm current tracking semantics against memory note
  "Auto-track subscription rules" (getters don't subscribe; array
  iterate+`.length`). Demo must not imply unsupported tracking.
- **IMPLEMENT:** dependency-tracking → two consumers tracking different fields,
  render-counters prove selectivity. performance → `select` vs no-`select`
  side-by-side. use-bloc → minimal counter through the hook.
- **VERIFY / TEST / COMMIT:** as 1.A.
  `feat(web-docs): add dependency-tracking & perf demos`

---

## Task 1.C — Behavior islands (inputs + async)

- **Model / effort:** **Sonnet 4.6 / medium.** _Rationale: real demos but the
  build typechecks the blac usage; less claim-sensitive than 1.A/1.B._
- **Owns:** `demos/InputsDemo.tsx`, `demos/AsyncDemo.tsx` and pages
  `guide/inputs.mdx`, `guide/async.mdx`.
- **CHECK:** `args` semantics. `useBloc` options are
  `{ args?, select?, onMount?, onUnmount? }` — **no `instanceId`**. Instance
  identity derives from `args`; for a per-mount private instance pass a stable
  unique object `{ args: { _id: useId() } }`.
- **IMPLEMENT:** inputs → change an input, observe instance behavior. async →
  live loading→success→error transitions (real timers feel authentic).
- **VERIFY / TEST / COMMIT:** as 1.A.
  `feat(web-docs): add inputs & async behavior demos`

---

## Task 1.D — DevTools live-state island (OPTIONAL)

- **Model / effort:** **Sonnet 4.6 / medium.** _Rationale: nice-to-have; skip if
  a live state stream is costly — a GIF/screenshot is an acceptable fallback._
- **Owns:** `demos/DevToolsDemo.tsx`, page `plugins/devtools.mdx`.
- **CHECK:** whether a lightweight live state view is feasible without pulling
  the full DevTools UI into the bundle. If not, downgrade to a static asset and
  log the decision.
- **IMPLEMENT / VERIFY / TEST / COMMIT:** as above.
  `feat(web-docs): add live-state demo to devtools page`

---

## Exit criteria for Phase 1

- ~7–8 islands live across the value-prop + React pages; build green; each
  hydrates and behaves. Sandpack untouched.
