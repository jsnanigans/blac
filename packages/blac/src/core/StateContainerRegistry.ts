/**
 * StateContainerRegistry - Centralized instance and lifecycle management
 *
 * Responsibilities:
 * - Instance storage and management (WeakMap per constructor)
 * - Type registration and tracking
 * - Lifecycle event notifications (plugin system)
 * - Global operations (clearAllInstances)
 */

import type { StateContainer, StateContainerConfig } from './StateContainer';
import type { Vertex } from './Vertex';
import { createPluginManager } from '../plugin/PluginManager';

interface TypeConfig {
  isolated: boolean;
}

/**
 * Internal entry for instance storage
 * Each entry tracks an instance and its reference count
 */
export interface InstanceEntry<T = any> {
  instance: T;
  refCount: number;
}

/**
 * Lifecycle events that can be observed
 */
export type LifecycleEvent =
  | 'created'
  | 'stateChanged'
  | 'eventAdded'
  | 'disposed';

/**
 * Listener function types for each lifecycle event
 */
export type LifecycleListener<E extends LifecycleEvent> = E extends 'created'
  ? (container: StateContainer<any>) => void
  : E extends 'stateChanged'
    ? (
        container: StateContainer<any>,
        previousState: any,
        currentState: any,
      ) => void
    : E extends 'eventAdded'
      ? (container: Vertex<any, any>, event: any) => void
      : E extends 'disposed'
        ? (container: StateContainer<any>) => void
        : never;

/**
 * Registry for coordinating StateContainer lifecycle and managing instances
 *
 * Centralizes all instance management using WeakMap to ensure proper isolation.
 */
export class StateContainerRegistry {
  /**
   * Global storage for all instance Maps, keyed by constructor
   *
   * IMPORTANT: JavaScript/TypeScript static properties are inherited by reference,
   * meaning all subclasses would share the same Map. To ensure each subclass has
   * its own instance storage, we use a WeakMap keyed by the constructor function.
   *
   * This approach guarantees:
   * - CounterBloc instances are separate from UserBloc instances
   * - Each class owns and manages its own instances
   * - Automatic garbage collection when classes are no longer referenced
   */
  private readonly instancesByConstructor = new WeakMap<
    Function,
    Map<string, InstanceEntry>
  >();

  /**
   * Strong Set for tracking all registered types
   * Used for clearAllInstances() and getStats()
   */
  private readonly types = new Set<
    new (...args: any[]) => StateContainer<any>
  >();

  /**
   * Type configurations (isolated flag)
   */
  private readonly typeConfigs = new Map<string, TypeConfig>();

  /**
   * Lifecycle event listeners
   */
  private readonly listeners = new Map<LifecycleEvent, Set<Function>>();

  /**
   * Register a type for tracking
   * Called automatically on first instance creation
   */
  registerType<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
  ): void {
    this.types.add(constructor);
  }

  /**
   * Register a type with isolation mode (explicit registration)
   */
  register<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
    isolated = false,
  ): void {
    const className = constructor.name;

    // Check for static isolated property
    if (!isolated && (constructor as any).isolated === true) {
      isolated = true;
    }

    if (this.typeConfigs.has(className)) {
      throw new Error(`Type "${className}" is already registered`);
    }

    this.typeConfigs.set(className, { isolated });
    this.registerType(constructor);
  }

  // ==================== Instance Management ====================

  /**
   * Get the instances Map for a specific class
   * Creates a new Map on first access.
   */
  private ensureInstancesMap<T extends StateContainer<any>>(
    Type: new (...args: any[]) => T,
  ): Map<string, InstanceEntry> {
    let instances = this.instancesByConstructor.get(Type);
    if (!instances) {
      instances = new Map<string, InstanceEntry>();
      this.instancesByConstructor.set(Type, instances);
    }
    return instances;
  }

  /**
   * Get the instances Map for a specific class (public API for stats/debugging)
   */
  getInstancesMap<T extends StateContainer<any>>(
    Type: new (...args: any[]) => T,
  ): Map<string, InstanceEntry> {
    return this.instancesByConstructor.get(Type) || new Map();
  }

  /**
   * Resolve an instance with ref counting (ownership semantics)
   */
  resolve<T extends StateContainer<any>>(
    Type: new (...args: any[]) => T,
    key?: string,
    constructorArgs?: any,
  ): T {
    const instanceKey = key || 'default';

    // Check if this is an isolated type
    const staticIsolated = (Type as any).isolated === true;
    const registryConfig = this.typeConfigs.get(Type.name);
    const isolated = staticIsolated || registryConfig?.isolated === true;

    const config: StateContainerConfig = {
      instanceId: instanceKey,
    };

    // Isolated: always create new instance (not tracked)
    if (isolated) {
      const instance = new Type(constructorArgs) as T;
      instance.initiConfig(config);
      // Register type for lifecycle coordination
      this.registerType(Type);
      return instance;
    }

    // Shared: singleton pattern with ref counting
    const instances = this.ensureInstancesMap(Type);
    const entry = instances.get(instanceKey);

    if (entry) {
      entry.refCount++;
      return entry.instance as T;
    }

    // Create new shared instance
    const instance = new Type(constructorArgs) as T;
    instance.initiConfig(config);
    instances.set(instanceKey, { instance, refCount: 1 });

    // Register type for lifecycle coordination
    this.registerType(Type);

    return instance;
  }

  /**
   * Get an existing instance without ref counting (borrowing semantics)
   * @throws Error if instance doesn't exist
   */
  get<T extends StateContainer<any>>(
    Type: new (...args: any[]) => T,
    key?: string,
  ): T {
    const instanceKey = key || 'default';
    const instances = this.ensureInstancesMap(Type);
    const entry = instances.get(instanceKey);

    if (!entry) {
      throw new Error(
        `${Type.name} instance "${instanceKey}" not found.\n` +
          `Use .resolve() to create and claim ownership, or .getSafe() for conditional access.`,
      );
    }

    return entry.instance as T;
  }

  /**
   * Safely get an existing instance (borrowing semantics with error handling)
   * Returns discriminated union for type-safe conditional access
   */
  getSafe<T extends StateContainer<any>>(
    Type: new (...args: any[]) => T,
    key?: string,
  ): { error: Error; instance: null } | { error: null; instance: T } {
    const instanceKey = key || 'default';
    const instances = this.ensureInstancesMap(Type);
    const entry = instances.get(instanceKey);

    if (!entry) {
      return {
        error: new Error(`${Type.name} instance "${instanceKey}" not found`),
        instance: null,
      };
    }

    return { error: null, instance: entry.instance as T };
  }

  /**
   * Release a reference to an instance
   */
  release<T extends StateContainer<any>>(
    Type: new (...args: any[]) => T,
    key?: string,
    forceDispose = false,
  ): void {
    const instanceKey = key || 'default';
    const instances = this.ensureInstancesMap(Type);
    const entry = instances.get(instanceKey);

    if (!entry) return;

    // Force dispose immediately
    if (forceDispose) {
      if (!entry.instance.isDisposed) {
        entry.instance.dispose();
      }
      instances.delete(instanceKey);
      return;
    }

    // Decrement ref count
    entry.refCount--;

    // Check static keepAlive property
    const keepAlive = (Type as any).keepAlive === true;

    // Auto-dispose when ref count reaches 0 (unless keepAlive)
    if (entry.refCount <= 0 && !keepAlive) {
      if (!entry.instance.isDisposed) {
        entry.instance.dispose();
      }
      instances.delete(instanceKey);
    }
  }

  /**
   * Get all instances of a specific type
   */
  getAll<T extends StateContainer<any>>(Type: new (...args: any[]) => T): T[] {
    const instances = this.ensureInstancesMap(Type);
    const result: T[] = [];
    for (const entry of instances.values()) {
      result.push(entry.instance as T);
    }
    return result;
  }

  /**
   * Safely iterate over all instances of a type
   */
  forEach<T extends StateContainer<any>>(
    Type: new (...args: any[]) => T,
    callback: (instance: T) => void,
  ): void {
    const instances = this.ensureInstancesMap(Type);
    for (const entry of instances.values()) {
      const instance = entry.instance as T;
      if (!instance.isDisposed) {
        try {
          callback(instance);
        } catch (error) {
          console.error(
            `[BlaC] forEach callback error for ${Type.name}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Clear all instances of a specific type
   */
  clear<T extends StateContainer<any>>(Type: new (...args: any[]) => T): void {
    const instances = this.ensureInstancesMap(Type);
    // Dispose all instances
    for (const entry of instances.values()) {
      if (!entry.instance.isDisposed) {
        entry.instance.dispose();
      }
    }
    // Clear the Map
    instances.clear();
  }

  /**
   * Get reference count for an instance
   */
  getRefCount<T extends StateContainer<any>>(
    Type: new (...args: any[]) => T,
    key?: string,
  ): number {
    const instanceKey = key || 'default';
    const instances = this.ensureInstancesMap(Type);
    const entry = instances.get(instanceKey);
    return entry?.refCount ?? 0;
  }

  /**
   * Check if an instance exists
   */
  hasInstance<T extends StateContainer<any>>(
    Type: new (...args: any[]) => T,
    key?: string,
  ): boolean {
    const instanceKey = key || 'default';
    const instances = this.ensureInstancesMap(Type);
    return instances.has(instanceKey);
  }

  /**
   * Clear all instances from all types (for testing)
   *
   * Iterates all registered types and clears their instances.
   * Also clears type tracking to reset the registry state.
   */
  clearAll(): void {
    // Step 1: Clear instances from each type (while we still have the types list)
    for (const Type of this.types) {
      this.clear(Type);
    }
    // Step 2: Now clear type tracking (resets registry state for tests)
    this.types.clear();
    this.typeConfigs.clear();
  }

  /**
   * Get registry statistics (for debugging)
   */
  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  } {
    const typeBreakdown: Record<string, number> = {};
    let totalInstances = 0;

    // Collect stats from each registered type
    for (const Type of this.types) {
      const typeName = Type.name;
      const instances = this.getInstancesMap(Type);
      const count = instances.size;

      typeBreakdown[typeName] = count;
      totalInstances += count;
    }

    return {
      registeredTypes: this.types.size,
      totalInstances,
      typeBreakdown,
    };
  }

  /**
   * Get all registered types (for plugin system)
   */
  getTypes(): Array<new (...args: any[]) => StateContainer<any>> {
    return Array.from(this.types);
  }

  /**
   * Subscribe to lifecycle events
   * @param event - The lifecycle event to listen for
   * @param listener - The listener function to call when the event occurs
   * @returns Unsubscribe function
   */
  on<E extends LifecycleEvent>(
    event: E,
    listener: LifecycleListener<E>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Function);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener as Function);
    };
  }

  /**
   * Emit lifecycle event to all listeners
   * @internal - Called by StateContainer/Vertex lifecycle methods
   */
  emit(event: LifecycleEvent, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) return; // Zero overhead when no listeners

    for (const listener of listeners) {
      try {
        console.log(args);
        listener(...args);
      } catch (error) {
        console.error(`[BlaC] Listener error for '${event}':`, error);
      }
    }
  }
}

/**
 * Global default registry instance
 */
export const globalRegistry = new StateContainerRegistry();

/**
 * Global plugin manager (initialized lazily)
 */
let _globalPluginManager: any = null;

/**
 * Get the global plugin manager
 */
export function getPluginManager(): any {
  if (!_globalPluginManager) {
    _globalPluginManager = createPluginManager(globalRegistry);
  }
  return _globalPluginManager;
}
