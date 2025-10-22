/**
 * BlocRegistry - Simple instance management for v2 architecture
 *
 * Responsibilities:
 * - Store and retrieve bloc instances by type and ID
 * - Provide factory pattern for type-safe instance creation
 * - Support shared (singleton) and isolated (per-consumer) patterns
 *
 * NOT responsible for:
 * - Lifecycle management (handled by StateContainer)
 * - Reference counting (handled by subscription system)
 * - Disposal logic (handled by StateContainer)
 */

import type { StateContainer } from '../core/StateContainer';

/**
 * Branded type for instance IDs to prevent mixing with other strings
 */
export type InstanceId = string & { readonly __brand: 'InstanceId' };

/**
 * Creates a branded InstanceId from a string
 */
export function createInstanceId(id: string): InstanceId {
  return id as InstanceId;
}

/**
 * Factory function type for creating bloc instances
 */
export type BlocFactory<TState, TBloc extends StateContainer<TState>> = (
  id: InstanceId
) => TBloc;

/**
 * Configuration for a bloc type in the registry
 */
export interface BlocTypeConfig<TState, TBloc extends StateContainer<TState>> {
  /**
   * Factory function to create new instances
   */
  factory: BlocFactory<TState, TBloc>;

  /**
   * If true, each consumer gets its own instance (isolated)
   * If false, all consumers share the same instance (shared/singleton)
   * Default: false (shared)
   */
  isolated?: boolean;
}

/**
 * Registry entry for a bloc type
 */
interface RegistryEntry<TState, TBloc extends StateContainer<TState>> {
  config: BlocTypeConfig<TState, TBloc>;
  /** Map for shared instances (keyed by ID) */
  instances: Map<InstanceId, TBloc>;
  /** Array for isolated instances (not keyed, just tracked) */
  isolatedInstances: TBloc[];
}

/**
 * Simple bloc instance registry
 *
 * Manages instance creation and lookup with clear responsibility boundaries.
 * Does NOT handle lifecycle - that's StateContainer's job.
 */
export class BlocRegistry {
  /**
   * Map of registered bloc types
   * Key: Bloc type name (string)
   * Value: Registry entry with config and instances
   */
  private readonly types = new Map<string, RegistryEntry<unknown, StateContainer<unknown>>>();

  /**
   * Register a bloc type with its factory
   *
   * @param typeName - Unique name for this bloc type
   * @param config - Configuration including factory function
   */
  register<TState, TBloc extends StateContainer<TState>>(
    typeName: string,
    config: BlocTypeConfig<TState, TBloc>
  ): void {
    if (this.types.has(typeName)) {
      throw new Error(`Bloc type "${typeName}" is already registered`);
    }

    this.types.set(typeName, {
      config: config as BlocTypeConfig<unknown, StateContainer<unknown>>,
      instances: new Map(),
      isolatedInstances: [],
    });
  }

  /**
   * Get or create a bloc instance
   *
   * For shared blocs: Returns existing instance or creates new one
   * For isolated blocs: Always creates new instance and adds to isolated list
   *
   * @param typeName - The registered bloc type name
   * @param id - Instance identifier
   * @returns The bloc instance
   * @throws Error if type not registered
   */
  get<TState, TBloc extends StateContainer<TState>>(
    typeName: string,
    id: InstanceId
  ): TBloc {
    const entry = this.types.get(typeName);
    if (!entry) {
      throw new Error(`Bloc type "${typeName}" is not registered`);
    }

    // For shared blocs, return existing instance if available
    if (!entry.config.isolated) {
      const existing = entry.instances.get(id) as TBloc | undefined;
      if (existing) {
        return existing;
      }
    }

    // Create new instance
    const instance = entry.config.factory(id) as TBloc;

    // Store differently based on isolation mode
    if (entry.config.isolated) {
      // Isolated: Add to list for tracking/debugging
      entry.isolatedInstances.push(instance as StateContainer<unknown>);
    } else {
      // Shared: Store in map by ID
      entry.instances.set(id, instance as StateContainer<unknown>);
    }

    return instance;
  }

  /**
   * Check if an instance exists (for testing/debugging)
   *
   * @param typeName - The bloc type name
   * @param id - Instance identifier
   * @returns True if instance exists
   */
  has(typeName: string, id: InstanceId): boolean {
    const entry = this.types.get(typeName);
    return entry ? entry.instances.has(id) : false;
  }

  /**
   * Remove an instance from the registry
   * NOTE: Does NOT dispose the instance - caller is responsible
   *
   * @param typeName - The bloc type name
   * @param id - Instance identifier
   * @returns True if instance was removed
   */
  remove(typeName: string, id: InstanceId): boolean {
    const entry = this.types.get(typeName);
    return entry ? entry.instances.delete(id) : false;
  }

  /**
   * Get all instances of a type (for debugging)
   *
   * @param typeName - The bloc type name
   * @returns Array of all instances (both shared and isolated)
   */
  getAll<TState, TBloc extends StateContainer<TState>>(typeName: string): TBloc[] {
    const entry = this.types.get(typeName);
    if (!entry) {
      return [];
    }

    // Combine shared instances (from map) and isolated instances (from array)
    const sharedInstances = Array.from(entry.instances.values());
    const allInstances = [...sharedInstances, ...entry.isolatedInstances];
    return allInstances as TBloc[];
  }

  /**
   * Clear all instances of a type
   * NOTE: Does NOT dispose instances - caller is responsible
   *
   * @param typeName - The bloc type name
   */
  clear(typeName: string): void {
    const entry = this.types.get(typeName);
    if (entry) {
      entry.instances.clear();
      entry.isolatedInstances.length = 0; // Clear array
    }
  }

  /**
   * Clear all instances from all types
   * NOTE: Does NOT dispose instances - caller is responsible
   */
  clearAll(): void {
    for (const entry of this.types.values()) {
      entry.instances.clear();
      entry.isolatedInstances.length = 0;
    }
  }

  /**
   * Get registry statistics for debugging
   */
  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  } {
    const typeBreakdown: Record<string, number> = {};
    let totalInstances = 0;

    for (const [typeName, entry] of this.types.entries()) {
      // Count both shared and isolated instances
      const count = entry.instances.size + entry.isolatedInstances.length;
      typeBreakdown[typeName] = count;
      totalInstances += count;
    }

    return {
      registeredTypes: this.types.size,
      totalInstances,
      typeBreakdown,
    };
  }
}
