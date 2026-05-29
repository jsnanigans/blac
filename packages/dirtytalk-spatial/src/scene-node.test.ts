import { describe, expect, it } from 'vite-plus/test';
import { SceneNode } from './scene-node';
import type { Damage, Rect } from './types';

class TestNode extends SceneNode {
  paint(_layer: unknown): void {}
  // expose protected helpers for tests
  pubMark(kind: 'paint' | 'layout' | 'data', rect?: Rect) {
    this.markDamaged(kind, rect);
  }
  pubBatch(fn: () => void) {
    this.batch(fn);
  }
}

class StubRoot extends SceneNode {
  paint(_layer: unknown): void {}
  damages: Damage[] = [];
  _emitDamage(d: Damage): void {
    this.damages.push(d);
  }
}

describe('SceneNode', () => {
  it('markDamaged with no root is a silent no-op', () => {
    const node = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    expect(() => node.pubMark('paint')).not.toThrow();
  });

  it('markDamaged emits to root via _emitDamage after adoptChild', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 1, y: 2, w: 3, h: 4 } });
    root.adoptChild(child);
    root.damages.length = 0; // ignore adopt-time paint
    child.pubMark('paint');
    expect(root.damages).toHaveLength(1);
    expect(root.damages[0].kind).toBe('paint');
    expect(root.damages[0].rect).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });

  it('markDamaged defaults to this.bounds when no rect passed', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 5, y: 6, w: 7, h: 8 } });
    root.adoptChild(child);
    root.damages.length = 0;
    child.pubMark('data');
    expect(root.damages[0].rect).toEqual({ x: 5, y: 6, w: 7, h: 8 });
  });

  it('setBounds with equal bounds is a no-op', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    root.adoptChild(child);
    root.damages.length = 0;
    child.setBounds({ x: 0, y: 0, w: 10, h: 10 });
    expect(root.damages).toHaveLength(0);
  });

  it('setBounds with new bounds emits two paint damages and one layout', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    root.adoptChild(child);
    root.damages.length = 0;
    child.setBounds({ x: 5, y: 5, w: 20, h: 20 });
    const paints = root.damages.filter((d) => d.kind === 'paint');
    const layouts = root.damages.filter((d) => d.kind === 'layout');
    expect(paints).toHaveLength(2);
    expect(layouts).toHaveLength(1);
    expect(paints[0].rect).toEqual({ x: 0, y: 0, w: 10, h: 10 });
    expect(paints[1].rect).toEqual({ x: 5, y: 5, w: 20, h: 20 });
  });

  it('setBounds on a root-less node does not emit but still mutates bounds', () => {
    const node = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    node.setBounds({ x: 1, y: 1, w: 2, h: 2 });
    expect(node.bounds).toEqual({ x: 1, y: 1, w: 2, h: 2 });
  });

  it('batch collects same-kind damages into one entry with a union rect', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    root.adoptChild(child);
    root.damages.length = 0;
    child.pubBatch(() => {
      child.pubMark('paint', { x: 0, y: 0, w: 5, h: 5 });
      child.pubMark('paint', { x: 10, y: 10, w: 5, h: 5 });
    });
    expect(root.damages).toHaveLength(1);
    expect(root.damages[0].kind).toBe('paint');
    expect(root.damages[0].rect).toEqual({ x: 0, y: 0, w: 15, h: 15 });
  });

  it('batch emits per-kind entries when multiple kinds present', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    root.adoptChild(child);
    root.damages.length = 0;
    child.pubBatch(() => {
      child.pubMark('paint', { x: 0, y: 0, w: 5, h: 5 });
      child.pubMark('data', { x: 0, y: 0, w: 5, h: 5 });
    });
    expect(root.damages).toHaveLength(2);
    expect(root.damages.map((d) => d.kind)).toEqual(['paint', 'data']);
  });

  it('nested batch — outer batch absorbs inner; only outer emits', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    root.adoptChild(child);
    root.damages.length = 0;
    child.pubBatch(() => {
      child.pubMark('paint', { x: 0, y: 0, w: 5, h: 5 });
      child.pubBatch(() => {
        child.pubMark('paint', { x: 10, y: 10, w: 5, h: 5 });
      });
    });
    expect(root.damages).toHaveLength(1);
    expect(root.damages[0].rect).toEqual({ x: 0, y: 0, w: 15, h: 15 });
  });

  it('adoptChild emits a paint for the child bounds when connected to a root', () => {
    // (a) directly onto a StubRoot — _root() resolves to the root itself.
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 2, y: 3, w: 4, h: 5 } });
    root.adoptChild(child);
    expect(root.damages).toHaveLength(1);
    expect(root.damages[0].kind).toBe('paint');
    expect(root.damages[0].rect).toEqual({ x: 2, y: 3, w: 4, h: 5 });

    // (b) onto an intermediate node that is itself attached to a root.
    const root2 = new StubRoot();
    const mid = new TestNode({ bounds: { x: 0, y: 0, w: 100, h: 100 } });
    root2.adoptChild(mid);
    root2.damages.length = 0;
    const leaf = new TestNode({ bounds: { x: 7, y: 8, w: 9, h: 10 } });
    mid.adoptChild(leaf);
    expect(root2.damages).toHaveLength(1);
    expect(root2.damages[0].kind).toBe('paint');
    expect(root2.damages[0].rect).toEqual({ x: 7, y: 8, w: 9, h: 10 });
  });

  it('removeChild emits a paint for the child prior bounds before clearing parent', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 1, y: 1, w: 2, h: 2 } });
    root.adoptChild(child);
    root.damages.length = 0;
    root.removeChild(child);
    expect(root.damages).toHaveLength(1);
    expect(root.damages[0].kind).toBe('paint');
    expect(root.damages[0].rect).toEqual({ x: 1, y: 1, w: 2, h: 2 });
    expect(child.parent).toBeNull();
  });

  it('clipsOverflow ancestor clips a descendant damage rect', () => {
    const root = new StubRoot();
    const clipper = new TestNode({
      bounds: { x: 0, y: 0, w: 10, h: 10 },
      clipsOverflow: true,
    });
    root.adoptChild(clipper);
    const child = new TestNode({ bounds: { x: 5, y: 5, w: 20, h: 20 } });
    clipper.adoptChild(child);
    root.damages.length = 0;
    child.pubMark('paint');
    // bounds {5,5,20,20} clamped to {0,0,10,10} -> {5,5,5,5}
    expect(root.damages[0].rect).toEqual({ x: 5, y: 5, w: 5, h: 5 });
  });

  it('multiple clipsOverflow ancestors clip cumulatively', () => {
    const root = new StubRoot();
    const outer = new TestNode({
      bounds: { x: 0, y: 0, w: 100, h: 100 },
      clipsOverflow: true,
    });
    root.adoptChild(outer);
    const inner = new TestNode({
      bounds: { x: 0, y: 0, w: 8, h: 8 },
      clipsOverflow: true,
    });
    outer.adoptChild(inner);
    const child = new TestNode({ bounds: { x: 5, y: 5, w: 50, h: 50 } });
    inner.adoptChild(child);
    root.damages.length = 0;
    child.pubMark('paint');
    // {5,5,50,50} clamped to {0,0,8,8} -> {5,5,3,3}, then clamped to {0,0,100,100} -> {5,5,3,3}
    expect(root.damages[0].rect).toEqual({ x: 5, y: 5, w: 3, h: 3 });
  });

  it('damage entry node field is the emitting node', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    root.adoptChild(child);
    root.damages.length = 0;
    child.pubMark('paint');
    expect(root.damages[0].node).toBe(child);
  });

  it('batch with an empty fn does not emit', () => {
    const root = new StubRoot();
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    root.adoptChild(child);
    root.damages.length = 0;
    child.pubBatch(() => {});
    expect(root.damages).toHaveLength(0);
  });
});
