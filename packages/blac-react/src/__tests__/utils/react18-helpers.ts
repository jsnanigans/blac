import { act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { startTransition } from 'react';

/**
 * Helper to wait for a transition to complete
 */
export function waitForTransition(callback: () => void): Promise<void> {
  return act(async () => {
    startTransition(callback);
    // Allow microtasks to flush
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Creates a Cubit that loads data asynchronously
 * Note: Loading is deferred to avoid race conditions with React subscription setup
 */
export function createAsyncCubit<T>(initialValue: T, delay: number = 100) {
  class AsyncCubit extends Cubit<T | null> {
    static isolated = true;
    private loadPromise: Promise<void> | null = null;
    hasStartedLoading = false;

    constructor() {
      super(null);
    }

    private load = async () => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      this.emit(initialValue);
      this.loadPromise = null;
    };

    startLoading = () => {
      if (!this.hasStartedLoading) {
        this.hasStartedLoading = true;
        this.loadPromise = this.load();
      }
      return this.loadPromise;
    };

    waitForLoad = async () => {
      if (this.loadPromise) {
        await this.loadPromise;
      }
    };

    reload = async () => {
      this.emit(null);
      this.hasStartedLoading = false;
      this.loadPromise = this.load();
      await this.loadPromise;
    };
  }

  return AsyncCubit;
}

/**
 * Creates a suspense-enabled resource for testing
 */
export function createSuspenseResource<T>(value: T, delay: number = 100) {
  let status: 'pending' | 'success' | 'error' = 'pending';
  let result: T;
  let suspenseError: Error | undefined;

  const suspensePromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      status = 'success';
      result = value;
      resolve();
    }, delay);
  });

  return {
    read() {
      if (status === 'pending') {
        throw suspensePromise;
      } else if (status === 'error') {
        throw suspenseError;
      } else {
        return result;
      }
    },
    promise: suspensePromise,
  };
}

/**
 * Helper to test concurrent features
 */
export async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Simulates rapid state updates
 */
export async function rapidStateUpdates(
  cubit: any,
  updateMethod: string,
  values: any[],
  delayMs: number = 0,
): Promise<void> {
  for (const value of values) {
    cubit[updateMethod](value);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
