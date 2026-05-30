# BlaC Documentation: Strategic Improvement Plan

*Built from a 14-dimension competitive gap analysis against Zustand and Jotai (their real docs, read from source), hardened by an independent completeness critique, and reconciled with the maintainer's interactivity decisions. Every load-bearing correctness claim was re-verified against the BlaC source tree.*

> **Verification note (independently re-checked, 2026-05-30).** The correctness claims this plan acts on were confirmed against source:
> - `packages/blac-react/src/useBloc.ts` uses `useReducer` + a manual `force()` re-render (lines 6, 153, 172, 182, 193) — there is **no `useSyncExternalStore`**. The "concurrent-safe / built on `useSyncExternalStore`" wording in `index.md:39`, `react/use-bloc.md:231`, `react/preact.md:89`, and the stale header comment at `blac-react/src/index.ts:6` is therefore wrong. ✅
> - `apps/docs/public/` contains only `.gitkeep`, but `config.ts:79` sets `logo: '/logo.svg'` → broken logo on every page. ✅
> - The compat package exists but is scoped **`@9amhealth/blac-compat`** (private, `0.0.2`) — not bare `blac-compat`. Adjust any copy accordingly. ✅
> - `getRegistry` / `setRegistry` / `StateContainerRegistry` are public exports from `packages/blac-core/src/index.ts` (lines 51–59). ✅
> - `apps/docs/README.md:15,40` promise `pnpm docs:api` via `scripts/generate-api-docs.mjs`, but no `package.json` defines that script and the script does not exist. ✅

> **Interactivity decisions (locked by maintainer).**
> 1. Live examples are **newly authored custom demos inside `apps/docs`** — do **not** reuse or embed `apps/examples/`.
> 2. Embed engine is **`sandpack-vue3` (editable, in-browser playgrounds)**. Sandpack resolves deps from a CDN, so demos run the **published** `@blac/core` / `@blac/react` — pin to **`2.0.15`** (ideally read from `.vitepress/config.ts`'s version). Accepted trade-offs: heavier load, less styling control than a static mount.
> 3. Add **`@shikijs/vitepress-twoslash`** for type-on-hover + build-time type-checked snippets (showcases BlaC's TS inference; broken snippets fail the build).
>
> These override the original synthesis, which had floated an in-tree client-only mount + `apps/examples` wiring. All interactivity items below are rewritten to this stack. Confirmed available: `sandpack-vue3@3.1.12`, `@shikijs/vitepress-twoslash@4.1.0`, `@blac/core`/`@blac/react@2.0.15`.

---

## 1. Executive Summary

BlaC's docs have an unusual profile: **the prose is already best-in-class, but everything around the prose lags a generation behind the competition.** The writing quality, the *Honest comparisons* table, the "when you probably don't need BlaC" candor, and the conceptual depth (especially the DirtyTalk internals) genuinely beat Zustand and Jotai on the page. What loses is *delivery and trust*: zero interactivity, ASCII-only diagrams, a buried positioning story, no end-to-end tutorial, no TypeScript page, no SSR/Next.js page, several load-bearing claims that are **factually contradicted by source**, and — the root disease behind those contradictions — **no CI guardrail tying any doc claim back to the code.**

This plan (a) fixes the trust bugs first, (b) installs the CI machinery that stops them from rotting back in, and (c) only *then* invests in the big visible builds.

### Where BlaC stands today vs Zustand / Jotai

| Dimension | BlaC verdict | Reality vs peers |
|---|---|---|
| Onboarding / first-run | adequate | First-taste shape competes; no tutorial, no runnable demo, async deferred |
| Conceptual depth | **strong** | Beats both on prose; loses on diagrams + one false concurrency claim |
| Recipes / real-world | adequate | Prose quality matches; loses on breadth + runnability + no tutorial |
| API reference format | adequate | DirtyTalk pages already beat both; core/react don't match their own team's bar |
| TypeScript guidance | **weak** | No TS page at all; richest exported type toolkit in the field, fully hidden |
| Testing | **strong** | Decision tables beat both; missing async/`watch()`/hydration/failing-output |
| SSR / Next.js / framework | **weak** | Dominant deployment targets entirely absent; security footgun undocumented |
| Async / data-fetching | adequate | One recipe vs a multi-page pillar; false Suspense claim |
| Migration / changelog | adequate | grep/codemod hints beat both; compat shim denied in docs but exists; no semver story |
| Comparison / positioning | adequate | Best honesty in the field, buried in the deepest page; "why classes" objection unhandled |
| **Interactivity** | **missing** | Zero demos, zero diagrams, broken logo, no screenshots of the DevTools UI |
| Writing / polish | **strong** | Words win; visual finish, a11y, and mechanical consistency lose |
| Ecosystem / integrations | adequate | No Integrations tree, stale DevTools docs, broken adapter example |

### The highest-leverage moves

1. **Install CI guardrails before fixing anything else.** Every Tier 1 correctness bug exists because *no mechanism ties a doc claim to source*. Type-check fenced `ts`/`tsx` snippets against the real packages (Twoslash covers displayed snippets; a CI compile pass covers the rest) and run a link-checker. Without this, every fix below rots back within a release or two. **The structural fix for the disease, not just the symptoms — and it's cheap.**
2. **Stand up the Sandpack playground stack and put a live, instrumented re-render demo on the landing page.** BlaC's entire pitch — "only the component reading the changed data re-renders" — is currently *invisible*. With Sandpack-vue3 pulling published `@blac@2.0.15` from CDN, the embed risk is small (the packages are published); the remaining unknown is just CDN resolution of the scoped packages, which a one-hour spike settles. The instrumented re-render demo (an authored `RenderCounter` + a two-consumer harness, editable in-browser) is **a category-defining artifact neither competitor ships.**
3. **Fix the false `useSyncExternalStore` / concurrent-safety claim** (`index.md:39`, `react/use-bloc.md:231`, `react/preact.md:89`, stale comment `blac-react/src/index.ts:6`). Verified: `useBloc.ts` uses `useReducer` + `force()`, not `useSyncExternalStore`. A trust bomb that detonates the moment a senior evaluator opens the source.
4. **Surface positioning out of the deepest page and lead with the unhandled objection.** Promote the *Honest comparisons* table to a dedicated, nav-listed Comparison page with side-by-side code, a fixed rubric, decision trees, and a CI-sourced bundle-size number — opening with the affirmative **"why classes / why this model"** argument, the single most likely objection a Zustand/Jotai evaluator raises.
5. **Create the missing first-class chapters: TypeScript, SSR/Next.js, Async, and a Versioning/Stability page.** The TS page exposes a type-utility surface *richer than either competitor's* (verified real public exports). The SSR page documents the per-request registry pattern that already exists in source (`setRegistry`/`getRegistry`/`StateContainerRegistry`) and closes a per-request state-leak hole the docs never name. The Versioning page resolves the trust issue of shipping `0.0.x` DirtyTalk/compat alongside `2.0.x` core.

### How we'll know it worked (success criteria)

| Metric | How measured | Baseline | Target |
|---|---|---|---|
| Time-to-first-working-app | Moderated 5-user test: clone → rendered counter | measure in P0 | < 5 min, 5/5 succeed |
| Copy-runnable code blocks | CI snippet-typecheck / Twoslash pass rate | unknown | 100% of `ts`/`tsx` blocks compile |
| Docs-search success | Search analytics: zero-results rate | n/a | < 5% zero-result queries |
| Page freshness | `lastUpdated` age + stale-claim audit | many > 1 release stale | no page > 1 minor behind source |
| "Was this helpful?" | per-page feedback widget | none | ≥ 70% helpful on top-20 pages |
| Dead links | CI link-checker failures | unknown | 0 |

---

## 2. Prioritized Roadmap (Tiers)

Effort: **S** ≤ 1 day · **M** ≈ 2–5 days · **L** ≈ 1–2 weeks. Impact reflects external-reader value.

### Tier 0 — Guardrails (do first; they protect everything after)

| # | What | Why it matters | Effort | Impact |
|---|---|---|---|---|
| 0.1 | **Add Twoslash** (`@shikijs/vitepress-twoslash`) + **CI type-check of fenced `ts`/`tsx` snippets** against built `@blac/*` | Structural fix for the entire drift class behind every Tier 1 bug; broken snippets fail the build | M | Critical |
| 0.2 | **CI link-checker** (internal + external) | Catches dead refs (e.g. orphaned/renamed pages) automatically | S | High |
| 0.3 | **Single-source signatures** via api-extractor output so `init` visibility can't drift across 3 pages again | Removes the manual copy-paste that caused the `protected init` drift | M | High |
| 0.4 | **Baseline the success metrics** (§1) + enable `lastUpdated` | The initiative is unsteerable without a baseline | S | High |
| 0.5 | **Kick off Algolia DocSearch application** (free but gated, weeks of lead time) | Phase 4 search swap is blocked on third-party approval; start the clock now | S | Medium |
| 0.6 | **Bundle-size source of truth**: add `size-limit`; expose the number to hero/comparison | Prevents the headline size number from becoming a new drift vector | S | Medium |

### Tier 1 — Quick wins (ship this week, on top of Tier 0)

| # | What | Why it matters | Effort | Impact | Inspired by |
|---|---|---|---|---|---|
| 1.1 | Fix the false `useSyncExternalStore`/concurrent-safety claim across `index.md`, `use-bloc.md`, `preact.md` (+ stale `index.ts:6` comment) | A correctness lie a skeptic verifies in 30s; poisons trust in everything | S | High | Zustand (names hard problems honestly) |
| 1.2 | Ship a real `logo.svg` (+ favicon, light/dark) into `apps/docs/public/` | `config.ts:79` → `/logo.svg`; `public/` has only `.gitkeep` → broken logo everywhere | S | High | Jotai (polished brand) |
| 1.3 | Remove stale DevTools `C:n` consumer-count copy; fix `deps-changed` keys `prev/next`→`previousDeps/currentDeps` | Recent commit dropped consumer/perf tracking; docs describe a UI that no longer exists | S | High | — (correctness) |
| 1.4 | **Surface** the orphaned `core/tracked.md` ("Tracking") in the Core sidebar | The single most important concept page is reachable only by stray links | S | High | Jotai (no flagship page hidden) |
| 1.5 | Unify the two front doors (hero CTA + nav "Guide" → same first page) | First-time path depends on which button is clicked; positioning is bypassed | S | Medium | Zustand (one deliberate entry) |
| 1.6 | Enable `editLink`, `lastUpdated`, `docFooter`, `outline` in `themeConfig` | Near-zero-cost freshness/trust signals; valuable given known-stale content | S | Medium | React.dev / Vue |
| 1.7 | Add `tsconfig` posture (strict, decorators-optional, `useDefineForClassFields`) + "not updating?" teaser to Quick Start | Removes the two most common first-session dead-ends for a class/decorator lib | S | Medium | Jotai (strict up front) |
| 1.8 | Fix the broken custom-storage-adapter example in `persistence.md:143-155` (declare `store`, return `Promise<PersistedRecord\|null>`) | The page's main extensibility hook doesn't compile | S | Medium | — (correctness) |
| 1.9 | Fix `init(args)` visibility drift (`protected`) in `best-practices.md:127`, `patterns.md`, `migration:96` | Copy-pasted signature is wrong in 3 of 4 places (0.3 prevents recurrence) | S | Medium | Zustand (type is the spec) |
| 1.10 | Promote DirtyTalk to a top-level nav entry; disambiguate "Plugin Authoring" vs "Plugins" | A nine-page library family buried as a third-tier dropdown item | S | Medium | Jotai (ecosystem top-level) |

### Tier 2 — Substantial (the core of the project)

| # | What | Why it matters | Effort | Impact | Inspired by |
|---|---|---|---|---|---|
| 2.0 | **Sandpack spike (Phase 0.5 gate)**: prove `sandpack-vue3` resolves scoped `@blac/core`+`@blac/react@2.0.15` from its CDN in a VitePress page; confirm an authored `RenderCounter` works inside an editable example; document a static-GIF fallback | De-risks the one remaining embed unknown before committing the interactivity build | S | Critical | — |
| 2.1 | Build a reusable **`<Sandpack>` MDX wrapper** (sandpack-vue3) with a shared BlaC template (pins `@blac@2.0.15`, preloads imports, themed to docs); author **new demos under `apps/docs/demos/`** | Prerequisite that unblocks all interactivity; demos are bespoke, not `apps/examples` | M | High | Jotai `<Stackblitz>` |
| 2.2 | **Bespoke instrumented re-render demo** on `index.md`: editable Sandpack with an authored `RenderCounter` (increment a ref in render body, not `useEffect`) + a controlled two-consumer harness | Makes the headline feature visible & editable; **a category-defining artifact neither peer has** | M | High | Jotai showcase |
| 2.3 | Enable Mermaid; render the 4 headline ASCII diagrams as real figures (with text alternatives) | Reactivity loop is the #1 concept with no picture; uncontested vs both peers | M | High | Vue / React / Stripe |
| 2.4 | New **Comparison** page: "why classes" lead + table + fixed rubric + drafted decision trees + side-by-side code + CI bundle-size | Positioning gated behind the deepest page; top-of-funnel; handles the top objection | M | High | Zustand rubric + Jotai trees |
| 2.5 | New **TypeScript** guide (`guide/typescript.md`) + central **Types** reference (`core/types.md`) | Largest structural gap; exposes a toolkit richer than either competitor (verified exports) | M+M | High | Zustand 2-page TS split |
| 2.6 | New **SSR & per-request isolation** guide documenting `setRegistry`/`getRegistry`/`StateContainerRegistry` + AsyncLocalStorage | Closes an undocumented per-request state-leak/security hole; the fix already ships | M | High | Jotai/Zustand Next.js pages |
| 2.7 | New **Async & Suspense** guide; move a complete loading/error/success example into Quick Start | Async is a headline pitch but absent until "Going Further" | M | High | Jotai `async.mdx` |
| 2.8 | **Define the per-symbol reference template** (lift `dirtytalk/engine/api-reference.md`), then roll out across core/react pages | Predictability is the feature; template must exist *before* Phase 2 authors new ref pages | M (template) + L (rollout) | High | Zustand/Jotai templates |
| 2.9 | DevTools screenshots + GIF (with static fallback/caption); logging sample console output | A visual debugging tool documented only in words | M | High | Jotai debugging guide |
| 2.10 | Co-located, symptom-keyed Troubleshooting section on each reference page | Searchers land on the symbol, not the central FAQ | M | High | Zustand permanent slot |
| 2.11 | Add high-demand recipes (optimistic, debounce, undo/redo, pagination, WebSocket, form-validation, reset) | The recipes users actually search for; every competitor ships them | L | High | Zustand + Jotai recipes |
| 2.12 | Document `channel.subscribe(interest, cb)` + frame the core-vs-React access split | A "lower-level API" cited as canonical but never specified | M | Medium | Zustand createStore/useStore split |
| 2.13 | Fix the "no compat shim" lie; document the **`@9amhealth/blac-compat`** alias pattern (scoped honestly as private/internal) | Docs actively *deny* a real package (verified: private `0.0.2`). Right-sized: remove the denial + describe the pattern, don't promote an external tool | M | Medium | — (correctness + migration) |
| 2.14 | New `/changelog` page rendered in-docs (drive from `generate-changelog.mjs`) | "What changed" currently requires leaving the site to parse raw changesets | M | High | Both keep history in-docs |
| 2.15 | New **Versioning & Stability** page: semver policy, React/browser support matrix, consolidated deprecations, the `0.0.x`-vs-`2.0.x` skew explained | Bundled-maturity story (DirtyTalk `0.0.3` next to core `2.0.15`) is a real, unaddressed trust issue | M | High | Both keep stability docs |

### Tier 3 — Ambitious (differentiation; raises BlaC above both peers)

| # | What | Why it matters | Effort | Impact | Inspired by |
|---|---|---|---|---|---|
| 3.1 | End-to-end **Tutorial** (numbered diffs, one app, payoff = undo/time-travel), with Sandpack checkpoints | The narrative arc both peers use as their flagship onboarding asset | L | High | Zustand tic-tac-toe |
| 3.2 | First-class **"How BlaC works internally"** chapter (staged rebuild, Sandpack per stage) | Surfaces the excellent DirtyTalk internals into the BlaC guide; recruits contributors | M | High | Jotai core-internals |
| 3.3 | **Integrations** tree: SSR · Next.js (App+Pages) · Remix · React Native · "outside React" (Vite folded into SSR/outside-React) | The dominant deployment targets are entirely absent | L | High | Jotai nextjs/remix |
| 3.4 | **Right-sized** auto-generated API/symbol reference (own mini-initiative) — only if `core/types.md` doesn't already capture ~80% of the value | README promises `pnpm docs:api`; verified it does **not** exist. An api-extractor + script project, not a checkbox | L | Medium | Neither peer has symbol search |
| 3.5 | **Interactive playground** — a single persistent, editable Sandpack REPL with the re-render counter wired in | Higher value than a static showcase given the auto-tracking pitch; Svelte/Vue/TanStack ship one | M | High | Svelte/Vue/TanStack REPL |
| 3.6 | Runnable **/showcase** gallery (counter→todo→form→dashboard→messenger) as **new forkable Sandpack demos authored in `apps/docs`** | Demonstrates breadth; re-create the scenarios as docs-owned demos (not `apps/examples`) | M | Medium | Jotai showcase |
| 3.7 | "Coming from X" pages — **flutter_bloc (namesake) → Zustand → Redux**; defer Jotai/Context | Most evaluators arrive with an incumbent; highest-converting adoption content | M each | High | Zustand flux-inspired-practice |
| 3.8 | Unified always-present sidebar (no section disappears in reference area) | `/core/` + `/react/` drop Plugins/Testing/Guide entirely today | M | High | Jotai whole-surface-visible |
| 3.9 | Recipes/Utilities catalog of copy-paste plugins (localStorage, debounced-save, cross-tab, Sentry sink) | Turns docs into a snippet library; signals a maturing ecosystem | M | High | Jotai recipes/ + Zustand middleware |
| 3.10 | `llms.txt` / aggregated `/llms-full.txt` markdown export | 2025–26 docs norm, uncontested for BlaC, cheap, high-signal for AI-tool evaluators | S | Medium | TanStack/Cloudflare/Vercel |
| 3.11 | Interactive before/after re-render comparison on the Performance page (Sandpack) | Observe the per-consumer-tracker payoff instead of asserting it | M | Medium | Jotai useAtom-vs-useSetAtom |

**Cut / deferred:**
- ~~Animated DirtyTalk fan-out canvas~~ — research-grade interactive for an internal sub-library most users never touch; covered by a static Mermaid figure (2.3).
- ~~Standalone `integrations/vite.md`~~ — a "5-line note"; folded into SSR/outside-React.
- ~~`integrations/community.md` empty stub~~ — shipping an empty catalog violates "no visible TBD stubs"; deferred until real third-party content exists.

---

## 3. Section-by-Section Recommendations

### Onboarding (`index.md`, `guide/introduction.md`, `guide/getting-started.md`, `react/getting-started.md`)
- **Unify the front doors** (1.5): hero CTA and nav "Guide" both → `guide/introduction` (carries the "why"), with a secondary "Quick Start" / "Tutorial" CTA.
- **Make the counter genuinely runnable** — embed it as the first `<Sandpack>` demo so "complete and copy-pasteable" (`react/getting-started.md:25`) is literally true (and Twoslash-checked).
- **Move a complete async example** (fetch → loading → error → success, with request-id guard) into Quick Start right after the synchronous examples.
- **Add `tsconfig` block, decorators-optional note, "not updating?" teaser, and an SSR signpost** (Tier 1).
- **Pick one canonical domain** (the counter, or a todo) and thread it through `index → introduction → getting-started → concepts`. Kill the scattered User/Credentials/Item/Slide domains.
- **Add a CI-sourced bundle-size/perf number** to the hero (Jotai leads with "2kb"; BlaC quantifies nothing). Number from 0.6, never hardcoded.

### Concepts (`guide/concepts.md`, `guide/mental-model.md`)
- **Promote one north-star analogy** (e.g. *"a Cubit is state plus the logic that mutates it, and reading it in JSX IS your subscription"*) and lead `introduction.md` with it; derive the rest as corollaries.
- **Replace the headline ASCII figures with Mermaid/SVG** (2.3): Read→Track→Intersect→Re-render loop, the one-walk-plus-N-intersections skeleton, the mount→live→unmount lifecycle, the instance-key precedence chain. Each gets a text alternative.
- **Add a concept-level derived-state section** using add-then-remove pedagogy (store the duplicated value, then refactor to a getter).
- **Fix the concurrency mental-model claim** (1.1) — the model the doc installs must match `useBloc.ts`.
- **Add a credibility one-liner** naming the hard problems BlaC solves (per-consumer isolation / quadratic-diff avoidance / emit-storm circuit breakers / microtask coalescing), each deep-linked.

### Guide / Recipes (`guide/patterns.md`)
- **Make every recipe copy-paste-runnable** — Sandpack demo or an "expand for full file" `::: details` affordance; Twoslash enforces the snippets compile.
- **Add inline footgun caveats** at the exact line, most urgently the `analyticsPlugin` recipe (`L220-241` ships full prev/next state to a third-party sink — add "do not ship full state / redact PII").
- **Add a one-line "use this when / don't use this when"** opener per recipe.
- **Add the missing recipes** (2.11) and a Redux/Flux mental-model mapping recipe for migrators.

### Core reference (`core/*.md`)
- **Adopt one rigid per-symbol template** (2.8), lifted from `dirtytalk/engine/api-reference.md`: H2/H3 → verbatim Signature fence (full generics + return) → Parameter table → explicit **Returns** → Behavior → runnable example. Apply to `emit/update/patch`, `depend()`, `onSystemEvent`, `acquire/ensure/borrow/release`.
- **Ship `core/types.md`** (2.5) — canonical signatures for the entire exported type toolkit.
- **Document `channel.subscribe(interest, cb)`** (2.12) and frame inside-React (`useBloc`) vs outside-React (`watch`/`channel.subscribe`).
- **Surface `tracked.md` in the sidebar** (1.4) and reconcile its title.
- **Co-locate symptom-keyed Troubleshooting** per page (2.10).
- **Make examples self-contained** with verbatim imports (match the DirtyTalk standard; Twoslash enforces).

### React reference (`react/*.md`)
- **Fix the `useSyncExternalStore` claim** in `use-bloc.md:231` (1.1).
- **Add discriminated-union narrowing** examples (narrow `status` inside a consumer/getter) — the most common real TS friction point, currently absent.
- **Embed the bespoke re-render demo** on `use-bloc.md` and an interactive before/after on `performance.md` (3.11).
- **Re-frame `preact.md`** as design-intent only; trim the speculative `configureBlacPreact` surface; mark "planned/experimental" in the nav label itself.
- **Per-symbol Troubleshooting**: "re-renders too often" → `select`/shallow; "state leaks between mounts" → `instanceId: useId()`; "I expected `autoTrack`/`isolated`" → removed.

### Plugins (`plugins/*.md`, `core/plugins.md`)
- **Tier 1 correctness fixes** (1.3, 1.8) first.
- **DevTools screenshots + GIF** (2.9); fix the C:n staleness in the same pass.
- **Logging**: show a real sink wiring (Sentry/Datadog/pino) and sample `console.group` output.
- **Persistence**: add IndexedDB-on-server warning, SSR-safe storage guard, schema migration/versioning, cross-tab sync, and a security note on the persisted-auth-token example.
- **Add a "compose the ecosystem" scenario** (logging + devtools + persistence in one app) and document plugin composition order/throw semantics.

### Testing (`testing/*.md`) — already strong, close the named gaps
- **End-to-end async test** (real action mutating status over time, `await findBy*`) — the #1 missing recipe.
- **"Testing outside React with `watch()`"** section (asserting on the emitted sequence) — currently zero occurrences.
- **Persistence + hydration testing** recipe (wire the memory adapter the persistence page advertises).
- **Show actual failing output** for each footgun (the red diff for a missing `blacTestSetup()`/`flush()`).
- **Permanent symptom-first Troubleshooting** block; **fake-timers + MicrotaskScheduler** worked example; **StrictMode double-mount** note.
- **Tighten** `createCubitStub` `methods` type to source-accurate `(...args: any[]) => any`.

### NEW sections to create
- **Tutorial** (3.1) · **TypeScript** (2.5) · **SSR & Integrations** (2.6, 3.3) · **Async & Suspense** (2.7) · **Comparison** (2.4) · **Changelog** (2.14) · **Versioning & Stability** (2.15) · **How BlaC works internally** (3.2) · **Playground** (3.5) & **Showcase** (3.6).

---

## 4. Proposed Information Architecture / Sidebar Redesign

*Top-nav* entries are the horizontal bar; *sidebar groups* are the left rail that swaps by section. Plugins/Testing/Integrations are **both** top-nav entries **and** always-visible collapsible groups inside the unified Reference sidebar — so they never vanish when a reader is deep in `/core/` or `/react/`.

```
Top nav: Guide · Reference ▾ · Plugins · Testing · Integrations · DirtyTalk · Comparison · vX.Y.Z ▾

Guide  (/guide/)
├── Getting Started
│   ├── What is BlaC?              introduction      ← canonical front door (hero + nav both land here)
│   ├── Quick Start               getting-started    (runnable Sandpack counter + async + tsconfig)
│   ├── Tutorial: Build an app    tutorial           ★ NEW (numbered diffs → time-travel payoff)
│   ├── Core Concepts             concepts
│   ├── Mental Model              mental-model        (Mermaid diagrams + text alts)
│   └── Passing Inputs            inputs
├── Going Deeper
│   ├── How BlaC works internally internals          ★ NEW (staged rebuild)
│   ├── Async & Suspense          async              ★ NEW
│   ├── TypeScript                typescript         ★ NEW
│   ├── Patterns & Recipes        patterns
│   └── Best Practices            best-practices
└── Reference Aids
    ├── Comparison                comparison         ★ NEW (promoted from mental-model; "why classes" lead)
    ├── Troubleshooting & FAQ     troubleshooting
    ├── Glossary                  glossary
    ├── Migrating from v1         migration-from-v1
    ├── Versioning & Stability    versioning         ★ NEW
    └── Changelog                 changelog          ★ NEW

Reference  (unified sidebar — never hides a section)
├── Core
│   ├── Cubit · Tracking ★(surface existing) · Configuration · Instance Management
│   ├── System Events · Bloc Communication · watch · Low-level subscribe ★ NEW
│   ├── Authoring Plugins   (renamed from "Plugin Authoring")
│   └── Types               ★ NEW (core/types.md)
├── React
│   └── Getting Started · useBloc · Dependency Tracking · Performance · Preact (experimental)
├── Plugins      (collapsible, always visible — also a top-nav entry)
├── Testing      (collapsible, always visible — also a top-nav entry)
└── Integrations (collapsible, always visible — also a top-nav entry)

Integrations  (/integrations/)   ★ NEW TREE
├── SSR & per-request isolation        (Vite setup folded in here)
├── Next.js (App + Pages Router)
├── Remix
├── React Native
└── Using BlaC outside React
   (Community/third-party page deferred until real content exists)

Plugins  (/plugins/)
└── Overview · Logging · DevTools · Persistence · Recipes catalog ★ NEW

DirtyTalk  (/dirtytalk/) — top-level nav entry
└── Overview · Engine · Spatial · Structural   (unchanged)
```

Key structural fixes: **existing `tracked.md` surfaced**, **a single reference sidebar that never drops Plugins/Testing/Integrations**, **DirtyTalk top-level**, **disambiguated plugin entries**, **Versioning page added**, **Vite folded / community deferred**, **section index pages** for `/core`, `/react`, `/plugins`, `/testing`, `/integrations`.

---

## 5. Brand-New Pages / Guides (one-line scope each)

| Page | Scope |
|---|---|
| `guide/tutorial.md` | Build one app across numbered diffs, ending in undo/time-travel (Sandpack checkpoints) |
| `guide/typescript.md` | Typing State/Args/Deps, getters, union narrowing, `select`, conditional-`args`, custom hooks |
| `core/types.md` | Canonical signatures for the full exported type toolkit (`ExtractState`, `ExtractArgs`, `InstanceReadonlyState`, branded `InstanceId`, …) |
| `guide/async.md` | Async-read getters, async-action methods, loadable status surface, Suspense placement, cancellation |
| `guide/internals.md` | Staged rebuild of the reactivity engine (state+listeners → paths → skeleton → cross-bloc deps), Sandpack per stage |
| `guide/comparison.md` | "Why classes" lead + promoted *Honest comparisons* + fixed rubric + drafted decision trees + side-by-side code + CI bundle size |
| `guide/versioning.md` | Semver policy, React/browser support matrix, consolidated deprecations, `0.0.x`-vs-`2.0.x` skew, stability badge legend |
| `guide/changelog.md` | In-docs, human-readable per-package release history with stability notes |
| `integrations/ssr.md` | Per-request registry isolation via `setRegistry`/`getRegistry`/`StateContainerRegistry`/AsyncLocalStorage; cross-request leak rule; Vite note |
| `integrations/nextjs.md` | App + Pages Router, `'use client'`, RSC "don't read/write blocs" rule, store-per-request placement |
| `integrations/remix.md` | Seeding `init(args)` from loader data for matching server/client snapshots |
| `integrations/react-native.md` | AsyncStorage persistence adapter (persist plugin is IndexedDB-only) |
| `integrations/outside-react.md` | `watch` + acquire/release in vanilla JS / any framework / Node |
| `core/subscribe.md` | Reference for `channel.subscribe(interest, cb)`: interest/PathSet shape, callback, unsubscribe |
| `plugins/recipes.md` | Copy-paste plugin catalog: localStorage adapter, debounced-save, cross-tab sync, Sentry sink, audit log |
| `playground.md` | Single persistent editable Sandpack REPL with live re-render counter |
| `showcase.md` | Gallery of new forkable Sandpack demos (counter → todo → form → dashboard → messenger) authored in `apps/docs` |
| `guide/coming-from-*.md` | Concept-translation pages — flutter_bloc, Zustand, Redux first; Jotai/Context deferred |
| `/llms.txt`, `/llms-full.txt` | Aggregated markdown export for AI-tool consumption |

---

## 6. Cross-Cutting Upgrades

**CI guardrails (the structural fix for the disease).** Land in Tier 0: (1) **Twoslash** type-checks every displayed `ts twoslash` block against installed `@blac/*` types and renders hover types; a complementary CI pass compiles all fenced `ts`/`tsx` blocks against the built packages — together the durable fix for signature drift; (2) internal+external link-checker; (3) single-source signatures via api-extractor so `init` visibility can't drift in three files again; (4) a `size-limit` check feeding the hero/comparison bundle number. *Sequenced first because every other fix rots without it.*

**Interactivity / Sandpack playgrounds (the biggest single lever).** Engine = **`sandpack-vue3`**, editable in-browser, resolving published `@blac@2.0.15` from CDN. Demos are **newly authored in `apps/docs/demos/`**, never `apps/examples`. Degradation ladder:

| Rank | Approach | Resolves `@blac@2.0.15`? | Editable? | Shows real re-render counts? | Notes |
|---|---|---|---|---|---|
| 1 (primary) | **`<Sandpack>` (sandpack-vue3)** with a shared BlaC template | yes (CDN, published) | yes | yes (authored `RenderCounter`) | heavier load, less styling control — accepted |
| 2 | "Open in StackBlitz/CodeSandbox" link from the same template | yes | yes (external) | yes | useful for forking out of the page |
| 3 | Static GIF + caption | n/a | no | no (recorded) | guaranteed fallback for slow/offline |

The **2.0 spike** validates only the small remaining unknown: that Sandpack's CDN resolves the *scoped* `@blac/core`/`@blac/react` and that an authored `RenderCounter` (increment a ref in the **render body**, not `useEffect`) reports correctly inside an editable example. The reusable `<Sandpack>` wrapper registers via `theme/index.ts`'s `enhanceApp` (currently an unmodified `DefaultTheme` + a 38-line `custom.css`).

**Comparison page.** "Why classes / why this model" affirmative lead (testability without React, logic colocation, the flutter_bloc lineage) — the top unhandled objection — then the table (Zustand has none) + fixed rubric (State Model / Render Optimization / Boilerplate / Providers / TS Inference / Async / DevTools / SSR / Framework-agnostic / Bundle size) + **actually-drafted decision trees** + side-by-side equivalent code per competitor. Keep the "Reach for it instead when" column.

**TypeScript.** Two layers: a discoverable beginner guide (`guide/typescript.md`) and a central reference (`core/types.md`) exposing a type-utility surface broader than either peer ships (verified). Add Twoslash signature-first blocks to every API page. State the `strict` posture up front.

**Search.** Algolia DocSearch requires an application with weeks of approval latency and isn't guaranteed for a low-traffic OSS site — **start the application in Tier 0 (0.5)**. Spec the local/miniSearch fallback concretely (heading + symbol boosting) so search is never blocked on a third party. The "symbol search beats both peers" claim is *contingent on building the nonexistent `docs:api` pipeline* (3.4) — its own mini-initiative; first check whether `core/types.md` captures ~80% of the value.

**Accessibility (a named workstream).** Mermaid diagrams ship text alternatives / `aria-describedby`; the DevTools GIF has captions or a static fallback; the comparison matrix and stability badges never signal by color alone; audit code-block contrast; keyboard-operable Sandpack demos. Gate Phase 1 visuals on these checks.

**Visual polish.** Ship the logo (1.2). Enable Mermaid; render the four headline diagrams. Add DevTools screenshots + GIF and a logging sample-output block. Enforce one heading-case style (sentence case) via markdownlint/remark.

**LLM-friendliness.** Generate `llms.txt` + `/llms-full.txt` from existing markdown (3.10) — uncontested for BlaC and high-signal for AI-tool evaluators.

**Versioning posture.** State the policy even if single-version today: where prior-major docs live (or that they don't yet), and the semver/stability commitments (2.15).

**Contribution / consistency.** A `CONTRIBUTING` note codifying: the per-symbol reference template (2.8), sentence-case headings, the single canonical example domain, the `See also`/`What's next` convention, "no visible TBD stubs," and the CI guardrails as required checks. Inline stability badges (stable/experimental/internal) at point-of-use, especially the `@internal APPLY_DEPS`/`REMOVE_DEPS_OWNER` deps wiring.

**Feedback loop.** Beyond `editLink`, add a per-page "Was this helpful?" widget feeding the §1 success metrics.

---

## 7. Suggested Sequencing / Phased Execution

**Phase 0 — Guardrails + Truth & trust (days; Tier 0 + Tier 1).** Stand up Twoslash + doc-snippet typecheck + link-checker + single-source signatures + `size-limit` (0.1–0.3, 0.6); baseline metrics + `lastUpdated` (0.4); **kick off the Algolia application** (0.5). Then the Tier 1 fixes ride on top: the `useSyncExternalStore` claim, the logo, the stale DevTools/deps copy, the broken persistence adapter, `init` visibility, surface `tracked.md`, unify front doors, `editLink`/`docFooter`, `tsconfig`/teaser, promote DirtyTalk. *Fixing drift by hand without CI re-exposes it immediately.*

**Phase 0.5 — Sandpack spike (gate before the interactivity build).** Execute 2.0: confirm `sandpack-vue3` resolves scoped `@blac@2.0.15` from CDN inside VitePress and an authored `RenderCounter` works in an editable example; document the static-GIF fallback. Low-risk now that packages are published — but validate before building on it.

**Phase 1 — Make it visible.** Build the `<Sandpack>` wrapper + shared BlaC template (2.1), author the bespoke landing-page re-render demo (2.2), enable Mermaid and convert the four diagrams with text alternatives (2.3), add accessible DevTools screenshots (2.9). Run the a11y checks as a gate.

**Phase 2 — Close the structural holes.** First finalize the per-symbol reference template (2.8 template half), then: Comparison (2.4), TypeScript guide + Types reference (2.5), SSR/isolation (2.6), Async + Quick Start async (2.7), compat-shim honesty fix (2.13), changelog (2.14), Versioning & Stability (2.15).

**Phase 3 — Raise the floor everywhere.** Roll out the reference template across existing pages (2.8 rollout), co-located Troubleshooting (2.10), missing recipes (2.11), document `channel.subscribe` (2.12).

**Phase 4 — Differentiate.** Tutorial (3.1), internals chapter (3.2), Integrations tree (3.3), the right-sized auto-API initiative + the Algolia swap now that approval landed (3.4), playground (3.5), showcase (3.6), "coming from" pages (3.7), unified sidebar (3.8), recipes catalog (3.9), `llms.txt` (3.10), interactive performance demo (3.11).

---

## 8. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `sandpack-vue3` CDN can't resolve scoped `@blac/*` or 2.0.15 mismatch | Low–Medium | Phase 0.5 spike (2.0); "open in StackBlitz" + static-GIF floor |
| Sandpack heavy bundle hurts page load | Medium | Lazy-mount on scroll/click; static GIF preview until activated |
| Algolia application rejected/slow | Medium | Start in Phase 0; spec local/miniSearch fallback as the guaranteed path |
| `docs:api` pipeline balloons | Medium | Right-size as own initiative (3.4); ship `core/types.md` first; build auto-API only if it adds >20% |
| Correctness fixes rot back in | High (historically) | Tier 0 Twoslash + CI typecheck + single-source signatures make recurrence fail the build |
| New reference pages authored off-template | Medium | Finalize template artifact (2.8) before Phase 2 authoring |
| Bundle-size / version numbers drift | Medium | `size-limit` (0.6) + `lastUpdated` (0.4) make staleness observable |

---

## Appendix: Relevant Files

**Verified during analysis**
- `packages/blac-react/src/useBloc.ts` — uses `useReducer` + `force()`; **no `useSyncExternalStore`** (basis for 1.1)
- `packages/blac-react/src/index.ts:6` — stale `useSyncExternalStore` comment
- `packages/blac-core/src/index.ts:51-59` — public `getRegistry`/`setRegistry`/`StateContainerRegistry` + type-toolkit exports (basis for 2.5, 2.6)
- `packages/blac-compat/package.json` — exists, **private, `0.0.2`**, name **`@9amhealth/blac-compat`** (basis for 2.13)
- `apps/docs/README.md:15,40` — promises nonexistent `pnpm docs:api` / `scripts/generate-api-docs.mjs` (basis for 3.4)
- `apps/docs/plugins/persistence.md:143-155` — undeclared `store`, bare-value `get` (basis for 1.8)
- `apps/docs/public/` — only `.gitkeep` (basis for 1.2)
- `apps/docs/.vitepress/config.ts` — no `editLink`/`lastUpdated`/Mermaid; `tracked.md` absent from sidebar; `search: { provider: 'local' }`; logo at `/logo.svg`

**Edit / build targets**
- IA / nav / search / diagrams / theme config: `apps/docs/.vitepress/config.ts`
- Theme entry / `<Sandpack>` registration: `apps/docs/.vitepress/theme/index.ts` + `theme/custom.css`
- Logo target dir: `apps/docs/public/`
- New demos live here: `apps/docs/demos/` *(authored fresh — do **not** reuse `apps/examples/`)*
- Internals raw material to surface: `apps/docs/dirtytalk/structural/concepts.md`
- Reference template to lift verbatim: `apps/docs/dirtytalk/engine/api-reference.md`
