import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlocBase } from '../BlocBase';
import { Blac } from '../Blac';

// Test implementation of BlocBase
class TestBloc extends BlocBase<number> {
  constructor(initialState: number = 0) {
    super(initialState);
  }

  increment() {
    this.emit(this.state + 1);
  }
}

// Test bloc with static properties
class KeepAliveBloc extends BlocBase<string> {
  static keepAlive = true;

  constructor() {
    super('initial');
  }
}

class IsolatedBloc extends BlocBase<string> {
  static isolated = true;

  constructor() {
    super('isolated');
  }
}

// Helper to track state changes
async function collectStateChanges<T>(bloc: BlocBase<T>, action: () => void): Promise<Array<{ newState: T; oldState: T }>> {
  const changes: Array<{ newState: T; oldState: T }> = [];
  const iterator = bloc.stateChanges();
  
  // Start collecting in background
  const collectPromise = (async () => {
    for await (const change of iterator) {
      changes.push(change);
    }
  })();
  
  // Perform action
  action();
  
  // Wait a bit for changes to be collected
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return changes;
}

describe('BlocBase Lifecycle Management', () => {
  let blac: Blac;

  beforeEach(() => {
    blac = new Blac({ __unsafe_ignore_singleton: true });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Lifecycle States', () => {
    it('should start in ACTIVE state', () => {
      const bloc = new TestBloc();

      expect(bloc.lifecycleState).toBe('ACTIVE');
      expect(bloc.isDisposed).toBe(false);
    });

    it('should transition to DISPOSED on disposal', () => {
      const bloc = new TestBloc();
      
      bloc.dispose();

      expect(bloc.lifecycleState).toBe('DISPOSED');
      expect(bloc.isDisposed).toBe(true);
    });

    it('should prevent state changes after disposal', async () => {
      const bloc = new TestBloc();
      const iterator = bloc.stateChanges();
      
      bloc.dispose();
      bloc.increment(); // Should be ignored

      // Iterator should complete
      const result = await iterator.next();
      expect(result.done).toBe(true);
      expect(bloc.state).toBe(0); // State unchanged
    });
  });

  describe('Consumer Tracking', () => {
    it('should track consumer count', () => {
      const bloc = new TestBloc();

      expect(bloc.consumerCount).toBe(0);
      expect(bloc.hasConsumers).toBe(false);

      bloc._addConsumer('test-1');
      expect(bloc.consumerCount).toBe(1);
      expect(bloc.hasConsumers).toBe(true);

      bloc._addConsumer('test-2');
      expect(bloc.consumerCount).toBe(2);

      bloc._removeConsumer('test-1');
      expect(bloc.consumerCount).toBe(1);

      bloc._removeConsumer('test-2');
      expect(bloc.consumerCount).toBe(0);
      expect(bloc.hasConsumers).toBe(false);
    });

    it('should handle duplicate consumer additions', () => {
      const bloc = new TestBloc();

      bloc._addConsumer('test-1');
      bloc._addConsumer('test-1'); // Duplicate

      expect(bloc.consumerCount).toBe(1);
    });

    it('should clean up consumers on disposal', () => {
      const bloc = new TestBloc();

      bloc._addConsumer('test-1');
      bloc._addConsumer('test-2');
      expect(bloc.consumerCount).toBe(2);

      bloc.dispose();
      expect(bloc.consumerCount).toBe(0);
    });
  });

  describe('Mount/Unmount Lifecycle', () => {
    it('should call onMount when first consumer is added', () => {
      const bloc = new TestBloc();
      const onMountSpy = vi.spyOn(bloc, 'onMount');

      bloc._addConsumer('test-1');
      expect(onMountSpy).toHaveBeenCalledTimes(1);

      // Adding more consumers should not call onMount again
      bloc._addConsumer('test-2');
      expect(onMountSpy).toHaveBeenCalledTimes(1);
    });

    it('should call onUnmount when last consumer is removed', () => {
      const bloc = new TestBloc();
      const onUnmountSpy = vi.spyOn(bloc, 'onUnmount');

      bloc._addConsumer('test-1');
      bloc._addConsumer('test-2');

      bloc._removeConsumer('test-1');
      expect(onUnmountSpy).not.toHaveBeenCalled();

      bloc._removeConsumer('test-2');
      expect(onUnmountSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle mount/unmount cycles', () => {
      const bloc = new TestBloc();
      const onMountSpy = vi.spyOn(bloc, 'onMount');
      const onUnmountSpy = vi.spyOn(bloc, 'onUnmount');

      // First cycle
      bloc._addConsumer('test-1');
      expect(onMountSpy).toHaveBeenCalledTimes(1);

      bloc._removeConsumer('test-1');
      expect(onUnmountSpy).toHaveBeenCalledTimes(1);

      // Second cycle
      bloc._addConsumer('test-2');
      expect(onMountSpy).toHaveBeenCalledTimes(2);

      bloc._removeConsumer('test-2');
      expect(onUnmountSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('KeepAlive Behavior', () => {
    it('should respect keepAlive static property', () => {
      const bloc = blac.getBloc(KeepAliveBloc);
      const instanceId = blac.repository.getInstanceId(KeepAliveBloc, {});

      // Add and remove consumer
      bloc._addConsumer('test-1');
      bloc._removeConsumer('test-1');

      // Should still exist in repository
      expect(blac.repository.has(KeepAliveBloc, instanceId!)).toBe(true);
      expect(bloc.isDisposed).toBe(false);
    });

    it('should dispose non-keepAlive blocs when no consumers', async () => {
      const bloc = blac.getBloc(TestBloc);
      const instanceId = blac.repository.getInstanceId(TestBloc, {});

      bloc._addConsumer('test-1');
      bloc._removeConsumer('test-1');

      // Advance timers for deferred disposal
      vi.advanceTimersByTime(100);

      // Should be removed from repository
      expect(blac.repository.has(TestBloc, instanceId!)).toBe(false);
    });
  });

  describe('Isolated Behavior', () => {
    it('should create unique instances for isolated blocs', () => {
      const bloc1 = blac.getBloc(IsolatedBloc, {});
      const bloc2 = blac.getBloc(IsolatedBloc, {});

      expect(bloc1).not.toBe(bloc2);
      expect(bloc1.state).toBe('isolated');
      expect(bloc2.state).toBe('isolated');
    });

    it('should not share state between isolated instances', async () => {
      const bloc1 = blac.getBloc(IsolatedBloc, {});
      const bloc2 = blac.getBloc(IsolatedBloc, {});

      bloc1.emit('changed');

      expect(bloc1.state).toBe('changed');
      expect(bloc2.state).toBe('isolated');
    });
  });

  describe('State Streaming', () => {
    it('should provide state through stateStream generator', async () => {
      const bloc = new TestBloc();
      const iterator = bloc.stateStream();

      // Get initial state
      const first = await iterator.next();
      expect(first.value).toBe(0);
      expect(first.done).toBe(false);

      // Emit new state
      bloc.increment();

      // Get updated state
      const second = await iterator.next();
      expect(second.value).toBe(1);
      expect(second.done).toBe(false);
    });

    it('should provide state changes through stateChanges generator', async () => {
      const bloc = new TestBloc();
      const changes = await collectStateChanges(bloc, () => {
        bloc.increment();
        bloc.increment();
      });

      expect(changes).toHaveLength(2);
      expect(changes[0]).toEqual({ newState: 1, oldState: 0 });
      expect(changes[1]).toEqual({ newState: 2, oldState: 1 });
    });

    it('should complete generators on disposal', async () => {
      const bloc = new TestBloc();
      const iterator = bloc.stateStream();

      bloc.dispose();

      const result = await iterator.next();
      expect(result.done).toBe(true);
    });

    it('should support multiple concurrent stream consumers', async () => {
      const bloc = new TestBloc();
      const iterator1 = bloc.stateStream();
      const iterator2 = bloc.stateStream();

      const result1 = await iterator1.next();
      const result2 = await iterator2.next();

      expect(result1.value).toBe(0);
      expect(result2.value).toBe(0);

      bloc.increment();

      const next1 = await iterator1.next();
      const next2 = await iterator2.next();

      expect(next1.value).toBe(1);
      expect(next2.value).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in onMount gracefully', () => {
      class ErrorMountBloc extends BlocBase<number> {
        constructor() {
          super(0);
        }
        onMount() {
          throw new Error('Mount error');
        }
      }

      const errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {});
      const bloc = new ErrorMountBloc();

      expect(() => bloc._addConsumer('test')).not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith('Error in onMount:', expect.any(Error));

      errorSpy.mockRestore();
    });

    it('should handle errors in onUnmount gracefully', () => {
      class ErrorUnmountBloc extends BlocBase<number> {
        constructor() {
          super(0);
        }
        onUnmount() {
          throw new Error('Unmount error');
        }
      }

      const errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {});
      const bloc = new ErrorUnmountBloc();

      bloc._addConsumer('test');
      expect(() => bloc._removeConsumer('test')).not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith('Error in onUnmount:', expect.any(Error));

      errorSpy.mockRestore();
    });

    it('should handle errors in onDispose gracefully', () => {
      class ErrorDisposeBloc extends BlocBase<number> {
        constructor() {
          super(0);
        }
        onDispose() {
          throw new Error('Dispose error');
        }
      }

      const errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {});
      const bloc = new ErrorDisposeBloc();

      expect(() => bloc.dispose()).not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith('Error in onDispose:', expect.any(Error));

      errorSpy.mockRestore();
    });
  });

  describe('Plugin Integration', () => {
    it('should notify plugins of lifecycle events', () => {
      const plugin = {
        blocCreated: vi.fn(),
        blocDisposed: vi.fn(),
        stateChanged: vi.fn(),
      };

      blac.use(plugin);

      const bloc = blac.getBloc(TestBloc);
      expect(plugin.blocCreated).toHaveBeenCalledWith(bloc);

      bloc.increment();
      expect(plugin.stateChanged).toHaveBeenCalledWith(bloc, 1, 0);

      bloc.dispose();
      expect(plugin.blocDisposed).toHaveBeenCalledWith(bloc);
    });
  });

  describe('Memory Management', () => {
    it('should clean up WeakRef consumers properly', () => {
      const bloc = new TestBloc();
      
      // Create consumer objects
      let consumer1: any = { id: 'consumer-1' };
      let consumer2: any = { id: 'consumer-2' };
      
      // Add as WeakRef consumers
      bloc._consumers.set('consumer-1', new WeakRef(consumer1));
      bloc._consumers.set('consumer-2', new WeakRef(consumer2));
      
      expect(bloc.consumerCount).toBe(2);
      
      // Simulate garbage collection by nullifying one consumer
      consumer1 = null;
      
      // Force cleanup check
      const aliveCount = Array.from(bloc._consumers.values())
        .filter(ref => ref.deref() !== undefined).length;
      
      expect(aliveCount).toBe(1);
    });

    it('should handle rapid add/remove consumer cycles', () => {
      const bloc = new TestBloc();
      
      for (let i = 0; i < 100; i++) {
        bloc._addConsumer(`consumer-${i}`);
        bloc._removeConsumer(`consumer-${i}`);
      }
      
      expect(bloc.consumerCount).toBe(0);
      expect(bloc.isDisposed).toBe(false);
    });
  });
});