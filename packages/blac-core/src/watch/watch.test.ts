import { describe, it, expect, vi } from 'vite-plus/test';
import { blacTestSetup, flush } from '@blac/core/testing';
import { watch, instance } from './watch';
import { Cubit } from '../core/Cubit';
import { acquire } from '../registry';

interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState, { id?: string }> {
  constructor() {
    super({ count: 0 });
  }

  static key = (a?: { id?: string }) => a?.id ?? 'default';

  increment = () => this.emit({ count: this.state.count + 1 });
  set = (count: number) => this.emit({ count });

  get doubled() {
    return this.state.count * 2;
  }
}

interface NameState {
  name: string;
}

class NameCubit extends Cubit<NameState> {
  constructor() {
    super({ name: '' });
  }

  setName = (name: string) => this.emit({ name });
}

class DependentCubit extends Cubit<{ value: number }> {
  private counterDep = this.depend(CounterCubit);

  constructor() {
    super({ value: 0 });
  }

  get combinedValue() {
    return this.state.value + this.counterDep.untracked().state.count;
  }

  setValue = (value: number) => this.emit({ value });
}

describe('watch', () => {
  blacTestSetup();

  describe('single bloc', () => {
    it('should run callback immediately with bloc instance', () => {
      const counter = acquire(CounterCubit);
      counter.set(5);

      const callback = vi.fn();
      watch(CounterCubit, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          state: { count: 5 },
        }),
      );
    });

    it('should run callback on state changes', async () => {
      const counter = acquire(CounterCubit);
      const states: number[] = [];

      watch(CounterCubit, (bloc) => {
        states.push(bloc.state.count);
      });

      expect(states).toEqual([0]);

      counter.increment();
      await flush();
      expect(states).toEqual([0, 1]);

      counter.increment();
      await flush();
      expect(states).toEqual([0, 1, 2]);
    });

    it('should return a dispose function', () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      const dispose = watch(CounterCubit, callback);

      expect(typeof dispose).toBe('function');

      dispose();

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(1); // Only initial call
    });

    it('should track state property access', async () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      watch(CounterCubit, (bloc) => {
        callback(bloc.state.count);
      });

      expect(callback).toHaveBeenCalledWith(0);

      counter.increment();
      await flush();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(1);
    });

    it('should track getter access', async () => {
      const counter = acquire(CounterCubit);
      const values: number[] = [];

      watch(CounterCubit, (bloc) => {
        values.push(bloc.doubled);
      });

      expect(values).toEqual([0]);

      counter.increment();
      await flush();
      expect(values).toEqual([0, 2]);

      counter.increment();
      await flush();
      expect(values).toEqual([0, 2, 4]);
    });
  });

  describe('multiple blocs', () => {
    it('should watch multiple blocs', () => {
      const _counter = acquire(CounterCubit);
      const _name = acquire(NameCubit);

      const callback = vi.fn();
      watch([CounterCubit, NameCubit] as const, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      const [counterBloc, nameBloc] = callback.mock.calls[0][0];
      expect(counterBloc.state).toEqual({ count: 0 });
      expect(nameBloc.state).toEqual({ name: '' });
    });

    it('should trigger on any bloc change', async () => {
      const counter = acquire(CounterCubit);
      const name = acquire(NameCubit);

      const states: Array<[number, string]> = [];
      watch([CounterCubit, NameCubit] as const, ([c, n]) => {
        states.push([c.state.count, n.state.name]);
      });

      expect(states).toEqual([[0, '']]);

      counter.increment();
      await flush();
      expect(states).toEqual([
        [0, ''],
        [1, ''],
      ]);

      name.setName('Alice');
      await flush();
      expect(states).toEqual([
        [0, ''],
        [1, ''],
        [1, 'Alice'],
      ]);
    });
  });

  describe('watch.STOP', () => {
    it('should stop watching when callback returns watch.STOP', async () => {
      const counter = acquire(CounterCubit);
      const values: number[] = [];

      watch(CounterCubit, (bloc) => {
        values.push(bloc.state.count);
        if (bloc.state.count >= 2) {
          return watch.STOP;
        }
      });

      expect(values).toEqual([0]);

      counter.increment(); // count = 1
      await flush();
      expect(values).toEqual([0, 1]);

      counter.increment(); // count = 2, should STOP
      await flush();
      expect(values).toEqual([0, 1, 2]);

      counter.increment(); // count = 3, should NOT trigger
      await flush();
      expect(values).toEqual([0, 1, 2]);
    });

    it('should stop immediately if initial state matches condition', () => {
      const counter = acquire(CounterCubit);
      counter.set(5);

      const callback = vi.fn();

      watch(CounterCubit, (bloc) => {
        callback(bloc.state.count);
        if (bloc.state.count >= 5) {
          return watch.STOP;
        }
      });

      expect(callback).toHaveBeenCalledTimes(1);

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(1); // No more calls
    });
  });

  describe('instance() utility', () => {
    it('should create a BlocRef with class and resolved key', () => {
      const ref = instance(CounterCubit, { id: 'custom-id' });

      expect(ref.blocClass).toBe(CounterCubit);
      expect(ref.instanceId).toBe('custom-id');
    });

    it('should watch specific instance by args', async () => {
      const main = acquire(CounterCubit, { args: { id: 'main' } });
      const sidebar = acquire(CounterCubit, { args: { id: 'sidebar' } });

      main.set(10);
      sidebar.set(20);
      await flush(); // drain pre-watch emit flushes

      const values: number[] = [];
      watch(instance(CounterCubit, { id: 'main' }), (bloc) => {
        values.push(bloc.state.count);
      });

      expect(values).toEqual([10]);

      main.increment();
      await flush();
      expect(values).toEqual([10, 11]);

      sidebar.increment(); // Different instance, should not trigger
      await flush();
      expect(values).toEqual([10, 11]);
    });

    it('should watch multiple instances with different IDs', async () => {
      const main = acquire(CounterCubit, { args: { id: 'main' } });
      const sidebar = acquire(CounterCubit, { args: { id: 'sidebar' } });

      main.set(1);
      sidebar.set(2);
      await flush(); // drain pending flushes from set() so watch starts clean

      const states: Array<[number, number]> = [];
      watch(
        [
          instance(CounterCubit, { id: 'main' }),
          instance(CounterCubit, { id: 'sidebar' }),
        ] as const,
        ([m, s]) => {
          states.push([m.state.count, s.state.count]);
        },
      );

      expect(states).toEqual([[1, 2]]);

      main.increment();
      await flush();
      expect(states.length).toBe(2);
      expect(states[1][0]).toBe(2);

      sidebar.increment();
      await flush();
      expect(states.length).toBe(3);
      expect(states[2][1]).toBe(3);
    });
  });

  describe('cross-bloc dependency tracking', () => {
    // Deleted: "should track dependencies accessed via getters". Pre-C3,
    // `tracking/` auto-subscribed `watch` callbacks to any dep accessed via
    // a `this.depend()` getter. Post-C3 the tracking module is gone (per
    // refactor!(blac-core): rewire watch on channel; remove tracking/) and
    // `depend()` explicitly does NOT auto-subscribe. Consumers that need
    // reactive dep updates must `watch([Owner, Dep])` explicitly. The
    // public API contract is now documented on `StateContainer.depend`.
    it('does NOT auto-subscribe to deps accessed via getters', async () => {
      const counter = acquire(CounterCubit);
      const dependent = acquire(DependentCubit);

      counter.set(10);
      dependent.setValue(5);
      // Drain the pending channel-flushes from the initial set/setValue
      // so the watch subscriber doesn't fire on them.
      await flush();

      const values: number[] = [];
      watch(DependentCubit, (bloc) => {
        values.push(bloc.combinedValue);
      });

      expect(values).toEqual([15]); // initial synchronous fire

      counter.increment(); // depend() is no longer reactive
      await flush();
      expect(values).toEqual([15]);

      dependent.setValue(10);
      await flush();
      expect(values).toEqual([15, 21]);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid state changes', async () => {
      const counter = acquire(CounterCubit);
      const values: number[] = [];

      watch(CounterCubit, (bloc) => {
        values.push(bloc.state.count);
      });

      for (let i = 0; i < 10; i++) {
        counter.increment();
      }
      await flush();

      // Channel-flush coalesces all 10 synchronous emits into one fire.
      // Pre-C0/C3 expected 11 callback invocations (1 initial + 10).
      expect(values.length).toBe(2);
      expect(values[0]).toBe(0);
      expect(values[1]).toBe(10);
    });

    it('should create instance if not exists', () => {
      const values: number[] = [];
      watch(CounterCubit, (bloc) => {
        values.push(bloc.state.count);
      });

      expect(values).toEqual([0]);
    });

    it('should be safe to call dispose multiple times', () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      const dispose = watch(CounterCubit, callback);

      dispose();
      dispose();
      dispose();

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
