import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Cubit, Blac } from '@blac/core';
import useBloc from '../useBloc';

interface TestState {
  count: number;
  name: string;
  unused: string;
}

class TestCubit extends Cubit<TestState> {
  static isolated = true; // Make it isolated to avoid test interference

  constructor() {
    super({ count: 0, name: 'Alice', unused: 'not-used' });
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  changeName = (name: string) => {
    this.emit({ ...this.state, name });
  };

  changeUnused = (value: string) => {
    this.emit({ ...this.state, unused: value });
  };
}

describe('useBloc dependency tracking', () => {
  afterEach(() => {
    Blac.resetInstance();
  });

  it('should only track properties accessed during current render', () => {
    let renderCount = 0;
    let accessedProperties: string[] = [];

    const { result, rerender } = renderHook(() => {
      const [state, cubit] = useBloc(TestCubit);
      renderCount++;

      // Reset tracked properties for this render
      accessedProperties = [];

      // First few renders: access both count and name
      if (renderCount <= 2) {
        // Access count and name
        void state.count;
        void state.name;
        accessedProperties = ['count', 'name'];
      } else {
        // Later renders: only access count
        void state.count;
        accessedProperties = ['count'];
      }

      return { state, cubit, accessedProperties };
    });

    // Initial render - accessing count and name
    expect(renderCount).toBe(1);
    expect(result.current.accessedProperties).toEqual(['count', 'name']);

    // Change name - should trigger re-render since we're tracking it
    act(() => {
      result.current.cubit.changeName('Bob');
    });
    expect(renderCount).toBe(2);
    expect(result.current.state.name).toBe('Bob');

    // Force a re-render (this will be render #3, where we stop accessing name)
    rerender();
    expect(renderCount).toBe(3);
    expect(result.current.accessedProperties).toEqual(['count']); // Only accessing count now

    // Change name again - should NOT trigger re-render since we're no longer tracking it
    const prevRenderCount = renderCount;
    act(() => {
      result.current.cubit.changeName('Charlie');
    });

    // Render count should not increase
    expect(renderCount).toBe(prevRenderCount);
    // But state should still be updated if we check it
    expect(result.current.cubit.state.name).toBe('Charlie');

    // Change count - should trigger re-render since we're still tracking it
    act(() => {
      result.current.cubit.increment();
    });
    expect(renderCount).toBe(prevRenderCount + 1);
    expect(result.current.state.count).toBe(1);
  });

  it('should not re-render when non-accessed properties change', () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      const [state, cubit] = useBloc(TestCubit);
      renderCount++;

      // Only access count, never access unused
      void state.count;

      return { state, cubit };
    });

    expect(renderCount).toBe(1);

    // Change unused property - should NOT trigger re-render
    act(() => {
      result.current.cubit.changeUnused('changed');
    });

    // Should not re-render
    expect(renderCount).toBe(1);

    // The component shouldn't re-render, so we can't check the state through result.current
    // This is the expected behavior - component doesn't see changes to untracked properties
  });

  it('should track nested property access correctly', () => {
    interface NestedState {
      user: {
        profile: {
          name: string;
          age: number;
        };
      };
      settings: {
        theme: string;
      };
    }

    class NestedCubit extends Cubit<NestedState> {
      static isolated = true;

      constructor() {
        super({
          user: {
            profile: {
              name: 'Alice',
              age: 25,
            },
          },
          settings: {
            theme: 'light',
          },
        });
      }

      updateName = (name: string) => {
        this.emit({
          ...this.state,
          user: {
            ...this.state.user,
            profile: {
              ...this.state.user.profile,
              name,
            },
          },
        });
      };

      updateTheme = (theme: string) => {
        this.emit({
          ...this.state,
          settings: {
            ...this.state.settings,
            theme,
          },
        });
      };
    }

    let renderCount = 0;

    const { result } = renderHook(() => {
      const [state, cubit] = useBloc(NestedCubit);
      renderCount++;

      // Only access user.profile.name
      void state.user.profile.name;

      return { state, cubit };
    });

    expect(renderCount).toBe(1);

    // Change theme - should NOT trigger re-render
    act(() => {
      result.current.cubit.updateTheme('dark');
    });
    expect(renderCount).toBe(1);

    // Change name - should trigger re-render
    act(() => {
      result.current.cubit.updateName('Bob');
    });
    expect(renderCount).toBe(2);
    expect(result.current.state.user.profile.name).toBe('Bob');
  });
});
