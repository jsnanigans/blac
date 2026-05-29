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
    const clipped = this._clipRect(rect ?? this.bounds);
    const damage: Damage = { rect: clipped, kind, node: this };
    if (this._batchBuffer !== null) {
      this._batchBuffer.push(damage);
      return;
    }
    const root = this._root();
    if (!root) return;
    root._emitDamage(damage);
  }

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
    }
    if (buffer.length === 0) return;
    this._emitBatchedDamage(buffer);
  }

  private _emitBatchedDamage(buffer: Damage[]): void {
    const root = this._root();
    if (!root) return;
    const byKind = new Map<DamageKind, Damage[]>();
    for (const d of buffer) {
      const arr = byKind.get(d.kind) ?? [];
      arr.push(d);
      byKind.set(d.kind, arr);
    }
    for (const [kind, arr] of byKind) {
      const rect =
        arr.length === 1 ? arr[0].rect : unionRects(arr.map((d) => d.rect));
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
    if (this.parent) this.markDamaged('layout'); // re-layout parent
  }

  adoptChild(child: SceneNode): void {
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    this.children.push(child);
    // Per spec § Decision 6: on attach, emit a single full-bounds 'paint' so the
    // newly-visible region is painted.
    if (this._root()) child.markDamaged('paint', child.bounds);
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

  private _root(): SceneRootLike | null {
    // Start at `this`, not `this.parent` — a node that is itself a root must
    // resolve to itself, otherwise SceneRoot.adoptChild can't emit the
    // adopt-time paint for its own direct children.
    if (isSceneRoot(this)) return this;
    let n: SceneNode | null = this.parent;
    while (n) {
      if (isSceneRoot(n)) return n;
      n = n.parent;
    }
    return null;
  }

  private _clipRect(r: Rect): Rect {
    let clipped = r;
    let n: SceneNode | null = this.parent;
    while (n) {
      if (n.clipsOverflow) clipped = rectClamp(clipped, n.bounds);
      n = n.parent;
    }
    return clipped;
  }
}
