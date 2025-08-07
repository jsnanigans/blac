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
    console.log(
      `KeepAliveCounterCubit instance ${this.state.instanceId} CONSTRUCTED.`,
    );
  }

  increment = () => {
    const newCount = this.state.count + 1;
    console.log(
      `KeepAliveCounterCubit instance ${this.state.instanceId} incrementing from ${this.state.count} to ${newCount}`,
    );
    this.patch({ count: newCount });
  };

  reset = () => {
    this.patch({ count: 0 });
  };
}

describe('KeepAlive Subscription Bug - Exact Reproduction', () => {
  beforeEach(() => {
    Blac.resetInstance();
    Blac.enableLog = false;
    instanceCounter = 0;
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should reproduce the exact bug scenario described', () => {
    console.log('\n=== Starting Bug Reproduction Test ===\n');

    // Simulating: "render KeepAlive Pattern"
    console.log('Step 1: Render KeepAlive Pattern');

    // Simulating: Show KeepAlive Counter (1)
    console.log('Step 2: Show KeepAlive Counter (1)');
    const counter1Instance = Blac.getBloc(KeepAliveCounterCubit);

    // Track what counter 1 "sees"
    let counter1SeenValue = counter1Instance.state.count;
    const counter1Listener = vi.fn((state: CounterState) => {
      console.log(`  Counter 1 listener called with count: ${state.count}`);
      counter1SeenValue = state.count;
    });
    const unsubscribe1 = counter1Instance.subscribe(counter1Listener);

    // Verify initial state
    expect(counter1Instance.state.instanceId).toBe(1);
    expect(counter1Instance.state.count).toBe(0);
    expect(counter1SeenValue).toBe(0);
    console.log(
      `  Counter 1 sees: ${counter1SeenValue}, instanceId: ${counter1Instance.state.instanceId}`,
    );

    // Simulating: "KeepAlive Counter (1) : INCREMENT"
    console.log('\nStep 3: INCREMENT in KeepAlive Counter (1)');
    counter1Instance.increment();

    // Check state after increment
    console.log(`  Counter 1 state.count: ${counter1Instance.state.count}`);
    console.log(`  Counter 1 seen value: ${counter1SeenValue}`);

    // THE BUG: "i still see 0" - This suggests the listener wasn't called
    expect(counter1Instance.state.count).toBe(1); // State should be 1
    expect(counter1SeenValue).toBe(1); // What counter 1 "sees" should also be 1
    expect(counter1Listener).toHaveBeenCalledTimes(1); // Listener should have been called

    // Simulating: "show counter 2"
    console.log('\nStep 4: Show counter 2');
    const counter2Instance = Blac.getBloc(KeepAliveCounterCubit);

    // They should be the same instance
    expect(counter2Instance).toBe(counter1Instance);
    expect(counter2Instance.state.instanceId).toBe(1);

    // Track what counter 2 "sees"
    let counter2SeenValue = counter2Instance.state.count;
    const counter2Listener = vi.fn((state: CounterState) => {
      console.log(`  Counter 2 listener called with count: ${state.count}`);
      counter2SeenValue = state.count;
    });
    const unsubscribe2 = counter2Instance.subscribe(counter2Listener);

    // "now i see 1 on both of them"
    console.log(`  Counter 1 sees: ${counter1SeenValue}`);
    console.log(`  Counter 2 sees: ${counter2SeenValue}`);
    expect(counter1SeenValue).toBe(1);
    expect(counter2SeenValue).toBe(1);

    // Simulating: "increment in KeepAlive Counter (2)"
    console.log('\nStep 5: INCREMENT in KeepAlive Counter (2)');
    counter2Instance.increment();

    // "the count on KeepAlive Counter (1) increases"
    console.log(`  Counter 1 sees: ${counter1SeenValue}`);
    console.log(`  Counter 2 sees: ${counter2SeenValue}`);
    expect(counter1Instance.state.count).toBe(2);
    expect(counter2Instance.state.count).toBe(2);
    expect(counter1SeenValue).toBe(2); // Counter 1 should see the update
    expect(counter2SeenValue).toBe(2); // Counter 2 should see the update
    expect(counter1Listener).toHaveBeenCalledTimes(2); // Should be called again
    expect(counter2Listener).toHaveBeenCalledTimes(1); // Should be called once

    // Simulating: "hide 2"
    console.log('\nStep 6: Hide counter 2');
    unsubscribe2();

    // Simulating: "show 2"
    console.log('\nStep 7: Show counter 2 again');
    const counter2InstanceAgain = Blac.getBloc(KeepAliveCounterCubit);
    expect(counter2InstanceAgain).toBe(counter1Instance);

    let counter2SeenValueAgain = counter2InstanceAgain.state.count;
    const counter2ListenerAgain = vi.fn((state: CounterState) => {
      console.log(
        `  Counter 2 (again) listener called with count: ${state.count}`,
      );
      counter2SeenValueAgain = state.count;
    });
    const unsubscribe2Again = counter2InstanceAgain.subscribe(
      counter2ListenerAgain,
    );

    // "now 2 also shows correct count"
    console.log(`  Counter 2 (again) sees: ${counter2SeenValueAgain}`);
    expect(counter2SeenValueAgain).toBe(2);

    // Test one more increment to ensure both are still working
    console.log('\nStep 8: Final INCREMENT from Counter 1');
    counter1Instance.increment();

    console.log(`  Counter 1 sees: ${counter1SeenValue}`);
    console.log(`  Counter 2 (again) sees: ${counter2SeenValueAgain}`);
    expect(counter1SeenValue).toBe(3);
    expect(counter2SeenValueAgain).toBe(3);
    expect(counter1Listener).toHaveBeenCalledTimes(3);
    expect(counter2ListenerAgain).toHaveBeenCalledTimes(1);

    // Cleanup
    unsubscribe1();
    unsubscribe2Again();

    console.log('\n=== Test Complete ===\n');
  });

  it('should test the issue with simulated React component behavior', () => {
    console.log('\n=== Simulating React Component Behavior ===\n');

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
        console.log(`[${this.name}] Mounting...`);
        this.bloc = Blac.getBloc(KeepAliveCounterCubit);

        // Simulate reading state on mount (like React would do during render)
        this.lastSeenValue = this.bloc.state.count;
        console.log(
          `[${this.name}] Initial render sees count: ${this.lastSeenValue}`,
        );

        // Subscribe for updates
        this.listener = vi.fn((state: CounterState) => {
          console.log(
            `[${this.name}] Re-render triggered with count: ${state.count}`,
          );
          this.lastSeenValue = state.count;
        });
        this.unsubscribe = this.bloc.subscribe(this.listener);

        return this;
      }

      unmount() {
        console.log(`[${this.name}] Unmounting...`);
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
        this.bloc = null;
      }

      increment() {
        console.log(`[${this.name}] User clicks increment button`);
        if (this.bloc) {
          this.bloc.increment();
        }
      }

      getCurrentValue(): number {
        // Simulate what the component "sees" (last rendered value)
        return this.lastSeenValue;
      }
    }

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

    console.log('\n=== Simulation Complete ===\n');
  });

  it('should test rapid mount/unmount/increment scenarios', () => {
    const log: string[] = [];

    // Helper to create a tracked consumer
    function createConsumer(id: string) {
      const bloc = Blac.getBloc(KeepAliveCounterCubit);
      let seenValue = bloc.state.count;

      const listener = vi.fn((state: CounterState) => {
        seenValue = state.count;
        log.push(`${id} updated to ${state.count}`);
      });

      const unsubscribe = bloc.subscribe(listener);
      log.push(`${id} mounted, sees ${seenValue}`);

      return {
        id,
        bloc,
        listener,
        unsubscribe,
        getSeenValue: () => seenValue,
        increment: () => {
          log.push(`${id} increments`);
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
    log.push('C1 unmounted');

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

    // Verify the sequence
    console.log('\nOperation Log:');
    log.forEach((entry) => console.log(`  ${entry}`));

    // Verify listener call counts
    expect(c1.listener).toHaveBeenCalledTimes(2); // Before unmount
    expect(c2.listener).toHaveBeenCalledTimes(3); // All increments after mount
    expect(c1Again.listener).toHaveBeenCalledTimes(1); // After remount

    // Cleanup
    c2.unsubscribe();
    c1Again.unsubscribe();
  });
});
