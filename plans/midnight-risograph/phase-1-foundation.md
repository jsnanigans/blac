# Phase 1 — Foundation

Tokens, self-hosted variable font, and global type. Everything downstream
consumes this. **Gate:** strict build green + both fonts loading + dark palette
visibly applied before starting Phase 2.

Depends on: nothing. Read `00-conventions.md` first.

---

## T1.1 — Color token system  ·  Sonnet 4.6 / medium  ·  do first

**Why this model:** token mapping is well-trodden but must respect Starlight's
full `--sl-*` variable contract carefully — standard implementation work.

**Files (only these):**
- `apps/web-docs/src/styles/tokens.css` (new)
- `apps/web-docs/astro.config.mjs` (add `tokens.css` to `customCss`)
- `apps/web-docs/src/styles/theme.css` (migrate/trim brand vars; drop if emptied)
- `plans/midnight-risograph/TODO.md` (tick box)

**Do:**
1. Create `tokens.css` defining the full `--blac-*` palette for dark (`:root`)
   and light (`:root[data-theme='light']`) per the token contract in
   `00-conventions.md`.
2. Map `--blac-*` onto Starlight's `--sl-color-*` contract (accent ramp, bg,
   bg-nav, text, white, black, gray-1..6). Redefine `--blac-gradient` as the
   plate-A→plate-B overprint gradient.
3. Replace the old indigo→cyan brand vars currently in `theme.css`. Keep the
   `.hero h1` gradient-clip and card-hover rules working against the new vars (or
   move them; `.hero`/`.card` get fully reworked in Phase 4/3 — leave functional).
4. Declare `--blac-font-*` token NAMES here (values can stay as the fallbacks
   until T1.2 wires `@font-face`), so T1.2 and later tasks can reference them.

**Verify/test/commit:** per the contract. Commit:
`feat(web-docs): add midnight-risograph color tokens`.

---

## T1.2 — Self-hosted variable + body fonts, type scale  ·  Sonnet 4.6 / high  ·  [PARALLEL] after T1.1 sets font var names

**Why this model:** font sourcing, subsetting, fallback-metric tuning, and a
type scale involve real judgment (licensing, CLS avoidance) — bounded but tricky,
so Sonnet at high effort, not Opus.

**Files (only these):**
- `apps/web-docs/src/styles/fonts.css` (new — `@font-face` blocks)
- `apps/web-docs/public/fonts/**` (subset `.woff2` files)
- `apps/web-docs/src/styles/tokens.css` (set `--blac-font-display/-body` values +
  add the global type scale; coordinate edits with T1.1 — if run truly
  concurrently, append a clearly-marked block to avoid clobbering)
- `apps/web-docs/astro.config.mjs` (add `fonts.css` FIRST in `customCss`)
- `plans/midnight-risograph/TODO.md`

**Do:**
1. Obtain **Fraunces** (variable; `wght`+`opsz`, ideally `SOFT`+`WONK`) and
   **Hanken Grotesk** (variable `wght`) — both OFL. Subset to Latin + the glyphs
   the docs use; emit `woff2`. Document the source/version + license in the
   commit body.
2. Write `@font-face` with `font-display: swap` and fallback metric overrides
   (`size-adjust`, `ascent-override`, `descent-override`) so swap-in doesn't
   shift layout. Body → Hanken; display → Fraunces.
3. Set `--blac-font-display`/`--blac-font-body` and apply `--blac-font-body` to
   global body text; reserve `--blac-font-display` for headings/set-pieces (the
   riso components in Phase 2 will pull it). Establish a modular type scale
   (sizes/line-heights) consistent with Starlight's `--sl-text-*`.
4. Keep payload honest (the prior theme bragged "no web-font payload") — subset
   hard, note the resulting KB in the commit body.

**Test note:** confirm via the strict build + that `woff2` assets resolve (no
404 in build output). Commit:
`feat(web-docs): self-host fraunces + hanken variable fonts`.
