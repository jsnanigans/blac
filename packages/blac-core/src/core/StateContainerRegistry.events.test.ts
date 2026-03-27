import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test';
import {
  globalRegistry,
  StateContainerRegistry,
} from './StateContainerRegistry';
import { acquire, release, clearAll } from '../registry';
import { StateContainer } from './StateContainer';
import { EMIT } from './symbols';

class EventBloc extends StateContainer<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  doEmit(state: { n: number }) {
    this[EMIT](state);
  }
}

const resetState = () => clearAll();

describe('StateContainerRegistry lifecycle events', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('on() returns unsubscribe — listener not called after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = globalRegistry.on('created', listener);
    unsubscribe();
    acquire(EventBloc);
    expect(listener).not.toHaveBeenCalled();
  });

  it('multiple listeners on same event all called', () => {
    const a = vi.fn();
    const b = vi.fn();
    globalRegistry.on('created', a);
    globalRegistry.on('created', b);
    acquire(EventBloc);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('listener error is caught and logged — others continue', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwing = vi.fn(() => {
      throw new Error('listener boom');
    });
    const safe = vi.fn();
    globalRegistry.on('created', throwing);
    globalRegistry.on('created', safe);
    acquire(EventBloc);
    expect(safe).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('stateChanged event receives (instance, previousState, newState, stackTrace)', () => {
    const listener = vi.fn();
    globalRegistry.on('stateChanged', listener);
    const instance = acquire(EventBloc);
    instance.doEmit({ n: 42 });
    expect(listener).toHaveBeenCalledWith(
      instance,
      { n: 0 },
      { n: 42 },
      expect.any(String),
    );
  });

  it('no listeners = no throw on emit', () => {
    expect(() => acquire(EventBloc)).not.toThrow();
  });

  it('clearAll() fires disposed event for every cleared instance', () => {
    const listener = vi.fn();
    globalRegistry.on('disposed', listener);
    acquire(EventBloc);
    acquire(EventBloc, 'second');
    clearAll();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
