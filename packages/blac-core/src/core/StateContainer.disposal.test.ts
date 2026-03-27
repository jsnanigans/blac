import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
import { StateContainer } from './StateContainer';
import { acquire, release, clearAll } from '../registry';
import { EMIT, UPDATE } from './symbols';

class DisposableContainer extends StateContainer<{ v: number }> {
  disposeCount = 0;
  constructor() {
    super({ v: 0 });
    this.onSystemEvent('dispose', () => {
      this.disposeCount++;
    });
  }
  doEmit(state: { v: number }) {
    this[EMIT](state);
  }
  doUpdate(updater: (s: { v: number }) => { v: number }) {
    this[UPDATE](updater);
  }
}

const resetState = () => clearAll();

describe('StateContainer disposal', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('dispose() sets isDisposed to true', () => {
    const container = new DisposableContainer();
    container.dispose();
    expect(container.isDisposed).toBe(true);
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

  it('update() throws on disposed container', () => {
    const container = new DisposableContainer();
    container.dispose();
    expect(() => container.doUpdate((s) => ({ v: s.v + 1 }))).toThrow();
  });

  it('dispose() fires dispose system event exactly once', () => {
    const container = new DisposableContainer();
    container.dispose();
    expect(container.disposeCount).toBe(1);
  });

  it('dispose() during hydrating transitions hydrationStatus to error', () => {
    const container = new DisposableContainer();
    container.beginHydration();
    expect(container.hydrationStatus).toBe('hydrating');
    container.dispose();
    expect(container.isDisposed).toBe(true);
    expect(container.hydrationStatus).toBe('error');
  });

  it('release() to zero refCount auto-disposes', () => {
    const instance = acquire(DisposableContainer);
    release(DisposableContainer);
    expect(instance.isDisposed).toBe(true);
  });

  it('release(Type, key, true) force-disposes regardless of refCount', () => {
    acquire(DisposableContainer);
    const instance = acquire(DisposableContainer);
    release(DisposableContainer, 'default', true);
    expect(instance.isDisposed).toBe(true);
  });
});
