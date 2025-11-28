/**
 * Framework Adapter
 *
 * Reusable utilities for integrating BlaC with any reactive framework.
 */
import type { StateContainer } from '../core/StateContainer';
import type { TrackerState, GetterTrackerState } from '../tracking';
import type { ExtractState } from '../types/utilities';
import {
  createTrackerState,
  startTracking,
  createProxy,
  captureTrackedPaths,
  hasChanges,
  hasTrackedData,
  shallowEqual,
  createGetterTracker,
  createBlocProxy,
  hasGetterChanges,
  setActiveTracker,
  clearActiveTracker,
  commitTrackedGetters,
  invalidateRenderCache,
  clearExternalDependencies,
} from '../tracking';

export interface AdapterState<TBloc extends StateContainer<any, any>> {
  tracker: TrackerState<ExtractState<TBloc>> | null;
  manualDepsCache: unknown[] | null;
  getterTracker: GetterTrackerState | null;
  proxiedBloc: TBloc | null;
}

export interface ManualDepsConfig<TBloc extends StateContainer<any, any>> {
  dependencies: (state: any, bloc: TBloc) => unknown[];
}

export type SubscriptionCallback = () => void;

export type SubscribeFunction = (callback: SubscriptionCallback) => () => void;

export type SnapshotFunction<TState> = () => TState;

export class ExternalDependencyManager {
  private subscriptions: (() => void)[] = [];
  private previousDeps = new Set<StateContainer<any, any>>();

  private areDependenciesEqual(
    oldDeps: Set<StateContainer<any, any>>,
    newDeps: Set<StateContainer<any, any>>,
  ): boolean {
    if (oldDeps.size !== newDeps.size) return false;

    for (const dep of newDeps) {
      if (!oldDeps.has(dep)) return false;
    }

    return true;
  }

  updateSubscriptions(
    getterTracker: GetterTrackerState | null,
    rawInstance: StateContainer<any, any>,
    onGetterChange: () => void,
  ): boolean {
    if (!getterTracker?.externalDependencies) {
      return false;
    }

    const currentDeps = getterTracker.externalDependencies;

    if (this.areDependenciesEqual(this.previousDeps, currentDeps)) {
      clearExternalDependencies(getterTracker);
      return false;
    }

    this.cleanup();

    for (const externalBloc of currentDeps) {
      if (externalBloc === rawInstance) continue;

      const unsub = externalBloc.subscribe(() => {
        invalidateRenderCache(getterTracker);

        if (hasGetterChanges(rawInstance, getterTracker)) {
          onGetterChange();
        }
      });

      this.subscriptions.push(unsub);
    }

    this.previousDeps = new Set(currentDeps);

    clearExternalDependencies(getterTracker);

    return true;
  }

  cleanup(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
  }
}

export function createAutoTrackSubscribe<
  TBloc extends StateContainer<any, any>,
>(instance: TBloc, adapterState: AdapterState<TBloc>): SubscribeFunction {
  return (callback: SubscriptionCallback) => {
    return instance.subscribe(() => {
      const tracker =
        adapterState.tracker ||
        (adapterState.tracker = createTrackerState<any>());

      const hasStateDeps = tracker.pathCache && tracker.pathCache.size > 0;
      const hasGetterDeps =
        adapterState.getterTracker &&
        adapterState.getterTracker.trackedGetters.size > 0;

      const isPrimitiveState =
        instance.state !== null &&
        typeof instance.state !== 'object' &&
        typeof instance.state !== 'function';

      if (!hasStateDeps && !hasGetterDeps && !isPrimitiveState) {
        return;
      }

      let stateChanged = hasChanges(tracker, instance.state);

      if (!hasStateDeps && hasGetterDeps) {
        stateChanged = false;
      }

      if (stateChanged) {
        callback();
        return;
      }

      const getterChanged = hasGetterChanges(
        instance,
        adapterState.getterTracker,
      );

      if (getterChanged) {
        callback();
      }
    });
  };
}

export function createManualDepsSubscribe<
  TBloc extends StateContainer<any, any>,
>(
  instance: TBloc,
  adapterState: AdapterState<TBloc>,
  config: ManualDepsConfig<TBloc>,
): SubscribeFunction {
  return (callback: SubscriptionCallback) => {
    return instance.subscribe(() => {
      const newDeps = config.dependencies(instance.state, instance);
      if (
        !adapterState.manualDepsCache ||
        !shallowEqual(adapterState.manualDepsCache, newDeps)
      ) {
        adapterState.manualDepsCache = newDeps;
        callback();
      }
    });
  };
}

export function createNoTrackSubscribe<TBloc extends StateContainer<any, any>>(
  instance: TBloc,
): SubscribeFunction {
  return (callback: SubscriptionCallback) => instance.subscribe(callback);
}

export function createAutoTrackSnapshot<TBloc extends StateContainer<any, any>>(
  instance: TBloc,
  adapterState: AdapterState<TBloc>,
): SnapshotFunction<ExtractState<TBloc>> {
  return () => {
    const tracker =
      adapterState.tracker ||
      (adapterState.tracker = createTrackerState<any>());

    if (hasTrackedData(tracker)) {
      captureTrackedPaths(tracker, instance.state);
    }

    if (adapterState.getterTracker) {
      invalidateRenderCache(adapterState.getterTracker);

      commitTrackedGetters(adapterState.getterTracker);

      adapterState.getterTracker.isTracking = true;

      setActiveTracker(instance, adapterState.getterTracker);
    }

    startTracking(tracker);
    return createProxy(tracker, instance.state);
  };
}

export function createManualDepsSnapshot<
  TBloc extends StateContainer<any, any>,
>(
  instance: TBloc,
  adapterState: AdapterState<TBloc>,
  config: ManualDepsConfig<TBloc>,
): SnapshotFunction<ExtractState<TBloc>> {
  return () => {
    adapterState.manualDepsCache = config.dependencies(
      instance.state,
      instance,
    );
    return instance.state;
  };
}

export function createNoTrackSnapshot<TBloc extends StateContainer<any, any>>(
  instance: TBloc,
): SnapshotFunction<ExtractState<TBloc>> {
  return () => instance.state;
}

export function initAutoTrackState<TBloc extends StateContainer<any, any>>(
  instance: TBloc,
): AdapterState<TBloc> {
  return {
    tracker: null,
    manualDepsCache: null,
    getterTracker: createGetterTracker(),
    proxiedBloc: createBlocProxy(instance) as TBloc,
  };
}

export function initManualDepsState<TBloc extends StateContainer<any, any>>(
  instance: TBloc,
): AdapterState<TBloc> {
  return {
    tracker: null,
    manualDepsCache: null,
    getterTracker: null,
    proxiedBloc: instance,
  };
}

export function initNoTrackState<TBloc extends StateContainer<any, any>>(
  instance: TBloc,
): AdapterState<TBloc> {
  return {
    tracker: null,
    manualDepsCache: null,
    getterTracker: null,
    proxiedBloc: instance,
  };
}

export function disableGetterTracking<TBloc extends StateContainer<any, any>>(
  adapterState: AdapterState<TBloc>,
  rawInstance: TBloc,
): void {
  if (adapterState.getterTracker) {
    adapterState.getterTracker.isTracking = false;
    clearActiveTracker(rawInstance);
  }
}
