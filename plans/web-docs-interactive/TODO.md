# web-docs Interactive Demos — Progress Checklist

Tier model: **Twoslash** (reference) · **Island** (claims, default) · **Sandpack**
(play, ≤4 pages). See [README](./README.md). Mark `[x]` as each task commits.

## Setup (orchestrator)

- [ ] Create shared branch `feat/web-docs-interactive` (no worktrees)

## Phase 0 — Foundation (serial gate)

- [x] **0.1** React renderer + demo infra (`DemoFrame`, `RenderCounter`, proof island) — _Opus / high_ — `9e17b93f`, build green

## Phase 1 — Islands (parallel, after 0.1)

- [x] **1.A** Value-prop render-counter demos: introduction, mental-model, concepts — _Sonnet / high_ — `fa08f0cc`
- [x] **1.B** React feature demos: dependency-tracking, performance, use-bloc — _Sonnet / high_ — `be414962`
- [x] **1.C** Behavior demos: inputs, async — _Sonnet / medium_ — `245db867`
- [ ] **1.D** _(optional)_ DevTools live-state demo — _Sonnet / medium_

## Phase 2 — Sandpack (after 0.1)

- [ ] **2.1** `<BlacSandpack>` wrapper + version pin (serial gate) — _Opus / high_
- [ ] **2.2** Tutorial playground — _Sonnet / high_ — depends 2.1
- [ ] **2.3** Quick Start capstone sandbox — _Sonnet / medium_ — depends 2.1
- [ ] **2.4** `/playground` page + nav wiring (serial, owns config) — _Haiku / medium_ — after 2.2/2.3

## Phase 3 — Closeout (parallel, after 1 & 2)

- [ ] **3.1** Consistency pass + optional recipe promotion — _Sonnet / medium_
- [ ] **3.2** Document demo infra — _Haiku / medium_
- [ ] _(orchestrator)_ Update memory note `project_docs_interactive_examples`

---

### Coverage reference (where each tier lands)

- **Islands (~8):** introduction, mental-model, concepts, dependency-tracking,
  performance, use-bloc, inputs, async (+ optional devtools).
- **Sandpack (≤4):** tutorial, getting-started capstone, /playground (+ optional).
- **Twoslash (everything else):** all `core/*`, typescript, internals,
  best-practices, comparison, glossary, troubleshooting, migration, changelog,
  versioning, coming-from-*, recipes/*, testing/*, integrations/*, plugins/*
  (except devtools), all dirtytalk/*.
