# TODO — cross-bloc getter auto-tracking

Branch: `feat/cross-bloc-getter-tracking` (create once before launching agents).

## Phase 1 — foundations (run 01 + 02 IN PARALLEL)
- [ ] **01** Core branded `DepHandle` + `.track()` — `01-core-dep-handle.md` — Sonnet 4.6 / high
- [ ] **02** Extract `buildTrackedProxy` from `useBloc` — `02-react-extract-proxy.md` — Sonnet 4.6 / medium

## Phase 2 — wiring (after 01 + 02 committed)
- [ ] **03** Session + handle wrapper + reconcile + refcount — `03-react-wiring.md` — Opus 4.8 / high

## Phase 3 — spec + docs (after 03 committed)
- [ ] **04** Full test spec + docs — `04-tests-and-docs.md` — Sonnet 4.6 / high

## Global done criteria
- [ ] every `[GAP]` test flipped to passing
- [ ] conditional-dep / mutual-cycle / lifecycle / outside-render cases covered
- [ ] no regressions in `useBloc.cross-bloc-*`, `proxyTracking`, `getter-tracking`
- [ ] core + react packages typecheck/lint/format clean
- [ ] docs (if touched) build clean

## Launch notes
- 01 & 02 edit disjoint packages → safe to run concurrently. Each stages only its
  own files and commits independently. If two `git commit`s race on `index.lock`,
  retry — do not `git add -A`.
- 03 must re-read 01/02's committed output (handle shape, helper signature) in its
  CHECK step before implementing.
- Each agent is a full check→implement→verify→test→commit cycle (see README
  "Agent protocol"). No worktrees. No `--no-verify`. No coauthor. No `git stash`.
