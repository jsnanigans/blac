# Phase 1 — Sandpack close-out (item 2.2)

Promote the browser-verified per-consumer re-render demo onto real pages and
remove the temporary spike. Small, mostly mechanical, but the payoff is the
landing-page "watch only the reader re-render" artifact neither competitor ships.

**Read README.md hard rules first.** All paths relative to repo root.

Sequencing: **1.A and 1.B are parallel-safe** (disjoint files: `index.md` vs
`react/use-bloc.md`). **1.C is serial, runs last** (deletes the shared spike
page and is the human-gated browser re-check). Do not run 1.C until 1.A+1.B
commit.

---

## Task 1.A — Embed the demo on the landing page

- **Model / effort:** Haiku 4.5 / medium. *Rationale: mechanical — reuse the
  proven embed from `sandpack-spike.md`; no new logic, build is the safety net.*
- **Parallel group:** P1 (with 1.B).
- **Owns:** `apps/docs/index.md`.
- **Context to read:** `apps/docs/sandpack-spike.md` (the working embed),
  `apps/docs/demos/per-consumer-tracking.ts`, `apps/docs/index.md`.

**CHECK:** Confirm `index.md` is the VitePress home layout and that
`perConsumerTrackingFiles` is exported from `./demos/per-consumer-tracking`.
Confirm `<BlacSandpack>` is globally registered (theme/index.ts) — do NOT
re-register.

**IMPLEMENT:** After the "Quick Example" static block, add a new section
("See it: only the reader re-renders" or similar) with a 1–2 sentence framing of
per-consumer tracking, then the embed copied from the spike page:
```md
<script setup>
import { perConsumerTrackingFiles } from './demos/per-consumer-tracking';
</script>
...
<BlacSandpack :files="perConsumerTrackingFiles" active-file="/App.tsx" :editor-height="500" />
```
Keep the home `layout: home` frontmatter. Place the `<script setup>` block once,
at the top after frontmatter.

**VERIFY:** `pnpm -F @blac/docs build` exits 0. `vp fmt apps/docs/index.md` then
`vp run format:check`. Grep the built output is not required — build green is
enough (SSR-safety already proven for `<BlacSandpack>`).

**COMMIT:** `docs: embed re-render demo on landing page`

---

## Task 1.B — Embed the demo on the useBloc page

- **Model / effort:** Haiku 4.5 / medium. *Rationale: same mechanical embed,
  different host page.*
- **Parallel group:** P1 (with 1.A).
- **Owns:** `apps/docs/react/use-bloc.md`.
- **Context to read:** `apps/docs/sandpack-spike.md`,
  `apps/docs/demos/per-consumer-tracking.ts`, `apps/docs/react/use-bloc.md`
  (find the "Tracking Modes" / auto-tracking section).

**CHECK:** Locate the auto-tracking / tracking-modes section — the demo belongs
there, illustrating the claim in place. Confirm no existing `<script setup>` in
the page; if one exists, merge the import rather than adding a second block.

**IMPLEMENT:** Insert the same `<BlacSandpack :files="perConsumerTrackingFiles">`
embed right after the auto-tracking explanation, with one framing sentence.

**VERIFY:** `pnpm -F @blac/docs build` exits 0; `vp fmt` + `format:check` on the
file.

**COMMIT:** `docs: embed re-render demo on useBloc page`

---

## Task 1.C — Remove the spike page (serial, human-gated)

- **Model / effort:** Haiku 4.5 / low. *Rationale: a delete + grep for dangling
  refs.*
- **Depends on:** 1.A and 1.B committed, **and** a human confirming the demo
  renders on `/` and `/react/use-bloc` via `pnpm -F @blac/docs dev`.
- **Owns:** `apps/docs/sandpack-spike.md` (delete).
- **Context to read:** none beyond a repo-wide grep.

**CHECK:** `rg -n "sandpack-spike" apps/docs` — confirm nothing links to it
(it was never in nav/sidebar). If anything references it, stop and report.

**IMPLEMENT:** Delete `apps/docs/sandpack-spike.md`.

**VERIFY:** `pnpm -F @blac/docs build` exits 0 (no dead links).

**COMMIT:** `docs: remove temporary sandpack spike page`

> **Human gate:** before running 1.C, a person runs `pnpm -F @blac/docs dev`,
> opens `/` and `/react/use-bloc`, and confirms the embed renders + "Bump left"
> ticks only the left counter. The orchestrator must not auto-run 1.C without
> this confirmation.
