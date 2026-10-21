import { StrictMode } from 'react';
import { describe, it, expect } from 'vite-plus/test';
import { render, renderHook, act } from '@testing-library/react';
import { blac, Cubit, getAll } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

class FormCubit extends Cubit<{ n: number; label: string }, { label: string }> {
  static key = (a?: { label: string }) => a?.label ?? 'default';
  constructor() {
    super({ n: 0, label: '' });
  }
  protected init(args: { label: string }) {
    this.emit({ n: 0, label: args.label });
  }
  inc() {
    this.emit({ ...this.state, n: this.state.n + 1 });
  }
}

blac({ isolated: true })(FormCubit);

class SharedCubit extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

blacTestSetup();

describe('useBloc — isolated', () => {
  it('gives each mount its own instance, stable across re-renders', () => {
    const a = renderHook(() => useBloc(FormCubit, { args: { label: 'x' } }));
    const b = renderHook(() => useBloc(FormCubit, { args: { label: 'x' } }));
    const first = a.result.current[1];

    a.rerender();

    expect(a.result.current[1]).toBe(first);
    expect(b.result.current[1].$blac.id).not.toBe(first.$blac.id);
    expect(getAll(FormCubit)).toHaveLength(2);
  });

  it('passes the real args to init, not the key', () => {
    const { result } = renderHook(() =>
      useBloc(FormCubit, { args: { label: 'x' } }),
    );

    expect(result.current[0].label).toBe('x');
  });

  it('disposes only the unmounting instance', () => {
    const a = renderHook(() => useBloc(FormCubit, { args: { label: 'x' } }));
    const b = renderHook(() => useBloc(FormCubit, { args: { label: 'x' } }));

    a.unmount();

    expect(getAll(FormCubit).map((i) => i.$blac.id)).toEqual([
      b.result.current[1].$blac.id,
    ]);
  });

  it('does not re-render siblings on another instance change', () => {
    let renders = 0;
    let first!: FormCubit;
    const A = () => {
      first = useBloc(FormCubit, { args: { label: 'x' } })[1];
      return null;
    };
    const B = () => {
      renders++;
      useBloc(FormCubit, { args: { label: 'x' } });
      return null;
    };
    render(
      <>
        <A />
        <B />
      </>,
    );
    const before = renders;

    act(() => first.inc());

    expect(renders).toBe(before);
  });

  it('leaves one instance per mount under StrictMode', () => {
    renderHook(() => useBloc(FormCubit, { args: { label: 'x' } }), {
      wrapper: StrictMode,
    });

    expect(getAll(FormCubit)).toHaveLength(1);
  });

  it('keeps non-isolated classes shared', () => {
    const a = renderHook(() => useBloc(SharedCubit));
    const b = renderHook(() => useBloc(SharedCubit));

    expect(a.result.current[1].$blac.id).toBe(b.result.current[1].$blac.id);
  });
});
