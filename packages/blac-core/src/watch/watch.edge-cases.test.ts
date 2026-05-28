import { describe, it, expect } from 'vite-plus/test';
import { blacTestSetup, flush } from '@blac/core/testing';
import { watch, instance } from './watch';
import { Cubit } from '../core/Cubit';
import { acquire, release, clearAll } from '../registry';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

class NameCubit extends Cubit<{ name: string }> {
  constructor() {
    super({ name: '' });
  }
}

describe('watch edge cases', () => {
  blacTestSetup();

  it('watch single bloc — callback receives correct state on initial call', async () => {
    const cubit = acquire(CounterCubit);
    const states: number[] = [];
    watch(CounterCubit, (bloc) => {
      states.push(bloc.state.count);
    });
    cubit.emit({ count: 5 });
    await flush();
    expect(states).toEqual([0, 5]);
  });

  it('watch.STOP on first call stops future calls', () => {
    const cubit = acquire(CounterCubit);
    let callCount = 0;
    watch(CounterCubit, () => {
      callCount++;
      return watch.STOP;
    });
    cubit.emit({ count: 1 });
    cubit.emit({ count: 2 });
    expect(callCount).toBe(1);
  });

  it('watch.STOP in multi-bloc watch stops all subscriptions', () => {
    const counter = acquire(CounterCubit);
    const name = acquire(NameCubit);
    let callCount = 0;
    watch([CounterCubit, NameCubit] as const, () => {
      callCount++;
      return watch.STOP;
    });
    counter.emit({ count: 99 });
    name.emit({ name: 'Alice' });
    expect(callCount).toBe(1);
  });

  it('dispose returned from watch() is idempotent', () => {
    acquire(CounterCubit);
    const dispose = watch(CounterCubit, () => {});
    expect(() => {
      dispose();
      dispose();
    }).not.toThrow();
  });

  it('same-value emit does NOT trigger callback', () => {
    const cubit = acquire(CounterCubit);
    let callCount = 0;
    watch(CounterCubit, () => {
      callCount++;
    });
    const initialCount = callCount;
    cubit.emit(cubit.state);
    expect(callCount).toBe(initialCount);
  });

  it('instance(BlocClass, id) targets specific instance', async () => {
    const cubit = acquire(CounterCubit, 'specific');
    const states: number[] = [];
    watch(instance(CounterCubit, 'specific'), (bloc) => {
      states.push(bloc.state.count);
    });
    cubit.emit({ count: 99 });
    await flush();
    expect(states).toContain(99);
  });

  it('watch on disposed bloc causes no crash', () => {
    acquire(CounterCubit);
    release(CounterCubit);
    expect(() => {
      const dispose = watch(CounterCubit, () => {});
      dispose();
    }).not.toThrow();
  });

  it('multi-bloc watch fires once per change', async () => {
    const counter = acquire(CounterCubit);
    const name = acquire(NameCubit);
    let callCount = 0;
    watch([CounterCubit, NameCubit] as const, () => {
      callCount++;
    });
    const before = callCount;
    counter.emit({ count: 5 });
    await flush();
    expect(callCount).toBe(before + 1);
    name.emit({ name: 'Alice' });
    await flush();
    expect(callCount).toBe(before + 2);
  });

  it('rapid emits within one tick coalesce into one watch call', async () => {
    // Renamed from "rapid emits trigger one call per emit (no coalescing)".
    // Post-C0 the channel coalesces synchronous emits into one flush; the
    // pre-C0 contract of one watch call per emit is gone.
    const cubit = acquire(CounterCubit);
    let callCount = 0;
    watch(CounterCubit, () => {
      callCount++;
    });
    const before = callCount;
    cubit.emit({ count: 1 });
    cubit.emit({ count: 2 });
    cubit.emit({ count: 3 });
    await flush();
    expect(callCount).toBe(before + 1);
  });

  it('watch callback accessing getter re-runs on getter dependency change', async () => {
    class ComputedCubit extends Cubit<{ x: number }> {
      constructor() {
        super({ x: 0 });
      }
      get doubled() {
        return this.state.x * 2;
      }
    }
    acquire(ComputedCubit);
    const results: number[] = [];
    watch(ComputedCubit, (bloc) => {
      results.push(bloc.doubled);
    });
    acquire(ComputedCubit).emit({ x: 5 });
    await flush();
    expect(results).toContain(10);
  });

  it('unwatch stops all callbacks', () => {
    const cubit = acquire(CounterCubit);
    let callCount = 0;
    const unwatch = watch(CounterCubit, () => {
      callCount++;
    });
    unwatch();
    const before = callCount;
    cubit.emit({ count: 1 });
    expect(callCount).toBe(before);
  });

  it('clearAll() between watch registration and dispose does not crash', () => {
    acquire(CounterCubit);
    const dispose = watch(CounterCubit, () => {});
    clearAll();
    expect(() => dispose()).not.toThrow();
  });
});
