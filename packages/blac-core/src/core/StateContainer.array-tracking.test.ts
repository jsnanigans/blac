/**
 * Array-tracking isolation tests.
 *
 * These tests document the DESIRED behavior: per-index re-render isolation for
 * array state. They currently FAIL because:
 *
 *   - `patch()` treats arrays as atomic leaves and marks an ancestor-watch for
 *     the whole array (e.g. "\0a:items"). A consumer that tracked
 *     `items[0].title` has that ancestor-watch in its expanded interest, so it
 *     wakes on ANY array mutation — not just the specific index it reads.
 *
 *   - There is no way to `patch()` individual array indices today (the
 *     `DeepPartial<S>` type and `changedPathsFromPatch` both treat arrays as
 *     atomic). Fine-grained array mutations require `emit()` with a new array
 *     reference, which IS correctly isolated via `diffAlongSkeleton`. Tests that
 *     use `emit()` serve as the baseline to confirm the diff logic is correct,
 *     while `patch()`-based tests capture the unsupported scenario.
 *
 * Run with: vp run test packages/blac-core/src/core/StateContainer.array-tracking.test.ts
 */

import { describe, it, expect, vi } from 'vite-plus/test';
import { blacTestSetup, flush } from '@blac/core/testing';
import { trackRender, type PathSet } from '@dirtytalk/structural';
import { Cubit } from './Cubit';
import type { PathInterner } from '@dirtytalk/structural';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Item = { title: string; done: boolean };
type TodoState = { items: Item[] };

// 4×4 matrix where cell[r][c] = r*10 + c  (initial values 0..33)
type MatrixState = { matrix: number[][] };

const makeMatrix = (): number[][] =>
  Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => r * 10 + c),
  );

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      items: [
        { title: 'Wire up tracker', done: true },
        { title: 'Survive null swaps', done: true },
        { title: 'Track array indices', done: false },
      ],
    });
  }

  pushItem(item: Item) {
    this.emit({ items: [...this.state.items, item] });
  }

  popItem() {
    this.emit({ items: this.state.items.slice(0, -1) });
  }

  reverseItems() {
    this.emit({ items: [...this.state.items].reverse() });
  }

  // Uses emit() — correct isolated path
  setDoneEmit(index: number, done: boolean) {
    const items = this.state.items.map((item, i) =>
      i === index ? { ...item, done } : item,
    );
    this.emit({ items });
  }

  // Uses patch() — the currently-broken path (treats whole array as atomic)
  setDonePatch(index: number, done: boolean) {
    const items = this.state.items.map((item, i) =>
      i === index ? { ...item, done } : item,
    );
    this.patch({ items });
  }

  // Appends a character to items[index].title via patch().
  // Mirrors TrackingBloc.editItemTitle — always reads current state.
  appendTitlePatch(index: number, char: string) {
    const items = this.state.items.map((item, i) =>
      i === index ? { ...item, title: item.title + char } : item,
    );
    this.patch({ items });
  }
}

class MatrixCubit extends Cubit<MatrixState> {
  constructor() {
    super({ matrix: makeMatrix() });
  }

  // Creates a new outer array + a new inner row array for the changed row;
  // all other rows keep their references.
  bumpCellEmit(row: number, col: number) {
    const matrix = this.state.matrix.map((r, ri) =>
      ri === row ? r.map((v, ci) => (ci === col ? v + 1 : v)) : r,
    );
    this.emit({ matrix });
  }

  // Same logical change, but uses patch() — triggers ancestor-watch for "matrix".
  bumpCellPatch(row: number, col: number) {
    const matrix = this.state.matrix.map((r, ri) =>
      ri === row ? r.map((v, ci) => (ci === col ? v + 1 : v)) : r,
    );
    this.patch({ matrix });
  }

  resetEmit() {
    this.emit({ matrix: makeMatrix() });
  }

  resetPatch() {
    this.patch({ matrix: makeMatrix() });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Replicates the `expandWithAncestors` logic from `@blac/react/useBloc`:
 * adds ancestor-watch path ids for every non-root ancestor of each leaf path.
 * This mirrors what `useBloc` registers as the channel subscription interest,
 * so that `patch()` atomic-replacement marks (which emit ancestor-watch ids)
 * are correctly intersected.
 */
function expandWithAncestors(paths: PathSet, interner: PathInterner): PathSet {
  if (paths === Symbol.for('@dirtytalk/structural/ALL_PATHS')) return paths;
  const leafPaths = paths as Set<number>;
  if (leafPaths.size === 0) return paths;

  const expanded = new Set<number>(leafPaths);
  for (const id of leafPaths) {
    // `lookup` strips the ancestor sentinel prefix → safe to use for strings
    // that were interned without it (i.e. normal leaf paths).
    const str = (interner as any)._paths[id] as string;
    if (!str) continue;
    let idx = str.lastIndexOf('.');
    while (idx > 0) {
      const ancestor = str.slice(0, idx);
      expanded.add(interner.internAncestor(ancestor));
      idx = ancestor.lastIndexOf('.');
    }
  }
  return expanded;
}

/**
 * Simulate one consumer reading a specific slice of state via the tracker,
 * register its paths with the container, and subscribe to its channel.
 *
 * Returns { callback, unsub, paths, interest }.
 */
function makeConsumer(
  cubit: TodoCubit,
  id: string,
  read: (state: TodoState) => void,
) {
  const { value, paths } = trackRender(cubit.state, cubit.interner);
  read(value);
  cubit.registerConsumerPaths(id, paths);
  const interest = expandWithAncestors(paths, cubit.interner);
  const callback = vi.fn();
  const unsub = cubit.channel.subscribe(() => interest, callback);
  return { callback, unsub, paths, interest };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('array-tracking isolation', () => {
  blacTestSetup();

  // ── Baseline ──────────────────────────────────────────────────────────────

  describe('baseline: correct wakeups', () => {
    it('items[0].title consumer wakes when items[0].title changes (emit)', async () => {
      const cubit = new TodoCubit();
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);
      const c1 = makeConsumer(cubit, 'c1', (s) => void s.items[1].title);

      const items = cubit.state.items.map((item, i) =>
        i === 0 ? { ...item, title: 'CHANGED' } : item,
      );
      cubit.emit({ items });
      await flush();

      expect(c0.callback).toHaveBeenCalledTimes(1);
      expect(c1.callback).not.toHaveBeenCalled();
    });

    it('items.length consumer wakes when an item is added (emit)', async () => {
      const cubit = new TodoCubit();
      const cLen = makeConsumer(cubit, 'cLen', (s) => void s.items.length);
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);

      cubit.pushItem({ title: 'New item', done: false });
      await flush();

      expect(cLen.callback).toHaveBeenCalledTimes(1);
      expect(c0.callback).not.toHaveBeenCalled();
    });

    it('items.length consumer wakes when an item is removed (emit)', async () => {
      const cubit = new TodoCubit();
      const cLen = makeConsumer(cubit, 'cLen', (s) => void s.items.length);
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);

      cubit.popItem();
      await flush();

      expect(cLen.callback).toHaveBeenCalledTimes(1);
      expect(c0.callback).not.toHaveBeenCalled();
    });
  });

  // ── Sibling-index isolation via emit() ────────────────────────────────────
  // These tests use emit() (full replace + diffAlongSkeleton) which SHOULD
  // give correct isolation. They serve as the pass bar for the diff logic.

  describe('per-index isolation via emit()', () => {
    it('items[0].title consumer does NOT wake when items[1].title changes', async () => {
      const cubit = new TodoCubit();
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);
      const c1 = makeConsumer(cubit, 'c1', (s) => void s.items[1].title);

      const items = cubit.state.items.map((item, i) =>
        i === 1 ? { ...item, title: 'CHANGED' } : item,
      );
      cubit.emit({ items });
      await flush();

      expect(c0.callback).not.toHaveBeenCalled();
      expect(c1.callback).toHaveBeenCalledTimes(1);
    });

    it('items[0].done consumer does NOT wake when items[1].done changes', async () => {
      const cubit = new TodoCubit();
      const c0done = makeConsumer(cubit, 'c0done', (s) => void s.items[0].done);
      const c1done = makeConsumer(cubit, 'c1done', (s) => void s.items[1].done);

      cubit.setDoneEmit(1, false);
      await flush();

      expect(c0done.callback).not.toHaveBeenCalled();
      expect(c1done.callback).toHaveBeenCalledTimes(1);
    });

    it('items.length consumer does NOT wake when done status changes (length unchanged)', async () => {
      const cubit = new TodoCubit();
      const cLen = makeConsumer(cubit, 'cLen', (s) => void s.items.length);
      const c1done = makeConsumer(cubit, 'c1done', (s) => void s.items[1].done);

      cubit.setDoneEmit(1, false);
      await flush();

      expect(cLen.callback).not.toHaveBeenCalled();
      expect(c1done.callback).toHaveBeenCalledTimes(1);
    });

    it('items[0..1] consumers do NOT wake when a new item is pushed (emit)', async () => {
      const cubit = new TodoCubit();
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);
      const c1 = makeConsumer(cubit, 'c1', (s) => void s.items[1].done);
      const cLen = makeConsumer(cubit, 'cLen', (s) => void s.items.length);

      cubit.pushItem({ title: 'New item', done: false });
      await flush();

      // Existing items unchanged — only length consumer should fire
      expect(c0.callback).not.toHaveBeenCalled();
      expect(c1.callback).not.toHaveBeenCalled();
      expect(cLen.callback).toHaveBeenCalledTimes(1);
    });

    it('items[0..1] consumers do NOT wake when last item is popped (emit)', async () => {
      const cubit = new TodoCubit();
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);
      const c1 = makeConsumer(cubit, 'c1', (s) => void s.items[1].done);
      const cLen = makeConsumer(cubit, 'cLen', (s) => void s.items.length);

      cubit.popItem(); // removes index 2 only
      await flush();

      expect(c0.callback).not.toHaveBeenCalled();
      expect(c1.callback).not.toHaveBeenCalled();
      expect(cLen.callback).toHaveBeenCalledTimes(1);
    });

    it('items.map(i => i.title) consumer does NOT wake when unrelated field changes', async () => {
      const cubit = new TodoCubit();
      // .map(i => i.title) now tracks items.length + items.*.title precisely
      const cMap = makeConsumer(cubit, 'cMap', (s) =>
        void s.items.map((i) => i.title),
      );
      // Second consumer to force diffAlongSkeleton (not ALL_PATHS shortcut)
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);

      cubit.setDoneEmit(1, false); // changes items[1].done only — title unchanged
      await flush();

      // Precise tracking: items[1].done != any tracked path → no wake
      expect(cMap.callback).not.toHaveBeenCalled();
    });
  });

  // ── Sibling-index isolation via patch() ───────────────────────────────────
  // These tests use patch() which currently FAILS to isolate per-index:
  // patch() treats arrays as atomic → marks ancestor-watch for "items" →
  // every consumer with an expanded interest that includes that ancestor wakes.

  describe('per-index isolation via patch() [EXPECTED TO FAIL — not yet supported]', () => {
    it('items[0].title consumer does NOT wake when items[1].done changes via patch()', async () => {
      const cubit = new TodoCubit();
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);
      const c1done = makeConsumer(
        cubit,
        'c1done',
        (s) => void s.items[1].done,
      );

      cubit.setDonePatch(1, false); // calls patch({ items: newArray })
      await flush();

      // DESIRED: only c1done wakes.
      // ACTUAL: c0 also wakes because patch marks ancestor-watch for "items".
      expect(c0.callback).not.toHaveBeenCalled(); // FAILS
      expect(c1done.callback).toHaveBeenCalledTimes(1);
    });

    it('items[0].done consumer does NOT wake when items[2].done changes via patch()', async () => {
      const cubit = new TodoCubit();
      const c0done = makeConsumer(
        cubit,
        'c0done',
        (s) => void s.items[0].done,
      );
      const c2done = makeConsumer(
        cubit,
        'c2done',
        (s) => void s.items[2].done,
      );

      cubit.setDonePatch(2, true);
      await flush();

      expect(c0done.callback).not.toHaveBeenCalled(); // FAILS
      expect(c2done.callback).toHaveBeenCalledTimes(1);
    });

    it('items.length consumer does NOT wake when only done status changes via patch()', async () => {
      const cubit = new TodoCubit();
      const cLen = makeConsumer(cubit, 'cLen', (s) => void s.items.length);
      const c1done = makeConsumer(
        cubit,
        'c1done',
        (s) => void s.items[1].done,
      );

      cubit.setDonePatch(1, false);
      await flush();

      // DESIRED: only c1done wakes (length unchanged).
      // ACTUAL: cLen also wakes because patch marks ancestor-watch for "items".
      expect(cLen.callback).not.toHaveBeenCalled(); // FAILS
      expect(c1done.callback).toHaveBeenCalledTimes(1);
    });

    it('only items[2] consumers wake when new item is pushed via patch()', async () => {
      const cubit = new TodoCubit();
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);
      const c1 = makeConsumer(cubit, 'c1', (s) => void s.items[1].done);
      const cLen = makeConsumer(cubit, 'cLen', (s) => void s.items.length);

      // patch with a new array that appended one item
      const newItems = [
        ...cubit.state.items,
        { title: 'New item', done: false },
      ];
      cubit.patch({ items: newItems });
      await flush();

      // DESIRED: only cLen wakes (items[0] and items[1] unchanged).
      // ACTUAL: all wake because patch marks ancestor-watch for "items".
      expect(c0.callback).not.toHaveBeenCalled(); // FAILS
      expect(c1.callback).not.toHaveBeenCalled(); // FAILS
      expect(cLen.callback).toHaveBeenCalledTimes(1);
    });
  });

  // ── reverse() — outer indices swap, middle stays ─────────────────────────
  //
  // Initial: ["Wire up tracker", "Survive null swaps", "Track array indices"]
  // After:   ["Track array indices", "Survive null swaps", "Wire up tracker"]
  //   items[0].title:  "Wire up tracker" → "Track array indices"  (changed)
  //   items[1].title:  "Survive null swaps" → "Survive null swaps" (unchanged)
  //   items[2].title:  "Track array indices" → "Wire up tracker"   (changed)

  describe('reverse() — outer indices swap, middle stays', () => {
    it('only outer-index title consumers wake when items are reversed (emit)', async () => {
      const cubit = new TodoCubit();
      const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);
      const c1 = makeConsumer(cubit, 'c1', (s) => void s.items[1].title);
      const c2 = makeConsumer(cubit, 'c2', (s) => void s.items[2].title);

      cubit.reverseItems();
      await flush();

      expect(c0.callback).toHaveBeenCalledTimes(1); // "Wire up tracker" → "Track array indices"
      expect(c1.callback).not.toHaveBeenCalled(); // middle element stays same value
      expect(c2.callback).toHaveBeenCalledTimes(1); // "Track array indices" → "Wire up tracker"
    });
  });
});

// ---------------------------------------------------------------------------
// Matrix tests  (number[][] — nested arrays)
// ---------------------------------------------------------------------------
//
// matrix[r][c] = r*10 + c, so:
//   row 0: [0,  1,  2,  3]
//   row 1: [10, 11, 12, 13]
//   row 2: [20, 21, 22, 23]
//   row 3: [30, 31, 32, 33]
//
// tracker path for matrix[r][c]:  "matrix.{r}.{c}"  (doubly-nested index)
// tracker path for state.matrix.map(…): "matrix"  (pinned by .map() call)

describe('matrix[][] tracking isolation', () => {
  blacTestSetup();

  // Helper typed for MatrixCubit
  function makeCell(
    cubit: MatrixCubit,
    id: string,
    row: number,
    col: number,
  ) {
    return makeConsumer(
      cubit as unknown as TodoCubit,
      id,
      (s) => void (s as unknown as MatrixState).matrix[row]?.[col],
    );
  }

  function makeRowSum(cubit: MatrixCubit, id: string, row: number) {
    return makeConsumer(
      cubit as unknown as TodoCubit,
      id,
      (s) => void (s as unknown as MatrixState).matrix[row]?.reduce((a, b) => a + b, 0),
    );
  }

  function makeMatrixMap(cubit: MatrixCubit, id: string) {
    return makeConsumer(
      cubit as unknown as TodoCubit,
      id,
      (s) =>
        void (s as unknown as MatrixState).matrix.map((r) =>
          r.reduce((a, b) => a + b, 0),
        ),
    );
  }

  // ── Baseline ──────────────────────────────────────────────────────────────

  describe('baseline: correct wakeups', () => {
    it('matrix[0][0] consumer wakes when matrix[0][0] is bumped (emit)', async () => {
      const cubit = new MatrixCubit();
      const c00 = makeCell(cubit, 'c00', 0, 0);
      const c11 = makeCell(cubit, 'c11', 1, 1);

      cubit.bumpCellEmit(0, 0);
      await flush();

      expect(c00.callback).toHaveBeenCalledTimes(1);
      expect(c11.callback).not.toHaveBeenCalled();
    });

    it('all 4 cells in a row wake when only that row changes (emit)', async () => {
      const cubit = new MatrixCubit();
      // Register 4 cells in row 1 + one sentinel in row 0 so emit() uses diff
      const r1c0 = makeCell(cubit, 'r1c0', 1, 0);
      const r1c1 = makeCell(cubit, 'r1c1', 1, 1);
      const r1c2 = makeCell(cubit, 'r1c2', 1, 2);
      const r1c3 = makeCell(cubit, 'r1c3', 1, 3);
      const r0c0 = makeCell(cubit, 'r0c0', 0, 0); // sentinel to force diff

      // Replace the entire row 1 with incremented values
      const matrix = cubit.state.matrix.map((r, ri) =>
        ri === 1 ? r.map((v) => v + 1) : r,
      );
      cubit.emit({ matrix });
      await flush();

      expect(r1c0.callback).toHaveBeenCalledTimes(1);
      expect(r1c1.callback).toHaveBeenCalledTimes(1);
      expect(r1c2.callback).toHaveBeenCalledTimes(1);
      expect(r1c3.callback).toHaveBeenCalledTimes(1);
      expect(r0c0.callback).not.toHaveBeenCalled(); // row 0 untouched
    });
  });

  // ── Per-cell isolation via emit() ─────────────────────────────────────────
  // emit() + diffAlongSkeleton compares "matrix.r.c" leaf paths individually.

  describe('per-cell isolation via emit()', () => {
    it('matrix[0][0] does NOT wake when matrix[1][1] is bumped', async () => {
      const cubit = new MatrixCubit();
      const c00 = makeCell(cubit, 'c00', 0, 0);
      const c11 = makeCell(cubit, 'c11', 1, 1);

      cubit.bumpCellEmit(1, 1);
      await flush();

      expect(c00.callback).not.toHaveBeenCalled();
      expect(c11.callback).toHaveBeenCalledTimes(1);
    });

    it('matrix[0][0] does NOT wake when matrix[0][1] is bumped (same row)', async () => {
      const cubit = new MatrixCubit();
      const c00 = makeCell(cubit, 'c00', 0, 0);
      const c01 = makeCell(cubit, 'c01', 0, 1);

      cubit.bumpCellEmit(0, 1);
      await flush();

      expect(c00.callback).not.toHaveBeenCalled();
      expect(c01.callback).toHaveBeenCalledTimes(1);
    });

    it('matrix[0][0] does NOT wake when matrix[1][0] is bumped (same col)', async () => {
      const cubit = new MatrixCubit();
      const c00 = makeCell(cubit, 'c00', 0, 0);
      const c10 = makeCell(cubit, 'c10', 1, 0);

      cubit.bumpCellEmit(1, 0);
      await flush();

      expect(c00.callback).not.toHaveBeenCalled();
      expect(c10.callback).toHaveBeenCalledTimes(1);
    });

    it('only changed cells wake when matrix is reset to same initial values', async () => {
      const cubit = new MatrixCubit();
      // Bump [2][3] so it differs from initial
      cubit.bumpCellEmit(2, 3);
      await flush();

      // Now register consumers AFTER the bump
      const c23 = makeCell(cubit, 'c23', 2, 3); // currently 24 (was 23)
      const c00 = makeCell(cubit, 'c00', 0, 0); // still 0

      cubit.resetEmit(); // restores [2][3] back to 23, [0][0] stays 0
      await flush();

      expect(c23.callback).toHaveBeenCalledTimes(1); // 24 → 23 changed
      expect(c00.callback).not.toHaveBeenCalled(); // 0 → 0 no change
    });

    it('row-sum consumer (reads whole row via .reduce) wakes when any cell in row changes', async () => {
      const cubit = new MatrixCubit();
      const rowSum1 = makeRowSum(cubit, 'rowSum1', 1); // reads row 1 via .reduce()
      const c00 = makeCell(cubit, 'c00', 0, 0); // sentinel

      cubit.bumpCellEmit(1, 2);
      await flush();

      // .reduce() pins row 1's path ("matrix.1"). Any cell change in that row
      // changes the row array reference → row-sum consumer wakes.
      expect(rowSum1.callback).toHaveBeenCalledTimes(1);
      expect(c00.callback).not.toHaveBeenCalled();
    });

    it('row-sum consumer for row 0 does NOT wake when only row 1 changes', async () => {
      const cubit = new MatrixCubit();
      const rowSum0 = makeRowSum(cubit, 'rowSum0', 0); // reads row 0
      const rowSum1 = makeRowSum(cubit, 'rowSum1', 1); // reads row 1

      cubit.bumpCellEmit(1, 3); // only row 1 gets a new array reference
      await flush();

      expect(rowSum0.callback).not.toHaveBeenCalled(); // row 0 ref unchanged
      expect(rowSum1.callback).toHaveBeenCalledTimes(1);
    });

    it('matrix.map() consumer wakes on any cell change (pins "matrix" path)', async () => {
      const cubit = new MatrixCubit();
      const matSum = makeMatrixMap(cubit, 'matSum');
      const c33 = makeCell(cubit, 'c33', 3, 3); // sentinel

      cubit.bumpCellEmit(3, 3);
      await flush();

      // matrix.map() pins "matrix" path. bumpCellEmit creates a new outer array
      // → matrix ref changes → matSum wakes.
      expect(matSum.callback).toHaveBeenCalledTimes(1);
    });

    it('matrix.map() consumer does NOT wake when only unrelated state changes', async () => {
      // This test uses a cubit with extra state so we can emit a change that
      // leaves the matrix reference intact.
      type ComboState = { matrix: number[][]; tick: number };
      class ComboCubit extends Cubit<ComboState> {
        constructor() {
          super({ matrix: makeMatrix(), tick: 0 });
        }
        bumpTick() { this.patch({ tick: this.state.tick + 1 }); }
      }

      const cubit = new ComboCubit();
      const state = cubit.state;

      // Build consumers using the combo cubit's channel/interner directly
      const { value: proxy, paths } = trackRender(cubit.state, cubit.interner);
      void (proxy as ComboState).matrix.map((r) => r.reduce((a, b) => a + b, 0));
      cubit.registerConsumerPaths('matSum', paths);
      const matSumInterest = expandWithAncestors(paths, cubit.interner);
      const matSumCb = vi.fn();
      cubit.channel.subscribe(() => matSumInterest, matSumCb);

      const { value: proxy2, paths: paths2 } = trackRender(cubit.state, cubit.interner);
      void (proxy2 as ComboState).tick;
      cubit.registerConsumerPaths('tick', paths2);
      const tickInterest = expandWithAncestors(paths2, cubit.interner);
      const tickCb = vi.fn();
      cubit.channel.subscribe(() => tickInterest, tickCb);

      void state; // suppress unused warning

      cubit.bumpTick();
      await flush();

      expect(matSumCb).not.toHaveBeenCalled(); // matrix unchanged
      expect(tickCb).toHaveBeenCalledTimes(1);
    });
  });

  // ── Per-cell isolation via patch() ────────────────────────────────────────
  // These tests FAIL: patch() treats the whole matrix array as an atomic leaf
  // and marks ancestor-watch for "matrix" → every consumer with an expanded
  // interest that includes that ancestor wakes, regardless of which cell changed.

  describe('per-cell isolation via patch() [EXPECTED TO FAIL — not yet supported]', () => {
    it('matrix[0][0] does NOT wake when matrix[1][1] is bumped via patch()', async () => {
      const cubit = new MatrixCubit();
      const c00 = makeCell(cubit, 'c00', 0, 0);
      const c11 = makeCell(cubit, 'c11', 1, 1);

      cubit.bumpCellPatch(1, 1);
      await flush();

      // DESIRED: only c11 wakes.
      // ACTUAL: c00 also wakes — ancestor-watch "\0a:matrix" fires for both.
      expect(c00.callback).not.toHaveBeenCalled(); // FAILS
      expect(c11.callback).toHaveBeenCalledTimes(1);
    });

    it('matrix[0][0] does NOT wake when matrix[0][1] is bumped via patch() (same row)', async () => {
      const cubit = new MatrixCubit();
      const c00 = makeCell(cubit, 'c00', 0, 0);
      const c01 = makeCell(cubit, 'c01', 0, 1);

      cubit.bumpCellPatch(0, 1);
      await flush();

      expect(c00.callback).not.toHaveBeenCalled(); // FAILS
      expect(c01.callback).toHaveBeenCalledTimes(1);
    });

    it('row-sum 0 does NOT wake when only row 1 changes via patch()', async () => {
      const cubit = new MatrixCubit();
      const rowSum0 = makeRowSum(cubit, 'rowSum0', 0);
      const rowSum1 = makeRowSum(cubit, 'rowSum1', 1);

      cubit.bumpCellPatch(1, 0);
      await flush();

      // DESIRED: only rowSum1 wakes.
      // ACTUAL: rowSum0 also wakes because ancestor-watch "\0a:matrix" hits both.
      expect(rowSum0.callback).not.toHaveBeenCalled(); // FAILS
      expect(rowSum1.callback).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Consecutive-patch regression (tracking-lab title+ bug)
//
// Observed: `items.map(i => i.title)` consumer re-renders on the first
// title+ click but NOT on subsequent ones until `done` is toggled.
//
// Root cause (NOT in core tracking — confirmed by the tests below passing):
//
//   TrackingControls does `state.items.map((item, i) => <JSX>)` where the
//   onClick closure captures `item.title`. With TRACK_ARRAY_ITERATION=true,
//   `item` is a sub-proxy. But `item.title` is only accessed INSIDE the
//   onClick closure body — never during JSX render — so the proxy never
//   records it. TrackingControls tracks `items.k.id` and `items.k.done`
//   (evaluated during render) but NOT `items.k.title`.
//
//   Therefore TrackingControls never re-renders when titles change, and the
//   onClick always captures the stale `item.title` from the last render
//   (which may be mount-time state). The second click sends the same title
//   that's already in state → _refineAncestorMarks sees no value change →
//   the `items.map(titles)` consumer correctly stays asleep.
//
//   Fix: use `bloc.appendItemTitle(id, '·')` so the bloc reads the current
//   title from its own state, bypassing the stale closure entirely. Reading
//   state from `bloc.state` inside an event handler is always fresh; reading
//   it from a sub-proxy captured during a past render is an antipattern.
// ---------------------------------------------------------------------------

describe('consecutive-patch regression (tracking-lab title+ bug)', () => {
  blacTestSetup();

  it('map(title) consumer wakes on each consecutive patch (reads from current state)', async () => {
    const cubit = new TodoCubit();

    // Mirrors the `items.map(titles)` consumer in the tracking-lab.
    const cMap = makeConsumer(cubit, 'cMap', (s) =>
      void s.items.map((i) => i.title),
    );
    // Second consumer to force diffAlongSkeleton (not ALL_PATHS shortcut).
    const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);

    // First patch — equivalent to clicking `title+` once.
    cubit.appendTitlePatch(0, '.');
    await flush();

    expect(cMap.callback).toHaveBeenCalledTimes(1);
    cMap.callback.mockClear();

    // Second patch — clicking `title+` again.
    // Each call reads `cubit.state` (current), so the title really changes.
    cubit.appendTitlePatch(0, '.');
    await flush();

    // BUG (before fix): cMap.callback is NOT called here because the
    // skeleton lost `items.0.title` after the first patch re-registered
    // paths (or the interest closure no longer intersects the dirty set).
    expect(cMap.callback).toHaveBeenCalledTimes(1);
  });

  it('map(title) consumer does NOT wake when patch sends the same title (stale-closure sim)', async () => {
    // Simulates the TrackingControls bug: the onClick captures `item.title`
    // from a stale sub-proxy (old render). Clicking sends the SAME title →
    // the patch is a structural no-op for that field → _refineAncestorMarks
    // correctly produces no leaf change → consumer stays asleep.
    const cubit = new TodoCubit();
    const cMap = makeConsumer(cubit, 'cMap', (s) =>
      void s.items.map((i) => i.title),
    );
    const c0 = makeConsumer(cubit, 'c0', (s) => void s.items[0].title);

    // First real patch.
    cubit.appendTitlePatch(0, '.');
    await flush();
    expect(cMap.callback).toHaveBeenCalledTimes(1);
    cMap.callback.mockClear();

    // Second "patch" with the STALE title (same value as after first patch).
    // This is what happens when the onClick closure reads item.title from the
    // proxy of the previous render's state instead of the current state.
    const staleTitle = 'Wire up tracker.'; // the title AFTER the first patch
    const itemsWithStale = cubit.state.items.map((item, i) =>
      i === 0 ? { ...item, title: staleTitle } : item,
    );
    cubit.patch({ items: itemsWithStale });
    await flush();

    // Correct: _refineAncestorMarks sees items.0.title unchanged → no wake.
    // This confirms the tracking is correct; the bug is in the stale closure.
    expect(cMap.callback).not.toHaveBeenCalled();
  });
});
