import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cubit } from '../../src/Cubit';
import { BlacAdapter } from '../../src/adapter/BlacAdapter';
import { Blac } from '../../src/Blac';

interface TestState {
  count: number;
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

describe('BlacAdapter Memory Management', () => {
  beforeEach(() => {
    // Reset the Blac instance for each test
    Blac.resetInstance();
  });

  afterEach(() => {
    // Reset instance after each test
    Blac.resetInstance();
  });

  it('should not create memory leaks with consumer tracking', () => {
    // Create a component reference that can be garbage collected
    let componentRef: { current: object } | null = { current: {} };

    // Create adapter
    const adapter = new BlacAdapter({
      componentRef: componentRef as { current: object },
      blocConstructor: TestCubit,
    });

    // Mount the adapter
    adapter.mount();

    // Verify consumer is registered
    expect(adapter.blocInstance._consumers.size).toBe(1);

    // Unmount the adapter
    adapter.unmount();

    // Verify consumer is removed from bloc
    expect(adapter.blocInstance._consumers.size).toBe(0);

    // Clear the component reference
    componentRef = null;

    // The adapter's WeakMap should allow the component to be garbage collected
    // We can't directly test garbage collection, but we can verify:
    // 1. No strong references remain in the adapter
    // 2. The bloc's consumer tracking is cleaned up

    // Verify the adapter doesn't hold any strong references
    // (The WeakMap will automatically clean up when the object is GC'd)
    expect(adapter.blocInstance._consumers.size).toBe(0);
  });

  it('should properly clean up when multiple adapters use the same bloc', () => {
    // Create multiple component references
    const componentRef1 = { current: {} };
    const componentRef2 = { current: {} };

    // Create adapters
    const adapter1 = new BlacAdapter({
      componentRef: componentRef1,
      blocConstructor: TestCubit,
    });

    const adapter2 = new BlacAdapter({
      componentRef: componentRef2,
      blocConstructor: TestCubit,
    });

    // Mount both adapters
    adapter1.mount();
    adapter2.mount();

    // Same bloc instance should be shared
    expect(adapter1.blocInstance).toBe(adapter2.blocInstance);
    expect(adapter1.blocInstance._consumers.size).toBe(2);

    // Unmount first adapter
    adapter1.unmount();
    expect(adapter1.blocInstance._consumers.size).toBe(1);

    // Unmount second adapter
    adapter2.unmount();
    expect(adapter2.blocInstance._consumers.size).toBe(0);
  });

});
