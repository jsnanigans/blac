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
      case 'down':
        handler.onPointerDown?.(e);
        break;
      case 'move':
        handler.onPointerMove?.(e);
        break;
      case 'up':
        handler.onPointerUp?.(e);
        break;
      case 'cancel':
        handler.onPointerCancel?.(e);
        break;
    }
  }
}
