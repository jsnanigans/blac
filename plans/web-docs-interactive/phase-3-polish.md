# Phase 3 — Closeout (parallel after 1 & 2)

Consistency pass + record the new infrastructure. Two disjoint, dependency-free
tasks.

**Read README.md hard rules first. Depends on: Phases 1 & 2 committed.**

---

## Task 3.1 — Consistency pass + optional recipe promotion

- **Model / effort:** **Sonnet 4.6 / medium.** _Rationale: judgment over the
  whole set — uniform framing, captions, hydration directives — plus 1–2 optional
  flair demos. Build catches type regressions._
- **Owns:** any demo component or page touched for consistency; optionally
  `guide/recipes/undo-redo.mdx` and/or `guide/recipes/debounce.mdx` if promoting
  a recipe to an island.
- **CHECK:** sweep all islands/Sandpacks for uniform `DemoFrame` usage,
  consistent `client:*` directives, captions, light/dark behavior.
- **IMPLEMENT:** fix inconsistencies; optionally promote 1–2 crowd-pleaser
  recipes (undo-redo, debounce) to islands. Do NOT mass-convert recipes — they
  stay Twoslash by default.
- **VERIFY:** build exit 0; `vp run format:check` on touched files.
- **COMMIT:** `docs(web-docs): unify demo presentation`

---

## Task 3.2 — Record infra in project memory/docs

- **Model / effort:** **Haiku 4.5 / medium.** _Rationale: documentation of what
  now exists — the demo contract, the tier policy, the Sandpack version pin._
- **Owns:** the demos dir `README.md` (final state) and a short note that the
  three-tier model (Twoslash / island / Sandpack) is now live in `apps/web-docs`.
- **IMPLEMENT:** ensure the embedding pattern, `DemoFrame`/`RenderCounter` API,
  and `BLAC_SANDPACK_VERSION` bump procedure are documented for future authors.
- **VERIFY:** build exit 0.
- **COMMIT:** `docs(web-docs): document demo infrastructure`

> Orchestrator follow-up (not an agent task): update the user's auto-memory
> note `project_docs_interactive_examples` to reflect that `apps/web-docs` (not
> VitePress `apps/docs`) now hosts React islands + React Sandpack.

---

## Exit criteria for Phase 3

- Presentation uniform across all demos; infra documented; build green.
