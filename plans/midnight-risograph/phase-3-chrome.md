# Phase 3 — Chrome

Re-skin the Starlight furniture: sidebar/nav/cards, page titles, footer, and the
brand marks. All four tasks touch **disjoint files** → `[PARALLEL]` group A.
**Gate:** strict build green + every doc page reads as the new theme (calm body,
riso page titles, zine footer) before Phase 4.

Depends on: Phase 1 (tokens/fonts) + Phase 2 (riso kit). Read `00-conventions.md`
+ its commit protocol (parallel agents share the index).

---

## T3.1 — Chrome CSS  ·  Sonnet 4.6 / medium  ·  [PARALLEL A]

**Files:** `apps/web-docs/src/styles/chrome.css` (new) ·
`apps/web-docs/astro.config.mjs` (add to `customCss`, last) · `TODO.md`

**Do:** polish sidebar, nav/header, the topic-switcher dropdown (it's the primary
package switcher — keep it first-class), `<CardGrid>`/`<Card>`, search box, and
the on-this-page TOC to match the dim-study aesthetic using only `--blac-*` /
`--sl-*` vars. Calm and readable — restraint here; the loudness lives in titles
and the landing. Preserve focus states + keyboard affordances.

Commit: `style(web-docs): reskin sidebar/nav/cards chrome`.

---

## T3.2 — `PageTitle.astro` override  ·  Sonnet 4.6 / medium  ·  [PARALLEL A]

**Files:** `apps/web-docs/src/components/overrides/PageTitle.astro` (new) ·
`apps/web-docs/astro.config.mjs` (`components.PageTitle`) · `TODO.md`

**Do:** override Starlight's PageTitle to render the H1 via `RisoHeading` (Phase
2) — a controlled "wild moment" on every page, but tasteful at body scale (lower
intensity than the hero). Start from Starlight's default PageTitle; keep the
heading semantics + any frontmatter title wiring intact.

Commit: `feat(web-docs): riso-style page titles`.

---

## T3.3 — `Footer.astro` zine colophon  ·  Sonnet 4.6 / medium  ·  [PARALLEL A]

**Files:** `apps/web-docs/src/components/overrides/Footer.astro` (new) ·
`apps/web-docs/astro.config.mjs` (`components.Footer`) · `TODO.md`

**Do:** override the footer into a printer's-colophon style block (edition note,
"printed with BlaC", halftone rule via `SectionBreak`, the GitHub/edit links).
Preserve the default footer's existing content/links (edit-link, last-updated,
prev/next pagination) — wrap, don't drop them.

Commit: `feat(web-docs): add zine colophon footer`.

---

## T3.4 — Logo + favicon riso re-skin  ·  Haiku 4.5 / medium  ·  [PARALLEL A]

**Why this model:** small, mostly-mechanical SVG recolor with a touch of taste —
cheapest tier that can do it; step to Sonnet/low if judgment is needed.

**Files:** `apps/web-docs/src/assets/logo.svg` ·
`apps/web-docs/public/favicon.svg` · `TODO.md`

**Do:** both SVGs currently use the old `#6366F1`→`#22D3EE` indigo→cyan gradient.
Re-skin to the riso ink pair (`#8fa9c4` dusty blue + `#e08a7a` coral) — replace
the gradient with a two-ink overprint feel; keep the mark's geometry + the
`role="img"` / `aria-label`. Don't change dimensions or the `astro.config.mjs`
logo wiring.

Commit: `style(web-docs): reskin logo + favicon to riso inks`.
