import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
import { StateContainer } from './StateContainer';
import { clearAll } from '../registry';
import { EMIT } from './symbols';

class SimpleContainer extends StateContainer<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  doEmit(state: { n: number }) {
    this[EMIT](state);
  }
}

const resetState = () => clearAll();

describe('StateContainer subscriptions', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('subscribe() returns an unsubscribe function', () => {
    const container = new SimpleContainer();
    const unsubscribe = container.subscribe(vi.fn());
    expect(typeof unsubscribe).toBe('function');
  });

  it('listener receives updated state on emit', () => {
    const container = new SimpleContainer();
    const listener = vi.fn();
    container.subscribe(listener);
    container.doEmit({ n: 42 });
    expect(listener).toHaveBeenCalledWith({ n: 42 });
  });

  it('multiple listeners all receive state update', () => {
    const container = new SimpleContainer();
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();
    container.subscribe(a);
    container.subscribe(b);
    container.subscribe(c);
    container.doEmit({ n: 7 });
    expect(a).toHaveBeenCalledWith({ n: 7 });
    expect(b).toHaveBeenCalledWith({ n: 7 });
    expect(c).toHaveBeenCalledWith({ n: 7 });
  });

  it('removing one listener does not affect others', () => {
    const container = new SimpleContainer();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = container.subscribe(a);
    container.subscribe(b);
    unsubA();
    container.doEmit({ n: 1 });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('subscribe() on disposed container throws', () => {
    const container = new SimpleContainer();
    container.dispose();
    expect(() => container.subscribe(vi.fn())).toThrow();
  });

  it('listener errors are caught and logged — other subscribers still called', () => {
    const container = new SimpleContainer();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwing = () => {
      throw new Error('listener error');
    };
    const safe = vi.fn();
    container.subscribe(throwing);
    container.subscribe(safe);
    container.doEmit({ n: 1 });
    expect(safe).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('unsubscribing during emission is safe', () => {
    const container = new SimpleContainer();
    // oxlint-disable-next-line prefer-const
    let unsubscribe: () => void;
    const selfRemoving = vi.fn(() => unsubscribe());
    unsubscribe = container.subscribe(selfRemoving);
    container.doEmit({ n: 1 });
    container.doEmit({ n: 2 });
    expect(selfRemoving).toHaveBeenCalledTimes(1);
  });

  it('listener added inside another listener — new listener not called in current emit', () => {
    const container = new SimpleContainer();
    const lateListener = vi.fn();
    const firstListener = vi.fn(() => {
      container.subscribe(lateListener);
    });
    container.subscribe(firstListener);
    container.doEmit({ n: 1 });
    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(lateListener).not.toHaveBeenCalled();
    container.doEmit({ n: 2 });
    expect(lateListener).toHaveBeenCalledTimes(1);
  });

  it('same listener function added twice — only stored once (Set semantics)', () => {
    const container = new SimpleContainer();
    const listener = vi.fn();
    container.subscribe(listener);
    container.subscribe(listener);
    container.doEmit({ n: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('all listeners cleared on dispose', () => {
    const container = new SimpleContainer();
    const a = vi.fn();
    const b = vi.fn();
    container.subscribe(a);
    container.subscribe(b);
    container.dispose();
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});
