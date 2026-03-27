import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import { Cubit, clearAll } from '@blac/core';
import {
  autoTrackInit,
  manualDepsInit,
  noTrackInit,
  autoTrackSubscribe,
  manualDepsSubscribe,
  noTrackSubscribe,
  autoTrackSnapshot,
  manualDepsSnapshot,
  noTrackSnapshot,
  disableGetterTracking,
  ExternalDepsManager,
  DependencyManager,
} from '../index';

class CounterCubit extends Cubit<{ count: number; name: string }> {
  constructor() {
    super({ count: 0, name: 'test' });
  }

  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }

  setName(name: string) {
    this.emit({ ...this.state, name });
  }
}

describe('@blac/adapter', () => {
  beforeEach(() => {
    clearAll();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('autoTrackInit', () => {
    it('should initialize adapter state with getter state and proxied bloc', () => {
      const bloc = new CounterCubit();
      const state = autoTrackInit(bloc);

      expect(state.dependencyState).toBeNull();
      expect(state.manualDepsCache).toBeNull();
      expect(state.getterState).not.toBeNull();
      expect(state.proxiedBloc).not.toBeNull();
    });

    it('should fall back to no tracking during SSR', () => {
      vi.stubGlobal('window', undefined);

      const bloc = new CounterCubit();
      const state = autoTrackInit(bloc);

      expect(state.dependencyState).toBeNull();
      expect(state.manualDepsCache).toBeNull();
      expect(state.getterState).toBeNull();
      expect(state.proxiedBloc).toBe(bloc);
    });
  });

  describe('manualDepsInit', () => {
    it('should initialize adapter state without getter tracking', () => {
      const bloc = new CounterCubit();
      const state = manualDepsInit(bloc);

      expect(state.dependencyState).toBeNull();
      expect(state.manualDepsCache).toBeNull();
      expect(state.getterState).toBeNull();
      expect(state.proxiedBloc).toBe(bloc);
    });
  });

  describe('noTrackInit', () => {
    it('should initialize adapter state without any tracking', () => {
      const bloc = new CounterCubit();
      const state = noTrackInit(bloc);

      expect(state.dependencyState).toBeNull();
      expect(state.manualDepsCache).toBeNull();
      expect(state.getterState).toBeNull();
      expect(state.proxiedBloc).toBe(bloc);
    });
  });

  describe('noTrackSubscribe', () => {
    it('should call callback on every state change', () => {
      const bloc = new CounterCubit();
      const callback = vi.fn();

      const subscribe = noTrackSubscribe(bloc);
      const unsubscribe = subscribe(callback);

      bloc.increment();
      expect(callback).toHaveBeenCalledTimes(1);

      bloc.increment();
      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe();
      bloc.increment();
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('noTrackSnapshot', () => {
    it('should return the current state', () => {
      const bloc = new CounterCubit();
      const getSnapshot = noTrackSnapshot(bloc);

      expect(getSnapshot()).toEqual({ count: 0, name: 'test' });

      bloc.increment();
      expect(getSnapshot()).toEqual({ count: 1, name: 'test' });
    });
  });

  describe('manualDepsSubscribe', () => {
    it('should only call callback when dependencies change', () => {
      const bloc = new CounterCubit();
      const adapterState = manualDepsInit(bloc);
      const callback = vi.fn();

      const subscribe = manualDepsSubscribe(bloc, adapterState, {
        dependencies: (state) => [state.count],
      });
      const unsubscribe = subscribe(callback);

      bloc.increment();
      expect(callback).toHaveBeenCalledTimes(1);

      bloc.setName('new name');
      expect(callback).toHaveBeenCalledTimes(1);

      bloc.increment();
      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe();
    });
  });

  describe('manualDepsSnapshot', () => {
    it('should cache dependencies and return state', () => {
      const bloc = new CounterCubit();
      const adapterState = manualDepsInit(bloc);

      const getSnapshot = manualDepsSnapshot(bloc, adapterState, {
        dependencies: (state) => [state.count],
      });

      const state = getSnapshot();
      expect(state).toEqual({ count: 0, name: 'test' });
      expect(adapterState.manualDepsCache).toEqual([0]);

      bloc.increment();
      const newState = getSnapshot();
      expect(newState).toEqual({ count: 1, name: 'test' });
      expect(adapterState.manualDepsCache).toEqual([1]);
    });
  });

  describe('autoTrackSubscribe', () => {
    it('should create a subscribe function', () => {
      const bloc = new CounterCubit();
      const adapterState = autoTrackInit(bloc);

      const subscribe = autoTrackSubscribe(bloc, adapterState);
      expect(typeof subscribe).toBe('function');
    });

    it('should return unsubscribe function', () => {
      const bloc = new CounterCubit();
      const adapterState = autoTrackInit(bloc);
      const callback = vi.fn();

      const subscribe = autoTrackSubscribe(bloc, adapterState);
      const unsubscribe = subscribe(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should behave like no tracking during SSR', () => {
      vi.stubGlobal('window', undefined);

      const bloc = new CounterCubit();
      const adapterState = autoTrackInit(bloc);
      const callback = vi.fn();

      const unsubscribe = autoTrackSubscribe(bloc, adapterState)(callback);

      bloc.increment();
      bloc.setName('updated');

      expect(callback).toHaveBeenCalledTimes(2);
      unsubscribe();
    });
  });

  describe('autoTrackSnapshot', () => {
    it('should return proxied state', () => {
      const bloc = new CounterCubit();
      const adapterState = autoTrackInit(bloc);

      const getSnapshot = autoTrackSnapshot(bloc, adapterState);
      const state = getSnapshot();

      expect(state.count).toBe(0);
      expect(state.name).toBe('test');
    });

    it('should return raw state during SSR', () => {
      vi.stubGlobal('window', undefined);

      const bloc = new CounterCubit();
      const adapterState = autoTrackInit(bloc);
      const getSnapshot = autoTrackSnapshot(bloc, adapterState);
      const state = getSnapshot();

      expect(state).toBe(bloc.state);
      expect(adapterState.dependencyState).toBeNull();
    });
  });

  describe('disableGetterTracking', () => {
    it('should disable tracking on getter state', () => {
      const bloc = new CounterCubit();
      const adapterState = autoTrackInit(bloc);

      if (!adapterState.getterState) {
        throw new Error('Expected getterState to be initialized');
      }
      adapterState.getterState.isTracking = true;
      disableGetterTracking(adapterState, bloc);

      expect(adapterState.getterState.isTracking).toBe(false);
    });

    it('should handle null getter state', () => {
      const bloc = new CounterCubit();
      const adapterState = noTrackInit(bloc);

      expect(() => disableGetterTracking(adapterState, bloc)).not.toThrow();
    });
  });

  describe('ExternalDepsManager', () => {
    it('should create instance', () => {
      const manager = new ExternalDepsManager();
      expect(manager).toBeInstanceOf(ExternalDepsManager);
    });

    it('should return false when getter state is null', () => {
      const bloc = new CounterCubit();
      const manager = new ExternalDepsManager();
      const callback = vi.fn();

      const result = manager.updateSubscriptions(null, bloc, callback);
      expect(result).toBe(false);
    });

    it('should cleanup subscriptions', () => {
      const manager = new ExternalDepsManager();
      expect(() => manager.cleanup()).not.toThrow();
    });
  });

  describe('DependencyManager', () => {
    it('should be exported', () => {
      expect(DependencyManager).toBeDefined();
    });

    it('should create instance', () => {
      const manager = new DependencyManager();
      expect(manager).toBeInstanceOf(DependencyManager);
    });
  });

  describe('re-exports from @blac/core', () => {
    it('should export acquire', async () => {
      const { acquire } = await import('../index');
      expect(typeof acquire).toBe('function');
    });

    it('should export release', async () => {
      const { release } = await import('../index');
      expect(typeof release).toBe('function');
    });
  });
});
