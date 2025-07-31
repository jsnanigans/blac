import { BlocBase } from '../BlocBase';
import { Bloc } from '../Bloc';

/**
 * Error context provided to error handlers
 */
export interface ErrorContext {
  readonly phase:
    | 'initialization'
    | 'state-change'
    | 'event-processing'
    | 'disposal';
  readonly operation: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Plugin capabilities for security model
 */
export interface PluginCapabilities {
  readonly readState: boolean;
  readonly transformState: boolean;
  readonly interceptEvents: boolean;
  readonly persistData: boolean;
  readonly accessMetadata: boolean;
}

/**
 * Base interface for all plugins
 */
export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly capabilities?: PluginCapabilities;
}

/**
 * System-wide plugin that observes all blocs
 */
export interface BlacPlugin extends Plugin {
  // Lifecycle hooks - all synchronous
  beforeBootstrap?(): void;
  afterBootstrap?(): void;
  beforeShutdown?(): void;
  afterShutdown?(): void;

  // System-wide observations
  onBlocCreated?(bloc: BlocBase<any>): void;
  onBlocDisposed?(bloc: BlocBase<any>): void;
  onStateChanged?(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any,
  ): void;
  onEventAdded?(bloc: Bloc<any, any>, event: any): void;
  onError?(error: Error, bloc: BlocBase<unknown>, context: ErrorContext): void;
}

/**
 * Bloc-specific plugin that can transform behavior
 */
export interface BlocPlugin<TState = any, TEvent = never> extends Plugin {
  // Transform hooks - can modify data
  transformState?(previousState: TState, nextState: TState): TState;
  transformEvent?(event: TEvent): TEvent | null;

  // Lifecycle hooks
  onAttach?(bloc: BlocBase<TState>): void;
  onDetach?(): void;

  // Observation hooks
  onStateChange?(previousState: TState, currentState: TState): void;
  onEvent?(event: TEvent): void;
  onError?(error: Error, context: ErrorContext): void;
}

/**
 * Plugin execution context for performance monitoring
 */
export interface PluginExecutionContext {
  readonly pluginName: string;
  readonly hookName: string;
  readonly startTime: number;
  readonly blocName?: string;
  readonly blocId?: string;
}

/**
 * Plugin metrics for monitoring
 */
export interface PluginMetrics {
  readonly executionTime: number;
  readonly executionCount: number;
  readonly errorCount: number;
  readonly lastError?: Error;
  readonly lastExecutionTime?: number;
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry<T extends Plugin> {
  add(plugin: T): void;
  remove(pluginName: string): boolean;
  get(pluginName: string): T | undefined;
  getAll(): ReadonlyArray<T>;
  clear(): void;
}
