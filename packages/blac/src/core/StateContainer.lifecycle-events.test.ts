/**
 * Test to verify lifecycle events are emitted correctly for DevTools integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateContainer } from './StateContainer';
import { Cubit } from './Cubit';

describe('StateContainer Lifecycle Events', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
  });

  it('should emit "created" event when instance is created', () => {
    const createdListener = vi.fn();
    StateContainer.getRegistry().on('created', createdListener);

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    // Create instance
    const instance = TestCubit.resolve();

    // Verify created event was emitted
    expect(createdListener).toHaveBeenCalledTimes(1);
    expect(createdListener).toHaveBeenCalledWith(instance);
  });

  it('should emit "disposed" event when instance is disposed', () => {
    const disposedListener = vi.fn();
    StateContainer.getRegistry().on('disposed', disposedListener);

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    // Create and immediately release
    const instance = TestCubit.resolve();
    TestCubit.release(); // refCount goes to 0, auto-dispose

    // Verify disposed event was emitted
    expect(disposedListener).toHaveBeenCalledTimes(1);
    expect(disposedListener).toHaveBeenCalledWith(instance);
  });

  it('should emit "created" only once for shared instances', () => {
    const createdListener = vi.fn();
    StateContainer.getRegistry().on('created', createdListener);

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    // Create instance twice (shared)
    const instance1 = TestCubit.resolve();
    const instance2 = TestCubit.resolve();

    // Should be same instance
    expect(instance1).toBe(instance2);

    // Created event should only fire once
    expect(createdListener).toHaveBeenCalledTimes(1);
  });

  it('should emit "disposed" only when ref count reaches 0', () => {
    const disposedListener = vi.fn();
    StateContainer.getRegistry().on('disposed', disposedListener);

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    // Create instance twice (refCount = 2)
    TestCubit.resolve();
    TestCubit.resolve();

    // Release once (refCount = 1, should NOT dispose)
    TestCubit.release();
    expect(disposedListener).not.toHaveBeenCalled();

    // Release again (refCount = 0, should dispose)
    TestCubit.release();
    expect(disposedListener).toHaveBeenCalledTimes(1);
  });

  it('should emit "created" and "disposed" for isolated instances', () => {
    const createdListener = vi.fn();
    const disposedListener = vi.fn();
    StateContainer.getRegistry().on('created', createdListener);
    StateContainer.getRegistry().on('disposed', disposedListener);

    class TestCubit extends Cubit<number> {
      static isolated = true;

      constructor() {
        super(0);
      }
    }

    // Create isolated instance
    const instance1 = TestCubit.resolve('key1');
    expect(createdListener).toHaveBeenCalledTimes(1);

    // Create another isolated instance (different instance)
    const instance2 = TestCubit.resolve('key2');
    expect(createdListener).toHaveBeenCalledTimes(2);
    expect(instance1).not.toBe(instance2);

    // Dispose isolated instances manually
    instance1.dispose();
    expect(disposedListener).toHaveBeenCalledTimes(1);

    instance2.dispose();
    expect(disposedListener).toHaveBeenCalledTimes(2);
  });

  it('should emit "stateChanged" event when state changes', () => {
    const stateChangedListener = vi.fn();
    StateContainer.getRegistry().on('stateChanged', stateChangedListener);

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }

      increment = () => {
        this.emit(this.state + 1);
      };
    }

    const instance = TestCubit.resolve();

    // Change state
    instance.increment();

    // Verify stateChanged event was emitted
    expect(stateChangedListener).toHaveBeenCalledTimes(1);
    expect(stateChangedListener).toHaveBeenCalledWith(
      instance,
      0,
      1,
      expect.any(String), // callstack
    );
  });
});
