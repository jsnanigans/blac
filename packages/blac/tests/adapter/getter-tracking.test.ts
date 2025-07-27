import { describe, expect, it, vi } from 'vitest';
import { BlacAdapter } from '../../src/adapter/BlacAdapter';
import { Cubit } from '../../src';

interface TestState {
  count: number;
  name: string;
}

class TestCubitWithGetters extends Cubit<TestState> {
  constructor() {
    super({ count: 0, name: 'test' });
  }

  get doubleCount() {
    return this.state.count * 2;
  }

  get uppercaseName() {
    return this.state.name.toUpperCase();
  }

  get objectGetter() {
    return { value: this.state.count };
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  changeName = (name: string) => {
    this.emit({ ...this.state, name });
  };
}

describe('Getter Value Tracking', () => {
  it('should detect when getter values change', () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    const componentRef = { current: {} };
    
    const adapter = new BlacAdapter({
      componentRef,
      blocConstructor: TestCubitWithGetters,
    });

    // Create subscription to track changes
    const onChange = vi.fn();
    const unsubscribe = adapter.createSubscription({ onChange });

    // Access getters to track them
    const proxyBloc = adapter.getProxyBlocInstance();
    const initialDouble = proxyBloc.doubleCount;
    
    // Mark as rendered
    adapter.updateLastNotified(componentRef.current);

    // Clear previous logs
    consoleLogSpy.mockClear();
    onChange.mockClear();

    // Change state which affects getter value
    adapter.blocInstance.increment();

    // Check that change was detected
    const changeLog = consoleLogSpy.mock.calls.find(call =>
      call[0].includes('Class getter value changed at doubleCount')
    );
    expect(changeLog).toBeDefined();
    expect(changeLog![0]).toContain('0 -> 2'); // doubleCount went from 0 to 2

    // Verify onChange was called
    expect(onChange).toHaveBeenCalled();

    unsubscribe();
    adapter.unmount();
    consoleLogSpy.mockRestore();
  });

  it('should not trigger re-render if only non-tracked getter values change', () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    const componentRef = { current: {} };
    
    const adapter = new BlacAdapter({
      componentRef,
      blocConstructor: TestCubitWithGetters,
    });

    // Create subscription to track changes
    const onChange = vi.fn();
    const unsubscribe = adapter.createSubscription({ onChange });

    // Access only doubleCount getter (not uppercaseName)
    const proxyBloc = adapter.getProxyBlocInstance();
    const initialDouble = proxyBloc.doubleCount;
    
    // Mark as rendered
    adapter.updateLastNotified(componentRef.current);

    // Clear previous logs
    consoleLogSpy.mockClear();
    onChange.mockClear();

    // Change only the name (which doesn't affect doubleCount)
    adapter.blocInstance.changeName('updated');

    // Check that no change was detected for tracked values
    const noChangeLog = consoleLogSpy.mock.calls.find(call =>
      call[0].includes('No tracked values have changed')
    );
    expect(noChangeLog).toBeDefined();

    // Verify onChange was NOT called
    expect(onChange).not.toHaveBeenCalled();

    unsubscribe();
    adapter.unmount();
    consoleLogSpy.mockRestore();
  });

  it('should not track object getter values', () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    const componentRef = { current: {} };
    
    const adapter = new BlacAdapter({
      componentRef,
      blocConstructor: TestCubitWithGetters,
    });

    // Access object getter
    const proxyBloc = adapter.getProxyBlocInstance();
    const objValue = proxyBloc.objectGetter;
    
    // Find the getter value log
    const getterLogs = consoleLogSpy.mock.calls.filter(call => 
      call[0].includes('Getter value:')
    );
    
    const objectGetterLog = getterLogs.find(log => 
      JSON.stringify(log[1]).includes('"prop":"objectGetter"')
    );
    
    expect(objectGetterLog).toBeDefined();
    expect(objectGetterLog![1].value).toBe('[Object/Function]');
    expect(objectGetterLog![1].isPrimitive).toBe(false);

    adapter.unmount();
    consoleLogSpy.mockRestore();
  });
});