import { describe, it, expect, vi } from 'vite-plus/test';
import { Cubit } from './core/Cubit';
import { blacTestSetup, createCubitStub, waitForState } from './testing';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  set = (count: number) => this.emit({ count });
}

describe('waitForState', () => {
  blacTestSetup();

  it('resolves immediately when the state already matches', async () => {
    const counter = createCubitStub(CounterCubit, { state: { count: 2 } });

    await expect(waitForState(counter, (s) => s.count === 2)).resolves.toEqual({
      count: 2,
    });
  });

  it('resolves on the first matching change and ignores earlier ones', async () => {
    const counter = createCubitStub(CounterCubit);
    const promise = waitForState(counter, (s) => s.count >= 2);

    counter.set(1);
    counter.set(2);

    await expect(promise).resolves.toEqual({ count: 2 });
  });

  it('rejects on timeout', async () => {
    vi.useFakeTimers();
    try {
      const counter = createCubitStub(CounterCubit);
      const promise = waitForState(counter, (s) => s.count === 1, {
        timeout: 50,
      });
      const assertion = expect(promise).rejects.toThrow('timed out after 50ms');

      await vi.advanceTimersByTimeAsync(50);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
