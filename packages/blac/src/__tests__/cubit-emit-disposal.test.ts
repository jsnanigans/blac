import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

describe('Cubit emit on DISPOSAL_REQUESTED', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should block state updates when emit is called on DISPOSAL_REQUESTED cubit', async () => {
    Blac.enableLog = true;
    const errorSpy = vi.spyOn(Blac.instance, 'error');

    class TestCubit extends Cubit<{ value: number; shouldError: boolean }> {
      constructor() {
        super({ value: 0, shouldError: false });
      }
    }

    const cubit = Blac.getBloc(TestCubit);
    const { unsubscribe } = cubit.subscribe(() => {});

    // Unsubscribe to trigger DISPOSAL_REQUESTED
    unsubscribe();
    expect((cubit as any)._lifecycleManager.currentState).toBe(
      'disposal_requested',
    );

    // Emit should be blocked (not update state)
    const stateBefore = { ...cubit.state };
    cubit.emit({ value: 42, shouldError: true });
    const stateAfter = { ...cubit.state };

    // State should NOT change
    expect(stateAfter.value).toBe(stateBefore.value);
    expect(stateAfter.shouldError).toBe(stateBefore.shouldError);

    // Should still be in DISPOSAL_REQUESTED state
    expect((cubit as any)._lifecycleManager.currentState).toBe(
      'disposal_requested',
    );

    // Error should be logged
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot emit state on disposal_requested bloc'),
    );

    // Disposal should still proceed
    await Promise.resolve();
    expect(cubit.isDisposed).toBe(true);

    Blac.enableLog = false;
  });
});
