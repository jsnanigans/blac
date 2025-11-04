/**
 * StateContainerRegistry - Lightweight coordination layer for StateContainer lifecycle
 *
 * Responsibilities:
 * - Type registration and tracking
 * - Lifecycle event notifications (plugin system)
 * - Global operations (clearAllInstances)
 *
 * NOTE: Instance storage has been moved to each StateContainer subclass.
 * Each class owns and manages its own instances locally for better performance
 * and cleaner architecture.
 */

import type { StateContainer } from './StateContainer';
import type { Vertex } from './Vertex';

interface TypeConfig {
  isolated: boolean;
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
 * Registry for coordinating StateContainer lifecycle
 *
 * NOTE: Instances are now stored locally on each StateContainer subclass.
 * This registry only tracks types and manages lifecycle events.
 */
export class StateContainerRegistry {
  /**
   * Strong Set for tracking all registered types
   * Used for clearAllInstances() and getStats()
   */
  private readonly types = new Set<new (...args: any[]) => StateContainer<any>>();

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

  /**
   * Resolve an instance (delegates to StateContainer.resolve)
   *
   * @deprecated This method exists for backward compatibility.
   * Prefer calling StateContainer.resolve() directly on your Bloc class.
   */
  resolve<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
    key?: string,
    ...args: any[]
  ): T {
    return (constructor as any).resolve(key, ...args);
  }

  /**
   * Release a reference (delegates to StateContainer.release)
   *
   * @deprecated For backward compatibility only.
   */
  release<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
    key?: string,
    forceDispose = false,
  ): void {
    return (constructor as any).release(key, forceDispose);
  }

  /**
   * Check if instance exists (delegates to StateContainer.hasInstance)
   *
   * @deprecated For backward compatibility only.
   */
  hasInstance<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
    key?: string,
  ): boolean {
    return (constructor as any).hasInstance(key);
  }

  /**
   * Get reference count (delegates to StateContainer.getRefCount)
   *
   * @deprecated For backward compatibility only.
   */
  getRefCount<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
    key?: string,
  ): number {
    return (constructor as any).getRefCount(key);
  }

  /**
   * Clear all instances from all types (for testing)
   *
   * Iterates all registered types and calls their clear() method.
   * Also clears type tracking to reset the registry state.
   *
   * IMPORTANT: Must clear instances BEFORE clearing the types Set,
   * otherwise we lose track of which types to clear!
   */
  clearAll(): void {
    // Step 1: Clear instances from each type (while we still have the types list)
    for (const Type of this.types) {
      (Type as any).clear();
    }
    // Step 2: Now clear type tracking (resets registry state for tests)
    this.types.clear();
    this.typeConfigs.clear();
  }

  /**
   * Get registry statistics (for debugging)
   *
   * NOTE: Since instances are now stored locally on each StateContainer subclass,
   * we need to iterate registered types to collect statistics.
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
      const instances = (Type as any).instances as Map<string, any>;
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
