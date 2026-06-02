# 🖨️ Midnight Risograph — web-docs redesign

Full custom theme for `apps/web-docs` (Astro + Starlight). This folder is the
orchestration hub: a concept brief, a shared agent contract, five phased task
files, and a TODO tracker. Each task is a self-contained brief you can hand to a
subagent that runs its own **check → implement → verify → test → commit** cycle.

---

## The concept

> **A cozy nocturnal study that prints its own zine.**

Dim warm charcoal (not OLED black), muted pastels glowing softly, **90% pristine
editorial reading** — punctuated by loud risograph set-pieces (halftone,
two-color overprint, ink misregistration) at heroes and section breaks. Calm to
read, with delightful surprises at the edges. **Dark-first**, with a warm-paper
light companion. The expressive/weird payload is a **variable display font** that
morphs (weight + width) on load and hover, confined to set-pieces.

Decided with the user (questionnaire):

| Axis | Choice |
|---|---|
| Spirit space | Cozy reading nook (paper warmth, serif headings) |
| Palette | Cool muted pastels (sage / dusty-blue / lavender) |
| State philosophy | "State should be invisible" — calm, understated |
| Type | Expressive / weird → **variable-font showpiece** |
| Tension | Calm base, **wild moments** (restraint makes the BOOM hit) |
| Light/dark | **Dark-first**, dim & moody (light is the companion) |
| Motion | Delightful surprises |
| Motif | Riso / print artifacts (halftone, overprint, misregistration) |

---

## Phase map & dependencies

```
Phase 1  Foundation  ──┐  tokens + self-hosted variable font + global type
                       │
Phase 2  Riso kit    ──┤  CSS primitives + Astro components   (needs P1 tokens)
                       │
Phase 3  Chrome      ──┤  Starlight overrides + logo/favicon  (needs P1, P2)
                       │
Phase 4  Landing     ──┤  Hero + index.mdx flagship           (needs P2, P3)
                       │
Phase 5  Polish      ──┘  motion + light tuning + a11y + build (needs all)
```

**Phases are strictly sequential** — a later phase consumes earlier output.
Within a phase, tasks tagged `[PARALLEL]` have disjoint file sets and no ordering
dependency.

### Task index

| ID | Phase | Task | Parallel group | Model / effort |
|----|-------|------|----------------|----------------|
| T1.1 | 1 | Color token system (`tokens.css`) | — (do first) | **Sonnet 4.6 / medium** |
| T1.2 | 1 | Self-hosted variable + body fonts, type scale | ‖ after T1.1 var-name contract | **Sonnet 4.6 / high** |
| T2.1 | 2 | Riso primitive CSS (`riso.css`) | — (do first) | **Sonnet 4.6 / high** |
| T2.2 | 2 | Riso Astro components | after T2.1 | **Sonnet 4.6 / medium** |
| T3.1 | 3 | Chrome CSS (sidebar/nav/cards) | ‖ A | **Sonnet 4.6 / medium** |
| T3.2 | 3 | `PageTitle.astro` override | ‖ A | **Sonnet 4.6 / medium** |
| T3.3 | 3 | `Footer.astro` zine colophon | ‖ A | **Sonnet 4.6 / medium** |
| T3.4 | 3 | Logo + favicon riso re-skin | ‖ A | **Haiku 4.5 / medium** |
| T4.1 | 4 | Hero override + landing rebuild (flagship) | — | **Opus 4.8 / high** |
| T5.1 | 5 | Motion layer (variable-font morph, drift, easter eggs) | ‖ B | **Sonnet 4.6 / high** |
| T5.2 | 5 | Light-mode tuning + WCAG AA contrast audit | ‖ B | **Sonnet 4.6 / medium** |
| T5.3 | 5 | Final strict build + cross-page regression sweep | after B | **Sonnet 4.6 / medium** |

`‖ A` and `‖ B` = tasks safe to run concurrently (see commit protocol in
`00-conventions.md`).

---

## Model / effort rationale

Goal: **most effective model for the cost**, scaled to complexity & ambiguity.

- **Haiku 4.5 (low/medium)** — mechanical, low-judgment edits (SVG color swaps).
  Cheapest; fine when the spec is exact and there's little taste involved.
- **Sonnet 4.6 (medium)** — standard implementation against a clear spec
  (token wiring, single-component overrides, CSS polish). The workhorse.
- **Sonnet 4.6 (high)** — bounded-but-tricky craft: blend-mode/print CSS, font
  subsetting + fallback metrics, animation finesse. Sonnet at high effort is the
  cost-efficient sweet spot here; Opus is not worth the premium for self-contained
  CSS/JS work.
- **Opus 4.8 (high)** — reserved for the one flagship, high-creativity,
  high-ambiguity task (the landing/hero set-piece) where design judgment across
  many moving parts pays for the premium.

If a model tier is unavailable, step up one (Haiku→Sonnet, Sonnet→Opus) rather
than down.

---

## How to run it

1. **Orchestrator, once, up front:** create the branch (we're currently on
   `main`; do not commit there):
   ```fish
   git switch -c feat/web-docs-midnight-risograph
   ```
2. Read `00-conventions.md` — it is the shared contract every agent must follow
   (cycle, commands, commit protocol, guardrails). Paste its "Agent contract"
   section into each subagent prompt along with the task brief.
3. Dispatch phase by phase, in order. Within a phase, `[PARALLEL]` tasks may run
   concurrently **only** under the commit protocol (no worktrees → shared index).
   The simplest safe path is to run them sequentially.
4. After each task, the agent ticks its box in `TODO.md`.
5. Gate to the next phase only when the current phase's tasks are all committed
   and the strict build is green.

> **No git worktrees** (user constraint). All agents share one working copy and
> the same branch — the commit protocol in `00-conventions.md` exists to keep
> concurrent commits from racing the git index.
