import type { StateContainer } from '../core/StateContainer';

export interface GetterTrackerState {
  trackedValues: Map<string | symbol, unknown>;
  currentlyAccessing: Set<string | symbol>;
  trackedGetters: Set<string | symbol>;
  isTracking: boolean;
  renderCache: Map<string | symbol, unknown>;
  cacheValid: boolean;
  externalDependencies: Set<StateContainer<any>>; // Track external blocs accessed in getters
}

const descriptorCache = new WeakMap<
  Function,
  Map<string | symbol, PropertyDescriptor | undefined>
>();

const blocProxyCache = new WeakMap<StateContainer<any>, any>();

const activeTrackerMap = new WeakMap<StateContainer<any>, GetterTrackerState>();

// Global execution context for tracking getter execution
interface GetterExecutionContext {
  tracker: GetterTrackerState | null;
  currentBloc: StateContainer<any> | null;
  depth: number; // Track nesting depth to detect circular dependencies
  visitedBlocs: Set<StateContainer<any>>; // Track visited blocs in current call stack
}

let getterExecutionContext: GetterExecutionContext = {
  tracker: null,
  currentBloc: null,
  depth: 0,
  visitedBlocs: new Set(),
};

// Maximum allowed getter nesting depth to prevent infinite recursion
const MAX_GETTER_DEPTH = 10;

// Export for use in StateContainer
export function getGetterExecutionContext(): GetterExecutionContext {
  return getterExecutionContext;
}

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

export function isGetter(obj: any, prop: string | symbol): boolean {
  const descriptor = getDescriptor(obj, prop);
  return descriptor?.get !== undefined;
}

export function createGetterTracker(): GetterTrackerState {
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

export function setActiveTracker<TBloc extends StateContainer<any>>(
  bloc: TBloc,
  tracker: GetterTrackerState,
): void {
  activeTrackerMap.set(bloc, tracker);
}

export function clearActiveTracker<TBloc extends StateContainer<any>>(
  bloc: TBloc,
): void {
  activeTrackerMap.delete(bloc);
}

export function getActiveTracker<TBloc extends StateContainer<any>>(
  bloc: TBloc,
): GetterTrackerState | undefined {
  return activeTrackerMap.get(bloc);
}

export function commitTrackedGetters(tracker: GetterTrackerState): void {
  if (tracker.currentlyAccessing.size > 0) {
    tracker.trackedGetters = new Set(tracker.currentlyAccessing);
  }
  tracker.currentlyAccessing.clear();
}

export function createBlocProxy<TBloc extends StateContainer<any>>(
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
            `[BlaC] Maximum getter depth (${MAX_GETTER_DEPTH}) exceeded. ` +
            `Possible circular dependency in getter "${String(prop)}" on ${target.constructor.name}. ` +
            `Returning undefined to prevent stack overflow.`
          );
          return undefined;
        }

        // Check if we're revisiting a bloc in the current call stack (direct circular dependency)
        if (getterExecutionContext.visitedBlocs.has(target)) {
          console.warn(
            `[BlaC] Circular dependency detected: getter "${String(prop)}" on ${target.constructor.name} ` +
            `is calling back into itself. Returning undefined to prevent infinite recursion.`
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

export function hasGetterChanges<TBloc extends StateContainer<any>>(
  bloc: TBloc,
  tracker: GetterTrackerState | null,
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
        `[BlaC] Getter "${String(prop)}" threw error during change detection. Stopping tracking for this getter.`,
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

export function invalidateRenderCache(tracker: GetterTrackerState): void {
  tracker.cacheValid = false;
}

export function clearExternalDependencies(tracker: GetterTrackerState): void {
  tracker.externalDependencies.clear();
}

export function resetGetterTracker(tracker: GetterTrackerState): void {
  tracker.trackedValues.clear();
  tracker.currentlyAccessing.clear();
  tracker.trackedGetters.clear();
  tracker.renderCache.clear();
  tracker.cacheValid = false;
  tracker.isTracking = false;
  tracker.externalDependencies.clear();
}
