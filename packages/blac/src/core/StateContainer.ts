/**
 * StateContainer - Clean, minimal state management container
 *
 * Responsibilities:
 * - State storage and updates
 * - Change notifications to subscribers
 * - Lifecycle management
 */

import { generateSimpleId } from '../utils/idGenerator';
import {
  StateContainerRegistry,
  globalRegistry,
} from './StateContainerRegistry';

/**
 * Configuration options for StateContainer
 */
export interface StateContainerConfig {
  /** Container name for debugging */
  name?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom instance identifier */
  instanceId?: string;
}

/**
 * Listener function for state changes
 */
type StateListener<S> = (state: S) => void;

/**
 * Base abstract class for all state containers
 */
export abstract class StateContainer<S> {
  /**
   * Exclude this class from DevTools reporting
   * Set to true for internal/DevTools-related Blocs to prevent infinite loops
   */
  static __excludeFromDevTools = false;

  /**
   * Global registry for lifecycle events and instance management
   */
  protected static _registry = globalRegistry;

  /**
   * Get the global registry (mainly for testing)
   */
  static getRegistry(): StateContainerRegistry {
    return StateContainer._registry;
  }

  /**
   * Set a custom registry (mainly for testing)
   *
   * Clears all instances before switching to ensure clean test isolation.
   */
  static setRegistry(registry: StateContainerRegistry): void {
    // Clear all instances from the old registry
    StateContainer._registry.clearAll();
    // Switch to new registry
    StateContainer._registry = registry;
  }

  /**
   * Register a type as isolated or shared
   */
  static register<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    isolated = false,
  ): void {
    StateContainer._registry.register(this, isolated);
  }

  /**
   * Resolve an instance with ref counting (ownership semantics)
   *
   * Delegates to the global registry for instance management.
   *
   * @param instanceKey - Optional instance key for shared instances
   * @param constructorArgs - Constructor arguments
   * @returns Instance with incremented ref count
   */
  static resolve<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
    constructorArgs?: any,
  ): T {
    return StateContainer._registry.resolve(this, instanceKey, constructorArgs);
  }

  /**
   * Get an existing instance without ref counting (borrowing semantics)
   * Delegates to the global registry.
   */
  static get<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
  ): T {
    return StateContainer._registry.get(this, instanceKey);
  }

  /**
   * Safely get an existing instance (borrowing semantics with error handling)
   * Delegates to the global registry.
   */
  static getSafe<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
  ): { error: Error; instance: null } | { error: null; instance: T } {
    return StateContainer._registry.getSafe(this, instanceKey);
  }

  /**
   * Connect to an instance with borrowing semantics (for B2B communication)
   * Gets existing instance OR creates it if it doesn't exist, without incrementing ref count.
   * Tracks cross-bloc dependency for reactive updates.
   *
   * Use this in bloc-to-bloc communication when you need to ensure an instance exists
   * but don't want to claim ownership (no ref count increment).
   *
   * Delegates to the global registry.
   *
   * @param instanceKey - Optional instance key (defaults to 'default')
   * @param constructorArgs - Constructor arguments (only used if creating new instance)
   * @returns The bloc instance
   */
  static connect<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
    constructorArgs?: any,
  ): T {
    return StateContainer._registry.connect(this, instanceKey, constructorArgs);
  }

  /**
   * Release a reference to an instance
   * Delegates to the global registry.
   */
  static release<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
    forceDispose = false,
  ): void {
    StateContainer._registry.release(this, instanceKey, forceDispose);
  }

  /**
   * Get all instances of this type
   * Delegates to the global registry.
   */
  static getAll<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
  ): T[] {
    return StateContainer._registry.getAll(this);
  }

  /**
   * Safely iterate over all instances of this type
   * Delegates to the global registry.
   */
  static forEach<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    callback: (instance: T) => void,
  ): void {
    StateContainer._registry.forEach(this, callback);
  }

  /**
   * Clear all instances of this type
   * Delegates to the global registry.
   */
  static clear<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
  ): void {
    StateContainer._registry.clear(this);
  }

  /**
   * Clear all instances from all types (for testing)
   * Delegates to the global registry.
   */
  static clearAllInstances(): void {
    StateContainer._registry.clearAll();
  }

  /**
   * Get registry statistics (for debugging)
   * Delegates to the global registry.
   */
  static getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  } {
    return StateContainer._registry.getStats();
  }

  /**
   * Get reference count for an instance
   * Delegates to the global registry.
   */
  static getRefCount<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
  ): number {
    return StateContainer._registry.getRefCount(this, instanceKey);
  }

  /**
   * Check if an instance exists
   * Delegates to the global registry.
   */
  static hasInstance<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
  ): boolean {
    return StateContainer._registry.hasInstance(this, instanceKey);
  }

  private _state: S;
  private readonly listeners = new Set<StateListener<S>>();
  private _disposed = false;
  private config: StateContainerConfig = {};

  name: string = this.constructor.name;
  debug: boolean = false;
  instanceId: string = generateSimpleId(this.constructor.name, 'main');
  createdAt: number = Date.now();

  /**
   * Create a new StateContainer
   */
  constructor(initialState: S) {
    this._state = initialState;
  }

  initConfig(config: StateContainerConfig): void {
    this.config = { ...config };
    this.name = this.config.name || this.constructor.name;
    this.debug = this.config.debug ?? false;
    this.instanceId = generateSimpleId(
      this.constructor.name,
      this.config.instanceId,
    );

    // Emit lifecycle event
    StateContainer._registry.emit('created', this);
  }

  /**
   * Get the current state
   */
  get state(): S {
    return this._state;
  }

  /**
   * Check if disposed
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StateListener<S>): () => void {
    if (this._disposed) {
      throw new Error(`Cannot subscribe to disposed container ${this.name}`);
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Dispose the container
   */
  dispose(): void {
    if (this._disposed) return;

    if (this.debug) {
      console.log(`[${this.name}] Disposing...`);
    }

    this._disposed = true;

    // Call optional lifecycle hook
    this.onDispose?.();

    this.listeners.clear();

    // Notify lifecycle listeners
    StateContainer._registry.emit('disposed', this);

    if (this.debug) {
      console.log(`[${this.name}] Disposed successfully`);
    }
  }

  /**
   * Emit a new state (with change detection)
   */
  protected emit(newState: S): void {
    if (this._disposed) {
      throw new Error(`Cannot emit state from disposed container ${this.name}`);
    }

    // Skip if state hasn't changed (reference equality)
    if (this._state === newState) return;

    const previousState = this._state;
    this._state = newState;

    // Call optional lifecycle hook
    this.onStateChange?.(newState, previousState);

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(newState);
      } catch (error) {
        console.error(`[${this.name}] Error in listener:`, error);
      }
    }

    // Capture stack trace for DevTools
    const stackTrace = this.captureStackTrace();

    // Notify lifecycle listeners
    StateContainer._registry.emit(
      'stateChanged',
      this,
      previousState,
      newState,
      stackTrace,
    );
    this.lastUpdateTimestamp = Date.now();
  }

  /**
   * Enable stack trace capture in development
   * Defaults to true, but can be disabled to improve performance
   */
  static enableStackTrace = true;

  /**
   * Capture stack trace for debugging
   * Can be overridden to disable in production
   */
  private captureStackTrace(): string {
    // Only capture if enabled and in development (can be configured)
    if (
      !StateContainer.enableStackTrace ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production')
    ) {
      return '';
    }

    try {
      const error = new Error();
      const stack = error.stack || '';
      const lines = stack.split('\n');

      // Skip Error message and this function's frames
      const relevantLines = lines.slice(1);

      // Filter and format stack trace
      const formattedLines: string[] = [];

      for (const line of relevantLines) {
        if (!line.trim()) continue;

        // Skip internal BlaC framework calls
        if (
          line.includes('StateContainer.emit') ||
          line.includes('StateContainer.update') ||
          line.includes('StateContainer.captureStackTrace') ||
          line.includes('Cubit.patch') ||
          line.includes('Vertex.')
        ) {
          continue;
        }

        // Skip React internals and build tool noise
        if (
          line.includes('node_modules') ||
          line.includes('react-dom') ||
          line.includes('react_jsx') ||
          line.includes('.vite/deps') ||
          line.includes('executeDispatch') ||
          line.includes('runWithFiber') ||
          line.includes('invokeGuarded') ||
          line.includes('callCallback') ||
          line.includes('processDispatchQueue') ||
          line.includes('dispatchEvent') ||
          line.includes('batchedUpdates')
        ) {
          continue;
        }

        // Parse and format the line
        const formatted = this.formatStackLine(line);
        if (formatted) {
          formattedLines.push(formatted);
        }
      }

      return formattedLines.join('\n');
    } catch {
      // Silently fail if stack trace capture fails
      return '';
    }
  }

  /**
   * Format a single stack trace line for better readability
   * Removes URL prefixes, query params, and cleans up the output
   */
  private formatStackLine(line: string): string | null {
    // Chrome format: "    at functionName (http://...file.ts:line:col)"
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (!match) {
      // Try simpler format: "    at http://...file.ts:line:col"
      const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
      if (simpleMatch) {
        const [, url, lineNum, col] = simpleMatch;
        const cleanPath = this.cleanFilePath(url);
        return `  at ${cleanPath}:${lineNum}:${col}`;
      }
      return null;
    }

    const [, functionName, url, lineNum, col] = match;
    const cleanPath = this.cleanFilePath(url);

    return `  at ${functionName} (${cleanPath}:${lineNum}:${col})`;
  }

  /**
   * Clean up file path by removing URL prefixes and query params
   */
  private cleanFilePath(url: string): string {
    // Remove localhost URLs and convert to relative paths
    let path = url
      .replace(/http:\/\/localhost:\d+\/@fs/, '')
      .replace(/http:\/\/localhost:\d+\//, '')
      .replace(/\?t=\d+/, '') // Remove Vite timestamp
      .replace(/\?v=[a-f0-9]+/, ''); // Remove Vite hash

    // Extract just the meaningful part of the path
    // For project files, show relative to project root
    const projectMatch = path.match(/\/Projects\/blac\/(.+)/);
    if (projectMatch) {
      path = projectMatch[1];
    }

    // For absolute paths, show just the last few segments
    const segments = path.split('/');
    if (segments.length > 3) {
      path = segments.slice(-3).join('/');
    }

    return path;
  }
  lastUpdateTimestamp: number = Date.now();

  /**
   * Update state using a function
   */
  protected update(updater: (current: S) => S): void {
    if (this._disposed) {
      throw new Error(
        `Cannot update state from disposed container ${this.name}`,
      );
    }
    this.emit(updater(this._state));
  }

  /**
   * Optional disposal hook for subclasses
   */
  protected onDispose?(): void;

  /**
   * Optional state change hook for subclasses
   */
  protected onStateChange?(newState: S, previousState: S): void;
}
