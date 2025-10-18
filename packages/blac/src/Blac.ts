import { BlocBase, BlocInstanceId } from './BlocBase';
import { BlocLifecycleState } from './lifecycle/BlocLifecycle';
import {
  BlocBaseAbstract,
  BlocConstructor,
  BlocHookDependencyArrayFn,
  BlocState,
} from './types';
import { SystemPluginRegistry } from './plugins/SystemPluginRegistry';
import { BlacError, ErrorCategory, ErrorSeverity } from './errors/BlacError';
import { ErrorManager } from './errors/ErrorManager';
import { BlacContext } from './types/BlacContext';

/**
 * Configuration options for the Blac instance
 */
export interface BlacConfig {
  /**
   * Whether to enable proxy dependency tracking for automatic re-render optimization.
   * When false, state changes always cause re-renders unless dependencies are manually specified.
   * Default: true
   */
  proxyDependencyTracking?: boolean;

  /**
   * Maximum depth for proxy tracking when accessing nested state objects.
   * When the depth limit is reached, the raw object is returned instead of a proxy.
   * This helps prevent unbounded cache growth and performance issues with deeply nested objects.
   * Default: 3
   */
  proxyMaxDepth?: number;
}

export interface GetBlocOptions<B extends BlocBase<unknown>> {
  id?: string;
  selector?: BlocHookDependencyArrayFn<BlocState<B>>;
  constructorParams?: ConstructorParameters<BlocConstructor<B>>[];
  onMount?: (bloc: B) => void;
  instanceRef?: string;
  throwIfNotFound?: boolean;
  /** Force creation of a new instance for isolated blocs, bypassing instance lookup */
  forceNewInstance?: boolean;
}

/**
 * Interface for Blac instance management
 */
export interface BlacInstanceManager {
  getInstance(): Blac;
  setInstance(instance: Blac): void;
  resetInstance(): void;
}

/**
 * Default singleton implementation of BlacInstanceManager
 */
class SingletonBlacManager implements BlacInstanceManager {
  private static _instance: Blac;

  getInstance(): Blac {
    if (!SingletonBlacManager._instance) {
      SingletonBlacManager._instance = new Blac({
        __unsafe_ignore_singleton: true,
      });
    }
    return SingletonBlacManager._instance;
  }

  setInstance(instance: Blac): void {
    SingletonBlacManager._instance = instance;
  }

  resetInstance(): void {
    const oldInstance = SingletonBlacManager._instance;
    SingletonBlacManager._instance = new Blac({
      __unsafe_ignore_singleton: true,
    });

    // Transfer any keep-alive blocs to the new instance
    if (oldInstance) {
      for (const bloc of oldInstance.keepAliveBlocs) {
        SingletonBlacManager._instance.keepAliveBlocs.add(bloc);
        SingletonBlacManager._instance.uidRegistry.set(bloc.uid, bloc);
      }
    }
  }
}

/**
 * Global instance manager (can be replaced for testing or different patterns)
 */
let instanceManager: BlacInstanceManager = new SingletonBlacManager();

/**
 * Sets a custom instance manager (useful for testing or advanced patterns)
 */
export function setBlacInstanceManager(manager: BlacInstanceManager): void {
  instanceManager = manager;
}

/**
 * Main Blac class that manages the state management system.
 * Can work with singleton pattern or dependency injection.
 * Handles bloc lifecycle, and instance tracking.
 *
 * Key responsibilities:
 * - Managing bloc instances (creation, disposal, lookup)
 * - Handling isolated and non-isolated blocs
 * - Providing logging and debugging capabilities
 */
export class Blac implements BlacContext {
  static get instance(): Blac {
    return instanceManager.getInstance();
  }
  /** Timestamp when the instance was created */
  createdAt = Date.now();
  private errorManager = ErrorManager.getInstance();
  static get getAllBlocs() {
    return Blac.instance.getAllBlocs;
  }

  /** Private static configuration */
  private static _config: BlacConfig = {
    proxyDependencyTracking: true,
    proxyMaxDepth: 3,
  };

  /** Get current configuration */
  static get config(): Readonly<BlacConfig> {
    return { ...this._config };
  }

  /**
   * Reset configuration to defaults
   */
  static resetConfig(): void {
    this._config = {
      proxyDependencyTracking: true,
      proxyMaxDepth: 3,
    };
  }

  /**
   * Set or update Blac configuration
   * @param config - Partial configuration to merge with existing config
   * @throws Error if configuration is invalid
   */
  static setConfig(config: Partial<BlacConfig>): void {
    // Validate config
    if (
      config.proxyDependencyTracking !== undefined &&
      typeof config.proxyDependencyTracking !== 'boolean'
    ) {
      const error = new BlacError(
        'BlacConfig.proxyDependencyTracking must be a boolean',
        ErrorCategory.VALIDATION,
        ErrorSeverity.FATAL,
      );
      this.instance.errorManager.handle(error);
    }

    if (config.proxyMaxDepth !== undefined) {
      if (typeof config.proxyMaxDepth !== 'number') {
        const error = new BlacError(
          'BlacConfig.proxyMaxDepth must be a number',
          ErrorCategory.VALIDATION,
          ErrorSeverity.FATAL,
        );
        this.instance.errorManager.handle(error);
      }
      if (config.proxyMaxDepth < 1) {
        const error = new BlacError(
          'BlacConfig.proxyMaxDepth must be at least 1',
          ErrorCategory.VALIDATION,
          ErrorSeverity.FATAL,
        );
        this.instance.errorManager.handle(error);
      }
      if (!Number.isInteger(config.proxyMaxDepth)) {
        const error = new BlacError(
          'BlacConfig.proxyMaxDepth must be an integer',
          ErrorCategory.VALIDATION,
          ErrorSeverity.FATAL,
        );
        this.instance.errorManager.handle(error);
      }
    }

    // Merge with existing config
    this._config = {
      ...this._config,
      ...config,
    };

    // Log config update if logging is enabled
    if (this.enableLog) {
      this.instance.log('Blac config updated:', this._config);
    }
  }
  /** Map storing all registered bloc instances by their class name and ID */
  blocInstanceMap: Map<string, BlocBase<unknown>> = new Map();
  /** Map storing isolated bloc instances grouped by their constructor */
  // Using BlocConstructor<BlocBase<unknown>> would break type inference when storing
  // different bloc types in the same map. The 'any' allows proper polymorphic storage
  // while maintaining type safety at usage sites through the BlocConstructor constraint.
  isolatedBlocMap: Map<BlocConstructor<any>, BlocBase<unknown>[]> = new Map();
  /** Map for O(1) lookup of isolated blocs by UID */
  isolatedBlocIndex: Map<string, BlocBase<unknown>> = new Map();
  /**
   * Index for O(1) lookup of isolated blocs by their _id property.
   * Key format: `${blocClassName}:${bloc._id}`
   * @internal
   */
  private isolatedBlocIdIndex: Map<string, BlocBase<unknown>> = new Map();
  /**
   * Index for O(1) lookup of isolated blocs by their _instanceRef property.
   * Key format: `${blocClassName}:${bloc._instanceRef}`
   * @internal
   */
  private isolatedBlocRefIndex: Map<string, BlocBase<unknown>> = new Map();
  /** Map tracking UIDs to prevent memory leaks */
  uidRegistry: Map<string, BlocBase<unknown>> = new Map();
  /** Set of keep-alive blocs for controlled cleanup */
  keepAliveBlocs: Set<BlocBase<unknown>> = new Set();
  /** System plugin registry */
  readonly plugins = new SystemPluginRegistry();

  /**
   * Creates a new Blac instance.
   * @param options - Configuration options including singleton control
   */
  constructor(options: { __unsafe_ignore_singleton?: boolean } = {}) {
    const { __unsafe_ignore_singleton = false } = options;
    if (!__unsafe_ignore_singleton) {
      return Blac.instance;
    }
    instanceManager.setInstance(this);

    // Bootstrap plugins on creation
    this.plugins.bootstrap();
  }

  /** Flag to enable/disable logging */
  static enableLog = false;
  static logLevel: 'warn' | 'log' = 'warn';
  static logSpy: ((...args: unknown[]) => void) | null = null;

  /**
   * Logs messages to console when logging is enabled
   * @param args - Arguments to log
   */
  log = (...args: unknown[]) => {
    if (Blac.logSpy) {
      Blac.logSpy(args);
    }
  };
  static get log() {
    return Blac.instance.log;
  }

  /**
   * Gets the current Blac instance
   * @returns The Blac instance
   */
  static getInstance(): Blac {
    return instanceManager.getInstance();
  }

  /**
   * Logs a warning message
   * @param message - Warning message
   * @param args - Additional arguments
   */
  warn = (message: string, ...args: unknown[]) => {
    console.warn(message, ...args);
  };
  static get warn() {
    return Blac.instance.warn;
  }
  /**
   * Logs an error message
   * @param message - Error message
   * @param args - Additional arguments
   */
  error = (message: string, ...args: unknown[]) => {
    if (Blac.enableLog) {
      console.error(message, ...args);
    }
  };
  static get error() {
    return Blac.instance.error;
  }

  /**
   * Resets the Blac instance to a new one, disposing non-keepAlive blocs
   * from the old instance.
   */
  resetInstance = (): void => {
    this.log('Reset Blac instance');

    // Create snapshots to avoid concurrent modification issues
    const oldBlocInstanceMap = new Map(this.blocInstanceMap);
    const oldIsolatedBlocMap = new Map(this.isolatedBlocMap);

    // Dispose non-keepAlive blocs from the current instance
    // Use disposeBloc method to ensure proper cleanup
    oldBlocInstanceMap.forEach((bloc) => {
      if (
        !bloc._keepAlive &&
        bloc.disposalState === BlocLifecycleState.ACTIVE
      ) {
        this.disposeBloc(bloc);
      }
    });

    oldIsolatedBlocMap.forEach((blocArray) => {
      blocArray.forEach((bloc) => {
        if (
          !bloc._keepAlive &&
          bloc.disposalState === BlocLifecycleState.ACTIVE
        ) {
          this.disposeBloc(bloc);
        }
      });
    });

    // Clear registries (keep-alive blocs will be re-added by instance manager)
    this.blocInstanceMap.clear();
    this.isolatedBlocMap.clear();
    this.isolatedBlocIndex.clear();
    this.isolatedBlocIdIndex.clear();
    this.isolatedBlocRefIndex.clear();

    // Use instance manager to reset
    instanceManager.resetInstance();
  };
  static resetInstance = (): void => {
    instanceManager.resetInstance();
  };

  /**
   * Disposes of a bloc instance by removing it from the appropriate registry
   * @param bloc - The bloc instance to dispose
   */
  disposeBloc = (bloc: BlocBase<unknown>): void => {
    // Check if bloc is already disposed to prevent double disposal
    const currentState = bloc.disposalState;

    // Allow cleanup for DISPOSING state (called from disposal handler)
    // Skip if already DISPOSED
    if (currentState === BlocLifecycleState.DISPOSED) {
      this.log(
        `[${bloc._name}:${String(bloc._id)}] disposeBloc called on already disposed bloc`,
      );
      return;
    }

    const validStatesForDisposal = [
      BlocLifecycleState.ACTIVE,
      BlocLifecycleState.DISPOSAL_REQUESTED,
      BlocLifecycleState.DISPOSING, // Allow cleanup during disposal
    ];

    const needsDispose = currentState !== BlocLifecycleState.DISPOSING;

    const base = bloc.constructor as unknown as BlocBaseAbstract;
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.log(
      `[${bloc._name}:${String(bloc._id)}] disposeBloc called. Isolated: ${String(base.isolated)}`,
    );

    // Clean up from registries
    if (base.isolated) {
      this.unregisterIsolatedBlocInstance(bloc);
      this.blocInstanceMap.delete(key);
    } else {
      this.unregisterBlocInstance(bloc);
    }

    // Only call dispose() if not already disposing
    // (prevents double disposal when called from disposal handler)
    if (needsDispose) {
      // This will trigger the disposal handler which calls disposeBloc() again
      // but with state=DISPOSING, so it will skip disposal and only do cleanup
      bloc.dispose();

      // Notify plugins of bloc disposal
      this.plugins.notifyBlocDisposed(bloc);
    }

    this.log('dispatched bloc', bloc);
  };
  static get disposeBloc() {
    return Blac.instance.disposeBloc;
  }

  /**
   * Creates a unique key for a bloc instance in the map based on the bloc class name and instance ID
   * @param blocClassName - The name of the bloc class
   * @param id - The instance ID
   * @returns A unique key string in the format "className:id"
   */
  createBlocInstanceMapKey(blocClassName: string, id: BlocInstanceId): string {
    return `${blocClassName}:${String(id)}`;
  }

  /**
   * Create composite index key for ID-based lookup of isolated blocs.
   * Format: `${blocClassName}:${id}`
   *
   * @param blocClassName - The bloc class name
   * @param id - The bloc instance ID or instanceRef
   * @returns Composite key string
   * @throws {TypeError} If blocClassName is empty
   * @throws {Error} If id string exceeds 1000 characters
   * @internal
   */
  private createIdIndexKey(blocClassName: string, id: BlocInstanceId): string {
    if (!blocClassName) {
      throw new TypeError('blocClassName cannot be empty');
    }

    const idStr = String(id);

    // Security: Prevent memory exhaustion via long keys
    if (idStr.length > 1000) {
      throw new Error(
        `Bloc instance ID is too long (${idStr.length} chars). ` +
          `Maximum allowed is 1000 characters.`,
      );
    }

    return `${blocClassName}:${idStr}`;
  }

  /**
   * Unregister a bloc instance from the main registry
   * @param bloc - The bloc instance to unregister
   */
  unregisterBlocInstance(bloc: BlocBase<unknown>): void {
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.blocInstanceMap.delete(key);

    // Clean up UID tracking
    this.uidRegistry.delete(bloc.uid);

    // Remove from keep-alive set
    this.keepAliveBlocs.delete(bloc);
  }

  /**
   * Registers a bloc instance in the main registry
   * @param bloc - The bloc instance to register
   */
  registerBlocInstance(bloc: BlocBase<unknown>): void {
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.blocInstanceMap.set(key, bloc);

    // Track UID for cleanup
    this.uidRegistry.set(bloc.uid, bloc);

    // Track keep-alive blocs
    if (bloc._keepAlive) {
      this.keepAliveBlocs.add(bloc);
    }
  }

  /**
   * Finds a registered bloc instance by its class and ID
   * @param blocClass - The bloc class to search for
   * @param id - The instance ID
   * @returns The found bloc instance or undefined if not found
   */
  findRegisteredBlocInstance<B extends BlocConstructor<any>>(
    blocClass: B,
    id: BlocInstanceId,
  ): InstanceType<B> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (base.isolated) return undefined;

    const key = this.createBlocInstanceMapKey(blocClass.name, id);
    const found = this.blocInstanceMap.get(key) as InstanceType<B> | undefined;

    if (found && (found as any).isDisposed) {
      return undefined;
    }

    return found;
  }

  /**
   * Registers an isolated bloc instance in the isolated registry
   * @param bloc - The isolated bloc instance to register
   */
  registerIsolatedBlocInstance(bloc: BlocBase<unknown>): void {
    const blocClass = bloc.constructor as BlocConstructor<any>;
    const blocs = this.isolatedBlocMap.get(blocClass);
    if (blocs) {
      blocs.push(bloc);
    } else {
      this.isolatedBlocMap.set(blocClass, [bloc]);
    }

    // Add to isolated index for O(1) lookups
    this.isolatedBlocIndex.set(bloc.uid, bloc);

    // NEW: Index by _id (if present and no _instanceRef)
    // When _instanceRef is present, it takes precedence as the primary key
    if (bloc._id && !bloc._instanceRef) {
      const idKey = this.createIdIndexKey(blocClass.name, bloc._id);

      // Detect duplicate IDs (security & correctness)
      if (this.isolatedBlocIdIndex.has(idKey)) {
        throw new Error(
          `Duplicate isolated bloc ID: ${idKey}. ` +
            `An isolated bloc of type ${blocClass.name} with ID "${String(bloc._id)}" already exists.`,
        );
      }

      this.isolatedBlocIdIndex.set(idKey, bloc);
    }

    // NEW: Index by _instanceRef (if present)
    // _instanceRef is the primary key for adapter-managed instances
    if (bloc._instanceRef) {
      const refKey = this.createIdIndexKey(blocClass.name, bloc._instanceRef);

      // Detect duplicate instanceRefs (security & correctness)
      if (this.isolatedBlocRefIndex.has(refKey)) {
        throw new Error(
          `Duplicate isolated bloc instanceRef: ${refKey}. ` +
            `An isolated bloc of type ${blocClass.name} with instanceRef "${bloc._instanceRef}" already exists.`,
        );
      }

      this.isolatedBlocRefIndex.set(refKey, bloc);
    }

    // Track UID for cleanup
    this.uidRegistry.set(bloc.uid, bloc);

    // Track keep-alive blocs
    if (bloc._keepAlive) {
      this.keepAliveBlocs.add(bloc);
    }
  }

  /**
   * Unregister an isolated bloc instance from the isolated registry
   * @param bloc - The isolated bloc instance to unregister
   */
  unregisterIsolatedBlocInstance(bloc: BlocBase<unknown>): void {
    const blocClass = bloc.constructor;
    const blocs = this.isolatedBlocMap.get(blocClass as BlocConstructor<any>);

    // Ensure both data structures are synchronized
    let wasRemoved = false;

    if (blocs) {
      const index = blocs.findIndex((b) => b.uid === bloc.uid);
      if (index !== -1) {
        blocs.splice(index, 1);
        wasRemoved = true;
      }

      if (blocs.length === 0) {
        this.isolatedBlocMap.delete(blocClass as BlocConstructor<any>);
      }
    }

    // Always try to remove from isolated index, even if not found in map
    const wasInIndex = this.isolatedBlocIndex.delete(bloc.uid);

    // NEW: Clean up ID index (if was indexed)
    // Only indexed if _id was present and no _instanceRef
    if (bloc._id && !bloc._instanceRef) {
      const idKey = this.createIdIndexKey(
        (bloc.constructor as BlocConstructor<any>).name,
        bloc._id,
      );
      this.isolatedBlocIdIndex.delete(idKey);
    }

    // NEW: Clean up instanceRef index (if was indexed)
    if (bloc._instanceRef) {
      const refKey = this.createIdIndexKey(
        (bloc.constructor as BlocConstructor<any>).name,
        bloc._instanceRef,
      );
      this.isolatedBlocRefIndex.delete(refKey);
    }

    // Clean up UID tracking
    this.uidRegistry.delete(bloc.uid);

    // Remove from keep-alive set
    this.keepAliveBlocs.delete(bloc);

    // Log inconsistency for debugging
    if (wasRemoved !== wasInIndex) {
      this.warn(
        `[Blac] Inconsistent state detected during isolated bloc cleanup for ${bloc._name}:${bloc.uid}. ` +
          `Map removal: ${wasRemoved}, Index removal: ${wasInIndex}`,
      );
    }
  }

  /**
   * Finds an isolated bloc instance by its class and ID.
   *
   * This method uses O(1) Map lookups for optimal performance,
   * regardless of the number of isolated instances.
   *
   * @param blocClass - The bloc class to search for
   * @param id - The bloc instance ID or instanceRef to find
   * @returns The bloc instance, or undefined if not found or disposed
   */
  findIsolatedBlocInstance<B extends BlocConstructor<any>>(
    blocClass: B,
    id: BlocInstanceId,
  ): InstanceType<B> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (!base.isolated) return undefined;

    // O(1) index lookup (was O(n) linear search)
    const key = this.createIdIndexKey(blocClass.name, id);

    // Try ID index first
    let found = this.isolatedBlocIdIndex.get(key) as InstanceType<B> | undefined;

    // If not found in ID index, try instanceRef index
    if (!found) {
      found = this.isolatedBlocRefIndex.get(key) as InstanceType<B> | undefined;
    }

    // Preserve existing behavior: return undefined for disposed blocs
    if (found && (found as any).isDisposed) {
      return undefined;
    }

    return found;
  }

  /**
   * Finds an isolated bloc instance by UID (O(1) lookup)
   */
  findIsolatedBlocInstanceByUid<B extends BlocBase<unknown>>(
    uid: string,
  ): B | undefined {
    return this.isolatedBlocIndex.get(uid) as B | undefined;
  }

  /**
   * Creates a new bloc instance and registers it in the appropriate registry
   * @param blocClass - The bloc class to instantiate
   * @param id - The instance ID
   * @param props - Properties to pass to the bloc constructor
   * @param instanceRef - Optional reference string for the instance
   * @returns The newly created bloc instance
   */
  createNewBlocInstance<B extends BlocConstructor<BlocBase<any>>>(
    blocClass: B,
    id: BlocInstanceId,
    options: GetBlocOptions<InstanceType<B>> = {},
  ): InstanceType<B> {
    const { constructorParams, instanceRef } = options;
    const newBloc = new blocClass(constructorParams) as InstanceType<B>;
    newBloc.blacContext = this;
    newBloc._instanceRef = instanceRef;
    newBloc._id = id;

    // Set up disposal handler to break circular dependency
    newBloc.setDisposalHandler((bloc) => this.disposeBloc(bloc));

    if (newBloc.isIsolated) {
      this.registerIsolatedBlocInstance(newBloc);
    } else {
      this.registerBlocInstance(newBloc);
    }

    // Plugins are activated in constructor

    // Notify system plugins of bloc creation
    this.plugins.notifyBlocCreated(newBloc);

    return newBloc;
  }

  activateBloc = (bloc: BlocBase<unknown>): void => {
    // Don't activate disposed blocs
    if (bloc.disposalState !== BlocLifecycleState.ACTIVE) {
      this.log(
        `[${bloc._name}:${String(bloc._id)}] activateBloc called on disposed bloc. Ignoring.`,
      );
      return;
    }

    const base = bloc.constructor as unknown as BlocConstructor<BlocBase<any>>;
    const isIsolated = bloc.isIsolated;

    const found = isIsolated
      ? this.findIsolatedBlocInstance(base, bloc._id)
      : this.findRegisteredBlocInstance(base, bloc._id);
    if (found) {
      return;
    }

    this.log(
      `[${bloc._name}:${String(bloc._id)}] activateBloc called. Isolated: ${String(bloc.isIsolated)}`,
    );
    if (bloc.isIsolated) {
      this.registerIsolatedBlocInstance(bloc);
    } else {
      this.registerBlocInstance(bloc);
    }
  };
  static get activateBloc() {
    return Blac.instance.activateBloc;
  }

  /**
   * Gets or creates a bloc instance based on the provided class and options.
   * If a bloc with the given ID exists, it will be returned. Otherwise, a new instance will be created.
   *
   * @param blocClass - The bloc class to get or create
   * @param options - Options including:
   *   - id: The instance ID (defaults to class name if not provided)
   *   - props: Properties to pass to the bloc constructor
   *   - instanceRef: Optional reference string for the instance
   * @returns The bloc instance
   */
  getBloc = <B extends BlocConstructor<BlocBase<any>>>(
    blocClass: B,
    options: GetBlocOptions<InstanceType<B>> = {},
  ): InstanceType<B> => {
    const { id, forceNewInstance } = options;
    const base = blocClass as unknown as BlocBaseAbstract;
    const blocId = id ?? blocClass.name;
    this.log(`[${blocClass.name}:${String(blocId)}] (getBloc) Called:`, {
      options,
      base,
    });

    // Skip instance lookup if forceNewInstance is true for isolated blocs
    if (!forceNewInstance) {
      if (base.isolated) {
        const isolatedBloc = this.findIsolatedBlocInstance<B>(
          blocClass,
          options.instanceRef ?? blocId,
        );
        if (isolatedBloc) {
          return isolatedBloc;
        } else {
          if (options.throwIfNotFound) {
            throw new Error(`Isolated bloc ${blocClass.name} not found`);
          }
        }
      } else {
        const registeredBloc = this.findRegisteredBlocInstance(
          blocClass,
          blocId,
        );
        if (registeredBloc) {
          return registeredBloc;
        } else {
          if (options.throwIfNotFound) {
            throw new Error(`Registered bloc ${blocClass.name} not found`);
          }
        }
      }
    }

    const bloc = this.createNewBlocInstance(blocClass, blocId, options);
    this.log(
      `[${blocClass.name}:${String(blocId)}] (getBloc) No existing instance found. Creating new one.`,
      options,
      bloc,
    );

    if (!bloc) {
      throw new Error(
        `[getBloc] Failed to create bloc instance for ${blocClass.name}. This should never happen.`,
      );
    }

    return bloc;
  };
  static get getBloc() {
    return Blac.instance.getBloc;
  }

  /**
   * Gets all instances of a specific bloc class
   * @param blocClass - The bloc class to search for
   * @param options - Options including:
   *   - searchIsolated: Whether to search in isolated blocs (defaults to bloc's isolated property)
   * @returns Array of matching bloc instances
   */
  getAllBlocs = <B extends BlocConstructor<any>>(
    blocClass: B,
    options: {
      searchIsolated?: boolean;
    } = {},
  ): InstanceType<B>[] => {
    const results: InstanceType<B>[] = [];

    // Search non-isolated blocs
    this.blocInstanceMap.forEach((blocInstance) => {
      if (blocInstance.constructor === blocClass) {
        // Strict constructor check
        results.push(blocInstance as InstanceType<B>);
      }
    });

    // Optionally search isolated blocs
    if (options.searchIsolated !== false) {
      const isolatedBlocs = this.isolatedBlocMap.get(blocClass);
      if (isolatedBlocs) {
        results.push(...isolatedBlocs.map((bloc) => bloc as InstanceType<B>));
      }
    }

    return results;
  };

  /**
   * Disposes all keep-alive blocs of a specific type
   * @param blocClass - The bloc class to dispose
   */
  disposeKeepAliveBlocs = <B extends BlocConstructor<any>>(
    blocClass?: B,
  ): void => {
    const toDispose: BlocBase<unknown>[] = [];

    for (const bloc of this.keepAliveBlocs) {
      if (!blocClass || bloc.constructor === blocClass) {
        toDispose.push(bloc);
      }
    }

    toDispose.forEach((bloc) => bloc.dispose());
  };
  static get disposeKeepAliveBlocs() {
    return Blac.instance.disposeKeepAliveBlocs;
  }

  /**
   * Disposes all blocs matching a pattern
   * @param predicate - Function to test each bloc for disposal
   */
  disposeBlocs = (predicate: (bloc: BlocBase<unknown>) => boolean): void => {
    const toDispose: BlocBase<unknown>[] = [];

    // Check registered blocs
    for (const bloc of this.blocInstanceMap.values()) {
      if (predicate(bloc)) {
        toDispose.push(bloc);
      }
    }

    // Check isolated blocs
    for (const blocs of this.isolatedBlocMap.values()) {
      for (const bloc of blocs) {
        if (predicate(bloc)) {
          toDispose.push(bloc);
        }
      }
    }

    toDispose.forEach((bloc) => bloc.dispose());
  };
  static get disposeBlocs() {
    return Blac.instance.disposeBlocs;
  }

  /**
   * Gets memory usage statistics for debugging
   */
  getMemoryStats = () => {
    return {
      totalBlocs: this.uidRegistry.size,
      registeredBlocs: this.blocInstanceMap.size,
      isolatedBlocs: Array.from(this.isolatedBlocMap.values()).reduce(
        (sum, arr) => sum + arr.length,
        0,
      ),
      keepAliveBlocs: this.keepAliveBlocs.size,
      isolatedBlocTypes: this.isolatedBlocMap.size,
    };
  };
  static get getMemoryStats() {
    return Blac.instance.getMemoryStats;
  }

  /**
   * Validates subscription references and cleans up orphaned blocs
   */
  validateConsumers = (): void => {
    for (const bloc of this.uidRegistry.values()) {
      // Check if bloc should be disposed after validation
      if (
        bloc.subscriptionCount === 0 &&
        !bloc._keepAlive &&
        bloc.disposalState === BlocLifecycleState.ACTIVE
      ) {
        // Schedule disposal for blocs with no subscriptions
        setTimeout(() => {
          // Double-check conditions before disposal
          if (
            bloc.subscriptionCount === 0 &&
            !bloc._keepAlive &&
            bloc.disposalState === BlocLifecycleState.ACTIVE
          ) {
            this.disposeBloc(bloc);
          }
        }, 1000); // Give a grace period
      }
    }
  };
  static get validateConsumers() {
    return Blac.instance.validateConsumers;
  }

  /**
   * Bootstrap the Blac instance and all plugins
   */
  bootstrap(): void {
    this.plugins.bootstrap();
  }

  /**
   * Shutdown the Blac instance and all plugins
   */
  shutdown(): void {
    this.plugins.shutdown();

    // Dispose all non-keepAlive blocs
    for (const bloc of this.blocInstanceMap.values()) {
      if (!bloc._keepAlive) {
        this.disposeBloc(bloc);
      }
    }

    for (const blocs of this.isolatedBlocMap.values()) {
      for (const bloc of blocs) {
        if (!bloc._keepAlive) {
          this.disposeBloc(bloc);
        }
      }
    }
  }
}
