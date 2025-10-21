import React, { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Cubit, Blac } from '@blac/core';
import useBloc from '../useBloc';

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
    const newCount = this.state.count + 1;
    this.patch({ count: newCount });
  };

  reset = () => {
    this.patch({ count: 0 });
  };
}

// Component that uses KeepAlive counter
const KeepAliveCounter: React.FC<{ id: string }> = ({ id }) => {
  const [state, cubit] = useBloc(KeepAliveCounterCubit);

  React.useEffect(() => {
    // Component mounted with state
    return () => {
      // Component unmounted
    };
  }, [id, state.instanceId, state.count]);

  return (
    <div data-testid={`counter-${id}`}>
      <h4>KeepAlive Counter ({id})</h4>
      <p data-testid={`instance-${id}`}>Instance ID: {state.instanceId}</p>
      <div data-testid={`count-${id}`}>{state.count}</div>
      <button data-testid={`increment-${id}`} onClick={cubit.increment}>
        +1
      </button>
      <button data-testid={`reset-${id}`} onClick={cubit.reset}>
        Reset
      </button>
    </div>
  );
};

// Test app that simulates the demo
const TestApp: React.FC = () => {
  const [showCounter1, setShowCounter1] = useState(false);
  const [showCounter2, setShowCounter2] = useState(false);

  return (
    <div>
      <div>
        <button
          data-testid="toggle-1"
          onClick={() => setShowCounter1(!showCounter1)}
        >
          {showCounter1 ? 'Hide' : 'Show'} Counter 1
        </button>
        <button
          data-testid="toggle-2"
          onClick={() => setShowCounter2(!showCounter2)}
        >
          {showCounter2 ? 'Hide' : 'Show'} Counter 2
        </button>
      </div>
      <div>
        {showCounter1 && <KeepAliveCounter id="1" />}
        {showCounter2 && <KeepAliveCounter id="2" />}
      </div>
    </div>
  );
};

describe('KeepAlive Hook Bug Reproduction', () => {
  beforeEach(() => {
    Blac.resetInstance();
    Blac.enableLog = false;
    instanceCounter = 0;
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should reproduce the exact bug scenario with React components', async () => {
    render(<TestApp />);

    // Step 1: Show Counter 1
    fireEvent.click(screen.getByTestId('toggle-1'));

    await waitFor(() => {
      expect(screen.getByTestId('counter-1')).toBeInTheDocument();
    });

    // Verify initial state
    expect(screen.getByTestId('count-1')).toHaveTextContent('0');
    expect(screen.getByTestId('instance-1')).toHaveTextContent(
      'Instance ID: 1',
    );

    // Step 2: Increment Counter 1
    fireEvent.click(screen.getByTestId('increment-1'));

    await waitFor(() => {
      expect(screen.getByTestId('count-1')).toHaveTextContent('1');
    });

    // Step 3: Show Counter 2
    fireEvent.click(screen.getByTestId('toggle-2'));

    await waitFor(() => {
      expect(screen.getByTestId('counter-2')).toBeInTheDocument();
    });

    // Counter 2 should see the current state
    expect(screen.getByTestId('count-2')).toHaveTextContent('1');
    expect(screen.getByTestId('instance-2')).toHaveTextContent(
      'Instance ID: 1',
    );

    // Step 4: Increment Counter 2
    fireEvent.click(screen.getByTestId('increment-2'));

    await waitFor(() => {
      expect(screen.getByTestId('count-2')).toHaveTextContent('2');
    });

    // Both should show 2
    expect(screen.getByTestId('count-1')).toHaveTextContent('2');
    expect(screen.getByTestId('count-2')).toHaveTextContent('2');

    // Step 5: Hide Counter 2
    fireEvent.click(screen.getByTestId('toggle-2'));

    await waitFor(() => {
      expect(screen.queryByTestId('counter-2')).not.toBeInTheDocument();
    });

    // Step 6: Increment Counter 1
    fireEvent.click(screen.getByTestId('increment-1'));

    await waitFor(() => {
      expect(screen.getByTestId('count-1')).toHaveTextContent('3');
    });

    // Step 7: Show Counter 2 again
    fireEvent.click(screen.getByTestId('toggle-2'));

    await waitFor(() => {
      expect(screen.getByTestId('counter-2')).toBeInTheDocument();
    });

    // Counter 2 should show the current state (3)
    expect(screen.getByTestId('count-2')).toHaveTextContent('3');

    // Step 8: Final increment from Counter 1
    fireEvent.click(screen.getByTestId('increment-1'));

    await waitFor(() => {
      expect(screen.getByTestId('count-1')).toHaveTextContent('4');
    });

    // Both should show 4
    expect(screen.getByTestId('count-1')).toHaveTextContent('4');
    expect(screen.getByTestId('count-2')).toHaveTextContent('4');
  });

  it('should test rapid show/hide/increment scenarios', async () => {
    render(<TestApp />);

    // Show Counter 1
    fireEvent.click(screen.getByTestId('toggle-1'));
    await waitFor(() =>
      expect(screen.getByTestId('counter-1')).toBeInTheDocument(),
    );

    // Rapid increments
    fireEvent.click(screen.getByTestId('increment-1'));
    fireEvent.click(screen.getByTestId('increment-1'));
    fireEvent.click(screen.getByTestId('increment-1'));

    await waitFor(() => {
      expect(screen.getByTestId('count-1')).toHaveTextContent('3');
    });

    // Show Counter 2
    fireEvent.click(screen.getByTestId('toggle-2'));
    await waitFor(() =>
      expect(screen.getByTestId('counter-2')).toBeInTheDocument(),
    );

    // Should immediately see current state
    expect(screen.getByTestId('count-2')).toHaveTextContent('3');

    // Rapid toggle Counter 2
    fireEvent.click(screen.getByTestId('toggle-2')); // Hide
    await waitFor(() =>
      expect(screen.queryByTestId('counter-2')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('toggle-2')); // Show
    await waitFor(() =>
      expect(screen.getByTestId('counter-2')).toBeInTheDocument(),
    );

    // Should still see correct state
    expect(screen.getByTestId('count-2')).toHaveTextContent('3');

    // Increment from Counter 2
    fireEvent.click(screen.getByTestId('increment-2'));

    await waitFor(() => {
      expect(screen.getByTestId('count-1')).toHaveTextContent('4');
      expect(screen.getByTestId('count-2')).toHaveTextContent('4');
    });
  });

  it('should handle the specific bug scenario step by step', async () => {
    render(<TestApp />);

    // "render KeepAlive Pattern"
    // User: render KeepAlive Pattern

    // Show Counter 1
    // User: Show Counter 1
    fireEvent.click(screen.getByTestId('toggle-1'));
    await waitFor(() =>
      expect(screen.getByTestId('counter-1')).toBeInTheDocument(),
    );

    const initialCount1 = screen.getByTestId('count-1').textContent;
    expect(initialCount1).toBe('0');

    // "KeepAlive Counter (1) : INCREMENT"
    fireEvent.click(screen.getByTestId('increment-1'));

    // Wait for update
    await waitFor(() => {
      const newCount = screen.getByTestId('count-1').textContent;
      return newCount === '1';
    });

    // Bug check: "i still see 0"
    const afterIncrementCount1 = screen.getByTestId('count-1').textContent;
    if (afterIncrementCount1 === '0') {
      // BUG REPRODUCED: Counter 1 still shows 0 after increment!
    } else {
      // Counter 1 correctly shows the updated value
    }
    expect(afterIncrementCount1).toBe('1');

    // "show counter 2"
    fireEvent.click(screen.getByTestId('toggle-2'));
    await waitFor(() =>
      expect(screen.getByTestId('counter-2')).toBeInTheDocument(),
    );

    // "now i see 1 on both of them"
    const count1Now = screen.getByTestId('count-1').textContent;
    const count2Now = screen.getByTestId('count-2').textContent;

    expect(count1Now).toBe('1');
    expect(count2Now).toBe('1');

    // "increment in KeepAlive Counter (2)"
    fireEvent.click(screen.getByTestId('increment-2'));

    await waitFor(() => {
      const newCount2 = screen.getByTestId('count-2').textContent;
      return newCount2 === '2';
    });

    // "the count on KeepAlive Counter (1) increases"
    const count1After = screen.getByTestId('count-1').textContent;
    const count2After = screen.getByTestId('count-2').textContent;

    expect(count1After).toBe('2');
    expect(count2After).toBe('2');

    // "hide 2"
    fireEvent.click(screen.getByTestId('toggle-2'));
    await waitFor(() =>
      expect(screen.queryByTestId('counter-2')).not.toBeInTheDocument(),
    );

    // "show 2"
    fireEvent.click(screen.getByTestId('toggle-2'));
    await waitFor(() =>
      expect(screen.getByTestId('counter-2')).toBeInTheDocument(),
    );

    // "now 2 also shows correct count"
    const finalCount2 = screen.getByTestId('count-2').textContent;
    expect(finalCount2).toBe('2');
  });
});