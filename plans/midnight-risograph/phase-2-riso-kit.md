# Phase 2 — Riso kit

The print-artifact toolkit: CSS-only primitives + opt-in Astro components. This
is where the "wild moments" become reusable. **Gate:** strict build green +
components render with visible halftone/overprint/misregistration on a scratch
page before Phase 3.

Depends on: Phase 1 (tokens + `--blac-*` ink vars + display font). Read
`00-conventions.md` first.

---

## T2.1 — Riso primitive CSS  ·  Sonnet 4.6 / high  ·  do first

**Why this model:** blend-mode / halftone / overprint CSS is fiddly craft with
many gotchas (stacking contexts, `mix-blend-mode` isolation, print-look
realism). Bounded but tricky → Sonnet high. Zero dependencies — pure CSS/SVG.

**Files (only these):**
- `apps/web-docs/src/styles/riso.css` (new)
- `apps/web-docs/astro.config.mjs` (add to `customCss` after `tokens.css`)
- `plans/midnight-risograph/TODO.md`

**Do — build these reusable utilities (all driven by `--blac-ink-a/-b` tokens):**
1. `.riso-halftone` — repeating radial-gradient dot field as a background layer;
   size/opacity tunable via custom props. Must sit behind content, not harm
   readability.
2. `.riso-overprint` — duplicate-layer text/element technique using two pseudo
   layers offset by a small delta, `mix-blend-mode: screen` (dark) /
   `multiply` (light) so plate A + plate B blend into a third hue. Wrap in
   `isolation: isolate` to contain the blend.
3. `.riso-misregister` — 1–2px channel offset for display type (the off-press
   look); expose the offset as a custom prop so it can animate in Phase 5.
4. `.riso-grain` — one inline SVG `feTurbulence` noise overlay at low opacity,
   applied site-wide via a single fixed element (document the intended mount
   point for T3/T4). Respect performance: one filter, not per-element.
5. Define `--blac-grain-opacity`, `--blac-halftone-size`, `--blac-misregister`
   knobs with sensible defaults.

Keep it strictly opt-in: none of these may leak onto body prose by default.

**Verify/test/commit:** per contract. Commit:
`feat(web-docs): add riso print-artifact css primitives`.

---

## T2.2 — Riso Astro components  ·  Sonnet 4.6 / medium  ·  after T2.1

**Why this model:** straightforward component authoring against the T2.1 class
contract — standard work.

**Files (only these):**
- `apps/web-docs/src/components/riso/RisoHeading.astro` (new)
- `apps/web-docs/src/components/riso/SectionBreak.astro` (new)
- `apps/web-docs/src/components/riso/Grain.astro` (new)
- `apps/web-docs/src/components/riso/README.md` (new — embedding contract, mirror
  the tone of `src/components/demos/README.md`)
- `plans/midnight-risograph/TODO.md`

**Do:**
1. `RisoHeading` — renders a heading in `--blac-font-display` with
   `.riso-overprint` + optional `.riso-misregister`; props for level (`as`),
   text, and intensity. Accessible (real heading element, no decorative text in
   the a11y tree twice — use `aria-hidden` on duplicate plate layers).
2. `SectionBreak` — a full-bleed halftone divider set-piece for between major
   sections; slot for an optional label.
3. `Grain` — mounts the single site-wide `.riso-grain` overlay (used by Hero /
   layout in later phases); `aria-hidden`, `pointer-events: none`.
4. README documents usage + that these are the ONLY sanctioned way to introduce
   riso loudness into a page.

**Test note:** add a temporary scratch `.astro`/`.mdx` under `src/` only if you
need to eyeball render, then delete it before commit (don't ship scratch pages).
Commit: `feat(web-docs): add riso heading/break/grain components`.
