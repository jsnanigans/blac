# Midnight Risograph — TODO tracker

Agents tick their own box (the tick may ride in the task's own commit). Phases
are sequential; `[‖]` = parallel-eligible within its phase (see commit protocol
in `00-conventions.md`).

## Setup
- [x] Orchestrator: `git switch -c feat/web-docs-midnight-risograph` (off `main`)

## Phase 1 — Foundation
- [x] **T1.1** Color token system — `tokens.css` · Sonnet/medium · *do first*
- [x] **T1.2** `[‖]` Self-hosted Fraunces + Hanken + type scale · Sonnet/high
- [x] Phase gate: strict build green, fonts load, dark palette applied

## Phase 2 — Riso kit
- [x] **T2.1** Riso primitive CSS — `riso.css` · Sonnet/high · *do first*
- [x] **T2.2** Riso Astro components (Heading/Break/Grain) · Sonnet/medium
- [x] Phase gate: primitives render on a scratch check, build green

## Phase 3 — Chrome  (`[‖]` group A — disjoint files)
- [x] **T3.1** `[‖A]` Chrome CSS (sidebar/nav/cards) · Sonnet/medium
- [ ] **T3.2** `[‖A]` `PageTitle.astro` riso titles · Sonnet/medium
- [ ] **T3.3** `[‖A]` `Footer.astro` zine colophon · Sonnet/medium
- [x] **T3.4** `[‖A]` Logo + favicon riso re-skin · Haiku/medium
- [ ] Phase gate: every doc page reads as the new theme, build green

## Phase 4 — Landing (flagship)
- [ ] **T4.1** Hero override + `index.mdx` rebuild · **Opus/high**
- [ ] Phase gate: hero is the signature moment, all links resolve, build green

## Phase 5 — Polish  (`[‖]` group B = T5.1 + T5.2; T5.3 last)
- [ ] **T5.1** `[‖B]` Motion: variable-font registration snap + drift + easter eggs · Sonnet/high
- [ ] **T5.2** `[‖B]` Light-mode tuning + WCAG AA contrast audit · Sonnet/medium
- [ ] **T5.3** Final strict build + cross-page regression sweep · Sonnet/medium
- [ ] Phase gate: AA contrast, reduced-motion respected, no regressions

## Done
- [ ] Hand off to user for review (`pnpm --filter @blac/web-docs dev`) + PR/push
