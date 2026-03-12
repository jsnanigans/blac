import { generateSimpleId } from '../utils/idGenerator';
import { BLAC_DEFAULTS } from '../constants';
import { globalRegistry } from './StateContainerRegistry';
import type { StateContainerConstructor } from '../types/utilities';

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

export type HydrationStatus = 'idle' | 'hydrating' | 'hydrated' | 'error';

/**
 * Listener function for state changes
 * @internal
 */
type StateListener<S> = (state: S) => void;

/**
 * System events emitted by StateContainer lifecycle
 */
export type SystemEvent = 'stateChanged' | 'dispose' | 'hydrationChanged';

/**
 * Payload types for each system event
 * @template S - State type
 */
export interface SystemEventPayloads<S> {
  /** Emitted when state changes via emit() or update() */
  stateChanged: { state: S; previousState: S };
  /** Emitted when the instance is disposed */
  dispose: void;
  /** Emitted when hydration status changes */
  hydrationChanged: {
    status: HydrationStatus;
    previousStatus: HydrationStatus;
    error?: Error;
    changedWhileHydrating: boolean;
  };
}

/**
 * Handler function for system events
 * @internal
 */
type SystemEventHandler<S, E extends SystemEvent> = (
  payload: SystemEventPayloads<S>[E],
) => void;

const EMPTY_DEPS: ReadonlyMap<any, any> = new Map();

/**
 * Abstract base class for all state containers in BlaC.
 * Provides lifecycle management, subscription handling, ref counting,
 * and integration with the global registry.
 *
 * @template S - State type managed by this container
 *
 * @example
 * ```ts
 * class CounterBloc extends StateContainer<{ count: number }> {
 *   constructor() {
 *     super({ count: 0 });
 *   }
 *   increment() {
 *     this.emit({ count: this.state.count + 1 });
 *   }
 * }
 * ```
 */
export abstract class StateContainer<S extends object = any> {
  static __excludeFromDevTools = false;
  static enableStackTrace = true;

  private _state: S;
  private readonly listeners = new Set<StateListener<S>>();
  private _disposed = false;
  private _hydrationStatus: HydrationStatus = 'idle';
  private _hydrationError?: Error;
  private _changedWhileHydrating = false;
  private hydrationPromise: Promise<void> | null = null;
  private resolveHydrationPromise?: () => void;
  private rejectHydrationPromise?: (error: Error) => void;
  private hydrationPromiseSettled = false;
  private config: StateContainerConfig = {};
  private readonly systemEventHandlers = new Map<
    SystemEvent,
    Set<SystemEventHandler<S, any>>
  >();

  /** Display name for this instance */
  name: string = this.constructor.name;
  /** Whether debug logging is enabled */
  debug: boolean = false;
  /** Unique identifier for this instance */
  instanceId: string = generateSimpleId(this.constructor.name, 'main');
  /** Timestamp when this instance was created */
  createdAt: number = Date.now();

  private _dependencies: Map<StateContainerConstructor, string> | null = null;

  get dependencies(): ReadonlyMap<StateContainerConstructor, string> {
    return this._dependencies ?? EMPTY_DEPS;
  }

  protected depend<T extends StateContainerConstructor>(
    Type: T,
    instanceKey?: string,
  ): () => InstanceType<T> {
    if (!this._dependencies) {
      this._dependencies = new Map();
    }
    this._dependencies.set(
      Type,
      instanceKey ?? BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
    );
    return () => globalRegistry.ensure(Type, instanceKey);
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

    globalRegistry.emit('created', this);
  }

  /** Current state value */
  get state(): Readonly<S> {
    return this._state;
  }

  /** Whether this instance has been disposed */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /** Current hydration status for this instance */
  get hydrationStatus(): HydrationStatus {
    return this._hydrationStatus;
  }

  /** Error from the latest failed hydration, if any */
  get hydrationError(): Error | undefined {
    return this._hydrationError;
  }

  /** Whether this instance has completed hydration successfully */
  get isHydrated(): boolean {
    return this._hydrationStatus === 'hydrated';
  }

  /** Whether user state changes happened while hydration was pending */
  get changedWhileHydrating(): boolean {
    return this._changedWhileHydrating;
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

    if (this._hydrationStatus === 'hydrating') {
      this.failHydration(
        new Error(`Hydration cancelled because ${this.name} was disposed`),
      );
    }

    this.emitSystemEvent('dispose', undefined as void);

    this.listeners.clear();
    this.systemEventHandlers.clear();

    globalRegistry.emit('disposed', this);

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
    this.applyState(newState, 'default');
  }

  /**
   * Mark this instance as hydrating. Plugins should call this before starting
   * asynchronous rehydration work.
   */
  beginHydration(): void {
    if (this._disposed) {
      throw new Error(
        `Cannot begin hydration for disposed container ${this.name}`,
      );
    }

    this._changedWhileHydrating = false;
    this._hydrationError = undefined;
    this.hydrationPromise = null;
    this.resolveHydrationPromise = undefined;
    this.rejectHydrationPromise = undefined;
    this.hydrationPromiseSettled = false;
    this.ensureHydrationPromise();
    this.setHydrationStatus('hydrating');
  }

  /**
   * Apply hydrated state if no user writes happened since hydration started.
   * Returns false when hydration should be skipped.
   */
  applyHydratedState(newState: S): boolean {
    if (this._disposed) {
      return false;
    }

    if (this._hydrationStatus !== 'hydrating' || this._changedWhileHydrating) {
      return false;
    }

    this.applyState(newState, 'hydration');
    return true;
  }

  /**
   * Mark hydration as completed.
   */
  finishHydration(): void {
    if (this._hydrationStatus !== 'hydrating') {
      if (this._hydrationStatus === 'hydrated') {
        return;
      }
      if (this._hydrationStatus === 'error') {
        this.ensureHydrationPromise();
      }
    }

    this.setHydrationStatus('hydrated');
    this.resolveHydration();
  }

  /**
   * Mark hydration as failed.
   */
  failHydration(error: Error): void {
    const err =
      error instanceof Error ? error : new Error(`Hydration failed: ${error}`);

    this._hydrationError = err;
    this.setHydrationStatus('error', err);
    this.rejectHydration(err);
  }

  /**
   * Wait until the current hydration cycle finishes.
   */
  waitForHydration(): Promise<void> {
    if (this._hydrationStatus === 'idle' || this._hydrationStatus === 'hydrated') {
      return Promise.resolve();
    }

    if (this._hydrationStatus === 'error') {
      return Promise.reject(
        this._hydrationError ??
          new Error(`Hydration failed for container ${this.name}`),
      );
    }

    return this.ensureHydrationPromise();
  }

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
          line.includes('Cubit.patch')
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

  private applyState(newState: S, source: 'default' | 'hydration'): void {
    if (this._disposed) {
      throw new Error(`Cannot emit state from disposed container ${this.name}`);
    }

    if (this._state === newState) return;

    if (this._hydrationStatus === 'hydrating' && source !== 'hydration') {
      this._changedWhileHydrating = true;
    }

    const previousState = this._state;
    this._state = newState;

    this.emitSystemEvent('stateChanged', {
      state: newState,
      previousState,
    });

    const listeners = Array.from(this.listeners);
    for (const listener of listeners) {
      try {
        listener(newState);
      } catch (error) {
        console.error(`[${this.name}] Error in listener:`, error);
      }
    }

    const stackTrace = this.captureStackTrace();

    globalRegistry.emit(
      'stateChanged',
      this,
      previousState,
      newState,
      stackTrace,
    );
    this.lastUpdateTimestamp = Date.now();
  }

  private setHydrationStatus(status: HydrationStatus, error?: Error): void {
    const previousStatus = this._hydrationStatus;
    this._hydrationStatus = status;
    this._hydrationError = error;

    this.emitSystemEvent('hydrationChanged', {
      status,
      previousStatus,
      error,
      changedWhileHydrating: this._changedWhileHydrating,
    });
  }

  private ensureHydrationPromise(): Promise<void> {
    if (!this.hydrationPromise || this.hydrationPromiseSettled) {
      this.hydrationPromiseSettled = false;
      this.hydrationPromise = new Promise<void>((resolve, reject) => {
        this.resolveHydrationPromise = () => {
          if (this.hydrationPromiseSettled) return;
          this.hydrationPromiseSettled = true;
          resolve();
        };
        this.rejectHydrationPromise = (error: Error) => {
          if (this.hydrationPromiseSettled) return;
          this.hydrationPromiseSettled = true;
          reject(error);
        };
      });
      this.hydrationPromise.catch(() => {});
    }

    return this.hydrationPromise;
  }

  private resolveHydration(): void {
    this.resolveHydrationPromise?.();
  }

  private rejectHydration(error: Error): void {
    this.ensureHydrationPromise();
    this.rejectHydrationPromise?.(error);
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
    handler: SystemEventHandler<S, E>,
  ): (() => void) => {
    let handlers = this.systemEventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.systemEventHandlers.set(event, handlers);
    }
    handlers.add(handler as SystemEventHandler<S, any>);

    return () => {
      handlers?.delete(handler as SystemEventHandler<S, any>);
    };
  };

  private emitSystemEvent<E extends SystemEvent>(
    event: E,
    payload: SystemEventPayloads<S>[E],
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
}
