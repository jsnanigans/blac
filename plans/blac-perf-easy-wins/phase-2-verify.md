# Phase 2 — Adversarial verify (4 lenses, parallel)

**Goal:** each cluster's edits are proven correct AND behavior-preserving before
any commit; the two risk-bearing clusters (PN1 alias-safety, BR2 reconcile
correctness) get deeper (opus) scrutiny.

**Parallel:** 4 read-only verify agents run concurrently after Phase 1. No file
edits.

**Owners:** investigator-opus (structural, react), investigator/high (engine,
core). Read the working-tree diff; **do NOT run tests.** Return `{id, holds,
issues[]}` via schema.

## Verify (phase entry — orchestrator)

- Phase 1 diff present across all permitted files (`git diff --stat`).

## Tasks

| # | Lens | Agent | Files | Must probe | Report-back |
|---|------|-------|-------|-----------|-------------|
| V-A | structural | investigator-opus | `path-set.ts`, `container.ts`, `tracker.ts` + tests | **PN1**: is returning an operand Set from `pathSetUnion` alias-safe — trace `container.emit`/`patch` and `dirty-channel.mark`/`#flush`; does any producer retain or mutate the Set after handing it to `mark`? Is `#accumulated` ever mutated in place (vs replaced)? **PN2**: do the single-pass + closureless loop produce byte-identical marks to the old two-pass `.some()` on array-replace, class-instance-replace, and mixed patches? **PN5**: is `prefix` interning still lazy (same `interner.size`/`_ancestorIds`-clear timing) — or now eager at `wrap()`? **PN6**: does the cached closure read `_equalsByPathId` live? **PN10**: identical empty/non-empty branch. | `{id:"structural", holds, issues}` |
| V-B | engine | investigator/high | `dirty-channel.ts` + test | **PN3a**: zero-error flush allocates no array; single error throws the bare error (not wrapped); ≥2 throws `AggregateError` with the same message; the re-entrant reschedule (step 9) and `#disposed`/flushing state are untouched. | `{id:"engine", holds, issues}` |
| V-C | core | investigator/high | `plugin/PluginManager.ts` + test | **BC1**: context built ≤1×/dispatch and 0× when no enabled plugin has the hook; the shared `ctx` is identical in contents to a per-plugin build; no plugin path depends on a distinct `ctx` identity per callback; `onStateChange` vs lifecycle-hook dispatch both covered. | `{id:"core", holds, issues}` |
| V-D | react | investigator-opus | `useBloc.ts` + test | **BR2 (CRITICAL)**: can the short-circuit EVER skip a needed re-`registerConsumerPaths`, dep subscribe/unsubscribe, or interest refresh? Construct the cases: dep added, dep dropped, dep re-registered with changed paths, dep args/key/refId changed, primary tracked-path changed, first commit, `select` present vs absent. Does the signature capture every field the reconcile branches on? Is a stale subscription ever left live or a new one missed? **BR3**: does the `Object.is` fast-path return exactly the key `JSON.stringify` would for changed args, and skip only on reference-stable args? | `{id:"react", holds, issues}` |

## Orchestrator gate (after verdicts)

- All `holds:true` → proceed to commits.
- Any `holds:false` → triage: if a surgical in-scope fix (like the P4b memo fix in
  the prior plan), delegate a `quick-build` fix + re-verify that lens, then commit.
  If it reveals a wrong assumption (e.g. PN1 is NOT alias-safe, or BR2 can drop a
  subscription) → write `BLOCKED.md`, stop, do not commit that cluster. The other
  green clusters may still commit independently (disjoint packages).

## Commit (orchestrator, per package)

- `perf(structural): union fast-path, closureless refine, lazy prefix/equals memo` (Cluster A: PN1/PN2/PN5/PN6/PN10)
- `perf(engine): lazy flush error array` (Cluster B: PN3a)
- `perf(core): build plugin context once per dispatch` (Cluster C: BC1)
- `perf(react): skip unchanged dep-reconcile, cache args key` (Cluster D: BR3/BR2)

Batching disjoint-package commits is fine; subagents never commit.

## Done-check

- [ ] 4 verdicts collected; all `holds:true` (or fixed + re-verified).
- [ ] PN1 alias-safety explicitly confirmed by V-A.
- [ ] BR2 confirmed to never drop/miss a subscription by V-D.
