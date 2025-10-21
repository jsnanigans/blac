/**
 * Debug test to verify notify callback issue
 */

import { describe, it, expect, vi } from 'vitest';
import { Cubit, Blac } from '@blac/core';
import { ReactBlocAdapter } from '../ReactBlocAdapter';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
    this.config = { proxyDependencyTracking: false };
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

describe('Debug Notify Test', () => {
  it('should notify with auto-tracking ENABLED (default)', () => {
    const cubit = new CounterCubit();
    const adapter = new ReactBlocAdapter(cubit);

    const notify = vi.fn();
    adapter.subscribe(undefined, notify);

    console.log('Before increment:', {
      snapshot: adapter.getSnapshot(),
      version: adapter.getVersion(),
      notifyCallCount: notify.mock.calls.length,
    });

    cubit.increment();

    console.log('After increment:', {
      snapshot: adapter.getSnapshot(),
      version: adapter.getVersion(),
      notifyCallCount: notify.mock.calls.length,
    });

    // This is currently failing
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('should notify with auto-tracking DISABLED', () => {
    // Disable auto-tracking
    const originalConfig = Blac.config;
    Blac.setConfig({ proxyDependencyTracking: false });

    const cubit = new CounterCubit();
    const adapter = new ReactBlocAdapter(cubit);

    const notify = vi.fn();
    adapter.subscribe(undefined, notify);

    console.log('Before increment (no auto-track):', {
      snapshot: adapter.getSnapshot(),
      version: adapter.getVersion(),
      notifyCallCount: notify.mock.calls.length,
    });

    cubit.increment();

    console.log('After increment (no auto-track):', {
      snapshot: adapter.getSnapshot(),
      version: adapter.getVersion(),
      notifyCallCount: notify.mock.calls.length,
    });

    // Restore config
    Blac.setConfig(originalConfig);

    // This should work
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('should notify with explicit selector', () => {
    const cubit = new CounterCubit();
    const adapter = new ReactBlocAdapter(cubit);

    const notify = vi.fn();
    adapter.subscribe((state) => state, notify);

    console.log('Before increment (with selector):', {
      snapshot: adapter.getSnapshot(),
      version: adapter.getVersion(),
      notifyCallCount: notify.mock.calls.length,
    });

    cubit.increment();

    console.log('After increment (with selector):', {
      snapshot: adapter.getSnapshot(),
      version: adapter.getVersion(),
      notifyCallCount: notify.mock.calls.length,
    });

    // This should work
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
