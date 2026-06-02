# Phase 0 — Foundation (serial gate)

Wire React into the Astro site and establish the **demo infrastructure contract**
that every Phase 1 island reuses. Nothing else starts until this is committed and
the build is green with a proof island.

**Read README.md hard rules first.**

---

## Task 0.1 — React renderer + demo infrastructure

- **Model / effort:** **Opus 4.8 / high.** _Rationale: this is the contract
  every island inherits — the `<DemoFrame>` API, the `RenderCounter` mechanics,
  the hydration convention, the `.mdx` pattern. Getting it right once is
  high-leverage; a wrong shape forces rework across 8 demos._
- **Depends on:** nothing.
- **Owns:** `apps/web-docs/astro.config.mjs` (add integration),
  `apps/web-docs/package.json` (add deps), `apps/web-docs/tsconfig.json` (jsx),
  new `apps/web-docs/src/components/demos/` dir, and ONE proof page.
- **Context to read:** `apps/web-docs/astro.config.mjs`, Astro `@astrojs/react`
  docs, `@blac/react` `useBloc` signature, the `RenderCounter` pattern (memory:
  "increment ref in render body, not in useEffect").

**CHECK:** Confirm `@astrojs/react`, `react`, `react-dom` resolve in the
workspace (react/react-dom already present via catalog). Confirm Starlight
supports `.mdx` component embedding in this version.

**IMPLEMENT:**

1. Add `@astrojs/react` to `astro.config.mjs` integrations; ensure tsconfig
   `jsx`/`jsxImportSource` are set for `.tsx` islands.
2. Create `src/components/demos/` with the shared contract:
   - `DemoFrame.tsx` — consistent chrome (bordered, theme-synced, label slot)
     wrapping any demo so all islands look uniform.
   - `RenderCounter.tsx` — increments a ref in the **render body** and displays
     the count (proves re-render isolation). This is the workhorse for the
     value-prop demos.
   - `demos.css` (or co-located styles) theme-synced to Starlight light/dark.
   - A short `README.md` in the dir documenting the embedding pattern: rename
     page `.md`→`.mdx`, `import`, mount with `client:visible`.
3. Build ONE proof island (e.g. `CounterDemo.tsx`) and embed it in a single
   page converted to `.mdx` (suggest `guide/introduction.md`→`.mdx`) to prove
   the full path renders and hydrates.

**VERIFY:** `pnpm -F @blac/web-docs build` exits 0 with the proof island present;
visually the counter increments and `RenderCounter` reflects real renders.
`vp fmt` + `vp run format:check` on owned files.

**TEST:** No unit harness for islands; the build + a manual `pnpm -F
@blac/web-docs dev` smoke (island hydrates, counter works) is the test. Note any
SSR/hydration warnings in the commit body if present.

**COMMIT:** `feat(web-docs): add react islands + demo infra`

---

## Exit criteria for Phase 0

- `@astrojs/react` wired; build green.
- `DemoFrame` + `RenderCounter` + embedding docs exist and are reused-ready.
- One proof island renders in a real page. **Only then start Phase 1.**
