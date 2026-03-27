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
  it('dependencies: () => [] never re-renders after mount', () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(FieldBloc, { dependencies: () => [] });
      bloc = b as FieldBloc;
      return <span>{state.a}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    act(() => {
      bloc.setA(1);
    });
    act(() => {
      bloc.setB('x');
    });
    act(() => {
      bloc.setName('y');
    });
    expect(renders.mock.calls.length).toBe(count);
  });

  it('dependencies: (s) => [s.a, s.b] triggers on either change', () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(FieldBloc, {
        dependencies: (s) => [s.a, s.b],
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

    act(() => {
      bloc.setA(5);
    });
    expect(renders.mock.calls.length).toBe(initial + 1);

    act(() => {
      bloc.setB('world');
    });
    expect(renders.mock.calls.length).toBe(initial + 2);

    // name is not in deps — no re-render
    act(() => {
      bloc.setName('ignored');
    });
    expect(renders.mock.calls.length).toBe(initial + 2);
  });

  it('dependencies function receives both state AND bloc as arguments', () => {
    const depsFn = vi.fn(
      (s: { a: number; b: string; name: string }, _bloc: FieldBloc) => [s.a],
    );
    const { result } = renderHook(() =>
      useBloc(FieldBloc, { dependencies: depsFn as any }),
    );
    const bloc = result.current[1] as FieldBloc;
    act(() => {
      bloc.setA(1);
    });

    expect(depsFn).toHaveBeenCalled();
    const [stateArg, blocArg] = depsFn.mock.calls[depsFn.mock.calls.length - 1];
    expect(typeof stateArg).toBe('object');
    expect(blocArg).toBeInstanceOf(FieldBloc);
  });

  it('manual deps mode disables getter tracking even when getters are accessed', () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      // Only track 'name' — accessing doubled getter should not cause re-render on 'a' change
      const [, b] = useBloc(FieldBloc, {
        dependencies: (s) => [s.name],
      });
      bloc = b as FieldBloc;
      // Access the getter — in manual mode this does NOT register getter tracking
      return <span>{bloc.doubled}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;

    // Change 'a' — doubled would change, but getter tracking is disabled
    act(() => {
      bloc.setA(10);
    });
    expect(renders.mock.calls.length).toBe(count);

    // Change 'name' — in deps, triggers re-render
    act(() => {
      bloc.setName('updated');
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
  });

  it('null values in dependency array handled without throw', () => {
    let bloc!: FieldBloc;
    function Comp() {
      const [state, b] = useBloc(FieldBloc, {
        dependencies: (s) => [s.a, null as unknown as number, s.b],
      });
      bloc = b as FieldBloc;
      return <span data-testid="a">{state.a}</span>;
    }
    expect(() => render(<Comp />)).not.toThrow();

    // Emit a change — should not throw
    expect(() =>
      act(() => {
        bloc.setA(5);
      }),
    ).not.toThrow();
    expect(screen.getByTestId('a').textContent).toBe('5');
  });

  it('inline arrow function as dependencies is stable across renders (no infinite loop)', () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      // Inline arrow: new function reference each render — should not cause loops
      const [state, b] = useBloc(FieldBloc, {
        dependencies: (s) => [s.a],
      });
      bloc = b as FieldBloc;
      return <span>{state.a}</span>;
    }
    render(<Comp />);
    act(() => {
      bloc.setA(1);
    });
    act(() => {
      bloc.setA(2);
    });
    // Each a change causes exactly one re-render
    expect(renders.mock.calls.length).toBe(3);
  });

  it('undefined values treated as stable — [undefined] equals [undefined]', () => {
    const renders = vi.fn();
    let bloc!: FieldBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(FieldBloc, {
        dependencies: (_s) => [undefined],
      });
      bloc = b as FieldBloc;
      return <span>x</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    // Even with state changes, deps are always [undefined] === [undefined] → no re-render
    act(() => {
      bloc.setA(1);
    });
    act(() => {
      bloc.setB('changed');
    });
    expect(renders.mock.calls.length).toBe(count);
  });
});
