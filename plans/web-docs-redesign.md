# Plan: `apps/web-docs` Whimsical & Accessible Redesign

## Goal

Redesign and polish `apps/web-docs` with a whimsical, colorful, abstract aesthetic ("Kinetic Risograph & Bauhaus State Machine") while maintaining strict WCAG AA/AAA accessibility, effortless long-form readability, and expressive typography.

## Design Direction & Decisions

- **Aesthetic Concept**: *Kinetic Bauhaus & Risograph Overprint* — inspired by subtractive/additive print registration, geometric state machines, and tactile lab instruments.
- **Color Palette (`src/styles/tokens.css`)**:
  - **Dark theme ("Midnight Risograph")**: Deep velvet-ink canvas (`#0b0a12`), elevated warm-slate surfaces (`#141222`, `#1d1a30`, `#272340`), high-contrast alabaster text (`#f8f7ff`, 18.2:1 contrast), and vibrant neon-print primaries:
    - Cobalt / Electric Blue (`#2b84d8` / text `#6ec1ff`, 9.6:1) — Structure & Cubits
    - Acid Rose / Magenta (`#f04e98` / text `#ff82bf`, 8.1:1) — Reactive Signals & Mutations
    - Solar Amber / Gold (`#ffb830` / text `#ffc857`, 11.8:1) — Tracked State Paths
    - Mint / Emerald (`#22c993` / text `#5ce6b8`, 11.2:1) — Live Render Confirmation
    - Ultraviolet / Indigo (`#5842e3` / text `#b5a6ff`, 8.5:1) — Proxy Lens Overprint
    - Coral (`#ff6b4a` / text `#ff967d`, 8.6:1) — Secondary Geometric Accents
  - **Light theme ("Warm Archival Vellum")**: Warm paper background (`#fbf9f5`), soft stone/vellum surfaces (`#f2eee6`, `#e7e1d6`), deep ink text (`#121020`, 17.1:1 contrast), and rich archival-ink accents that all pass WCAG AA/AAA contrast on light paper.
- **Typography (`src/styles/fonts.css`, `src/styles/content.css`)**:
  - `Bricolage Grotesque` with `font-optical-sizing: auto` and explicit `opsz` settings (`96` hero, `72` h1, `48` h2, `32` h3) for expressive, quirky display headings, hero titles, card headers, and numerals.
  - `Hanken Grotesk` with `1.0625rem` (`17px`) body size, `1.72` line-height, and `45rem` content width for effortless long-form technical reading.
  - `JetBrains Mono` with contextual ligatures and tabular numerals for code blocks, inline tokens, and live render counters.
- **Logo & Brand Marks (`src/assets/logo.svg`, `public/favicon.svg`, `Eyebrow.astro`, `Footer.astro`, `PageTitle.astro`)**:
  - Geometric Bauhaus monogram combining the structural `b` stem/bowl (with an offset Solar Gold cap), the reactive `c` aperture lens, their Ultraviolet overprint intersection, a 4-point Solar Gold spark inside the aperture mouth, and a Mint satellite node.
- **Homepage Hero & Animations (`src/components/overrides/Hero.astro`, `src/content/docs/index.mdx`)**:
  - Interactive & animated SVG "Kinetic State Machine" artwork illustrating an `AppCubit · Proxy` core, a scanning Proxy lens, and 3 component nodes (`<Counter />`, `<Avatar />`, `<Theme />`) where signal pulses travel along tracked paths and increment live visual badges (`2x`, `1x`, `1x`).
  - Interactive node triggers (`count++`, `user.name`, `theme`) so visitors can manually emit state mutations and watch only the subscribed node react.
  - Quick-copy install command bar (`pnpm add @blac/core @blac/react`) in the hero copy column.
  - Added `<DependencyTrackingDemo client:visible />` directly to the homepage (`index.mdx`) so visitors can test multi-component leaf isolation immediately.
  - Full `prefers-reduced-motion: reduce` support.
- **Interactive Demos & Chrome (`src/components/demos/demos.css`, `src/components/demos/RenderCounter.tsx`, `src/styles/chrome.css`, `src/styles/code-themes.mjs`)**:
  - Tactile hardware/lab-instrument styling for `<DemoFrame>` and `<RenderCounter>`, with a keyframe spring pop (`blac-render-pop`) whenever a render counter ticks.
  - Six-color cycling feature cards with top accent bars and playful offset print shadows (`4px 4px 0`).

## Tasks

- [x] 1. Update `src/assets/logo.svg` and `public/favicon.svg` with the redesigned geometric Bauhaus overprint logo.
- [x] 2. Overhaul `src/styles/tokens.css` and `src/styles/code-themes.mjs` with the expanded high-contrast palette (Dark "Midnight Risograph" & Light "Warm Archival Vellum").
- [x] 3. Enhance `src/styles/fonts.css` and `src/styles/content.css` for expressive typography, callout asides, blockquotes, inline code, kbd, and tables.
- [x] 4. Redesign `src/styles/chrome.css` for header, topic switcher, sidebar, TOC, multi-color cards, offset-shadow buttons, and focus states.
- [x] 5. Redesign `src/components/overrides/Hero.astro`, `src/components/overrides/PageTitle.astro`, `src/components/overrides/Footer.astro`, and `src/components/brand/Eyebrow.astro`.
- [x] 6. Polish `src/components/demos/demos.css`, `src/components/demos/RenderCounter.tsx`, and `src/content/docs/index.mdx`.
- [x] 7. Validate with `astro check` (`pnpm --filter @blac/web-docs run typecheck`).
- [x] 8. Fix `vite:oxc` parse error in `Hero.astro` `<script>` by removing TypeScript-only annotations from inline `.astro` script tag (Rolldown/oxc parses `.astro?astro&type=script` as plain JS).

## Status

All tasks complete (`astro check` passed with 0 errors, 0 warnings, 0 hints; `Hero.astro` `<script>` converted to pure JS for `vite:oxc`).
