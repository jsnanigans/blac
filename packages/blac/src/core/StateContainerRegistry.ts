/**
 * StateContainerRegistry - Clean, minimal registry for StateContainer instances
 *
 * Responsibilities:
 * - Instance lifecycle management with ref counting
 * - Singleton/shared instance pattern
 * - Isolated instance support
 * - Lifecycle event notifications (plugin system)
 */

import type { StateContainer } from './StateContainer';
import type { Vertex } from './Vertex';

interface InstanceEntry {
  instance: StateContainer<any>;
  refCount: number;
}

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
 * Registry for managing StateContainer instances
 */
export class StateContainerRegistry {
  private readonly instances = new Map<string, InstanceEntry>();
  private readonly types = new Map<string, TypeConfig>();
  private readonly listeners = new Map<LifecycleEvent, Set<Function>>();

  /**
   * Register a type with isolation mode
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

    if (this.types.has(className)) {
      throw new Error(`Type "${className}" is already registered`);
    }

    this.types.set(className, { isolated });
  }

  /**
   * Get or create a StateContainer instance
   * For isolated: always creates new
   * For shared: singleton per key
   */
  getOrCreate<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
    key?: string,
    ...args: any[]
  ): T {
    const className = constructor.name;
    let config = this.types.get(className);

    // Auto-register if not registered
    if (!config) {
      const isolated = (constructor as any).isolated === true;
      this.types.set(className, { isolated });
      config = this.types.get(className)!;
    }

    // Isolated: always create new instance
    if (config.isolated) {
      return new constructor(...args);
    }

    // Shared: singleton pattern
    const instanceKey = `${className}:${key || 'default'}`;
    const existing = this.instances.get(instanceKey);

    if (existing) {
      existing.refCount++;
      return existing.instance as T;
    }

    // Create new shared instance
    const instance = new constructor(...args);
    this.instances.set(instanceKey, { instance, refCount: 1 });

    return instance;
  }

  /**
   * Release a reference to an instance
   * Disposes when ref count reaches zero (unless static keepAlive is true)
   */
  release<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
    key?: string,
    forceDispose = false,
  ): void {
    const className = constructor.name;
    const instanceKey = `${className}:${key || 'default'}`;
    const entry = this.instances.get(instanceKey);

    if (!entry) return;

    if (forceDispose) {
      entry.instance.dispose();
      this.instances.delete(instanceKey);
      return;
    }

    entry.refCount--;

    // Check static keepAlive property
    const keepAlive = (constructor as any).keepAlive === true;
    if (entry.refCount <= 0 && !keepAlive) {
      entry.instance.dispose();
      this.instances.delete(instanceKey);
    }
  }

  /**
   * Get all instances of a type (shared only, isolated aren't tracked)
   */
  getAll<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
  ): T[] {
    const className = constructor.name;
    const prefix = `${className}:`;
    const results: T[] = [];

    for (const [key, entry] of this.instances) {
      if (key.startsWith(prefix)) {
        results.push(entry.instance as T);
      }
    }

    return results;
  }

  /**
   * Clear all instances of a type
   */
  clear<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
  ): void {
    const className = constructor.name;
    const prefix = `${className}:`;
    const toDelete: string[] = [];

    for (const [key, entry] of this.instances) {
      if (key.startsWith(prefix)) {
        if (!entry.instance.isDisposed) {
          entry.instance.dispose();
        }
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.instances.delete(key);
    }
  }

  /**
   * Clear all instances from all types (for testing)
   */
  clearAll(): void {
    for (const entry of this.instances.values()) {
      if (!entry.instance.isDisposed) {
        entry.instance.dispose();
      }
    }
    this.instances.clear();
    this.types.clear();
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

    for (const key of this.instances.keys()) {
      const typeName = key.split(':')[0];
      typeBreakdown[typeName] = (typeBreakdown[typeName] || 0) + 1;
    }

    return {
      registeredTypes: this.types.size,
      totalInstances: this.instances.size,
      typeBreakdown,
    };
  }

  /**
   * Get reference count for an instance
   */
  getRefCount<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
    key?: string,
  ): number {
    const className = constructor.name;
    const instanceKey = `${className}:${key || 'default'}`;
    const entry = this.instances.get(instanceKey);
    return entry?.refCount ?? 0;
  }

  /**
   * Check if an instance exists
   */
  hasInstance<T extends StateContainer<any>>(
    constructor: new (...args: any[]) => T,
    key?: string,
  ): boolean {
    const className = constructor.name;
    const instanceKey = `${className}:${key || 'default'}`;
    return this.instances.has(instanceKey);
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
