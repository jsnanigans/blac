import { beforeEach, describe, expect, it, vi, test } from 'vitest';
import { BlocBase } from './BlocBase';
import { Blac, BlacEvent } from './Blac';
import { BlacPlugin } from './BlacPlugin';

class BlocBaseSimple extends BlocBase<unknown> {}
class BlocBaseSimpleIsolated extends BlocBase<unknown> {
  static isolated = true;
}

describe('BlocBase', () => {
  describe('constructor', () => {
    it('should create a new observable', () => {
      const instance = new BlocBaseSimple(0);
      expect(instance.observer).toBeDefined();
    });

    it('should set initial state', () => {
      const initial = {
        a: 2,
      };
      const instance = new BlocBaseSimple(initial);
      expect(instance._state).toStrictEqual(initial);
    });

    it('should report the `bloc_created` event', () => {
      const blac = Blac.getInstance();
      const spy = vi.fn();
      const blacPlugin = {
        name: 'test',
        onEvent: (e: BlacEvent) => spy(e),
      };
      blac.addPlugin(blacPlugin as BlacPlugin);
      new BlocBaseSimple(0);
      expect(spy).toHaveBeenCalledWith(BlacEvent.BLOC_CREATED);
    });

    it('should set the `id` to the constructors name', () => {
      const instance = new BlocBaseSimple(0);
      expect(instance.id).toBe('BlocBaseSimple');
    });

    it('should set local prop `isolated` to whatever tht static prop was set to when constructed', () => {
      const instance = new BlocBaseSimple(0);
      expect(instance.isolated).toBe(false);
      const instance2 = new BlocBaseSimpleIsolated(0);
      expect(instance2.isolated).toBe(true);
    });
  });

  describe('props', () => {
    it('should return private props if set', () => {
      const instance = new BlocBaseSimple(0);
      const props = { a: 1 };
      instance.props = props;
      expect(instance.props).toBe(props);
    });

    it('should return constructor props if no local props are set', () => {
      const constructorProps = { a: 1 };
      BlocBaseSimple._propsOnInit = constructorProps;
      const instance = new BlocBaseSimple(0);
      expect(instance.props).toBe(constructorProps);
    });

    it('should return undefined if no props are set', () => {
      const instance = new BlocBaseSimple(0);
      BlocBaseSimple._propsOnInit = undefined;
      expect(instance.props).toBeUndefined();
    });
  });

  describe('updateId', () => {
    it('should update the id', () => {
      const instance = new BlocBaseSimple(0);
      expect(instance.id).toBe('BlocBaseSimple');

      instance.updateId('new-id');
      expect(instance.id).toBe('new-id');
    });
  });

  describe('addEventListenerStateChange', () => {
    it('should report `listener_added` when a listener is added', () => {
      const instance = new BlocBaseSimple(0);
      const blac = instance.blac;
      const blacSpy = vi.spyOn(blac, 'report');

      instance.addEventListenerStateChange(() => {});
      expect(blacSpy).toHaveBeenNthCalledWith(
        1,
        BlacEvent.LISTENER_ADDED,
        instance,
      );
    });

    it('should add a subscriber to the observer', () => {
      const instance = new BlocBaseSimple(0);
      const observer = instance.observer;
      const observerSpy = vi.spyOn(observer, 'subscribe');
      expect(observerSpy).not.toHaveBeenCalled();
      const callback = () => {};
      instance.addEventListenerStateChange(callback);
      expect(observerSpy).toHaveBeenCalledWith(callback);
    });

    it('should return the a method that unsubscribes the listener', () => {
      const instance = new BlocBaseSimple(0);
      const observer = instance.observer;
      const observerSpy = vi.spyOn(observer, 'unsubscribe');
      expect(observerSpy).not.toHaveBeenCalled();
      const callback = () => {};
      const unsubscribe = instance.addEventListenerStateChange(callback);
      expect(observerSpy).not.toHaveBeenCalled();

      unsubscribe();
      expect(observerSpy).toHaveBeenCalledWith(callback);
    });
  });

  describe('handleUnsubscribe', () => {
    it('should report `listener_removed` when a listener is removed', () => {
      const instance = new BlocBaseSimple(0);
      const blac = instance.blac;
      const blacSpy = vi.spyOn(blac, 'report');
      const callback = () => {};
      instance.addEventListenerStateChange(callback);
      expect(blacSpy).toHaveBeenCalledWith(BlacEvent.LISTENER_ADDED, instance);
    });
  });

  describe('dispose', () => {
    it('should report `bloc_disposed` when disposed', () => {
      const instance = new BlocBaseSimple(0);
      const blac = instance.blac;
      const blacSpy = vi.spyOn(blac, 'report');
      instance.dispose();
      expect(blacSpy).toHaveBeenCalledWith(BlacEvent.BLOC_DISPOSED, instance);
    });
  });

  describe('getters', () => {
    describe('name', () => {
      it('should return the name of the constructor', () => {
        const instance = new BlocBaseSimple(0);
        expect(instance.name).toBe('BlocBaseSimple');
      });
    });

    describe('state', () => {
      it('should return the current state', () => {
        const instance = new BlocBaseSimple(0);
        expect(instance.state).toBe(0);
      });
    });

    describe('blac', () => {
      it('should be the same instance as the global Blac instance', () => {
        const instance = new BlocBaseSimple(0);
        const blac = instance.blac;
        const globalBlac = Blac.getInstance();
        expect(blac).toBe(globalBlac);
      });
    });
  });
});
