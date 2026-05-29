import { SceneNode } from './scene-node';
import type { DirtyRegion, Rect } from './types';
import type { DirtyChannel, Scheduler } from '@dirtytalk/engine';

/**
 * Renderer interface: the spatial package ships this contract, not an implementation.
 * `paintRegion` is the bounding rect of the frame's paint damages (Phase 3 computes
 * it via `unionRects`). Keep this signature stable from scaffold onward so the
 * Phase 1 README examples don't drift from the Phase 3 implementation.
 */
export interface Renderer2D {
  beginFrame(paintRegion: Rect): void;
  endFrame(): void;
}

export interface SceneRootOptions {
  scheduler?: Scheduler;
}

export class SceneRoot extends SceneNode {
  paint(_layer: unknown): void {
    throw new Error('SceneRoot.paint: not implemented (Phase 3)');
  }

  constructor(_renderer: Renderer2D, _options?: SceneRootOptions) {
    super();
    throw new Error('SceneRoot: not implemented (Phase 3)');
  }

  get channel(): DirtyChannel<DirtyRegion> {
    throw new Error('SceneRoot.channel: not implemented (Phase 3)');
  }

  hitTest(_x: number, _y: number): SceneNode | null {
    throw new Error('SceneRoot.hitTest: not implemented (Phase 3)');
  }
}
