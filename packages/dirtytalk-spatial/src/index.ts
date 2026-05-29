// @dirtytalk/spatial — public surface
export type { Rect, DamageKind, Damage, DirtyRegion } from './types';
export {
  rectOverlaps,
  rectEquals,
  unionRects,
  rectClamp,
  pointInRect,
} from './rect';
export { RectSpace } from './rect-space';
export { SceneNode } from './scene-node';
export type { SceneNodeOptions } from './scene-node';
export { SceneRoot } from './scene-root';
export type { Renderer2D, SceneRootOptions, FrameTiming } from './scene-root';
export { PointerRouter } from './pointer-router';
export type { SpatialPointerEvent, PointerHandler } from './pointer-router';
