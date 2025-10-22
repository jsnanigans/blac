/**
 * Debug test to understand subscription timing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBloc, clearAllBlocInstances } from '../useBloc';
import { Cubit } from '../../../../blac/src/v2/core/Cubit';

interface TestState {
  settings: {
    theme: string;
  };
  counters: {
    views: number;
    likes: number;
  };
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({
      settings: {
        theme: 'light'
      },
      counters: {
        views: 0,
        likes: 0
      }
    });
  }

  incrementViews = () => {
    console.log('[TestCubit] incrementViews called');
    this.emit({
      ...this.state,
      counters: {
        ...this.state.counters,
        views: this.state.counters.views + 1
      }
    });
    console.log('[TestCubit] incrementViews emitted');
  };

  updateTheme = (theme: string) => {
    console.log('[TestCubit] updateTheme called:', theme);
    this.emit({
      ...this.state,
      settings: {
        ...this.state.settings,
        theme
      }
    });
    console.log('[TestCubit] updateTheme emitted');
  };
}

describe('Debug Subscription Timing', () => {
  beforeEach(() => {
    clearAllBlocInstances();
  });

  it('should trace execution order', async () => {
    let renderCount = 0;

    console.log('=== TEST START ===');

    const { result } = renderHook(() => {
      renderCount++;
      console.log(`[Component] Render #${renderCount} START`);

      const [state, bloc, cr] = useBloc(TestCubit);

      // Conditional property access based on theme
      console.log(`[Component] Accessing state.settings.theme`);
      const theme = state.settings.theme;

      console.log(`[Component] Theme is: ${theme}`);
      const data = theme === 'dark'
        ? (console.log('[Component] Accessing state.counters.views'), state.counters.views)
        : (console.log('[Component] Accessing state.counters.likes'), state.counters.likes);

      console.log(`[Component] Render #${renderCount} END, data=${data}`);

      return {
        data,
        theme,
        bloc,
        cr
      };
    });

    console.log('=== INITIAL RENDER COMPLETE ===');
    console.log('RenderCount:', renderCount);
    console.log('Theme:', result.current.theme);
    console.log('Data:', result.current.data);

    // Wait for microtasks to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    console.log('=== AFTER MICROTASKS ===');
    console.log('Tracked paths:', Array.from(result.current.cr.current.__bridge.getTrackedPaths()));

    expect(renderCount).toBe(1);

    // Now call incrementViews
    console.log('=== CALLING incrementViews ===');
    act(() => {
      result.current.bloc.incrementViews();
    });
    console.log('=== AFTER incrementViews act() ===');

    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('=== AFTER 50ms WAIT ===');
    console.log('RenderCount:', renderCount);
    console.log('Tracked paths:', Array.from(result.current.cr.current.__bridge.getTrackedPaths()));

    expect(renderCount).toBe(1); // Should still be 1
  });
});
