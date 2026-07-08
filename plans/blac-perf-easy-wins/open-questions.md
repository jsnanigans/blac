# Open Questions — blac perf easy-wins

Genuine forks only. Each has a **Recommended default** applied if left blank.

---

## OQ1 — Scope: include the dirtytalk runtime hot path, or `@blac/*` files only?

Blac's per-emit / per-render cost runs *through* `@dirtytalk/structural` (tracker,
container emit/patch/diff) and `@dirtytalk/engine` (channel flush) before it ever
reaches `@blac/core`/`@blac/react`. The highest-impact easy win (PN1 — union
empty-operand fast-path) fires on **every** structural mutation with ≥1 consumer,
i.e. every blac state change.

- **Recommended default — INCLUDE the dirtytalk hot-path items.** Batch =
  PN1, PN2, PN3a, PN5, PN6, PN10 (structural/engine) + BC1 (blac-core) +
  BR3, BR2 (blac-react). This is "perf for blac" in the sense that matters:
  what actually runs on blac's hot path. All are mechanical, low-risk,
  benchable against the existing `hotpath.bench.ts` baseline.
- **Option B — `@blac/*` only.** BC1 + BR3 (+ BR2). Smaller blast radius, no
  adjacent-package edits, but leaves the biggest easy wins (every-mutation
  allocation churn) untouched — much lower total impact.

**Answer:**

---

## OQ2 — BR2 (dep-reconcile short-circuit): include, or defer?

BR2 short-circuits the useBloc layout-effect that re-registers consumer paths and
re-subscribes cross-bloc deps every commit (`useBloc.ts:509-553`). It is the ONE
item in this batch that touches reactive-subscription **correctness** — a wrong
short-circuit could drop a re-subscribe and stale/miss updates. The other items
are pure allocation removals with no behavior change.

- **Recommended default — INCLUDE, with a dedicated adversarial verify lens.**
  Guarded short-circuit only (skip when session + paths are provably identical to
  last commit); verify specifically probes missed-resubscribe / stale-interest
  across dep add / drop / re-register / args-change.
- **Option B — DEFER BR2** to its own pass; ship only BC1 + BR3 on the blac-react
  side this round. Keeps this batch 100% behavior-preserving.

**Answer:**

---

## OQ3 — The "highest impact" item (P6 tracker allocation) is NOT an easy win. In or out?

The request says both "highest impact" and "easy win." These conflict for exactly
two items:
- **P6 / PN4** — shared Proxy handler + per-proxy WeakMap state (1 alloc vs 3 per
  node per render). The single heaviest allocation site in the system, but M-L
  effort, needs a benchmark to confirm the per-`get` WeakMap-lookup cost doesn't
  eat the win, and is a design decision.
- **BR1** — memoized ancestor-watch-id cache for `expandWithAncestors`. M effort,
  edits `@dirtytalk/structural`, and touches the same ancestor-cache machinery
  that just shipped with an invalidation bug — needs the same care.

- **Recommended default — OUT (non-goal this pass).** Neither is an "easy win";
  both deserve a separate measurement-first pass. This plan stays mechanical/
  low-risk. P6 stays logged as the top future prize.
- **Option B — include P6 and/or BR1** in this plan (raises risk + effort, adds a
  measurement gate; no longer a pure easy-win batch).

**Answer:**

---

## OQ4 — Worktree: run the parallel disjoint clusters "here" or in the pool?

Phase 1 fans out 4 file-disjoint clusters (structural / engine / blac-core /
blac-react) in parallel. They never touch the same file, so a single working tree
has no edit conflict.

- **Recommended default — HERE** (sequential commits on the current branch).
  Matches the prior `dirtytalk-perf-stability` run, which parallelized disjoint
  clusters "here" cleanly. No build dirties the tree during impl (validation is
  end-only).
- **Option B — pool worktree** (`agent1/2/3`) if you want the live tree kept
  pristine during the run.

**Answer:**
