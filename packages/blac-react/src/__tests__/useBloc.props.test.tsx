import { Blac, Bloc, Cubit, PropsUpdated } from '@blac/core';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import useBloc from '../useBloc';

// Test components
interface SearchProps {
  query: string;
  limit?: number;
}

interface SearchState {
  results: string[];
  loading: boolean;
}

class SearchBloc extends Bloc<SearchState, PropsUpdated<SearchProps>> {
  constructor(props?: SearchProps) {
    // Initialize with props
    super({
      results: props ? [`Search: ${props.query}`] : [],
      loading: false,
    });
    this.props = props || null;

    this.on(PropsUpdated<SearchProps>, (event, emit) => {
      emit({ results: [`Search: ${event.props.query}`], loading: false });
    });
  }

  override props: SearchProps | null = null;
}

interface CounterProps {
  step: number;
}

interface CounterState {
  count: number;
  stepSize: number;
}

class CounterCubit extends Cubit<CounterState, CounterProps> {
  constructor(props?: CounterProps) {
    super({ count: 0, stepSize: props?.step ?? 1 });
    this.props = props || null;
  }

  override props: CounterProps | null = null;

  protected onPropsChanged(
    oldProps: CounterProps | undefined,
    newProps: CounterProps,
  ): void {
    if (oldProps?.step !== newProps.step) {
      this.emit({ ...this.state, stepSize: newProps.step });
    }
  }

  increment = () => {
    const step = this.props?.step ?? 1;
    this.emit({
      ...this.state,
      count: this.state.count + step,
      stepSize: step,
    });
  };
}

describe('useBloc props integration', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('Basic props functionality', () => {
    it('should pass props to Bloc via adapter', async () => {
      const { result } = renderHook(
        ({ query }) => useBloc(SearchBloc, { staticProps: { query } }),
        { initialProps: { query: 'initial' } },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const [state] = result.current;
      expect(state.results).toEqual(['Search: initial']);
    });

    it('should create new instance when staticProps change', async () => {
      const { result, rerender } = renderHook(
        ({ query }) => useBloc(SearchBloc, { staticProps: { query } }),
        { initialProps: { query: 'initial' } },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const firstInstance = result.current[1];
      expect(result.current[0].results).toEqual(['Search: initial']);

      rerender({ query: 'updated' });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const secondInstance = result.current[1];
      expect(secondInstance).not.toBe(firstInstance); // New instance created
      expect(result.current[0].results).toEqual(['Search: updated']);
    });

    it('should work with Cubit props', async () => {
      const { result } = renderHook(
        ({ step }) => {
          const [state, cubit] = useBloc(CounterCubit, {
            staticProps: { step },
          });
          // Access count to ensure it's tracked
          void state.count;
          return [state, cubit];
        },
        { initialProps: { step: 1 } },
      );

      // Wait for props to be set
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const [state, cubit] = result.current as [CounterState, CounterCubit];
      expect(state.stepSize).toBe(1);

      act(() => {
        cubit.increment();
      });

      // Wait for React to re-render with new state
      await waitFor(() => {
        expect((result.current[0] as CounterState).count).toBe(1);
      });
    });

    it('should create new Cubit instance when staticProps change', async () => {
      const { result, rerender } = renderHook(
        ({ step }) => {
          const [state, cubit] = useBloc(CounterCubit, {
            staticProps: { step },
          });
          // Access count to ensure it's tracked
          void state.count;
          return [state, cubit];
        },
        { initialProps: { step: 1 } },
      );

      // Wait for initial props to be set
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const firstInstance = result.current[1];
      expect((result.current[0] as CounterState).stepSize).toBe(1);

      rerender({ step: 5 });

      // Wait for new instance to be created
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const secondInstance = result.current[1];
      expect(secondInstance).not.toBe(firstInstance); // New instance
      expect((result.current[0] as CounterState).stepSize).toBe(5);
      expect((result.current[0] as CounterState).count).toBe(0); // New instance starts at 0

      act(() => {
        (result.current[1] as CounterCubit).increment();
      });

      // Wait for React to re-render with new state
      await waitFor(() => {
        expect((result.current[0] as CounterState).count).toBe(5);
      });
    });
  });

  describe('Instance sharing', () => {
    it('should share instance when using same instanceId', async () => {
      // First hook creates instance with explicit id
      const { result: result1 } = renderHook(() =>
        useBloc(SearchBloc, {
          staticProps: { query: 'first' },
          instanceId: 'shared-search',
        }),
      );

      // Second hook uses same instanceId - gets same instance
      const { result: result2 } = renderHook(() =>
        useBloc(SearchBloc, {
          staticProps: { query: 'second' }, // Different props, but same instanceId
          instanceId: 'shared-search',
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Both should share the same instance (check by ID)
      expect(result1.current[1]._id).toBe('shared-search');
      expect(result2.current[1]._id).toBe('shared-search');

      // Both see the state from the first instance (query: 'first')
      expect(result1.current[0].results).toEqual(['Search: first']);
      expect(result2.current[0].results).toEqual(['Search: first']);
    });

    it('should allow consumers without staticProps to share instance', async () => {
      // First consumer with props and explicit id
      const { result: firstResult } = renderHook(() =>
        useBloc(SearchBloc, {
          staticProps: { query: 'test' },
          instanceId: 'search-instance',
        }),
      );

      // Second consumer without props but same instanceId
      const { result: secondResult } = renderHook(() =>
        useBloc(SearchBloc, { instanceId: 'search-instance' }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Same instance (check by ID)
      expect(firstResult.current[1]._id).toBe('search-instance');
      expect(secondResult.current[1]._id).toBe('search-instance');

      // Both see the same state
      expect(secondResult.current[0].results).toEqual(['Search: test']);
    });

    it('should create independent instances with different staticProps', async () => {
      const { result: result1, unmount: unmount1 } = renderHook(() =>
        useBloc(SearchBloc, { staticProps: { query: 'first' } }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result1.current[0].results).toEqual(['Search: first']);
      const instance1Id = result1.current[1]._id;

      // Create second instance with different props
      const { result: result2 } = renderHook(() =>
        useBloc(SearchBloc, { staticProps: { query: 'second' } }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result2.current[0].results).toEqual(['Search: second']);
      const instance2Id = result2.current[1]._id;

      // Different instances with different auto-generated IDs
      expect(instance1Id).not.toBe(instance2Id);
      expect(result1.current[1]).not.toBe(result2.current[1]);

      // Unmount first - second is unaffected
      unmount1();

      expect(result2.current[0].results).toEqual(['Search: second']);
    });
  });

  describe('Props with other options', () => {
    it('should work with key option', async () => {
      const { result } = renderHook(() =>
        useBloc(SearchBloc, {
          instanceId: 'custom-search',
          staticProps: { query: 'test' },
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current[0].results).toEqual(['Search: test']);
      expect(result.current[1]._id).toBe('custom-search');
    });

    it('should work with lifecycle hooks', async () => {
      const onMount = vi.fn();
      const onUnmount = vi.fn();

      const { result, unmount } = renderHook(() =>
        useBloc(SearchBloc, {
          staticProps: { query: 'test' },
          onMount,
          onUnmount,
        }),
      );

      expect(onMount).toHaveBeenCalledWith(result.current[1]);

      unmount();

      expect(onUnmount).toHaveBeenCalledWith(result.current[1]);
    });

    it('should work with manual dependencies', () => {
      const { result, rerender } = renderHook(
        ({ step }) =>
          useBloc(CounterCubit, {
            staticProps: { step },
            dependencies: (cubit) => [cubit.state.count],
          }),
        { initialProps: { step: 1 } },
      );

      const [, cubit] = result.current as [CounterState, CounterCubit];

      // Increment should trigger re-render (count is a dependency)
      act(() => {
        cubit.increment();
      });

      expect((result.current[0] as CounterState).count).toBe(1);

      // Changing props creates new instance
      rerender({ step: 2 });

      // New instance has different state
      const [newState, newCubit] = result.current as [
        CounterState,
        CounterCubit,
      ];
      expect(newCubit).not.toBe(cubit); // New instance
      expect(newState.stepSize).toBe(2);
      expect(newState.count).toBe(0); // New instance starts at 0
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined props', async () => {
      const { result } = renderHook(() => {
        const [state, cubit] = useBloc(CounterCubit, {
          staticProps: undefined,
        });
        // Access count to ensure it's tracked
        void state.count;
        return [state, cubit];
      });

      // Wait for any effects
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const [state, cubit] = result.current as [CounterState, CounterCubit];
      expect(state.stepSize).toBe(1);

      act(() => {
        cubit.increment();
      });

      // Wait for React to re-render with new state
      await waitFor(() => {
        expect((result.current[0] as CounterState).count).toBe(1); // Uses default step
      });
    });

    it('should not re-render for unchanged props', () => {
      let renderCount = 0;

      const { rerender } = renderHook(
        ({ query }) => {
          renderCount++;
          return useBloc(SearchBloc, { staticProps: { query } });
        },
        { initialProps: { query: 'test' } },
      );

      const initialRenderCount = renderCount;

      // Rerender with same props
      rerender({ query: 'test' });

      // Should not cause additional renders beyond React's normal behavior
      expect(renderCount).toBe(initialRenderCount + 1);
    });

    it('should handle rapid props updates', async () => {
      const { result, rerender } = renderHook(
        ({ query }) => useBloc(SearchBloc, { staticProps: { query } }),
        { initialProps: { query: 'initial' } },
      );

      // Wait for initial render
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const firstInstance = result.current[1];

      // Rapid updates - each creates a new instance
      await act(async () => {
        rerender({ query: 'update1' });
        rerender({ query: 'update2' });
        rerender({ query: 'update3' });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const lastInstance = result.current[1];

      // Different instance after updates
      expect(lastInstance).not.toBe(firstInstance);

      // Should have the latest value
      expect(result.current[0].results).toEqual(['Search: update3']);
    });
  });
});
