import { describe, it, expect } from 'vite-plus/test';
import { render, act, screen, renderHook } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

class FieldBloc extends Cubit<{ a: number; b: string; name: string }> {
  constructor() {
    super({ a: 0, b: 'hello', name: 'test' });
  }
  setA(v: number) {
    this.emit({ ...this.state, a: v });
  }
  setB(v: string) {
    this.emit({ ...this.state, b: v });
  }
  setName(v: string) {
    this.emit({ ...this.state, name: v });
  }
  get doubled() {
    return this.state.a * 2;
  }
}

blacTestSetup();

describe('useBloc — manual deps edge cases', () => {
  it('select: () => [] never re-renders after mount', async () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(FieldBloc, { select: () => [] });
      bloc = b as FieldBloc;
      return <span>{state.a}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    await act(async () => {
      bloc.setA(1);
    });
    await act(async () => {
      bloc.setB('x');
    });
    await act(async () => {
      bloc.setName('y');
    });
    expect(renders.mock.calls.length).toBe(count);
  });

  it('select: (s) => [s.a, s.b] triggers on either change', async () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(FieldBloc, {
        select: (s) => [s.a, s.b],
      });
      bloc = b as FieldBloc;
      return (
        <span>
          {state.a}-{state.b}
        </span>
      );
    }
    render(<Comp />);
    const initial = renders.mock.calls.length;

    await act(async () => {
      bloc.setA(5);
    });
    expect(renders.mock.calls.length).toBe(initial + 1);

    await act(async () => {
      bloc.setB('world');
    });
    expect(renders.mock.calls.length).toBe(initial + 2);

    // name is not in deps — no re-render
    await act(async () => {
      bloc.setName('ignored');
    });
    expect(renders.mock.calls.length).toBe(initial + 2);
  });

  it('dependencies function receives both state AND bloc as arguments', async () => {
    const depsFn = vi.fn(
      (s: { a: number; b: string; name: string }, _bloc: FieldBloc) => [s.a],
    );
    const { result } = renderHook(() =>
      useBloc(FieldBloc, { select: depsFn as any }),
    );
    const bloc = result.current[1] as FieldBloc;
    await act(async () => {
      bloc.setA(1);
    });

    expect(depsFn).toHaveBeenCalled();
    const [stateArg, blocArg] = depsFn.mock.calls[depsFn.mock.calls.length - 1];
    expect(typeof stateArg).toBe('object');
    expect(blocArg).toBeInstanceOf(FieldBloc);
  });

  it('manual deps mode disables getter tracking even when getters are accessed', async () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      // Only track 'name' — accessing doubled getter should not cause re-render on 'a' change
      const [, b] = useBloc(FieldBloc, {
        select: (s) => [s.name],
      });
      bloc = b as FieldBloc;
      // Access the getter — in manual mode this does NOT register getter tracking
      return <span>{bloc.doubled}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;

    // Change 'a' — doubled would change, but getter tracking is disabled
    await act(async () => {
      bloc.setA(10);
    });
    expect(renders.mock.calls.length).toBe(count);

    // Change 'name' — in deps, triggers re-render
    await act(async () => {
      bloc.setName('updated');
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
  });

  it('null values in dependency array handled without throw', async () => {
    let bloc!: FieldBloc;
    function Comp() {
      const [state, b] = useBloc(FieldBloc, {
        select: (s) => [s.a, null as unknown as number, s.b],
      });
      bloc = b as FieldBloc;
      return <span data-testid="a">{state.a}</span>;
    }
    expect(() => render(<Comp />)).not.toThrow();

    // Emit a change — should not throw
    await expect(
      act(async () => {
        bloc.setA(5);
      }),
    ).resolves.not.toThrow();
    expect(screen.getByTestId('a').textContent).toBe('5');
  });

  it('inline arrow function as dependencies is stable across renders (no infinite loop)', async () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      // Inline arrow: new function reference each render — should not cause loops
      const [state, b] = useBloc(FieldBloc, {
        select: (s) => [s.a],
      });
      bloc = b as FieldBloc;
      return <span>{state.a}</span>;
    }
    render(<Comp />);
    await act(async () => {
      bloc.setA(1);
    });
    await act(async () => {
      bloc.setA(2);
    });
    // Each a change causes exactly one re-render
    expect(renders.mock.calls.length).toBe(3);
  });

  it('undefined values treated as stable — [undefined] equals [undefined]', async () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(FieldBloc, {
        select: (_s) => [undefined],
      });
      bloc = b as FieldBloc;
      return <span>x</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    // Even with state changes, deps are always [undefined] === [undefined] → no re-render
    await act(async () => {
      bloc.setA(1);
    });
    await act(async () => {
      bloc.setB('changed');
    });
    expect(renders.mock.calls.length).toBe(count);
  });
});
