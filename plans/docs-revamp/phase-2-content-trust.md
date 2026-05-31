# Phase 2 — Content & trust pages (items 2.10–2.15)

The highest trust-per-effort batch: new pages and correctness fixes that the
build type-checks for us. Most are independent new files → strongly
parallelizable. One serial wiring task at the end.

**Read README.md hard rules first.**

## Parallelism map

| Group | Tasks | Notes |
|---|---|---|
| **P2a** (parallel) | 2.14, 2.15, 2.12, 2.13 | disjoint new/edited files |
| **P2b** (parallel) | 2.11, 2.10 | 2.10 edits many ref pages — see its note |
| **Serial** | 2.W (wiring) | runs last; owns `config.ts` |

> 2.10 touches many existing reference pages; do not run it in the same window
> as 2.8 rollout (Phase 3) — they edit the same files. Sequence 2.10 → then
> Phase 3, or Phase 3 → then 2.10. Keep them apart.

---

## Task 2.14 — Changelog page

- **Model / effort:** Sonnet 4.6 / high. *Rationale: structured authoring from
  existing changesets; needs judgment on grouping, no deep source archaeology.*
- **Parallel group:** P2a.
- **Owns:** `apps/docs/guide/changelog.md` (new). Does NOT edit `config.ts`.
- **Context to read:** `.changeset/` and any `CHANGELOG.md` per package
  (`packages/blac-core`, `packages/blac-react`, `packages/dirtytalk*`); check for
  a `generate-changelog.mjs` script (plan §2.14 references one — verify it
  exists; if not, hand-author from package CHANGELOGs).

**CHECK:** Find the real release history sources. Note the version skew
(core `2.0.x` vs DirtyTalk/compat `0.0.x`) — the page must present per-package
history honestly, not a single merged stream that implies one version.

**IMPLEMENT:** In-docs, human-readable per-package release history with stability
notes. Group by package, newest first. Link to GitHub Releases for full detail.
Add a short intro explaining the per-package versioning. No `twoslash` needed
(prose + version lists).

**VERIFY:** `pnpm -F @blac/docs build` exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: add in-docs changelog page`

---

## Task 2.15 — Versioning & Stability page

- **Model / effort:** Sonnet 4.6 / high. *Rationale: policy prose + a support
  matrix; correctness matters but is verifiable from package.json/peerDeps.*
- **Parallel group:** P2a.
- **Owns:** `apps/docs/guide/versioning.md` (new). No `config.ts`.
- **Context to read:** `package.json` peerDeps across packages (React version
  support), `packages/*/package.json` versions, the v1→v2 migration page
  (`apps/docs/guide/migration-from-v1.md`) for the deprecations already listed.

**CHECK:** Pull real numbers: supported React range, browser/ESM target,
current per-package versions. Confirm the `0.0.x`-vs-`2.0.x` skew framing
matches reality.

**IMPLEMENT:** Sections — semver policy; React/browser support matrix
(table); consolidated deprecations (link migration page, don't duplicate); the
bundled-maturity explanation (why DirtyTalk `0.0.x` ships next to core `2.0.x`);
a stability-badge legend (stable/experimental/internal) referenced by other
pages. Prose + tables only.

**VERIFY:** build exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: add versioning and stability page`

---

## Task 2.12 — `channel.subscribe` reference

- **Model / effort:** **Opus 4.8 / high.** *Rationale: a low-level API that must
  be specified from source — interest/PathSet shape, callback signature,
  unsubscribe semantics, and the inside-React vs outside-React framing. Getting
  the types wrong here is a trust bug; worth the heavier model.*
- **Parallel group:** P2a.
- **Owns:** `apps/docs/core/subscribe.md` (new). No `config.ts`.
- **Context to read:** the channel/subscribe implementation in
  `packages/blac-core/src` (grep `subscribe`, `PathSet`, `interest`,
  `channel`), `apps/docs/core/watch.md`, `apps/docs/core/tracked.md`.

**CHECK:** Read the actual `subscribe(interest, cb)` signature and the
`PathSet`/interest type from source. Confirm whether it's public or `@internal`
and label accordingly. Identify the unsubscribe return.

**IMPLEMENT:** Per-symbol reference (follow the DirtyTalk api-reference shape):
verbatim Signature fence, interest/PathSet shape, callback contract, unsubscribe,
a runnable `ts twoslash` example (NO JSX — vanilla subscribe usage), and a
framing section: inside-React = `useBloc`; outside-React = `watch` /
`channel.subscribe`. Cross-link `watch.md` and `tracked.md`.

**VERIFY:** build exit 0 (twoslash compiles against real types); `vp fmt` +
`format:check`.

**COMMIT:** `docs: document channel.subscribe low-level API`

---

## Task 2.13 — Compat-shim honesty fix

- **Model / effort:** Sonnet 4.6 / high. *Rationale: careful, right-sized
  correctness — remove a denial and describe a pattern without promoting a
  private external package. Mostly editing existing migration prose.*
- **Parallel group:** P2a.
- **Owns:** `apps/docs/guide/migration-from-v1.md` (edit) and any page that
  currently claims "no compat shim" (grep first). No `config.ts`.
- **Context to read:** `packages/blac-compat/package.json` (verify name
  `@9amhealth/blac-compat`, private, `0.0.2`), `apps/docs/guide/migration-from-v1.md`,
  `rg -n "compat" apps/docs`.

**CHECK:** Find the exact sentence(s) denying a compat shim exists. Confirm the
package is **private/internal** — the fix removes the false denial and documents
the *alias pattern*, NOT a recommendation to depend on an internal package.

**IMPLEMENT:** Replace the denial with an honest note: an internal
`@9amhealth/blac-compat` alias pattern exists (private), describe the shimming
approach generically so external users can replicate it, and explicitly say it
is not published for general use. Keep it tight.

**VERIFY:** build exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: correct compat-shim claim in migration guide`

---

## Task 2.11 — High-demand recipes

- **Model / effort:** Sonnet 4.6 / high. *Rationale: substantial authoring (7
  recipes) but each follows a known pattern; the build verifies the snippets.
  Cost-effective at Sonnet.*
- **Parallel group:** P2b.
- **Owns:** `apps/docs/guide/patterns.md` (extend) — or new files under
  `apps/docs/guide/recipes/` if the page grows too large (decide in CHECK). No
  `config.ts` unless adding new files (then leave wiring to 2.W).
- **Context to read:** `apps/docs/guide/patterns.md` (match its voice + the
  "use this when / don't" opener convention), `apps/docs/guide/async.md` (reuse
  the loadable/request-id patterns), the core API for `emit`/`patch`/`update`.

**CHECK:** List which recipes are missing vs present. Target set: optimistic
update, debounce, undo/redo, pagination, WebSocket subscription, form
validation, reset-to-initial. Decide single-page vs split.

**IMPLEMENT:** Each recipe: one-line "use when / don't use when" opener, a
`ts twoslash` block (NO JSX — Cubit logic) plus a plain `tsx` block for any
component usage, and inline footgun caveats at the exact line (e.g. redact PII
before shipping state to a sink). Keep the canonical counter/todo domain.

**VERIFY:** build exit 0 (every twoslash compiles); `vp fmt` + `format:check`.

**COMMIT:** `docs: add optimistic/debounce/undo and more recipes`
(if split into files, one commit is fine; keep subject ≤50).

---

## Task 2.10 — Co-located troubleshooting blocks

- **Model / effort:** Sonnet 4.6 / medium. *Rationale: repetitive, pattern-based
  edits across known pages; low novelty.*
- **Parallel group:** P2b — **but must not overlap Phase 3 rollout** (shared
  files). Run 2.10 fully, commit, before starting Phase 3 (or after it).
- **Owns:** appends a "Troubleshooting" section to existing reference pages:
  `apps/docs/react/use-bloc.md`, `apps/docs/react/performance.md`,
  `apps/docs/core/cubit.md`, `apps/docs/core/instance-management.md`,
  `apps/docs/core/tracked.md` (confirm exact set in CHECK). No `config.ts`.
- **Context to read:** `apps/docs/guide/troubleshooting.md` (the central FAQ —
  source the symptom→fix pairs from here), each target page.

**CHECK:** For each page, identify the 1–3 symptom-keyed problems that belong
co-located (e.g. useBloc: "re-renders too often" → `select`/shallow; "state
leaks between mounts" → `instanceId: useId()`; "expected `autoTrack`/`isolated`"
→ removed). Pull fixes from the central FAQ; don't invent.

**IMPLEMENT:** Append a short, symptom-first "Troubleshooting" `##` section to
each page. Link back to the central FAQ for the long tail. Snippets as
`ts twoslash` where they have types, plain `tsx` for JSX.

**VERIFY:** build exit 0; `vp fmt` + `format:check` on edited files.

**COMMIT:** `docs: co-locate troubleshooting on reference pages`

---

## Task 2.W — Phase 2 nav/sidebar wiring (SERIAL, last)

- **Model / effort:** Haiku 4.5 / medium. *Rationale: a focused `config.ts`
  edit; mechanical but must be the sole editor of the shared file.*
- **Depends on:** all of 2.10–2.15 committed.
- **Owns:** `apps/docs/.vitepress/config.ts` only.
- **Context to read:** current `config.ts` sidebar/nav; the new page paths.

**CHECK:** Collect the routes created this phase: `/guide/changelog`,
`/guide/versioning`, `/core/subscribe`, plus any new recipe files. Confirm their
frontmatter titles.

**IMPLEMENT:** Per the IA in `DOCS_IMPROVEMENT_PLAN.md` §4: add Changelog +
Versioning under guide "Reference Aids"; add "Low-level subscribe" to the Core
sidebar; wire any new recipe pages. Match existing object style.

**VERIFY:** build exit 0 (dead-link check now covers the new links); `vp fmt` +
`format:check`.

**COMMIT:** `docs: wire phase-2 pages into nav and sidebar`
