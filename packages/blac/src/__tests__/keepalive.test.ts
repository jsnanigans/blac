import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

interface CounterState {
  count: number;
  instanceId: number;
}

let instanceCounter = 0;

// KeepAlive Cubit - persists even when no components are using it
class KeepAliveCounterCubit extends Cubit<CounterState> {
  static keepAlive = true;

  constructor() {
    instanceCounter++;
    super({ count: 0, instanceId: instanceCounter });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  reset = () => {
    this.patch({ count: 0 });
  };
}

// Regular Cubit - disposed when no components are using it
class RegularCounterCubit extends Cubit<CounterState> {
  constructor() {
    instanceCounter++;
    super({ count: 0, instanceId: instanceCounter });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  reset = () => {
    this.patch({ count: 0 });
  };
}

// Simulate React component mounting/unmounting behavior
class SimulatedComponent {
  name: string;
  bloc: KeepAliveCounterCubit | null = null;
  unsubscribe: (() => void) | null = null;
  lastSeenValue: number = -1;
  listener = vi.fn();

  constructor(name: string) {
    this.name = name;
  }

  mount() {
    this.bloc = Blac.getBloc(KeepAliveCounterCubit);
    // Simulate reading state on mount (like React would do during render)
    this.lastSeenValue = this.bloc.state.count;

    // Subscribe for updates
    this.listener = vi.fn((state: CounterState) => {
      this.lastSeenValue = state.count;
    });
    this.unsubscribe = this.bloc.subscribe(this.listener).unsubscribe;

    return this;
  }

  unmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.bloc = null;
  }

  increment() {
    if (this.bloc) {
      this.bloc.increment();
    }
  }

  getCurrentValue(): number {
    // Simulate what the component "sees" (last rendered value)
    return this.lastSeenValue;
  }
}

describe('KeepAlive', () => {
  beforeEach(() => {
    Blac.resetInstance();
    Blac.enableLog = false;
    instanceCounter = 0;
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  describe('Basic KeepAlive Behavior', () => {
    it('should maintain the same instance across multiple consumers', () => {
      const consumer1 = Blac.getBloc(KeepAliveCounterCubit);
      const instanceId1 = consumer1.state.instanceId;

      const consumer2 = Blac.getBloc(KeepAliveCounterCubit);
      const instanceId2 = consumer2.state.instanceId;

      expect(consumer1).toBe(consumer2);
      expect(instanceId1).toBe(instanceId2);
      expect(instanceCounter).toBe(1); // Only one instance created
    });

    it('should create new instances for regular cubits', () => {
      // For non-keepAlive cubits, we need to create them directly
      const consumer1 = new RegularCounterCubit();
      Blac.activateBloc(consumer1 as any);
      const instanceId1 = consumer1.state.instanceId;

      const consumer2 = new RegularCounterCubit();
      Blac.activateBloc(consumer2 as any);
      const instanceId2 = consumer2.state.instanceId;

      expect(consumer1).not.toBe(consumer2);
      expect(instanceId1).not.toBe(instanceId2);
      expect(instanceCounter).toBe(2); // Two instances created
    });
  });

  describe('State Synchronization Between Consumers', () => {
    it('should update all consumers when state changes in keepAlive cubit', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Create first consumer and subscribe
      const consumer1 = Blac.getBloc(KeepAliveCounterCubit);
      consumer1.subscribe(listener1);

      // Create second consumer and subscribe
      const consumer2 = Blac.getBloc(KeepAliveCounterCubit);
      consumer2.subscribe(listener2);

      // Verify they're the same instance
      expect(consumer1).toBe(consumer2);

      // Initial state
      expect(consumer1.state.count).toBe(0);
      expect(consumer2.state.count).toBe(0);

      // Increment from consumer1
      consumer1.increment();

      // Both should see the update
      expect(consumer1.state.count).toBe(1);
      expect(consumer2.state.count).toBe(1);

      // Both listeners should be called
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      // Increment from consumer2
      consumer2.increment();

      // Both should see the update
      expect(consumer1.state.count).toBe(2);
      expect(consumer2.state.count).toBe(2);

      // Both listeners should be called again
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it('should handle sequential show/hide/increment scenarios', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Show counter 1
      const counter1 = Blac.getBloc(KeepAliveCounterCubit);
      const { unsubscribe: unsubscribe1 } = counter1.subscribe(listener1);

      // Increment counter 1
      counter1.increment();
      expect(counter1.state.count).toBe(1);
      expect(listener1).toHaveBeenCalledTimes(1);

      // Show counter 2 (same instance)
      const counter2 = Blac.getBloc(KeepAliveCounterCubit);
      const { unsubscribe: unsubscribe2 } = counter2.subscribe(listener2);

      // Counter 2 should have the same state
      expect(counter2.state.count).toBe(1);
      expect(counter1).toBe(counter2);

      // Increment counter 1 again
      counter1.increment();

      // Both should see the update
      expect(counter1.state.count).toBe(2);
      expect(counter2.state.count).toBe(2);

      // Both listeners should be called
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(1); // Only called once since it was subscribed after first increment

      // Hide counter 1 (unsubscribe)
      unsubscribe1();

      // Counter 2 should still work
      counter2.increment();
      expect(counter2.state.count).toBe(3);
      expect(listener2).toHaveBeenCalledTimes(2);

      // Listener 1 should not be called since it's unsubscribed
      expect(listener1).toHaveBeenCalledTimes(2);

      // Show counter 1 again
      const counter1Again = Blac.getBloc(KeepAliveCounterCubit);
      const { unsubscribe: unsubscribe1Again } = counter1Again.subscribe(listener1);

      // Should have the persisted state
      expect(counter1Again.state.count).toBe(3);
      expect(counter1Again).toBe(counter2);

      // Increment from counter 2
      counter2.increment();

      // Both should see the update
      expect(counter1Again.state.count).toBe(4);
      expect(counter2.state.count).toBe(4);

      // Both listeners should be called
      expect(listener1).toHaveBeenCalledTimes(3); // Called once more after resubscribe
      expect(listener2).toHaveBeenCalledTimes(3);

      // Cleanup
      unsubscribe1Again();
      unsubscribe2();
    });

    it('should handle complex interaction patterns', () => {
      const listeners = {
        consumer1: vi.fn(),
        consumer2: vi.fn(),
        consumer3: vi.fn(),
      };

      // Create three consumers
      const consumer1 = Blac.getBloc(KeepAliveCounterCubit);
      const consumer2 = Blac.getBloc(KeepAliveCounterCubit);
      const consumer3 = Blac.getBloc(KeepAliveCounterCubit);

      // All should be the same instance
      expect(consumer1).toBe(consumer2);
      expect(consumer2).toBe(consumer3);

      // Subscribe all
      const { unsubscribe: unsub1 } = consumer1.subscribe(listeners.consumer1);
      const { unsubscribe: unsub2 } = consumer2.subscribe(listeners.consumer2);
      const { unsubscribe: unsub3 } = consumer3.subscribe(listeners.consumer3);

      // Increment from consumer1
      consumer1.increment();
      expect(consumer1.state.count).toBe(1);
      expect(consumer2.state.count).toBe(1);
      expect(consumer3.state.count).toBe(1);

      // All listeners should be called
      expect(listeners.consumer1).toHaveBeenCalledTimes(1);
      expect(listeners.consumer2).toHaveBeenCalledTimes(1);
      expect(listeners.consumer3).toHaveBeenCalledTimes(1);

      // Unsubscribe consumer2
      unsub2();

      // Increment from consumer3
      consumer3.increment();
      expect(consumer1.state.count).toBe(2);
      expect(consumer3.state.count).toBe(2);

      // Only active listeners should be called
      expect(listeners.consumer1).toHaveBeenCalledTimes(2);
      expect(listeners.consumer2).toHaveBeenCalledTimes(1); // Not called
      expect(listeners.consumer3).toHaveBeenCalledTimes(2);

      // Resubscribe consumer2
      const { unsubscribe: unsub2Again } = consumer2.subscribe(listeners.consumer2);

      // Reset from consumer2
      consumer2.reset();
      expect(consumer1.state.count).toBe(0);
      expect(consumer2.state.count).toBe(0);
      expect(consumer3.state.count).toBe(0);

      // All active listeners should be called
      expect(listeners.consumer1).toHaveBeenCalledTimes(3);
      expect(listeners.consumer2).toHaveBeenCalledTimes(2);
      expect(listeners.consumer3).toHaveBeenCalledTimes(3);

      // Cleanup
      unsub1();
      unsub2Again();
      unsub3();
    });
  });

  describe('Dependency Tracking with Proxy', () => {
    it('should track dependencies correctly when accessing nested properties', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Enable proxy dependency tracking
      Blac.setConfig({ proxyDependencyTracking: true });

      const consumer1 = Blac.getBloc(KeepAliveCounterCubit);
      const consumer2 = Blac.getBloc(KeepAliveCounterCubit);

      // Subscribe with dependency tracking
      consumer1.subscribe(listener1);
      consumer2.subscribe(listener2);

      // Access state to establish dependencies
      const count1 = consumer1.state.count;
      const count2 = consumer2.state.count;

      expect(count1).toBe(0);
      expect(count2).toBe(0);

      // Increment should notify both
      consumer1.increment();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      // Reset config
      Blac.setConfig({ proxyDependencyTracking: false });
    });

    it('should handle rapid state changes', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const consumer1 = Blac.getBloc(KeepAliveCounterCubit);
      const consumer2 = Blac.getBloc(KeepAliveCounterCubit);

      consumer1.subscribe(listener1);
      consumer2.subscribe(listener2);

      // Rapid increments
      for (let i = 0; i < 10; i++) {
        consumer1.increment();
      }

      expect(consumer1.state.count).toBe(10);
      expect(consumer2.state.count).toBe(10);

      // Both listeners should be called 10 times
      expect(listener1).toHaveBeenCalledTimes(10);
      expect(listener2).toHaveBeenCalledTimes(10);

      // Rapid increments from consumer2
      for (let i = 0; i < 5; i++) {
        consumer2.increment();
      }

      expect(consumer1.state.count).toBe(15);
      expect(consumer2.state.count).toBe(15);

      expect(listener1).toHaveBeenCalledTimes(15);
      expect(listener2).toHaveBeenCalledTimes(15);
    });
  });

  describe('Memory Management', () => {
    it('should keep instance alive when all consumers unsubscribe', () => {
      const consumer1 = Blac.getBloc(KeepAliveCounterCubit);
      const listener1 = vi.fn();
      const { unsubscribe: unsub1 } = consumer1.subscribe(listener1);

      // Increment to change state
      consumer1.increment();
      expect(consumer1.state.count).toBe(1);

      // Unsubscribe all consumers
      unsub1();

      // Create new consumer - should get the same instance with preserved state
      const consumer2 = Blac.getBloc(KeepAliveCounterCubit);
      expect(consumer2).toBe(consumer1);
      expect(consumer2.state.count).toBe(1);
      expect(consumer2.state.instanceId).toBe(consumer1.state.instanceId);
    });

    it('should dispose regular cubit when all consumers unsubscribe', () => {
      const consumer1 = new RegularCounterCubit();
      Blac.activateBloc(consumer1 as any);
      const listener1 = vi.fn();
      const { unsubscribe: unsub1 } = consumer1.subscribe(listener1);

      const firstInstanceId = consumer1.state.instanceId;

      // Increment to change state
      consumer1.increment();
      expect(consumer1.state.count).toBe(1);

      // Unsubscribe all consumers
      unsub1();

      // Create new consumer - should get a new instance
      const consumer2 = new RegularCounterCubit();
      Blac.activateBloc(consumer2 as any);
      expect(consumer2).not.toBe(consumer1);
      expect(consumer2.state.count).toBe(0); // Reset to initial state
      expect(consumer2.state.instanceId).not.toBe(firstInstanceId);
    });
  });

  describe('Specific Dependency Tracking Bug', () => {
    it('should update counter 2 when counter 1 is incremented after both are shown', () => {
      // This test reproduces the exact bug described:
      // 1. Show counter 1
      // 2. Increment counter 1
      // 3. Show counter 2 (should have correct value)
      // 4. Increment counter 1 again
      // 5. Counter 2 should update

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Step 1: Show counter 1
      const counter1 = Blac.getBloc(KeepAliveCounterCubit);
      const { unsubscribe: unsub1 } = counter1.subscribe(listener1);
      expect(counter1.state.count).toBe(0);

      // Step 2: Increment counter 1
      counter1.increment();
      expect(counter1.state.count).toBe(1);
      expect(listener1).toHaveBeenCalledTimes(1);

      // Step 3: Show counter 2 (should have correct value)
      const counter2 = Blac.getBloc(KeepAliveCounterCubit);
      const { unsubscribe: unsub2 } = counter2.subscribe(listener2);
      expect(counter2).toBe(counter1); // Same instance
      expect(counter2.state.count).toBe(1); // Has the incremented value

      // Step 4: Increment counter 1 again
      counter1.increment();

      // Step 5: Both counters should have the updated value
      expect(counter1.state.count).toBe(2);
      expect(counter2.state.count).toBe(2);

      // Both listeners should be notified
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(1); // Called once for the increment after subscription

      // Cleanup
      unsub1();
      unsub2();
    });

    it('should handle alternating show/hide patterns correctly', () => {
      const states: number[] = [];

      // Show counter 1, increment, hide
      const counter1 = Blac.getBloc(KeepAliveCounterCubit);
      const { unsubscribe: unsub1 } = counter1.subscribe(() =>
        states.push(counter1.state.count),
      );
      counter1.increment();
      expect(counter1.state.count).toBe(1);
      unsub1();

      // Show counter 2, verify state, increment, hide
      const counter2 = Blac.getBloc(KeepAliveCounterCubit);
      const { unsubscribe: unsub2 } = counter2.subscribe(() =>
        states.push(counter2.state.count),
      );
      expect(counter2.state.count).toBe(1);
      counter2.increment();
      expect(counter2.state.count).toBe(2);
      unsub2();

      // Show both counters
      const counter3 = Blac.getBloc(KeepAliveCounterCubit);
      const counter4 = Blac.getBloc(KeepAliveCounterCubit);
      const { unsubscribe: unsub3 } = counter3.subscribe(() =>
        states.push(counter3.state.count),
      );
      const { unsubscribe: unsub4 } = counter4.subscribe(() =>
        states.push(counter4.state.count),
      );

      expect(counter3).toBe(counter4);
      expect(counter3.state.count).toBe(2);
      expect(counter4.state.count).toBe(2);

      // Increment from counter3
      counter3.increment();

      // Both should update
      expect(counter3.state.count).toBe(3);
      expect(counter4.state.count).toBe(3);

      // Check that both listeners were called
      expect(states).toEqual([1, 2, 3, 3]);

      // Cleanup
      unsub3();
      unsub4();
    });

    it('should handle multiple rapid subscriptions and updates', () => {
      const results: Array<{ id: string; count: number }> = [];

      // Create multiple consumers rapidly
      const consumers = Array.from({ length: 5 }, (_, i) => {
        const consumer = Blac.getBloc(KeepAliveCounterCubit);
        const { unsubscribe: unsub } = consumer.subscribe(() => {
          results.push({ id: `consumer${i}`, count: consumer.state.count });
        });
        return { consumer, unsub, id: `consumer${i}` };
      });

      // All should be the same instance
      consumers.forEach((c, i) => {
        if (i > 0) {
          expect(c.consumer).toBe(consumers[0].consumer);
        }
      });

      // Increment from different consumers
      consumers[0].consumer.increment(); // All 5 should be notified
      expect(results.length).toBe(5);

      consumers[2].consumer.increment(); // All 5 should be notified again
      expect(results.length).toBe(10);

      consumers[4].consumer.increment(); // All 5 should be notified again
      expect(results.length).toBe(15);

      // Verify all got the correct final state
      const finalResults = results.slice(-5);
      finalResults.forEach((r) => {
        expect(r.count).toBe(3);
      });

      // Cleanup
      consumers.forEach((c) => c.unsub());
    });
  });

  describe('React Component Simulation', () => {
    it('should simulate React component behavior with shared state', () => {
      // Originally from keepalive-subscription-bug.test.ts
      // This pattern simulates how React components interact with KeepAlive blocs

      // Step 1: Mount Counter 1
      const counter1 = new SimulatedComponent('Counter1').mount();
      expect(counter1.getCurrentValue()).toBe(0);
      expect(counter1.bloc?.state.instanceId).toBe(1);

      // Step 2: Increment from Counter 1
      counter1.increment();
      expect(counter1.bloc?.state.count).toBe(1);
      expect(counter1.getCurrentValue()).toBe(1);
      expect(counter1.listener).toHaveBeenCalledTimes(1);

      // Step 3: Mount Counter 2 (should see current state)
      const counter2 = new SimulatedComponent('Counter2').mount();
      expect(counter2.bloc).toBe(counter1.bloc); // Same instance
      expect(counter2.getCurrentValue()).toBe(1); // Should see current state

      // Step 4: Increment from Counter 2
      counter2.increment();
      expect(counter1.getCurrentValue()).toBe(2); // Counter 1 should update
      expect(counter2.getCurrentValue()).toBe(2); // Counter 2 should update
      expect(counter1.listener).toHaveBeenCalledTimes(2);
      expect(counter2.listener).toHaveBeenCalledTimes(1);

      // Step 5: Unmount Counter 2
      counter2.unmount();

      // Step 6: Increment from Counter 1 (while Counter 2 is unmounted)
      counter1.increment();
      expect(counter1.getCurrentValue()).toBe(3);
      expect(counter1.listener).toHaveBeenCalledTimes(3);

      // Step 7: Remount Counter 2
      const counter2Again = new SimulatedComponent('Counter2-Remounted').mount();
      expect(counter2Again.getCurrentValue()).toBe(3); // Should see current state

      // Step 8: Final increment from remounted Counter 2
      counter2Again.increment();
      expect(counter1.getCurrentValue()).toBe(4);
      expect(counter2Again.getCurrentValue()).toBe(4);
      expect(counter1.listener).toHaveBeenCalledTimes(4);
      expect(counter2Again.listener).toHaveBeenCalledTimes(1);

      // Cleanup
      counter1.unmount();
      counter2Again.unmount();
    });

    it('should handle rapid component mount/unmount/increment', () => {
      // Helper to create a tracked consumer
      function createConsumer(id: string) {
        const bloc = Blac.getBloc(KeepAliveCounterCubit);
        let seenValue = bloc.state.count;

        const listener = vi.fn((state: CounterState) => {
          seenValue = state.count;
        });

        const { unsubscribe } = bloc.subscribe(listener);

        return {
          id,
          bloc,
          listener,
          unsubscribe,
          getSeenValue: () => seenValue,
          increment: () => {
            bloc.increment();
          },
        };
      }

      // Scenario: Rapid operations
      const c1 = createConsumer('C1');
      expect(c1.getSeenValue()).toBe(0);

      c1.increment();
      expect(c1.getSeenValue()).toBe(1);

      const c2 = createConsumer('C2');
      expect(c2.getSeenValue()).toBe(1); // Should see current state

      c2.increment();
      expect(c1.getSeenValue()).toBe(2);
      expect(c2.getSeenValue()).toBe(2);

      // Unmount C1
      c1.unsubscribe();

      // C2 continues to work
      c2.increment();
      expect(c2.getSeenValue()).toBe(3);

      // Remount C1
      const c1Again = createConsumer('C1-again');
      expect(c1Again.getSeenValue()).toBe(3);

      // Both work together
      c1Again.increment();
      expect(c1Again.getSeenValue()).toBe(4);
      expect(c2.getSeenValue()).toBe(4);

      // Verify listener call counts
      expect(c1.listener).toHaveBeenCalledTimes(2); // Before unmount
      expect(c2.listener).toHaveBeenCalledTimes(3); // All increments after mount
      expect(c1Again.listener).toHaveBeenCalledTimes(1); // After remount

      // Cleanup
      c2.unsubscribe();
      c1Again.unsubscribe();
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscribe/unsubscribe in rapid succession', () => {
      const consumer = Blac.getBloc(KeepAliveCounterCubit);
      const listeners = Array.from({ length: 10 }, () => vi.fn());

      // Rapidly subscribe and unsubscribe
      const unsubscribes = listeners.map((listener) =>
        consumer.subscribe(listener).unsubscribe,
      );

      // Increment once
      consumer.increment();

      // All should be notified
      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(1);
      });

      // Unsubscribe half
      unsubscribes.slice(0, 5).forEach((unsub) => unsub());

      // Increment again
      consumer.increment();

      // Only remaining half should be notified
      listeners.slice(0, 5).forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(1); // Not called again
      });
      listeners.slice(5).forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(2); // Called again
      });

      // Cleanup
      unsubscribes.slice(5).forEach((unsub) => unsub());
    });

    it('should handle state changes during subscription', () => {
      const consumer = Blac.getBloc(KeepAliveCounterCubit);
      const listener = vi.fn();

      // Subscribe and immediately change state
      const unsub = consumer.subscribe(() => {
        listener();
        if (consumer.state.count < 3) {
          consumer.increment();
        }
      });

      // Trigger initial increment
      consumer.increment();

      // Should cascade up to count of 3
      expect(consumer.state.count).toBe(3);
      expect(listener).toHaveBeenCalledTimes(3);

      unsub();
    });
  });
});
