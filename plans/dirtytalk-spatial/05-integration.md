# 05 — Integration pass

**Phase:** 5 (sequential — runs after **all** prior commits land)
**Model:** Sonnet 4.6
**Effort:** medium (toolchain verification + end-to-end test)
**Estimated touch:** 1–3 files

---

## Goal

Confirm the spatial package's units integrate cleanly:

1. Full `vp run {typecheck,lint,format:check,test,build,verify}` pass.
2. Build emits `dist/index.{js,cjs,d.ts,d.cts}`.
3. `publint` clean.
4. **One** end-to-end integration test exercises a real `SceneRoot` + a child `SceneNode` + a stub `Renderer2D` + a `PointerRouter` together, proving the units compose at the package surface.

This is also the only opportunity (in this plan) to make small cross-cutting fixes that fell through the cracks.

---

## Inputs — read these first

1. `git log --oneline -- packages/dirtytalk-spatial` — expect ~10 commits: scaffold, three Phase 1 (rect, rect-space, readme), scene-node, scene-root, three for the pointer router (pointInRect, hitTest, router).
2. `dirtytalk/02-insomni.md` — full surface expected.
3. `packages/dirtytalk-spatial/src/index.ts` — final barrel.
4. `~/.claude/CLAUDE.md` — commit format.

---

## Permitted write set

```
packages/dirtytalk-spatial/src/integration.test.ts   (CREATE — required)
packages/dirtytalk-spatial/src/index.ts              (edit only if exports missing/wrong)
```

Any other touch (typo fixes etc.) must be a **separate `fix(dirtytalk-spatial):` commit** preceding the integration commit.

If `package.json`, `tsconfig*.json`, or `vite.config.ts` need editing, **stop and report** — those were locked in Phase 0.

---

## Integration test — `src/integration.test.ts`

One file, four test cases. Use public package barrel imports only (`from './index'`).

### Test 1 — Damage flows from node mutation to renderer

- Stub `Renderer2D` that records `beginFrame(paintRegion)` / `endFrame()` calls (`paintRegion` is a `Rect`).
- `class TestButton extends SceneNode` with a private `_pressed: boolean` field and a `setPressed(v)` setter that does `this._pressed = v; this.markDamaged('paint')`.
- Construct `SceneRoot` with `SyncScheduler`, bounds `{x:0,y:0,w:200,h:200}`.
- Adopt a `TestButton` with bounds `{x:10,y:10,w:50,h:20}`.
- Call `button.setPressed(true)`.
- Assert: renderer received `beginFrame` with a rect that contains the button's bounds.

Hint: adopting a child directly onto the root **does** emit an adopt-time `paint` (Phase 2's `_root()` resolves to the root itself), so under `SyncScheduler` the adoption already produces one frame. Reset the recorder after the `adoptChild` frame and before `button.setPressed(true)` so the assertion sees only the mutation's frame.

### Test 2 — Render pipeline stage ordering

- `class DataLayer extends SceneNode` with `rebuildData = vi.fn()`, `doLayout = vi.fn()`, `paint = vi.fn()`.
- Adopt to root.
- Call `layer.markDamaged('data')` (you'll need to expose `markDamaged` via a public method on the subclass for the test).
- Assert call order: `rebuildData` → `doLayout` → renderer `beginFrame` → `paint` → `endFrame`.

### Test 3 — PointerRouter end-to-end

- Root with two overlapping `InteractiveNode` children (where `InteractiveNode` is `SceneNode` + `onPointerDown` recorder). Adopt order: A then B, so B is on top.
- `new PointerRouter(root)`.
- `router.dispatch({ type: 'down', x: 25, y: 25, buttons: 1, pointerId: 1 })` — both A and B overlap (25,25); only B should receive `onPointerDown`.
- `router.dispatch({ type: 'move', x: 500, y: 500, buttons: 1, pointerId: 1 })` — capture means B still receives `onPointerMove`, even though (500,500) is outside everything.
- `router.dispatch({ type: 'up', x: 500, y: 500, buttons: 0, pointerId: 1 })` — B receives `onPointerUp`, capture released.
- `router.dispatch({ type: 'move', x: 25, y: 25, buttons: 0, pointerId: 1 })` — uncaptured move, hits B at (25,25).

### Test 4 — Batch coalescing

- Subclass `SceneNode` exposes a `pubBatch(fn)` method that forwards to `this.batch(fn)`.
- Inside `batch`, call `markDamaged('paint', r1)` and `markDamaged('paint', r2)`.
- Assert: renderer's `beginFrame` was called exactly once with the union rect (one frame for both marks).

---

## Cycle (check → verify → test → fix-if-needed → commit)

1. **Check.**
   - `git status` clean.
   - All prior phases' commits present in `git log packages/dirtytalk-spatial --oneline`.
   - `grep -r "not implemented" packages/dirtytalk-spatial/src/` returns empty.

2. **Verify package shape.**
   - `vp run typecheck`, `vp run lint`, `vp run format:check` — all pass.

3. **Write the integration test.** Per spec above.

4. **Test.**
   - `vp run test src/integration.test.ts` — passes.
   - `vp run test` — full suite green.

5. **Verify build.**
   - `vp run build` — `dist/index.{js,cjs,d.ts,d.cts}` emitted.
   - `vp run verify` — publint clean.
   - `vp run clean`.

6. **Cross-check the surface.** Compare exports against `plans/dirtytalk-spatial/README.md` § "Acceptance criteria":
   - `Rect` (type), `rectOverlaps`, `rectEquals`, `unionRects`, `rectClamp`, `pointInRect`.
   - `Damage` (type), `DamageKind` (type), `DirtyRegion` (type), `RectSpace`.
   - `SceneNode`, `SceneNodeOptions`.
   - `SceneRoot`, `SceneRootOptions`, `Renderer2D`.
   - `PointerRouter`, `SpatialPointerEvent`, `PointerHandler`.

   If missing, edit `src/index.ts` and document in commit body.

7. **Commit(s).**
   - **Main commit:**
     ```
     test(dirtytalk-spatial): add end-to-end integration test
     ```
   - Any fixes from step 6 go in a separate prior commit:
     ```
     fix(dirtytalk-spatial): <what>
     ```

   No co-author.

---

## Acceptance criteria

- [ ] `vp run {typecheck,lint,format:check,test,build,verify}` all pass.
- [ ] All test files green (rect, rect-space, scene-node, scene-root, pointer-router, integration).
- [ ] Integration test imports only from `./index` (no deep paths).
- [ ] Surface exports match plan README's listed surface.

---

## Pitfalls

- **Don't replace any prior implementation.** Surface bugs via a `fix(...)` commit; don't silently rewrite.
- **`SyncScheduler` in tests** so each `mark` produces a frame immediately and assertions are synchronous.
- **`adoptChild`'s damage entry can confuse the renderer assertion** — see Test 1's hint. Either reset the recorder between adoption and the test mutation, or assert on the union including the adoption rect.
- **Don't use real `requestAnimationFrame`** in tests — `SyncScheduler` exists for this.
- **Don't add `examples/` or `docs/`.** Out of scope.
- **`dist/` must not be committed.** `vp run clean` first.
- **Don't import `@dirtytalk/spatial`** (self-published name) in the test — use relative `./index`.
- **Don't bump versions.** Stays at `0.0.1`.
- **If a test fails because Phase 2's `setBounds` emits two paint damages on initial adopt**, that's a Phase 2 bug — open a separate `fix(...)` commit per the rule above. (Spec: `adoptChild` emits one full-bounds `paint` on attach. If you see two, the implementation diverged from spec.)
