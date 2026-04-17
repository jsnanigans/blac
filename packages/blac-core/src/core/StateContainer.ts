import { generateSimpleId } from '../utils/idGenerator';
import { BLAC_DEFAULTS } from '../constants';
import { getRegistry } from '../registry/config';
import type { StateContainerConstructor } from '../types/utilities';
import { EMIT } from './symbols';

export interface StateContainerConfig {
  name?: string;
  debug?: boolean;
  instanceId?: string;
}

export type HydrationStatus = 'idle' | 'hydrating' | 'hydrated' | 'error';

type StateListener<S> = (state: S) => void;

export type SystemEvent = 'stateChanged' | 'dispose' | 'hydrationChanged';

export interface SystemEventPayloads<S> {
  stateChanged: { state: S; previousState: S };
  dispose: void;
  hydrationChanged: {
    status: HydrationStatus;
    previousStatus: HydrationStatus;
    error?: Error;
    changedWhileHydrating: boolean;
  };
}

type SystemEventHandler<S, E extends SystemEvent> = (
  payload: SystemEventPayloads<S>[E],
) => void;

const EMPTY_DEPS: ReadonlyMap<any, any> = new Map();

export abstract class StateContainer<S extends object = any> {
  static __excludeFromDevTools = false;

  private _state: S;
  private readonly _listeners = new Set<StateListener<S>>();
  private _disposed = false;
  private _hydrationStatus: HydrationStatus = 'idle';
  private _hydrationError?: Error;
  private _changedWhileHydrating = false;
  private _hydrationPromise: Promise<void> | null = null;
  private _resolveHydrationPromise?: () => void;
  private _rejectHydrationPromise?: (error: Error) => void;
  private _hydrationPromiseSettled = false;
  private _config: StateContainerConfig = {};
  private readonly _systemEventHandlers = new Map<
    SystemEvent,
    Set<SystemEventHandler<S, any>>
  >();
  private _dependencies: Map<StateContainerConstructor, string> | null = null;
  private _hasStateChangeHandlers = false;
  private _registry = getRegistry();

  name: string = this.constructor.name;
  debug: boolean = false;
  instanceId: string = generateSimpleId(this.constructor.name, 'main');
  createdAt: number = Date.now();

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
    return () => this._registry.ensure(Type, instanceKey);
  }

  constructor(initialState: S) {
    this._state = initialState;
  }

  initConfig(config: StateContainerConfig): void {
    this._config = { ...config };
    this.name = this._config.name || this.constructor.name;
    this.debug = this._config.debug ?? false;
    this.instanceId = generateSimpleId(
      this.constructor.name,
      this._config.instanceId,
    );
    this._registry.emit('created', this);
  }

  get state(): Readonly<S> {
    return this._state;
  }

  get isDisposed(): boolean {
    return this._disposed;
  }

  get hydrationStatus(): HydrationStatus {
    return this._hydrationStatus;
  }

  get hydrationError(): Error | undefined {
    return this._hydrationError;
  }

  get isHydrated(): boolean {
    return this._hydrationStatus === 'hydrated';
  }

  get changedWhileHydrating(): boolean {
    return this._changedWhileHydrating;
  }

  subscribe(listener: StateListener<S>): () => void {
    if (this._disposed) {
      throw new Error(`Cannot subscribe to disposed container ${this.name}`);
    }
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

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

    this._listeners.clear();
    this._systemEventHandlers.clear();

    this._registry.emit('disposed', this);

    if (this.debug) {
      console.log(`[${this.name}] Disposed successfully`);
    }
  }

  protected [EMIT](newState: S): void {
    this.applyState(newState, 'default');
  }

  protected emit(newState: S): void {
    this[EMIT](newState);
  }

  beginHydration(): void {
    if (this._disposed) {
      throw new Error(
        `Cannot begin hydration for disposed container ${this.name}`,
      );
    }

    this._changedWhileHydrating = false;
    this._hydrationError = undefined;
    this._hydrationPromise = null;
    this._resolveHydrationPromise = undefined;
    this._rejectHydrationPromise = undefined;
    this._hydrationPromiseSettled = false;
    void this.ensureHydrationPromise();
    this.setHydrationStatus('hydrating');
  }

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

  finishHydration(): void {
    if (this._hydrationStatus !== 'hydrating') {
      if (this._hydrationStatus === 'hydrated') {
        return;
      }
      if (this._hydrationStatus === 'error') {
        void this.ensureHydrationPromise();
      }
    }

    this.setHydrationStatus('hydrated');
    this.resolveHydration();
  }

  failHydration(error: Error): void {
    const err =
      error instanceof Error
        ? error
        : new Error(`Hydration failed: ${String(error)}`);

    this._hydrationError = err;
    this.setHydrationStatus('error', err);
    this.rejectHydration(err);
  }

  waitForHydration(): Promise<void> {
    if (
      this._hydrationStatus === 'idle' ||
      this._hydrationStatus === 'hydrated'
    ) {
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

  private applyState(newState: S, source: 'default' | 'hydration'): void {
    if (this._disposed) {
      throw new Error(`Cannot emit state from disposed container ${this.name}`);
    }

    if (this._state === newState) return;

    const previousState = this._state;
    this._state = newState;

    if (
      this._listeners.size === 0 &&
      !this._hasStateChangeHandlers &&
      this._hydrationStatus !== 'hydrating'
    ) {
      if (this._registry.hasStateChangedListeners) {
        this._registry.notifyStateChanged(this, previousState, newState);
      }
      return;
    }

    if (this._hydrationStatus === 'hydrating' && source !== 'hydration') {
      this._changedWhileHydrating = true;
    }

    if (this._hasStateChangeHandlers) {
      const handlers = this._systemEventHandlers.get('stateChanged')!;
      const payload = { state: newState, previousState };
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[${this.name}] Error in system event handler:`, error);
        }
      }
    }

    if (this._listeners.size > 0) {
      const snapshot = Array.from(this._listeners);
      for (const listener of snapshot) {
        try {
          listener(newState);
        } catch (error) {
          console.error(`[${this.name}] Error in listener:`, error);
        }
      }
    }

    this._registry.notifyStateChanged(this, previousState, newState);
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
    if (!this._hydrationPromise || this._hydrationPromiseSettled) {
      this._hydrationPromiseSettled = false;
      this._hydrationPromise = new Promise<void>((resolve, reject) => {
        this._resolveHydrationPromise = () => {
          if (this._hydrationPromiseSettled) return;
          this._hydrationPromiseSettled = true;
          resolve();
        };
        this._rejectHydrationPromise = (error: Error) => {
          if (this._hydrationPromiseSettled) return;
          this._hydrationPromiseSettled = true;
          reject(error);
        };
      });
      this._hydrationPromise.catch(() => {});
    }

    return this._hydrationPromise;
  }

  private resolveHydration(): void {
    this._resolveHydrationPromise?.();
  }

  private rejectHydration(error: Error): void {
    void this.ensureHydrationPromise();
    this._rejectHydrationPromise?.(error);
  }

  protected onSystemEvent = <E extends SystemEvent>(
    event: E,
    handler: SystemEventHandler<S, E>,
  ): (() => void) => {
    let handlers = this._systemEventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this._systemEventHandlers.set(event, handlers);
    }
    handlers.add(handler as SystemEventHandler<S, any>);

    if (event === 'stateChanged') {
      this._hasStateChangeHandlers = true;
    }

    return () => {
      handlers?.delete(handler as SystemEventHandler<S, any>);
      if (event === 'stateChanged' && handlers?.size === 0) {
        this._hasStateChangeHandlers = false;
      }
    };
  };

  private emitSystemEvent<E extends SystemEvent>(
    event: E,
    payload: SystemEventPayloads<S>[E],
  ): void {
    const handlers = this._systemEventHandlers.get(event);
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
