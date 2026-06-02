# 02 — `SceneNode` base class

**Phase:** 2 (sequential — runs after **all** Phase 1 commits land)
**Model:** Opus 4.7
**Effort:** high (bounds-setter discipline, parent chain walking, clip stack, `batch` deferring marks)
**Estimated touch:** 2 files

---

## Goal

Implement `SceneNode` — the abstract base class for anything that paints. It owns its bounds, contributes damage to the root channel when mutated, and provides the `batch` / `setBounds` / `markDamaged` / `adoptChild` primitives consumed by widget subclasses.

`SceneNode` doesn't know about the channel directly; it walks the node-and-ancestors chain to a `SceneRoot` and calls the root's `_emitDamage(...)`. The root holds the channel; Phase 3 wires it.

> **`_root()` includes `this`.** The walk starts at `this`, not `this.parent`, so a node that is itself a root resolves to itself. This is what makes `SceneRoot.adoptChild(widget)` emit the adopt-time `paint` for a _direct_ child of the root — if `_root()` only walked `this.parent`, the root's own `_root()` would be `null` and direct children would never get their first paint (and, since v1 is fully damage-driven with no forced initial render, a static scene attached only to the root would never draw a frame at all).

---

## Inputs — read these first

1. `dirtytalk/02-insomni.md` § "`SceneNode`", § "Bounds tracking", § "Decisions" #2 (double-emission is allowed), #3 (clip rects), #6 (off-screen / not-yet-attached).
2. `packages/dirtytalk-spatial/src/rect.ts` — geometry helpers (assume Phase 1 landed).
3. `packages/dirtytalk-spatial/src/types.ts` — `Rect`, `DamageKind`, `Damage`.
4. `packages/dirtytalk-spatial/src/scene-node.ts` — current stub.
5. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-spatial/src/scene-node.ts        (replace stub body)
packages/dirtytalk-spatial/src/scene-node.test.ts   (create)
```

**Do not touch:** `rect.ts`, `rect-space.ts`, `scene-root.ts`, `pointer-router.ts`, barrels, configs.

Verify before starting: `grep "not implemented" src/rect.ts src/rect-space.ts` returns empty. If not, Phase 1 isn't done — **stop and report**.

---

## Spec

### Class shape

```ts
import { rectClamp, rectEquals, unionRects } from './rect';
import type { Rect, DamageKind, Damage } from './types';

export interface SceneNodeOptions {
  bounds?: Rect;
  clipsOverflow?: boolean;
}

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

  protected markDamaged(kind: DamageKind, rect?: Rect): void { … }
  protected batch(fn: () => void): void { … }

  // ---- structure ----

  setBounds(next: Rect): void { … }
  adoptChild(child: SceneNode): void { … }
  removeChild(child: SceneNode): void { … }

  // ---- internals ----

  private _root(): SceneRootLike | null { … }
  private _clipRect(r: Rect): Rect { … }
}
```

### `markDamaged(kind, rect?)`

1. Compute the effective rect: `rect ?? this.bounds`.
2. Apply the clip stack: walk ancestors; for each with `clipsOverflow === true`, intersect with that ancestor's `bounds` using `rectClamp`. Stop walking if the result becomes zero-area (still emit — the renderer will no-op).
3. Construct `damage: Damage = { rect: clipped, kind, node: this }`.
4. If a batch is in flight (`_batchBuffer !== null`), push into the buffer; otherwise emit to the root.
5. **No emit if there's no root.** A detached node silently no-ops (per spec § Decision 6).

### `_root()` walking

```ts
private _root(): SceneRootLike | null {
  // Start at `this`, not `this.parent` — a node that is itself a root must
  // resolve to itself, otherwise SceneRoot.adoptChild can't emit the
  // adopt-time paint for its own direct children.
  let n: SceneNode | null = this;
  while (n) {
    if (isSceneRoot(n)) return n;
    n = n.parent;
  }
  return null;
}
```

`isSceneRoot` is a structural check: `'_emitDamage' in n && typeof (n as SceneRootLike)._emitDamage === 'function'`. The `SceneRootLike` interface is a minimal local type to avoid importing `scene-root.ts` (which extends `SceneNode` — would cause a circular import that needlessly grows the bundle).

```ts
interface SceneRootLike extends SceneNode {
  _emitDamage(damage: Damage): void;
}
const isSceneRoot = (n: SceneNode): n is SceneRootLike =>
  typeof (n as { _emitDamage?: unknown })._emitDamage === 'function';
```

Note: `_emitDamage` is a "package-private" method by convention. The leading underscore signals "do not call from user code" without using TS's `private` keyword (which would block the structural check above).

### `batch(fn)`

```ts
protected batch(fn: () => void): void {
  if (this._batchBuffer !== null) {
    fn();              // nested batch — outer batch absorbs everything
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
  // Emit a single union damage entry per kind.
  this._emitBatchedDamage(buffer);
}

private _emitBatchedDamage(buffer: Damage[]): void {
  const root = this._root();
  if (!root) return;
  // Group by kind; union rects per kind.
  const byKind = new Map<DamageKind, Damage[]>();
  for (const d of buffer) {
    const arr = byKind.get(d.kind) ?? [];
    arr.push(d);
    byKind.set(d.kind, arr);
  }
  for (const [kind, arr] of byKind) {
    const rect = arr.length === 1 ? arr[0].rect : unionRects(arr.map((d) => d.rect));
    root._emitDamage({ rect, kind, node: this });
  }
}
```

`unionRects` is imported from `./rect` in the top import block. The batch unions same-kind damages into one entry (smaller list for the renderer). Across-kind damages stay separate because the pipeline cares about kind.

### `setBounds(next)`

Per spec § "Bounds tracking":

```ts
setBounds(next: Rect): void {
  if (rectEquals(this.bounds, next)) return;
  const prev = this.bounds;
  this.markDamaged('paint', prev);            // erase old footprint
  this.bounds = next;
  this.markDamaged('paint', next);            // fill new footprint
  if (this.parent) this.markDamaged('layout'); // re-layout parent
}
```

Order matters: prev rect before assignment, new rect after.

### `adoptChild` / `removeChild`

```ts
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
```

Order in `removeChild`: emit damage **before** clearing `parent`, so the damage walks the parent chain successfully. After clearing, the next `markDamaged` on this orphan would no-op.

### Clip stack

`_clipRect(r)` walks ancestors with `clipsOverflow === true` and intersects:

```ts
private _clipRect(r: Rect): Rect {
  let clipped = r;
  let n: SceneNode | null = this.parent;
  while (n) {
    if (n.clipsOverflow) clipped = rectClamp(clipped, n.bounds);
    n = n.parent;
  }
  return clipped;
}
```

Cheap to call per `markDamaged`. The depth of typical scenes is shallow (≤10).

---

## Tests — `src/scene-node.test.ts`

Use a concrete subclass to test:

```ts
import { describe, expect, it, vi } from 'vite-plus/test';
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
```

Required cases:

1. **`markDamaged` with no root** is a silent no-op (detached node).
2. **`markDamaged` emits to root** via `_emitDamage` after `adoptChild`.
3. **`markDamaged` defaults to `this.bounds`** when no rect passed.
4. **`setBounds` with equal bounds** is a no-op.
5. **`setBounds` with new bounds emits two `paint` damages** (prev + next) and one `layout` damage (because parent exists).
6. **`setBounds` on a root-less node** doesn't emit (but still mutates `this.bounds`).
7. **`batch` collects same-kind damages into one entry** with a union rect.
8. **`batch` emits per-kind entries** when multiple kinds present.
9. **Nested `batch`** — outer batch absorbs inner; only outer emits.
10. **`adoptChild` emits a `paint` for the child's bounds** when the parent is connected to a root. Cover both shapes: (a) adopting directly onto a `StubRoot` (`root.adoptChild(child)` — `_root()` resolves to the root _itself_, so the emit fires), and (b) adopting onto an intermediate node that is itself attached to a root.
11. **`removeChild` emits a `paint` for the child's prior bounds** before clearing parent.
12. **`clipsOverflow` ancestor clips a descendant's damage rect.**
13. **Multiple `clipsOverflow` ancestors clip cumulatively.**
14. **Damage entry's `node` field is the emitting node.**
15. **`batch` with an empty fn doesn't emit.**

---

## Cycle

1. **Check.**
   - `git status` clean.
   - Phase 0 + all 3 Phase 1 commits in log.
   - `grep "not implemented" src/rect.ts src/rect-space.ts` returns empty.

2. **Implement.** ~150 lines.

3. **Verify.** `vp run typecheck`, `vp run lint`, `vp run format:check`.

4. **Test.**
   - `vp run test src/scene-node.test.ts` — all 15 pass.
   - `vp run test` — full suite green.

5. **Commit.**

   ```
   feat(dirtytalk-spatial): implement SceneNode base class
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] `SceneNode` abstract class exported with the spec'd surface.
- [ ] All 15 tests pass.
- [ ] Detached nodes silently no-op on `markDamaged`.
- [ ] `setBounds` emits prev+next paint and layout.
- [ ] `batch` unions same-kind damages.
- [ ] Clip stack walks all `clipsOverflow` ancestors.
- [ ] `vp run {typecheck,lint,format:check,test}` green.
- [ ] No changes outside owned write set.

---

## Pitfalls

- **`_root()` must start the walk at `this`, not `this.parent`.** If it starts at the parent, `SceneRoot`'s own `_root()` returns `null` and `adoptChild` skips the adopt-time paint for every direct child of the root — meaning a static scene attached only to the root never produces damage and never draws a first frame. Starting at `this` is behaviorally identical for non-root nodes (`isSceneRoot(this)` is false, so it immediately advances to the parent).
- **`_emitDamage` is a structural-typing contract,** not a class hierarchy contract. Don't import `SceneRoot` into this file — that's a circular import the bundler has to chase. Use the local `SceneRootLike` interface + duck-typing check.
- **`adoptChild` must remove from prior parent first.** Forgetting causes the node to appear in two children arrays — silent corruption. The spec implies it; make the implementation explicit.
- **`removeChild` order: emit damage first, then clear `parent`.** Cleared parent means `markDamaged` no-ops, so the erase damage is lost. Tests catch this.
- **`setBounds` order: erase damage uses prev rect, then assignment, then fill damage uses new rect.** Reversed order causes the erase damage to use the new rect (wrong).
- **Clip applies to _descendant_ damage, not own damage.** A node with `clipsOverflow: true` doesn't clip its own `markDamaged`-without-rect emit; it clips children's emits. The walk starts at `this.parent`, not `this` — get that wrong and the node clips itself out of existence.
- **`batch` must clear `_batchBuffer` in `finally`.** Otherwise an exception inside `fn` leaves the buffer stuck and subsequent marks are absorbed indefinitely. Tests don't cover this case; the `finally` is the safety net.
- **Nested batch handling: inner is absorbed into outer.** Don't try to flush per inner-end — that breaks the "one logical action, one damage" semantic.
- **Don't expose `_emitDamage` publicly.** It's package-private by underscore-convention. User code should call `markDamaged`. Phase 3's `SceneRoot` declares `_emitDamage` so this base class can find it via structural check.
- **Don't `Object.freeze` damage entries.** `freeze` has runtime cost and the engine treats damages as readonly by convention. Same call site discipline as the `union` short-circuit in `RectSpace`.
- **Don't add `removeFromParent()` convenience method on `SceneNode`.** Out of scope. The parent owns child management. If common, add later.
- **Don't compute `unionRects` from `[]` in `_emitBatchedDamage`.** The `arr.length === 1` short-circuit prevents that; verify your code path.
- **Watch the iteration order of `byKind`.** `Map` preserves insertion order, so the emitted damages come out in the order kinds were first encountered. Deterministic, but if a test asserts order, document the expectation.
