import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

describe('Cubit emit on DISPOSAL_REQUESTED', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Blac.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should update state when emit is called on DISPOSAL_REQUESTED cubit', () => {
    class TestCubit extends Cubit<{ value: number; shouldError: boolean }> {
      static disposalTimeout = 100;
      constructor() {
        super({ value: 0, shouldError: false });
      }
    }

    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});

    // Unsubscribe to trigger DISPOSAL_REQUESTED
    unsub();
    expect((cubit as any)._lifecycleManager.currentState).toBe('disposal_requested');

    // Emit should work and update state
    const stateBefore = { ...cubit.state };
    cubit.emit({ value: 42, shouldError: true });
    const stateAfter = { ...cubit.state };

    console.log('State before:', stateBefore);
    console.log('State after:', stateAfter);
    console.log('Lifecycle:', (cubit as any)._lifecycleManager.currentState);

    expect(stateAfter.value).toBe(42);
    expect(stateAfter.shouldError).toBe(true);
    expect((cubit as any)._lifecycleManager.currentState).toBe('active');
  });
});
