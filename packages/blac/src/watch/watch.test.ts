import { describe, it, expect, beforeEach, vi } from 'vitest';
import { watch, instance } from './watch';
import { Cubit } from '../core/Cubit';
import { clearAll, acquire } from '../registry';

interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  set = (count: number) => this.emit({ count });
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

describe('watch', () => {
  beforeEach(() => {
    clearAll();
  });

  describe('basic functionality', () => {
    it('should run callback immediately with current states', () => {
      const counter = acquire(CounterCubit);
      counter.set(5);

      const callback = vi.fn();
      watch([CounterCubit] as const, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([{ count: 5 }]);
    });

    it('should run callback on state changes', () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      watch([CounterCubit] as const, callback);
      expect(callback).toHaveBeenCalledTimes(1);

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith([{ count: 1 }]);

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenLastCalledWith([{ count: 2 }]);
    });

    it('should return a dispose function', () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      const dispose = watch([CounterCubit] as const, callback);

      expect(typeof dispose).toBe('function');

      dispose();

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(1); // Only initial call
    });
  });

  describe('multiple blocs', () => {
    it('should watch multiple blocs', () => {
      const counter = acquire(CounterCubit);
      const name = acquire(NameCubit);

      const callback = vi.fn();
      watch([CounterCubit, NameCubit] as const, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([{ count: 0 }, { name: '' }]);
    });

    it('should trigger on any bloc change', () => {
      const counter = acquire(CounterCubit);
      const name = acquire(NameCubit);

      const callback = vi.fn();
      watch([CounterCubit, NameCubit] as const, callback);

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith([{ count: 1 }, { name: '' }]);

      name.setName('Alice');
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenLastCalledWith([{ count: 1 }, { name: 'Alice' }]);
    });

    it('should provide all current states on each trigger', () => {
      const counter = acquire(CounterCubit);
      const name = acquire(NameCubit);

      counter.set(10);
      name.setName('Bob');

      const states: Array<[CounterState, NameState]> = [];
      watch([CounterCubit, NameCubit] as const, ([c, n]) => {
        states.push([c, n]);
      });

      expect(states[0]).toEqual([{ count: 10 }, { name: 'Bob' }]);

      counter.increment();
      expect(states[1]).toEqual([{ count: 11 }, { name: 'Bob' }]);
    });
  });

  describe('watch.STOP', () => {
    it('should stop watching when callback returns watch.STOP', () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      watch([CounterCubit] as const, ([state]) => {
        callback(state);
        if (state.count >= 2) {
          return watch.STOP;
        }
      });

      expect(callback).toHaveBeenCalledTimes(1); // Initial

      counter.increment(); // count = 1
      expect(callback).toHaveBeenCalledTimes(2);

      counter.increment(); // count = 2, should STOP
      expect(callback).toHaveBeenCalledTimes(3);

      counter.increment(); // count = 3, should NOT trigger
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should stop immediately if initial state matches condition', () => {
      const counter = acquire(CounterCubit);
      counter.set(5);

      const callback = vi.fn();

      watch([CounterCubit] as const, ([state]) => {
        callback(state);
        if (state.count >= 5) {
          return watch.STOP;
        }
      });

      expect(callback).toHaveBeenCalledTimes(1);

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(1); // No more calls
    });
  });

  describe('manual dispose', () => {
    it('should stop watching when dispose is called', () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      const dispose = watch([CounterCubit] as const, callback);

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(2);

      dispose();

      counter.increment();
      counter.increment();
      expect(callback).toHaveBeenCalledTimes(2); // No more calls
    });

    it('should be safe to call dispose multiple times', () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      const dispose = watch([CounterCubit] as const, callback);

      dispose();
      dispose();
      dispose();

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(1);
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

      const callback = vi.fn();
      watch([instance(CounterCubit, 'main')] as const, callback);

      expect(callback).toHaveBeenCalledWith([{ count: 10 }]);

      main.increment();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith([{ count: 11 }]);

      sidebar.increment(); // Different instance, should not trigger
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should watch multiple instances with different IDs', () => {
      const main = acquire(CounterCubit, 'main');
      const sidebar = acquire(CounterCubit, 'sidebar');

      main.set(1);
      sidebar.set(2);

      const callback = vi.fn();
      watch(
        [instance(CounterCubit, 'main'), instance(CounterCubit, 'sidebar')] as const,
        callback,
      );

      expect(callback).toHaveBeenCalledWith([{ count: 1 }, { count: 2 }]);

      main.increment();
      expect(callback).toHaveBeenLastCalledWith([{ count: 2 }, { count: 2 }]);

      sidebar.increment();
      expect(callback).toHaveBeenLastCalledWith([{ count: 2 }, { count: 3 }]);
    });

    it('should work with mixed instance() and bare class', () => {
      const customCounter = acquire(CounterCubit, 'custom');
      const defaultName = acquire(NameCubit);

      customCounter.set(100);
      defaultName.setName('Test');

      const callback = vi.fn();
      watch(
        [instance(CounterCubit, 'custom'), NameCubit] as const,
        callback,
      );

      expect(callback).toHaveBeenCalledWith([{ count: 100 }, { name: 'Test' }]);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid state changes', () => {
      const counter = acquire(CounterCubit);
      const callback = vi.fn();

      watch([CounterCubit] as const, callback);

      for (let i = 0; i < 100; i++) {
        counter.increment();
      }

      expect(callback).toHaveBeenCalledTimes(101); // 1 initial + 100 changes
      expect(callback).toHaveBeenLastCalledWith([{ count: 100 }]);
    });

    it('should not trigger after dispose even if state changes during callback', () => {
      const counter = acquire(CounterCubit);
      let disposeRef: (() => void) | null = null;
      const callback = vi.fn(([state]: [CounterState]) => {
        if (state.count === 1 && disposeRef) {
          disposeRef();
        }
      });

      disposeRef = watch([CounterCubit] as const, callback);

      counter.increment(); // This triggers dispose inside callback
      expect(callback).toHaveBeenCalledTimes(2);

      counter.increment();
      expect(callback).toHaveBeenCalledTimes(2); // No more calls
    });

    it('should create instance if not exists', () => {
      const callback = vi.fn();
      watch([CounterCubit] as const, callback);

      expect(callback).toHaveBeenCalledWith([{ count: 0 }]);
    });

    it('should handle empty initial state correctly', () => {
      const callback = vi.fn();

      watch([CounterCubit, NameCubit] as const, callback);

      expect(callback).toHaveBeenCalledWith([{ count: 0 }, { name: '' }]);
    });
  });
});
