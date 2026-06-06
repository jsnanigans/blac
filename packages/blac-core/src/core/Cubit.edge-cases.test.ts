import { describe, it, expect, vi } from 'vite-plus/test';
import { blacTestSetup, flush } from '@blac/core/testing';
import { Cubit } from './Cubit';
import { ALL_PATHS } from '@dirtytalk/structural';

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

  it('emit() with same reference does NOT notify listeners', () => {
    const cubit = new CountCubit();
    const sameRef = cubit.state;
    const listener = vi.fn();
    cubit.channel.subscribe(
      () => ALL_PATHS,
      () => listener(cubit.state),
    );
    cubit.emit(sameRef);
    expect(listener).not.toHaveBeenCalled();
  });

  it('emit() with structurally equal value does NOT notify (shallow-equal default)', () => {
    const cubit = new CountCubit();
    const listener = vi.fn();
    cubit.channel.subscribe(
      () => ALL_PATHS,
      () => listener(cubit.state),
    );
    cubit.emit({ ...cubit.state });
    expect(listener).not.toHaveBeenCalled();
  });

  it('emit() notifies when at least one key differs', async () => {
    const cubit = new CountCubit();
    const listener = vi.fn();
    cubit.channel.subscribe(
      () => ALL_PATHS,
      () => listener(cubit.state),
    );
    cubit.emit({ ...cubit.state, count: cubit.state.count + 1 });
    await flush();
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

  it('patch() with nested plain objects deep-merges', () => {
    // `patch` goes through `StructuralContainer.deepMerge`, which recurses
    // into plain-object branches so sibling keys under `a` are preserved:
    // `patch({ a: { x: 99 } })` keeps `a.y` rather than replacing `a`
    // wholesale.
    class NestedCubit extends Cubit<{ a: Record<string, number>; b: number }> {
      constructor() {
        super({ a: { x: 1, y: 2 }, b: 10 });
      }
    }
    const cubit = new NestedCubit();
    cubit.patch({ a: { x: 99 } });
    expect(cubit.state.a).toEqual({ x: 99, y: 2 });
    expect(cubit.state.b).toBe(10);
  });

  it('patch() preserves sibling keys in complex state', () => {
    const cubit = new CountCubit();
    cubit.patch({ count: 42 });
    expect(cubit.state.count).toBe(42);
    expect(cubit.state.label).toBe('');
  });
});
