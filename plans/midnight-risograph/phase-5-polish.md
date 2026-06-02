# Phase 5 — Polish

Motion, the light-mode companion, accessibility, and the final regression sweep.
T5.1 and T5.2 are `[PARALLEL]` group B (disjoint files); T5.3 runs last.
**Gate:** this is the finish line — strict build green, AA contrast, motion
respects `prefers-reduced-motion`, no cross-page regressions.

Depends on: Phases 1–4. Read `00-conventions.md` + commit protocol.

---

## T5.1 — Motion layer  ·  Sonnet 4.6 / high  ·  [PARALLEL B]

**Why this model:** animation finesse (variable-font axis interpolation, timing,
reduced-motion correctness) is bounded but delicate craft → Sonnet high; Opus
not warranted for self-contained JS/CSS animation.

**Files (only these):**
- `apps/web-docs/src/styles/riso.css` *(motion keyframes — append; coordinate if
  T2.1's author conventions differ)*
- `apps/web-docs/src/components/overrides/Hero.astro` (wire the load animation to
  the seam T4.1 left)
- a small `apps/web-docs/src/scripts/*.ts` island **only if** JS is needed for
  the variable-font morph (prefer CSS `@keyframes` on `font-variation-settings`)
- `plans/midnight-risograph/TODO.md`

**Do — "delightful surprises", all gated by `prefers-reduced-motion: reduce`:**
1. Hero wordmark: on load, animate `font-variation-settings` (`wght`/`wdth`/
   `opsz`) + the misregistration offset so the two plates **snap into
   registration** and settle into one hue. This is the brand moment.
2. Slow halftone drift behind the hero (transform/opacity only — no layout).
3. One or two hover easter eggs (e.g. a heading that briefly mis-registers on
   hover). Tasteful, sparse.
4. Reduced-motion path = the finished static state from T4.1 (no jank, no FOUC).

Commit: `feat(web-docs): animate hero variable-font registration`.

---

## T5.2 — Light-mode tuning + WCAG AA contrast audit  ·  Sonnet 4.6 / medium  ·  [PARALLEL B]

**Files (only these):**
- `apps/web-docs/src/styles/tokens.css` (adjust light-mode accent/ink values)
- `apps/web-docs/src/styles/riso.css` *(light-mode blend-mode tweaks:
  `multiply` vs `screen` — coordinate appends with T5.1)*
- `plans/midnight-risograph/TODO.md`

**Do:** make the warm-paper light companion fully crafted (not an afterthought).
Audit text/UI contrast against WCAG **AA** (4.5:1 body, 3:1 large/UI) in BOTH
modes — including the demos (they inherit `--sl-*`) and code blocks. Tune the
pastel inks where they fail. Verify the riso overprint blend reads correctly on
cream (likely `multiply`) vs charcoal (likely `screen`). Document any value that
changed for contrast in the commit body.

Commit: `fix(web-docs): tune light mode + meet AA contrast`.

---

## T5.3 — Final strict build + cross-page regression sweep  ·  Sonnet 4.6 / medium  ·  after B

**Files:** any straggler fixes surfaced by the sweep (scoped to `apps/web-docs/**`)
· `plans/midnight-risograph/TODO.md`

**Do:**
1. Run `pnpm --filter @blac/web-docs build` (strict) and `typecheck`; both green.
2. Walk a representative page per topic (guide / core / react / dirtytalk /
   testing / integrations / plugins / a recipe) + the landing + a demo-heavy page
   (e.g. `react/performance.mdx`) and confirm: calm body intact, demos legible,
   code blocks + twoslash hovers themed, page titles + footer correct, no leftover
   indigo→cyan, no broken layout from font swap.
3. Fix any straggler in-scope. Confirm `theme.css` is either coherent or fully
   superseded (no dead rules / no stale brand vars).
4. Format gate green.

Commit: `chore(web-docs): final risograph regression pass`.

---

### After Phase 5
Theme is on `feat/web-docs-midnight-risograph`. Leave PR creation / push to the
user (guardrails forbid agents pushing). Suggest the user review locally with
`pnpm --filter @blac/web-docs dev` when ready.
