import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cubit } from '@blac/core';

// Discriminated union types for type-safe state handling
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

// State machine Cubit
class DataFetchCubit extends Cubit<LoadingState> {
  constructor() {
    super({ status: 'idle' });
  }

  fetchData = async (shouldFail = false) => {
    this.emit({ status: 'loading' });

    try {
      await new Promise((resolve) => setTimeout(resolve, 10)); // Shorter delay for tests

      if (shouldFail) {
        throw new Error('Failed to fetch data');
      }

      this.emit({
        status: 'success',
        data: `Data fetched at ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      this.emit({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  reset = () => {
    this.emit({ status: 'idle' });
  };

  retry = () => {
    return this.fetchData(false);
  };
}

describe('DataFetchCubit', () => {
  let cubit: DataFetchCubit;

  beforeEach(() => {
    cubit = new DataFetchCubit();
  });

  it('should initialize with idle status', () => {
    expect(cubit.state.status).toBe('idle');
  });

  it('should transition from idle to loading when fetchData is called', () => {
    cubit.fetchData(false);
    expect(cubit.state.status).toBe('loading');
  });

  it('should transition to success on successful fetch', async () => {
    await cubit.fetchData(false);

    expect(cubit.state.status).toBe('success');
    if (cubit.state.status === 'success') {
      expect(cubit.state.data).toContain('Data fetched at');
    }
  });

  it('should transition to error on failed fetch', async () => {
    await cubit.fetchData(true);

    expect(cubit.state.status).toBe('error');
    if (cubit.state.status === 'error') {
      expect(cubit.state.error).toBe('Failed to fetch data');
    }
  });

  it('should reset to idle state from any state', async () => {
    // Test reset from success
    await cubit.fetchData(false);
    expect(cubit.state.status).toBe('success');

    cubit.reset();
    expect(cubit.state.status).toBe('idle');

    // Test reset from error
    await cubit.fetchData(true);
    expect(cubit.state.status).toBe('error');

    cubit.reset();
    expect(cubit.state.status).toBe('idle');
  });

  it('should retry after error and succeed', async () => {
    // First fail
    await cubit.fetchData(true);
    expect(cubit.state.status).toBe('error');

    // Then retry (which calls fetchData with success)
    await cubit.retry();
    expect(cubit.state.status).toBe('success');
  });

  it('should handle state transitions correctly', async () => {
    const states: LoadingState['status'][] = [];
    cubit.subscribe(() => {
      states.push(cubit.state.status);
    });

    await cubit.fetchData(false);

    // Should transition: loading -> success
    expect(states).toEqual(['loading', 'success']);
  });

  it('should handle error state transitions correctly', async () => {
    const states: LoadingState['status'][] = [];
    cubit.subscribe(() => {
      states.push(cubit.state.status);
    });

    await cubit.fetchData(true);

    // Should transition: loading -> error
    expect(states).toEqual(['loading', 'error']);
  });

  it('should maintain type safety with discriminated unions', async () => {
    await cubit.fetchData(false);

    // TypeScript compile-time check: these should only compile if state is correct type
    if (cubit.state.status === 'success') {
      expect(typeof cubit.state.data).toBe('string');
      // @ts-expect-error - error property should not exist on success state
      expect(cubit.state.error).toBeUndefined();
    }
  });

  it('should handle multiple sequential fetches', async () => {
    // First fetch - success
    await cubit.fetchData(false);
    expect(cubit.state.status).toBe('success');

    // Reset to idle
    cubit.reset();
    expect(cubit.state.status).toBe('idle');

    // Second fetch - error
    await cubit.fetchData(true);
    expect(cubit.state.status).toBe('error');

    // Third fetch after error - success
    await cubit.retry();
    expect(cubit.state.status).toBe('success');
  });

  it('should handle rapid state transitions', async () => {
    // Start multiple fetches
    const promise1 = cubit.fetchData(false);
    const promise2 = cubit.fetchData(true);

    await Promise.all([promise1, promise2]);

    // Last fetch should win (error in this case)
    expect(cubit.state.status).toBe('error');
  });
});

describe('Loading State Type Safety', () => {
  it('should enforce type-safe access to state properties', () => {
    const cubit = new DataFetchCubit();

    // Idle state
    expect(cubit.state.status).toBe('idle');

    // Success state (simulated)
    const successState: LoadingState = { status: 'success', data: 'test' };
    if (successState.status === 'success') {
      expect(successState.data).toBe('test');
    }

    // Error state (simulated)
    const errorState: LoadingState = { status: 'error', error: 'test error' };
    if (errorState.status === 'error') {
      expect(errorState.error).toBe('test error');
    }
  });
});
