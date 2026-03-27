/**
 * Test to verify lifecycle events are emitted correctly for DevTools integration
 */

import { describe, it, expect, vi } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from './Cubit';
import { acquire, release, getRegistry } from '../registry';

describe('StateContainer Lifecycle Events', () => {
  blacTestSetup();

  it('should emit "created" event when instance is created', () => {
    const createdListener = vi.fn();
    getRegistry().on('created', createdListener);

    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
    }

    // Create instance
    const instance = acquire(TestCubit);

    // Verify created event was emitted
    expect(createdListener).toHaveBeenCalledTimes(1);
    expect(createdListener).toHaveBeenCalledWith(instance);
  });

  it('should emit "disposed" event when instance is disposed', () => {
    const disposedListener = vi.fn();
    getRegistry().on('disposed', disposedListener);

    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
    }

    // Create and immediately release
    const instance = acquire(TestCubit);
    release(TestCubit); // refCount goes to 0, auto-dispose

    // Verify disposed event was emitted
    expect(disposedListener).toHaveBeenCalledTimes(1);
    expect(disposedListener).toHaveBeenCalledWith(instance);
  });

  it('should emit "created" only once for shared instances', () => {
    const createdListener = vi.fn();
    getRegistry().on('created', createdListener);

    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
    }

    // Create instance twice (shared)
    const instance1 = acquire(TestCubit);
    const instance2 = acquire(TestCubit);

    // Should be same instance
    expect(instance1).toBe(instance2);

    // Created event should only fire once
    expect(createdListener).toHaveBeenCalledTimes(1);
  });

  it('should emit "disposed" only when ref count reaches 0', () => {
    const disposedListener = vi.fn();
    getRegistry().on('disposed', disposedListener);

    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
    }

    // Create instance twice (refCount = 2)
    acquire(TestCubit);
    acquire(TestCubit);

    // Release once (refCount = 1, should NOT dispose)
    release(TestCubit);
    expect(disposedListener).not.toHaveBeenCalled();

    // Release again (refCount = 0, should dispose)
    release(TestCubit);
    expect(disposedListener).toHaveBeenCalledTimes(1);
  });

  it('should emit "stateChanged" event when state changes', () => {
    const stateChangedListener = vi.fn();
    getRegistry().on('stateChanged', stateChangedListener);

    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }

      increment = () => {
        this.emit({ count: this.state.count + 1 });
      };
    }

    const instance = acquire(TestCubit);

    // Change state
    instance.increment();

    // Verify stateChanged event was emitted
    expect(stateChangedListener).toHaveBeenCalledTimes(1);
    expect(stateChangedListener).toHaveBeenCalledWith(
      instance,
      { count: 0 },
      { count: 1 },
      expect.any(String), // callstack
    );
  });
});
