/**
 * DevToolsAPI - Core integration for BlaC DevTools browser extension
 *
 * Provides real-time instance inspection and state monitoring capabilities
 * for development mode debugging.
 */

// Avoid circular dependency - StateContainer imports this module
// We'll use duck typing instead of importing the type

/**
 * Instance data structure for DevTools
 */
export interface InstanceData {
  id: string;
  className: string;
  instanceKey: string;
  state: any;
  refCount: number;
  createdAt: number;
  isDisposed: boolean;
}

/**
 * Event types for DevTools
 */
export type DevToolsEventType =
  | 'instance-created'
  | 'instance-updated'
  | 'instance-disposed';

export interface DevToolsEvent {
  type: DevToolsEventType;
  timestamp: number;
  data: InstanceData;
}

/**
 * Callback type for DevTools subscriptions
 */
export type DevToolsCallback = (event: DevToolsEvent) => void;

/**
 * DevTools API singleton for managing instance tracking and state inspection
 */
export class DevToolsAPI {
  private static instance: DevToolsAPI | null = null;
  private listeners = new Set<DevToolsCallback>();
  private instanceCache = new Map<string, InstanceData>();
  private isEnabled = false;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Only enable in development mode
    this.isEnabled = typeof process !== 'undefined'
      ? process.env.NODE_ENV === 'development'
      : true; // Default to enabled in browser environments for now
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DevToolsAPI {
    if (!DevToolsAPI.instance) {
      DevToolsAPI.instance = new DevToolsAPI();
    }
    return DevToolsAPI.instance;
  }

  /**
   * Subscribe to DevTools events
   */
  subscribe(callback: DevToolsCallback): () => void {
    if (!this.isEnabled) return () => {};

    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get all current instances
   */
  getInstances(): InstanceData[] {
    if (!this.isEnabled) return [];

    // Return cached instances
    // The instances are populated via lifecycle hooks (onInstanceCreated, etc)
    return Array.from(this.instanceCache.values());
  }

  /**
   * Manually scan for all instances (used for initial load)
   * This requires a reference to StateContainer which should be passed in
   */
  scanForInstances(StateContainerClass?: any): void {
    if (!this.isEnabled || !StateContainerClass) return;

    const instances: InstanceData[] = [];

    // Access the global registry to get all registered types
    const registry = (StateContainerClass as any)._registry;
    if (!registry) return;

    // Get all registered types
    const types = registry.types || new Set();

    for (const TypeClass of types) {
      // Get all instances of this type using the static method
      if (typeof TypeClass.getAll === 'function') {
        const typeInstances = TypeClass.getAll();

        for (const instance of typeInstances) {
          const instanceData = this.createInstanceData(instance);
          instances.push(instanceData);
          this.instanceCache.set(instanceData.id, instanceData);
        }
      }
    }
  }

  /**
   * Notify listeners of an event
   */
  private emit(event: DevToolsEvent): void {
    if (!this.isEnabled) return;

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[DevToolsAPI] Listener error:', error);
      }
    });
  }

  /**
   * Track instance creation
   */
  onInstanceCreated(instance: any): void {
    if (!this.isEnabled) return;

    const data = this.createInstanceData(instance);
    this.instanceCache.set(data.id, data);

    this.emit({
      type: 'instance-created',
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Track instance updates
   */
  onInstanceUpdated(instance: any): void {
    if (!this.isEnabled) return;

    const data = this.createInstanceData(instance);
    this.instanceCache.set(data.id, data);

    this.emit({
      type: 'instance-updated',
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Track instance disposal
   */
  onInstanceDisposed(instance: any): void {
    if (!this.isEnabled) return;

    const data = this.createInstanceData(instance);
    data.isDisposed = true;
    this.instanceCache.delete(data.id);

    this.emit({
      type: 'instance-disposed',
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Create instance data from a StateContainer
   */
  private createInstanceData(instance: any): InstanceData {
    const className = instance.constructor.name;
    const TypeClass = instance.constructor as any;

    // Try to determine the instance key
    let instanceKey = 'default';
    let refCount = 0;

    // Check if this is a shared instance by looking at the class's instances Map
    if (TypeClass.instances) {
      for (const [key, entry] of TypeClass.instances) {
        if (entry.instance === instance) {
          instanceKey = key;
          refCount = entry.refCount || 0;
          break;
        }
      }
    }

    return {
      id: instance.instanceId,
      className,
      instanceKey,
      state: this.serializeState(instance.state),
      refCount,
      createdAt: Date.now(), // We'll track this properly later
      isDisposed: instance.isDisposed,
    };
  }

  /**
   * Serialize state for safe transmission
   */
  private serializeState(state: any): any {
    try {
      return this.safeSerialize(state, new WeakSet());
    } catch (error) {
      return {
        __serialization_error: true,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Safe serialization with circular reference handling
   */
  private safeSerialize(obj: any, seen: WeakSet<object>, depth = 0): any {
    // Depth limit to prevent stack overflow
    if (depth > 20) {
      return { __truncated: true, reason: 'Max depth exceeded' };
    }

    // Primitive types
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string') {
      return obj;
    }

    // Functions
    if (typeof obj === 'function') {
      return { __function: true, name: obj.name || 'anonymous' };
    }

    // Symbols
    if (typeof obj === 'symbol') {
      return { __symbol: true, description: obj.description };
    }

    // Check for circular references
    if (typeof obj === 'object') {
      if (seen.has(obj)) {
        return { __circular: true };
      }
      seen.add(obj);
    }

    // Dates
    if (obj instanceof Date) {
      return { __date: true, value: obj.toISOString() };
    }

    // Regular expressions
    if (obj instanceof RegExp) {
      return { __regex: true, source: obj.source, flags: obj.flags };
    }

    // Maps
    if (obj instanceof Map) {
      const entries: Array<[any, any]> = [];
      obj.forEach((value, key) => {
        entries.push([
          this.safeSerialize(key, seen, depth + 1),
          this.safeSerialize(value, seen, depth + 1),
        ]);
      });
      return { __map: true, entries };
    }

    // Sets
    if (obj instanceof Set) {
      const values: any[] = [];
      obj.forEach(value => {
        values.push(this.safeSerialize(value, seen, depth + 1));
      });
      return { __set: true, values };
    }

    // Arrays
    if (Array.isArray(obj)) {
      // Limit array size for performance
      const maxItems = 100;
      const arr = obj.slice(0, maxItems).map(item =>
        this.safeSerialize(item, seen, depth + 1)
      );
      if (obj.length > maxItems) {
        arr.push({ __truncated: true, totalLength: obj.length });
      }
      return arr;
    }

    // Plain objects
    if (obj.constructor === Object || obj.constructor === undefined) {
      const result: Record<string, any> = {};
      const keys = Object.keys(obj);
      const maxKeys = 100;

      for (let i = 0; i < Math.min(keys.length, maxKeys); i++) {
        const key = keys[i];
        result[key] = this.safeSerialize(obj[key], seen, depth + 1);
      }

      if (keys.length > maxKeys) {
        result.__truncated = { totalKeys: keys.length };
      }

      return result;
    }

    // Custom objects - try to serialize as plain object
    try {
      const result: Record<string, any> = {
        __className: obj.constructor.name,
      };

      for (const key of Object.keys(obj)) {
        result[key] = this.safeSerialize(obj[key], seen, depth + 1);
      }

      return result;
    } catch (error) {
      return {
        __serialization_error: true,
        className: obj.constructor?.name || 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get version information
   */
  getVersion(): string {
    return '1.0.0'; // Will be replaced with actual package version
  }

  /**
   * Check if DevTools is enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Enable/disable DevTools (for testing)
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.listeners.clear();
      this.instanceCache.clear();
    }
  }
}

// Export singleton instance
export const devToolsAPI = DevToolsAPI.getInstance();