import { generateSimpleId } from '../utils/idGenerator';
import {
  StateContainerRegistry,
  globalRegistry,
} from './StateContainerRegistry';

export interface StateContainerConfig {
  name?: string;
  debug?: boolean;
  instanceId?: string;
}

type StateListener<S> = (state: S) => void;

export type SystemEvent = 'propsUpdated' | 'stateChanged' | 'dispose';

export interface SystemEventPayloads<S, P> {
  propsUpdated: { props: P; previousProps: P | undefined };
  stateChanged: { state: S; previousState: S };
  dispose: void;
}

type SystemEventHandler<S, P, E extends SystemEvent> = (
  payload: SystemEventPayloads<S, P>[E],
) => void;

export abstract class StateContainer<S, P = undefined> {
  static __excludeFromDevTools = false;

  protected static _registry = globalRegistry;

  static getRegistry(): StateContainerRegistry {
    return StateContainer._registry;
  }

  static setRegistry(registry: StateContainerRegistry): void {
    StateContainer._registry.clearAll();
    StateContainer._registry = registry;
  }

  static register<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    isolated = false,
  ): void {
    StateContainer._registry.register(this, isolated);
  }

  static resolve<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
    constructorArgs?: any,
  ): T {
    return StateContainer._registry.resolve(this, instanceKey, constructorArgs);
  }

  static get<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
  ): T {
    return StateContainer._registry.get(this, instanceKey);
  }

  static getSafe<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
  ): { error: Error; instance: null } | { error: null; instance: T } {
    return StateContainer._registry.getSafe(this, instanceKey);
  }

  static connect<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
    constructorArgs?: any,
  ): T {
    return StateContainer._registry.connect(this, instanceKey, constructorArgs);
  }

  static release<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
    forceDispose = false,
  ): void {
    StateContainer._registry.release(this, instanceKey, forceDispose);
  }

  static getAll<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
  ): T[] {
    return StateContainer._registry.getAll(this);
  }

  static forEach<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    callback: (instance: T) => void,
  ): void {
    StateContainer._registry.forEach(this, callback);
  }

  static clear<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
  ): void {
    StateContainer._registry.clear(this);
  }

  static clearAllInstances(): void {
    StateContainer._registry.clearAll();
  }

  static getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  } {
    return StateContainer._registry.getStats();
  }

  static getRefCount<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
  ): number {
    return StateContainer._registry.getRefCount(this, instanceKey);
  }

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
  private _props: P | undefined = undefined;
  private readonly systemEventHandlers = new Map<
    SystemEvent,
    Set<SystemEventHandler<S, P, any>>
  >();

  name: string = this.constructor.name;
  debug: boolean = false;
  instanceId: string = generateSimpleId(this.constructor.name, 'main');
  createdAt: number = Date.now();

  get props(): P | undefined {
    return this._props;
  }

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

    StateContainer._registry.emit('created', this);
  }

  get state(): S {
    return this._state;
  }

  get isDisposed(): boolean {
    return this._disposed;
  }

  subscribe(listener: StateListener<S>): () => void {
    if (this._disposed) {
      throw new Error(`Cannot subscribe to disposed container ${this.name}`);
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

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

  lastUpdateTimestamp: number = Date.now();

  protected update(updater: (current: S) => S): void {
    if (this._disposed) {
      throw new Error(
        `Cannot update state from disposed container ${this.name}`,
      );
    }
    this.emit(updater(this._state));
  }

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
