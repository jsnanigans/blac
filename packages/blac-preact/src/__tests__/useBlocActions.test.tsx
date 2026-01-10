/**
 * Tests for useBlocActions hook - Preact Integration
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/preact';
import { StateContainer, StatelessCubit, clearAll } from '@blac/core';
import { useBlocActions } from '../useBlocActions';

class CounterBloc extends StateContainer<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };
}

class AnalyticsService extends StatelessCubit {
  events: string[] = [];

  trackEvent = (name: string) => {
    this.events.push(name);
  };
}

class IsolatedBloc extends StateContainer<{ count: number }> {
  static isolated = true;

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };
}

describe('useBlocActions', () => {
  afterEach(() => {
    clearAll();
  });

  describe('Basic Usage', () => {
    it('should return bloc instance', () => {
      const { result } = renderHook(() => useBlocActions(CounterBloc));

      expect(result.current).toBeInstanceOf(CounterBloc);
    });

    it('should work with stateless containers', () => {
      const { result } = renderHook(() => useBlocActions(AnalyticsService));

      expect(result.current).toBeInstanceOf(AnalyticsService);

      result.current.trackEvent('page_view');

      expect(result.current.events).toContain('page_view');
    });

    it('should share instance across multiple hooks', () => {
      const { result: result1 } = renderHook(() =>
        useBlocActions(CounterBloc),
      );
      const { result: result2 } = renderHook(() =>
        useBlocActions(CounterBloc),
      );

      expect(result1.current).toBe(result2.current);
    });
  });

  describe('Isolated Instances', () => {
    it('should create new instance for each hook', () => {
      const { result: result1 } = renderHook(() =>
        useBlocActions(IsolatedBloc),
      );
      const { result: result2 } = renderHook(() =>
        useBlocActions(IsolatedBloc),
      );

      expect(result1.current).not.toBe(result2.current);
    });

    it('should dispose isolated blocs on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useBlocActions(IsolatedBloc),
      );

      const disposeSpy = vi.spyOn(result.current, 'dispose');

      unmount();

      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Callbacks', () => {
    it('should call onMount callback', () => {
      const onMount = vi.fn();

      renderHook(() => useBlocActions(CounterBloc, { onMount }));

      expect(onMount).toHaveBeenCalledTimes(1);
    });

    it('should call onUnmount callback', () => {
      const onUnmount = vi.fn();

      const { unmount } = renderHook(() =>
        useBlocActions(CounterBloc, { onUnmount }),
      );

      expect(onUnmount).not.toHaveBeenCalled();

      unmount();

      expect(onUnmount).toHaveBeenCalledTimes(1);
    });
  });
});
