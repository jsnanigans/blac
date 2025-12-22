/**
 * StateContainer Tests
 * Testing the foundation of the entire state management system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateContainer } from './StateContainer';
import {
  acquire,
  release,
  hasInstance,
  getRefCount,
  clearAll,
} from '../registry';

// Test implementation of StateContainer
class TestContainer extends StateContainer<{ value: number }> {
  constructor(initialState: number = 0) {
    super({ value: initialState });
  }

  // Expose protected methods for testing
  public testEmit(state: { value: number }): void {
    this.emit(state);
  }

  public testUpdate(
    updater: (current: { value: number }) => { value: number },
  ): void {
    this.update(updater);
  }
}

// Test container with lifecycle hooks using system events
class LifecycleTestContainer extends StateContainer<{ text: string }> {
  public disposeCallCount = 0;
  public stateChangeCallCount = 0;
  public lastPreviousState?: { text: string };
  public lastNewState?: { text: string };

  constructor(initialState = 'initial') {
    super({ text: initialState });

    // Use system events for lifecycle hooks
    this.onSystemEvent('dispose', () => {
      this.disposeCallCount++;
    });

    this.onSystemEvent('stateChanged', ({ state, previousState }) => {
      this.stateChangeCallCount++;
      this.lastNewState = state;
      this.lastPreviousState = previousState;
    });
  }

  public testEmit(state: { text: string }): void {
    this.emit(state);
  }
}

// Test container with static keepAlive
class KeepAliveTestContainer extends StateContainer<{ value: number }> {
  static keepAlive = true;

  constructor(initialState: number = 0) {
    super({ value: initialState });
  }

  public testEmit(state: { value: number }): void {
    this.emit(state);
  }
}

// Object state container for testing
interface ObjectState {
  count: number;
  name: string;
}

class ObjectStateContainer extends StateContainer<ObjectState> {
  constructor() {
    super({ count: 0, name: 'test' });
  }

  public increment(): void {
    this.update((state) => ({ ...state, count: state.count + 1 }));
  }

  public setName(name: string): void {
    this.update((state) => ({ ...state, name }));
  }
}

describe('StateContainer', () => {
  beforeEach(() => {
    // Clear all instances before each test
    clearAll();
  });

  // Static Instance Management

  describe('Registry Functions', () => {
    describe('acquire()', () => {
      it('should create new instance on first call', () => {
        const instance = acquire(TestContainer);

        expect(instance).toBeInstanceOf(TestContainer);
        expect(instance.state).toEqual({ value: 0 });
        expect(getRefCount(TestContainer)).toBe(1);
      });

      it('should return existing instance with ref count increment', () => {
        const instance1 = acquire(TestContainer);
        const instance2 = acquire(TestContainer);

        expect(instance1).toBe(instance2);
        expect(getRefCount(TestContainer)).toBe(2);
      });

      it('should handle custom instance keys', () => {
        const instance1 = acquire(TestContainer, 'key1');
        const instance2 = acquire(TestContainer, 'key2');
        const instance3 = acquire(TestContainer, 'key1');

        expect(instance1).not.toBe(instance2);
        expect(instance1).toBe(instance3);
        expect(getRefCount(TestContainer, 'key1')).toBe(2);
        expect(getRefCount(TestContainer, 'key2')).toBe(1);
      });

      it('should pass constructor args correctly', () => {
        const instance = acquire(TestContainer, undefined, { props: 42 });

        expect(instance.state).toEqual({ value: 42 });
      });
    });

    describe('release()', () => {
      it('should decrement ref count', () => {
        acquire(TestContainer);
        acquire(TestContainer);
        expect(getRefCount(TestContainer)).toBe(2);

        release(TestContainer);
        expect(getRefCount(TestContainer)).toBe(1);
      });

      it('should dispose when ref count reaches zero (non-keepAlive)', () => {
        const instance = acquire(TestContainer);
        const disposeSpy = vi.spyOn(instance, 'dispose');

        release(TestContainer);

        expect(disposeSpy).toHaveBeenCalledOnce();
        expect(hasInstance(TestContainer)).toBe(false);
        expect(instance.isDisposed).toBe(true);
      });

      it('should respect static keepAlive property', () => {
        const instance = acquire(KeepAliveTestContainer, undefined, {
          props: 0,
        });
        const disposeSpy = vi.spyOn(instance, 'dispose');

        release(KeepAliveTestContainer);

        expect(disposeSpy).not.toHaveBeenCalled();
        expect(hasInstance(KeepAliveTestContainer)).toBe(true);
        expect(getRefCount(KeepAliveTestContainer)).toBe(0);
      });

      it('should force dispose option works', () => {
        acquire(TestContainer);
        acquire(TestContainer);
        expect(getRefCount(TestContainer)).toBe(2);

        release(TestContainer, undefined, true);

        expect(hasInstance(TestContainer)).toBe(false);
        expect(getRefCount(TestContainer)).toBe(0);
      });

      it('should handle release of non-existent instance', () => {
        expect(() => release(TestContainer)).not.toThrow();
        expect(getRefCount(TestContainer)).toBe(0);
      });
    });

    describe('getRefCount()', () => {
      it('should return correct count', () => {
        expect(getRefCount(TestContainer)).toBe(0);

        acquire(TestContainer);
        expect(getRefCount(TestContainer)).toBe(1);

        acquire(TestContainer);
        expect(getRefCount(TestContainer)).toBe(2);

        release(TestContainer);
        expect(getRefCount(TestContainer)).toBe(1);
      });

      it('should return 0 for non-existent instance', () => {
        expect(getRefCount(TestContainer, 'nonexistent')).toBe(0);
      });
    });

    describe('hasInstance()', () => {
      it('should correctly identify existing instances', () => {
        expect(hasInstance(TestContainer)).toBe(false);

        acquire(TestContainer);
        expect(hasInstance(TestContainer)).toBe(true);

        release(TestContainer);
        expect(hasInstance(TestContainer)).toBe(false);
      });

      it('should work with custom instance keys', () => {
        acquire(TestContainer, 'key1');

        expect(hasInstance(TestContainer, 'key1')).toBe(true);
        expect(hasInstance(TestContainer, 'key2')).toBe(false);
      });
    });

    describe('clearAll()', () => {
      it('should dispose all instances and clear registry', () => {
        const instance1 = acquire(TestContainer, 'key1');
        const instance2 = acquire(TestContainer, 'key2');
        const instance3 = acquire(ObjectStateContainer);

        const spy1 = vi.spyOn(instance1, 'dispose');
        const spy2 = vi.spyOn(instance2, 'dispose');
        const spy3 = vi.spyOn(instance3, 'dispose');

        clearAll();

        expect(spy1).toHaveBeenCalledOnce();
        expect(spy2).toHaveBeenCalledOnce();
        expect(spy3).toHaveBeenCalledOnce();
        expect(hasInstance(TestContainer, 'key1')).toBe(false);
        expect(hasInstance(TestContainer, 'key2')).toBe(false);
        expect(hasInstance(ObjectStateContainer)).toBe(false);
      });
    });
  });

  // Instance Behavior

  describe('Instance Behavior', () => {
    describe('Constructor', () => {
      it('should initialize state correctly', () => {
        const container = new TestContainer(42);
        expect(container.state).toEqual({ value: 42 });
      });

      it('should initialize with default config', () => {
        const container = new TestContainer();
        expect(container.name).toBe('TestContainer');
        expect(container.isDisposed).toBe(false);
      });

      it('should set default instanceId', () => {
        const container = new TestContainer(0);
        expect(container.instanceId).toBe('TestContainer:main');
      });

      it('should respect custom instanceId', () => {
        const container = new TestContainer(0);
        container.initConfig({ instanceId: 'custom-id' });
        expect(container.instanceId).toBe('TestContainer:custom-id');
      });

      it('should respect custom name', () => {
        const container = new TestContainer(0);
        container.initConfig({ name: 'CustomName' });
        expect(container.name).toBe('CustomName');
      });

      it('should not generate unique instanceId if not provided', () => {
        const container1 = new TestContainer();
        const container2 = new TestContainer();
        expect(container1.instanceId).toBe(container2.instanceId);
      });
    });

    describe('state getter', () => {
      it('should return current state', () => {
        const container = new TestContainer(100);
        expect(container.state).toEqual({ value: 100 });
      });

      it('should return updated state after emission', () => {
        const container = new TestContainer(10);
        container.testEmit({ value: 20 });
        expect(container.state).toEqual({ value: 20 });
      });
    });

    describe('subscribe()', () => {
      it('should add listener and return unsubscribe function', () => {
        const container = new TestContainer(0);
        const listener = vi.fn();

        const unsubscribe = container.subscribe(listener);

        expect(typeof unsubscribe).toBe('function');
        container.testEmit({ value: 1 });
        expect(listener).toHaveBeenCalledWith({ value: 1 });
      });

      it('should throw when container disposed', () => {
        const container = new TestContainer(0);
        container.dispose();

        expect(() => container.subscribe(vi.fn())).toThrow(
          'Cannot subscribe to disposed container',
        );
      });

      it('should notify multiple subscribers', () => {
        const container = new TestContainer(0);
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        const listener3 = vi.fn();

        container.subscribe(listener1);
        container.subscribe(listener2);
        container.subscribe(listener3);

        container.testEmit({ value: 5 });

        expect(listener1).toHaveBeenCalledWith({ value: 5 });
        expect(listener2).toHaveBeenCalledWith({ value: 5 });
        expect(listener3).toHaveBeenCalledWith({ value: 5 });
      });

      it('should unsubscribe correctly', () => {
        const container = new TestContainer(0);
        const listener1 = vi.fn();
        const listener2 = vi.fn();

        const unsubscribe1 = container.subscribe(listener1);
        container.subscribe(listener2);

        unsubscribe1();
        container.testEmit({ value: 1 });

        expect(listener1).not.toHaveBeenCalled();
        expect(listener2).toHaveBeenCalledWith({ value: 1 });
      });

      it('should handle multiple unsubscribes safely', () => {
        const container = new TestContainer(0);
        const listener = vi.fn();

        const unsubscribe = container.subscribe(listener);
        unsubscribe();
        unsubscribe(); // Should not throw

        container.testEmit({ value: 1 });
        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe('dispose()', () => {
      it('should clean up listeners', () => {
        const container = new TestContainer(0);
        const listener = vi.fn();

        container.subscribe(listener);
        container.dispose();

        // Attempt to emit should throw, but listener should not be called
        expect(() => container.testEmit({ value: 1 })).toThrow();
        expect(listener).not.toHaveBeenCalled();
      });

      it('should prevent further emissions', () => {
        const container = new TestContainer(0);

        container.dispose();

        expect(() => container.testEmit({ value: 1 })).toThrow(
          'Cannot emit state from disposed container',
        );
      });

      it('should be idempotent (safe to call multiple times)', () => {
        const container = new LifecycleTestContainer();

        container.dispose();
        container.dispose();
        container.dispose();

        expect(container.disposeCallCount).toBe(1);
        expect(container.isDisposed).toBe(true);
      });

      it('should set isDisposed flag', () => {
        const container = new TestContainer(0);

        expect(container.isDisposed).toBe(false);
        container.dispose();
        expect(container.isDisposed).toBe(true);
      });
    });
  });

  // Protected Methods (via subclass testing)

  describe('Protected Methods', () => {
    describe('emit()', () => {
      it('should update state and notify listeners', () => {
        const container = new TestContainer(0);
        const listener = vi.fn();
        container.subscribe(listener);

        container.testEmit({ value: 42 });

        expect(container.state).toEqual({ value: 42 });
        expect(listener).toHaveBeenCalledWith({ value: 42 });
      });

      it('should throw when disposed', () => {
        const container = new TestContainer(0);
        container.dispose();

        expect(() => container.testEmit({ value: 1 })).toThrow(
          'Cannot emit state from disposed container',
        );
      });

      it('should call stateChanged system event hook', () => {
        const container = new LifecycleTestContainer('initial');

        container.testEmit({ text: 'updated' });

        expect(container.stateChangeCallCount).toBe(1);
        expect(container.lastPreviousState).toEqual({ text: 'initial' });
        expect(container.lastNewState).toEqual({ text: 'updated' });
      });

      it('should call stateChanged system event before notifying listeners', () => {
        // Create a container class that tracks call order
        class OrderTrackingContainer extends StateContainer<{ text: string }> {
          callOrder: string[] = [];

          constructor() {
            super({ text: 'initial' });

            this.onSystemEvent('stateChanged', () => {
              this.callOrder.push('stateChanged');
            });
          }

          public testEmit(state: { text: string }): void {
            this.emit(state);
          }
        }

        const container = new OrderTrackingContainer();

        container.subscribe(() => {
          container.callOrder.push('listener');
        });

        container.testEmit({ text: 'updated' });

        expect(container.callOrder).toEqual(['stateChanged', 'listener']);
      });
    });

    describe('update()', () => {
      it('should transform state correctly', () => {
        const container = new TestContainer(10);

        container.testUpdate((current) => ({ value: current.value * 2 }));

        expect(container.state).toEqual({ value: 20 });
      });

      it('should throw when disposed', () => {
        const container = new TestContainer(0);
        container.dispose();

        expect(() =>
          container.testUpdate((s) => ({ value: s.value + 1 })),
        ).toThrow('Cannot update state from disposed container');
      });

      it('should notify listeners', () => {
        const container = new TestContainer(5);
        const listener = vi.fn();
        container.subscribe(listener);

        container.testUpdate((s) => ({ value: s.value + 10 }));

        expect(listener).toHaveBeenCalledWith({ value: 15 });
      });
    });

    describe('Error handling in listeners', () => {
      it('should not break notification chain if listener throws', () => {
        const container = new TestContainer(0);
        const listener1 = vi.fn();
        const listener2 = vi.fn(() => {
          throw new Error('Listener error');
        });
        const listener3 = vi.fn();

        // Spy on console.error to suppress error output
        const consoleErrorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});

        container.subscribe(listener1);
        container.subscribe(listener2);
        container.subscribe(listener3);

        container.testEmit({ value: 1 });

        expect(listener1).toHaveBeenCalledWith({ value: 1 });
        expect(listener2).toHaveBeenCalledWith({ value: 1 });
        expect(listener3).toHaveBeenCalledWith({ value: 1 });
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    });
  });

  // Configuration

  describe('Configuration', () => {
    it('should respect name configuration', () => {
      const container = new TestContainer(0);
      container.initConfig({ name: 'MyCounter' });
      expect(container.name).toBe('MyCounter');
    });

    it('should enable debug mode logging', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const container = new TestContainer(0);
      container.initConfig({
        debug: true,
        name: 'DebugTest',
      });
      container.dispose();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DebugTest] Disposing'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DebugTest] Disposed successfully'),
      );

      consoleLogSpy.mockRestore();
    });
  });

  // Integration Scenarios

  describe('Integration Scenarios', () => {
    it('should handle complex object state updates', () => {
      const container = new ObjectStateContainer();
      const listener = vi.fn();
      container.subscribe(listener);

      container.increment();
      expect(container.state.count).toBe(1);
      expect(listener).toHaveBeenCalledWith({ count: 1, name: 'test' });

      container.setName('updated');
      expect(container.state.name).toBe('updated');
      expect(listener).toHaveBeenCalledWith({ count: 1, name: 'updated' });
    });

    it('should maintain separate state for different instances', () => {
      const container1 = new TestContainer(10);
      const container2 = new TestContainer(20);

      container1.testEmit({ value: 15 });
      container2.testEmit({ value: 25 });

      expect(container1.state).toEqual({ value: 15 });
      expect(container2.state).toEqual({ value: 25 });
    });

    it('should handle rapid state updates', () => {
      const container = new TestContainer(0);
      const states: { value: number }[] = [];
      container.subscribe((state) => states.push(state));

      for (let i = 1; i <= 100; i++) {
        container.testEmit({ value: i });
      }

      expect(states.length).toBe(100);
      expect(states[0]).toEqual({ value: 1 });
      expect(states[99]).toEqual({ value: 100 });
      expect(container.state).toEqual({ value: 100 });
    });

    it('should work with attach lifecycle', () => {
      const instance1 = acquire(TestContainer, 'shared');
      const listener = vi.fn();
      instance1.subscribe(listener);

      const instance2 = acquire(TestContainer, 'shared');
      expect(instance1).toBe(instance2);

      instance2.testEmit({ value: 42 });
      expect(listener).toHaveBeenCalledWith({ value: 42 });

      release(TestContainer, 'shared');
      expect(getRefCount(TestContainer, 'shared')).toBe(1);

      release(TestContainer, 'shared');
      expect(hasInstance(TestContainer, 'shared')).toBe(false);
    });
  });
});
