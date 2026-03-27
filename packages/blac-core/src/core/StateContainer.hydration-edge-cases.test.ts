import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { StateContainer } from './StateContainer';
import { clearAll } from '../registry';
import { EMIT } from './symbols';

class HydratableContainer extends StateContainer<{ v: number }> {
  constructor() {
    super({ v: 0 });
  }
  doEmit(state: { v: number }) {
    this[EMIT](state);
  }
}

const resetState = () => clearAll();

describe('StateContainer hydration edge cases', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('waitForHydration() resolves immediately when status is idle', async () => {
    const container = new HydratableContainer();
    expect(container.hydrationStatus).toBe('idle');
    await expect(container.waitForHydration()).resolves.toBeUndefined();
  });

  it('waitForHydration() resolves immediately when status is hydrated', async () => {
    const container = new HydratableContainer();
    container.beginHydration();
    container.finishHydration();
    expect(container.hydrationStatus).toBe('hydrated');
    await expect(container.waitForHydration()).resolves.toBeUndefined();
  });

  it('waitForHydration() rejects immediately when status is error', async () => {
    const container = new HydratableContainer();
    container.beginHydration();
    container.failHydration(new Error('fail'));
    expect(container.hydrationStatus).toBe('error');
    await expect(container.waitForHydration()).rejects.toThrow();
  });

  it('waitForHydration() resolves after finishHydration() called', async () => {
    const container = new HydratableContainer();
    container.beginHydration();
    const promise = container.waitForHydration();
    container.finishHydration();
    await expect(promise).resolves.toBeUndefined();
  });

  it('waitForHydration() rejects after failHydration() called', async () => {
    const container = new HydratableContainer();
    container.beginHydration();
    const promise = container.waitForHydration();
    container.failHydration(new Error('hydration failed'));
    await expect(promise).rejects.toThrow('hydration failed');
  });

  it('applyHydratedState() returns false when not in hydrating status', () => {
    const container = new HydratableContainer();
    expect(container.hydrationStatus).toBe('idle');
    const result = container.applyHydratedState({ v: 99 });
    expect(result).toBe(false);
    expect(container.state.v).toBe(0);
  });

  it('applyHydratedState() returns false when changedWhileHydrating is true', () => {
    const container = new HydratableContainer();
    container.beginHydration();
    container.doEmit({ v: 5 });
    expect(container.changedWhileHydrating).toBe(true);
    const result = container.applyHydratedState({ v: 99 });
    expect(result).toBe(false);
  });

  it('beginHydration() resets changedWhileHydrating to false on each cycle', () => {
    const container = new HydratableContainer();
    container.beginHydration();
    container.doEmit({ v: 5 });
    expect(container.changedWhileHydrating).toBe(true);
    container.failHydration(new Error('cancelled'));
    container.beginHydration();
    expect(container.changedWhileHydrating).toBe(false);
  });

  it('finishHydration() after error status re-creates hydration promise', async () => {
    const container = new HydratableContainer();
    container.beginHydration();
    container.failHydration(new Error('first fail'));
    expect(container.hydrationStatus).toBe('error');
    container.finishHydration();
    expect(container.hydrationStatus).toBe('hydrated');
    await expect(container.waitForHydration()).resolves.toBeUndefined();
  });
});
