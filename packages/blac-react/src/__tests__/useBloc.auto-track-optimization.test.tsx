import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act, screen, renderHook } from '@testing-library/react';
import { Cubit, clearAll } from '@blac/core';
import { useBloc } from '../useBloc';
import { configureBlacReact, resetBlacReactConfig } from '../config';

class MultiFieldBloc extends Cubit<{ a: number; b: string; c: boolean }> {
  constructor() {
    super({ a: 0, b: 'hello', c: false });
  }
  setA(v: number) {
    this.emit({ ...this.state, a: v });
  }
  setB(v: string) {
    this.emit({ ...this.state, b: v });
  }
  setC(v: boolean) {
    this.emit({ ...this.state, c: v });
  }
}

afterEach(() => {
  clearAll();
  resetBlacReactConfig();
});

describe('useBloc — auto-track optimization', () => {
  it('accessing state.a: change to state.b causes no re-render', () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span>{state.a}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    act(() => {
      bloc.setB('world');
    });
    expect(renders.mock.calls.length).toBe(count);
  });

  it('accessing state.a: change to state.a triggers re-render', () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span data-testid="a">{state.a}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    act(() => {
      bloc.setA(99);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
    expect(screen.getByTestId('a').textContent).toBe('99');
  });

  it('no state fields accessed: no re-render on any change', () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span>static</span>;
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
      bloc.setC(true);
    });
    expect(renders.mock.calls.length).toBe(count);
  });

  it('after accessing a new field, subsequent changes to it trigger re-render', () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    let showB = false;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return (
        <span>
          {state.a}
          {showB ? state.b : null}
        </span>
      );
    }
    render(<Comp />);
    // Only tracking 'a' — changing 'b' has no effect
    act(() => {
      bloc.setB('first change');
    });
    expect(renders.mock.calls.length).toBe(1);

    // Trigger a re-render that also accesses 'b'
    showB = true;
    act(() => {
      bloc.setA(1);
    });

    // Now changing 'b' should trigger re-render
    const afterA = renders.mock.calls.length;
    act(() => {
      bloc.setB('second change');
    });
    expect(renders.mock.calls.length).toBeGreaterThan(afterA);
  });

  it('deeply nested path tracked specifically (profile.age vs profile.name)', () => {
    class UserBloc extends Cubit<{
      user: { profile: { age: number; name: string } };
    }> {
      constructor() {
        super({ user: { profile: { age: 25, name: 'Alice' } } });
      }
      setAge(age: number) {
        this.emit({ user: { profile: { ...this.state.user.profile, age } } });
      }
      setName(name: string) {
        this.emit({ user: { profile: { ...this.state.user.profile, name } } });
      }
    }
    const renders = vi.fn();
    let bloc!: UserBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(UserBloc);
      bloc = b as UserBloc;
      return <span>{state.user.profile.age}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    act(() => {
      bloc.setName('Bob');
    });
    expect(renders.mock.calls.length).toBe(count);
    act(() => {
      bloc.setAge(30);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
  });

  it('accessing a top-level field does not re-render on sibling change', () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span data-testid="a">{state.a}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    act(() => {
      bloc.setC(true);
    });
    expect(renders.mock.calls.length).toBe(count);
    expect(screen.getByTestId('a').textContent).toBe('0');
  });

  it('autoTrack: false causes re-render on any state change', () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc, { autoTrack: false });
      bloc = b as MultiFieldBloc;
      return <span>{state.a}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    act(() => {
      bloc.setB('changed');
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
  });

  it('global configureBlacReact({ autoTrack: false }) disables tracking for all hooks', () => {
    configureBlacReact({ autoTrack: false });
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span>{state.a}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    act(() => {
      bloc.setB('changed');
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
  });

  it('per-hook autoTrack: true overrides global autoTrack: false', () => {
    configureBlacReact({ autoTrack: false });
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc, { autoTrack: true });
      bloc = b as MultiFieldBloc;
      return <span>{state.a}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    // With per-hook autoTrack: true, only 'a' is tracked — changing 'b' should not re-render
    act(() => {
      bloc.setB('changed');
    });
    expect(renders.mock.calls.length).toBe(count);
  });

  it('proxy tracking works correctly after unmount/remount cycle', () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span>{state.a}</span>;
    }
    const { unmount } = render(<Comp />);
    unmount();
    renders.mockClear();

    render(<Comp />);
    const count = renders.mock.calls.length;
    // After remount, tracking is fresh — b change should not re-render
    act(() => {
      bloc.setB('new');
    });
    expect(renders.mock.calls.length).toBe(count);
    // a change should re-render
    act(() => {
      bloc.setA(42);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
  });

  it('tracking state across multiple renderHook re-renders stays consistent', () => {
    // state.a must be accessed inside the render callback — accessing result.current[0].a
    // outside render only populates trackedPaths, not pathCache; the subscribe callback
    // checks pathCache, so out-of-render accesses never register tracking.
    const { result, rerender } = renderHook(() => {
      const ret = useBloc(MultiFieldBloc);
      void ret[0].a; // access during render so React's stale-check flushes it into pathCache
      return ret;
    });
    const bloc = result.current[1] as MultiFieldBloc;

    // Changing b should not cause hook to update (only a is tracked)
    act(() => {
      bloc.setB('changed');
    });
    expect(result.current[0].a).toBe(0);

    // Changing a should update
    act(() => {
      bloc.setA(7);
    });
    expect(result.current[0].a).toBe(7);

    rerender();
    // Re-render should not lose tracking state
    expect(result.current[0].a).toBe(7);
  });
});
