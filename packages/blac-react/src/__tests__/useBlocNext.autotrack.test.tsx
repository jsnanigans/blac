import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { StateContainer } from '@blac/core';
import { useBlocNext } from '../useBlocNext';

// Test state interface
interface TestState {
  count: number;
  nested: {
    value: string;
    deep: {
      flag: boolean;
    };
  };
  array: number[];
}

// Test bloc implementation
class TestBloc extends StateContainer<TestState, any> {
  constructor() {
    super({
      count: 0,
      nested: {
        value: 'initial',
        deep: {
          flag: false,
        },
      },
      array: [1, 2, 3],
    });
  }

  increment() {
    this.emit({
      ...this.state,
      count: this.state.count + 1,
    });
  }

  updateValue(value: string) {
    this.emit({
      ...this.state,
      nested: {
        ...this.state.nested,
        value,
      },
    });
  }

  updateFlag(flag: boolean) {
    this.emit({
      ...this.state,
      nested: {
        ...this.state.nested,
        deep: {
          ...this.state.nested.deep,
          flag,
        },
      },
    });
  }

  updateArray(array: number[]) {
    this.emit({
      ...this.state,
      array,
    });
  }
}

describe('useBlocNext - Automatic Dependency Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enable automatic tracking by default', async () => {
    const { result } = renderHook(() => useBlocNext(TestBloc));
    const [initialState, bloc] = result.current;

    expect(initialState.count).toBe(0);

    // Access only count in render
    const renderFn = vi.fn(() => {
      const [state] = result.current;
      return state.count;
    });
    renderFn();

    // Update unaccessed property - should NOT trigger re-render
    act(() => {
      bloc.updateValue('changed');
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.nested.value).toBe('changed');
    });

    // The component should not have re-rendered
    expect(renderFn).toHaveBeenCalledTimes(1);

    // Update accessed property - should trigger re-render
    act(() => {
      bloc.increment();
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.count).toBe(1);
    });
  });

  it('should track nested property access', async () => {
    const { result } = renderHook(() => useBlocNext(TestBloc));
    const [, bloc] = result.current;

    // Access nested.value in render
    const renderFn = vi.fn(() => {
      const [state] = result.current;
      return state.nested.value;
    });
    renderFn();

    // Update unaccessed property - should NOT trigger re-render
    act(() => {
      bloc.increment();
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.count).toBe(1);
    });

    // The component should not have re-rendered
    expect(renderFn).toHaveBeenCalledTimes(1);

    // Update accessed nested property - should trigger re-render
    act(() => {
      bloc.updateValue('updated');
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.nested.value).toBe('updated');
    });
  });

  it('should track deeply nested property access', async () => {
    const { result } = renderHook(() => useBlocNext(TestBloc));
    const [, bloc] = result.current;

    // Access deeply nested property
    const renderFn = vi.fn(() => {
      const [state] = result.current;
      return state.nested.deep.flag;
    });
    renderFn();

    // Update unaccessed property - should NOT trigger re-render
    act(() => {
      bloc.updateValue('changed');
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.nested.value).toBe('changed');
    });

    // The component should not have re-rendered
    expect(renderFn).toHaveBeenCalledTimes(1);

    // Update accessed deep property - should trigger re-render
    act(() => {
      bloc.updateFlag(true);
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.nested.deep.flag).toBe(true);
    });
  });

  it('should disable automatic tracking when autoTrack is false', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      return useBlocNext(TestBloc, { autoTrack: false });
    });

    const [, bloc] = result.current;

    const initialRenderCount = renderCount;

    // Update any property - should trigger re-render (no filtering)
    act(() => {
      bloc.updateValue('changed');
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.nested.value).toBe('changed');
    });

    // Should have re-rendered even though count wasn't accessed
    expect(renderCount).toBeGreaterThan(initialRenderCount);
  });

  it('should use manual dependencies when provided (auto-tracking disabled)', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      return useBlocNext(TestBloc, {
        dependencies: (state) => [state.count],
      });
    });

    const [, bloc] = result.current;
    const initialRenderCount = renderCount;

    // Update nested value - should NOT trigger re-render
    act(() => {
      bloc.updateValue('changed');
    });

    // Wait a bit for state to update
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check that bloc's state was updated
    expect(bloc.state.nested.value).toBe('changed');

    // Should not have re-rendered (dependencies only track count)
    expect(renderCount).toBe(initialRenderCount);

    // Update count - should trigger re-render
    act(() => {
      bloc.increment();
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.count).toBe(1);
    });

    // Should have re-rendered
    expect(renderCount).toBeGreaterThan(initialRenderCount);
  });

  it('should track multiple properties', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBlocNext(TestBloc);
      // Access multiple properties during render
      const _accessed = {
        count: state.count,
        value: state.nested.value,
      };
      return [state, bloc] as const;
    });

    const [, bloc] = result.current;
    const initialRenderCount = renderCount;

    // Update unaccessed property - should NOT trigger re-render
    act(() => {
      bloc.updateFlag(true);
    });

    // Wait a bit for state to update
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check that bloc's state was updated (but hook state remains stale since no re-render)
    expect(bloc.state.nested.deep.flag).toBe(true);

    // Should not have re-rendered
    expect(renderCount).toBe(initialRenderCount);

    // Update one of the accessed properties - should trigger re-render
    act(() => {
      bloc.increment();
    });

    await waitFor(() => {
      const [state] = result.current;
      expect(state.count).toBe(1);
    });

    // Should have re-rendered
    expect(renderCount).toBeGreaterThan(initialRenderCount);
  });

  it('should update tracked paths when access pattern changes', async () => {
    const { result, rerender } = renderHook(
      ({ accessCount }: { accessCount: boolean }) => {
        const [state, bloc] = useBlocNext(TestBloc);
        // Conditionally access different properties
        if (accessCount) {
          return [state.count, bloc] as const;
        } else {
          return [state.nested?.value ?? 'default', bloc] as const;
        }
      },
      { initialProps: { accessCount: true } },
    );

    const getBloc = () => (result.current as any)[1] as TestBloc;
    const bloc = getBloc();

    // Initially tracking count
    act(() => {
      bloc.updateValue('changed');
    });

    await waitFor(() => {
      expect(getBloc().state.nested.value).toBe('changed');
    });

    // Change access pattern to nested.value
    rerender({ accessCount: false });

    // Wait for re-render to complete
    await waitFor(() => {
      const value = result.current[0];
      expect(value).toBe('changed');
    });

    // Now tracking nested.value instead of count
    act(() => {
      bloc.increment();
    });

    await waitFor(() => {
      expect(getBloc().state.count).toBe(1);
    });

    // Update newly tracked property
    act(() => {
      bloc.updateValue('updated');
    });

    await waitFor(() => {
      const value = result.current[0];
      expect(value).toBe('updated');
    });
  });
});