import { generateUUID } from './utils/uuid';
import { BlocPlugin } from './plugins/types';
import { BlocPluginRegistry } from './plugins/BlocPluginRegistry';
import { SubscriptionManager } from './subscription/SubscriptionManager';
import { SubscriptionResult } from './subscription/types';
import {
  BlocLifecycleManager,
  BlocLifecycleState,
  StateTransitionResult,
} from './lifecycle/BlocLifecycle';
import { BatchingManager } from './utils/BatchingManager';
import { BlacContext } from './types/BlacContext';
import {
  StandardSchemaV1,
  isStandardSchema,
  BlocValidationError,
} from './validation';

export type BlocInstanceId = string | number | undefined;

interface BlocStaticProperties {
  isolated: boolean;
  keepAlive: boolean;
  plugins?: BlocPlugin<any, any>[];
  schema?: StandardSchemaV1<any>;
}

/**
 * Base class for both Blocs and Cubits using unified subscription model.
 */
export abstract class BlocBase<S> {
  public uid = generateUUID();
  blacContext?: BlacContext;

  static isolated = false;
  get isIsolated() {
    return this._isolated;
  }

  static keepAlive = false;
  get isKeepAlive() {
    return this._keepAlive;
  }


  public _isolated = false;
  public _id: BlocInstanceId;
  public _instanceRef?: string;
  public _name: string;

  /**
   * Unified subscription manager for all state notifications
   */
  public _subscriptionManager: SubscriptionManager<S>;

  _state: S;
  private _lifecycleManager = new BlocLifecycleManager();
  private _batchingManager = new BatchingManager<S>();
  _keepAlive = false;
  public lastUpdate?: number;

  _plugins = new BlocPluginRegistry<S, any>();

  /**
   * Schema for state validation (optional)
   */
  protected _schema?: StandardSchemaV1<any, S>;

  /**
   * Called synchronously when disposal is scheduled (subscriptionCount === 0).
   * Use this to clean up intervals, timers, pending promises, and other resources
   * that might prevent disposal.
   *
   * IMPORTANT:
   * - Must be synchronous (no async/await)
   * - Errors are logged but do not prevent disposal
   * - Called before disposal microtask is queued
   * - Cannot prevent disposal (that's what plugins are for)
   *
   * @example
   * ```typescript
   * class TimerCubit extends Cubit<number> {
   *   interval?: NodeJS.Timeout;
   *
   *   constructor() {
   *     super(0);
   *
   *     this.onDisposalScheduled = () => {
   *       if (this.interval) {
   *         clearInterval(this.interval);
   *         this.interval = undefined;
   *       }
   *     };
   *
   *     this.interval = setInterval(() => {
   *       this.emit(this.state + 1);
   *     }, 100);
   *   }
   * }
   * ```
   */
  onDisposalScheduled?: () => void;

  /**
   * Called when disposal completes (bloc is fully disposed).
   * Use for final cleanup like closing connections, clearing caches, etc.
   *
   * IMPORTANT:
   * - Must be synchronous (no async/await)
   * - Errors are logged but do not prevent disposal completion
   * - Called after all subscriptions are cleared
   *
   * @example
   * ```typescript
   * class DatabaseBloc extends Vertex<DbState, DbEvents> {
   *   constructor(private connection: DbConnection) {
   *     super(initialState);
   *
   *     this.onDispose = () => {
   *       this.connection.close();
   *     };
   *   }
   * }
   * ```
   */
  onDispose?: () => void;

  /**
   * Creates a new BlocBase instance with unified subscription management
   */
  constructor(initialState: S) {
    this._id = this.constructor.name;
    this._name = this.constructor.name;

    // Initialize unified subscription system
    this._subscriptionManager = new SubscriptionManager(this as any);

    // Access static properties
    const Constructor = this.constructor as typeof BlocBase &
      BlocStaticProperties;

    this._keepAlive =
      typeof Constructor.keepAlive === 'boolean'
        ? Constructor.keepAlive
        : false;
    this._isolated =
      typeof Constructor.isolated === 'boolean' ? Constructor.isolated : false;

    // Initialize schema from static property
    if (Constructor.schema) {
      if (!isStandardSchema(Constructor.schema)) {
        throw new TypeError(
          `[${this._name}] Schema must implement StandardSchemaV1 interface`,
        );
      }
      this._schema = Constructor.schema as StandardSchemaV1<any, S>;
    }

    // Validate initial state if schema defined
    if (this._schema) {
      try {
        initialState = this._validateState(initialState);
      } catch (error) {
        // Constructor errors should throw immediately with clear message
        const message =
          error instanceof BlocValidationError
            ? `Initial state validation failed: ${error.message}`
            : `Initial state validation error: ${error}`;
        throw new Error(`[${this._name}] ${message}`, { cause: error });
      }
    }

    this._state = initialState;

    // Initialize plugin registry
    this._plugins = new BlocPluginRegistry<S, any>();

    // Register static plugins
    if (Constructor.plugins && Array.isArray(Constructor.plugins)) {
      for (const plugin of Constructor.plugins) {
        this._plugins.add(plugin);
      }
    }

    // Attach all plugins
    this._plugins.attach(this);
  }

  /**
   * Returns the current state
   */
  get state(): S {
    if (this._lifecycleManager.isDisposed) {
      return this._state; // Return last known state for disposed blocs
    }
    return this._state;
  }

  /**
   * Subscribe to all state changes
   * @returns Object containing subscription ID and unsubscribe function
   */
  subscribe(callback: (state: S) => void): SubscriptionResult {
    return this._subscriptionManager.subscribe({
      type: 'observer',
      notify: (state) => callback(state as S),
    });
  }

  /**
   * Subscribe with a selector for optimized updates
   * @returns Object containing subscription ID and unsubscribe function
   */
  subscribeWithSelector<T>(
    selector: (state: S) => T,
    callback: (value: T) => void,
    equalityFn?: (a: T, b: T) => boolean,
  ): SubscriptionResult {
    return this._subscriptionManager.subscribe({
      type: 'consumer',
      selector: selector as any,
      equalityFn: equalityFn as any,
      notify: (value) => callback(value as T),
    });
  }

  /**
   * Subscribe with React component reference for automatic cleanup
   * @returns Object containing subscription ID and unsubscribe function
   */
  subscribeComponent(
    componentRef: WeakRef<object>,
    callback: () => void,
  ): SubscriptionResult {
    return this._subscriptionManager.subscribe({
      type: 'consumer',
      weakRef: componentRef,
      notify: callback,
    });
  }

  /**
   * Get current subscription count
   */
  get subscriptionCount(): number {
    return this._subscriptionManager.size;
  }

  /**
   * Track property access for a subscription
   */
  trackAccess(subscriptionId: string, path: string, value?: unknown): void {
    this._subscriptionManager.trackAccess(subscriptionId, path, value);
  }

  /**
   * Emit a new state
   */
  protected emit(newState: S, action?: unknown): void {
    this._pushState(newState, this._state, action);
  }

  /**
   * Internal state push method used by Bloc
   */
  _pushState(newState: S, oldState: S, action?: unknown): void {
    const currentState = this._lifecycleManager.currentState;

    // Only allow emissions on ACTIVE blocs
    if (currentState !== BlocLifecycleState.ACTIVE) {
      this.blacContext?.error(
        `[${this._name}:${this._id}] Cannot emit state on ${currentState} bloc. ` +
          `State update ignored. ` +
          `If this bloc uses setInterval/setTimeout, clean up in onDisposalScheduled hook.`,
      );
      return;
    }

    if (newState === undefined) {
      return; // Silent failure for undefined states
    }

    this._state = newState;

    // Apply plugins
    const transformedState = this._plugins.transformState(
      oldState,
      newState,
    ) as S;
    this._state = transformedState;

    // Validate state after plugin transforms
    if (this._schema) {
      try {
        const validatedState = this._validateState(transformedState, oldState);
        this._state = validatedState; // May differ due to coercion/defaults
      } catch (error) {
        // Log error through BlacContext
        if (error instanceof BlocValidationError) {
          this.blacContext?.error(
            `[${this._name}] State validation failed: ${error.message}`,
            { error, bloc: this, state: transformedState },
          );
        }

        // Restore previous state (prevent corruption)
        this._state = oldState;

        // Re-throw error for caller to handle
        throw error;
      }
    }

    // Notify plugins of state change
    this._plugins.notifyStateChange(oldState, this._state);

    // Notify system plugins of state change
    this.blacContext?.plugins.notifyStateChanged(
      this as any,
      oldState,
      this._state,
    );

    // Handle batching
    if (this._batchingManager.isCurrentlyBatching) {
      this._batchingManager.addUpdate({
        newState: this._state,
        oldState,
        action,
      });
      return;
    }

    // Notify all subscriptions
    this._subscriptionManager.notify(this._state, oldState, action);
    this.lastUpdate = Date.now();
  }

  _batchUpdates(callback: () => void): void {
    this._batchingManager.batchUpdates(callback, (finalUpdate) => {
      this._subscriptionManager.notify(
        finalUpdate.newState,
        finalUpdate.oldState,
        finalUpdate.action,
      );
    });
  }

  /**
   * Add a plugin
   */
  addPlugin(plugin: BlocPlugin<S, any>): void {
    this._plugins.add(plugin);

    // If plugins are already attached (bloc is active), attach the new plugin
    if ((this._plugins as any).attached && plugin.onAttach) {
      try {
        plugin.onAttach(this);
      } catch (error) {
        console.error(`Plugin '${plugin.name}' error in onAttach:`, error);
      }
    }
  }

  /**
   * Remove a plugin
   */
  removePlugin(plugin: BlocPlugin<S, any>): void {
    this._plugins.remove(plugin.name);
  }

  /**
   * Get all plugins
   */
  get plugins(): ReadonlyArray<BlocPlugin<S, any>> {
    return this._plugins.getAll();
  }

  /**
   * Validate state against schema
   * @internal
   */
  protected _validateState(state: S, currentState: S): S {
    if (!this._schema) {
      return state;
    }

    const result = this._schema['~standard'].validate(state);

    // Check if validation is async (not supported)
    if (result instanceof Promise) {
      throw new Error(
        `[${this._name}] Async schema validation not supported. ` +
          `State validation must be synchronous. ` +
          `Use async validation in event handlers before calling emit().`,
      );
    }

    // Check if validation failed
    if ('issues' in result) {
      throw new BlocValidationError(
        result.issues || [],
        state,
        currentState,
        this._name,
      );
    }

    // Return validated value (may differ due to coercion/defaults)
    return result.value;
  }

  /**
   * Validate a value against the bloc's schema without emitting
   *
   * @param value - Value to validate
   * @returns Validation result object
   * @throws {Error} If no schema is defined
   *
   * @example
   * ```typescript
   * const result = cubit.validate(someValue);
   * if (result.success) {
   *   console.log('Valid:', result.value);
   * } else {
   *   console.error('Invalid:', result.issues);
   * }
   * ```
   */
  validate(value: unknown): ValidationResult<S> {
    if (!this._schema) {
      throw new Error(
        `[${this._name}] Cannot validate: No schema defined. ` +
          `Define 'static schema' property to enable validation.`,
      );
    }

    const result = this._schema['~standard'].validate(value);

    if (result instanceof Promise) {
      throw new Error(
        `[${this._name}] Async validation not supported in validate() method`,
      );
    }

    if ('issues' in result) {
      return {
        success: false,
        issues: result.issues || [],
      };
    }

    return {
      success: true,
      value: result.value,
    };
  }

  /**
   * Check if a value is valid according to the bloc's schema
   *
   * @param value - Value to check
   * @returns true if valid or no schema defined, false if invalid
   *
   * @example
   * ```typescript
   * if (cubit.isValid(someValue)) {
   *   cubit.emit(someValue);
   * }
   * ```
   */
  isValid(value: unknown): value is S {
    if (!this._schema) {
      return true; // No schema = always valid
    }

    const result = this._schema['~standard'].validate(value);

    if (result instanceof Promise) {
      return false; // Async validation considered invalid
    }

    return !('issues' in result);
  }

  /**
   * Parse and validate a value, throwing on error
   * Mirrors Zod's parse() / Valibot's parse()
   *
   * @param value - Value to parse
   * @returns Validated value
   * @throws {BlocValidationError} If validation fails
   * @throws {Error} If no schema defined
   *
   * @example
   * ```typescript
   * try {
   *   const validated = cubit.parse(userInput);
   *   cubit.emit(validated);
   * } catch (error) {
   *   console.error('Validation failed:', error);
   * }
   * ```
   */
  parse(value: unknown): S {
    const result = this.validate(value);

    if (!result.success) {
      throw new BlocValidationError(
        result.issues,
        value,
        this._state,
        this._name,
      );
    }

    return result.value;
  }

  /**
   * Parse and validate a value, returning result object
   * Mirrors Zod's safeParse() / Valibot's safeParse()
   *
   * @param value - Value to parse
   * @returns Result object with success flag
   *
   * @example
   * ```typescript
   * const result = cubit.safeParse(userInput);
   * if (result.success) {
   *   cubit.emit(result.value);
   * } else {
   *   console.error('Validation failed:', result.error);
   * }
   * ```
   */
  safeParse(value: unknown): SafeParseResult<S> {
    try {
      const result = this.validate(value);

      if (!result.success) {
        return {
          success: false,
          error: new BlocValidationError(
            result.issues,
            value,
            this._state,
            this._name,
          ),
        };
      }

      return {
        success: true,
        value: result.value,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get the schema for this bloc (if defined)
   *
   * @returns Schema or undefined
   *
   * @example
   * ```typescript
   * const schema = cubit.schema;
   * if (schema) {
   *   // Use schema for external validation
   *   const result = schema['~standard'].validate(data);
   * }
   * ```
   */
  get schema(): StandardSchemaV1<any, S> | undefined {
    return this._schema;
  }

  /**
   * Disposal management
   */
  get isDisposed(): boolean {
    return this._lifecycleManager.isDisposed;
  }

  /**
   * Get current disposal lifecycle state.
   * Used by Blac for disposal management.
   */
  get disposalState(): BlocLifecycleState {
    return this._lifecycleManager.currentState;
  }

  /**
   * Atomic state transition for disposal
   */
  _atomicStateTransition(
    expectedState: BlocLifecycleState,
    newState: BlocLifecycleState,
  ): StateTransitionResult {
    return this._lifecycleManager.atomicStateTransition(
      expectedState,
      newState,
    );
  }

  /**
   * Dispose the bloc and clean up resources
   */
  async dispose(): Promise<void> {
    const transitionResult = this._lifecycleManager.atomicStateTransition(
      BlocLifecycleState.ACTIVE,
      BlocLifecycleState.DISPOSING,
    );

    if (!transitionResult.success) {
      if (
        this._lifecycleManager.currentState ===
        BlocLifecycleState.DISPOSAL_REQUESTED
      ) {
        this._lifecycleManager.atomicStateTransition(
          BlocLifecycleState.DISPOSAL_REQUESTED,
          BlocLifecycleState.DISPOSING,
        );
      } else {
        return;
      }
    }

    try {
      // Clear subscriptions
      this._subscriptionManager.clear();

      // Call disposal hook
      if (this.onDispose) {
        try {
          this.onDispose();
        } catch (error) {
          // Log error but don't crash - disposal must complete
          this.blacContext?.error(
            `[${this._name}:${this._id}] Error in onDispose hook:`,
            error,
          );
          // Continue with disposal
        }
      }

      // Notify bloc-level plugins of disposal
      for (const plugin of this._plugins.getAll()) {
        try {
          if ('onDispose' in plugin && typeof plugin.onDispose === 'function') {
            plugin.onDispose(this as any);
          }
        } catch (error) {
          console.error('Plugin disposal error:', error);
        }
      }

      // Notify system-level plugins (via Blac context)
      if (this.blacContext) {
        try {
          this.blacContext.plugins.notifyBlocDisposed(this);
        } catch (error) {
          console.error('System plugin disposal notification error:', error);
        }
      }

      // Call disposal handler (for registry cleanup)
      const handler = this._lifecycleManager.getDisposalHandler();
      if (handler) {
        handler(this as any);
      }
    } finally {
      this._lifecycleManager.atomicStateTransition(
        BlocLifecycleState.DISPOSING,
        BlocLifecycleState.DISPOSED,
      );
    }
  }


  /**
   * Schedule disposal when no subscriptions remain
   */
  _scheduleDisposal(): void {
    const shouldDispose =
      this._subscriptionManager.size === 0 && !this._keepAlive;

    if (!shouldDispose) {
      return;
    }

    // Call cleanup hook synchronously BEFORE scheduling disposal
    if (this.onDisposalScheduled) {
      try {
        this.onDisposalScheduled();
      } catch (error) {
        // Log error but don't crash - disposal must proceed
        this.blacContext?.error(
          `[${this._name}:${this._id}] Error in onDisposalScheduled hook:`,
          error,
        );
        // Continue with disposal
      }
    }

    this.blacContext?.log(
      `[${this._name}:${this._id}] Scheduling disposal on next microtask`,
    );

    this._lifecycleManager.scheduleDisposal(
      () => this._subscriptionManager.size === 0 && !this._keepAlive,
      () => this.dispose(),
    );
  }

  /**
   * Set disposal handler
   */
  setDisposalHandler(handler: (bloc: BlocBase<unknown>) => void): void {
    this._lifecycleManager.setDisposalHandler(
      handler as (bloc: unknown) => void,
    );
  }

  /**
   * Check if disposal should be scheduled (called by subscription manager)
   */
  checkDisposal(): void {
    if (
      this._subscriptionManager.size === 0 &&
      !this._keepAlive &&
      this._lifecycleManager.currentState === BlocLifecycleState.ACTIVE
    ) {
      this._scheduleDisposal();
    }
  }

  /**
   * Cancel disposal if bloc is in disposal_requested state
   */
  _cancelDisposalIfRequested(): void {
    const currentState = this._lifecycleManager.currentState;

    this.blacContext?.log(
      `[${this._name}:${this._id}] Attempting to cancel disposal. Current state: ${currentState}`,
    );

    // Only cancel if in DISPOSAL_REQUESTED state
    if (currentState !== BlocLifecycleState.DISPOSAL_REQUESTED) {
      if (
        currentState === BlocLifecycleState.DISPOSING ||
        currentState === BlocLifecycleState.DISPOSED
      ) {
        this.blacContext?.warn(
          `[${this._name}:${this._id}] Cannot cancel disposal - ` +
            `already ${currentState}. This typically happens when trying to resubscribe ` +
            `after disposal has already started.`,
        );
      }
      return;
    }

    const success = this._lifecycleManager.cancelDisposal();

    if (success) {
      this.blacContext?.log(
        `[${this._name}:${this._id}] Successfully cancelled disposal`,
      );
    } else {
      this.blacContext?.error(
        `[${this._name}:${this._id}] Failed to cancel disposal ` +
          `despite being in DISPOSAL_REQUESTED state`,
      );
    }
  }
}

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; issues: readonly StandardSchemaV1.Issue[] };

/**
 * Safe parse result type
 */
export type SafeParseResult<T> =
  | { success: true; value: T }
  | { success: false; error: Error };
