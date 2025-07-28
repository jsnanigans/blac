import { Blac, Cubit } from '@blac/core';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useBloc from '../useBloc';

interface TestState {
  count: number;
  nested: {
    value: string;
  };
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({ count: 0, nested: { value: 'initial' } });
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  updateNested = () => {
    this.emit({ ...this.state, nested: { value: 'updated' } });
  };
}

describe('useBloc with proxy tracking config', () => {
  const originalConfig = { ...Blac.config };

  beforeEach(() => {
    Blac.resetInstance();
  });

  afterEach(() => {
    Blac.setConfig(originalConfig);
    Blac.resetInstance();
  });

  describe('when proxyDependencyTracking is enabled (default)', () => {
    beforeEach(() => {
      Blac.setConfig({ proxyDependencyTracking: true });
    });

    it('should only re-render when accessed properties change', () => {
      const { result } = renderHook(() => useBloc(TestCubit));
      const renderSpy = vi.fn();

      // Access only count in render
      renderHook(() => {
        const [state] = useBloc(TestCubit);
        renderSpy(state.count);
        return state.count;
      });

      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(renderSpy).toHaveBeenCalledWith(0);

      // Update nested value (not accessed)
      act(() => {
        result.current[1].updateNested();
      });

      // Should not re-render since nested.value wasn't accessed
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Update count (accessed property)
      act(() => {
        result.current[1].increment();
      });

      // Should re-render since count was accessed
      expect(renderSpy).toHaveBeenCalledTimes(2);
      expect(renderSpy).toHaveBeenLastCalledWith(1);
    });
  });

  describe('when proxyDependencyTracking is disabled', () => {
    beforeEach(() => {
      Blac.setConfig({ proxyDependencyTracking: false });
    });

    it('should re-render on any state change', () => {
      const { result } = renderHook(() => useBloc(TestCubit));
      const renderSpy = vi.fn();

      // Access only count in render
      renderHook(() => {
        const [state] = useBloc(TestCubit);
        renderSpy(state.count);
        return state.count;
      });

      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(renderSpy).toHaveBeenCalledWith(0);

      // Update nested value (not accessed)
      act(() => {
        result.current[1].updateNested();
      });

      // Should re-render even though nested.value wasn't accessed
      expect(renderSpy).toHaveBeenCalledTimes(2);
      expect(renderSpy).toHaveBeenLastCalledWith(0); // count didn't change

      // Update count
      act(() => {
        result.current[1].increment();
      });

      // Should re-render
      expect(renderSpy).toHaveBeenCalledTimes(3);
      expect(renderSpy).toHaveBeenLastCalledWith(1);
    });

    it('should still respect manual dependencies when provided', () => {
      const renderSpy = vi.fn();

      const { result } = renderHook(() => 
        useBloc(TestCubit, {
          dependencies: (bloc) => [bloc.state.count]
        })
      );

      // Create another hook that tracks renders
      renderHook(() => {
        const [state] = useBloc(TestCubit, {
          dependencies: (bloc) => [bloc.state.count]
        });
        renderSpy(state);
        return state;
      });

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Update nested value
      act(() => {
        result.current[1].updateNested();
      });

      // Should not re-render since dependencies only include count
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Update count
      act(() => {
        result.current[1].increment();
      });

      // Should re-render since count is in dependencies
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('runtime config changes', () => {
    it('should respect config changes for new hooks', () => {
      // Start with proxy tracking enabled
      Blac.setConfig({ proxyDependencyTracking: true });

      // Create a new cubit instance for this test to avoid interference
      class TestCubit2 extends Cubit<TestState> {
        constructor() {
          super({ count: 0, nested: { value: 'initial' } });
        }

        increment = () => {
          this.emit({ ...this.state, count: this.state.count + 1 });
        };

        updateNested = () => {
          this.emit({ ...this.state, nested: { value: 'updated' } });
        };
      }

      const renderSpy1 = vi.fn();

      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(TestCubit2);
        renderSpy1(state.count);
        return [state, bloc] as const;
      });

      expect(renderSpy1).toHaveBeenCalledTimes(1);

      // Update nested value
      act(() => {
        result1.current[1].updateNested();
      });

      // Should not re-render since nested.value wasn't accessed (proxy tracking enabled)
      expect(renderSpy1).toHaveBeenCalledTimes(1);

      // Change config for future hooks
      Blac.setConfig({ proxyDependencyTracking: false });

      // Create new cubit class to ensure fresh instance
      class TestCubit3 extends Cubit<TestState> {
        constructor() {
          super({ count: 0, nested: { value: 'initial' } });
        }

        increment = () => {
          this.emit({ ...this.state, count: this.state.count + 1 });
        };

        updateNested = () => {
          this.emit({ ...this.state, nested: { value: 'updated' } });
        };
      }

      // Create new hook after config change
      const renderSpy2 = vi.fn();
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(TestCubit3);
        renderSpy2(state.count);
        return [state, bloc] as const;
      });

      expect(renderSpy2).toHaveBeenCalledTimes(1);

      // Update nested value on the new cubit
      act(() => {
        result2.current[1].updateNested();
      });

      // Should re-render even though nested.value wasn't accessed (proxy tracking disabled)
      expect(renderSpy2).toHaveBeenCalledTimes(2);
    });
  });
});