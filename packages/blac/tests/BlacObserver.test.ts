import { describe, expect, it, vi } from 'vitest';
import { BlacObservable, Bloc } from '../src';

// Define a dummy event class for testing purposes
class DummyEvent { constructor(public readonly data: string = 'test') {} }

class DummyBloc extends Bloc<any, DummyEvent> {
  constructor() {
    super(undefined);
    // We can optionally register a handler if we want to simulate _currentAction being set
    this.on(DummyEvent, (_event, _emit) => { /* no-op for this test */ });
  }
}
const dummyBloc = new DummyBloc();

describe('BlacObserver', () => {
  describe('subscribe', () => {
    it('should add an observer to the list of observers', () => {
      const freshBloc = new DummyBloc();
      const observable = new BlacObservable(freshBloc);
      const observer = { fn: vi.fn(), id: 'foo' };
      observable.subscribe(observer);
      expect(observable.size).toBe(1);
      expect(observable.observers.has(observer)).toBe(true);
    });

    it('should return a function to unsubscribe the observer', () => {
      const freshBloc = new DummyBloc();
      const observable = new BlacObservable(freshBloc);
      const observer = { fn: vi.fn(), id: 'foo' };
      const unsubscribe = observable.subscribe(observer);
      expect(observable.size).toBe(1);
      unsubscribe();
      expect(observable.size).toBe(0);
    });
  });

  describe('unsubscribe', () => {
    it('should remove an observer from the list of observers', () => {
      const freshBloc = new DummyBloc();
      const observable = new BlacObservable(freshBloc);
      const observer = { fn: vi.fn(), id: 'foo' };
      observable.subscribe(observer);
      expect(observable.size).toBe(1);
      observable.unsubscribe(observer);
      expect(observable.size).toBe(0);
    });
  });

  describe('notify', () => {
    it('should call all observers with the new and old state, and the event', () => {
      const dummyBlocInstance = new DummyBloc();
      const observable = new BlacObservable(dummyBlocInstance);
      const observer1 = { fn: vi.fn(), id: 'foo' };
      const observer2 = { fn: vi.fn(), id: 'bar' };
      const newState = { foo: 'bar' };
      const oldState = { foo: 'baz' };
      const testEvent = new DummyEvent('notify event');

      // Simulate that an event is being processed by the bloc
      // This is normally set by the Bloc's `add` method before handlers are called and emit occurs.
      (dummyBlocInstance as any)._currentAction = testEvent; 

      observable.subscribe(observer1);
      observable.subscribe(observer2);
      observable.notify(newState, oldState, testEvent); // Pass the event to notify

      expect(observer1.fn).toHaveBeenCalledWith(newState, oldState, testEvent);
      expect(observer2.fn).toHaveBeenCalledWith(newState, oldState, testEvent);
      
      // Reset _currentAction if necessary, though for this test it might not matter
      (dummyBlocInstance as any)._currentAction = undefined;
    });
  });

  describe('dispose', () => {
    it('should remove all observers', () => {
      const freshBloc = new DummyBloc();
      const observable = new BlacObservable(freshBloc);
      const observer1 = { fn: vi.fn(), id: 'foo' };
      const observer2 = { fn: vi.fn(), id: 'bar' };

      observable.subscribe(observer1);
      observable.subscribe(observer2);
      expect(observable.size).toBe(2);

      observable.clear();
      expect(observable.size).toBe(0);
    });
  });
});
