/**
 * StateContainer Tests
 * Testing the foundation of the entire state management system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateContainer } from './StateContainer';

// Test implementation of StateContainer
class TestContainer extends StateContainer<number> {
  constructor(initialState: number = 0) {
    super(initialState);
  }

  // Expose protected methods for testing
  public testEmit(state: number): void {
    this.emit(state);
  }

  public testUpdate(updater: (current: number) => number): void {
    this.update(updater);
  }
}

// Test container with lifecycle hooks using system events
class LifecycleTestContainer extends StateContainer<string> {
  public disposeCallCount = 0;
  public stateChangeCallCount = 0;
  public lastPreviousState?: string;
  public lastNewState?: string;

  constructor(initialState = 'initial') {
    super(initialState);

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

  public testEmit(state: string): void {
    this.emit(state);
  }
}

// Test container with static keepAlive
class KeepAliveTestContainer extends StateContainer<number> {
  static keepAlive = true;

  constructor(initialState: number = 0) {
    super(initialState);
  }

  public testEmit(state: number): void {
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
    StateContainer.clearAllInstances();
  });

  // Static Instance Management

  describe('Static Instance Management', () => {
    describe('resolve()', () => {
      it('should create new instance on first call', () => {
        const instance = TestContainer.resolve();

        expect(instance).toBeInstanceOf(TestContainer);
        expect(instance.state).toBe(0);
        expect(TestContainer.getRefCount()).toBe(1);
      });

      it('should return existing instance with ref count increment', () => {
        const instance1 = TestContainer.resolve();
        const instance2 = TestContainer.resolve();

        expect(instance1).toBe(instance2);
        expect(TestContainer.getRefCount()).toBe(2);
      });

      it('should handle custom instance keys', () => {
        const instance1 = TestContainer.resolve('key1');
        const instance2 = TestContainer.resolve('key2');
        const instance3 = TestContainer.resolve('key1');

        expect(instance1).not.toBe(instance2);
        expect(instance1).toBe(instance3);
        expect(TestContainer.getRefCount('key1')).toBe(2);
        expect(TestContainer.getRefCount('key2')).toBe(1);
      });

      it('should pass constructor args correctly', () => {
        const instance = TestContainer.resolve(undefined, 42);

        expect(instance.state).toBe(42);
      });
    });

    describe('release()', () => {
      it('should decrement ref count', () => {
        TestContainer.resolve();
        TestContainer.resolve();
        expect(TestContainer.getRefCount()).toBe(2);

        TestContainer.release();
        expect(TestContainer.getRefCount()).toBe(1);
      });

      it('should dispose when ref count reaches zero (non-keepAlive)', () => {
        const instance = TestContainer.resolve();
        const disposeSpy = vi.spyOn(instance, 'dispose');

        TestContainer.release();

        expect(disposeSpy).toHaveBeenCalledOnce();
        expect(TestContainer.hasInstance()).toBe(false);
        expect(instance.isDisposed).toBe(true);
      });

      it('should respect static keepAlive property', () => {
        const instance = KeepAliveTestContainer.resolve(undefined, 0);
        const disposeSpy = vi.spyOn(instance, 'dispose');

        KeepAliveTestContainer.release();

        expect(disposeSpy).not.toHaveBeenCalled();
        expect(KeepAliveTestContainer.hasInstance()).toBe(true);
        expect(KeepAliveTestContainer.getRefCount()).toBe(0);
      });

      it('should force dispose option works', () => {
        TestContainer.resolve();
        TestContainer.resolve();
        expect(TestContainer.getRefCount()).toBe(2);

        TestContainer.release(undefined, true);

        expect(TestContainer.hasInstance()).toBe(false);
        expect(TestContainer.getRefCount()).toBe(0);
      });

      it('should handle release of non-existent instance', () => {
        expect(() => TestContainer.release()).not.toThrow();
        expect(TestContainer.getRefCount()).toBe(0);
      });
    });

    describe('getRefCount()', () => {
      it('should return correct count', () => {
        expect(TestContainer.getRefCount()).toBe(0);

        TestContainer.resolve();
        expect(TestContainer.getRefCount()).toBe(1);

        TestContainer.resolve();
        expect(TestContainer.getRefCount()).toBe(2);

        TestContainer.release();
        expect(TestContainer.getRefCount()).toBe(1);
      });

      it('should return 0 for non-existent instance', () => {
        expect(TestContainer.getRefCount('nonexistent')).toBe(0);
      });
    });

    describe('hasInstance()', () => {
      it('should correctly identify existing instances', () => {
        expect(TestContainer.hasInstance()).toBe(false);

        TestContainer.resolve();
        expect(TestContainer.hasInstance()).toBe(true);

        TestContainer.release();
        expect(TestContainer.hasInstance()).toBe(false);
      });

      it('should work with custom instance keys', () => {
        TestContainer.resolve('key1');

        expect(TestContainer.hasInstance('key1')).toBe(true);
        expect(TestContainer.hasInstance('key2')).toBe(false);
      });
    });

    describe('clearAllInstances()', () => {
      it('should dispose all instances and clear registry', () => {
        const instance1 = TestContainer.resolve('key1');
        const instance2 = TestContainer.resolve('key2');
        const instance3 = ObjectStateContainer.resolve();

        const spy1 = vi.spyOn(instance1, 'dispose');
        const spy2 = vi.spyOn(instance2, 'dispose');
        const spy3 = vi.spyOn(instance3, 'dispose');

        StateContainer.clearAllInstances();

        expect(spy1).toHaveBeenCalledOnce();
        expect(spy2).toHaveBeenCalledOnce();
        expect(spy3).toHaveBeenCalledOnce();
        expect(TestContainer.hasInstance('key1')).toBe(false);
        expect(TestContainer.hasInstance('key2')).toBe(false);
        expect(ObjectStateContainer.hasInstance()).toBe(false);
      });
    });
  });

  // Instance Behavior

  describe('Instance Behavior', () => {
    describe('Constructor', () => {
      it('should initialize state correctly', () => {
        const container = new TestContainer(42);
        expect(container.state).toBe(42);
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
        expect(container.state).toBe(100);
      });

      it('should return updated state after emission', () => {
        const container = new TestContainer(10);
        container.testEmit(20);
        expect(container.state).toBe(20);
      });
    });

    describe('subscribe()', () => {
      it('should add listener and return unsubscribe function', () => {
        const container = new TestContainer(0);
        const listener = vi.fn();

        const unsubscribe = container.subscribe(listener);

        expect(typeof unsubscribe).toBe('function');
        container.testEmit(1);
        expect(listener).toHaveBeenCalledWith(1);
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

        container.testEmit(5);

        expect(listener1).toHaveBeenCalledWith(5);
        expect(listener2).toHaveBeenCalledWith(5);
        expect(listener3).toHaveBeenCalledWith(5);
      });

      it('should unsubscribe correctly', () => {
        const container = new TestContainer(0);
        const listener1 = vi.fn();
        const listener2 = vi.fn();

        const unsubscribe1 = container.subscribe(listener1);
        container.subscribe(listener2);

        unsubscribe1();
        container.testEmit(1);

        expect(listener1).not.toHaveBeenCalled();
        expect(listener2).toHaveBeenCalledWith(1);
      });

      it('should handle multiple unsubscribes safely', () => {
        const container = new TestContainer(0);
        const listener = vi.fn();

        const unsubscribe = container.subscribe(listener);
        unsubscribe();
        unsubscribe(); // Should not throw

        container.testEmit(1);
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
        expect(() => container.testEmit(1)).toThrow();
        expect(listener).not.toHaveBeenCalled();
      });

      it('should prevent further emissions', () => {
        const container = new TestContainer(0);

        container.dispose();

        expect(() => container.testEmit(1)).toThrow(
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

        container.testEmit(42);

        expect(container.state).toBe(42);
        expect(listener).toHaveBeenCalledWith(42);
      });

      it('should throw when disposed', () => {
        const container = new TestContainer(0);
        container.dispose();

        expect(() => container.testEmit(1)).toThrow(
          'Cannot emit state from disposed container',
        );
      });

      it('should call stateChanged system event hook', () => {
        const container = new LifecycleTestContainer('initial');

        container.testEmit('updated');

        expect(container.stateChangeCallCount).toBe(1);
        expect(container.lastPreviousState).toBe('initial');
        expect(container.lastNewState).toBe('updated');
      });

      it('should call stateChanged system event before notifying listeners', () => {
        // Create a container class that tracks call order
        class OrderTrackingContainer extends StateContainer<string> {
          callOrder: string[] = [];

          constructor() {
            super('initial');

            this.onSystemEvent('stateChanged', () => {
              this.callOrder.push('stateChanged');
            });
          }

          public testEmit(state: string): void {
            this.emit(state);
          }
        }

        const container = new OrderTrackingContainer();

        container.subscribe(() => {
          container.callOrder.push('listener');
        });

        container.testEmit('updated');

        expect(container.callOrder).toEqual(['stateChanged', 'listener']);
      });
    });

    describe('update()', () => {
      it('should transform state correctly', () => {
        const container = new TestContainer(10);

        container.testUpdate((current) => current * 2);

        expect(container.state).toBe(20);
      });

      it('should throw when disposed', () => {
        const container = new TestContainer(0);
        container.dispose();

        expect(() => container.testUpdate((n) => n + 1)).toThrow(
          'Cannot update state from disposed container',
        );
      });

      it('should notify listeners', () => {
        const container = new TestContainer(5);
        const listener = vi.fn();
        container.subscribe(listener);

        container.testUpdate((n) => n + 10);

        expect(listener).toHaveBeenCalledWith(15);
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

        container.testEmit(1);

        expect(listener1).toHaveBeenCalledWith(1);
        expect(listener2).toHaveBeenCalledWith(1);
        expect(listener3).toHaveBeenCalledWith(1);
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

      container1.testEmit(15);
      container2.testEmit(25);

      expect(container1.state).toBe(15);
      expect(container2.state).toBe(25);
    });

    it('should handle rapid state updates', () => {
      const container = new TestContainer(0);
      const states: number[] = [];
      container.subscribe((state) => states.push(state));

      for (let i = 1; i <= 100; i++) {
        container.testEmit(i);
      }

      expect(states.length).toBe(100);
      expect(states[0]).toBe(1);
      expect(states[99]).toBe(100);
      expect(container.state).toBe(100);
    });

    it('should work with attach lifecycle', () => {
      const instance1 = TestContainer.resolve('shared');
      const listener = vi.fn();
      instance1.subscribe(listener);

      const instance2 = TestContainer.resolve('shared');
      expect(instance1).toBe(instance2);

      instance2.testEmit(42);
      expect(listener).toHaveBeenCalledWith(42);

      TestContainer.release('shared');
      expect(TestContainer.getRefCount('shared')).toBe(1);

      TestContainer.release('shared');
      expect(TestContainer.hasInstance('shared')).toBe(false);
    });
  });
});
