/**
 * Tests for useBloc with automatic proxy tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { useBloc } from '../useBloc';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';

// Test state shape
interface TestState {
  user: {
    name: string;
    age: number;
    profile: {
      bio: string;
      avatar: string;
    };
  };
  settings: {
    theme: string;
    notifications: boolean;
  };
  counters: {
    views: number;
    likes: number;
  };
}

// Test Cubit implementation
class TestCubit extends Cubit<TestState> {
  constructor() {
    super({
      user: {
        name: 'John',
        age: 30,
        profile: {
          bio: 'Developer',
          avatar: 'avatar.jpg',
        },
      },
      settings: {
        theme: 'light',
        notifications: true,
      },
      counters: {
        views: 0,
        likes: 0,
      },
    });
  }

  updateUserName = (name: string) => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        name,
      },
    });
  };

  updateUserAge = (age: number) => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        age,
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

  incrementViews = () => {
    this.emit({
      ...this.state,
      counters: {
        ...this.state.counters,
        views: this.state.counters.views + 1,
      },
    });
  };

  updateBio = (bio: string) => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        profile: {
          ...this.state.user.profile,
          bio,
        },
      },
    });
  };
}

blacTestSetup();

describe('useBloc with Proxy Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should only re-render when accessed properties change', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(TestCubit);

      // Only access user.name in this component
      const name = state.user.name;

      return { name, bloc };
    });

    expect(renderCount).toBe(1);
    expect(result.current.name).toBe('John');

    // Update a property that IS accessed - should re-render
    act(() => {
      result.current.bloc.updateUserName('Jane');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
      expect(result.current.name).toBe('Jane');
    });

    // Update a property that is NOT accessed - should NOT re-render
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    // Give it time to potentially re-render (it shouldn't)
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // Still 2, no re-render

    // Update another unaccessed property
    act(() => {
      result.current.bloc.incrementViews();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // Still 2, no re-render
  });

  it('should track nested property access correctly', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(TestCubit);

      // Access nested property
      const bio = state.user.profile.bio;

      return { bio, bloc };
    });

    expect(renderCount).toBe(1);
    expect(result.current.bio).toBe('Developer');

    // Update the accessed nested property - should re-render
    act(() => {
      result.current.bloc.updateBio('Senior Developer');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
      expect(result.current.bio).toBe('Senior Developer');
    });

    // Update an unrelated property - should NOT re-render with fine-grained tracking
    // Note: With fine-grained tracking, only 'user.profile.bio' is tracked (not 'user')
    // When user.name changes but bio stays same, no re-render occurs
    act(() => {
      result.current.bloc.updateUserName('Bob');
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // No re-render with fine-grained tracking
  });

  it('should handle multiple property access', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(TestCubit);

      // Access multiple properties
      const name = state.user.name;
      const theme = state.settings.theme;

      return { name, theme, bloc };
    });

    expect(renderCount).toBe(1);
    expect(result.current.name).toBe('John');
    expect(result.current.theme).toBe('light');

    // Update one of the accessed properties - should re-render
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
      expect(result.current.theme).toBe('dark');
    });

    // Update the other accessed property - should re-render
    act(() => {
      result.current.bloc.updateUserName('Alice');
    });

    await waitFor(() => {
      expect(renderCount).toBe(3);
      expect(result.current.name).toBe('Alice');
    });

    // Update an unaccessed property - should NOT re-render
    act(() => {
      result.current.bloc.incrementViews();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(3); // No re-render
  });

  it('should work correctly in React Strict Mode', async () => {
    let renderCount = 0;

    const { result } = renderHook(
      () => {
        renderCount++;
        const [state, bloc] = useBloc(TestCubit);

        // Access a property
        const name = state.user.name;

        return { name, bloc };
      },
      {
        wrapper: StrictMode, // Wrap in StrictMode
      },
    );

    // StrictMode may cause double-rendering in development
    // but the tracking should still work correctly
    expect(result.current.name).toBe('John');

    // Update accessed property
    act(() => {
      result.current.bloc.updateUserName('StrictModeTest');
    });

    await waitFor(() => {
      expect(result.current.name).toBe('StrictModeTest');
    });

    // Update unaccessed property - should not cause re-render
    const countBefore = renderCount;
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    // Render count should not have increased
    expect(renderCount).toBe(countBefore);
  });

  it('should update tracked paths when conditional rendering changes', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc, cr] = useBloc(TestCubit);

      // Conditional property access based on theme
      const data =
        state.settings.theme === 'dark'
          ? state.counters.views // Access views in dark mode
          : state.counters.likes; // Access likes in light mode

      return {
        data,
        theme: state.settings.theme,
        bloc,
        cr,
      };
    });

    expect(renderCount).toBe(1);
    expect(result.current.theme).toBe('light');
    expect(result.current.data).toBe(0); // likes

    // Initially, updating views should NOT re-render with fine-grained tracking
    // Note: state.counters.likes tracks only 'counters.likes', not 'counters'
    // Updating views changes counters.views, leaving counters.likes unchanged
    act(() => {
      result.current.bloc.incrementViews();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(1); // No re-render with fine-grained tracking

    // Switch to dark mode
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2); // Render count: 2 (was 1, theme changed)
      expect(result.current.theme).toBe('dark');
    });

    // Now updating views SHOULD re-render (dark mode, now tracking views)
    act(() => {
      result.current.bloc.incrementViews();
    });

    await waitFor(() => {
      expect(renderCount).toBe(3); // Render count: 3 (was 2, views changed)
      expect(result.current.data).toBe(2); // views incremented twice
    });
  });

  it('should handle array property access', async () => {
    // Create a Cubit with array state
    class ArrayCubit extends Cubit<{ items: string[]; other: number }> {
      constructor() {
        super({ items: ['a', 'b', 'c'], other: 0 });
      }

      addItem = (item: string) => {
        this.emit({
          ...this.state,
          items: [...this.state.items, item],
        });
      };

      updateOther = (value: number) => {
        this.emit({
          ...this.state,
          other: value,
        });
      };
    }

    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(ArrayCubit);

      // Access array length
      const itemCount = state.items.length;

      return { itemCount, bloc };
    });

    expect(renderCount).toBe(1);
    expect(result.current.itemCount).toBe(3);

    // Add item - should re-render (length changes)
    act(() => {
      result.current.bloc.addItem('d');
    });
    act(() => {
      result.current.bloc.updateOther(42);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2);
    expect(result.current.itemCount).toBe(4);

    expect(renderCount).toBe(2); // No re-render
  });

  it('should clean up properly on unmount', () => {
    const { result, unmount } = renderHook(() => {
      const [state, bloc] = useBloc(TestCubit);
      return { state, bloc };
    });

    expect(result.current.state.user.name).toBe('John');

    // Unmount the hook
    unmount();

    // The bloc should be cleaned up (no errors should occur)
    // This test mainly ensures no memory leaks or errors on unmount
  });

  it('should NOT re-render when state is destructured but never accessed', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [_state, bloc] = useBloc(TestCubit);

      // State is destructured but NEVER accessed
      // This should result in no tracked dependencies

      return { bloc };
    });

    expect(renderCount).toBe(1);

    // Update state - should NOT re-render because nothing was tracked
    act(() => {
      result.current.bloc.updateUserName('Jane');
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(1); // No re-render

    // Update another property - should NOT re-render
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(1); // Still no re-render

    // Update nested property - should NOT re-render
    act(() => {
      result.current.bloc.updateBio('New bio');
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(1); // Still no re-render
  });
});
