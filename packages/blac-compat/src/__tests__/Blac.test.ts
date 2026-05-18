import { describe, it, expect, vi } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { hasInstance, getRefCount } from '@blac/core';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

class CounterCubit extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
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

class KeepAliveCubit extends Cubit<{ n: number }> {
  static keepAlive = true;
  constructor() {
    super({ n: 0 });
  }
}

blacTestSetup();

describe('Blac façade', () => {
  it('getBloc returns an instance and registers it under the default key', () => {
    const inst = Blac.getBloc(CounterCubit);
    expect(inst).toBeInstanceOf(CounterCubit);
    expect(hasInstance(CounterCubit, 'default')).toBe(true);
  });

  it('getBloc with `id` keys the instance separately', () => {
    const a = Blac.getBloc(CounterCubit, { id: 'a' });
    const b = Blac.getBloc(CounterCubit, { id: 'b' });
    expect(a).not.toBe(b);
    expect(hasInstance(CounterCubit, 'a')).toBe(true);
    expect(hasInstance(CounterCubit, 'b')).toBe(true);
  });

  it('getBloc does not add a ref (ensure semantics)', () => {
    Blac.getBloc(CounterCubit, { id: 'no-ref' });
    expect(getRefCount(CounterCubit, 'no-ref')).toBe(0);
  });

  it('getBloc with `props` and an initWithProps method forwards to it', () => {
    const inst = Blac.getBloc(WithInitCubit, { props: { name: 'Bren' } });
    expect(inst.state.name).toBe('Bren');
  });

  it('getBloc with `props` and no initWithProps falls back to `.props`', () => {
    const inst = Blac.getBloc(CounterCubit, {
      id: 'props-fallback',
      props: { foo: 1 },
    });
    expect(inst.props).toEqual({ foo: 1 });
  });

  it('getBloc applies static keepAlive once per class', () => {
    Blac.getBloc(KeepAliveCubit);
    expect((KeepAliveCubit as { keepAlive?: boolean }).keepAlive).toBe(true);
  });

  it('getAllBlocs returns every registered instance for the class', () => {
    Blac.getBloc(CounterCubit, { id: 'one' });
    Blac.getBloc(CounterCubit, { id: 'two' });
    const all = Blac.getAllBlocs(CounterCubit);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('vi.spyOn(Blac, "getBloc") still works (bound method)', () => {
    const spy = vi.spyOn(Blac, 'getBloc');
    Blac.getBloc(CounterCubit, { id: 'spied' });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('resetInstance clears the registry', () => {
    Blac.getBloc(CounterCubit, { id: 'transient' });
    expect(hasInstance(CounterCubit, 'transient')).toBe(true);
    Blac.resetInstance();
    expect(hasInstance(CounterCubit, 'transient')).toBe(false);
  });
});
