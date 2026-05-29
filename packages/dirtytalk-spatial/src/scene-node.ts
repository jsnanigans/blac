import type { Rect, DamageKind } from './types';

export abstract class SceneNode {
  bounds: Rect = { x: 0, y: 0, w: 0, h: 0 };
  parent: SceneNode | null = null;
  clipsOverflow = false;

  abstract paint(layer: unknown): void;

  rebuildData?(): void;
  doLayout?(): void;

  protected markDamaged(_kind: DamageKind, _rect?: Rect): void {
    throw new Error('SceneNode.markDamaged: not implemented (Phase 2)');
  }
  protected batch(_fn: () => void): void {
    throw new Error('SceneNode.batch: not implemented (Phase 2)');
  }

  setBounds(_next: Rect): void {
    throw new Error('SceneNode.setBounds: not implemented (Phase 2)');
  }

  adoptChild(_node: SceneNode): void {
    throw new Error('SceneNode.adoptChild: not implemented (Phase 2)');
  }
}
