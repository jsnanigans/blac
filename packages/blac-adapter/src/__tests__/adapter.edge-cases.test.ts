import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cubit, clearAll } from '@blac/core';
import { createGetterState } from '@blac/core/tracking';
import {
  autoTrackInit,
  manualDepsInit,
  autoTrackSubscribe,
  manualDepsSubscribe,
  autoTrackSnapshot,
  manualDepsSnapshot,
  ExternalDepsManager,
  DependencyManager,
  ManualDepsConfig,
} from '../index';

class SimpleBloc extends Cubit<{ count: number; name: string }> {
  constructor() {
    super({ count: 0, name: 'initial' });
  }
  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }
  setName(name: string) {
    this.emit({ ...this.state, name });
  }
}

beforeEach(() => {
  clearAll();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('@blac/adapter edge cases', () => {
  it('autoTrackSubscribe in SSR: unsubscribing after subscription is safe', () => {
    vi.stubGlobal('window', undefined);

    const bloc = new SimpleBloc();
    const adapterState = autoTrackInit(bloc);
    const subscribe = autoTrackSubscribe(bloc, adapterState);
    const unsubscribe = subscribe(vi.fn());

    expect(() => unsubscribe()).not.toThrow();
  });

  it('manualDepsSubscribe with equal array deps prevents callback', () => {
    const bloc = new SimpleBloc();
    const adapterState = manualDepsInit(bloc);
    const config: ManualDepsConfig<typeof SimpleBloc> = {
      dependencies: (s) => [s.count],
    };
    const callback = vi.fn();

    manualDepsSnapshot(bloc, adapterState, config)();
    const unsubscribe = manualDepsSubscribe(
      bloc,
      adapterState,
      config,
    )(callback);

    bloc.setName('changed');

    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('manualDepsSubscribe with changed deps triggers callback', () => {
    const bloc = new SimpleBloc();
    const adapterState = manualDepsInit(bloc);
    const config: ManualDepsConfig<typeof SimpleBloc> = {
      dependencies: (s) => [s.count],
    };
    const callback = vi.fn();

    manualDepsSnapshot(bloc, adapterState, config)();
    const unsubscribe = manualDepsSubscribe(
      bloc,
      adapterState,
      config,
    )(callback);

    bloc.increment();

    expect(callback).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('autoTrackSnapshot creates DependencyState lazily on first call', () => {
    const bloc = new SimpleBloc();
    const adapterState = autoTrackInit(bloc);

    expect(adapterState.dependencyState).toBeNull();

    autoTrackSnapshot(bloc, adapterState)();

    expect(adapterState.dependencyState).not.toBeNull();
  });

  it('ExternalDepsManager.updateSubscriptions() returns false when bloc has no deps', () => {
    const bloc = new SimpleBloc();
    const manager = new ExternalDepsManager();
    const getterState = createGetterState();

    const result = manager.updateSubscriptions(getterState, bloc, vi.fn());

    expect(result).toBe(false);
    manager.cleanup();
  });

  it('ExternalDepsManager.updateSubscriptions() returns false when getterState is null', () => {
    const bloc = new SimpleBloc();
    const manager = new ExternalDepsManager();

    const result = manager.updateSubscriptions(null, bloc, vi.fn());

    expect(result).toBe(false);
    manager.cleanup();
  });

  it('DependencyManager.add() is idempotent — adding same dep twice subscribes only once', () => {
    const dep = new SimpleBloc();
    const subscribeSpy = vi.spyOn(dep, 'subscribe');
    const manager = new DependencyManager();
    const callback = vi.fn();

    manager.add(dep, callback);
    manager.add(dep, callback);

    expect(subscribeSpy).toHaveBeenCalledOnce();
    expect(manager.getDependencies().size).toBe(1);

    manager.cleanup();
  });
});
