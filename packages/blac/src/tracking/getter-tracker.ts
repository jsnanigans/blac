import { BLAC_DEFAULTS, BLAC_ERROR_PREFIX } from '../constants';
import { StateContainerInstance } from '../types/utilities';

/**
 * @internal
 */
export interface GetterState {
  trackedValues: Map<string | symbol, unknown>;
  currentlyAccessing: Set<string | symbol>;
  trackedGetters: Set<string | symbol>;
  isTracking: boolean;
  renderCache: Map<string | symbol, unknown>;
  cacheValid: boolean;
  externalDependencies: Set<StateContainerInstance>; // Track external blocs accessed in getters
}

const descriptorCache = new WeakMap<
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  Function,
  Map<string | symbol, PropertyDescriptor | undefined>
>();

const blocProxyCache = new WeakMap<StateContainerInstance>();

const activeTrackerMap = new WeakMap<StateContainerInstance, GetterState>();

// Global execution context for tracking getter execution
interface GetterExecutionContext {
  tracker: GetterState | null;
  currentBloc: StateContainerInstance | null;
  depth: number; // Track nesting depth to detect circular dependencies
  visitedBlocs: Set<StateContainerInstance>; // Track visited blocs in current call stack
}

const getterExecutionContext: GetterExecutionContext = {
  tracker: null,
  currentBloc: null,
  depth: 0,
  visitedBlocs: new Set(),
};

// Maximum allowed getter nesting depth to prevent infinite recursion
const MAX_GETTER_DEPTH = BLAC_DEFAULTS.MAX_GETTER_DEPTH;

/**
 * @internal
 */
export function getGetterExecutionContext(): GetterExecutionContext {
  return getterExecutionContext;
}

/**
 * @internal
 */
export function getDescriptor(
  obj: any,
  prop: string | symbol,
): PropertyDescriptor | undefined {
  const constructor = obj.constructor;

  // Try to get from cache
  let constructorCache = descriptorCache.get(constructor);
  if (constructorCache?.has(prop)) {
    return constructorCache.get(prop);
  }

  // Walk prototype chain to find descriptor
  let current = obj;
  let descriptor: PropertyDescriptor | undefined;

  while (current && current !== Object.prototype) {
    descriptor = Object.getOwnPropertyDescriptor(current, prop);
    if (descriptor) {
      break;
    }
    current = Object.getPrototypeOf(current);
  }

  // Cache the result
  if (!constructorCache) {
    constructorCache = new Map();
    descriptorCache.set(constructor, constructorCache);
  }
  constructorCache.set(prop, descriptor);

  return descriptor;
}

/**
 * @internal
 */
export function isGetter(obj: any, prop: string | symbol): boolean {
  const descriptor = getDescriptor(obj, prop);
  return descriptor?.get !== undefined;
}

/**
 * @internal
 */
export function createGetterState(): GetterState {
  return {
    trackedValues: new Map(),
    currentlyAccessing: new Set(),
    trackedGetters: new Set(),
    isTracking: false,
    renderCache: new Map(),
    cacheValid: false,
    externalDependencies: new Set(), // Initialize external dependencies set
  };
}

/**
 * @internal
 */
export function setActiveTracker<TBloc extends StateContainerInstance>(
  bloc: TBloc,
  tracker: GetterState,
): void {
  activeTrackerMap.set(bloc, tracker);
}

/**
 * @internal
 */
export function clearActiveTracker<TBloc extends StateContainerInstance>(
  bloc: TBloc,
): void {
  activeTrackerMap.delete(bloc);
}

/**
 * @internal
 */
export function getActiveTracker<TBloc extends StateContainerInstance>(
  bloc: TBloc,
): GetterState | undefined {
  return activeTrackerMap.get(bloc);
}

/**
 * @internal
 */
export function commitTrackedGetters(tracker: GetterState): void {
  if (tracker.currentlyAccessing.size > 0) {
    tracker.trackedGetters = new Set(tracker.currentlyAccessing);
  }
  tracker.currentlyAccessing.clear();
}

/**
 * @internal
 */
export function createBlocProxy<TBloc extends StateContainerInstance>(
  bloc: TBloc,
): TBloc {
  // Check cache first - return existing proxy if available
  const cached = blocProxyCache.get(bloc);
  if (cached) {
    return cached;
  }

  const proxy = new Proxy(bloc, {
    get(target, prop, receiver) {
      // Get the active tracker for this bloc (set by the framework adapter)
      const tracker = activeTrackerMap.get(target);

      // Only track during render phase (when tracker is active and tracking enabled)
      if (tracker?.isTracking && isGetter(target, prop)) {
        // Record that this getter was accessed during current render
        tracker.currentlyAccessing.add(prop);

        // Use cached value if available from previous change detection
        if (tracker.cacheValid && tracker.renderCache.has(prop)) {
          const cachedValue = tracker.renderCache.get(prop);
          // Also store in trackedValues for consistency
          tracker.trackedValues.set(prop, cachedValue);
          return cachedValue;
        }

        // Check for circular dependencies
        if (getterExecutionContext.depth >= MAX_GETTER_DEPTH) {
          console.warn(
            `${BLAC_ERROR_PREFIX} Maximum getter depth (${MAX_GETTER_DEPTH}) exceeded. ` +
              `Possible circular dependency in getter "${String(prop)}" on ${target.constructor.name}. ` +
              `Returning undefined to prevent stack overflow.`,
          );
          return undefined;
        }

        // Check if we're revisiting a bloc in the current call stack (direct circular dependency)
        if (getterExecutionContext.visitedBlocs.has(target)) {
          console.warn(
            `${BLAC_ERROR_PREFIX} Circular dependency detected: getter "${String(prop)}" on ${target.constructor.name} ` +
              `is calling back into itself. Returning undefined to prevent infinite recursion.`,
          );
          return undefined;
        }

        // Set execution context before calling getter
        const prevContext = {
          tracker: getterExecutionContext.tracker,
          currentBloc: getterExecutionContext.currentBloc,
          depth: getterExecutionContext.depth,
          visitedBlocs: new Set(getterExecutionContext.visitedBlocs), // Copy set
        };

        getterExecutionContext.tracker = tracker;
        getterExecutionContext.currentBloc = target;
        getterExecutionContext.depth++;
        getterExecutionContext.visitedBlocs.add(target);

        try {
          // Compute getter if no cache available (first access or cache invalidated)
          const descriptor = getDescriptor(target, prop);
          const value = descriptor!.get!.call(target);
          tracker.trackedValues.set(prop, value);
          return value;
        } catch (error) {
          // Remove from pending tracking since we failed to get a value
          tracker.currentlyAccessing.delete(prop);
          throw error;
        } finally {
          // Restore previous context
          getterExecutionContext.tracker = prevContext.tracker;
          getterExecutionContext.currentBloc = prevContext.currentBloc;
          getterExecutionContext.depth = prevContext.depth;
          getterExecutionContext.visitedBlocs = prevContext.visitedBlocs;
        }
      }

      // Default behavior for non-getters or when tracking disabled
      return Reflect.get(target, prop, receiver);
    },
  });

  blocProxyCache.set(bloc, proxy);
  return proxy;
}

/**
 * @internal
 */
export function hasGetterChanges<TBloc extends StateContainerInstance>(
  bloc: TBloc,
  tracker: GetterState | null,
): boolean {
  // Early return if no tracker or no getters tracked
  if (!tracker || tracker.trackedGetters.size === 0) {
    return false;
  }

  // Clear previous render cache
  tracker.renderCache.clear();

  let hasAnyChange = false;

  // Compute all getters to populate render cache (no early exit)
  for (const prop of tracker.trackedGetters) {
    try {
      const descriptor = getDescriptor(bloc, prop);
      if (!descriptor?.get) {
        // Getter no longer exists (shouldn't happen, but be defensive)
        continue;
      }

      const newValue = descriptor.get.call(bloc);
      const oldValue = tracker.trackedValues.get(prop);

      // Store in render cache for upcoming render (even if unchanged)
      tracker.renderCache.set(prop, newValue);

      // Update tracked values for next comparison
      tracker.trackedValues.set(prop, newValue);

      // Use Object.is for reference equality comparison
      if (!Object.is(newValue, oldValue)) {
        hasAnyChange = true;
        // Don't return early - continue computing and caching remaining getters
      }
    } catch (error) {
      // Getter threw an error during comparison
      console.warn(
        `${BLAC_ERROR_PREFIX} Getter "${String(prop)}" threw error during change detection. Stopping tracking for this getter.`,
        error,
      );

      // Stop tracking this getter
      tracker.trackedGetters.delete(prop);
      tracker.trackedValues.delete(prop);

      // Treat as "changed" to trigger re-render
      // Still return early on error to avoid cascading failures
      tracker.cacheValid = false; // Invalidate cache due to error
      return true;
    }
  }

  // Mark cache as valid for the upcoming render
  tracker.cacheValid = true;

  return hasAnyChange;
}

/**
 * @internal
 */
export function invalidateRenderCache(tracker: GetterState): void {
  tracker.cacheValid = false;
}

/**
 * @internal
 */
export function clearExternalDependencies(tracker: GetterState): void {
  tracker.externalDependencies.clear();
}

/**
 * @internal
 */
export function resetGetterState(tracker: GetterState): void {
  tracker.trackedValues.clear();
  tracker.currentlyAccessing.clear();
  tracker.trackedGetters.clear();
  tracker.renderCache.clear();
  tracker.cacheValid = false;
  tracker.isTracking = false;
  tracker.externalDependencies.clear();
}
