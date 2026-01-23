import { generateSimpleId } from '../utils/idGenerator';
import { globalRegistry } from './StateContainerRegistry';

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
export type SystemEvent = 'stateChanged' | 'dispose';

/**
 * Payload types for each system event
 * @template S - State type
 */
export interface SystemEventPayloads<S> {
  /** Emitted when state changes via emit() or update() */
  stateChanged: { state: S; previousState: S };
  /** Emitted when the instance is disposed */
  dispose: void;
}

/**
 * Handler function for system events
 * @internal
 */
type SystemEventHandler<S, E extends SystemEvent> = (
  payload: SystemEventPayloads<S>[E],
) => void;

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

    globalRegistry.emit(
      'stateChanged',
      this,
      previousState,
      newState,
      stackTrace,
    );
    this.lastUpdateTimestamp = Date.now();
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
