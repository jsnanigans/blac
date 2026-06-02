# Phase 4 — Landing (flagship)

The loudest moment in the whole site: the hero set-piece + rebuilt landing page.
One cohesive creative task, one agent. **Gate:** strict build green + the hero
reads as the signature moment + all card links still resolve before Phase 5.

Depends on: Phase 2 (riso kit) + Phase 3 (overrides + brand marks). Read
`00-conventions.md` first.

---

## T4.1 — Hero override + landing rebuild  ·  Opus 4.8 / high

**Why this model:** this is the single flagship — highest creativity, highest
ambiguity, many moving parts (layout, type, riso layering, brand storytelling)
composed into one impression. This is where Opus earns its premium; everything
else is Sonnet/Haiku.

**Files (only these):**
- `apps/web-docs/src/components/overrides/Hero.astro` (new)
- `apps/web-docs/astro.config.mjs` (`components.Hero`)
- `apps/web-docs/src/content/docs/index.mdx` (rebuild the splash page)
- `apps/web-docs/src/styles/chrome.css` *(only if hero-specific styles belong
  with chrome; otherwise inline/scope in Hero.astro — avoid colliding with T3.1
  if any overlap remains)*
- `plans/midnight-risograph/TODO.md`

**The signature moment (static structure here; motion comes in T5.1):**
> Hero wordmark **BlaC** in Fraunces (`--blac-font-display`), composed as a
> two-plate overprint (coral + dusty blue) that resolves into one clean hue.
> Halftone drifts behind it (`Grain`/`riso-halftone`). Tagline reinforces
> "state, handled — chaos resolving into calm."

**Do:**
1. Build `Hero.astro` overriding Starlight's splash hero. Use `RisoHeading` /
   riso primitives for the wordmark; lay out tagline + the two CTAs
   ("Get started" → `/guide/getting-started/`, "View on GitHub"). Keep it
   accessible (one real `h1`, decorative plate layers `aria-hidden`).
2. Rebuild `index.mdx` to use the new hero and a calmer-but-characterful section
   beneath it. Keep the existing four-card package grid (Guide / blac-core /
   blac-react / dirtytalk) and ALL their links intact — re-style, don't remove.
   Use `SectionBreak` between sections for rhythm.
3. Leave a clear seam for T5.1 to attach the load/hover animation (e.g. a stable
   class/data-attr on the wordmark) — but ship a tasteful **static** state that
   already looks finished (and is the `prefers-reduced-motion` state).

**Verify/test/commit:** per contract; click-through that every landing link
resolves in the build output. Commit:
`feat(web-docs): rebuild landing hero as riso set-piece`.
