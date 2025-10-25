/**
 * BlocRegistry - Simple instance management
 *
 * Constructor-based pattern only - pass the Bloc class, get automatic type inference.
 * No string names, no factories - just clean, type-safe instance management.
 *
 * Responsibilities:
 * - Store and retrieve bloc instances by constructor
 * - Support shared (singleton) and isolated (per-consumer) patterns
 * - Auto-register on first use for maximum convenience
 *
 * NOT responsible for:
 * - Lifecycle management (handled by StateContainer)
 * - Reference counting (handled by subscription system)
 * - Disposal logic (handled by StateContainer)
 */

import type { StateContainer } from '../core/StateContainer';
import {
  type InstanceId,
  instanceId as createInstanceId,
} from '../types/branded';
import type { BlocConstructor } from '../types/utilities';

/**
 * Configuration for a bloc type in the registry
 */
export interface BlocTypeConfig<TBloc extends StateContainer<any, any>> {
  /**
   * Bloc constructor
   */
  constructor: BlocConstructor<TBloc>;

  /**
   * Constructor arguments (default args to use if not provided at get-time)
   */
  constructorArgs?: any[];

  /**
   * If true, each consumer gets its own instance (isolated)
   * If false, all consumers share the same instance (shared/singleton)
   * Default: false (shared)
   */
  isolated: boolean;
}

/**
 * Registry entry for a bloc type
 */
interface RegistryEntry<TBloc extends StateContainer<any, any>> {
  config: BlocTypeConfig<TBloc>;
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
   * Key: Bloc class name (extracted from constructor)
   * Value: Registry entry with config and instances
   */
  private readonly types = new Map<
    string,
    RegistryEntry<StateContainer<unknown>>
  >();

  /**
   * Register a bloc class
   *
   * @param BlocClass - The Bloc constructor
   * @param options - Optional configuration
   *
   * @example
   * ```ts
   * // Simple registration
   * registry.register(CounterBloc);
   *
   * // With constructor args
   * registry.register(UserBloc, {
   *   constructorArgs: [{ apiUrl: 'https://api.example.com' }]
   * });
   *
   * // Override isolation (default comes from static property)
   * registry.register(FormBloc, { isolated: true });
   * ```
   */
  register<TBloc extends StateContainer<any, any>>(
    BlocClass: BlocConstructor<TBloc>,
    options?: {
      constructorArgs?: any[];
      isolated?: boolean;
    },
  ): void {
    const typeName = BlocClass.name;

    if (this.types.has(typeName)) {
      throw new Error(`Bloc type "${typeName}" is already registered`);
    }

    // Check if class has static isolated property
    const classIsolated =
      (BlocClass as { isolated?: boolean }).isolated === true;
    const isolated = options?.isolated ?? classIsolated ?? false;

    this.types.set(typeName, {
      config: {
        constructor: BlocClass,
        constructorArgs: options?.constructorArgs,
        isolated,
      },
      instances: new Map(),
      isolatedInstances: [],
    });
  }

  /**
   * Get or create a bloc instance
   *
   * Auto-registers the bloc if not already registered.
   *
   * @param BlocClass - The Bloc constructor
   * @param options - Optional configuration
   * @returns The bloc instance
   *
   * @example
   * ```ts
   * // Basic usage - auto-registers
   * const counter = registry.get(CounterBloc);
   *
   * // With custom instance ID (for shared blocs)
   * const userProfile = registry.get(UserBloc, {
   *   instanceId: 'user-123'
   * });
   *
   * // With constructor args
   * const form = registry.get(FormBloc, {
   *   constructorArgs: [{ initialData: {...} }]
   * });
   * ```
   */
  get<TBloc extends StateContainer<any, any>>(
    BlocClass: BlocConstructor<TBloc>,
    options?: {
      instanceId?: string;
      constructorArgs?: any[];
    },
  ): TBloc {
    const typeName = BlocClass.name;

    // Auto-register if not already registered
    if (!this.types.has(typeName)) {
      this.register(BlocClass, {
        constructorArgs: options?.constructorArgs,
      });
    }

    // Determine instance ID
    const instanceId = createInstanceId(options?.instanceId || typeName);

    // Get entry
    const entry = this.types.get(typeName)!;
    const isIsolated = entry.config.isolated;

    // For shared blocs, return existing instance if available
    if (!isIsolated) {
      const existing = entry.instances.get(instanceId) as TBloc | undefined;
      if (existing) {
        return existing;
      }
    }

    // Create new instance
    const args = options?.constructorArgs || entry.config.constructorArgs || [];
    const instance = new BlocClass(...args);

    // Store differently based on isolation mode
    if (isIsolated) {
      // Isolated: Add to list for tracking/debugging
      entry.isolatedInstances.push(instance);
    } else {
      // Shared: Store in map by ID
      entry.instances.set(instanceId, instance);
    }

    return instance;
  }

  /**
   * Check if a type is registered
   *
   * @param BlocClass - The bloc constructor
   * @returns True if type is registered
   */
  isRegistered(BlocClass: BlocConstructor<StateContainer<any, any>>): boolean {
    return this.types.has(BlocClass.name);
  }

  /**
   * Check if an instance exists (for testing/debugging)
   *
   * @param BlocClass - The bloc constructor
   * @param id - Instance identifier
   * @returns True if instance exists
   */
  has(BlocClass: BlocConstructor<StateContainer<any, any>>, id: InstanceId): boolean {
    const entry = this.types.get(BlocClass.name);
    return entry ? entry.instances.has(id) : false;
  }

  /**
   * Remove an instance from the registry
   *
   * @param BlocClass - The bloc constructor
   * @param id - Instance identifier
   * @returns True if instance was removed
   */
  remove(BlocClass: BlocConstructor<StateContainer<any, any>>, id: InstanceId): boolean {
    const entry = this.types.get(BlocClass.name);
    return entry ? entry.instances.delete(id) : false;
  }

  /**
   * Get all instances of a type (for debugging)
   *
   * @param BlocClass - The bloc constructor
   * @returns Array of all instances (both shared and isolated)
   */
  getAll<TBloc extends StateContainer<any, any>>(
    BlocClass: BlocConstructor<TBloc>,
  ): TBloc[] {
    const entry = this.types.get(BlocClass.name);
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
   *
   * @param BlocClass - The bloc constructor
   */
  clear(BlocClass: BlocConstructor<StateContainer<any, any>>): void {
    const entry = this.types.get(BlocClass.name);
    if (entry) {
      entry.instances.clear();
      entry.isolatedInstances.length = 0;
    }
  }

  /**
   * Clear all instances from all types
   */
  clearAll(): void {
    for (const entry of this.types.values()) {
      entry.instances.clear();
      entry.isolatedInstances.length = 0;
    }
  }

  /**
   * Unregister a bloc type
   *
   * @param BlocClass - The bloc constructor
   * @returns True if type was unregistered
   */
  unregister(BlocClass: BlocConstructor<StateContainer<any, any>>): boolean {
    const entry = this.types.get(BlocClass.name);
    if (entry) {
      entry.instances.clear();
      entry.isolatedInstances.length = 0;
      return this.types.delete(BlocClass.name);
    }
    return false;
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
