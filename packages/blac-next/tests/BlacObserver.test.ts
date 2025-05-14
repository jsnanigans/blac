import { describe, expect, it, vi } from 'vitest';
import { BlacObservable, Bloc } from '../src';

class DummyBloc extends Bloc<any, any> {
  constructor() {
    super(undefined);
  }

  reducer() {
    return 1;
  }
}
const dummyBloc = new DummyBloc();

describe('BlacObserver', () => {
  describe('subscribe', () => {
    it('should add an observer to the list of observers', () => {
      const observable = new BlacObservable(dummyBloc);
      const observer = { fn: vi.fn(), id: 'foo' };
      observable.subscribe(observer);
      expect(observable.observers.size).toBe(1);
      expect(observable.observers.has(observer)).toBe(true);
    });

    it('should return a function to unsubscribe the observer', () => {
      const observable = new BlacObservable(dummyBloc);
      const observer = { fn: vi.fn(), id: 'foo' };
      const unsubscribe = observable.subscribe(observer);
      expect(observable.observers.size).toBe(1);
      unsubscribe();
      expect(observable.observers.size).toBe(0);
    });
  });

  describe('unsubscribe', () => {
    it('should remove an observer from the list of observers', () => {
      const observable = new BlacObservable(dummyBloc);
      const observer = { fn: vi.fn(), id: 'foo' };
      observable.subscribe(observer);
      expect(observable.observers.size).toBe(1);
      observable.unsubscribe(observer);
      expect(observable.observers.size).toBe(0);
    });
  });

  describe('notify', () => {
    it('should call all observers with the new and old state', () => {
      const observable = new BlacObservable(dummyBloc);
      const observer1 = { fn: vi.fn(), id: 'foo' };
      const observer2 = { fn: vi.fn(), id: 'bar' };
      const newState = { foo: 'bar' };
      const oldState = { foo: 'baz' };

      observable.subscribe(observer1);
      observable.subscribe(observer2);
      observable.notify(newState, oldState);

      expect(observer1.fn).toHaveBeenCalledWith(newState, oldState, undefined);
      expect(observer2.fn).toHaveBeenCalledWith(newState, oldState, undefined);
    });
  });

  describe('dispose', () => {
    it('should remove all observers', () => {
      const observable = new BlacObservable(dummyBloc);
      const observer1 = { fn: vi.fn(), id: 'foo' };
      const observer2 = { fn: vi.fn(), id: 'bar' };

      observable.subscribe(observer1);
      observable.subscribe(observer2);
      expect(observable.observers.size).toBe(2);

      observable.dispose();
      expect(observable.observers.size).toBe(0);
    });
  });
});
