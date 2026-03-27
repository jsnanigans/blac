import { describe, it, expect, vi } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from './Cubit';

class CountCubit extends Cubit<{ count: number; label: string }> {
  constructor() {
    super({ count: 0, label: '' });
  }
}

describe('Cubit edge cases', () => {
  blacTestSetup();

  it('patch() merges partial state, leaves other fields unchanged', () => {
    const cubit = new CountCubit();
    cubit.patch({ count: 5 });
    expect(cubit.state.count).toBe(5);
    expect(cubit.state.label).toBe('');
  });

  it('patch() on disposed cubit throws', () => {
    const cubit = new CountCubit();
    cubit.dispose();
    expect(() => cubit.patch({ count: 1 })).toThrow();
  });

  it('update() returning same reference does NOT notify listeners', () => {
    const cubit = new CountCubit();
    const listener = vi.fn();
    cubit.subscribe(listener);
    cubit.update((s) => s);
    expect(listener).not.toHaveBeenCalled();
  });

  it('emit() with same reference does NOT notify listeners', () => {
    const cubit = new CountCubit();
    const sameRef = cubit.state;
    const listener = vi.fn();
    cubit.subscribe(listener);
    cubit.emit(sameRef);
    expect(listener).not.toHaveBeenCalled();
  });

  it('emit() with different reference but equal value DOES notify', () => {
    const cubit = new CountCubit();
    const listener = vi.fn();
    cubit.subscribe(listener);
    cubit.emit({ ...cubit.state });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('sequential emits — state is always the last emitted value', () => {
    const cubit = new CountCubit();
    cubit.emit({ count: 1, label: 'a' });
    cubit.emit({ count: 2, label: 'b' });
    cubit.emit({ count: 3, label: 'c' });
    expect(cubit.state).toEqual({ count: 3, label: 'c' });
  });

  it('initial state is accessible synchronously after construction', () => {
    const cubit = new CountCubit();
    expect(cubit.state).toEqual({ count: 0, label: '' });
  });

  it('patch() with nested objects is shallow merge only', () => {
    class NestedCubit extends Cubit<{ a: Record<string, number>; b: number }> {
      constructor() {
        super({ a: { x: 1, y: 2 }, b: 10 });
      }
    }
    const cubit = new NestedCubit();
    cubit.patch({ a: { x: 99 } });
    expect(cubit.state.a).toEqual({ x: 99 });
    expect(cubit.state.b).toBe(10);
  });

  it('patch() preserves sibling keys in complex state', () => {
    const cubit = new CountCubit();
    cubit.patch({ count: 42 });
    expect(cubit.state.count).toBe(42);
    expect(cubit.state.label).toBe('');
  });
});
