# 04 — `PointerRouter`

**Phase:** 4 (sequential — runs after Phase 3 commit lands)
**Model:** Sonnet 4.6
**Effort:** medium (hit-testing in z-order, event dispatch shape, surface-agnostic API)
**Estimated touch:** 3 files (impl + tests + barrel update)

---

## Goal

Implement `PointerRouter` — the helper that takes a `SpatialPointerEvent`, hit-tests the scene tree under `(x, y)`, and dispatches the event to the topmost interactive node.

Also fills in `SceneRoot.hitTest(x, y)` (Phase 3 left it as a "Phase 4 will implement" throw).

Replaces today's ad-hoc `trackElement` safety-net pattern (DOM event handlers manually marking the invalidator).

---

## Inputs — read these first

1. `dirtytalk/02-insomni.md` § "Pointer routing" — the full spec.
2. `packages/dirtytalk-spatial/src/scene-node.ts`, `scene-root.ts` — what you'll hit-test against.
3. `packages/dirtytalk-spatial/src/rect.ts` — `rectOverlaps` won't help here; you need a "point in rect" helper. **Add it to `rect.ts`** in a small separate prep commit. See "Prep" below.
4. `packages/dirtytalk-spatial/src/pointer-router.ts` — current stub.
5. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-spatial/src/pointer-router.ts        (replace stub body)
packages/dirtytalk-spatial/src/pointer-router.test.ts   (create)
packages/dirtytalk-spatial/src/scene-root.ts            (fill in hitTest implementation)
packages/dirtytalk-spatial/src/rect.ts                  (add pointInRect helper)
packages/dirtytalk-spatial/src/rect.test.ts             (add pointInRect tests)
packages/dirtytalk-spatial/src/index.ts                 (barrel update)
```

This task touches more files than other Phase tasks because hit-testing crosses two existing files. Make **three** commits:

1. `feat(dirtytalk-spatial): add pointInRect helper` — `rect.ts` + `rect.test.ts`.
2. `feat(dirtytalk-spatial): implement SceneRoot.hitTest` — `scene-root.ts` only.
3. `feat(dirtytalk-spatial): implement PointerRouter` — `pointer-router.ts` + `pointer-router.test.ts` + `index.ts`.

Keeping them separate lets a reviewer see the geometry helper, the hitTest, and the dispatch logic as independent units.

**Do not touch:** `scene-node.ts`, `rect-space.ts`, `types.ts`, configs.

---

## Spec

### `pointInRect(x, y, r)` — extend `rect.ts`

```ts
export const pointInRect = (x: number, y: number, r: Rect): boolean =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
```

Half-open interval: `[x, x+w)` and `[y, y+h)`. Edge convention matches CSS pixel grids — `(0, 0)` is in `{0,0,1,1}`; `(1, 1)` is not.

Add tests: in-rect (4 cases incl. top-left, bottom-right interior, exact top-left corner, exact bottom-right corner-1px), out-of-rect (4 cases on each side), zero-area rect always returns `false`.

### `SceneRoot.hitTest(x, y)`

Walks the tree in **reverse paint order** (later-painted = on top). Returns the deepest hit:

```ts
hitTest(x: number, y: number): SceneNode | null {
  return hitTestNode(this, x, y);
}

const hitTestNode = (node: SceneNode, x: number, y: number): SceneNode | null => {
  // Walk children in reverse adoption order (top of paint = end of list).
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i];
    if (!pointInRect(x, y, child.bounds)) continue;
    const deeper = hitTestNode(child, x, y);
    if (deeper) return deeper;
    return child;          // child contains (x,y) but no grandchild does
  }
  return null;             // no child contains the point
};
```

**Returns `null` if no child contains the point** — the root itself is not a valid hit target. (Per spec, the root is a container; widgets are children.)

`hitTestNode` is a private module-level helper in `scene-root.ts`.

### `PointerRouter` class

```ts
import type { SceneRoot } from './scene-root';
import type { SceneNode } from './scene-node';

export interface SpatialPointerEvent {
  type: 'down' | 'move' | 'up' | 'cancel';
  x: number;
  y: number;
  buttons: number;
  pointerId: number;
}

export interface PointerHandler {
  onPointerDown?(e: SpatialPointerEvent): void;
  onPointerMove?(e: SpatialPointerEvent): void;
  onPointerUp?(e: SpatialPointerEvent): void;
  onPointerCancel?(e: SpatialPointerEvent): void;
}

export class PointerRouter {
  private _captured = new Map<number, SceneNode>();

  constructor(private readonly _root: SceneRoot) {}

  /** Dispatch an event to the appropriate node. Returns the receiving node, or null. */
  dispatch(e: SpatialPointerEvent): SceneNode | null {
    // Capture semantics: 'down' captures the hit node for the pointer.
    // Subsequent 'move'/'up'/'cancel' for that pointer go to the captured node,
    // even if the pointer drifts off its bounds.
    if (e.type === 'down') {
      const hit = this._root.hitTest(e.x, e.y);
      if (hit) {
        this._captured.set(e.pointerId, hit);
        this._invoke(hit, e);
      }
      return hit;
    }

    const captured = this._captured.get(e.pointerId);
    if (captured) {
      this._invoke(captured, e);
      if (e.type === 'up' || e.type === 'cancel') {
        this._captured.delete(e.pointerId);
      }
      return captured;
    }

    // Uncaptured move: route by current hit.
    if (e.type === 'move') {
      const hit = this._root.hitTest(e.x, e.y);
      if (hit) this._invoke(hit, e);
      return hit;
    }

    return null;
  }

  private _invoke(node: SceneNode, e: SpatialPointerEvent): void {
    const handler = node as Partial<PointerHandler>;
    switch (e.type) {
      case 'down': handler.onPointerDown?.(e); break;
      case 'move': handler.onPointerMove?.(e); break;
      case 'up': handler.onPointerUp?.(e); break;
      case 'cancel': handler.onPointerCancel?.(e); break;
    }
  }
}
```

### Notes

- **Capture on `down`, release on `up`/`cancel`.** Standard pointer-capture semantics; lets drags work correctly when the pointer drifts off the original hit target.
- **`PointerHandler` is structural.** Nodes implement it by adding methods; no inheritance required. Tests demonstrate.
- **`buttons` and `pointerId` carry through** but `PointerRouter` doesn't inspect them beyond `pointerId` for capture.
- **No mouse-leave events.** Out of scope for v1 — `pointermove` is enough; hover changes are widget-internal.

### Barrel update — `src/index.ts`

Append:

```ts
export { PointerRouter } from './pointer-router';
export type { SpatialPointerEvent, PointerHandler } from './pointer-router';
```

`pointInRect` is added to the rect helpers export list:

```ts
export {
  rectOverlaps,
  rectEquals,
  unionRects,
  rectClamp,
  pointInRect,
} from './rect';
```

---

## Tests — `src/pointer-router.test.ts`

```ts
class InteractiveNode extends SceneNode implements PointerHandler {
  events: SpatialPointerEvent[] = [];
  paint(_layer: unknown): void {}
  onPointerDown(e: SpatialPointerEvent) { this.events.push(e); }
  onPointerMove(e: SpatialPointerEvent) { this.events.push(e); }
  onPointerUp(e: SpatialPointerEvent) { this.events.push(e); }
  onPointerCancel(e: SpatialPointerEvent) { this.events.push(e); }
}
```

Required cases:

1. **`hitTest` returns null on empty root.**
2. **`hitTest` returns the only child when (x,y) is inside.**
3. **`hitTest` returns the topmost (later-adopted) child when two overlap.**
4. **`hitTest` returns null when (x,y) is outside all children.**
5. **`hitTest` descends into grandchildren.** A grandchild fully inside the child gets returned for points inside it.
6. **`dispatch('down')` captures the hit node for that `pointerId`.**
7. **`dispatch('move')` for a captured pointer goes to the captured node even when (x,y) is outside.**
8. **`dispatch('up')` for a captured pointer releases the capture.** Subsequent `down` re-captures.
9. **`dispatch('cancel')` releases capture.**
10. **Uncaptured `move` routes by current hit.** Without a prior `down`, a move with no captured pointer hits whatever's at (x,y).
11. **Uncaptured `up` is dropped** (returns null, no handler invoked).
12. **Multiple `pointerId`s are independent** — capturing pointer 1 doesn't affect pointer 2.
13. **A node without `onPointerDown` is hit-tested but receives no callback** (and `dispatch` still returns the node).
14. **Hit-test order respects adoption order** (last adopted = topmost).

---

## Cycle

1. **Check.**
   - `git status` clean.
   - `feat(dirtytalk-spatial): implement SceneRoot + render pipeline` in log.
   - `grep "not implemented" src/*.ts` — only `pointer-router.ts` and `scene-root.ts`'s `hitTest` should match.

2. **Implement, commit, repeat (three commits — see Owned files):**

   **Commit 1.** Add `pointInRect` to `rect.ts` + tests in `rect.test.ts`.
   - Verify: `vp run typecheck lint format:check test`.
   - Commit: `feat(dirtytalk-spatial): add pointInRect helper`.

   **Commit 2.** Implement `SceneRoot.hitTest` using `pointInRect`. No `pointer-router.ts` changes.
   - Add hitTest tests inline in `scene-root.test.ts` (extend the existing file). Reasonable scope: tests 1–5 above (the pure hit-test cases). Tests 6–14 land in commit 3.
   - Verify + test.
   - Commit: `feat(dirtytalk-spatial): implement SceneRoot.hitTest`.

   **Commit 3.** Implement `PointerRouter` + tests + barrel update.
   - Verify + test.
   - Commit: `feat(dirtytalk-spatial): implement PointerRouter`.

3. After all three commits: run the full suite from `packages/dirtytalk-spatial/`:
   - `vp run test`
   - `vp run build`
   - `vp run verify`

   Must all pass.

---

## Acceptance criteria

- [ ] `pointInRect` helper exported from `rect.ts`.
- [ ] `SceneRoot.hitTest(x, y)` returns the topmost containing descendant or `null`.
- [ ] `PointerRouter` exported with capture semantics on `down`.
- [ ] All 14 router test cases pass.
- [ ] All 9-or-so `pointInRect` cases pass.
- [ ] Hit-test tests in `scene-root.test.ts` (cases 1–5) pass.
- [ ] Barrel re-exports the new surface.
- [ ] `vp run {typecheck,lint,format:check,test,build,verify}` green.
- [ ] Three commits in the order specified.

---

## Pitfalls

- **`hitTest` walks children in *reverse* adoption order.** Painters paint front-to-back from index 0 → end; hit-test walks back-to-front so the topmost wins. Reverse the loop.
- **A grandchild outside a child's bounds is unreachable.** This is correct — bounds-clipping for hit-testing matches the visual occlusion model. If a child's bounds don't contain (x,y), recursion stops at that subtree.
- **Don't `return null` when the child contains (x,y) but no grandchild does.** Return the child itself — that's the hit. The implementation has it correctly; flag for code reviewers.
- **Capture on `down` is per-`pointerId`.** Multi-touch needs independent captures. Don't use a single `_captured: SceneNode | null` field.
- **Release capture on both `up` AND `cancel`.** Skipping `cancel` leaks; tests catch it.
- **Uncaptured `move` is not the same as no-handler.** A node that's hovered but not "pressed" still gets `onPointerMove` per spec § "Pointer routing" (`pointermove also routes; widgets that change on hover handle it via markDamaged`).
- **Uncaptured `up` is silently dropped.** Some libraries dispatch it to whatever's under the cursor; we don't — `up` without a prior `down` is ambiguous (synthetic events, replay, etc.), and silently dropping is safer than guessing.
- **Don't add `preventDefault`/`stopPropagation` shapes** to `SpatialPointerEvent`. The package is surface-agnostic; DOM event semantics belong in the consumer's adapter (the renderer that wires `canvas.addEventListener('pointerdown', e => router.dispatch(toSpatial(e)))`).
- **`InteractiveNode`** in tests is just `SceneNode` + handler methods on the same object. Don't introduce a separate `interface InteractiveSceneNode extends SceneNode` — the structural typing in `_invoke` makes it unnecessary.
- **Three commits, not one.** Don't squash. The reviewer wants to see the helper, the hit-test, and the dispatcher as separable.
- **Don't add a `attachToCanvas(canvas: HTMLCanvasElement)` method.** That couples the package to the DOM. The intended pattern is: consumer wires the DOM listener and calls `router.dispatch(toSpatial(e))`.
