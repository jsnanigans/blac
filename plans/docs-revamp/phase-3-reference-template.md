# Phase 3 — Reference template + rollout (item 2.8)

"Predictability is the feature." Define one rigid per-symbol reference template,
then apply it across the core/react reference pages. The template **gates** the
rollout — design it once, well, then fan out.

**Read README.md hard rules first.**

> **Conflict warning:** the rollout edits the same reference pages as Phase 2's
> 2.10 (troubleshooting). Do not run 3.R* concurrently with 2.10. Sequence:
> finish 2.10 → then this phase (the troubleshooting section becomes part of the
> template), or this phase → then 2.10. Pick one order and serialize.

## Parallelism map

| Group | Tasks | Notes |
|---|---|---|
| **Serial gate** | 3.T (template design) | must finish + commit first |
| **P3** (parallel) | 3.R1, 3.R2, 3.R3 | each owns a disjoint set of pages |

---

## Task 3.T — Define the per-symbol template (gate)

- **Model / effort:** **Opus 4.8 / high.** *Rationale: a design artifact every
  later page inherits; getting the structure, generics-fence convention, and
  examples right once is high-leverage. Worth the heavy model.*
- **Depends on:** nothing (can overlap Phase 2 authoring, but its OUTPUT gates
  3.R*).
- **Owns:** `plans/docs-revamp/reference-template.md` (the spec artifact) and a
  proof-of-template conversion of ONE page: `apps/docs/core/cubit.md`.
- **Context to read:** `apps/docs/dirtytalk/engine/api-reference.md` (lift this
  shape verbatim), `apps/docs/core/cubit.md`, the Cubit source for exact
  `emit`/`patch`/`update`/`init` signatures.

**CHECK:** Extract the DirtyTalk template's structure: H2/H3 → verbatim Signature
fence (full generics + return) → Parameter table → explicit **Returns** →
Behavior → runnable example → (optional) co-located Troubleshooting.

**IMPLEMENT:**
1. Write `reference-template.md` — the canonical skeleton + rules (signature
   fence first, `ts twoslash` examples without JSX, self-contained imports,
   sentence-case headings) as a copy-paste checklist for rollout agents.
2. Convert `core/cubit.md` to the template as the reference exemplar (covers
   `emit`/`patch`/`update`/`init`/getters). This is what 3.R* agents mimic.

**VERIFY:** build exit 0; `vp fmt` + `format:check` on `core/cubit.md`.

**COMMIT:** `docs: define per-symbol reference template`
(the `plans/` file can ride along; it's not built.)

---

## Task 3.R1 — Roll out: Core lifecycle pages

- **Model / effort:** Sonnet 4.6 / medium. *Rationale: mechanical application of
  3.T's template; the exemplar removes the design burden.*
- **Depends on:** 3.T committed.
- **Parallel group:** P3.
- **Owns:** `apps/docs/core/instance-management.md`,
  `apps/docs/core/system-events.md`.
- **Context to read:** `plans/docs-revamp/reference-template.md`,
  `apps/docs/core/cubit.md` (the exemplar), the source for
  `acquire`/`ensure`/`borrow`/`release` and `onSystemEvent`.

**CHECK / IMPLEMENT:** Restructure each page's symbols to the template
(signature fence → params → returns → behavior → example). Don't change facts;
restructure + fill gaps. Keep self-contained imports.

**VERIFY:** build exit 0; `vp fmt` + `format:check`.

**COMMIT:** `docs: apply reference template to core lifecycle`

---

## Task 3.R2 — Roll out: Core communication/tracking pages

- **Model / effort:** Sonnet 4.6 / medium.
- **Depends on:** 3.T committed.
- **Parallel group:** P3.
- **Owns:** `apps/docs/core/bloc-communication.md`, `apps/docs/core/watch.md`,
  `apps/docs/core/tracked.md`.
- **Context to read:** template + exemplar; source for `depend()`, `watch`,
  tracking internals.

**CHECK / IMPLEMENT / VERIFY:** as 3.R1, for these pages. `depend()` signature
must be verbatim from source.

**COMMIT:** `docs: apply reference template to core comms`

---

## Task 3.R3 — Roll out: React reference pages

- **Model / effort:** Sonnet 4.6 / medium.
- **Depends on:** 3.T committed.
- **Parallel group:** P3.
- **Owns:** `apps/docs/react/use-bloc.md`,
  `apps/docs/react/dependency-tracking.md`, `apps/docs/react/performance.md`.
- **Context to read:** template + exemplar; `packages/blac-react/README.md`
  (authoritative `useBloc` options table), `packages/blac-react/src/types.ts`.

**CHECK / IMPLEMENT / VERIFY:** apply template. JSX examples stay plain `tsx`
(no twoslash) per the hard rules. The `useBloc` options table must match
`types.ts` exactly (`args`/`select`/`instanceId`/`onMount`/`onUnmount` only).

**COMMIT:** `docs: apply reference template to react pages`

> No separate wiring task — these pages are already in the sidebar; the template
> only restructures content.
