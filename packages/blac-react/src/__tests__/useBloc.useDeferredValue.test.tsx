import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useDeferredValue, useEffect, useState } from 'react';
import useBloc from '../useBloc';
import { flushMicrotasks, rapidStateUpdates } from './utils/react18-helpers';

// Cubit for testing large data operations
interface LargeDataState {
  searchQuery: string;
  items: Array<{ id: number; name: string; description: string }>;
}

class LargeDataCubit extends Cubit<LargeDataState> {
  static isolated = true;

  constructor(itemCount: number = 1000) {
    super({
      searchQuery: '',
      items: Array.from({ length: itemCount }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `This is a detailed description for item ${i} with lots of text`,
      })),
    });
  }

  updateSearchQuery = (query: string) => {
    this.emit({ ...this.state, searchQuery: query });
  };

  addItems = (count: number) => {
    const currentLength = this.state.items.length;
    const newItems = Array.from({ length: count }, (_, i) => ({
      id: currentLength + i,
      name: `Item ${currentLength + i}`,
      description: `This is a detailed description for item ${currentLength + i}`,
    }));

    this.emit({
      ...this.state,
      items: [...this.state.items, ...newItems],
    });
  };

  clearItems = () => {
    this.emit({ ...this.state, items: [] });
  };
}

// Cubit for testing expensive computations
interface ComputationState {
  input: number;
  multiplier: number;
}

class ComputationCubit extends Cubit<ComputationState> {
  static isolated = true;

  constructor() {
    super({ input: 1, multiplier: 1 });
  }

  updateInput = (input: number) => {
    this.emit({ ...this.state, input });
  };

  updateMultiplier = (multiplier: number) => {
    this.emit({ ...this.state, multiplier });
  };
}

describe('useBloc with useDeferredValue', () => {
  it('should defer expensive state derivations', async () => {
    const { result } = renderHook(() => {
      const [state, cubit] = useBloc(LargeDataCubit);

      // Simulate expensive computation on state
      const expensiveComputation = state.items.filter(item =>
        item.name.toLowerCase().includes(state.searchQuery.toLowerCase())
      );

      const deferredResults = useDeferredValue(expensiveComputation);

      return {
        state,
        cubit,
        immediateResults: expensiveComputation,
        deferredResults
      };
    });

    // Initial state
    expect(result.current.state.searchQuery).toBe('');
    expect(result.current.immediateResults.length).toBe(1000);
    expect(result.current.deferredResults.length).toBe(1000);

    // Update search query
    act(() => {
      result.current.cubit.updateSearchQuery('Item 1');
    });

    // Immediate value should update right away
    expect(result.current.state.searchQuery).toBe('Item 1');
    expect(result.current.immediateResults.length).toBeLessThan(1000);

    // Deferred value might lag behind initially
    // Note: In testing environment, this might update synchronously
    // but in real apps with heavy load, it would defer
    await waitFor(() => {
      expect(result.current.deferredResults.length).toBeLessThan(1000);
    });
  });

  it('should work with dependency tracking', async () => {
    let renderCount = 0;
    let deferredRenderCount = 0;

    const { result } = renderHook(() => {
      const [state, cubit] = useBloc(ComputationCubit);
      renderCount++;

      // Expensive computation
      const computedValue = state.input * state.multiplier * 1000;
      const deferredValue = useDeferredValue(computedValue);

      // Track when deferred value changes
      useEffect(() => {
        deferredRenderCount++;
      }, [deferredValue]);

      return {
        state,
        cubit,
        computedValue,
        deferredValue,
        renderCount: renderCount
      };
    });

    // Initial render
    expect(renderCount).toBe(1);
    expect(result.current.computedValue).toBe(1000);
    expect(result.current.deferredValue).toBe(1000);

    // Update input - should trigger re-render
    act(() => {
      result.current.cubit.updateInput(5);
    });

    expect(result.current.state.input).toBe(5);
    expect(result.current.computedValue).toBe(5000);
    expect(renderCount).toBeGreaterThan(1);

    // Deferred value should eventually update
    await waitFor(() => {
      expect(result.current.deferredValue).toBe(5000);
    });

    // Update multiplier
    act(() => {
      result.current.cubit.updateMultiplier(2);
    });

    expect(result.current.computedValue).toBe(10000);

    await waitFor(() => {
      expect(result.current.deferredValue).toBe(10000);
    });
  });

  it('should handle rapid state changes efficiently', async () => {
    const { result } = renderHook(() => {
      const [state, cubit] = useBloc(LargeDataCubit);

      // Heavy filtering operation
      const filteredItems = state.items.filter(item =>
        item.name.includes(state.searchQuery)
      );

      const deferredItems = useDeferredValue(filteredItems);

      return {
        state,
        cubit,
        filteredItems,
        deferredItems
      };
    });

    // Rapid search query updates (simulating user typing)
    const queries = ['I', 'It', 'Ite', 'Item', 'Item ', 'Item 1', 'Item 10'];

    for (const query of queries) {
      act(() => {
        result.current.cubit.updateSearchQuery(query);
      });
      // Small delay to simulate typing speed
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // After rapid updates, immediate value should be current
    expect(result.current.state.searchQuery).toBe('Item 10');

    // Deferred value should eventually catch up
    await waitFor(() => {
      expect(result.current.deferredItems).toEqual(result.current.filteredItems);
    }, { timeout: 2000 });

    // Should find items containing "Item 10"
    expect(result.current.deferredItems.some(item => item.name === 'Item 10')).toBe(true);
    expect(result.current.deferredItems.some(item => item.name === 'Item 100')).toBe(true);
  });

  it('should optimize performance with large state objects', async () => {
    // Track render performance
    const renderTimes: number[] = [];

    const { result } = renderHook(() => {
      const startTime = performance.now();
      const [state, cubit] = useBloc(LargeDataCubit);

      // Very expensive operation
      const processedData = {
        items: state.items.map(item => ({
          ...item,
          processed: true,
          searchMatch: item.name.toLowerCase().includes(state.searchQuery.toLowerCase()),
        })),
        stats: {
          total: state.items.length,
          query: state.searchQuery,
          timestamp: Date.now(),
        },
      };

      const deferredData = useDeferredValue(processedData);

      renderTimes.push(performance.now() - startTime);

      return {
        state,
        cubit,
        processedData,
        deferredData,
        renderTimes
      };
    });

    // Initial render should be relatively fast
    expect(renderTimes[0]).toBeDefined();

    // Perform multiple updates
    const updates = 5;
    for (let i = 0; i < updates; i++) {
      act(() => {
        result.current.cubit.updateSearchQuery(`test${i}`);
      });
    }

    await flushMicrotasks();

    // With deferred value, we should avoid blocking renders
    // The deferred value allows React to interrupt and yield to browser
    expect(result.current.deferredData.stats.query).toBeDefined();

    // Verify final consistency
    await waitFor(() => {
      expect(result.current.deferredData.stats.query).toBe(`test${updates - 1}`);
    });

    // All items in deferred data should be processed
    expect(result.current.deferredData.items.every(item => item.processed)).toBe(true);
  });
});