import type { BlacPlugin, Cubit, StateContainer } from '@blac/core';

export interface PersistedRecord<TPayload = unknown> {
  id: string;
  className: string;
  instanceId: string;
  savedAt: number;
  payload: TPayload;
}

export interface PersistPluginStatus {
  key: string;
  className: string;
  instanceId: string;
  phase: 'idle' | 'hydrating' | 'hydrated' | 'saving' | 'saved' | 'error';
  hydratedFromStorage: boolean;
  savedAt?: number;
  error?: Error;
}

export interface PersistPluginStatusEvent {
  instance: StateContainer<object>;
  status: PersistPluginStatus;
}

type MaybePromise<T> = T | Promise<T>;

/**
 * Storage backend for the persist plugin. Methods may be synchronous: when
 * `get` returns a record directly (not a promise), hydration completes inside
 * `onCreated`, before the instance's first state read.
 */
export interface IndexedDbPersistAdapter {
  isAvailable(): boolean;
  get<TPayload = unknown>(
    key: string,
  ): MaybePromise<PersistedRecord<TPayload> | null>;
  put<TPayload = unknown>(
    record: PersistedRecord<TPayload>,
  ): MaybePromise<void>;
  delete(key: string): MaybePromise<void>;
  clear(): MaybePromise<void>;
}

export interface IndexedDbPersistPluginOptions {
  databaseName?: string;
  storeName?: string;
  adapter?: IndexedDbPersistAdapter;
  pluginName?: string;
}

export interface WebStoragePersistPluginOptions {
  /** Defaults to `localStorage`; pass `sessionStorage` or a stand-in. */
  storage?: Storage;
  /** Prepended to every key; `clearAll` only removes keys with this prefix. */
  prefix?: string;
  pluginName?: string;
}

export interface PersistDefinitionContext<S extends object> {
  instance: StateContainer<S>;
  className: string;
  instanceId: string;
  currentState: S;
  key: string;
}

export interface PersistHydrationContext<S extends object, TPayload> {
  instance: StateContainer<S>;
  className: string;
  instanceId: string;
  currentState: S;
  key: string;
  record: PersistedRecord<TPayload>;
}

export interface PersistRegistration<
  S extends object,
  TPayload = unknown,
  TContainer extends StateContainer<S> = StateContainer<S>,
> {
  key?: string | ((ctx: PersistDefinitionContext<S>) => string);
  debounceMs?: number;
  stateToDb?: (state: S, ctx: PersistDefinitionContext<S>) => TPayload;
  dbToState?: (
    persisted: TPayload,
    ctx: PersistHydrationContext<S, TPayload>,
  ) => S;
  onHydrated?: (
    state: S,
    ctx: PersistHydrationContext<S, TPayload> & { instance: TContainer },
  ) => void;
  onError?: (
    error: Error,
    ctx: PersistDefinitionContext<S> & { instance: TContainer },
  ) => void;
}

export interface IndexedDbPersistPlugin extends BlacPlugin {
  persist<
    S extends object,
    TPayload = unknown,
    TContainer extends Cubit<S> = Cubit<S>,
  >(
    Type: new (...args: any[]) => TContainer,
    config?: PersistRegistration<S, TPayload, TContainer>,
  ): IndexedDbPersistPlugin;
  /** Starts every pending debounced write now. Also runs on `pagehide`. */
  flush(): void;
  clearRecord(key: string): Promise<void>;
  clearAll(): Promise<void>;
  getStatus(instance: StateContainer<object>): PersistPluginStatus | undefined;
  subscribe(listener: (event: PersistPluginStatusEvent) => void): () => void;
}
