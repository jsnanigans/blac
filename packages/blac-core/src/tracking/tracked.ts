import type { StateContainerInstance } from '../types/utilities';
import {
  createState,
  startTracking,
  stopTracking,
  createTrackingProxy,
  hasChanges,
  type TrackingProxyState,
} from './tracking-proxy';
import { DependencyManager } from './dependency-manager';

/**
 * Result of running a tracked callback.
 */
export interface TrackedResult<T> {
  result: T;
  dependencies: Set<StateContainerInstance>;
}

/**
 * Options for the tracked() function.
 */
export interface TrackedOptions {
  exclude?: StateContainerInstance;
}

/**
 * Run a callback while tracking all bloc dependencies accessed.
 * Returns both the result and the set of discovered dependencies.
 *
 * @example
 * ```ts
 * const { result, dependencies } = tracked(() => {
 *   const user = ensure(UserBloc);
 *   return user.fullName; // getter that may access other blocs
 * });
 * // dependencies contains UserBloc + any blocs accessed in fullName getter
 * ```
 */
export function tracked<T>(
  callback: () => T,
  options?: TrackedOptions,
): TrackedResult<T> {
  const tracker = createState();
  startTracking(tracker);

  let result: T;
  try {
    result = callback();
  } finally {
    stopTracking(tracker, { state: null } as any);
  }

  const dependencies = new Set(tracker.dependencies);

  if (options?.exclude) {
    dependencies.delete(options.exclude);
  }

  return { result, dependencies };
}

/**
 * Context for running tracked callbacks with bloc proxies.
 * Provides methods to create proxies and check for changes.
 */
export class TrackedContext {
  private tracker: TrackingProxyState;
  private proxiedBlocs = new WeakMap<
    StateContainerInstance,
    StateContainerInstance
  >();
  private primaryBlocs = new Set<StateContainerInstance>();

  constructor() {
    this.tracker = createState();
  }

  /**
   * Get a tracking proxy for a bloc instance.
   * The proxy will track state and getter accesses.
   */
  proxy<T extends StateContainerInstance>(bloc: T): T {
    const cached = this.proxiedBlocs.get(bloc);
    if (cached) {
      return cached as T;
    }

    const proxied = createTrackingProxy(bloc, this.tracker);
    this.proxiedBlocs.set(bloc, proxied);
    this.primaryBlocs.add(bloc);
    return proxied;
  }

  /**
   * Start tracking for a new callback execution.
   */
  start(): void {
    startTracking(this.tracker);
  }

  /**
   * Stop tracking and get discovered dependencies.
   * Excludes primary blocs (those explicitly proxied via proxy()).
   */
  stop(): Set<StateContainerInstance> {
    const allDeps = new Set<StateContainerInstance>();

    for (const bloc of this.primaryBlocs) {
      const deps = stopTracking(this.tracker, bloc);
      for (const dep of deps) {
        if (!this.primaryBlocs.has(dep)) {
          allDeps.add(dep);
        }
      }
    }

    return allDeps;
  }

  /**
   * Check if any tracked state or getters have changed.
   */
  changed(): boolean {
    for (const bloc of this.primaryBlocs) {
      if (hasChanges(this.tracker, bloc)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all primary blocs (those explicitly proxied).
   */
  getPrimaryBlocs(): Set<StateContainerInstance> {
    return new Set(this.primaryBlocs);
  }

  /**
   * Reset the context for reuse.
   */
  reset(): void {
    this.tracker = createState();
    this.proxiedBlocs = new WeakMap();
    this.primaryBlocs.clear();
  }
}

/**
 * Create a new tracked context for manual control over tracking.
 */
export function createTrackedContext(): TrackedContext {
  return new TrackedContext();
}

export { DependencyManager };
