import type { StateContainerInstance } from '../types/utilities';
import type { DependencyState } from './dependency-tracker';
import type { GetterState } from './getter-tracker';
import {
  createDependencyState,
  startDependency,
  createDependencyProxy,
  capturePaths,
  hasDependencyChanges,
} from './dependency-tracker';
import {
  createGetterState,
  isGetter,
  getDescriptor,
  hasGetterChanges,
  invalidateRenderCache,
  commitTrackedGetters,
  getGetterExecutionContext,
} from './getter-tracker';
import { BLAC_DEFAULTS, BLAC_ERROR_PREFIX } from '../constants';

/**
 * State for tracking both state property access and getter access.
 */
export interface TrackingProxyState {
  dependencyState: DependencyState<any>;
  getterState: GetterState;
  dependencies: Set<StateContainerInstance>;
  isTracking: boolean;
}

/**
 * Create a new tracking proxy state.
 */
export function createState(): TrackingProxyState {
  return {
    dependencyState: createDependencyState(),
    getterState: createGetterState(),
    dependencies: new Set(),
    isTracking: false,
  };
}

/**
 * Start tracking on a tracking proxy.
 */
export function startTracking(tracker: TrackingProxyState): void {
  tracker.isTracking = true;
  tracker.dependencies.clear();
  tracker.getterState.isTracking = true;
  tracker.getterState.externalDependencies.clear();
  startDependency(tracker.dependencyState);
}

/**
 * Stop tracking and collect all dependencies.
 */
export function stopTracking(
  tracker: TrackingProxyState,
  bloc: StateContainerInstance,
): Set<StateContainerInstance> {
  tracker.isTracking = false;
  tracker.getterState.isTracking = false;

  capturePaths(tracker.dependencyState, bloc.state);
  commitTrackedGetters(tracker.getterState);

  const allDeps = new Set(tracker.dependencies);
  for (const dep of tracker.getterState.externalDependencies) {
    allDeps.add(dep);
  }

  tracker.getterState.externalDependencies.clear();

  return allDeps;
}

/**
 * Check if tracked state or getters have changed.
 */
export function hasChanges(
  tracker: TrackingProxyState,
  bloc: StateContainerInstance,
): boolean {
  invalidateRenderCache(tracker.getterState);

  const stateChanged = hasDependencyChanges(
    tracker.dependencyState,
    bloc.state,
  );
  const getterChanged = hasGetterChanges(bloc, tracker.getterState);

  return stateChanged || getterChanged;
}

const MAX_GETTER_DEPTH = BLAC_DEFAULTS.MAX_GETTER_DEPTH;

/**
 * Create a tracking proxy for a bloc instance.
 * Tracks both state property access and getter access.
 */
export function createTrackingProxy<T extends StateContainerInstance>(
  bloc: T,
  tracker: TrackingProxyState,
): T {
  tracker.dependencies.add(bloc);

  const stateProxyCache = new WeakMap<object, any>();

  const proxy = new Proxy(bloc, {
    get(target, prop, receiver) {
      if (prop === 'state') {
        if (!tracker.isTracking) {
          return target.state;
        }

        const rawState = target.state;
        if (rawState === null || typeof rawState !== 'object') {
          return rawState;
        }

        if (stateProxyCache.has(rawState)) {
          return stateProxyCache.get(rawState);
        }

        const stateProxy = createDependencyProxy(
          tracker.dependencyState,
          rawState,
        );
        stateProxyCache.set(rawState, stateProxy);
        return stateProxy;
      }

      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }

      const value = Reflect.get(target, prop, receiver);

      if (typeof value === 'function') {
        return value.bind(target);
      }

      if (tracker.isTracking && isGetter(target, prop)) {
        tracker.getterState.currentlyAccessing.add(prop);

        if (
          tracker.getterState.cacheValid &&
          tracker.getterState.renderCache.has(prop)
        ) {
          const cachedValue = tracker.getterState.renderCache.get(prop);
          tracker.getterState.trackedValues.set(prop, cachedValue);
          return cachedValue;
        }

        const context = getGetterExecutionContext();
        if (context.depth >= MAX_GETTER_DEPTH) {
          console.warn(
            `${BLAC_ERROR_PREFIX} Maximum getter depth (${MAX_GETTER_DEPTH}) exceeded. ` +
              `Possible circular dependency in getter "${String(prop)}" on ${target.constructor.name}.`,
          );
          return undefined;
        }

        if (context.visitedBlocs.has(target)) {
          console.warn(
            `${BLAC_ERROR_PREFIX} Circular dependency detected: getter "${String(prop)}" on ${target.constructor.name}.`,
          );
          return undefined;
        }

        const prevContext = {
          tracker: context.tracker,
          currentBloc: context.currentBloc,
          depth: context.depth,
          visitedBlocs: new Set(context.visitedBlocs),
        };

        context.tracker = tracker.getterState;
        context.currentBloc = target;
        context.depth++;
        context.visitedBlocs.add(target);

        try {
          const descriptor = getDescriptor(target, prop);
          const getterValue = descriptor!.get!.call(target);
          tracker.getterState.trackedValues.set(prop, getterValue);
          return getterValue;
        } catch (error) {
          tracker.getterState.currentlyAccessing.delete(prop);
          throw error;
        } finally {
          context.tracker = prevContext.tracker;
          context.currentBloc = prevContext.currentBloc;
          context.depth = prevContext.depth;
          context.visitedBlocs = prevContext.visitedBlocs;
        }
      }

      return value;
    },
  });

  return proxy as T;
}
