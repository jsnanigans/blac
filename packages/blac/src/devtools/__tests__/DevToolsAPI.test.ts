import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DevToolsAPI } from '../DevToolsAPI';
import { StateContainer } from '../../core/StateContainer';
import { Cubit } from '../../core/Cubit';

describe('DevToolsAPI', () => {
  let api: DevToolsAPI;

  beforeEach(() => {
    // Clear any existing instances
    StateContainer.clearAllInstances();

    // Get fresh API instance and clear its cache
    api = DevToolsAPI.getInstance();
    api.setEnabled(false); // Disable to clear cache
    api.setEnabled(true);  // Re-enable for testing
  });

  afterEach(() => {
    // Clean up
    StateContainer.clearAllInstances();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const api1 = DevToolsAPI.getInstance();
      const api2 = DevToolsAPI.getInstance();
      expect(api1).toBe(api2);
    });
  });

  describe('instance tracking', () => {
    it('should track created instances', () => {
      class TestCubit extends Cubit<number> {}

      const cubit = new TestCubit(0);
      const instances = api.getInstances();

      expect(instances).toHaveLength(1);
      expect(instances[0].className).toBe('TestCubit');
      expect(instances[0].state).toBe(0);
      expect(instances[0].isDisposed).toBe(false);
    });

    it('should track multiple instances', () => {
      class CounterCubit extends Cubit<number> {}
      class UserCubit extends Cubit<{ name: string }> {}

      const counter1 = CounterCubit.resolve('counter1', 0);
      const counter2 = CounterCubit.resolve('counter2', 10);
      const user = UserCubit.resolve('main', { name: 'John' });

      const instances = api.getInstances();

      expect(instances).toHaveLength(3);

      const counterInstances = instances.filter(i => i.className === 'CounterCubit');
      expect(counterInstances).toHaveLength(2);

      const userInstances = instances.filter(i => i.className === 'UserCubit');
      expect(userInstances).toHaveLength(1);
      expect(userInstances[0].state).toEqual({ name: 'John' });
    });

    it('should track instance disposal', () => {
      class TestCubit extends Cubit<number> {}

      const cubit = new TestCubit(0);
      expect(api.getInstances()).toHaveLength(1);

      cubit.dispose();

      // After disposal, the instance should be removed from cache
      const instances = api.getInstances();
      expect(instances).toHaveLength(0);
    });
  });

  describe('event subscriptions', () => {
    it('should notify subscribers of instance creation', (done) => {
      class TestCubit extends Cubit<number> {}

      const unsubscribe = api.subscribe((event) => {
        expect(event.type).toBe('instance-created');
        expect(event.data.className).toBe('TestCubit');
        expect(event.data.state).toBe(42);
        unsubscribe();
        done();
      });

      const cubit = new TestCubit(42);
    });

    it('should notify subscribers of state updates', (done) => {
      class TestCubit extends Cubit<number> {}

      const cubit = new TestCubit(0);

      const unsubscribe = api.subscribe((event) => {
        if (event.type === 'instance-updated') {
          expect(event.data.state).toBe(100);
          unsubscribe();
          done();
        }
      });

      cubit.emit(100);
    });

    it('should notify subscribers of instance disposal', (done) => {
      class TestCubit extends Cubit<number> {}

      const cubit = new TestCubit(0);

      const unsubscribe = api.subscribe((event) => {
        if (event.type === 'instance-disposed') {
          expect(event.data.isDisposed).toBe(true);
          unsubscribe();
          done();
        }
      });

      cubit.dispose();
    });

    it('should handle multiple subscribers', () => {
      const events1: any[] = [];
      const events2: any[] = [];

      const unsub1 = api.subscribe(e => events1.push(e));
      const unsub2 = api.subscribe(e => events2.push(e));

      class TestCubit extends Cubit<number> {}
      const cubit = new TestCubit(0);

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);

      unsub1();
      unsub2();
    });
  });

  describe('state serialization', () => {
    it('should serialize primitive types', () => {
      class TestCubit extends Cubit<any> {}

      const cubit = new TestCubit({
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
      });

      const instances = api.getInstances();
      expect(instances[0].state).toEqual({
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
      });
    });

    it('should handle circular references', () => {
      class TestCubit extends Cubit<any> {}

      const obj: any = { name: 'circular' };
      obj.self = obj;

      const cubit = new TestCubit(obj);
      const instances = api.getInstances();

      expect(instances[0].state.name).toBe('circular');
      expect(instances[0].state.self).toEqual({ __circular: true });
    });

    it('should serialize functions as placeholders', () => {
      class TestCubit extends Cubit<any> {}

      const cubit = new TestCubit({
        method: function namedFunction() {},
        arrow: () => {},
      });

      const instances = api.getInstances();
      expect(instances[0].state.method).toEqual({
        __function: true,
        name: 'namedFunction',
      });
      expect(instances[0].state.arrow).toEqual({
        __function: true,
        name: 'arrow',
      });
    });

    it('should serialize special types', () => {
      class TestCubit extends Cubit<any> {}

      const date = new Date('2025-01-01');
      const regex = /test/gi;
      const map = new Map([['key', 'value']]);
      const set = new Set([1, 2, 3]);

      const cubit = new TestCubit({
        date,
        regex,
        map,
        set,
      });

      const instances = api.getInstances();
      const state = instances[0].state;

      expect(state.date).toEqual({
        __date: true,
        value: date.toISOString(),
      });
      expect(state.regex).toEqual({
        __regex: true,
        source: 'test',
        flags: 'gi',
      });
      expect(state.map).toEqual({
        __map: true,
        entries: [['key', 'value']],
      });
      expect(state.set).toEqual({
        __set: true,
        values: [1, 2, 3],
      });
    });

    it('should truncate large arrays', () => {
      class TestCubit extends Cubit<any> {}

      const largeArray = Array(200).fill(0).map((_, i) => i);
      const cubit = new TestCubit({ array: largeArray });

      const instances = api.getInstances();
      const state = instances[0].state;

      expect(state.array).toHaveLength(101); // 100 items + truncation marker
      expect(state.array[100]).toEqual({
        __truncated: true,
        totalLength: 200,
      });
    });

    it('should handle deep nesting with depth limit', () => {
      class TestCubit extends Cubit<any> {}

      let obj: any = { value: 'bottom' };
      for (let i = 0; i < 30; i++) {
        obj = { nested: obj };
      }

      const cubit = new TestCubit(obj);
      const instances = api.getInstances();

      // Check that it doesn't crash and truncates at max depth
      let current = instances[0].state;
      let depth = 0;
      while (current.nested && depth < 25) {
        current = current.nested;
        depth++;
      }
      expect(depth).toBeLessThanOrEqual(21); // Allow one extra for the check
    });
  });

  describe('enabled state', () => {
    it('should not track when disabled', () => {
      api.setEnabled(false);

      class TestCubit extends Cubit<number> {}
      const cubit = new TestCubit(0);

      const instances = api.getInstances();
      expect(instances).toHaveLength(0);
    });

    it('should not emit events when disabled', () => {
      const events: any[] = [];
      const unsub = api.subscribe(e => events.push(e));

      api.setEnabled(false);

      class TestCubit extends Cubit<number> {}
      const cubit = new TestCubit(0);
      cubit.emit(100);
      cubit.dispose();

      expect(events).toHaveLength(0);
      unsub();
    });

    it('should clear data when disabled', () => {
      class TestCubit extends Cubit<number> {}
      const cubit = new TestCubit(0);

      expect(api.getInstances()).toHaveLength(1);

      api.setEnabled(false);
      expect(api.getInstances()).toHaveLength(0);
    });
  });

  describe('version', () => {
    it('should return version string', () => {
      expect(api.getVersion()).toBe('1.0.0');
    });
  });
});