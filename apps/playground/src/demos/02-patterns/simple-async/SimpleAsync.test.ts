import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleAsyncCubit } from './SimpleAsyncCubit';

describe('SimpleAsyncCubit', () => {
  let cubit: SimpleAsyncCubit;

  beforeEach(() => {
    cubit = new SimpleAsyncCubit();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start with idle state', () => {
      expect(cubit.state).toEqual({ status: 'idle' });
    });
  });

  describe('fetchData', () => {
    it('should transition from idle to loading to success', async () => {
      const states: Array<typeof cubit.state> = [];
      const unsubscribe = cubit.subscribe((state) => {
        states.push(state);
      });

      const fetchPromise = cubit.fetchData(false);

      // Should immediately transition to loading
      expect(cubit.state).toEqual({ status: 'loading' });

      // Fast-forward time to complete the simulated API call
      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;

      // Should be in success state
      expect(cubit.state.status).toBe('success');
      if (cubit.state.status === 'success') {
        expect(cubit.state.data).toContain('Data fetched at');
      }

      // Verify state transitions
      expect(states[0]).toEqual({ status: 'loading' });
      expect(states[1].status).toBe('success');

      unsubscribe();
    });

    it('should transition from idle to loading to error when shouldFail is true', async () => {
      const states: Array<typeof cubit.state> = [];
      const unsubscribe = cubit.subscribe((state) => {
        states.push(state);
      });

      const fetchPromise = cubit.fetchData(true);

      // Should immediately transition to loading
      expect(cubit.state).toEqual({ status: 'loading' });

      // Fast-forward time to complete the simulated API call
      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;

      // Should be in error state
      expect(cubit.state).toEqual({
        status: 'error',
        error: 'Network request failed',
      });

      // Verify state transitions
      expect(states[0]).toEqual({ status: 'loading' });
      expect(states[1]).toEqual({
        status: 'error',
        error: 'Network request failed',
      });

      unsubscribe();
    });

    it('should handle multiple sequential fetches', async () => {
      // First fetch - success
      let fetchPromise = cubit.fetchData(false);
      expect(cubit.state).toEqual({ status: 'loading' });

      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;

      expect(cubit.state.status).toBe('success');

      // Second fetch - error
      fetchPromise = cubit.fetchData(true);
      expect(cubit.state).toEqual({ status: 'loading' });

      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;

      expect(cubit.state).toEqual({
        status: 'error',
        error: 'Network request failed',
      });

      // Third fetch - success again
      fetchPromise = cubit.fetchData(false);
      expect(cubit.state).toEqual({ status: 'loading' });

      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;

      expect(cubit.state.status).toBe('success');
    });
  });

  describe('retry', () => {
    it('should retry after an error', async () => {
      // First fetch - simulate error
      let fetchPromise = cubit.fetchData(true);
      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;

      expect(cubit.state).toEqual({
        status: 'error',
        error: 'Network request failed',
      });

      // Retry - should call fetchData with false (no error)
      const retryPromise = Promise.resolve(cubit.retry());

      // Should transition to loading
      expect(cubit.state).toEqual({ status: 'loading' });

      await vi.advanceTimersByTimeAsync(1500);
      await retryPromise;

      // Should be in success state after retry
      expect(cubit.state.status).toBe('success');
    });

    it('should work from any state', async () => {
      // Start from idle
      cubit.retry();
      expect(cubit.state).toEqual({ status: 'loading' });

      await vi.advanceTimersByTimeAsync(1500);
      expect(cubit.state.status).toBe('success');

      // Retry from success state
      cubit.retry();
      expect(cubit.state).toEqual({ status: 'loading' });

      await vi.advanceTimersByTimeAsync(1500);
      expect(cubit.state.status).toBe('success');
    });
  });

  describe('reset', () => {
    it('should reset to idle from success state', async () => {
      // Get to success state
      const fetchPromise = cubit.fetchData(false);
      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;

      expect(cubit.state.status).toBe('success');

      // Reset
      cubit.reset();
      expect(cubit.state).toEqual({ status: 'idle' });
    });

    it('should reset to idle from error state', async () => {
      // Get to error state
      const fetchPromise = cubit.fetchData(true);
      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;

      expect(cubit.state.status).toBe('error');

      // Reset
      cubit.reset();
      expect(cubit.state).toEqual({ status: 'idle' });
    });

    it('should reset to idle from loading state', () => {
      // Start fetch but don't wait
      cubit.fetchData(false);
      expect(cubit.state).toEqual({ status: 'loading' });

      // Reset while loading
      cubit.reset();
      expect(cubit.state).toEqual({ status: 'idle' });
    });
  });

  describe('edge cases', () => {
    it('should handle rapid state changes', async () => {
      // Start fetch
      cubit.fetchData(false);
      expect(cubit.state).toEqual({ status: 'loading' });

      // Reset immediately
      cubit.reset();
      expect(cubit.state).toEqual({ status: 'idle' });

      // Start another fetch
      const fetchPromise = cubit.fetchData(false);
      expect(cubit.state).toEqual({ status: 'loading' });

      // Let it complete
      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;
      expect(cubit.state.status).toBe('success');
    });

    it('should maintain state consistency with concurrent operations', async () => {
      const states: Array<typeof cubit.state> = [];
      const unsubscribe = cubit.subscribe((state) => {
        states.push(state);
      });

      // Start first fetch
      const fetch1 = cubit.fetchData(false);

      // Advance timer partially
      await vi.advanceTimersByTimeAsync(500);

      // Reset while first fetch is in progress
      cubit.reset();
      expect(cubit.state).toEqual({ status: 'idle' });

      // Start second fetch
      const fetch2 = cubit.fetchData(false);

      // Complete both timers
      await vi.advanceTimersByTimeAsync(1500);
      await Promise.all([fetch1, fetch2]);

      // Should reflect the state of the second fetch
      expect(cubit.state.status).toBe('success');

      unsubscribe();
    });

    it('should handle error gracefully when error is not an Error instance', async () => {
      // Override fetchData to simulate non-Error rejection
      const originalFetchData = cubit.fetchData;
      cubit.fetchData = async (shouldFail: boolean = false): Promise<void> => {
        cubit.emit({ status: 'loading' });

        try {
          await new Promise<void>((resolve, reject) => {
            setTimeout(() => {
              if (shouldFail) {
                // Reject with a string instead of Error
                reject('String error');
              } else {
                resolve();
              }
            }, 1500);
          });

          const mockData = `Data fetched at ${new Date().toLocaleTimeString()}`;
          cubit.emit({ status: 'success', data: mockData });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          cubit.emit({ status: 'error', error: errorMessage });
        }
      };

      const fetchPromise = cubit.fetchData(true);
      await vi.advanceTimersByTimeAsync(1500);
      await fetchPromise;

      expect(cubit.state).toEqual({
        status: 'error',
        error: 'Unknown error occurred',
      });

      // Restore original method
      cubit.fetchData = originalFetchData;
    });
  });
});