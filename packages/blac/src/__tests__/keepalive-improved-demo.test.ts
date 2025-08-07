import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

interface CounterState {
  count: number;
  instanceId: number;
  lastUpdated: number;
}

let instanceCounter = 0;

// KeepAlive Cubit - persists even when no components are using it
class KeepAliveCounterCubit extends Cubit<CounterState> {
  static keepAlive = true;

  constructor() {
    instanceCounter++;
    const instanceId = instanceCounter;
    super({
      count: 0,
      instanceId,
      lastUpdated: Date.now(),
    });
    console.log(`KeepAliveCounterCubit instance ${instanceId} CONSTRUCTED.`);
  }

  increment = () => {
    const newCount = this.state.count + 1;
    this.emit({
      ...this.state,
      count: newCount,
      lastUpdated: Date.now(),
    });
    console.log(
      `KeepAliveCounterCubit instance ${this.state.instanceId} incremented to ${newCount}`,
    );
  };

  reset = () => {
    this.emit({
      ...this.state,
      count: 0,
      lastUpdated: Date.now(),
    });
  };
}

describe('Improved KeepAlive Demo', () => {
  beforeEach(() => {
    Blac.resetInstance();
    Blac.enableLog = false;
    instanceCounter = 0;
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should use emit instead of patch for state updates', () => {
    const cubit = Blac.getBloc(KeepAliveCounterCubit);

    // Initial state
    expect(cubit.state.count).toBe(0);
    expect(cubit.state.instanceId).toBe(1);

    // Subscribe to track updates
    const listener = vi.fn();
    const unsubscribe = cubit.subscribe(listener);

    // Increment using emit (full state replacement)
    cubit.increment();

    // Verify state was updated
    expect(cubit.state.count).toBe(1);
    expect(cubit.state.instanceId).toBe(1); // Should remain the same
    expect(cubit.state.lastUpdated).toBeGreaterThan(0);

    // Listener should have been called
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(cubit.state);

    // Reset
    cubit.reset();
    expect(cubit.state.count).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('should share state between multiple consumers with improved implementation', () => {
    // Consumer 1
    const consumer1 = Blac.getBloc(KeepAliveCounterCubit);
    const listener1 = vi.fn();
    const unsub1 = consumer1.subscribe(listener1);

    // Initial state
    const initialTime = consumer1.state.lastUpdated;
    expect(consumer1.state.count).toBe(0);

    // Wait a bit to ensure time difference
    const waitPromise = new Promise((resolve) => setTimeout(resolve, 10));

    return waitPromise.then(() => {
      // Increment from consumer 1
      consumer1.increment();

      // Verify update
      expect(consumer1.state.count).toBe(1);
      expect(consumer1.state.lastUpdated).toBeGreaterThan(initialTime);
      expect(listener1).toHaveBeenCalledTimes(1);

      // Consumer 2 joins
      const consumer2 = Blac.getBloc(KeepAliveCounterCubit);
      const listener2 = vi.fn();
      const unsub2 = consumer2.subscribe(listener2);

      // Should be same instance with current state
      expect(consumer2).toBe(consumer1);
      expect(consumer2.state.count).toBe(1);
      expect(consumer2.state.lastUpdated).toBe(consumer1.state.lastUpdated);

      // Increment from consumer 2
      consumer2.increment();

      // Both should see the update
      expect(consumer1.state.count).toBe(2);
      expect(consumer2.state.count).toBe(2);
      expect(consumer1.state.lastUpdated).toBe(consumer2.state.lastUpdated);

      // Both listeners called
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(1);

      // Cleanup
      unsub1();
      unsub2();
    });
  });

  it('should maintain render count and timestamps correctly', () => {
    const cubit = Blac.getBloc(KeepAliveCounterCubit);

    const timestamps: number[] = [];
    const listener = vi.fn((state: CounterState) => {
      timestamps.push(state.lastUpdated);
    });

    const unsubscribe = cubit.subscribe(listener);

    // Perform multiple increments with delays
    const operations = async () => {
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        cubit.increment();
      }
    };

    return operations().then(() => {
      // Should have 3 updates
      expect(listener).toHaveBeenCalledTimes(3);
      expect(cubit.state.count).toBe(3);

      // Timestamps should be increasing
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }

      unsubscribe();
    });
  });

  it('should handle rapid mount/unmount scenarios correctly', () => {
    const events: string[] = [];

    // Simulate component lifecycle
    function mountComponent(id: string) {
      const cubit = Blac.getBloc(KeepAliveCounterCubit);
      events.push(`Component ${id} mounted, sees count: ${cubit.state.count}`);

      const listener = vi.fn(() => {
        events.push(`Component ${id} re-rendered, count: ${cubit.state.count}`);
      });

      const unsubscribe = cubit.subscribe(listener);

      return {
        cubit,
        listener,
        unmount: () => {
          events.push(`Component ${id} unmounting`);
          unsubscribe();
        },
      };
    }

    // Mount component 1
    const comp1 = mountComponent('A');
    expect(comp1.cubit.state.count).toBe(0);

    // Increment
    comp1.cubit.increment();
    expect(events).toContain('Component A re-rendered, count: 1');

    // Mount component 2
    const comp2 = mountComponent('B');
    expect(comp2.cubit.state.count).toBe(1); // Should see current state
    expect(events).toContain('Component B mounted, sees count: 1');

    // Increment from component 2
    comp2.cubit.increment();
    expect(events).toContain('Component A re-rendered, count: 2');
    expect(events).toContain('Component B re-rendered, count: 2');

    // Unmount component 1
    comp1.unmount();
    expect(events).toContain('Component A unmounting');

    // Component 2 continues to work
    comp2.cubit.increment();
    expect(comp2.cubit.state.count).toBe(3);
    expect(comp1.listener).not.toHaveBeenCalledWith(
      expect.objectContaining({ count: 3 }),
    );
    expect(comp2.listener).toHaveBeenCalledWith(
      expect.objectContaining({ count: 3 }),
    );

    // Remount component 1
    const comp1Again = mountComponent('A-again');
    expect(comp1Again.cubit.state.count).toBe(3); // Should see current state
    expect(events).toContain('Component A-again mounted, sees count: 3');

    // Cleanup
    comp2.unmount();
    comp1Again.unmount();

    // Verify event sequence makes sense
    console.log('Event sequence:', events);
    expect(events.length).toBeGreaterThan(0);
  });
});
