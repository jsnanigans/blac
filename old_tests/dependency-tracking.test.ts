import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlacAdapter } from '../../src/adapter/BlacAdapter';
import { Cubit } from '../../src/Cubit';
import { Blac } from '../../src/Blac';

interface TestState {
  count: number;
  name: string;
  nested: {
    value: number;
  };
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({
      count: 0,
      name: 'test',
      nested: { value: 0 },
    });
  }

  incrementCount = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  updateName = (name: string) => {
    this.emit({ ...this.state, name });
  };

  updateNested = (value: number) => {
    this.emit({ ...this.state, nested: { value } });
  };
}

describe('BlacAdapter - Dependency Tracking', () => {
  beforeEach(() => {
    Blac.disposeBlocs(() => true); // Dispose all blocs
    vi.spyOn(console, 'log'); // Spy on console.log for debugging
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should bypass proxy creation when dependencies are provided', () => {
    const componentRef = { current: {} };
    
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: TestCubit },
      {
        dependencies: (bloc) => [bloc.state.count],
      }
    );

    const state = adapter.blocInstance.state;
    const proxyState = adapter.getProxyState(state);
    
    // When using dependencies, should return raw state (no proxy)
    expect(proxyState).toBe(state);
    
    const proxyBloc = adapter.getProxyBlocInstance();
    // When using dependencies, should return raw bloc instance (no proxy)
    expect(proxyBloc).toBe(adapter.blocInstance);
  });

  it('should only trigger re-render when dependency values change', () => {
    const componentRef = { current: {} };
    const onChange = vi.fn();
    
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: TestCubit },
      {
        dependencies: (bloc) => [bloc.state.count],
      }
    );

    adapter.mount();
    const unsubscribe = adapter.createSubscription({ onChange });

    // Check if the observer was properly created
    const logSpy = vi.spyOn(console, 'log');
    
    // Log initial state
    console.log('[TEST] Initial state:', adapter.blocInstance.state);
    console.log('[TEST] Initial dependency values:', (adapter as any).dependencyValues);
    
    // Trigger changes synchronously - Blac state updates are synchronous
    
    // Change a value that's not in the dependencies
    adapter.blocInstance.updateName('new name');
    
    // Check logs for subscription callback
    const callbackLogs = logSpy.mock.calls.filter(call => 
      typeof call[0] === 'string' && call[0].includes('Subscription callback triggered')
    );
    console.log('[TEST] Callback logs after name change:', callbackLogs.length);
    
    // Should NOT trigger onChange because name is not a dependency
    expect(onChange).not.toHaveBeenCalled();

    // Change a value that IS in the dependencies
    adapter.blocInstance.incrementCount();
    console.log('[TEST] State after increment:', adapter.blocInstance.state);
    
    // Check logs again
    const callbackLogs2 = logSpy.mock.calls.filter(call => 
      typeof call[0] === 'string' && call[0].includes('Subscription callback triggered')
    );
    console.log('[TEST] Callback logs after count change:', callbackLogs2.length);
    
    // Should trigger onChange because count is a dependency
    expect(onChange).toHaveBeenCalledTimes(1);

    // Clear and test again
    onChange.mockClear();
    
    // Another non-dependency change
    adapter.blocInstance.updateNested(100);
    expect(onChange).not.toHaveBeenCalled();
    
    // Another dependency change
    adapter.blocInstance.incrementCount();
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    adapter.unmount();
  });

  it('should handle multiple dependencies', () => {
    const componentRef = { current: {} };
    const onChange = vi.fn();
    
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: TestCubit },
      {
        dependencies: (bloc) => [bloc.state.count, bloc.state.nested.value],
      }
    );

    adapter.mount();
    const unsubscribe = adapter.createSubscription({ onChange });

    // Change name (not a dependency)
    adapter.blocInstance.updateName('new name');
    expect(onChange).not.toHaveBeenCalled();

    // Change count (first dependency)
    adapter.blocInstance.incrementCount();
    expect(onChange).toHaveBeenCalledTimes(1);

    // Change nested value (second dependency)
    adapter.blocInstance.updateNested(42);
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    adapter.unmount();
  });

  it('should handle dependency function that returns different array lengths', () => {
    const componentRef = { current: {} };
    const onChange = vi.fn();
    let includeNested = false;
    
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: TestCubit },
      {
        dependencies: (bloc) => {
          const deps = [bloc.state.count];
          if (includeNested) {
            deps.push(bloc.state.nested.value);
          }
          return deps;
        },
      }
    );

    adapter.mount();
    const unsubscribe = adapter.createSubscription({ onChange });

    // Increment count
    adapter.blocInstance.incrementCount();
    expect(onChange).toHaveBeenCalledTimes(1);

    // Now include nested in dependencies
    includeNested = true;
    
    // This will trigger a change because the dependency array length changed
    adapter.blocInstance.updateNested(100);
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    adapter.unmount();
  });

  it('should use Object.is for equality checks', () => {
    const componentRef = { current: {} };
    const onChange = vi.fn();
    
    class NumberCubit extends Cubit<{ value: number }> {
      constructor() {
        super({ value: 0 });
      }
      
      setValue = (value: number) => {
        this.emit({ value });
      };
    }
    
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: NumberCubit },
      {
        dependencies: (bloc) => [bloc.state.value],
      }
    );

    adapter.mount();
    const unsubscribe = adapter.createSubscription({ onChange });

    // Set to NaN
    adapter.blocInstance.setValue(NaN);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Set to NaN again - should not trigger because NaN === NaN with Object.is
    adapter.blocInstance.setValue(NaN);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Set to 0
    adapter.blocInstance.setValue(0);
    expect(onChange).toHaveBeenCalledTimes(2);

    // Set to -0 (different from 0 with Object.is)
    adapter.blocInstance.setValue(-0);
    expect(onChange).toHaveBeenCalledTimes(3);

    unsubscribe();
    adapter.unmount();
  });

  it('should refresh dependency values on mount', () => {
    const componentRef = { current: {} };
    let mountCallCount = 0;
    
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: TestCubit },
      {
        dependencies: (bloc) => {
          mountCallCount++;
          return [bloc.state.count];
        },
      }
    );

    // Dependencies should be called once during construction
    expect(mountCallCount).toBe(1);

    // Mount should refresh dependencies
    adapter.mount();
    expect(mountCallCount).toBe(2);
  });
});