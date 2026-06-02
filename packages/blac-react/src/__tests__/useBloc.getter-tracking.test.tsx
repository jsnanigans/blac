import { describe, it, expect, vi } from 'vite-plus/test';
import { render, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

blacTestSetup();

// ---------------------------------------------------------------------------
// Bloc under test: getters that read this.state
// ---------------------------------------------------------------------------

class MatrixBloc extends Cubit<{
  matrix: number[][];
  unrelated: number;
}> {
  constructor() {
    super({
      matrix: [
        [1, 2],
        [3, 4],
      ],
      unrelated: 0,
    });
  }

  get matrixSum(): number {
    return this.state.matrix.reduce(
      (sum, row) => sum + row.reduce((a, b) => a + b, 0),
      0,
    );
  }

  bumpCell(r: number, c: number) {
    const next = this.state.matrix.map((row) => [...row]);
    next[r][c] += 1;
    this.patch({ matrix: next });
  }

  bumpUnrelated() {
    this.patch({ unrelated: this.state.unrelated + 1 });
  }
}

class ItemsBloc extends Cubit<{ items: { title: string; done: boolean }[] }> {
  constructor() {
    super({
      items: [
        { title: 'A', done: false },
        { title: 'B', done: true },
      ],
    });
  }

  get completedCount(): number {
    return this.state.items.filter((item) => item.done).length;
  }

  toggleItem(index: number) {
    const items = this.state.items.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item,
    );
    this.patch({ items });
  }

  changeTitleOnly(index: number, title: string) {
    const items = this.state.items.map((item, i) =>
      i === index ? { ...item, title } : item,
    );
    this.patch({ items });
  }
}

// ---------------------------------------------------------------------------
// Sibling components ensure 2+ consumers are registered so the source-side
// skeleton diff actually runs (single-consumer short-circuits to ALL_PATHS).
// ---------------------------------------------------------------------------

function MatrixSibling() {
  const [state] = useBloc(MatrixBloc);
  void state.unrelated;
  return null;
}

function ItemsSibling() {
  const [state] = useBloc(ItemsBloc);
  void state.items.length;
  return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBloc — getter tracking', () => {
  it('bloc.matrixSum re-renders when matrix changes', async () => {
    const renders = vi.fn();
    let bloc!: MatrixBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(MatrixBloc);
      bloc = b as MatrixBloc;
      return <span>{b.matrixSum}</span>;
    }
    render(
      <>
        <Comp />
        <MatrixSibling />
      </>,
    );
    const initial = renders.mock.calls.length;
    await act(async () => {
      bloc.bumpCell(0, 0);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initial);
  });

  it('bloc.matrixSum does NOT re-render when only unrelated changes', async () => {
    const renders = vi.fn();
    let bloc!: MatrixBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(MatrixBloc);
      bloc = b as MatrixBloc;
      return <span>{b.matrixSum}</span>;
    }
    render(
      <>
        <Comp />
        <MatrixSibling />
      </>,
    );
    const initial = renders.mock.calls.length;
    await act(async () => {
      bloc.bumpUnrelated();
    });
    expect(renders.mock.calls.length).toBe(initial);
  });

  it('bloc.completedCount re-renders when a done field toggles', async () => {
    const renders = vi.fn();
    let bloc!: ItemsBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(ItemsBloc);
      bloc = b as ItemsBloc;
      return <span>{b.completedCount}</span>;
    }
    render(
      <>
        <Comp />
        <ItemsSibling />
      </>,
    );
    const initial = renders.mock.calls.length;
    await act(async () => {
      bloc.toggleItem(0);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initial);
  });

  it('bloc.completedCount does NOT re-render when only title changes', async () => {
    const renders = vi.fn();
    let bloc!: ItemsBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(ItemsBloc);
      bloc = b as ItemsBloc;
      return <span>{b.completedCount}</span>;
    }
    render(
      <>
        <Comp />
        <ItemsSibling />
      </>,
    );
    const initial = renders.mock.calls.length;
    await act(async () => {
      bloc.changeTitleOnly(0, 'Z');
    });
    expect(renders.mock.calls.length).toBe(initial);
  });

  it('reading a getter outside render reflects live state, not the last render', async () => {
    let bloc!: MatrixBloc;
    function Comp() {
      const [, b] = useBloc(MatrixBloc);
      bloc = b as MatrixBloc;
      return <span>{b.matrixSum}</span>;
    }
    render(<Comp />);
    // matrix [[1,2],[3,4]] → sum 10.
    expect(bloc.matrixSum).toBe(10);
    let observed = 0;
    await act(async () => {
      bloc.bumpCell(0, 0); // matrix[0][0] 1→2, sum 10→11
      // Read the getter synchronously inside the handler, BEFORE React has
      // re-rendered. Must see the live (post-mutation) value, not the frozen
      // snapshot captured during the previous render.
      observed = bloc.matrixSum;
    });
    expect(observed).toBe(11);
  });

  it('returned bloc reference is stable across re-renders', async () => {
    const blocRefs: unknown[] = [];
    let bloc!: MatrixBloc;
    function Comp() {
      const [, b] = useBloc(MatrixBloc);
      bloc = b as MatrixBloc;
      blocRefs.push(b);
      return <span>{b.matrixSum}</span>;
    }
    render(<Comp />);
    await act(async () => {
      bloc.bumpCell(0, 0);
    });
    // All captured refs must be the same proxy object.
    expect(blocRefs.length).toBeGreaterThan(1);
    expect(new Set(blocRefs).size).toBe(1);
  });
});
