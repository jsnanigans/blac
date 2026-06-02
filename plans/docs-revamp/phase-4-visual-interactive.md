# Phase 4 — Visual & interactive (items 2.9, 3.5, 3.6, 3.11)

The high-visible-impact batch. Unlike Phases 2–3, several steps **cannot be
verified by an agent headlessly** — they need a human running the dev server /
the DevTools UI in a browser. Each such task is split into an **authoring half**
(agent, build-verified) and a **human gate** (capture/verify in browser).

**Read README.md hard rules first.** All Sandpack demos follow the client-only +
`@blac@2.0.15`-pinned pattern proven in Phase 0.5.

## Parallelism map

| Group                       | Tasks          | Notes                                          |
| --------------------------- | -------------- | ---------------------------------------------- |
| **P4** (parallel authoring) | 3.6, 3.11, 3.5 | disjoint new demo files + pages                |
| **Split**                   | 2.9            | authoring (agent) + screenshot capture (human) |
| **Serial**                  | 4.W (wiring)   | owns `config.ts`                               |

---

## Task 2.9 — DevTools screenshots + logging output

- **Authoring — Model / effort:** Sonnet 4.6 / medium. _Rationale: prose +
  captions + sample console output; the visual assets are human-captured._
- **Owns (agent):** `apps/docs/plugins/devtools.md`,
  `apps/docs/plugins/logging.md`; image files land in `apps/docs/public/`.
- **Context to read:** current `plugins/devtools.md`/`logging.md`,
  [DevTools audit memory] (C:n consumer tracking removed; `consumers-changed`→
  `refs-changed`; `instance-updated` coalesced per rAF), the logging plugin's
  `console.group` output format in source.

**CHECK:** Confirm the DevTools copy is current (no stale `C:n` consumer counts).
Identify exactly which screens/GIFs are needed and where captions go.

**IMPLEMENT (agent):** Write the surrounding prose, figure captions with text
alternatives (a11y), and a real sample `console.group` logging-output block.
Insert `![alt](/devtools-*.png)` references with `::: tip` static-fallback
captions. Leave the actual PNG/GIF files as TODO placeholders the human fills.

**VERIFY (agent):** build exit 0; `vp fmt` + `format:check`. (Missing images are
fine for build; broken-link check is for routes, not assets — but confirm.)

**COMMIT (agent):** `docs: add devtools/logging prose and captions`

**HUMAN GATE:** a person runs the examples app with DevTools + logging plugins,
captures the screenshots/GIF, drops them in `apps/docs/public/`, and commits:
`docs: add devtools screenshots`. Until then the page references placeholders —
acceptable interim, flagged in TODO.

---

## Task 3.11 — Interactive before/after on Performance page

- **Model / effort:** Sonnet 4.6 / high. _Rationale: authoring a new Sandpack
  demo (two variants) + integrating into an existing page; pattern is known from
  Phase 0.5 but the comparison harness is new logic._
- **Parallel group:** P4.
- **Owns:** `apps/docs/demos/perf-before-after.ts` (new demo source),
  edits to `apps/docs/react/performance.md`. No `config.ts`.
- **Context to read:** `apps/docs/demos/per-consumer-tracking.ts` (the proven
  RenderCounter pattern — ref incremented in render body), `apps/docs/react/performance.md`.

**CHECK:** Decide the contrast: e.g. a coarse single-store read (everything
re-renders) vs auto-tracked slice reads (only the reader re-renders), both
instrumented with RenderCounters, editable.

**IMPLEMENT:** Author the demo as a string-export module (SSR-safe, like the
existing demo). Embed via `<BlacSandpack>` in `performance.md` with framing.

**VERIFY (agent):** build exit 0 (SSR-safe); `vp fmt` + `format:check`.

**COMMIT:** `docs: add before/after perf demo`

**HUMAN GATE:** browser check at `/react/performance` — the "after" panel
re-renders fewer counters than "before".

---

## Task 3.5 — Persistent playground page

- **Model / effort:** Sonnet 4.6 / medium. _Rationale: one editable REPL page
  reusing the wrapper; mostly assembly._
- **Parallel group:** P4.
- **Owns:** `apps/docs/playground.md` (new), optionally
  `apps/docs/demos/playground-starter.ts`. No `config.ts`.
- **Context to read:** `apps/docs/.vitepress/theme/components/BlacSandpack.vue`
  (props), existing demo source.

**CHECK / IMPLEMENT:** A single persistent, editable Sandpack REPL with the
re-render counter wired in and a generous starter file. Taller `editor-height`.

**VERIFY (agent):** build exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: add interactive playground page`

**HUMAN GATE:** browser check — REPL loads, edits hot-reload.

---

## Task 3.6 — Showcase gallery

- **Model / effort:** Sonnet 4.6 / high. _Rationale: several new bespoke demos
  (counter→todo→form→dashboard→messenger) authored fresh in `apps/docs/demos/`;
  volume + each must compile._
- **Parallel group:** P4 (its demo files are disjoint, but this is the largest
  P4 task — consider its own window).
- **Owns:** `apps/docs/showcase.md` (new), `apps/docs/demos/showcase/*.ts` (new).
  No `config.ts`.
- **Context to read:** `apps/examples/` for scenario _inspiration only_ (do NOT
  reuse/iframe — author fresh per the maintainer decision), the demo string-
  export pattern.

**CHECK:** Scope the gallery to demos that are tractable as self-contained
Sandpack string modules. Messenger may be too large — gate it; document any cut.

**IMPLEMENT:** Each scenario = a string-export demo + a `<BlacSandpack>` embed
in the gallery page with a short description and "open in CodeSandbox" affordance.

**VERIFY (agent):** build exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: add forkable showcase gallery`

**HUMAN GATE:** browser check — each demo boots from CDN and runs.

---

## Task 4.W — Phase 4 nav/sidebar wiring (SERIAL, last)

- **Model / effort:** Haiku 4.5 / medium.
- **Depends on:** 3.5, 3.6 committed (2.9/3.11 edit existing wired pages).
- **Owns:** `apps/docs/.vitepress/config.ts`.
- **IMPLEMENT:** Add Playground and Showcase to nav/sidebar per IA. Build exit 0.
- **COMMIT:** `docs: wire playground and showcase into nav`
