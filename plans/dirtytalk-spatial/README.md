# dirtytalk-spatial — implementation plan

Plan for landing `@dirtytalk/spatial`: the **rect-based damage-tracking** instantiation of `@dirtytalk/engine` as a new monorepo package.

Spec source: [`dirtytalk/02-insomni.md`](../../dirtytalk/02-insomni.md). Cross-cutting overview: [`dirtytalk/00-overview.md`](../../dirtytalk/00-overview.md). Sibling plan: [`plans/dirtytalk-structural/`](../dirtytalk-structural/README.md).

> **Why the name?** The space the engine operates over here is *spatial* — 2D regions on a drawing surface. Sister package `@dirtytalk/structural` operates over paths through state trees. Both name the algebra, not the host project. There is no existing `insomni` package in this repo; this is greenfield.

---

## Package decision (locked unless you say otherwise)

| Item | Decision |
|------|----------|
| Package name | `@dirtytalk/spatial` |
| Path | `packages/dirtytalk-spatial/` |
| Layout | One package. Single entry export `.` (no React subpath — this is renderer-agnostic, framework-agnostic infrastructure). |
| Build template | Copy from `packages/dirtytalk-engine/`. |
| Test env | `vitest` via `vite-plus`, `environment: 'node'` — no DOM dependency. Hit-testing and damage are pure geometry. |
| Runtime deps | `@dirtytalk/engine` (workspace `*`). |
| Internal deps | `@dirtytalk/engine` only. **Must not import** `@blac/*` or `@dirtytalk/structural`. |
| Versioning | `0.0.1`, no changeset, no publish. |

If any of these need to change, edit this README and the affected task file. Don't let agents guess.

---

## Scope

In scope:
- `Rect` type + helpers (`rectOverlaps`, `rectEquals`, `unionRects`, `rectClamp`).
- `DamageKind` type (`'paint' | 'layout' | 'data'`) and `Damage` entry record.
- `RectSpace: Space<Damage[]>` engine binding.
- `SceneNode` abstract base class: bounds, parent chain, `markDamaged`, `batch`, clip stack.
- `SceneRoot` concrete subclass: owns the `DirtyChannel<Damage[]>` + scheduler, drives the render pipeline (`data` → `layout` → `paint`).
- `PointerRouter`: pointer dispatch via hit-testing the scene tree, replacing today's ad-hoc `trackElement`.
- One cross-unit integration test proving the pieces compose.

Out of scope (separate plans / future):
- Concrete GPU renderer (`Renderer2D`, layer compositing, scissor/tile dispatch). `SceneRoot` calls `renderer.beginFrame(region)` / `endFrame()` / `walkAndPaint(region)` as abstract hooks; the package ships an interface, not an implementation.
- The plot library (`MountedPlot`, mark layers, viewport, axes) — covered conceptually in `02-insomni.md` but lives in the future `insomni` package.
- `AnimatedValue` migration — references the spec's plan to swap `invalidator` for `node: SceneNode`, but the animator itself lives elsewhere.
- v2 spatial-index `RectSpace` (occupancy grid). v1 ships the plain-array representation per spec § "v1 representation".

---

## Phase graph

```
                         ┌────────────────────┐
                         │  00-scaffold       │  (sequential, must commit first)
                         │  Sonnet 4.6 · low  │
                         └────────┬───────────┘
                                  │
            ┌────────────────┬────┴────┬──────────────────┐
            ▼                ▼         ▼                  ▼
        01-rect        01-rect-space   01-readme          (Phase 1 parallel)
        Haiku 4.5      Sonnet 4.6      Haiku 4.5
        · low          · low           · low
            └────────────────┴────┬────┴──────────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │  02-scene-node     │  (Phase 2 sequential)
                         │  Opus 4.7 · high   │
                         └────────┬───────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │  03-scene-root     │  (Phase 3 sequential)
                         │  Sonnet 4.6 · med  │
                         └────────┬───────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │  04-pointer-router │  (Phase 4 sequential)
                         │  Sonnet 4.6 · med  │
                         └────────┬───────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │  05-integration    │  (Phase 5 sequential)
                         │  Sonnet 4.6 · med  │
                         └────────────────────┘
```

**Phase 0** must complete (committed) before any Phase 1 agent starts.
**Phase 1** contains three parallel tasks with disjoint write sets — safe to run concurrently (no worktrees).
**Phases 2–5** are sequential — each depends on the prior phase's commit landing.

---

## Model & effort guide

| Task | Model | Effort | Why |
|------|-------|--------|-----|
| 00-scaffold | Sonnet 4.6 | low | Mechanical copy of engine skeleton + stub files. |
| 01-rect | Haiku 4.5 | low | Pure geometry helpers. Trivial. |
| 01-rect-space | Sonnet 4.6 | low | Small, but `Space` contracts and the `Damage[]` representation need care. |
| 01-readme | Haiku 4.5 | low | Prose. |
| 02-scene-node | Opus 4.7 | high | Bounds setter erase/fill discipline, parent chain walking, clip stack, `batch` deferring marks. Where most footguns live. |
| 03-scene-root | Sonnet 4.6 | medium | Owns channel + scheduler + render pipeline stages. Spec is concrete; complexity is bounded. |
| 04-pointer-router | Sonnet 4.6 | medium | Hit-test in z-order, event dispatch shape. DOM-listener attachment lives behind a thin interface to keep the package DOM-agnostic. |
| 05-integration | Sonnet 4.6 | medium | Toolchain pass + one end-to-end test. |

Effort is advisory.

---

## File ownership matrix

Each task owns a disjoint write set. The Phase 1 trio operate on independent files; sequential phases extend the barrel in their own commit.

| Task | Owned files |
|------|-------------|
| 00-scaffold | `packages/dirtytalk-spatial/{package.json,tsconfig.json,tsconfig.build.json,vite.config.ts,README.md,.gitignore}`, `src/{index.ts,types.ts,rect.ts,rect-space.ts,scene-node.ts,scene-root.ts,pointer-router.ts}` (all stubs only). |
| 01-rect | `src/rect.ts`, `src/rect.test.ts` |
| 01-rect-space | `src/rect-space.ts`, `src/rect-space.test.ts` |
| 01-readme | `README.md` |
| 02-scene-node | `src/scene-node.ts`, `src/scene-node.test.ts` |
| 03-scene-root | `src/scene-root.ts`, `src/scene-root.test.ts`, `src/index.ts` (barrel update only) |
| 04-pointer-router | `src/pointer-router.ts`, `src/pointer-router.test.ts`, `src/index.ts` (barrel update only) |
| 05-integration | `src/integration.test.ts`; `src/index.ts` only if exports missing |

`src/types.ts` is written exclusively in Phase 0 and **must not** be touched after.

---

## Driving an agent

For each task, spawn an agent (`general-purpose` or `quick-build`) with the literal task file as its prompt. Example:

```ts
Agent({
  subagent_type: "quick-build",
  description: "spatial: scaffold package",
  prompt: <contents of plans/dirtytalk-spatial/00-scaffold.md>,
})
```

Each task file contains: goal + acceptance criteria, inputs, owned files, do-not-touch list, check→implement→verify→test→commit cycle, commit message format, pitfalls.

**Branch:** all agents work on the current branch. No worktrees, no branching. If `git status` is dirty at start, the agent must stop and report.

**Parallel safety:** the ownership matrix is the contract. Concurrent agents on the same checkout don't conflict.

---

## Acceptance criteria for the plan as a whole

- [ ] `packages/dirtytalk-spatial/` builds, typechecks, lints, formats, and tests green via `vp run {build,typecheck,lint,format:check,test,verify}`.
- [ ] Public surface (in `dist/index.d.ts`): `Rect`, `rectOverlaps`, `rectEquals`, `unionRects`, `rectClamp`, `Damage`, `DamageKind`, `RectSpace`, `SceneNode`, `SceneRoot`, `Renderer2D` (interface), `PointerRouter`, `PointerEvent` (re-shape).
- [ ] One end-to-end integration test exercises Root + Node + Channel + a stub Renderer end-to-end.
- [ ] No imports from `@blac/*` or `@dirtytalk/structural` anywhere in the package.

---

## Open items to decide before starting

None. The package decision is locked, phase graph is locked, every task file owns its own write set. Hand `00-scaffold.md` to an agent and go.
