# Plan: `apps/web-docs` Corpus & Architecture Review

## Goal

Review, restructure, and improve the entire `apps/web-docs` documentation corpus, navigation setup, and homescreen. Infuse the author's architectural vision—clean separation of **UI**, **Logic**, and **Data** layers, interchangeable views/sources, and effortless testability—into the docs without sounding pretentious, while fixing all structural gaps, broken references, and inconsistencies discovered during the audit.

## Key Audit Findings & Decisions

1. **Layered Architecture & Philosophy (`UI ↔ Logic ↔ Data`)**:
   - **Decision**: Create a dedicated `/guide/philosophy/` ("Architecture & Philosophy") page and weave the 3-layer model into the Homepage (`index.mdx`) and Introduction (`guide/introduction.mdx`).
   - **Tone**: Grounded, practical, zero academic jargon (avoid "Hexagonal Architecture" or "Ports & Adapters" buzzwords). Frame it around the everyday pain of "fat components" where `useEffect`, `fetch`, data transformation, and JSX all tangle together:
     - **UI Layer (React, React Native, Vue, CLI)**: Renders state and fires interaction callbacks. Never talks to the Data layer directly.
     - **Logic Layer (BlaC Cubits)**: The core of the app. Holds state, business rules, validation, and coordinates data flow. Completely portable and testable in milliseconds with plain assertions.
     - **Data Layer (REST, GraphQL, localStorage, IndexedDB, memory)**: Fetches and persists raw data. Swappable without rewriting UI or domain rules.
2. **Proposals Topic (`/proposals/*`)**:
   - **Decision**: Keep the proposal files in the repo, remove `Proposals` from the top-level navbar topic switcher (moving it to a tucked-away item under `Internals` in the Guide sidebar so `starlight-sidebar-topics` still claims the routes cleanly), and replace the top-level topic slot with a dedicated **`@blac/async`** package topic!
3. **Missing Glossary in `guide/concepts.mdx`**:
   - Line 146 of `guide/concepts.mdx` had an empty `## Glossary` heading. Populate it with crisp, scannable definitions (`StateContainer`, `Cubit`, `Bloc`, `Registry`, `args`, `deps`, `Auto-tracking`, `select`, `keepAlive`, `isolated`, `Plugin`).
4. **Broken Comparison Reference in `guide/mental-model.mdx` & `guide/introduction.mdx`**:
   - **Decision**: Replace the dangling link in `mental-model.mdx` (which pointed to a deleted rubric in `introduction.mdx`) with a comprehensive, honest **Comparisons** section in `guide/mental-model.mdx` (and a concise summary table in `guide/introduction.mdx`) comparing BlaC against `useState`/`useContext`, Zustand, Redux Toolkit, MobX, Jotai/Signals, and TanStack Query.
5. **Contradiction on `<BlocProvider>` Precedence & `args` Optionality**:
   - `guide/inputs.mdx` (line 30 & 290) and `react/use-bloc.mdx` (line 76, 94, 202) contradicted `guide/typescript.md` and each other on whether `args` is strictly required at compile time when `Args != void` and whether own `args` or `<BlocProvider>` wins.
   - **Fact check against source (`packages/blac-react`)**: `args` is optional in TypeScript (`{ args?: ExtractArgs<T> }`) so it can inherit from `<BlocProvider>`, and call-site `args` takes priority over `<BlocProvider>` context `args` (`const effectiveArgs = options?.args !== undefined ? options.args : contextArgs`). Fix `guide/inputs.mdx` and `react/use-bloc.mdx` to match the real code!
6. **Contradiction on Array Iteration Tracking (`items.map`) & `depend()` in `guide/internals.md`**:
   - `guide/mental-model.mdx` (line 78) and `react/dependency-tracking.mdx` (line 82) said `.map()` coarsens to `items`, whereas `core/tracked.md` (line 47) and `guide/internals.md` (line 361) accurately noted that `.map()` runs against the proxy and records `items.length` and per-item leaf paths. Also `guide/internals.md` (line 486) claimed `depend()` has no reactive bridge, overlooking `.track()`. Align all four pages with the actual source implementation.
7. **Stale Dev Note in `plugins/logging.md` & Package Name Typo in `Footer.astro`**:
   - Remove the stale `:::tip[Screenshot pending]` author note in `plugins/logging.md`.
   - Fix `@blac/dirty-talk` → `@dirtytalk/*` in `Footer.astro` and update `generate-llms.mjs` to include `@blac/async` and `/guide/philosophy/`.

## Tasks

- [x] 1. Create `apps/web-docs/src/content/docs/guide/philosophy.mdx` ("Architecture & Philosophy: UI, Logic, and Data").
- [x] 2. Overhaul `apps/web-docs/src/content/docs/index.mdx` and `src/components/overrides/Hero.astro` to showcase both reactive precision AND the clean 3-layer separation (`UI → Logic → Data`), plus testability and portability.
- [x] 3. Update `apps/web-docs/src/content/docs/guide/introduction.mdx` with the 3-layer architecture overview and a clear library comparison table.
- [x] 4. Fix `apps/web-docs/src/content/docs/guide/concepts.mdx` (populate the empty `## Glossary` section, add `isolated` mode, link to Philosophy).
- [x] 5. Fix `apps/web-docs/src/content/docs/guide/mental-model.mdx` (add the full honest Comparisons section, fix array iteration note).
- [x] 6. Fix `apps/web-docs/src/content/docs/guide/inputs.mdx` and `apps/web-docs/src/content/docs/react/use-bloc.mdx` (align `args` optionality and `<BlocProvider>` precedence with actual `@blac/react` source).
- [x] 7. Fix `apps/web-docs/src/content/docs/react/dependency-tracking.mdx`, `apps/web-docs/src/content/docs/react/performance.mdx`, and `apps/web-docs/src/content/docs/guide/internals.md` (align array iteration tracking rules and `.track()` cross-bloc dependency explanation).
- [x] 8. Clean up `apps/web-docs/src/content/docs/plugins/logging.md` (remove stale screenshot placeholder note) and `apps/web-docs/src/components/overrides/Footer.astro` (fix `@dirtytalk/*` label).
- [x] 9. Update `apps/web-docs/astro.config.mjs` (add `/guide/philosophy/`, promote `@blac/async` topic, demote `Proposals` out of the top-level navbar into collapsed `RFCs & Proposals`).
- [x] 10. Run `astro check` and `node ./scripts/check-snippets.mjs` to verify 0 errors across all TypeScript/Twoslash snippets, links, and LLM artifacts.

## Status

Completed — all 10 tasks implemented and verified (`astro check` 0 errors, `check-snippets.mjs` + `astro build` 51 pages built with 0 Twoslash or sidebar errors).
