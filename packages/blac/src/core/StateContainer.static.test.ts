/**
 * Unit tests for StateContainer static instance management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateContainer } from './StateContainer';

// Test implementations
class SimpleCounter extends StateContainer<number> {
  constructor(initialValue: number = 0) {
    super(initialValue);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };
}

class CounterWithConfig extends StateContainer<number> {
  constructor(initialValue: number = 0, keepAlive?: boolean) {
    super(initialValue, {
      keepAlive: keepAlive ?? false,
    });
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

class ComplexState extends StateContainer<{ count: number; message: string }> {
  constructor(initialCount: number = 0, initialMessage: string = 'hello') {
    super({ count: initialCount, message: initialMessage });
  }

  increment = () => {
    this.update((state) => ({ ...state, count: state.count + 1 }));
  };

  setMessage = (message: string) => {
    this.update((state) => ({ ...state, message }));
  };
}

describe('StateContainer Static Instance Management', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
  });

  afterEach(() => {
    StateContainer.clearAllInstances();
  });

  describe('getOrCreate', () => {
    it('should create a new instance using className as default key', () => {
      const counter = SimpleCounter.getOrCreate();

      expect(counter).toBeInstanceOf(SimpleCounter);
      expect(counter.state).toBe(0);
      expect(SimpleCounter.hasInstance()).toBe(true);
      expect(SimpleCounter.hasInstance('SimpleCounter')).toBe(true);
    });

    it('should return same instance when called without key multiple times', () => {
      const counter1 = SimpleCounter.getOrCreate();
      const counter2 = SimpleCounter.getOrCreate();

      expect(counter1).toBe(counter2);
      expect(SimpleCounter.getRefCount()).toBe(2);
    });

    it('should create a new instance when called for the first time with custom key', () => {
      const counter = SimpleCounter.getOrCreate('test1');

      expect(counter).toBeInstanceOf(SimpleCounter);
      expect(counter.state).toBe(0);
      expect(SimpleCounter.hasInstance('test1')).toBe(true);
    });

    it('should return the same instance when called with the same key', () => {
      const counter1 = SimpleCounter.getOrCreate('test2');
      const counter2 = SimpleCounter.getOrCreate('test2');

      expect(counter1).toBe(counter2);
      expect(SimpleCounter.getRefCount('test2')).toBe(2);
    });

    it('should create different instances for different keys', () => {
      const counter1 = SimpleCounter.getOrCreate('key1');
      const counter2 = SimpleCounter.getOrCreate('key2');

      expect(counter1).not.toBe(counter2);
      expect(SimpleCounter.hasInstance('key1')).toBe(true);
      expect(SimpleCounter.hasInstance('key2')).toBe(true);
    });

    it('should keep default instance separate from custom-keyed instances', () => {
      const defaultCounter = SimpleCounter.getOrCreate();
      const customCounter = SimpleCounter.getOrCreate('custom');

      expect(defaultCounter).not.toBe(customCounter);
      expect(SimpleCounter.hasInstance()).toBe(true);
      expect(SimpleCounter.hasInstance('custom')).toBe(true);

      defaultCounter.increment();
      expect(defaultCounter.state).toBe(1);
      expect(customCounter.state).toBe(0);
    });

    it('should pass constructor arguments correctly', () => {
      const counter = SimpleCounter.getOrCreate('with-args', 10);

      expect(counter.state).toBe(10);
    });

    it('should pass multiple constructor arguments', () => {
      const complex = ComplexState.getOrCreate('complex', 5, 'world');

      expect(complex.state).toEqual({ count: 5, message: 'world' });
    });

    it('should handle instances from different classes separately', () => {
      const simple = SimpleCounter.getOrCreate('shared-key');
      const complex = ComplexState.getOrCreate('shared-key');

      expect(simple).not.toBe(complex);
      expect(simple).toBeInstanceOf(SimpleCounter);
      expect(complex).toBeInstanceOf(ComplexState);
    });

    it('should increment ref count on each call', () => {
      expect(SimpleCounter.getRefCount('ref-test')).toBe(0);

      SimpleCounter.getOrCreate('ref-test');
      expect(SimpleCounter.getRefCount('ref-test')).toBe(1);

      SimpleCounter.getOrCreate('ref-test');
      expect(SimpleCounter.getRefCount('ref-test')).toBe(2);

      SimpleCounter.getOrCreate('ref-test');
      expect(SimpleCounter.getRefCount('ref-test')).toBe(3);
    });
  });

  describe('release', () => {
    it('should release default instance when no key provided', () => {
      SimpleCounter.getOrCreate();
      SimpleCounter.getOrCreate();
      expect(SimpleCounter.getRefCount()).toBe(2);

      SimpleCounter.release();
      expect(SimpleCounter.getRefCount()).toBe(1);
      expect(SimpleCounter.hasInstance()).toBe(true);

      SimpleCounter.release();
      expect(SimpleCounter.hasInstance()).toBe(false);
    });

    it('should decrement ref count when called with key', () => {
      SimpleCounter.getOrCreate('release-test');
      SimpleCounter.getOrCreate('release-test');
      expect(SimpleCounter.getRefCount('release-test')).toBe(2);

      SimpleCounter.release('release-test');
      expect(SimpleCounter.getRefCount('release-test')).toBe(1);
      expect(SimpleCounter.hasInstance('release-test')).toBe(true);
    });

    it('should dispose instance when ref count reaches zero', () => {
      const counter = SimpleCounter.getOrCreate('dispose-test');
      expect(counter.isDisposed).toBe(false);

      SimpleCounter.release('dispose-test');

      expect(SimpleCounter.hasInstance('dispose-test')).toBe(false);
      expect(counter.isDisposed).toBe(true);
    });

    it('should handle multiple releases correctly', () => {
      SimpleCounter.getOrCreate('multi-release');
      SimpleCounter.getOrCreate('multi-release');
      SimpleCounter.getOrCreate('multi-release');

      expect(SimpleCounter.getRefCount('multi-release')).toBe(3);

      SimpleCounter.release('multi-release');
      expect(SimpleCounter.getRefCount('multi-release')).toBe(2);

      SimpleCounter.release('multi-release');
      expect(SimpleCounter.getRefCount('multi-release')).toBe(1);

      SimpleCounter.release('multi-release');
      expect(SimpleCounter.hasInstance('multi-release')).toBe(false);
    });

    it('should not dispose keepAlive instances when ref count reaches zero', () => {
      const counter = CounterWithConfig.getOrCreate('keepalive', 0, true);

      CounterWithConfig.release('keepalive');

      expect(CounterWithConfig.hasInstance('keepalive')).toBe(true);
      expect(counter.isDisposed).toBe(false);
      expect(CounterWithConfig.getRefCount('keepalive')).toBe(0);

      // Cleanup
      CounterWithConfig.release('keepalive', true);
    });

    it('should force dispose when forceDispose is true', () => {
      SimpleCounter.getOrCreate('force-dispose');
      SimpleCounter.getOrCreate('force-dispose');
      SimpleCounter.getOrCreate('force-dispose');

      expect(SimpleCounter.getRefCount('force-dispose')).toBe(3);

      SimpleCounter.release('force-dispose', true);

      expect(SimpleCounter.hasInstance('force-dispose')).toBe(false);
      expect(SimpleCounter.getRefCount('force-dispose')).toBe(0);
    });

    it('should handle releasing non-existent instances gracefully', () => {
      expect(() => {
        SimpleCounter.release('non-existent');
      }).not.toThrow();

      expect(SimpleCounter.getRefCount('non-existent')).toBe(0);
    });

    it('should handle multiple releases beyond zero gracefully', () => {
      const counter = SimpleCounter.getOrCreate('over-release');

      SimpleCounter.release('over-release');
      expect(SimpleCounter.hasInstance('over-release')).toBe(false);

      // Should not throw when releasing again
      expect(() => {
        SimpleCounter.release('over-release');
      }).not.toThrow();
    });
  });

  describe('hasInstance', () => {
    it('should return false for non-existent instances', () => {
      expect(SimpleCounter.hasInstance('non-existent')).toBe(false);
    });

    it('should return true for existing instances', () => {
      SimpleCounter.getOrCreate('exists');
      expect(SimpleCounter.hasInstance('exists')).toBe(true);
    });

    it('should return false after instance is released', () => {
      SimpleCounter.getOrCreate('will-be-released');
      expect(SimpleCounter.hasInstance('will-be-released')).toBe(true);

      SimpleCounter.release('will-be-released');
      expect(SimpleCounter.hasInstance('will-be-released')).toBe(false);
    });

    it('should check instances per class', () => {
      SimpleCounter.getOrCreate('key');
      expect(SimpleCounter.hasInstance('key')).toBe(true);
      expect(ComplexState.hasInstance('key')).toBe(false);

      ComplexState.getOrCreate('key');
      expect(SimpleCounter.hasInstance('key')).toBe(true);
      expect(ComplexState.hasInstance('key')).toBe(true);
    });
  });

  describe('getRefCount', () => {
    it('should return 0 for non-existent instances', () => {
      expect(SimpleCounter.getRefCount('non-existent')).toBe(0);
    });

    it('should return correct ref count for existing instances', () => {
      SimpleCounter.getOrCreate('ref-count-test');
      expect(SimpleCounter.getRefCount('ref-count-test')).toBe(1);

      SimpleCounter.getOrCreate('ref-count-test');
      expect(SimpleCounter.getRefCount('ref-count-test')).toBe(2);
    });

    it('should track ref counts independently per class', () => {
      SimpleCounter.getOrCreate('shared');
      SimpleCounter.getOrCreate('shared');
      ComplexState.getOrCreate('shared');

      expect(SimpleCounter.getRefCount('shared')).toBe(2);
      expect(ComplexState.getRefCount('shared')).toBe(1);
    });
  });

  describe('clearAllInstances', () => {
    it('should dispose and clear all instances', () => {
      const counter1 = SimpleCounter.getOrCreate('clear-1');
      const counter2 = SimpleCounter.getOrCreate('clear-2');
      const complex = ComplexState.getOrCreate('clear-3');

      expect(SimpleCounter.hasInstance('clear-1')).toBe(true);
      expect(SimpleCounter.hasInstance('clear-2')).toBe(true);
      expect(ComplexState.hasInstance('clear-3')).toBe(true);

      StateContainer.clearAllInstances();

      expect(SimpleCounter.hasInstance('clear-1')).toBe(false);
      expect(SimpleCounter.hasInstance('clear-2')).toBe(false);
      expect(ComplexState.hasInstance('clear-3')).toBe(false);

      expect(counter1.isDisposed).toBe(true);
      expect(counter2.isDisposed).toBe(true);
      expect(complex.isDisposed).toBe(true);
    });

    it('should clear instances from all classes', () => {
      SimpleCounter.getOrCreate('a');
      ComplexState.getOrCreate('b');
      CounterWithConfig.getOrCreate('c');

      StateContainer.clearAllInstances();

      expect(SimpleCounter.hasInstance('a')).toBe(false);
      expect(ComplexState.hasInstance('b')).toBe(false);
      expect(CounterWithConfig.hasInstance('c')).toBe(false);
    });
  });

  describe('State Management with Shared Instances', () => {
    it('should share state across multiple references', () => {
      const counter1 = SimpleCounter.getOrCreate('shared-state');
      const counter2 = SimpleCounter.getOrCreate('shared-state');

      counter1.increment();

      expect(counter1.state).toBe(1);
      expect(counter2.state).toBe(1);

      counter2.increment();

      expect(counter1.state).toBe(2);
      expect(counter2.state).toBe(2);
    });

    it('should maintain independent state for different keys', () => {
      const counter1 = SimpleCounter.getOrCreate('independent-1');
      const counter2 = SimpleCounter.getOrCreate('independent-2');

      counter1.increment();
      counter1.increment();

      counter2.increment();

      expect(counter1.state).toBe(2);
      expect(counter2.state).toBe(1);
    });

    it('should maintain independent state for different classes', () => {
      const simple = SimpleCounter.getOrCreate('key', 10);
      const complex = ComplexState.getOrCreate('key', 5, 'test');

      simple.increment();

      expect(simple.state).toBe(11);
      expect(complex.state).toEqual({ count: 5, message: 'test' });
    });
  });

  describe('Memory Management', () => {
    it('should properly dispose instances when ref count reaches zero', () => {
      const counter = SimpleCounter.getOrCreate('memory-test');
      const subscriptionHandler = () => {};

      counter.subscribe(subscriptionHandler);

      SimpleCounter.release('memory-test');

      expect(counter.isDisposed).toBe(true);
      expect(SimpleCounter.hasInstance('memory-test')).toBe(false);
    });

    it('should handle disposal of multiple instances', () => {
      const instances = Array.from({ length: 10 }, (_, i) =>
        SimpleCounter.getOrCreate(`instance-${i}`),
      );

      instances.forEach((instance, i) => {
        SimpleCounter.release(`instance-${i}`);
        expect(instance.isDisposed).toBe(true);
      });

      instances.forEach((_, i) => {
        expect(SimpleCounter.hasInstance(`instance-${i}`)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string as instance key', () => {
      const counter = SimpleCounter.getOrCreate('');
      expect(SimpleCounter.hasInstance('')).toBe(true);
      expect(counter).toBeInstanceOf(SimpleCounter);

      SimpleCounter.release('');
      expect(SimpleCounter.hasInstance('')).toBe(false);
    });

    it('should handle special characters in instance keys', () => {
      const keys = ['key:with:colons', 'key/with/slashes', 'key-with-dashes'];

      keys.forEach((key) => {
        const counter = SimpleCounter.getOrCreate(key);
        expect(SimpleCounter.hasInstance(key)).toBe(true);
        SimpleCounter.release(key);
      });
    });

    it('should handle rapid get/release cycles', () => {
      for (let i = 0; i < 100; i++) {
        const counter = SimpleCounter.getOrCreate('rapid-cycle');
        counter.increment();
        SimpleCounter.release('rapid-cycle');
      }

      expect(SimpleCounter.hasInstance('rapid-cycle')).toBe(false);
    });
  });
});
