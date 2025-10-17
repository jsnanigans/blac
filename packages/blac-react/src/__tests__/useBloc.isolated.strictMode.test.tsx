import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useBloc } from '../index';
import { Cubit, Blac } from '@blac/core';

// Isolated counter - each instance gets its own state
class IsolatedCounterCubit extends Cubit<{ count: number }> {
  static isolated = true; // This makes each component instance get its own Cubit

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };
}

describe('useBloc with isolated blocs in React Strict Mode', () => {
  beforeEach(() => {
    Blac.setConfig({
      proxyDependencyTracking: true,
    });
    Blac.resetInstance();
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should create exactly one instance per component (not doubled in strict mode)', async () => {
    const IsolatedCounter: React.FC<{ label: string }> = ({ label }) => {
      const [state, cubit] = useBloc(IsolatedCounterCubit);

      return (
        <div>
          <span data-testid={`count-${label}`}>{state.count}</span>
          <button onClick={cubit.increment}>+</button>
        </div>
      );
    };

    const App = () => {
      return (
        <React.StrictMode>
          <div>
            <IsolatedCounter label="A" />
            <IsolatedCounter label="B" />
            <IsolatedCounter label="C" />
          </div>
        </React.StrictMode>
      );
    };

    render(<App />);

    // Wait for strict mode double-mount to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const blacInstance = Blac.getInstance();

    // Check isolatedBlocMap - should have exactly 3 instances
    const isolatedBlocs = blacInstance.isolatedBlocMap.get(IsolatedCounterCubit);
    expect(isolatedBlocs?.length).toBe(3);

    // Check isolatedBlocIndex - should have exactly 3 entries
    const isolatedIndexSize = blacInstance.isolatedBlocIndex.size;
    expect(isolatedIndexSize).toBe(3);

    // Check uidRegistry - should have exactly 3 entries
    const uidRegistrySize = (blacInstance as any).uidRegistry?.size || 0;
    expect(uidRegistrySize).toBe(3);

    // Verify all counters work independently
    expect(screen.getByTestId('count-A')).toHaveTextContent('0');
    expect(screen.getByTestId('count-B')).toHaveTextContent('0');
    expect(screen.getByTestId('count-C')).toHaveTextContent('0');
  });

  it('should dispose and clean up all isolated instances after unmount', async () => {
    const IsolatedCounter: React.FC<{ label: string }> = ({ label }) => {
      const [state, cubit] = useBloc(IsolatedCounterCubit);

      return (
        <div>
          <span data-testid={`count-${label}`}>{state.count}</span>
          <button onClick={cubit.increment}>+</button>
        </div>
      );
    };

    const App = () => {
      const [show, setShow] = React.useState(true);
      return (
        <React.StrictMode>
          <div>
            <button onClick={() => setShow(!show)}>Toggle</button>
            {show && (
              <>
                <IsolatedCounter label="A" />
                <IsolatedCounter label="B" />
                <IsolatedCounter label="C" />
              </>
            )}
          </div>
        </React.StrictMode>
      );
    };

    render(<App />);

    // Wait for strict mode double-mount to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const blacInstance = Blac.getInstance();

    // Verify 3 instances exist
    expect(blacInstance.isolatedBlocMap.get(IsolatedCounterCubit)?.length).toBe(3);
    expect(blacInstance.isolatedBlocIndex.size).toBe(3);

    // Unmount components
    act(() => {
      screen.getByText('Toggle').click();
    });

    // Wait a bit for unmount to propagate
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Trigger garbage collection hint (if available)
    if (global.gc) {
      global.gc();
    }

    // Wait for disposal timeout
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    // Manually trigger disposal for testing (blocs should auto-dispose but let's verify)
    const blocs = blacInstance.isolatedBlocMap.get(IsolatedCounterCubit) || [];

    // Check bloc states before expecting disposal
    const isolatedBlocsAfter = blacInstance.isolatedBlocMap.get(IsolatedCounterCubit);

    // The map should either be empty or deleted entirely
    if (isolatedBlocsAfter) {
      // All remaining blocs should be disposed
      const disposedCount = isolatedBlocsAfter.filter(b =>
        (b as any)._lifecycleManager?.currentState === 'DISPOSED'
      ).length;
      expect(disposedCount).toBe(isolatedBlocsAfter.length);
    }

    // isolatedBlocIndex should be empty
    expect(blacInstance.isolatedBlocIndex.size).toBe(0);

    // uidRegistry should be empty (or have only disposed entries)
    const uidRegistrySize = (blacInstance as any).uidRegistry?.size || 0;
    expect(uidRegistrySize).toBe(0);
  });

  it('should keep instances independent even after strict mode remounts', async () => {
    const IsolatedCounter: React.FC<{ label: string }> = ({ label }) => {
      const [state, cubit] = useBloc(IsolatedCounterCubit);

      return (
        <div>
          <span data-testid={`count-${label}`}>{state.count}</span>
          <button onClick={cubit.increment} data-testid={`inc-${label}`}>+</button>
        </div>
      );
    };

    render(
      <React.StrictMode>
        <div>
          <IsolatedCounter label="A" />
          <IsolatedCounter label="B" />
          <IsolatedCounter label="C" />
        </div>
      </React.StrictMode>
    );

    // Wait for strict mode to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Increment counter A
    act(() => {
      screen.getByTestId('inc-A').click();
    });

    // Verify only A changed
    expect(screen.getByTestId('count-A')).toHaveTextContent('1');
    expect(screen.getByTestId('count-B')).toHaveTextContent('0');
    expect(screen.getByTestId('count-C')).toHaveTextContent('0');

    // Increment counter B twice
    act(() => {
      screen.getByTestId('inc-B').click();
      screen.getByTestId('inc-B').click();
    });

    // Verify B changed independently
    expect(screen.getByTestId('count-A')).toHaveTextContent('1');
    expect(screen.getByTestId('count-B')).toHaveTextContent('2');
    expect(screen.getByTestId('count-C')).toHaveTextContent('0');
  });

  it('should handle mount/unmount/remount without leaking instances', async () => {
    const IsolatedCounter: React.FC<{ label: string }> = ({ label }) => {
      const [state, cubit] = useBloc(IsolatedCounterCubit);

      return (
        <div>
          <span data-testid={`count-${label}`}>{state.count}</span>
          <button onClick={cubit.increment} data-testid={`inc-${label}`}>+</button>
        </div>
      );
    };

    const App = () => {
      const [show, setShow] = React.useState(true);
      return (
        <React.StrictMode>
          <div>
            <button onClick={() => setShow(!show)}>Toggle</button>
            {show && (
              <>
                <IsolatedCounter label="A" />
                <IsolatedCounter label="B" />
              </>
            )}
          </div>
        </React.StrictMode>
      );
    };

    render(<App />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const blacInstance = Blac.getInstance();

    // Initial state: 2 instances
    expect(blacInstance.isolatedBlocMap.get(IsolatedCounterCubit)?.length).toBe(2);

    // Update state
    act(() => {
      screen.getByTestId('inc-A').click();
    });
    expect(screen.getByTestId('count-A')).toHaveTextContent('1');

    // Unmount
    act(() => {
      screen.getByText('Toggle').click();
    });

    // Wait for disposal
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    // Should be cleaned up
    expect(blacInstance.isolatedBlocIndex.size).toBe(0);

    // Remount
    act(() => {
      screen.getByText('Toggle').click();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Should have fresh instances (state reset)
    expect(screen.getByTestId('count-A')).toHaveTextContent('0');
    expect(screen.getByTestId('count-B')).toHaveTextContent('0');

    // Should still only have 2 instances (not accumulated)
    expect(blacInstance.isolatedBlocMap.get(IsolatedCounterCubit)?.length).toBe(2);
    expect(blacInstance.isolatedBlocIndex.size).toBe(2);
  });
});
