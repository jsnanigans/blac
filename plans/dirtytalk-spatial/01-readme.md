# 01 — Package README

**Phase:** 1 (parallel — owns only `README.md`)
**Model:** Haiku 4.5
**Effort:** low (prose)
**Estimated touch:** 1 file

---

## Goal

Replace the placeholder `packages/dirtytalk-spatial/README.md` with the package's real README. Match the tone and structure of `packages/dirtytalk-engine/README.md`.

---

## Inputs — read these first

1. `packages/dirtytalk-engine/README.md` — tone, length, structure to match.
2. `dirtytalk/02-insomni.md` — full spec.
3. `dirtytalk/00-overview.md` § "The core insight" — cross-cutting framing.
4. `plans/dirtytalk-spatial/README.md` — package decision summary.
5. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-spatial/README.md
```

**Do not touch:** anything else.

---

## Required sections

Match engine README structure. Minimum sections:

1. **Title + tagline.** `# @dirtytalk/spatial` + "Rect-based damage-tracking instantiation of @dirtytalk/engine, for canvas/GPU renderers and any 2D scene graph."
2. **Why this exists.** Two paragraphs:
   - The shared cross-cutting framing (paraphrase `00-overview.md`).
   - The problem this solves vs single-dirty-bit invalidation: damage carries rects + kind, the render pipeline runs `data → layout → paint` stages, and granular damage opens the door to scissor/tile partial redraw without an API change.
3. **What's in the box.** Bullet list:
   - `Rect` + helpers (`rectOverlaps`, `rectEquals`, `unionRects`, `rectClamp`).
   - `Damage`, `DamageKind`, `RectSpace`.
   - `SceneNode` abstract base class.
   - `SceneRoot` + `Renderer2D` contract.
   - `PointerRouter` for pointer dispatch via hit-testing.
4. **Install.** `pnpm add @dirtytalk/spatial @dirtytalk/engine`.
5. **Quick example — minimal scene.** A `Button extends SceneNode` with a `setValue(v)` setter that calls `markDamaged('paint')`; mount it under a `SceneRoot` with a stub `Renderer2D`; mutate and observe damage flowing to the renderer.
6. **Quick example — pointer routing.** Show `new PointerRouter(root).dispatch(event)` returning the hit node; ergonomics of dispatching DOM `PointerEvent` to scene nodes.
7. **API surface — public exports.** Tabular list mapping export name → file/role.
8. **Damage kinds.** Three-row table explaining `paint` / `layout` / `data`.
9. **Render pipeline.** Describe the `data → layout → paint` ordering with one short example.
10. **What it is not.** Mirror engine's "What it is not":
    - No GPU renderer included (the package ships the contract, not the implementation).
    - No spatial index (v1 uses a plain array; v2 will add an occupancy grid).
    - No auto-tracked reads — painting fires because the node was damaged, not because its fields were read.
    - No virtual scene diff — nodes declare their own damage.
    - No animation primitive — animators integrate by calling `markDamaged('paint')` per step.
    - Not coupled to a specific browser API — `SpatialPointerEvent` is the framework-agnostic event shape.
11. **License.** `MIT — see LICENSE.`

Keep it ≤ ~280 lines. The engine README is the target.

---

## Tone and style

- No emoji.
- Don't reference `insomni` by name. The package's identity is "spatial."
- Examples must compile (mentally). Write complete `Button` / `SceneRoot` examples with concrete types.
- Mention `Renderer2D` as an interface, not an implementation. One sentence on how a real renderer (insomni's WebGPU layer) would plug in.

---

## Cycle

1. **Check.** `git status` clean. Phase 0 commit present.
2. **Write.** Replace `README.md`.
3. **Verify.** `vp run format:check` from `packages/dirtytalk-spatial/`.
4. **Commit.**

   ```
   docs(dirtytalk-spatial): write package README
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] All required sections present.
- [ ] No `insomni` references.
- [ ] Code examples are complete.
- [ ] `vp run format:check` passes.
- [ ] No changes outside `README.md`.

---

## Pitfalls

- **Don't write detailed API docs that go stale.** Put signatures and parameter explanations in TSDoc on the source; the README is for concepts and quickstarts.
- **Don't claim performance numbers.** Architectural claims OK; benchmark numbers no.
- **Don't include a GPU code snippet** — the renderer is out of scope. Use a stub `Renderer2D` that `console.log`s the damage region in the example.
- **Don't pad with FAQ or "Comparison with X" sections.** Cut.
- **Don't reference `MountedPlot` or plot-specific concepts.** Those belong in the future insomni package's README.
