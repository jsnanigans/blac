/**
 * Debug test to understand render timing
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [TestCubit] incrementViews called`);
    this.emit({
      ...this.state,
      counters: {
        ...this.state.counters,
        views: this.state.counters.views + 1
      }
    });
    console.log(`[${timestamp}] [TestCubit] incrementViews emitted`);
  };
}

describe('Debug Render Timing', () => {
  beforeEach(() => {
    clearAllBlocInstances();
  });

  it('should trace render timing with incrementViews', async () => {
    let renderCount = 0;

    console.log('=== TEST START ===');

    const { result } = renderHook(() => {
      renderCount++;
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [Component] Render #${renderCount} START`);

      const [state, bloc, cr] = useBloc(TestCubit);

      const theme = state.settings.theme;
      const data = theme === 'dark'
        ? state.counters.views
        : state.counters.likes;

      console.log(`[${timestamp}] [Component] Render #${renderCount} END`);

      return {
        data,
        theme,
        bloc,
        cr
      };
    });

    console.log('=== INITIAL RENDER COMPLETE, renderCount:', renderCount, '===');

    // Wait for microtasks
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log('=== AFTER MICROTASKS, renderCount:', renderCount, '===');

    expect(renderCount).toBe(1);

    // Now call incrementViews
    console.log('=== CALLING incrementViews ===');
    act(() => {
      result.current.bloc.incrementViews();
    });
    console.log('=== AFTER incrementViews act(), renderCount:', renderCount, '===');

    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('=== AFTER 50ms WAIT, renderCount:', renderCount, '===');

    expect(renderCount).toBe(1); // Should still be 1
  });
});
