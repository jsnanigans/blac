import type { SceneRoot } from './scene-root';
import type { SceneNode } from './scene-node';

/** A minimal pointer event shape, surface-agnostic (works with DOM PointerEvent and synthetic). */
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
  constructor(_root: SceneRoot) {
    throw new Error('PointerRouter: not implemented (Phase 4)');
  }

  dispatch(_e: SpatialPointerEvent): SceneNode | null {
    throw new Error('PointerRouter.dispatch: not implemented (Phase 4)');
  }
}
