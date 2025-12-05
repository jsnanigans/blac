import { generateSimpleId } from '../utils/idGenerator';
import type {
  ExtractProps,
  InstanceReadonlyState,
  StateContainerConstructor,
} from '../types/utilities';
import {
  StateContainerRegistry,
  globalRegistry,
} from './StateContainerRegistry';

/**
 * Configuration options for initializing a StateContainer instance
 */
export interface StateContainerConfig {
  /** Display name for the instance (defaults to class name) */
  name?: string;
  /** Enable debug logging for this instance */
  debug?: boolean;
  /** Custom instance identifier */
  instanceId?: string;
}

/**
 * Listener function for state changes
 * @internal
 */
type StateListener<S> = (state: S) => void;

/**
 * System events emitted by StateContainer lifecycle
 */
export type SystemEvent = 'propsUpdated' | 'stateChanged' | 'dispose';

/**
 * Payload types for each system event
 * @template S - State type
 * @template P - Props type
 */
export interface SystemEventPayloads<S, P> {
  /** Emitted when props are updated via updateProps() */
  propsUpdated: { props: P; previousProps: P | undefined };
  /** Emitted when state changes via emit() or update() */
  stateChanged: { state: S; previousState: S };
  /** Emitted when the instance is disposed */
  dispose: void;
}

/**
 * Handler function for system events
 * @internal
 */
type SystemEventHandler<S, P, E extends SystemEvent> = (
  payload: SystemEventPayloads<S, P>[E],
) => void;

/**
 * Abstract base class for all state containers in BlaC.
 * Provides lifecycle management, subscription handling, ref counting,
 * and integration with the global registry.
 *
 * @template S - State type managed by this container
 * @template P - Props type passed to the container (optional)
 *
 * @example
 * ```ts
 * class CounterBloc extends StateContainer<number> {
 *   constructor() {
 *     super(0);
 *   }
 *   increment() {
 *     this.emit(this.state + 1);
 *   }
 * }
 * ```
 */
export abstract class StateContainer<S extends object = object, P = any> {
  /** @internal Flag to exclude this class from DevTools tracking */
  static __excludeFromDevTools = false;

  /** @internal Global registry for all state container instances */
  protected static _registry = globalRegistry;

  /**
   * Get the global StateContainerRegistry
   * @returns The registry managing all state container instances
   */
  static getRegistry(): StateContainerRegistry {
    return StateContainer._registry;
  }

  /**
   * Replace the global registry (clears existing instances)
   * @param registry - The new registry to use
   */
  static setRegistry(registry: StateContainerRegistry): void {
    StateContainer._registry.clearAll();
    StateContainer._registry = registry;
  }

  /**
   * Register this class with the global registry
   * @param isolated - Whether instances should be isolated (component-scoped)
   */
  static register<T extends StateContainerConstructor>(
    this: T,
    isolated = false,
  ): void {
    StateContainer._registry.register(this, isolated);
  }

  /**
   * Resolve an instance with ref counting (ownership semantics).
   * Creates a new instance if one doesn't exist, or returns existing and increments ref count.
   * @template S - Optional state type override for generic StateContainers
   * @template T - The StateContainer type (inferred from class)
   * @param instanceKey - Optional instance key (defaults to 'default')
   * @param options - Resolution options (canCreate, countRef, props, trackExecutionContext)
   * @returns The state container instance
   */
  static resolve<
    T extends StateContainerConstructor = StateContainerConstructor,
  >(
    this: T,
    instanceKey?: string,
    options?: {
      canCreate?: boolean;
      countRef?: boolean;
      props?: ExtractProps<T>;
      trackExecutionContext?: boolean;
    },
  ): InstanceType<T> {
    return StateContainer._registry.resolve(this, instanceKey, options);
  }

  /**
   * Get an existing instance without incrementing ref count (borrowing semantics).
   * @template S - Optional state type override for generic StateContainers
   * @template T - The StateContainer type (inferred from class)
   * @param instanceKey - Optional instance key (defaults to 'default')
   * @returns The state container instance
   * @throws Error if instance doesn't exist
   */
  static get<
    T extends StateContainerConstructor<any> = StateContainerConstructor<any>,
  >(this: T, instanceKey?: string): InstanceType<T> {
    return StateContainer._registry.get(this, instanceKey);
  }

  /**
   * Safely get an existing instance with error handling.
   * @template S - Optional state type override for generic StateContainers
   * @template T - The StateContainer type (inferred from class)
   * @param instanceKey - Optional instance key (defaults to 'default')
   * @returns Discriminated union with either the instance or an error
   */
  static getSafe<
    T extends StateContainerConstructor<any> = StateContainerConstructor<any>,
  >(
    this: T,
    instanceKey?: string,
  ):
    | { error: Error; instance: null }
    | { error: null; instance: InstanceType<T> } {
    return StateContainer._registry.getSafe(this, instanceKey);
  }

  /**
   * Connect to an instance for bloc-to-bloc communication (borrowing semantics).
   * Gets or creates instance without incrementing ref count.
   * Tracks cross-bloc dependency for reactive updates.
   * @template S - Optional state type override for generic StateContainers
   * @template T - The StateContainer type (inferred from class)
   * @param instanceKey - Optional instance key (defaults to 'default')
   * @returns The state container instance
   */
  static connect<
    T extends StateContainerConstructor<any> = StateContainerConstructor<any>,
  >(this: T, instanceKey?: string): InstanceType<T> {
    return StateContainer._registry.connect(this, instanceKey);
  }

  /**
   * Release a reference to an instance.
   * Decrements ref count and disposes when it reaches 0 (unless keepAlive).
   * @param instanceKey - Optional instance key (defaults to 'default')
   * @param forceDispose - Force immediate disposal regardless of ref count
   */
  static release<
    T extends StateContainerConstructor = StateContainerConstructor,
  >(this: T, instanceKey?: string, forceDispose = false): void {
    StateContainer._registry.release(this, instanceKey, forceDispose);
  }

  /**
   * Get all instances of this class
   * @returns Array of all instances
   */
  static getAll<
    T extends StateContainerConstructor = StateContainerConstructor,
  >(this: T): InstanceReadonlyState<T>[] {
    return StateContainer._registry.getAll(this);
  }

  /**
   * Iterate over all instances of this class
   * @param callback - Function to call for each instance
   */
  static forEach<
    T extends StateContainerConstructor = StateContainerConstructor,
  >(this: T, callback: (instance: InstanceReadonlyState<T>) => void): void {
    StateContainer._registry.forEach(this, callback);
  }

  /**
   * Clear all instances of this class (disposes them)
   */
  static clear<T extends StateContainerConstructor = StateContainerConstructor>(
    this: T,
  ): void {
    StateContainer._registry.clear(this);
  }

  /**
   * Clear all instances from all registered types
   */
  static clearAllInstances(): void {
    StateContainer._registry.clearAll();
  }

  /**
   * Get registry statistics for debugging
   * @returns Object with registeredTypes, totalInstances, and typeBreakdown
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
   * @param instanceKey - Optional instance key (defaults to 'default')
   * @returns Current ref count (0 if instance doesn't exist)
   */
  static getRefCount<
    T extends StateContainerConstructor = StateContainerConstructor,
  >(this: T, instanceKey?: string): number {
    return StateContainer._registry.getRefCount(this, instanceKey);
  }

  /**
   * Check if an instance exists
   * @param instanceKey - Optional instance key (defaults to 'default')
   * @returns true if instance exists
   */
  static hasInstance<
    T extends StateContainerConstructor = StateContainerConstructor,
  >(this: T, instanceKey?: string): boolean {
    return StateContainer._registry.hasInstance(this, instanceKey);
  }

  private _state: S;
  private readonly listeners = new Set<StateListener<S>>();
  private _disposed = false;
  private config: StateContainerConfig = {};
  private _props: P | undefined = undefined;
  private readonly systemEventHandlers = new Map<
    SystemEvent,
    Set<SystemEventHandler<S, P, any>>
  >();

  /** Display name for this instance */
  name: string = this.constructor.name;
  /** Whether debug logging is enabled */
  debug: boolean = false;
  /** Unique identifier for this instance */
  instanceId: string = generateSimpleId(this.constructor.name, 'main');
  /** Timestamp when this instance was created */
  createdAt: number = Date.now();

  /** Current props value passed to this container */
  get props(): P | undefined {
    return this._props;
  }

  constructor(initialState: S) {
    this._state = initialState;
  }

  /**
   * Initialize configuration for this instance.
   * Called by the registry after construction.
   * @param config - Configuration options
   */
  initConfig(config: StateContainerConfig): void {
    this.config = { ...config };
    this.name = this.config.name || this.constructor.name;
    this.debug = this.config.debug ?? false;
    this.instanceId = generateSimpleId(
      this.constructor.name,
      this.config.instanceId,
    );

    StateContainer._registry.emit('created', this);
  }

  /** Current state value */
  get state(): Readonly<S> {
    return this._state;
  }

  /** Whether this instance has been disposed */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Subscribe to state changes
   * @param listener - Function called when state changes
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
   * Dispose this instance and clean up resources.
   * Clears all listeners and emits the 'dispose' system event.
   */
  dispose(): void {
    if (this._disposed) return;

    if (this.debug) {
      console.log(`[${this.name}] Disposing...`);
    }

    this._disposed = true;

    this.emitSystemEvent('dispose', undefined as void);

    this.listeners.clear();
    this.systemEventHandlers.clear();

    StateContainer._registry.emit('disposed', this);

    if (this.debug) {
      console.log(`[${this.name}] Disposed successfully`);
    }
  }

  /**
   * Emit a new state value and notify all listeners.
   * @param newState - The new state value
   * @protected
   */
  protected emit(newState: S): void {
    if (this._disposed) {
      throw new Error(`Cannot emit state from disposed container ${this.name}`);
    }

    if (this._state === newState) return;

    const previousState = this._state;
    this._state = newState;

    this.emitSystemEvent('stateChanged', {
      state: newState,
      previousState,
    });

    for (const listener of this.listeners) {
      try {
        listener(newState);
      } catch (error) {
        console.error(`[${this.name}] Error in listener:`, error);
      }
    }

    const stackTrace = this.captureStackTrace();

    StateContainer._registry.emit(
      'stateChanged',
      this,
      previousState,
      newState,
      stackTrace,
    );
    this.lastUpdateTimestamp = Date.now();
  }

  /** Whether to capture stack traces on state changes (disabled in production) */
  static enableStackTrace = true;

  private captureStackTrace(): string {
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
      const relevantLines = lines.slice(1);
      const formattedLines: string[] = [];

      for (const line of relevantLines) {
        if (!line.trim()) continue;

        if (
          line.includes('StateContainer.emit') ||
          line.includes('StateContainer.update') ||
          line.includes('StateContainer.captureStackTrace') ||
          line.includes('Cubit.patch') ||
          line.includes('Vertex.')
        ) {
          continue;
        }

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

        const formatted = this.formatStackLine(line);
        if (formatted) {
          formattedLines.push(formatted);
        }
      }

      return formattedLines.join('\n');
    } catch {
      return '';
    }
  }

  private formatStackLine(line: string): string | null {
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (!match) {
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

  private cleanFilePath(url: string): string {
    let path = url
      .replace(/http:\/\/localhost:\d+\/@fs/, '')
      .replace(/http:\/\/localhost:\d+\//, '')
      .replace(/\?t=\d+/, '')
      .replace(/\?v=[a-f0-9]+/, '');

    const projectMatch = path.match(/\/Projects\/blac\/(.+)/);
    if (projectMatch) {
      path = projectMatch[1];
    }

    const segments = path.split('/');
    if (segments.length > 3) {
      path = segments.slice(-3).join('/');
    }

    return path;
  }

  /** Timestamp of the last state update */
  lastUpdateTimestamp: number = Date.now();

  /**
   * Update state using a transform function.
   * @param updater - Function that receives current state and returns new state
   * @protected
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
   * Subscribe to system lifecycle events.
   * @param event - The event type to listen for
   * @param handler - Handler function called when event occurs
   * @returns Unsubscribe function
   * @protected
   */
  protected onSystemEvent = <E extends SystemEvent>(
    event: E,
    handler: SystemEventHandler<S, P, E>,
  ): (() => void) => {
    let handlers = this.systemEventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.systemEventHandlers.set(event, handlers);
    }
    handlers.add(handler as SystemEventHandler<S, P, any>);

    return () => {
      handlers?.delete(handler as SystemEventHandler<S, P, any>);
    };
  };

  private emitSystemEvent<E extends SystemEvent>(
    event: E,
    payload: SystemEventPayloads<S, P>[E],
  ): void {
    const handlers = this.systemEventHandlers.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[${this.name}] Error in system event handler:`, error);
      }
    }
  }

  /**
   * Update the props for this container.
   * Emits the 'propsUpdated' system event.
   * @param newProps - The new props value
   */
  updateProps(newProps: P): void {
    if (this._disposed) {
      throw new Error(`Cannot update props on disposed container ${this.name}`);
    }

    const previousProps = this._props;
    this._props = newProps;

    this.emitSystemEvent('propsUpdated', {
      props: newProps,
      previousProps,
    });

    if (this.debug) {
      console.log(`[${this.name}] Props updated:`, { newProps, previousProps });
    }
  }
}
