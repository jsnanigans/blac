# Phase 2 — Sandpack (editable playgrounds, sparing)

Editable in-browser sandboxes on the **build/tinker** pages only. These run a
*published* blac version (accepted version drift), so confine them to ≤4 pages.
Sandpack mounts as a heavy client-only React island → depends on Phase 0's React
renderer.

**Read README.md hard rules first. Depends on: 0.1 committed.**

---

## Task 2.1 — `<BlacSandpack>` wrapper (serial gate for 2.x)

- **Model / effort:** **Opus 4.8 / high.** _Rationale: the contract every
  Sandpack page inherits — version pin, theme sync, client-only mounting, file
  layout. One careful pass prevents drift and bundle bloat across pages._
- **Depends on:** 0.1.
- **Owns:** `apps/web-docs/package.json` (add `@codesandbox/sandpack-react`),
  `src/components/demos/BlacSandpack.tsx`, a `BLAC_SANDPACK_VERSION` constant.
- **CHECK:** latest *published* `@blac/core`/`@blac/react` version to pin
  (`npm view @blac/core version`). Confirm Sandpack can be loaded client-only in
  an Astro island without breaking SSR build.
- **IMPLEMENT:** `<BlacSandpack>` wrapping `@codesandbox/sandpack-react` with
  blac pinned in `customSetup` dependencies, Starlight light/dark theme sync,
  sensible defaults (editor + preview split). Mounted via `client:visible`.
  Document the props in the demos `README.md`.
- **VERIFY:** build exit 0 (no top-level Sandpack import leaks into SSR); a
  scratch page renders a working sandbox that CDN-installs the pinned blac.
  `vp fmt` + `format:check`.
- **TEST:** manual `dev` smoke — sandbox loads, edits re-run, blac resolves.
- **COMMIT:** `feat(web-docs): add BlacSandpack playground wrapper`

---

## Task 2.2 — Tutorial playground (flagship Sandpack)

- **Model / effort:** **Sonnet 4.6 / high.** _Rationale: multi-file, step-wise
  build content; the page where editing IS the learning mechanism. Narrative +
  code consistency matters._
- **Depends on:** 2.1.
- **Owns:** `guide/tutorial.mdx`.
- **CHECK:** existing tutorial outline (Todo → time-travel) so the sandbox steps
  match the prose.
- **IMPLEMENT:** embed `<BlacSandpack>` with the tutorial's multi-file project;
  let readers edit each step. Keep prose as the spine, sandbox as the canvas.
- **VERIFY / TEST / COMMIT:** as 2.1.
  `docs(web-docs): add editable tutorial playground`

---

## Task 2.3 — Quick Start capstone sandbox

- **Model / effort:** **Sonnet 4.6 / medium.** _Rationale: a single
  "now edit it yourself" sandbox after copy-paste install; low complexity._
- **Depends on:** 2.1.
- **Owns:** `guide/getting-started.mdx`.
- **IMPLEMENT:** one `<BlacSandpack>` at the end of Quick Start as a capstone.
- **VERIFY / TEST / COMMIT:** as 2.1.
  `docs(web-docs): add quick-start playground capstone`

---

## Task 2.4 — Playground page + nav wiring (serial, owns config)

- **Model / effort:** **Haiku 4.5 / medium.** _Rationale: a blank-canvas sandbox
  page + one nav entry — pure wiring. Owns the shared `astro.config.mjs`, so it
  runs alone, after 2.2/2.3._
- **Depends on:** 2.1 (and run after 2.2/2.3 to avoid config races).
- **Owns:** new `src/content/docs/playground.mdx`, `astro.config.mjs` (add a
  top-level nav/sidebar entry under the `blac` topic).
- **IMPLEMENT:** a `/playground` page with one blank `<BlacSandpack>`; add its
  link to the sidebar topics config.
- **VERIFY / TEST / COMMIT:** build exit 0, link resolves.
  `feat(web-docs): add /playground sandbox page`

---

## Exit criteria for Phase 2

- ≤4 Sandpack pages (tutorial, quick-start, playground, optional one more),
  all version-pinned + client-only; build green. Islands untouched.
