import { describe, it, expect } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { StateContainer } from './StateContainer';
import { EMIT } from './symbols';

class HydratableContainer extends StateContainer<{ v: number }> {
  constructor() {
    super({ v: 0 });
  }
  doEmit(state: { v: number }) {
    this[EMIT](state);
  }
}

describe('StateContainer hydration edge cases', () => {
  blacTestSetup();

  it('waitForHydration() resolves immediately when status is idle', async () => {
    const container = new HydratableContainer();
    expect(container.$blac.hydration.status).toBe('idle');
    await expect(container.$blac.hydration.wait()).resolves.toBeUndefined();
  });

  it('waitForHydration() resolves immediately when status is hydrated', async () => {
    const container = new HydratableContainer();
    container.$blac.hydration.begin();
    container.$blac.hydration.finish();
    expect(container.$blac.hydration.status).toBe('hydrated');
    await expect(container.$blac.hydration.wait()).resolves.toBeUndefined();
  });

  it('waitForHydration() rejects immediately when status is error', async () => {
    const container = new HydratableContainer();
    container.$blac.hydration.begin();
    container.$blac.hydration.fail(new Error('fail'));
    expect(container.$blac.hydration.status).toBe('error');
    await expect(container.$blac.hydration.wait()).rejects.toThrow();
  });

  it('waitForHydration() resolves after finishHydration() called', async () => {
    const container = new HydratableContainer();
    container.$blac.hydration.begin();
    const promise = container.$blac.hydration.wait();
    container.$blac.hydration.finish();
    await expect(promise).resolves.toBeUndefined();
  });

  it('waitForHydration() rejects after failHydration() called', async () => {
    const container = new HydratableContainer();
    container.$blac.hydration.begin();
    const promise = container.$blac.hydration.wait();
    container.$blac.hydration.fail(new Error('hydration failed'));
    await expect(promise).rejects.toThrow('hydration failed');
  });

  it('applyHydratedState() returns false when not in hydrating status', () => {
    const container = new HydratableContainer();
    expect(container.$blac.hydration.status).toBe('idle');
    const result = container.$blac.hydration.apply({ v: 99 });
    expect(result).toBe(false);
    expect(container.state.v).toBe(0);
  });

  it('applyHydratedState() returns false when changedWhileHydrating is true', () => {
    const container = new HydratableContainer();
    container.$blac.hydration.begin();
    container.doEmit({ v: 5 });
    expect(container.$blac.hydration.changedWhileHydrating).toBe(true);
    const result = container.$blac.hydration.apply({ v: 99 });
    expect(result).toBe(false);
  });

  it('beginHydration() resets changedWhileHydrating to false on each cycle', () => {
    const container = new HydratableContainer();
    container.$blac.hydration.begin();
    container.doEmit({ v: 5 });
    expect(container.$blac.hydration.changedWhileHydrating).toBe(true);
    container.$blac.hydration.fail(new Error('cancelled'));
    container.$blac.hydration.begin();
    expect(container.$blac.hydration.changedWhileHydrating).toBe(false);
  });

  it('finishHydration() after error status re-creates hydration promise', async () => {
    const container = new HydratableContainer();
    container.$blac.hydration.begin();
    container.$blac.hydration.fail(new Error('first fail'));
    expect(container.$blac.hydration.status).toBe('error');
    container.$blac.hydration.finish();
    expect(container.$blac.hydration.status).toBe('hydrated');
    await expect(container.$blac.hydration.wait()).resolves.toBeUndefined();
  });
});
