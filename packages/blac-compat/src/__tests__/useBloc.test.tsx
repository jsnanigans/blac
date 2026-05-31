import { describe, it, expect, vi } from 'vite-plus/test';
import { render, renderHook, act, screen } from '@testing-library/react';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from '../Cubit';
import { useBloc } from '../useBloc';

class CounterCubit extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.patch({ n: this.state.n + 1 });
  }
}

class WithInitCubit extends Cubit<{ name: string }> {
  constructor() {
    super({ name: '' });
  }
  initWithProps(p: unknown) {
    const next = (p as { name?: string })?.name ?? '';
    this.patch({ name: next });
  }
}

blacTestSetup();

describe('shim useBloc', () => {
  it('returns a 2-tuple of [state, bloc] (v1 shape)', () => {
    const { result } = renderHook(() => useBloc(CounterCubit));
    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toEqual({ n: 0 });
    expect(result.current[1]).toBeInstanceOf(CounterCubit);
  });

  it('maps `id` option to v2 `instanceId`', () => {
    const { result: ra } = renderHook(() => useBloc(CounterCubit, { id: 'a' }));
    const { result: rb } = renderHook(() => useBloc(CounterCubit, { id: 'b' }));
    expect(ra.current[1]).not.toBe(rb.current[1]);
  });

  it('maps `dependencySelector` to v2 `dependencies`', () => {
    const selector = vi.fn(() => [] as unknown[]);
    renderHook(() =>
      useBloc(CounterCubit, { id: 'deps', dependencySelector: selector }),
    );
    expect(selector).toHaveBeenCalled();
  });

  it('forwards `onMount`', () => {
    const onMount = vi.fn();
    renderHook(() => useBloc(CounterCubit, { id: 'mount', onMount }));
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it('re-renders when bloc state changes (v2 plumbing intact)', async () => {
    let bloc!: CounterCubit;
    function Comp() {
      const [state, b] = useBloc(CounterCubit, { id: 'rerender' });
      bloc = b as CounterCubit;
      return <span data-testid="n">{state.n}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('n').textContent).toBe('0');
    // v2's channel subscription fires asynchronously via useEffect; use async
    // act to flush all pending effects and state updates.
    await act(async () => {
      bloc.inc();
    });
    expect(screen.getByTestId('n').textContent).toBe('1');
  });

  it('legacy `props` option invokes initWithProps on mount when available', async () => {
    let captured: WithInitCubit | undefined;
    function Comp() {
      // Use the auto-tracked `state` proxy (first tuple element) so the
      // component subscribes to `name` changes and the DOM stays in sync.
      const [state, b] = useBloc(WithInitCubit, {
        id: 'props-init',
        props: { name: 'Bren' },
      });
      captured = b as WithInitCubit;
      return <span data-testid="name">{state.name}</span>;
    }
    render(<Comp />);
    // initWithProps runs in useEffect (mount) and patches state, which fires
    // the channel subscription (also async). Flush two async act rounds: first
    // to drain mount effects (calling initWithProps), then to flush the
    // resulting state-change re-render.
    await act(async () => {});
    await act(async () => {});
    // After effects flush: bloc state and DOM both reflect the patched name.
    expect(captured?.state.name).toBe('Bren');
    expect(screen.getByTestId('name').textContent).toBe('Bren');
  });

  it('legacy `props` option falls back to bloc.props when no initWithProps', () => {
    let captured: CounterCubit | undefined;
    function Comp() {
      const [, b] = useBloc(CounterCubit, {
        id: 'props-fallback',
        props: { foo: 7 },
      });
      captured = b as CounterCubit;
      return null;
    }
    render(<Comp />);
    expect(captured?.props).toEqual({ foo: 7 });
  });
});
