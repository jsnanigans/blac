import { describe, it, expect } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { StateContainer } from './StateContainer';
import { acquire, release } from '../registry';

class DisposableContainer extends StateContainer<{ v: number }> {
  disposeCount = 0;
  constructor() {
    super({ v: 0 });
    this.onSystemEvent('dispose', () => {
      this.disposeCount++;
    });
  }
  doEmit(state: { v: number }) {
    this.emit(state);
  }
}

describe('StateContainer disposal', () => {
  blacTestSetup();

  it('dispose() sets isDisposed to true', () => {
    const container = new DisposableContainer();
    container.dispose();
    expect(container.$blac.disposed).toBe(true);
  });

  it('dispose() is idempotent — second call is a no-op', () => {
    const container = new DisposableContainer();
    container.dispose();
    container.dispose();
    expect(container.disposeCount).toBe(1);
  });

  it('emit() throws on disposed container', () => {
    const container = new DisposableContainer();
    container.dispose();
    expect(() => container.doEmit({ v: 1 })).toThrow();
  });

  it('dispose() fires dispose system event exactly once', () => {
    const container = new DisposableContainer();
    container.dispose();
    expect(container.disposeCount).toBe(1);
  });

  it('dispose() during hydrating transitions hydrationStatus to error', () => {
    const container = new DisposableContainer();
    container.$blac.hydration.begin();
    expect(container.$blac.hydration.status).toBe('hydrating');
    container.dispose();
    expect(container.$blac.disposed).toBe(true);
    expect(container.$blac.hydration.status).toBe('error');
  });

  it('release() to zero refCount auto-disposes', () => {
    const instance = acquire(DisposableContainer);
    release(DisposableContainer);
    expect(instance.$blac.disposed).toBe(true);
  });

  it('release(Type, { forceDispose: true }) force-disposes regardless of refCount', () => {
    acquire(DisposableContainer);
    const instance = acquire(DisposableContainer);
    release(DisposableContainer, { forceDispose: true });
    expect(instance.$blac.disposed).toBe(true);
  });
});
