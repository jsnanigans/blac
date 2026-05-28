import { describe, it, expect, vi, afterEach } from 'vite-plus/test';
import { blacTestSetup, flush } from '@blac/core/testing';
import { Cubit } from './Cubit';
import { ensure } from '../registry';
import { configureBlac, resetBlacConfig, shallowEqualState } from '../config';
import { blac } from '../decorators';

class CounterCubit extends Cubit<{ count: number; label: string }> {
  constructor() {
    super({ count: 0, label: 'a' });
  }
}

class PrimitiveCubit extends Cubit<any> {
  constructor() {
    super(0 as any);
  }
}

describe('StateContainer shallow-equal short-circuit', () => {
  blacTestSetup();

  afterEach(() => {
    resetBlacConfig();
  });

  it('skips notify when emit() passes a structurally equal object', () => {
    const c = ensure(CounterCubit);
    const listener = vi.fn();
    c.subscribe(listener);

    c.emit({ ...c.state });
    c.emit({ count: 0, label: 'a' });

    expect(listener).not.toHaveBeenCalled();
    expect(c.state).toEqual({ count: 0, label: 'a' });
  });

  it('proceeds when at least one key differs', async () => {
    const c = ensure(CounterCubit);
    const listener = vi.fn();
    c.subscribe(listener);

    c.emit({ ...c.state, count: 1 });
    await flush();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(c.state).toEqual({ count: 1, label: 'a' });
  });

  it('uses custom equality from configureBlac', () => {
    const equality = vi.fn(() => true);
    configureBlac({ equality });

    const c = ensure(CounterCubit);
    const listener = vi.fn();
    c.subscribe(listener);

    c.emit({ count: 999, label: 'z' });

    expect(equality).toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(c.state).toEqual({ count: 0, label: 'a' });
  });

  it('per-class @blac equality overrides the global config', async () => {
    const globalEq = vi.fn(() => true);
    const perClassEq = vi.fn(() => false);
    configureBlac({ equality: globalEq });

    @blac({ equality: perClassEq })
    class OverrideCubit extends Cubit<{ n: number }> {
      constructor() {
        super({ n: 0 });
      }
    }

    const c = ensure(OverrideCubit);
    const listener = vi.fn();
    c.subscribe(listener);

    c.emit({ n: 0 });
    await flush();

    expect(perClassEq).toHaveBeenCalled();
    expect(globalEq).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('shallowEqualState returns false for primitives that differ', () => {
    expect(shallowEqualState(1, 2)).toBe(false);
    expect(shallowEqualState('a', 'b')).toBe(false);
  });

  it('shallowEqualState handles same-reference and null', () => {
    const obj = { a: 1 };
    expect(shallowEqualState(obj, obj)).toBe(true);
    expect(shallowEqualState(null, null)).toBe(true);
    expect(shallowEqualState(null, { a: 1 })).toBe(false);
    expect(shallowEqualState({ a: 1 }, null)).toBe(false);
  });

  it('primitive Cubit state still emits on equal primitive (falls through to false)', async () => {
    const c = ensure(PrimitiveCubit);
    const listener = vi.fn();
    c.subscribe(listener);

    // 0 -> 0 still bails because of the `===` early return, not shallowEqualState
    c.emit(0);
    await flush();
    expect(listener).not.toHaveBeenCalled();

    // Different primitive value proceeds
    c.emit(1);
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('patch() pre-spread skip still fires for no-op patches', () => {
    const c = ensure(CounterCubit);
    const listener = vi.fn();
    c.subscribe(listener);
    const before = c.state;

    c.patch({ count: 0 });

    expect(listener).not.toHaveBeenCalled();
    // Verify no allocation happened (state ref unchanged)
    expect(c.state).toBe(before);
  });
});
