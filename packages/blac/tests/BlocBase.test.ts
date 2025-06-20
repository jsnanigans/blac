import { describe, expect, it, vi } from 'vitest';
import { BlacObserver, BlocBase } from '../src';

class BlocBaseSimple extends BlocBase<unknown> {}
class BlocBaseSimpleIsolated extends BlocBase<unknown> {
  static isolated = true;
}

describe('BlocBase', () => {
  describe('constructor', () => {
    it('should create a new observable', () => {
      const instance = new BlocBaseSimple(0);
      expect(instance._observer).toBeDefined();
    });

    it('should set initial state', () => {
      const initial = {
        a: 2,
      };
      const instance = new BlocBaseSimple(initial);
      expect(instance._state).toStrictEqual(initial);
    });

    it('should set the `id` to the constructors name', () => {
      const instance = new BlocBaseSimple(0);
      expect(instance._id).toBe('BlocBaseSimple');
    });

    it('should set local prop `isolated` to whatever the static prop was set to when constructed', () => {
      const instance = new BlocBaseSimple(0);
      expect(instance._isolated).toBe(false);
      const instance2 = new BlocBaseSimpleIsolated(0);
      expect(instance2._isolated).toBe(true);
    });
  });

  describe('updateId', () => {
    it('should update the id', () => {
      const instance = new BlocBaseSimple(0);
      expect(instance._id).toBe('BlocBaseSimple');

      instance._updateId('new-id');
      expect(instance._id).toBe('new-id');
    });
  });

  describe('addSubscriber', () => {
    it('should add a subscriber to the observer', () => {
      const instance = new BlocBaseSimple(0);
      const observer = instance._observer;
      const observerSpy = vi.spyOn(observer, 'subscribe');
      expect(observerSpy).not.toHaveBeenCalled();
      const callback = { fn: () => {}, id: 'foo' } as BlacObserver<any>;
      instance._observer.subscribe(callback);
      expect(observerSpy).toHaveBeenCalledWith(callback);
    });

    it('should return the method that unsubscribes the listener', async () => {
      const instance = new BlocBaseSimple(0);
      const observer = instance._observer;
      const observerSpy = vi.spyOn(observer, 'unsubscribe');
      expect(observerSpy).not.toHaveBeenCalled();
      const callback = { fn: () => {}, id: 'foo' };
      const unsubscribe = instance._observer.subscribe(callback);
      expect(observerSpy).not.toHaveBeenCalled();

      unsubscribe();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(observerSpy).toHaveBeenCalledWith(callback);
    });
  });

  // describe('handleUnsubscribe', () => {
  //   // This entire describe block is commented out as its tests were removed.
  //   // it('should report `listener_removed` when a listener is removed', () => {
  //   //   // ...
  //   // });
  // });

  // describe('dispose', () => {
  //   // This entire describe block is commented out as its tests were removed.
  //   // it('should report `bloc_disposed` when disposed', () => {
  //   //   // ...
  //   // });
  // });

  describe('getters', () => {
    describe('name', () => {
      it('should return the name of the constructor', () => {
        const instance = new BlocBaseSimple(0);
        expect(instance._name).toBe('BlocBaseSimple');
      });
    });

    describe('state', () => {
      it('should return the current state', () => {
        const instance = new BlocBaseSimple(0);
        expect(instance.state).toBe(0);
      });
    });


  });
});
