# Phase 5 — Tier 3 differentiators (items 3.1–3.10)

The largest, most ambitious work — raises BlaC above both peers. Mostly
independent pages; several are L-effort. Do these once Phases 1–4 land. Mermaid
(2.3) stays deferred.

**Read README.md hard rules first.**

## Parallelism map

| Group                | Tasks                                      | Notes                        |
| -------------------- | ------------------------------------------ | ---------------------------- |
| **P5a** (parallel)   | 3.3 (integrations tree), 3.7 (coming-from) | new disjoint trees           |
| **P5b** (parallel)   | 3.9 (recipes catalog), 3.10 (llms.txt)     | disjoint                     |
| **Heavy/serial-ish** | 3.1 (tutorial), 3.2 (internals)            | large narrative; own windows |
| **Optional**         | 3.4 (auto-API), 3.8 (unified sidebar)      | gated — see notes            |
| **Serial**           | 5.W (wiring)                               | owns `config.ts`             |

---

## Task 3.1 — End-to-end Tutorial

- **Model / effort:** **Opus 4.8 / high.** _Rationale: long single-narrative
  with numbered diffs that must stay internally consistent and all compile;
  payoff = undo/time-travel. Highest authoring-judgment task in the plan._
- **Owns:** `apps/docs/guide/tutorial.md` (new), `apps/docs/demos/tutorial/*.ts`
  (Sandpack checkpoints). No `config.ts`.
- **Context to read:** `apps/docs/guide/getting-started.md`, `concepts.md`,
  `async.md`; the Sandpack demo pattern.

**CHECK:** Pick ONE app threaded across numbered steps (counter→todo is the
canonical domain). Each step = a diff + a Sandpack checkpoint. End at
undo/time-travel as the payoff.

**IMPLEMENT:** Numbered sections with `ts twoslash` for Cubit logic (no JSX) and
plain `tsx` for components; Sandpack checkpoints at milestones. Keep one domain.

**VERIFY:** build exit 0 (every checkpoint compiles); `vp fmt` + `format:check`.

**COMMIT:** `docs: add end-to-end tutorial`

**HUMAN GATE:** browser check the Sandpack checkpoints boot.

---

## Task 3.2 — "How BlaC works internally" chapter

- **Model / effort:** **Opus 4.8 / high.** _Rationale: deep source synthesis
  (reactivity engine staged rebuild); accuracy is the whole value._
- **Owns:** `apps/docs/guide/internals.md` (new). No `config.ts`.
- **Context to read:** `apps/docs/dirtytalk/structural/concepts.md` (raw
  material to surface), the tracking/channel source in `packages/blac-core/src`,
  `apps/docs/core/tracked.md`.

**CHECK / IMPLEMENT:** Staged rebuild — state+listeners → paths → skeleton →
cross-bloc deps. Each stage a small `ts twoslash` model + (optionally) a Sandpack
stage. ASCII diagrams stay (Mermaid deferred) but with clear captions.

**VERIFY:** build exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: add internals chapter`

---

## Task 3.3 — Integrations tree

- **Model / effort:** Sonnet 4.6 / high. _Rationale: several framework pages;
  SSR already exists (2.6) as the model to match. Pattern-following authoring._
- **Parallel group:** P5a (each page is disjoint; could itself fan out per page).
- **Owns (new files):** `apps/docs/integrations/nextjs.md`,
  `integrations/remix.md`, `integrations/react-native.md`,
  `integrations/outside-react.md`. No `config.ts`.
- **Context to read:** `apps/docs/integrations/ssr.md` (the existing model),
  the registry API (`setRegistry`/`getRegistry`), the persist plugin (it's
  IndexedDB-only → RN needs an AsyncStorage adapter note).

**CHECK / IMPLEMENT per page:**

- nextjs: App + Pages Router, `'use client'`, RSC "don't read/write blocs" rule,
  store-per-request placement.
- remix: seed `init(args)` from loader data for matching server/client snapshots.
- react-native: AsyncStorage persistence adapter (persist plugin is IDB-only).
- outside-react: `watch` + acquire/release in vanilla JS / Node.

`ts twoslash` for non-JSX; plain `tsx` for component snippets.

**VERIFY:** build exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: add nextjs/remix/rn/outside-react integrations`
(or one commit per page if fanned out — keep subjects ≤50).

---

## Task 3.7 — "Coming from X" pages

- **Model / effort:** Sonnet 4.6 / high. *Rationale: concept-translation
  authoring; correctness against the *other* libraries matters but is
  well-known territory.*
- **Parallel group:** P5a.
- **Owns:** `apps/docs/guide/coming-from-flutter-bloc.md`,
  `coming-from-zustand.md`, `coming-from-redux.md` (defer Jotai/Context). No
  `config.ts`.
- **Context to read:** `apps/docs/guide/comparison.md` (reuse rubric + side-by-
  side code), `apps/docs/guide/introduction.md`.

**CHECK / IMPLEMENT:** Per page: concept-mapping table (their term → BlaC term),
a side-by-side port of a small app, and the migration mental-model. flutter_bloc
first (namesake lineage). `ts twoslash` for BlaC side; plain blocks for the other
lib.

**VERIFY:** build exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: add coming-from flutter-bloc/zustand/redux`

---

## Task 3.9 — Recipes/utilities plugin catalog

- **Model / effort:** Sonnet 4.6 / medium. _Rationale: copy-paste plugin
  snippets following the plugin-authoring API; repetitive._
- **Parallel group:** P5b.
- **Owns:** `apps/docs/plugins/recipes.md` (new). No `config.ts`.
- **Context to read:** `apps/docs/core/plugins.md` (authoring API),
  `apps/docs/plugins/persistence.md`, `plugins/logging.md`.

**CHECK / IMPLEMENT:** Catalog: localStorage adapter, debounced-save, cross-tab
sync, Sentry sink, audit log — each a self-contained `ts twoslash` plugin with a
"compose order / throw semantics" note. Add the PII-redaction caveat on any sink.

**VERIFY:** build exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: add copy-paste plugin recipes catalog`

---

## Task 3.10 — `llms.txt` / `llms-full.txt`

- **Model / effort:** Haiku 4.5 / medium. _Rationale: mechanical aggregation of
  existing markdown into the standard format._
- **Parallel group:** P5b.
- **Owns:** `apps/docs/public/llms.txt`, `apps/docs/public/llms-full.txt` (or a
  build hook if VitePress needs one — prefer static files in `public/`). No
  `config.ts` unless a generator is wired.
- **Context to read:** the `llms.txt` spec (index of links + descriptions);
  the page tree under `apps/docs`.

**CHECK / IMPLEMENT:** `llms.txt` = curated index (title + one-line + link per
page, grouped). `llms-full.txt` = concatenated page markdown. If hand-generated,
note in TODO that it needs regeneration on content changes (or add a small script
— but keep it out of the shared config unless trivial).

**VERIFY:** build exit 0 (files served from `public/`); confirm reachable.

**COMMIT:** `docs: add llms.txt for AI-tool consumption`

---

## Task 3.4 — Auto-generated API reference (OPTIONAL / gated)

- **Model / effort:** Opus 4.8 / high IF pursued. _Rationale: an api-extractor +
  script mini-initiative, not a doc page._
- **Gate:** only do this if `core/types.md` (already shipped) does NOT capture
  ~80% of the symbol-reference value. Evaluate first; likely **skip**. The README
  promises a nonexistent `pnpm docs:api` — if skipped, remove that promise from
  `apps/docs/README.md` (a 1-line Haiku fix).

---

## Task 3.8 — Unified always-present sidebar (OPTIONAL)

- **Model / effort:** Sonnet 4.6 / medium.
- **Owns:** `apps/docs/.vitepress/config.ts` — **conflicts with all wiring
  tasks**; run alone, after all other phases' wiring lands.
- **IMPLEMENT:** Make `/core/` + `/react/` sidebars also show Plugins/Testing/
  Integrations groups (never drop a section). Build exit 0.
- **COMMIT:** `docs: unify reference sidebar across sections`

---

## Task 5.W — Phase 5 nav/sidebar wiring (SERIAL, last)

- **Model / effort:** Haiku 4.5 / medium.
- **Depends on:** 3.1, 3.2, 3.3, 3.7, 3.9 committed.
- **Owns:** `apps/docs/.vitepress/config.ts`.
- **IMPLEMENT:** Wire Tutorial + Internals (guide "Going Deeper"), the new
  Integrations pages, the coming-from pages, the plugin recipes catalog, per IA
  in `DOCS_IMPROVEMENT_PLAN.md` §4. Build exit 0.
- **COMMIT:** `docs: wire phase-5 pages into nav and sidebar`

> If doing 3.8, run it AFTER 5.W to avoid double-editing `config.ts`.
