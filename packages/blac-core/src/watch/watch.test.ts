import { describe, it, expect, vi } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import { watch, instance } from './watch';
import { Cubit } from '../core/Cubit';
import { acquire } from '../registry';

interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

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
    return this.state.value + this.counterDep().state.count;
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

    it('should run callback on state changes', () => {
      const counter = acquire(CounterCubit);
      const states: number[] = [];

      watch(CounterCubit, (bloc) => {
        states.push(bloc.state.count);
      });

      expect(states).toEqual([0]);

      counter.increment();
      expect(states).toEqual([0, 1]);

      counter.increment();
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

    it('should track state property access', () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      watch(CounterCubit, (bloc) => {
        callback(bloc.state.count);
      });

      expect(callback).toHaveBeenCalledWith(0);

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(1);
    });

    it('should track getter access', () => {
      const counter = acquire(CounterCubit);
      const values: number[] = [];

      watch(CounterCubit, (bloc) => {
        values.push(bloc.doubled);
      });

      expect(values).toEqual([0]);

      counter.increment();
      expect(values).toEqual([0, 2]);

      counter.increment();
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

    it('should trigger on any bloc change', () => {
      const counter = acquire(CounterCubit);
      const name = acquire(NameCubit);

      const states: Array<[number, string]> = [];
      watch([CounterCubit, NameCubit] as const, ([c, n]) => {
        states.push([c.state.count, n.state.name]);
      });

      expect(states).toEqual([[0, '']]);

      counter.increment();
      expect(states).toEqual([
        [0, ''],
        [1, ''],
      ]);

      name.setName('Alice');
      expect(states).toEqual([
        [0, ''],
        [1, ''],
        [1, 'Alice'],
      ]);
    });
  });

  describe('watch.STOP', () => {
    it('should stop watching when callback returns watch.STOP', () => {
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
      expect(values).toEqual([0, 1]);

      counter.increment(); // count = 2, should STOP
      expect(values).toEqual([0, 1, 2]);

      counter.increment(); // count = 3, should NOT trigger
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
    it('should create a BlocRef with class and instanceId', () => {
      const ref = instance(CounterCubit, 'custom-id');

      expect(ref.blocClass).toBe(CounterCubit);
      expect(ref.instanceId).toBe('custom-id');
    });

    it('should watch specific instance by ID', () => {
      const main = acquire(CounterCubit, 'main');
      const sidebar = acquire(CounterCubit, 'sidebar');

      main.set(10);
      sidebar.set(20);

      const values: number[] = [];
      watch(instance(CounterCubit, 'main'), (bloc) => {
        values.push(bloc.state.count);
      });

      expect(values).toEqual([10]);

      main.increment();
      expect(values).toEqual([10, 11]);

      sidebar.increment(); // Different instance, should not trigger
      expect(values).toEqual([10, 11]);
    });

    it('should watch multiple instances with different IDs', () => {
      const main = acquire(CounterCubit, 'main');
      const sidebar = acquire(CounterCubit, 'sidebar');

      main.set(1);
      sidebar.set(2);

      const states: Array<[number, number]> = [];
      watch(
        [
          instance(CounterCubit, 'main'),
          instance(CounterCubit, 'sidebar'),
        ] as const,
        ([m, s]) => {
          states.push([m.state.count, s.state.count]);
        },
      );

      expect(states).toEqual([[1, 2]]);

      main.increment();
      expect(states.length).toBe(2);
      expect(states[1][0]).toBe(2);

      sidebar.increment();
      expect(states.length).toBe(3);
      expect(states[2][1]).toBe(3);
    });
  });

  describe('cross-bloc dependency tracking', () => {
    it('should track dependencies accessed via getters', () => {
      const counter = acquire(CounterCubit);
      const dependent = acquire(DependentCubit);

      counter.set(10);
      dependent.setValue(5);

      const values: number[] = [];
      watch(DependentCubit, (bloc) => {
        values.push(bloc.combinedValue);
      });

      expect(values).toEqual([15]); // 10 + 5

      counter.increment(); // Should trigger because combinedValue depends on CounterCubit
      expect(values).toEqual([15, 16]); // 11 + 5

      dependent.setValue(10);
      expect(values).toEqual([15, 16, 21]); // 11 + 10
    });
  });

  describe('edge cases', () => {
    it('should handle rapid state changes', () => {
      const counter = acquire(CounterCubit);
      const values: number[] = [];

      watch(CounterCubit, (bloc) => {
        values.push(bloc.state.count);
      });

      for (let i = 0; i < 10; i++) {
        counter.increment();
      }

      expect(values.length).toBe(11); // 1 initial + 10 changes
      expect(values[values.length - 1]).toBe(10);
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
