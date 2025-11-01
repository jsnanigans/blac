/**
 * Test for array.map() with proxy tracking
 * Reproduces the issue from JSFrameworkBenchmark where state.data.map() doesn't render items
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Cubit, StateContainer } from '@blac/core';
import { useBloc } from '../useBloc';

interface DataItem {
  id: number;
  label: string;
}

class DemoBloc extends Cubit<{
  data: DataItem[];
  selected: number | null;
}> {
  constructor() {
    super({
      data: [],
      selected: null,
    });
  }

  run = (): void => {
    const data = [
      { id: 1, label: 'item 1' },
      { id: 2, label: 'item 2' },
      { id: 3, label: 'item 3' },
    ];
    this.emit({
      data,
      selected: null,
    });
  };
}

describe('useBloc - Array.map() with proxy', () => {
  afterEach(() => {
    StateContainer.clearAllInstances();
  });

  it('should allow mapping over state.data array', async () => {
    const { result } = renderHook(() => useBloc(DemoBloc));

    const [initialState] = result.current;
    expect(initialState.data).toEqual([]);

    act(() => {
      result.current[1].run();
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.data).toHaveLength(3);

      // Test that we can map over the array
      const mapped = state.data.map(item => item.id);
      console.log('Mapped IDs:', mapped);
      expect(mapped).toEqual([1, 2, 3]);

      // Test that we can access individual items
      expect(state.data[0]).toBeDefined();
      expect(state.data[0].id).toBe(1);
      expect(state.data[0].label).toBe('item 1');
    });
  });

  it('should render mapped array items in component', async () => {
    const TestComponent = () => {
      const [state, bloc] = useBloc(DemoBloc);

      React.useEffect(() => {
        bloc.run();
      }, [bloc]);

      return (
        <div>
          <div data-testid="count">Count: {state.data.length}</div>
          <div data-testid="items">
            {state.data.map((item) => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('Count: 3');
    });

    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveTextContent('item 1');
      expect(screen.getByTestId('item-2')).toHaveTextContent('item 2');
      expect(screen.getByTestId('item-3')).toHaveTextContent('item 3');
    });
  });
});
