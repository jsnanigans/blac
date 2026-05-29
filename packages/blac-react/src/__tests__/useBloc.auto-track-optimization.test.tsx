import { describe, it, expect, vi } from 'vite-plus/test';
import { render, act, screen, renderHook } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

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

blacTestSetup();

// NOTE: source-side path-narrow only kicks in when the StructuralContainer
// has 2+ registered consumer interest sets. With a single consumer the
// container short-circuits to `ALL_PATHS` (the diff cost isn't worth it),
// which then intersects every consumer interest. To observe path-narrowed
// re-renders below, each test mounts a sibling consumer with a disjoint
// interest so the source-side diff actually runs.

describe('useBloc — auto-track optimization', () => {
  function MountSibling({ touch }: { touch: 'a' | 'b' | 'c' }) {
    const [state] = useBloc(MultiFieldBloc);
    // Register a disjoint interest so the container has 2+ consumer paths.
    if (touch === 'a') void state.a;
    if (touch === 'b') void state.b;
    if (touch === 'c') void state.c;
    return null;
  }

  it('accessing state.a: change to state.b causes no re-render', async () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span>{state.a}</span>;
    }
    render(
      <>
        <Comp />
        <MountSibling touch="c" />
      </>,
    );
    const count = renders.mock.calls.length;
    await act(async () => {
      bloc.setB('world');
    });
    expect(renders.mock.calls.length).toBe(count);
  });

  it('accessing state.a: change to state.a triggers re-render', async () => {
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
    await act(async () => {
      bloc.setA(99);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
    expect(screen.getByTestId('a').textContent).toBe('99');
  });

  it('no state fields accessed: no re-render on any change', async () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span>static</span>;
    }
    render(
      <>
        <Comp />
        <MountSibling touch="a" />
      </>,
    );
    const count = renders.mock.calls.length;
    await act(async () => {
      bloc.setA(1);
    });
    await act(async () => {
      bloc.setB('x');
    });
    await act(async () => {
      bloc.setC(true);
    });
    expect(renders.mock.calls.length).toBe(count);
  });

  it('after accessing a new field, subsequent changes to it trigger re-render', async () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      const anyB = b as any;
      const skeleton = anyB._skeleton;
      const interner = anyB.interner;
      const skel =
        skeleton && interner && skeleton.size !== undefined
          ? Array.from(skeleton as Set<number>).map((id: number) =>
              interner.lookup(id),
            )
          : skeleton;
      console.log(
        '[render] state:',
        { a: state.a, b: state.b },
        'consumers:',
        anyB._consumerPaths?.size,
        'skeleton:',
        skel,
      );
      return (
        <span>
          {state.a}-{state.b}
        </span>
      );
    }
    render(
      <>
        <Comp />
        <MountSibling touch="c" />
      </>,
    );
    const initial = renders.mock.calls.length;
    await act(async () => {
      bloc.setB('first change');
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initial);
    expect(screen.getByText('0-first change')).toBeTruthy();

    const afterB = renders.mock.calls.length;
    console.log('[test] afterB renders:', afterB);
    await act(async () => {
      bloc.setA(7);
    });
    console.log('[test] after setA renders:', renders.mock.calls.length);
    console.log('[test] state:', bloc.state);
    // `a` is in the interest from the very first render, so this must fire.
    expect(renders.mock.calls.length).toBeGreaterThan(afterB);
    expect(screen.getByText('7-first change')).toBeTruthy();
  });

  // Deleted: `deeply nested path tracked specifically (profile.age vs
  // profile.name)`. Structural tracking records each intermediate path
  // (`user`, `user.profile`, `user.profile.age`), so a change at any
  // ancestor wakes the consumer. The pre-rewrite getter-tracking model
  // could compare leaf values to skip, but the new auto-track is strictly
  // path-based — there is no way to suppress a re-render on
  // `user.profile.name` while observing `user.profile.age`.

  it('accessing a top-level field does not re-render on sibling change', async () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span data-testid="a">{state.a}</span>;
    }
    render(
      <>
        <Comp />
        <MountSibling touch="b" />
      </>,
    );
    const count = renders.mock.calls.length;
    await act(async () => {
      bloc.setC(true);
    });
    expect(renders.mock.calls.length).toBe(count);
    expect(screen.getByTestId('a').textContent).toBe('0');
  });

  it('select: () => [state.a, state.b, state.c] causes re-render on any of those', async () => {
    // Replacement for the removed `autoTrack: false` test. With `select`,
    // re-renders fire when the returned tuple changes per-index.
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc, {
        select: (s) => [s.a, s.b, s.c],
      });
      bloc = b as MultiFieldBloc;
      return <span>{state.a}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    await act(async () => {
      bloc.setB('changed');
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
  });

  it('proxy tracking works correctly after unmount/remount cycle', async () => {
    const renders = vi.fn();
    let bloc!: MultiFieldBloc;
    function Comp() {
      renders();
      const [state, b] = useBloc(MultiFieldBloc);
      bloc = b as MultiFieldBloc;
      return <span>{state.a}</span>;
    }
    const { unmount } = render(
      <>
        <Comp />
        <MountSibling touch="c" />
      </>,
    );
    unmount();
    renders.mockClear();

    render(
      <>
        <Comp />
        <MountSibling touch="c" />
      </>,
    );
    const count = renders.mock.calls.length;
    // After remount, tracking is fresh — b change should not re-render
    await act(async () => {
      bloc.setB('new');
    });
    expect(renders.mock.calls.length).toBe(count);
    // a change should re-render
    await act(async () => {
      bloc.setA(42);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(count);
  });

  it('tracking state across multiple renderHook re-renders stays consistent', async () => {
    const { result, rerender } = renderHook(() => {
      const ret = useBloc(MultiFieldBloc);
      void ret[0].a; // observe during render
      return ret;
    });
    const bloc = result.current[1] as MultiFieldBloc;

    // Changing b should not cause hook to update (only a is tracked) — but
    // with a single consumer the source marks ALL_PATHS, so we cannot
    // verify "no re-render". We can still verify state.a stays correct.
    await act(async () => {
      bloc.setB('changed');
    });
    expect(result.current[0].a).toBe(0);

    // Changing a should update
    await act(async () => {
      bloc.setA(7);
    });
    expect(result.current[0].a).toBe(7);

    rerender();
    expect(result.current[0].a).toBe(7);
  });
});
