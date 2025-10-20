/**
 * Tracking Proxy Creation
 *
 * Creates proxies that intercept property access and track dependencies
 * in the Unified Dependency Tracker.
 *
 * These proxies are the bridge between React components and the tracker:
 * - When a component accesses `bloc.state.count`, the state proxy tracks it
 * - When a component accesses `bloc.fullName` (getter), the computed proxy tracks it
 * - All tracking is synchronous and idempotent (React Strict Mode compatible)
 *
 * @module tracking/createTrackingProxy
 */

import { UnifiedDependencyTracker } from './UnifiedDependencyTracker';
import type { BlocBase } from '../BlocBase';
import type { StateDependency, ComputedDependency } from './types';

/**
 * Create a proxy for state tracking
 *
 * Wraps the state object and tracks all property accesses.
 * When a component accesses `state.count`, it automatically calls
 * `tracker.track(subscriptionId, { type: 'state', path: 'count' }, renderId)`
 *
 * Handles nested objects by creating nested proxies with dot-notation paths.
 * Example: `state.user.profile.email` creates path "user.profile.email"
 *
 * @param state - The state object to wrap
 * @param subscriptionId - The subscription tracking these accesses
 * @param basePath - Current path for nested tracking (e.g., "user.profile")
 * @param renderId - Optional render ID for render-specific tracking
 * @returns Proxied state object that tracks all property access
 */
export function createStateTrackingProxy<T extends object>(
  state: T,
  subscriptionId: string,
  basePath = '',
  renderId?: string
): T {
  const tracker = UnifiedDependencyTracker.getInstance();

  return new Proxy(state, {
    get(target, prop, receiver) {
      // Skip symbol and special properties
      if (typeof prop === 'symbol' || prop === '__proto__' || prop === 'constructor') {
        return Reflect.get(target, prop, receiver);
      }

      // Build the full path for nested tracking
      const path = basePath ? `${basePath}.${String(prop)}` : String(prop);

      // Track this dependency with render ID
      const dependency: StateDependency = {
        type: 'state',
        path,
      };
      tracker.track(subscriptionId, dependency, renderId);
      console.log(`[StateProxy] Tracked ${path} for subscription ${subscriptionId}, render: ${renderId}`);

      // Get the actual value
      const value = Reflect.get(target, prop, receiver);

      // If value is an object (but not array), wrap it in a proxy for nested tracking
      // Arrays are treated as leaf values to avoid excessive proxy overhead
      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        return createStateTrackingProxy(value, subscriptionId, path, renderId);
      }

      return value;
    },
  });
}

/**
 * Create a proxy for computed/getter tracking
 *
 * Wraps the Bloc instance and tracks all getter accesses.
 * When a component accesses `bloc.fullName`, it automatically calls
 * `tracker.track(subscriptionId, { type: 'computed', key: 'fullName', compute: () => bloc.fullName }, renderId)`
 *
 * Only tracks actual getters (properties with get descriptors), not methods or fields.
 *
 * @param bloc - The Bloc instance to wrap
 * @param subscriptionId - The subscription tracking these accesses
 * @param renderId - Optional render ID for render-specific tracking
 * @returns Proxied Bloc instance that tracks getter access
 */
export function createComputedTrackingProxy<T extends BlocBase<any>>(
  bloc: T,
  subscriptionId: string,
  renderId?: string
): T {
  const tracker = UnifiedDependencyTracker.getInstance();

  return new Proxy(bloc, {
    get(target, prop, receiver) {
      // Skip symbol, special properties, and known non-getter properties
      if (
        typeof prop === 'symbol' ||
        prop === '__proto__' ||
        prop === 'constructor' ||
        prop === 'state' || // state is handled separately by state proxy
        prop === 'emit' ||
        prop === 'add' ||
        prop === 'on' ||
        prop === '_id' ||
        prop === '_name' ||
        prop === '_state' ||
        (typeof prop === 'string' && prop.startsWith('_')) // Private properties
      ) {
        return Reflect.get(target, prop, receiver);
      }

      // Check if this property is a getter by looking at its descriptor
      // Need to check both the instance and the prototype chain
      let descriptor = Object.getOwnPropertyDescriptor(target, prop);
      if (!descriptor) {
        let proto = Object.getPrototypeOf(target);
        while (proto && !descriptor) {
          descriptor = Object.getOwnPropertyDescriptor(proto, prop);
          proto = Object.getPrototypeOf(proto);
        }
      }

      const isGetter = descriptor && typeof descriptor.get === 'function';

      if (isGetter) {
        // This is a getter - track it as a computed dependency with render ID
        const dependency: ComputedDependency = {
          type: 'computed',
          key: String(prop),
          // Capture the getter execution in a function
          // This allows re-evaluation when checking for changes
          compute: () => Reflect.get(target, prop, receiver),
        };
        tracker.track(subscriptionId, dependency, renderId);
      }

      // Return the actual value (whether it's a getter, method, or field)
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Create a unified proxy that tracks both state and computed dependencies
 *
 * This is the main entry point for creating a fully-tracked Bloc proxy.
 * It only tracks computed dependencies (getters), NOT state properties.
 *
 * Key Design:
 * - Only getters are tracked as computed dependencies
 * - Getters are treated as atomic - we track if their RESULT changed, not their internals
 * - State is returned as-is without tracking (getters access real unproxied state)
 * - This avoids tracking indirect state dependencies accessed inside getters
 *
 * Usage in React:
 * ```typescript
 * const trackedBloc = createUnifiedTrackingProxy(bloc, subscriptionId, renderId);
 * // Accessing trackedBloc.someGetter automatically tracks it
 * // Accessing trackedBloc.state returns raw untracked state
 * ```
 *
 * @param bloc - The Bloc instance to wrap
 * @param subscriptionId - The subscription ID for tracking
 * @param renderId - Optional render ID for render-specific tracking
 * @returns Proxied Bloc that tracks getters but not state
 */
export function createUnifiedTrackingProxy<T extends BlocBase<any>>(
  bloc: T,
  subscriptionId: string,
  renderId?: string
): T {
  // Wrap the bloc for computed (getter) tracking only
  // We do NOT wrap state in a tracking proxy because:
  // 1. Getters should use real unproxied state
  // 2. We only care if a getter's RESULT changed, not what state it accesses
  // 3. This avoids false positives from indirect state dependencies
  return createComputedTrackingProxy(bloc, subscriptionId, renderId);
}
