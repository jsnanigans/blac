# 03 — `SceneRoot` + render pipeline

**Phase:** 3 (sequential — runs after Phase 2 commit lands)
**Model:** Sonnet 4.6
**Effort:** medium (channel ownership, scheduler injection, render pipeline stages)
**Estimated touch:** 3 files (impl + tests + barrel update)

---

## Goal

Implement `SceneRoot` — the concrete root of the scene tree. It owns the `DirtyChannel<DirtyRegion>`, the `Renderer2D`, and the per-frame render pipeline (`data` → `layout` → `paint`).

Also formalises the `Renderer2D` interface so the package can ship without depending on a concrete (WebGPU or Canvas2D) renderer.

---

## Inputs — read these first

1. `dirtytalk/02-insomni.md` § "`SceneNode`" (the `SceneRoot` section at the end), § "Plot integration" (illustrates how mark layers and viewport signals use the root).
2. `packages/dirtytalk-engine/src/dirty-channel.ts`, `src/scheduler.ts` — engine surface.
3. `packages/dirtytalk-spatial/src/scene-node.ts` — base class + `_emitDamage` contract.
4. `packages/dirtytalk-spatial/src/rect-space.ts`, `src/rect.ts`, `src/types.ts`.
5. `packages/dirtytalk-spatial/src/scene-root.ts` — current stub.
6. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-spatial/src/scene-root.ts        (replace stub body)
packages/dirtytalk-spatial/src/scene-root.test.ts   (create)
packages/dirtytalk-spatial/src/index.ts             (barrel update)
```

**Do not touch:** `scene-node.ts`, `rect.ts`, `rect-space.ts`, `pointer-router.ts`, `types.ts`, configs.

Verify before starting: `grep "not implemented" src/scene-node.ts` returns empty. If not, **stop and report**.

---

## Spec

### `Renderer2D` interface

The package ships the contract; consumers (insomni, custom renderers) implement.

```ts
export interface Renderer2D {
  /**
   * Begin a frame, clipped/scissored to the given paint region.
   * v1 implementations may ignore the region and clear the whole canvas.
   */
  beginFrame(paintRegion: Rect): void;
  endFrame(): void;
}
```

`paintRegion` is the *bounding rect* of the frame's paint damages (computed via `unionRects`). Renderers that don't yet implement scissor/tile dispatch can ignore the region; the API is stable for the v2 partial-redraw transition.

### `SceneRootOptions`

```ts
import { RAFScheduler } from '@dirtytalk/engine';
import type { Scheduler } from '@dirtytalk/engine';

export interface SceneRootOptions {
  /** Default: `new RAFScheduler()`. Tests should pass `SyncScheduler` or `ManualScheduler`. */
  scheduler?: Scheduler;

  /** Bounds of the root (used as the default interest region). */
  bounds?: Rect;
}
```

### `SceneRoot` class

```ts
import { DirtyChannel, RAFScheduler } from '@dirtytalk/engine';
import { SceneNode } from './scene-node';
import { RectSpace } from './rect-space';
import { unionRects } from './rect';
import type { Damage, DirtyRegion, Rect } from './types';

export class SceneRoot extends SceneNode {
  readonly channel: DirtyChannel<DirtyRegion>;
  readonly renderer: Renderer2D;

  constructor(renderer: Renderer2D, options: SceneRootOptions = {}) {
    super({ bounds: options.bounds });
    this.renderer = renderer;
    this.channel = new DirtyChannel(
      RectSpace,
      options.scheduler ?? new RAFScheduler(),
    );

    // Subscribe with "interest = whole root bounds" so any damage triggers a flush callback.
    // We use a thunk that re-evaluates bounds in case the root is resized.
    this.channel.subscribe(
      () => [{ rect: this.bounds, kind: 'paint' as const }],
      (dirty) => this._renderFrame(dirty),
    );
  }

  paint(_layer: unknown): void {
    // The root itself doesn't paint; it's a container.
    // Walk children in adoptChild order.
    for (const child of this.children) {
      child.paint(_layer);
    }
  }

  /** Package-private — called by SceneNode.markDamaged via the structural-type contract. */
  _emitDamage(damage: Damage): void {
    this.channel.mark([damage]);
  }

  hitTest(_x: number, _y: number): SceneNode | null {
    throw new Error('SceneRoot.hitTest: implemented in Phase 4');
  }

  private _renderFrame(dirty: DirtyRegion): void {
    // Stage 1 — data
    for (const d of dirty) {
      const node = d.node as SceneNode | undefined;
      if (d.kind === 'data' && node?.rebuildData) node.rebuildData();
    }
    // Stage 2 — layout (also runs for 'data' since data implies layout)
    for (const d of dirty) {
      const node = d.node as SceneNode | undefined;
      if (d.kind !== 'paint' && node?.doLayout) node.doLayout();
    }
    // Stage 3 — paint
    const paintRegion =
      dirty.length === 1 ? dirty[0].rect : unionRects(dirty.map((d) => d.rect));
    this.renderer.beginFrame(paintRegion);
    this.paint(undefined);
    this.renderer.endFrame();
  }
}
```

### Notes

- **Subscription interest:** uses the root's bounds as a lazy thunk so any damage in the canvas region triggers the subscriber callback. The render pipeline then walks `dirty` to decide which stages to invoke.
- **`paint(_layer)` walks `children`** in insertion order (z-order). v1 doesn't reorder by damage — the spec § Decision 1 explicitly defers z-ordering to v2.
- **`hitTest` stub** until Phase 4 fills it. Phase 3 leaves the throw so Phase 4 has a clear seam to fill.
- **`_renderFrame` is called once per flush.** With `RAFScheduler` that's once per frame, with `SyncScheduler` once per `mark`.
- **No `dispose()` method** — Phase 5 integration may add one if needed; defer.

### Barrel update — `src/index.ts`

```ts
export type { Rect, DamageKind, Damage, DirtyRegion } from './types';
export {
  rectOverlaps,
  rectEquals,
  unionRects,
  rectClamp,
} from './rect';
export { RectSpace } from './rect-space';
export { SceneNode } from './scene-node';
export type { SceneNodeOptions } from './scene-node';
export { SceneRoot } from './scene-root';
export type { Renderer2D, SceneRootOptions } from './scene-root';
```

`PointerRouter` is added in Phase 4.

---

## Tests — `src/scene-root.test.ts`

Use `SyncScheduler` so writes flush immediately.

```ts
import { describe, expect, it, vi } from 'vite-plus/test';
import { SyncScheduler } from '@dirtytalk/engine';
import { SceneNode } from './scene-node';
import { SceneRoot } from './scene-root';
import type { Renderer2D, Rect, DamageKind } from './types';

const makeRenderer = (): Renderer2D & { calls: Array<['begin' | 'end', Rect?]> } => {
  const calls: Array<['begin' | 'end', Rect?]> = [];
  return {
    calls,
    beginFrame(r) {
      calls.push(['begin', r]);
    },
    endFrame() {
      calls.push(['end']);
    },
  };
};

class TestNode extends SceneNode {
  paintCalls = 0;
  paint(_layer: unknown): void {
    this.paintCalls++;
  }
}
```

Required cases:

1. **Construction wires the channel** with `RectSpace` + provided scheduler.
2. **A child's `markDamaged` reaches the renderer.** Adopt a `TestNode` (with `bounds`), call its public mark; `renderer.beginFrame` runs with the bounds rect.
3. **`endFrame` runs after `beginFrame`** in order.
4. **Single damage entry's bounding region equals its rect.**
5. **Multiple damage entries' bounding region equals `unionRects([...])`.**
6. **Detached node mutation doesn't reach the renderer.**
7. **`paint(_layer)` walks children in adoption order.** Adopt three nodes; verify their paint methods called in the right order.
8. **`data`-kind damage triggers `rebuildData` first**, then `doLayout`, then paint. Use a node with both hooks plus a spy ordering vector.
9. **`layout`-kind damage skips `rebuildData`** but runs `doLayout`.
10. **`paint`-kind damage runs neither `rebuildData` nor `doLayout`.**
11. **Mixed-kind damages** run the right stages for each entry.
12. **Multiple synchronous marks via `SyncScheduler`** produce one frame per mark (not coalesced — Sync flushes per mark).
13. **`hitTest` throws "implemented in Phase 4"** for now. (Sanity check that the stub is exposed; Phase 4 replaces.)

---

## Cycle

1. **Check.**
   - `git status` clean.
   - `feat(dirtytalk-spatial): implement SceneNode base class` in log.
   - `grep "not implemented" src/scene-node.ts src/rect.ts src/rect-space.ts` returns empty.

2. **Implement.** ~100 lines for `scene-root.ts`. Update the barrel last.

3. **Verify.** `vp run typecheck`, `vp run lint`, `vp run format:check`.

4. **Test.**
   - `vp run test src/scene-root.test.ts` — all pass.
   - `vp run test` — full suite green.

5. **Commit.**

   ```
   feat(dirtytalk-spatial): implement SceneRoot + render pipeline
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] `SceneRoot` exported, extends `SceneNode`, owns the channel.
- [ ] `Renderer2D` interface exported.
- [ ] All 13 test cases pass.
- [ ] Render pipeline runs `data → layout → paint` in correct order.
- [ ] Barrel re-exports the new surface.
- [ ] `vp run {typecheck,lint,format:check,test,build}` green.
- [ ] No changes outside owned write set.

---

## Pitfalls

- **Subscription interest is a thunk, not a snapshot.** If you capture `this.bounds` once at subscribe time, root resizes don't update the interest. The thunk `() => [{ rect: this.bounds, kind: 'paint' }]` is mandatory.
- **`_emitDamage(damage)` takes a single `Damage`, not an array.** The `SceneNode` base class emits per call; the channel-level array wrapping (`[damage]`) happens here. Don't change the contract on the base class.
- **`paintRegion` for a single-entry dirty list reuses the entry's rect.** Don't run `unionRects([single])` — wasteful allocation. The conditional is in the implementation; keep it.
- **`paint(undefined)` for v1's layer arg.** The `Layer` concept is GPU-renderer-specific and out of scope. Pass `undefined`; subclasses ignore.
- **Don't call `_renderFrame` outside the channel callback.** The channel handles re-entrancy + error isolation; bypassing it loses both.
- **Don't memoise `dirty.map((d) => d.rect)`.** Cheap allocation in the cold-ish frame path; engine-level coalescing keeps the call rate at ≤60 Hz under load.
- **`children` order = adoption order, also paint order.** Don't sort. z-ordering changes are deferred to v2 per spec § Decision 1.
- **`hitTest` throws — don't try to implement here.** Phase 4 has it; you keep the stub so the public surface name is reserved.
- **Don't subscribe with `interest: () => allRects` and expect coalescing.** The engine doesn't dedupe by interest identity; subscribing once with a stable thunk is the contract.
