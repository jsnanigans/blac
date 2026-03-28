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

export interface IndexedDbPersistAdapter {
  isAvailable(): boolean;
  get<TPayload = unknown>(
    key: string,
  ): Promise<PersistedRecord<TPayload> | null>;
  put<TPayload = unknown>(record: PersistedRecord<TPayload>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IndexedDbPersistPluginOptions {
  databaseName?: string;
  storeName?: string;
  adapter?: IndexedDbPersistAdapter;
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
  clearRecord(key: string): Promise<void>;
  clearAll(): Promise<void>;
  getStatus(instance: StateContainer<object>): PersistPluginStatus | undefined;
  subscribe(listener: (event: PersistPluginStatusEvent) => void): () => void;
}
