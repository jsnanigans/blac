import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Cubit, Blac } from '@blac/core';
import useBloc from '../useBloc';
import React from 'react';

interface TestState {
  counter: number;
  text: string;
}

class SharedTestCubit extends Cubit<TestState> {
  // Not isolated - should be shared across components
  constructor() {
    super({ counter: 0, text: 'initial' });
  }

  increment = () => {
    this.emit({ ...this.state, counter: this.state.counter + 1 });
  };

  updateText = (text: string) => {
    this.emit({ ...this.state, text });
  };

  async dispose() {
    await super.dispose();
  }
}

describe('useBloc disposal issues', () => {
  afterEach(() => {
    Blac.resetInstance();
  });

  it('should not dispose shared bloc when switching between components', async () => {
    // Track disposal errors
    const disposalErrors: string[] = [];
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args[0];
      if (
        typeof message === 'string' &&
        message.includes('Attempted state update')
      ) {
        disposalErrors.push(message);
      }
      originalError(...args);
    };
    // Component A uses the shared bloc
    const ComponentA = () => {
      const [state, cubit] = useBloc(SharedTestCubit);
      return (
        <div>
          <span data-testid="component-a-counter">{state.counter}</span>
          <button onClick={cubit.increment}>Increment A</button>
        </div>
      );
    };

    // Component B uses the same shared bloc with dependencies
    const ComponentB = () => {
      const [state, cubit] = useBloc(SharedTestCubit, {
        dependencies: (bloc) => [bloc.state.text],
      });
      return (
        <div>
          <span data-testid="component-b-text">{state.text}</span>
          <span data-testid="component-b-counter">{state.counter}</span>
          <button onClick={() => cubit.updateText('updated')}>
            Update Text B
          </button>
        </div>
      );
    };

    // App component that switches between A and B
    const App = () => {
      const [showA, setShowA] = React.useState(true);
      return (
        <div>
          <button onClick={() => setShowA(!showA)}>Toggle Component</button>
          {showA ? <ComponentA /> : <ComponentB />}
        </div>
      );
    };

    render(<App />);

    // Initially showing Component A
    expect(screen.getByTestId('component-a-counter')).toHaveTextContent('0');

    // Increment counter in Component A
    act(() => {
      screen.getByText('Increment A').click();
    });

    // Wait for state to update
    await waitFor(() => {
      expect(screen.getByTestId('component-a-counter')).toHaveTextContent('1');
    });

    // Switch to Component B
    act(() => {
      screen.getByText('Toggle Component').click();
    });

    // Wait a bit to ensure Component B is mounted
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // Component B should see the updated counter from Component A
    await waitFor(() => {
      expect(screen.getByTestId('component-b-counter')).toHaveTextContent('1');
      expect(screen.getByTestId('component-b-text')).toHaveTextContent(
        'initial',
      );
    });

    // Try to update text in Component B
    act(() => {
      screen.getByText('Update Text B').click();
    });

    // Wait a moment to see if state updates
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Check the actual text value
    const textElement = screen.getByTestId('component-b-text');
    const actualText = textElement.textContent;

    // Should successfully update without disposal errors
    expect(actualText).toBe('updated');

    // Check if any disposal errors were logged
    expect(disposalErrors).toHaveLength(0);

    // Switch back to Component A
    act(() => {
      screen.getByText('Toggle Component').click();
    });

    // Component A should still see the counter as 1
    await waitFor(() => {
      expect(screen.getByTestId('component-a-counter')).toHaveTextContent('1');
    });

    // Restore console.error
    console.error = originalError;

    // Cleanup handled by afterEach
  });

  it('should handle rapid component switching without disposal issues', async () => {
    let disposalErrorLogged = false;
    const originalError = console.error;
    console.error = (message: string) => {
      if (message.includes('Attempted state update on disposed bloc')) {
        disposalErrorLogged = true;
      }
      originalError(message);
    };

    const ComponentWithTimer = () => {
      const [state, cubit] = useBloc(SharedTestCubit);

      React.useEffect(() => {
        // Simulate async operation that might complete after unmount
        const timer = setTimeout(() => {
          cubit.increment();
        }, 50);

        return () => clearTimeout(timer);
      }, [cubit]);

      return <span data-testid="timer-counter">{state.counter}</span>;
    };

    const App = () => {
      const [show, setShow] = React.useState(true);
      return (
        <div>
          <button onClick={() => setShow(!show)}>Toggle</button>
          {show && <ComponentWithTimer />}
        </div>
      );
    };

    render(<App />);

    // Rapidly toggle the component
    act(() => {
      screen.getByText('Toggle').click(); // Hide
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      screen.getByText('Toggle').click(); // Show again
    });

    // Wait for potential timer to fire
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should not have logged disposal error
    expect(disposalErrorLogged).toBe(false);

    // Restore console.error
    console.error = originalError;

    // Cleanup handled by afterEach
  });

  it('should not dispose bloc when switching quickly between components', async () => {
    // Use a unique instance ID for this test to avoid state contamination
    const testInstanceId = 'test-demo-app-issue';

    const errorMessages: string[] = [];
    const originalError = console.error;
    console.error = (message: string, ...args: any[]) => {
      if (
        typeof message === 'string' &&
        message.includes('Attempted state update')
      ) {
        errorMessages.push(message);
      }
      originalError(message, ...args);
    };

    // Component using automatic proxy tracking (like DependencyTrackingDemo)
    const ProxyTrackingComponent = () => {
      const [state, cubit] = useBloc(SharedTestCubit, {
        instanceId: testInstanceId,
      });
      // Access only counter, not text
      return (
        <div>
          <span data-testid="proxy-counter">{state.counter}</span>
          <button onClick={cubit.increment}>Increment</button>
        </div>
      );
    };

    // Component using manual dependencies (like CustomSelectorDemo)
    const ManualDependencyComponent = () => {
      const [state, cubit] = useBloc(SharedTestCubit, {
        instanceId: testInstanceId,
        dependencies: (bloc) => [bloc.state.text],
      });
      return (
        <div>
          <span data-testid="manual-text">{state.text}</span>
          <span data-testid="manual-counter">{state.counter}</span>
          <button onClick={() => cubit.updateText('updated')}>
            Update Text
          </button>
        </div>
      );
    };

    // Simulate the demo app behavior
    const DemoApp = () => {
      const [showProxy, setShowProxy] = React.useState(false);
      const [showManual, setShowManual] = React.useState(false);

      return (
        <div>
          <button onClick={() => setShowProxy(!showProxy)}>
            Toggle Proxy Tracking
          </button>
          <button onClick={() => setShowManual(!showManual)}>
            Toggle Manual Dependencies
          </button>
          {showProxy && <ProxyTrackingComponent />}
          {showManual && <ManualDependencyComponent />}
        </div>
      );
    };

    render(<DemoApp />);

    // Open proxy tracking component
    act(() => {
      screen.getByText('Toggle Proxy Tracking').click();
    });

    expect(screen.getByTestId('proxy-counter')).toHaveTextContent('0');

    // Increment counter
    act(() => {
      screen.getByText('Increment').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('proxy-counter')).toHaveTextContent('1');
    });

    // Close proxy tracking component
    act(() => {
      screen.getByText('Toggle Proxy Tracking').click();
    });

    // Switch quickly without waiting - disposal should be cancelled
    // Don't wait here - switch immediately

    // Open manual dependency component
    act(() => {
      screen.getByText('Toggle Manual Dependencies').click();
    });

    // Should see the incremented state because disposal was cancelled
    expect(screen.getByTestId('manual-counter')).toHaveTextContent('1');
    expect(screen.getByTestId('manual-text')).toHaveTextContent('initial');

    // Try to update text
    act(() => {
      screen.getByText('Update Text').click();
    });

    // Wait for state update
    await waitFor(() => {
      expect(screen.getByTestId('manual-text')).toHaveTextContent('updated');
    });

    // Check for disposal errors
    const disposalErrors = errorMessages.filter(
      (msg) =>
        msg.includes('Attempted state update on disposed bloc') ||
        msg.includes('Attempted state update on disposal_requested bloc'),
    );

    expect(disposalErrors).toHaveLength(0);
    expect(screen.getByTestId('manual-text')).toHaveTextContent('updated');

    // Restore console.error
    console.error = originalError;

    // Clean up test instance
    const testBloc = Blac.getBloc(SharedTestCubit, { id: testInstanceId });
    if (testBloc) {
      await testBloc.dispose();
    }
  });
});
