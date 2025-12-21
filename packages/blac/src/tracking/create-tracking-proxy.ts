import type { StateContainerInstance } from '../types/utilities';
import type { TrackerState } from './dependency-tracker';
import type { GetterTrackerState } from './getter-tracker';
import {
  createTrackerState,
  startTracking,
  createProxy,
  captureTrackedPaths,
  hasChanges,
} from './dependency-tracker';
import {
  createGetterTracker,
  isGetter,
  getDescriptor,
  hasGetterChanges,
  invalidateRenderCache,
  commitTrackedGetters,
} from './getter-tracker';
import { getGetterExecutionContext } from './getter-tracker';
import { BLAC_DEFAULTS, BLAC_ERROR_PREFIX } from '../constants';

/**
 * State for tracking both state property access and getter access.
 */
export interface UnifiedTrackerState {
  stateTracker: TrackerState<any>;
  getterTracker: GetterTrackerState;
  dependencies: Set<StateContainerInstance>;
  isTracking: boolean;
}

/**
 * Create a new unified tracker state.
 */
export function createUnifiedTrackerState(): UnifiedTrackerState {
  return {
    stateTracker: createTrackerState(),
    getterTracker: createGetterTracker(),
    dependencies: new Set(),
    isTracking: false,
  };
}

/**
 * Start tracking on a unified tracker.
 */
export function startUnifiedTracking(tracker: UnifiedTrackerState): void {
  tracker.isTracking = true;
  tracker.dependencies.clear();
  tracker.getterTracker.isTracking = true;
  tracker.getterTracker.externalDependencies.clear();
  startTracking(tracker.stateTracker);
}

/**
 * Stop tracking and collect all dependencies.
 */
export function stopUnifiedTracking(
  tracker: UnifiedTrackerState,
  bloc: StateContainerInstance,
): Set<StateContainerInstance> {
  tracker.isTracking = false;
  tracker.getterTracker.isTracking = false;

  captureTrackedPaths(tracker.stateTracker, bloc.state);
  commitTrackedGetters(tracker.getterTracker);

  const allDeps = new Set(tracker.dependencies);
  for (const dep of tracker.getterTracker.externalDependencies) {
    allDeps.add(dep);
  }

  tracker.getterTracker.externalDependencies.clear();

  return allDeps;
}

/**
 * Check if tracked state or getters have changed.
 */
export function hasUnifiedChanges(
  tracker: UnifiedTrackerState,
  bloc: StateContainerInstance,
): boolean {
  invalidateRenderCache(tracker.getterTracker);

  const stateChanged = hasChanges(tracker.stateTracker, bloc.state);
  const getterChanged = hasGetterChanges(bloc, tracker.getterTracker);

  return stateChanged || getterChanged;
}

const MAX_GETTER_DEPTH = BLAC_DEFAULTS.MAX_GETTER_DEPTH;

/**
 * Create a tracking proxy for a bloc instance.
 * Tracks both state property access and getter access.
 */
export function createTrackingProxy<T extends StateContainerInstance>(
  bloc: T,
  tracker: UnifiedTrackerState,
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

        const stateProxy = createProxy(tracker.stateTracker, rawState);
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
        tracker.getterTracker.currentlyAccessing.add(prop);

        if (tracker.getterTracker.cacheValid && tracker.getterTracker.renderCache.has(prop)) {
          const cachedValue = tracker.getterTracker.renderCache.get(prop);
          tracker.getterTracker.trackedValues.set(prop, cachedValue);
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

        context.tracker = tracker.getterTracker;
        context.currentBloc = target;
        context.depth++;
        context.visitedBlocs.add(target);

        try {
          const descriptor = getDescriptor(target, prop);
          const getterValue = descriptor!.get!.call(target);
          tracker.getterTracker.trackedValues.set(prop, getterValue);
          return getterValue;
        } catch (error) {
          tracker.getterTracker.currentlyAccessing.delete(prop);
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
