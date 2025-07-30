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
  constructor(private config: { apiEndpoint: string }) {
    super({ results: [], loading: false });

    this.on(PropsUpdated<SearchProps>, (event, emit) => {
      emit({ results: [`Search: ${event.props.query}`], loading: false });
    });
  }
}

interface CounterProps {
  step: number;
}

interface CounterState {
  count: number;
  stepSize: number;
}

class CounterCubit extends Cubit<CounterState, CounterProps> {
  constructor() {
    super({ count: 0, stepSize: 1 });
  }

  protected onPropsChanged(oldProps: CounterProps | undefined, newProps: CounterProps): void {
    if (oldProps?.step !== newProps.step) {
      this.emit({ ...this.state, stepSize: newProps.step });
    }
  }

  increment = () => {
    const step = this.props?.step ?? 1;
    this.emit({ ...this.state, count: this.state.count + step, stepSize: step });
  };
}

describe('useBloc props integration', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('Basic props functionality', () => {
    it('should pass props to Bloc via adapter', async () => {
      const { result } = renderHook(
        ({ query }) => useBloc(
          SearchBloc,
          { props: { apiEndpoint: '/api/search', query } }
        ),
        { initialProps: { query: 'initial' } }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const [state] = result.current;
      expect(state.results).toEqual(['Search: initial']);
    });

    it('should update props when they change', async () => {
      const { result, rerender } = renderHook(
        ({ query }) => useBloc(
          SearchBloc,
          { props: { apiEndpoint: '/api/search', query } }
        ),
        { initialProps: { query: 'initial' } }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current[0].results).toEqual(['Search: initial']);

      rerender({ query: 'updated' });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current[0].results).toEqual(['Search: updated']);
    });

    it('should work with Cubit props', async () => {
      const { result } = renderHook(
        ({ step }) => {
          const [state, cubit] = useBloc(
            CounterCubit,
            { props: { step } }
          );
          // Access count to ensure it's tracked
          void state.count;
          return [state, cubit];
        },
        { initialProps: { step: 1 } }
      );

      // Wait for props to be set
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const [state, cubit] = result.current;
      expect(state.stepSize).toBe(1);

      act(() => {
        cubit.increment();
      });

      // Wait for React to re-render with new state
      await waitFor(() => {
        expect(result.current[0].count).toBe(1);
      });
    });

    it('should update Cubit props reactively', async () => {
      const { result, rerender } = renderHook(
        ({ step }) => {
          const [state, cubit] = useBloc(
            CounterCubit,
            { props: { step } }
          );
          // Access count to ensure it's tracked
          void state.count;
          return [state, cubit];
        },
        { initialProps: { step: 1 } }
      );

      // Wait for initial props to be set
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current[0].stepSize).toBe(1);

      rerender({ step: 5 });

      // Wait for props update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current[0].stepSize).toBe(5);

      act(() => {
        result.current[1].increment();
      });

      // Wait for React to re-render with new state
      await waitFor(() => {
        expect(result.current[0].count).toBe(5);
      });
    });
  });

  describe('Props ownership', () => {
    it('should enforce single owner for props', async () => {
      const warnSpy = vi.spyOn(Blac, 'warn').mockImplementation(() => {});

      // First hook owns props
      const { result: result1 } = renderHook(() =>
        useBloc(
          SearchBloc,
          { props: { apiEndpoint: '/api/search', query: 'owner' } }
        )
      );

      // Second hook cannot override props
      const { result: result2 } = renderHook(() =>
        useBloc(
          SearchBloc,
          { props: { apiEndpoint: '/api/search', query: 'hijacker' } }
        )
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('non-owner adapter')
      );

      // Both should see the owner's state
      expect(result1.current[0].results).toEqual(['Search: owner']);
      expect(result2.current[0].results).toEqual(['Search: owner']);

      warnSpy.mockRestore();
    });

    it('should allow read-only consumers without props', async () => {
      // Owner with props
      const { result: ownerResult } = renderHook(() =>
        useBloc(
          SearchBloc,
          { props: { apiEndpoint: '/api/search', query: 'test' } }
        )
      );

      // Read-only consumer without props
      const { result: readerResult } = renderHook(() =>
        useBloc(SearchBloc, { props: { apiEndpoint: '/api/search' } })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Both see the same state (but different object references due to proxy)
      expect(ownerResult.current[0]).toEqual(readerResult.current[0]);
      expect(readerResult.current[0].results).toEqual(['Search: test']);
    });

    it('should transfer ownership when owner unmounts', async () => {
      const { result: result1, unmount: unmount1 } = renderHook(() =>
        useBloc(
          SearchBloc,
          { props: { apiEndpoint: '/api/search', query: 'first' } }
        )
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result1.current[0].results).toEqual(['Search: first']);

      // Unmount first owner
      unmount1();

      // New owner can take over
      const { result: result2 } = renderHook(() =>
        useBloc(
          SearchBloc,
          { props: { apiEndpoint: '/api/search', query: 'second' } }
        )
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result2.current[0].results).toEqual(['Search: second']);
    });
  });

  describe('Props with other options', () => {
    it('should work with key option', async () => {
      const { result } = renderHook(() =>
        useBloc(
          SearchBloc,
          {
            id: 'custom-search',
            props: { apiEndpoint: '/api/search', query: 'test' }
          }
        )
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current[0].results).toEqual(['Search: test']);
      expect(result.current[1]._id).toBe('custom-search');
    });

    it('should work with lifecycle hooks', async () => {
      const onMount = vi.fn();
      const onUnmount = vi.fn();

      const { result, unmount } = renderHook(() =>
        useBloc(
          SearchBloc,
          {
            props: { apiEndpoint: '/api/search', query: 'test' },
            onMount,
            onUnmount
          }
        )
      );

      expect(onMount).toHaveBeenCalledWith(result.current[1]);

      unmount();

      expect(onUnmount).toHaveBeenCalledWith(result.current[1]);
    });

    it('should work with manual dependencies', () => {
      const { result, rerender } = renderHook(
        ({ step }) => useBloc(
          CounterCubit,
          {
            props: { step },
            dependencies: (cubit) => [cubit.state.count]
          }
        ),
        { initialProps: { step: 1 } }
      );

      const [, cubit] = result.current;

      // Increment should trigger re-render (count is a dependency)
      act(() => {
        cubit.increment();
      });

      expect(result.current[0].count).toBe(1);

      // Changing props should also work
      rerender({ step: 2 });
      expect(result.current[0].stepSize).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined props', async () => {
      const { result } = renderHook(() => {
        const [state, cubit] = useBloc(
          CounterCubit,
          { props: undefined }
        );
        // Access count to ensure it's tracked
        void state.count;
        return [state, cubit];
      });

      // Wait for any effects
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const [state, cubit] = result.current;
      expect(state.stepSize).toBe(1);

      act(() => {
        cubit.increment();
      });

      // Wait for React to re-render with new state
      await waitFor(() => {
        expect(result.current[0].count).toBe(1); // Uses default step
      });
    });

    it('should not re-render for unchanged props', () => {
      let renderCount = 0;

      const { rerender } = renderHook(
        ({ query }) => {
          renderCount++;
          return useBloc(
            SearchBloc,
            { props: { apiEndpoint: '/api/search', query } }
          );
        },
        { initialProps: { query: 'test' } }
      );

      const initialRenderCount = renderCount;

      // Rerender with same props
      rerender({ query: 'test' });

      // Should not cause additional renders beyond React's normal behavior
      expect(renderCount).toBe(initialRenderCount + 1);
    });

    it('should handle rapid props updates', async () => {
      const { result, rerender } = renderHook(
        ({ query }) => useBloc(
          SearchBloc,
          { props: { apiEndpoint: '/api/search', query } }
        ),
        { initialProps: { query: 'initial' } }
      );

      // Wait for initial render
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Rapid updates
      await act(async () => {
        rerender({ query: 'update1' });
        rerender({ query: 'update2' });
        rerender({ query: 'update3' });
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should have the latest value
      expect(result.current[0].results).toEqual(['Search: update3']);
    });
  });
});
