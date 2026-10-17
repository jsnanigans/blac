import { rectClamp, rectEquals, unionRects } from './rect';
import type { Rect, DamageKind, Damage } from './types';

export interface SceneNodeOptions {
  bounds?: Rect;
  clipsOverflow?: boolean;
}

interface SceneRootLike extends SceneNode {
  _emitDamage(damage: Damage): void;
}

const isSceneRoot = (n: SceneNode): n is SceneRootLike =>
  typeof (n as { _emitDamage?: unknown })._emitDamage === 'function';

/**
 * A scene-graph node. Owns its bounds and contributes damage to the root
 * channel via the parent chain.
 */
export abstract class SceneNode {
  bounds: Rect;
  parent: SceneNode | null = null;
  children: SceneNode[] = [];

  /** When true, descendants' damage is clipped to this node's bounds. */
  clipsOverflow: boolean;

  /** When non-null, a batch is in flight — markDamaged accumulates here. */
  private _batchBuffer: Damage[] | null = null;

  constructor(options: SceneNodeOptions = {}) {
    this.bounds = options.bounds ?? { x: 0, y: 0, w: 0, h: 0 };
    this.clipsOverflow = options.clipsOverflow ?? false;
  }

  /** Subclasses paint themselves into the renderer. */
  abstract paint(layer: unknown): void;

  /** Optional: nodes that own a data pipeline (e.g., plot mark layers). */
  rebuildData?(): void;

  /** Optional: nodes that own layout. */
  doLayout?(): void;

  // ---- damage ----

  protected markDamaged(kind: DamageKind, rect?: Rect): void {
    this._damage(kind, rect ?? this.bounds, this);
  }

  /**
   * Run `fn` with this node's damage buffered, then emit one entry per kind
   * with the union rect. Damage is emitted even when `fn` throws, so the
   * mutations it made before throwing still repaint.
   */
  protected batch(fn: () => void): void {
    if (this._batchBuffer !== null) {
      fn(); // nested batch — outer batch absorbs everything
      return;
    }
    const buffer: Damage[] = [];
    this._batchBuffer = buffer;
    try {
      fn();
    } finally {
      this._batchBuffer = null;
      if (buffer.length > 0) this._emitBatchedDamage(buffer);
    }
  }

  private _emitBatchedDamage(buffer: Damage[]): void {
    const root = this._root();
    if (!root) return;
    // One entry per kind, in order of first appearance.
    const kinds: DamageKind[] = [];
    for (const d of buffer) if (!kinds.includes(d.kind)) kinds.push(d.kind);
    for (const kind of kinds) {
      const rects: Rect[] = [];
      for (const d of buffer) if (d.kind === kind) rects.push(d.rect);
      const rect = rects.length === 1 ? rects[0] : unionRects(rects);
      root._emitDamage({ rect, kind, node: this });
    }
  }

  // ---- structure ----

  setBounds(next: Rect): void {
    if (rectEquals(this.bounds, next)) return;
    const prev = this.bounds;
    this.markDamaged('paint', prev); // erase old footprint
    this.bounds = next;
    this.markDamaged('paint', next); // fill new footprint
    if (this.parent) this._damage('layout', next, this.parent); // re-layout parent
  }

  adoptChild(child: SceneNode): void {
    let n = this.parent;
    while (n !== null && n !== child) n = n.parent;
    if (child === this || n === child) {
      throw new Error(
        'SceneNode.adoptChild: a node cannot adopt itself or an ancestor',
      );
    }
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    this.children.push(child);
    // Per spec § Decision 6: on attach, emit a single full-bounds 'paint' so the
    // newly-visible region is painted.
    child.markDamaged('paint', child.bounds);
  }

  removeChild(child: SceneNode): void {
    const i = this.children.indexOf(child);
    if (i < 0) return;
    this.children.splice(i, 1);
    // Damage the area the removed child occupied so the parent can repaint.
    child.markDamaged('paint', child.bounds);
    child.parent = null;
  }

  // ---- internals ----

  // One walk up the parent chain both clips `rect` by every clipping ancestor
  // and finds the root.
  private _damage(kind: DamageKind, rect: Rect, node: SceneNode): void {
    let clipped = rect;
    let root: SceneRootLike | null = isSceneRoot(this) ? this : null;
    for (let n = this.parent; n !== null && root === null; n = n.parent) {
      if (n.clipsOverflow) clipped = rectClamp(clipped, n.bounds);
      if (isSceneRoot(n)) root = n;
    }
    const damage: Damage = { rect: clipped, kind, node };
    if (this._batchBuffer !== null) {
      this._batchBuffer.push(damage);
      return;
    }
    root?._emitDamage(damage);
  }

  private _root(): SceneRootLike | null {
    // Start at `this`, not `this.parent` — a node that is itself a root must
    // resolve to itself, otherwise SceneRoot.adoptChild can't emit the
    // adopt-time paint for its own direct children.
    if (isSceneRoot(this)) return this;
    for (let n = this.parent; n; n = n.parent) {
      if (isSceneRoot(n)) return n;
    }
    return null;
  }
}
