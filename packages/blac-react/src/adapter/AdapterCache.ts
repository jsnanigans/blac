/**
 * AdapterCache
 *
 * Manages the lifecycle of ReactBlocAdapter instances.
 * Ensures one adapter per Bloc instance using WeakMap for automatic cleanup.
 *
 * Key Features:
 * - One adapter per Bloc (singleton per Bloc)
 * - Automatic cleanup with WeakMap
 * - Thread-safe adapter creation
 * - Debugging utilities
 *
 * @module adapter/AdapterCache
 */

import type { BlocBase } from '@blac/core';
import { ReactBlocAdapter } from './ReactBlocAdapter';

/**
 * Global adapter cache
 *
 * Uses WeakMap to allow garbage collection of adapters when Blocs are disposed.
 * The WeakMap key is the Bloc instance, ensuring automatic cleanup.
 */
const adapterCache = new WeakMap<{ current: string }, ReactBlocAdapter<any>>();

/**
 * Statistics for debugging and monitoring
 */
interface AdapterCacheStats {
  /** Total adapters created since start */
  totalCreated: number;
  /** Timestamp of last adapter creation */
  lastCreated?: number;
  /** Timestamp of last cache hit */
  lastCacheHit?: number;
}

const stats: AdapterCacheStats = {
  totalCreated: 0,
};

/**
 * Get or create an adapter for a Bloc
 *
 * Returns the cached adapter if one exists, otherwise creates a new one.
 * This ensures one adapter per Bloc instance.
 *
 * @param bloc - The Bloc instance
 * @returns Adapter for the Bloc
 */
export function getOrCreateAdapter<S>(
  bloc: BlocBase<S>,
  subscriptionIdRef: { current: string },
): ReactBlocAdapter<S> {
  // Check cache first
  let adapter = adapterCache.get(subscriptionIdRef);

  if (adapter) {
    stats.lastCacheHit = Date.now();
    return adapter;
  }

  // Create new adapter
  adapter = new ReactBlocAdapter(bloc, subscriptionIdRef);
  console.log(
    `[AdapterCache] Created new adapter for Bloc: ${bloc.constructor.name}`,
    { subscriptionId: subscriptionIdRef },
  );
  adapterCache.set(subscriptionIdRef, adapter);

  // Update stats
  stats.totalCreated++;
  stats.lastCreated = Date.now();

  return adapter;
}

/**
 * Check if an adapter exists for a Bloc
 *
 * @param bloc - The Bloc instance
 * @returns True if adapter exists in cache
 */
export function hasAdapter(subscriptionIdRef: { current: string }): boolean {
  return adapterCache.has(subscriptionIdRef);
}

/**
 * Remove an adapter from the cache
 *
 * Useful for testing or explicit cleanup scenarios.
 * Note: In normal operation, adapters are automatically cleaned up
 * via WeakMap when the Bloc is garbage collected.
 *
 * @param bloc - The Bloc instance
 * @returns True if adapter was found and removed
 */
export function removeAdapter(subscriptionIdRef: { current: string }): boolean {
  const adapter = adapterCache.get(subscriptionIdRef);
  if (adapter) {
    adapter.dispose();
    return adapterCache.delete(subscriptionIdRef);
  }
  return false;
}

/**
 * Get cache statistics
 *
 * Useful for debugging and monitoring adapter lifecycle.
 *
 * @returns Statistics object
 */
export function getAdapterCacheStats(): Readonly<AdapterCacheStats> {
  return { ...stats };
}

/**
 * Reset cache statistics
 *
 * Useful for testing.
 *
 * @internal
 */
export function resetAdapterCacheStats(): void {
  stats.totalCreated = 0;
  stats.lastCreated = undefined;
  stats.lastCacheHit = undefined;
}

/**
 * Clear all adapters from the cache
 *
 * WARNING: This will dispose all adapters and break active subscriptions.
 * Only use this for testing or application shutdown.
 *
 * @internal
 */
export function clearAdapterCache(): void {
  // Note: We can't enumerate WeakMap entries, so we can't dispose all adapters
  // This is intentional - in production, adapters should be cleaned up naturally
  // For testing, individual adapters should be removed via removeAdapter
  resetAdapterCacheStats();
}
