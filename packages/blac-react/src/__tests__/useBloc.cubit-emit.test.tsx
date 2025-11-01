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
    const { result } = renderHook(() => useBloc(DemoBloc));

    const [initialState, bloc] = result.current;
    expect(initialState.data).toEqual([]);
    expect(initialState.selected).toBe(null);

    act(() => {
      bloc.run();
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.data).toHaveLength(2);
      expect(state.data[0]).toEqual({ id: 1, label: 'item 1' });
    });
  });

  it('should trigger re-render when update() is called', async () => {
    const { result } = renderHook(() => useBloc(DemoBloc));

    act(() => {
      result.current[1].run();
    });

    await waitFor(() => {
      expect(result.current[0].data).toHaveLength(2);
    });

    act(() => {
      result.current[1].select(1);
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.selected).toBe(1);
    });
  });

  it('should work with component that does not access state', async () => {
    const { result } = renderHook(() => useBloc(DemoBloc));

    // Don't access state, only bloc
    const [, bloc] = result.current;

    act(() => {
      bloc.run();
    });

    // Should still update
    await waitFor(() => {
      const [state] = result.current;
      expect(state.data).toHaveLength(2);
    });
  });
});
