import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';
import { BlacAdapter } from '../adapter/BlacAdapter';

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

describe('KeepAlive React Hook Simulation', () => {
  beforeEach(() => {
    Blac.resetInstance();
    Blac.enableLog = false;
    instanceCounter = 0;
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should simulate React useBloc hook behavior with BlacAdapter', () => {
    console.log('\n=== Simulating React Hook with BlacAdapter ===\n');

    // Simulate first component mounting (Counter 1)
    console.log('Step 1: Mount Counter 1');
    const componentRef1 = { current: {} };
    const adapter1 = new BlacAdapter(
      { componentRef: componentRef1, blocConstructor: KeepAliveCounterCubit },
      {},
    );

    // Simulate mount
    adapter1.mount();

    // Get initial state
    let counter1State = adapter1.blocInstance.state;
    console.log(
      `  Counter 1 initial state: count=${counter1State.count}, instanceId=${counter1State.instanceId}`,
    );
    expect(counter1State.count).toBe(0);
    expect(counter1State.instanceId).toBe(1);

    // Create subscription (simulating useSyncExternalStore)
    const listener1 = vi.fn();
    const unsubscribe1 = adapter1.createSubscription({
      onChange: () => {
        counter1State = adapter1.blocInstance.state;
        console.log(
          `  Counter 1 onChange called, new count: ${counter1State.count}`,
        );
        listener1();
      },
    });

    // Step 2: Increment from Counter 1
    console.log('\nStep 2: Increment from Counter 1');
    adapter1.blocInstance.increment();

    // Check if listener was called
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(counter1State.count).toBe(1);
    console.log(`  Counter 1 sees count: ${counter1State.count}`);

    // Step 3: Mount Counter 2
    console.log('\nStep 3: Mount Counter 2');
    const componentRef2 = { current: {} };
    const adapter2 = new BlacAdapter(
      { componentRef: componentRef2, blocConstructor: KeepAliveCounterCubit },
      {},
    );

    adapter2.mount();

    // Verify they share the same instance
    expect(adapter2.blocInstance).toBe(adapter1.blocInstance);

    let counter2State = adapter2.blocInstance.state;
    console.log(
      `  Counter 2 initial state: count=${counter2State.count}, instanceId=${counter2State.instanceId}`,
    );
    expect(counter2State.count).toBe(1); // Should see the incremented value

    // Create subscription for Counter 2
    const listener2 = vi.fn();
    const unsubscribe2 = adapter2.createSubscription({
      onChange: () => {
        counter2State = adapter2.blocInstance.state;
        console.log(
          `  Counter 2 onChange called, new count: ${counter2State.count}`,
        );
        listener2();
      },
    });

    // Step 4: Increment from Counter 2
    console.log('\nStep 4: Increment from Counter 2');
    adapter2.blocInstance.increment();

    // Both listeners should be called
    expect(listener1).toHaveBeenCalledTimes(2);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(counter1State.count).toBe(2);
    expect(counter2State.count).toBe(2);
    console.log(`  Counter 1 sees count: ${counter1State.count}`);
    console.log(`  Counter 2 sees count: ${counter2State.count}`);

    // Step 5: Unmount Counter 2
    console.log('\nStep 5: Unmount Counter 2');
    unsubscribe2();
    adapter2.unmount();

    // Step 6: Increment from Counter 1 while Counter 2 is unmounted
    console.log('\nStep 6: Increment from Counter 1 (Counter 2 unmounted)');
    adapter1.blocInstance.increment();

    expect(listener1).toHaveBeenCalledTimes(3);
    expect(listener2).toHaveBeenCalledTimes(1); // Should not be called
    expect(counter1State.count).toBe(3);
    console.log(`  Counter 1 sees count: ${counter1State.count}`);

    // Step 7: Remount Counter 2
    console.log('\nStep 7: Remount Counter 2');
    const componentRef2Again = { current: {} };
    const adapter2Again = new BlacAdapter(
      {
        componentRef: componentRef2Again,
        blocConstructor: KeepAliveCounterCubit,
      },
      {},
    );

    adapter2Again.mount();

    let counter2StateAgain = adapter2Again.blocInstance.state;
    console.log(
      `  Counter 2 (remounted) initial state: count=${counter2StateAgain.count}`,
    );
    expect(counter2StateAgain.count).toBe(3); // Should see current state

    const listener2Again = vi.fn();
    const unsubscribe2Again = adapter2Again.createSubscription({
      onChange: () => {
        counter2StateAgain = adapter2Again.blocInstance.state;
        console.log(
          `  Counter 2 (remounted) onChange called, new count: ${counter2StateAgain.count}`,
        );
        listener2Again();
      },
    });

    // Step 8: Final increment
    console.log('\nStep 8: Final increment from Counter 1');
    adapter1.blocInstance.increment();

    expect(listener1).toHaveBeenCalledTimes(4);
    expect(listener2Again).toHaveBeenCalledTimes(1);
    expect(counter1State.count).toBe(4);
    expect(counter2StateAgain.count).toBe(4);

    // Cleanup
    unsubscribe1();
    adapter1.unmount();
    unsubscribe2Again();
    adapter2Again.unmount();

    console.log('\n=== Test Complete ===\n');
  });

  it('should test potential race conditions with adapter', () => {
    console.log('\n=== Testing Race Conditions ===\n');

    // Create adapter and immediately increment before subscription
    const componentRef = { current: {} };
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: KeepAliveCounterCubit },
      {},
    );

    adapter.mount();

    // Increment BEFORE creating subscription
    console.log('Incrementing before subscription...');
    adapter.blocInstance.increment();
    expect(adapter.blocInstance.state.count).toBe(1);

    // Now create subscription
    let seenState = adapter.blocInstance.state;
    const listener = vi.fn();
    const unsubscribe = adapter.createSubscription({
      onChange: () => {
        seenState = adapter.blocInstance.state;
        console.log(`  onChange called, new count: ${seenState.count}`);
        listener();
      },
    });

    // The subscription should see the current state
    expect(seenState.count).toBe(1);

    // Increment again
    console.log('Incrementing after subscription...');
    adapter.blocInstance.increment();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(seenState.count).toBe(2);

    // Cleanup
    unsubscribe();
    adapter.unmount();
  });

  it('should test multiple adapters with same componentRef', () => {
    console.log('\n=== Testing Multiple Adapters Same ComponentRef ===\n');

    const sharedComponentRef = { current: {} };

    // Create first adapter
    const adapter1 = new BlacAdapter(
      {
        componentRef: sharedComponentRef,
        blocConstructor: KeepAliveCounterCubit,
      },
      {},
    );
    adapter1.mount();

    let state1 = adapter1.blocInstance.state;
    const listener1 = vi.fn();
    const unsub1 = adapter1.createSubscription({
      onChange: () => {
        state1 = adapter1.blocInstance.state;
        listener1();
      },
    });

    // Increment
    adapter1.blocInstance.increment();
    expect(state1.count).toBe(1);
    expect(listener1).toHaveBeenCalledTimes(1);

    // Create second adapter with SAME componentRef (shouldn't happen in React but testing edge case)
    const adapter2 = new BlacAdapter(
      {
        componentRef: sharedComponentRef,
        blocConstructor: KeepAliveCounterCubit,
      },
      {},
    );
    adapter2.mount();

    // Should be same bloc instance
    expect(adapter2.blocInstance).toBe(adapter1.blocInstance);

    let state2 = adapter2.blocInstance.state;
    const listener2 = vi.fn();
    const unsub2 = adapter2.createSubscription({
      onChange: () => {
        state2 = adapter2.blocInstance.state;
        listener2();
      },
    });

    // State should be current
    expect(state2.count).toBe(1);

    // Increment from adapter2
    adapter2.blocInstance.increment();

    // Both should be notified
    expect(listener1).toHaveBeenCalledTimes(2);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(state1.count).toBe(2);
    expect(state2.count).toBe(2);

    // Cleanup
    unsub1();
    unsub2();
    adapter1.unmount();
    adapter2.unmount();
  });
});
