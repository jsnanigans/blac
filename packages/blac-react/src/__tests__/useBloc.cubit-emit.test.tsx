/**
 * Test for Cubit emit() triggering re-renders
 * Reproduces the issue from JSFrameworkBenchmark
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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
    ];
    this.emit({
      data,
      selected: null,
    });
  };

  select = (id: number): void => {
    this.update((state) => ({
      ...state,
      selected: id,
    }));
  };

  clear = (): void => {
    this.emit({
      data: [],
      selected: null,
    });
  };
}

describe('useBloc - Cubit emit()', () => {
  afterEach(() => {
    StateContainer.clearAllInstances();
  });

  it('should trigger re-render when emit() is called', async () => {
    const { result } = renderHook(() => {
      const [state, bloc] = useBloc(DemoBloc);
      // Access state during render so it gets tracked
      // Access the array itself (not .length)
      return { data: state.data, selected: state.selected, bloc };
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.selected).toBe(null);

    act(() => {
      result.current.bloc.run();
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });
  });

  it('should trigger re-render when update() is called', async () => {
    const { result } = renderHook(() => {
      const [state, bloc] = useBloc(DemoBloc);
      // Access state during render so it gets tracked
      // Access the array itself (not .length)
      return { data: state.data, selected: state.selected, bloc };
    });

    act(() => {
      result.current.bloc.run();
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    act(() => {
      result.current.bloc.select(1);
    });

    await waitFor(() => {
      expect(result.current.selected).toBe(1);
    });
  });

  it('should NOT re-render when component does not access state', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(DemoBloc);
      // Don't access any state properties during render
      return { bloc };
    });

    expect(renderCount).toBe(1);

    act(() => {
      result.current.bloc.run();
    });

    // Should NOT re-render because no state was accessed
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(1); // No re-render
  });
});
