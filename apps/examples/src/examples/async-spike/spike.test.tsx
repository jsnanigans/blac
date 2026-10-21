import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Cubit, StateContainerRegistry, getAll } from '@blac/core';
import { blacTestSetup, withBlocState } from '@blac/core/testing';
import { RegistryProvider, useBloc } from '@blac/react';
import { idle, resource, type AsyncState } from './async';
import { ConsistencyScoreCubit } from './ConsistencyScoreCubit';
import { ConsistencyScoreCubit as SubclassScore } from './ConsistencyScoreCubit.subclass';

blacTestSetup();

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class Probe extends Cubit<{ n: number; slot: AsyncState<number> }> {
  static keepAlive = true;
  calls: { signal: AbortSignal; d: ReturnType<typeof deferred<number>> }[] = [];
  constructor() {
    super({ n: 0, slot: idle() });
  }
  r = resource(
    this,
    'slot',
    (signal) => {
      const d = deferred<number>();
      this.calls.push({ signal, d });
      return d.promise;
    },
    { auto: true },
  );
}

describe('resource', () => {
  it('auto-loads on activation and stores success in the slot', async () => {
    const reg = new StateContainerRegistry();
    const p = reg.acquire(Probe, 'k', { refId: 'a' });
    expect(p.state.slot.status).toBe('loading');
    p.calls[0].d.resolve(7);
    await p.r.load();
    expect(p.state.slot).toEqual({ status: 'success', data: 7 });
  });

  it('is latest-wins: a reload aborts the earlier call and ignores its result', async () => {
    const reg = new StateContainerRegistry();
    const p = reg.acquire(Probe, 'k', { refId: 'a' });
    const second = p.r.reload();
    expect(p.calls[0].signal.aborted).toBe(true);
    p.calls[1].d.resolve(2);
    p.calls[0].d.resolve(1);
    await second;
    expect(p.state.slot.data).toBe(2);
  });

  it('dedupes load() while in flight', () => {
    const reg = new StateContainerRegistry();
    const p = reg.acquire(Probe, 'k', { refId: 'a' });
    void p.r.load();
    void p.r.load();
    expect(p.calls).toHaveLength(1);
  });

  it('aborts in flight on last release and reloads on next activation', () => {
    const reg = new StateContainerRegistry();
    const p = reg.acquire(Probe, 'k', { refId: 'a' });
    reg.release(Probe, 'k', false, 'a');
    expect(p.calls[0].signal.aborted).toBe(true);
    reg.acquire(Probe, 'k', { refId: 'b' });
    expect(p.calls).toHaveLength(2);
    expect(p.calls[1].signal.aborted).toBe(false);
  });

  it('stores errors and keeps prior data', async () => {
    const reg = new StateContainerRegistry();
    const p = reg.acquire(Probe, 'k', { refId: 'a' });
    p.calls[0].d.resolve(1);
    await p.r.load();
    const again = p.r.reload();
    p.calls[1].d.reject(new Error('boom'));
    await again;
    expect(p.state.slot.status).toBe('error');
    expect(p.state.slot.data).toBe(1);
  });
});

describe.each([
  ['helper', ConsistencyScoreCubit],
  ['subclass', SubclassScore],
])('ConsistencyScoreCubit (%s)', (_name, Cls) => {
  it('loads on mount through useBloc, without a mount effect, and tracks the slot', async () => {
    const hook = renderHook(() => {
      const [state] = useBloc(Cls, { args: { userId: 'abcd' } });
      return state.score;
    });
    await act(async () => {});
    expect(hook.result.current).toEqual({
      status: 'success',
      data: { value: 4 },
    });
  });

  it('save() fills the save slot', async () => {
    const hook = renderHook(() => {
      const [state, bloc] = useBloc(Cls, { args: { userId: 'u' } });
      return { save: state.save, bloc };
    });
    await act(() => hook.result.current.bloc.save({ userId: 'u', value: 9 }));
    expect(hook.result.current.save).toEqual({
      status: 'success',
      data: { value: 9 },
    });
  });

  it('can be seeded as error without mocking the service', () => {
    const cubit = withBlocState(Cls, {
      score: { status: 'error', error: new Error('x') },
    });
    expect(cubit.state.score.status).toBe('error');
  });
});

describe('scoped registry', () => {
  it('auto-loads under RegistryProvider and does not leak into the global one', async () => {
    const registry = new StateContainerRegistry();
    const hook = renderHook(
      () => {
        const [state] = useBloc(ConsistencyScoreCubit, {
          args: { userId: 'abc' },
        });
        return state.score;
      },
      {
        wrapper: ({ children }) => (
          <RegistryProvider registry={registry}>{children}</RegistryProvider>
        ),
      },
    );
    await act(async () => {});
    expect(hook.result.current.status).toBe('success');
    expect(getAll(ConsistencyScoreCubit)).toHaveLength(0);
  });
});
