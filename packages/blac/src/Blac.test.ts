import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import { Blac, BlacEvent } from './Blac';
import { Cubit } from './Cubit';

class ExampleBloc extends Cubit<undefined> {}
class ExampleBlocKeepAlive extends Cubit<undefined> {
  static keepAlive = true;
}
class ExampleBlocWithCreate extends Cubit<undefined> {
  static create = () => new ExampleBlocWithCreate(undefined);
}
class ExampleBlocIsolated extends Cubit<undefined> {
  static isolated = true;
}

afterEach(() => {
  Blac.getInstance().resetInstance();
});

describe('Blac', () => {
  describe('singleton', () => {
    it('should return the same instance', () => {
      const blac1 = Blac.getInstance();
      const blac2 = Blac.getInstance();

      expect(blac1).toBe(blac2);
    });

    it('should return the same instance when constructorn is used', () => {
      const blac1 = new Blac();
      const blac2 = new Blac();
      expect(blac1).toBe(blac2);
    });

    test('resetInstance should reset the instance', () => {
      const blac1 = new Blac();
      Blac.getInstance().resetInstance();
      const blac2 = new Blac();

      expect(blac1).not.toBe(blac2);
    });
  });

  describe('createBlocInstanceMapKey', () => {
    it('should return a string with the bloc name and id', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      const key = blac.createBlocInstanceMapKey(bloc.name, bloc.id);
      expect(key).toBe(`${bloc.name}:${bloc.id}`);
    });
  });

  describe('registerBlocInstance', () => {
    it('should add the bloc to the blocInstanceMap', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      const key = blac.createBlocInstanceMapKey(bloc.name, bloc.id);

      blac.registerBlocInstance(bloc);
      expect(blac.blocInstanceMap.get(key)).toBe(bloc);
    });
  });

  describe('unregisterBlocInstance', () => {
    it('should remove the bloc from the blocInstanceMap', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      const key = blac.createBlocInstanceMapKey(bloc.name, bloc.id);
      blac.registerBlocInstance(bloc);
      expect(blac.blocInstanceMap.get(key)).toBe(bloc);

      blac.unregisterBlocInstance(bloc);
      expect(blac.blocInstanceMap.get(key)).toBe(undefined);
      expect(blac.blocInstanceMap.size).toBe(0);
    });
  });

  describe('findRegisteredBlocInstance', () => {
    it('should return the bloc if it is registered', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      blac.registerBlocInstance(bloc);
      const result = blac.findRegisteredBlocInstance(ExampleBloc, bloc.id);
      expect(result).toBe(bloc);
    });

    it('should return undefined if the bloc is not registered', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      blac.registerBlocInstance(bloc);
      const result = blac.findRegisteredBlocInstance(ExampleBloc, 'foo');
      expect(result).toBe(undefined);
    });
  });

  describe('registerIsolatedBlocInstance', () => {
    it('should add the bloc to the isolatedBlocMap', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      blac.registerIsolatedBlocInstance(bloc);
      const blocs = blac.isolatedBlocMap.get(ExampleBloc);
      expect(blocs).toEqual([bloc]);
    });
  });

  describe('unregisterIsolatedBlocInstance', () => {
    it('should remove the bloc from the isolatedBlocMap', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      blac.registerIsolatedBlocInstance(bloc);
      const blocs = blac.isolatedBlocMap.get(ExampleBloc);
      expect(blocs).toEqual([bloc]);

      blac.unregisterIsolatedBlocInstance(bloc);
      expect(blac.isolatedBlocMap.get(ExampleBloc)).toBe(undefined);
    });
  });

  describe('findIsolatedBlocInstance', () => {
    it('should return the bloc if it is registered', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      blac.registerIsolatedBlocInstance(bloc);
      const result = blac.findIsolatedBlocInstance(ExampleBloc, bloc.id);
      expect(result).toBe(bloc);
    });

    it('should return undefined if the bloc is not registered', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      blac.registerIsolatedBlocInstance(bloc);
      const result = blac.findIsolatedBlocInstance(ExampleBloc, 'foo');
      expect(result).toBe(undefined);
    });
  });

  describe('createNewBlocInstance', () => {
    it('should create a new instance of the bloc', () => {
      const blac = new Blac();
      const bloc = blac.createNewBlocInstance(ExampleBloc, 'foo', {});
      expect(bloc).toBeInstanceOf(ExampleBloc);
    });

    it('should set the bloc id', () => {
      const blac = new Blac();
      const bloc = blac.createNewBlocInstance(ExampleBloc, 'foo', {});
      expect(bloc.id).toBe('foo');
    });

    it('should register the bloc', () => {
      const blac = new Blac();
      const bloc = blac.createNewBlocInstance(ExampleBloc, 'foo', {});
      const key = blac.createBlocInstanceMapKey(bloc.name, bloc.id);
      expect(blac.blocInstanceMap.get(key)).toBe(bloc);
    });

    it('should register the bloc as isolated if the bloc is isolated', () => {
      const blac = new Blac();
      const bloc = blac.createNewBlocInstance(ExampleBlocIsolated, 'foo', {});
      const blocs = blac.isolatedBlocMap.get(ExampleBlocIsolated);
      expect(blocs).toEqual([bloc]);
    });

    it('should call the static `create` method on the bloc if its defined', () => {
      const blac = new Blac();
      const spy = vi.spyOn(ExampleBlocWithCreate, 'create');
      blac.createNewBlocInstance(ExampleBlocWithCreate, 'foo', {});
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getBloc', () => {
    it('should call `createNewBlocInstance` if the bloc is not registered', () => {
      const blac = new Blac();
      const spy = vi.spyOn(blac, 'createNewBlocInstance');
      blac.getBloc(ExampleBloc);
      expect(spy).toHaveBeenCalled();
    });

    it('should return the registered bloc if it is registered, and should not create a new one', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      const spy = vi.spyOn(blac, 'createNewBlocInstance');
      blac.registerBlocInstance(bloc);
      const result = blac.getBloc(ExampleBloc);

      expect(spy).not.toHaveBeenCalled();
      expect(result).toBe(bloc);
    });

    it('should return a new instance and call `dispose` on the bloc if the option `reconnect` is true', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      const disposeSpy = vi.spyOn(bloc, 'dispose');
      const createSpy = vi.spyOn(blac, 'createNewBlocInstance');
      blac.registerBlocInstance(bloc);
      const result = blac.getBloc(ExampleBloc, { reconnect: true });

      expect(createSpy).toHaveBeenCalled();
      expect(disposeSpy).toHaveBeenCalled();
      expect(result).not.toBe(ExampleBloc);
    });

    it('should return a new instance if the `id` option does not match the already registered bloc `id`', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      const createSpy = vi.spyOn(blac, 'createNewBlocInstance');
      const registeredBloc = blac.registerBlocInstance(bloc);
      const result = blac.getBloc(ExampleBloc, { id: 'foo' });

      expect(createSpy).toHaveBeenCalled();
      expect(result).not.toBe(registeredBloc);
    });
  });

  describe('getAllBlocs', () => {
    it('should return all the blocs registered', () => {
      const blac = new Blac();
      blac.createNewBlocInstance(ExampleBloc, 'foo1', {});
      blac.createNewBlocInstance(ExampleBloc, 'foo2', {});
      blac.createNewBlocInstance(ExampleBloc, 'foo3', {});
      const result = blac.getAllBlocs(ExampleBloc);
      const resultIdMap = result.map((b) => b.id);
      expect(resultIdMap).toEqual(['foo1', 'foo2', 'foo3']);
    });

    it('should return all isolated instances if the option `searchIsolated` is true', () => {
      const blac = new Blac();
      blac.createNewBlocInstance(ExampleBlocIsolated, 'foo1', {});
      blac.createNewBlocInstance(ExampleBlocIsolated, 'foo2', {});
      blac.createNewBlocInstance(ExampleBlocIsolated, 'foo3', {});
      const result = blac.getAllBlocs(ExampleBlocIsolated, {
        searchIsolated: true,
      });
      const idMap = result.map((b) => b.id);
      expect(idMap).toEqual(['foo1', 'foo2', 'foo3']);
    });
  });

  describe('disposeBloc', () => {
    it('should call `unregisterBlocInstance`', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      const spy = vi.spyOn(blac, 'unregisterBlocInstance');
      blac.disposeBloc(bloc);
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(bloc);
    });

    it('should call `unregisterIsolatedBlocInstance` if the bloc is isolated', () => {
      const blac = new Blac();
      const bloc = new ExampleBlocIsolated(undefined);
      const spy = vi.spyOn(blac, 'unregisterIsolatedBlocInstance');
      blac.disposeBloc(bloc);
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(bloc);
    });
  });

  describe('report', () => {
    it('should call `disposeBloc` if the event `BLOC_DISPOSED` is called', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      const spy = vi.spyOn(blac, 'disposeBloc');
      blac.report(BlacEvent.BLOC_DISPOSED, bloc);
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(bloc);
    });

    it('should call `disposeBloc` if the event `LISTENER_REMOVED` is called and the bloc has no listeners', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      const spy = vi.spyOn(blac, 'disposeBloc');
      blac.report(BlacEvent.LISTENER_REMOVED, bloc);
      expect(spy).toHaveBeenCalled();
    });

    it('should not call `disposeBloc` if the event `LISTENER_REMOVED` is called and the bloc has `keepAlive` set to true', () => {
      const blac = new Blac();
      const bloc = new ExampleBlocKeepAlive(undefined);
      const spy = vi.spyOn(blac, 'disposeBloc');
      blac.report(BlacEvent.LISTENER_REMOVED, bloc);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not call `disposeBloc` if the event `LISTENER_REMOVED` is called and the bloc has listeners', () => {
      const blac = new Blac();
      const bloc = new ExampleBloc(undefined);
      bloc.observer.subscribe(() => {});
      const spy = vi.spyOn(blac, 'disposeBloc');
      blac.report(BlacEvent.LISTENER_REMOVED, bloc);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('addPlugin', () => {
    it('should add the plugin to the pluginList', () => {
      const plugin = {
        name: 'foo',
        onEvent: vi.fn(),
      };
      const blac = new Blac();
      blac.addPlugin(plugin);
      expect(blac.pluginList).toEqual([plugin]);
    });

    it('should not add the plugin to the pluginList if it is already added', () => {
      const plugin = {
        name: 'foo',
        onEvent: vi.fn(),
      };
      const blac = new Blac();
      blac.addPlugin(plugin);
      blac.addPlugin(plugin);
      expect(blac.pluginList).toEqual([plugin]);
    });
  });

  describe('reportToPlugins', () => {
    it('should call `onEvent` on all the plugins', () => {
      const plugin1 = {
        name: 'foo',
        onEvent: vi.fn(),
      };
      const plugin2 = {
        name: 'bar',
        onEvent: vi.fn(),
      };

      const blac = new Blac();
      blac.addPlugin(plugin1);
      blac.addPlugin(plugin2);
      const bloc = new ExampleBloc(undefined);
      blac.reportToPlugins(BlacEvent.BLOC_DISPOSED, bloc);

      expect(plugin1.onEvent).toHaveBeenCalled();
      expect(plugin2.onEvent).toHaveBeenCalled();

      expect(plugin1.onEvent).toHaveBeenCalledWith(
        BlacEvent.BLOC_DISPOSED,
        bloc,
        undefined,
      );
      expect(plugin2.onEvent).toHaveBeenCalledWith(
        BlacEvent.BLOC_DISPOSED,
        bloc,
        undefined,
      );
    });
  });
});
