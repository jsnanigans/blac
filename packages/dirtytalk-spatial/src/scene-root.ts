import { DirtyChannel, RAFScheduler } from '@dirtytalk/engine';
import type { Scheduler } from '@dirtytalk/engine';
import { SceneNode } from './scene-node';
import { RectSpace } from './rect-space';
import { unionRects } from './rect';
import type { Damage, DirtyRegion, Rect } from './types';

/**
 * Renderer interface: the spatial package ships this contract, not an implementation.
 * `paintRegion` is the bounding rect of the frame's paint damages (computed via
 * `unionRects`). Renderers that don't yet implement scissor/tile dispatch can ignore
 * the region; the API is stable for the v2 partial-redraw transition.
 */
export interface Renderer2D {
  /**
   * Begin a frame, clipped/scissored to the given paint region.
   * v1 implementations may ignore the region and clear the whole canvas.
   */
  beginFrame(paintRegion: Rect): void;
  endFrame(): void;
}

export interface SceneRootOptions {
  /** Default: `new RAFScheduler()`. Tests should pass `SyncScheduler` or `ManualScheduler`. */
  scheduler?: Scheduler;

  /** Bounds of the root (used as the default interest region). */
  bounds?: Rect;
}

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
    // Walk children in adoption order.
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
