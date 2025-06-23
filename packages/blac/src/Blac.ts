/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: The 'any' types in this file are necessary for proper type inference in complex generic scenarios.
// Specifically:
// 1. BlocConstructor<any> in Maps - allows any bloc type to be stored while maintaining type safety in usage
// 2. Type assertions for _disposalState - private property access across inheritance hierarchy
// 3. Constructor argument types - enables flexible bloc instantiation patterns
// These 'any' usages are carefully controlled and don't compromise runtime type safety.
import { BlocBase, BlocInstanceId } from "./BlocBase";
import {
    BlocBaseAbstract,
    BlocConstructor,
    BlocHookDependencyArrayFn,
    BlocState,
    InferPropsFromGeneric
} from "./types";

/**
 * Configuration options for the Blac instance
 */
export interface BlacConfig {
  /** Whether to expose the Blac instance globally */
  exposeBlacInstance?: boolean;
}

export interface GetBlocOptions<B extends BlocBase<unknown>> {
  id?: string;
  selector?: BlocHookDependencyArrayFn<BlocState<B>>;
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
  instanceRef?: string;
  throwIfNotFound?: boolean;
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
      SingletonBlacManager._instance = new Blac({ __unsafe_ignore_singleton: true });
    }
    return SingletonBlacManager._instance;
  }

  setInstance(instance: Blac): void {
    SingletonBlacManager._instance = instance;
  }

  resetInstance(): void {
    const oldInstance = SingletonBlacManager._instance;
    SingletonBlacManager._instance = new Blac({ __unsafe_ignore_singleton: true });
    
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
export class Blac {
  /** @deprecated Use getInstance() instead */
  static get instance(): Blac {
    return instanceManager.getInstance();
  }
  /** Timestamp when the instance was created */
  createdAt = Date.now();
  static get getAllBlocs() {
    return Blac.instance.getAllBlocs;
  }
  /** Map storing all registered bloc instances by their class name and ID */
  blocInstanceMap: Map<string, BlocBase<unknown>> = new Map();
  /** Map storing isolated bloc instances grouped by their constructor */
  // TODO: BlocConstructor<any> is required here for type inference to work correctly.
  // Using BlocConstructor<BlocBase<unknown>> would break type inference when storing
  // different bloc types in the same map. The 'any' allows proper polymorphic storage
  // while maintaining type safety at usage sites through the BlocConstructor constraint.
  isolatedBlocMap: Map<BlocConstructor<any>, BlocBase<unknown>[]> = new Map();
  /** Map for O(1) lookup of isolated blocs by UID */
  private isolatedBlocIndex: Map<string, BlocBase<unknown>> = new Map();
  /** Map tracking UIDs to prevent memory leaks */
  uidRegistry: Map<string, BlocBase<unknown>> = new Map();
  /** Set of keep-alive blocs for controlled cleanup */
  keepAliveBlocs: Set<BlocBase<unknown>> = new Set();
  /** Flag to control whether changes should be posted to document */
  postChangesToDocument = false;

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
  }

  /** Flag to enable/disable logging */
  static enableLog = false;

  /**
   * Logs messages to console when logging is enabled
   * @param args - Arguments to log
   */
  log = (...args: unknown[]) => {
    if (Blac.enableLog) console.warn(`☢️ [Blac ${this.createdAt.toString()}]`, ...args);
  };
  static get log() { return Blac.instance.log; }

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
    if (Blac.enableLog) {
      console.warn(`🚨 [Blac ${String(Blac.instance.createdAt)}]`, message, ...args);
    }
  };
  static get warn() { return Blac.instance.warn; }
  /**
   * Logs an error message
   * @param message - Error message
   * @param args - Additional arguments
   */
  error = (message: string, ...args: unknown[]) => {
    if (Blac.enableLog) {
      console.error(`🚨 [Blac ${String(Blac.instance.createdAt)}]`, message, ...args);
    }
  };
  static get error() { return Blac.instance.error; }

  /**
   * Resets the Blac instance to a new one, disposing non-keepAlive blocs
   * from the old instance.
   */
  resetInstance = (): void => {
    this.log("Reset Blac instance");

    // Create snapshots to avoid concurrent modification issues
    const oldBlocInstanceMap = new Map(this.blocInstanceMap);
    const oldIsolatedBlocMap = new Map(this.isolatedBlocMap);

    // Dispose non-keepAlive blocs from the current instance
    // Use disposeBloc method to ensure proper cleanup
    oldBlocInstanceMap.forEach((bloc) => {
      // TODO: Type assertion for private property access (see explanation above)
      if (!bloc._keepAlive && (bloc as any)._disposalState === 'active') {
        this.disposeBloc(bloc);
      }
    });

    oldIsolatedBlocMap.forEach((blocArray) => {
      blocArray.forEach((bloc) => {
        // TODO: Type assertion for private property access (see explanation above)
        if (!bloc._keepAlive && (bloc as any)._disposalState === 'active') {
          this.disposeBloc(bloc);
        }
      });
    });

    // Clear registries (keep-alive blocs will be re-added by instance manager)
    this.blocInstanceMap.clear();
    this.isolatedBlocMap.clear();
    this.isolatedBlocIndex.clear();

    // Use instance manager to reset
    instanceManager.resetInstance();
  }
  static resetInstance = (): void => {
    instanceManager.resetInstance();
  };

  /**
   * Disposes of a bloc instance by removing it from the appropriate registry
   * @param bloc - The bloc instance to dispose
   */
  disposeBloc = (bloc: BlocBase<unknown>): void => {
    // Check if bloc is already disposed to prevent double disposal
    // TODO: Type assertion needed to access private _disposalState property from external class.
    // This is safe because we know BlocBase has this property, but TypeScript can't verify
    // private property access across class boundaries. Alternative would be to make
    // _disposalState protected, but that would expose internal implementation details.
    if ((bloc as any)._disposalState !== 'active') {
      this.log(`[${bloc._name}:${String(bloc._id)}] disposeBloc called on already disposed bloc`);
      return;
    }

    const base = bloc.constructor as unknown as BlocBaseAbstract;
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.log(`[${bloc._name}:${String(bloc._id)}] disposeBloc called. Isolated: ${String(base.isolated)}`);

    // First dispose the bloc to prevent further operations
    bloc._dispose();
    
    // Then clean up from registries
    if (base.isolated) {
      this.unregisterIsolatedBlocInstance(bloc);
      this.blocInstanceMap.delete(key);
    } else {
      this.unregisterBlocInstance(bloc);
    }
    
    this.log('dispatched bloc', bloc)
  };
  static get disposeBloc() { return Blac.instance.disposeBloc; }

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
    return found
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
    
    // Clean up UID tracking
    this.uidRegistry.delete(bloc.uid);
    
    // Remove from keep-alive set
    this.keepAliveBlocs.delete(bloc);
    
    // Log inconsistency for debugging
    if (wasRemoved !== wasInIndex) {
      this.warn(
        `[Blac] Inconsistent state detected during isolated bloc cleanup for ${bloc._name}:${bloc.uid}. ` +
        `Map removal: ${wasRemoved}, Index removal: ${wasInIndex}`
      );
    }
  }

  /**
   * Finds an isolated bloc instance by its class and ID (O(n) lookup)
   */
  findIsolatedBlocInstance<B extends BlocConstructor<any>>(
    blocClass: B,
    id: BlocInstanceId,
  ): InstanceType<B> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (!base.isolated) return undefined;

    const blocs = this.isolatedBlocMap.get(blocClass);
    if (!blocs) {
      return undefined;
    }
    // Find the specific bloc by ID within the isolated array
    const found = blocs.find((b) => b._id === id) as InstanceType<B> | undefined;
    return found;
  }

  /**
   * Finds an isolated bloc instance by UID (O(1) lookup)
   */
  findIsolatedBlocInstanceByUid<B extends BlocBase<unknown>>(
    uid: string
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
    const { props, instanceRef } = options;
    const newBloc = new blocClass(props as never) as InstanceType<B>;
    newBloc._instanceRef = instanceRef;
    newBloc.props = props || null;
    newBloc._updateId(id);

    // Set up disposal handler to break circular dependency
    newBloc._setDisposalHandler((bloc) => this.disposeBloc(bloc));

    if (newBloc.isIsolated) {
      this.registerIsolatedBlocInstance(newBloc);
      return newBloc;
    }

    this.registerBlocInstance(newBloc);
    return newBloc;
  }


  activateBloc = (bloc: BlocBase<unknown>): void => {
    const base = bloc.constructor as unknown as BlocConstructor<BlocBase<any>>;
    const isIsolated = bloc.isIsolated;

    let found = isIsolated ? this.findIsolatedBlocInstance(base, bloc._id) : this.findRegisteredBlocInstance(base, bloc._id);
    if (found) {
      return;
    }

    this.log(`[${bloc._name}:${String(bloc._id)}] activateBloc called. Isolated: ${String(bloc.isIsolated)}`);
    if (bloc.isIsolated) {
      this.registerIsolatedBlocInstance(bloc);
    } else {
      this.registerBlocInstance(bloc);
    }
  };
  static get activateBloc() { return Blac.instance.activateBloc; }

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
    const { id } = options;
    const base = blocClass as unknown as BlocBaseAbstract;
    const blocId = id ?? blocClass.name;


    if (base.isolated) {
      const isolatedBloc = this.findIsolatedBlocInstance<B>(blocClass, blocId)
      if (isolatedBloc) {
        this.log(`[${blocClass.name}:${String(blocId)}] (getBloc) Found existing isolated instance.`, options);
        return isolatedBloc;
      } else {
        if (options.throwIfNotFound) {
          throw new Error(`Isolated bloc ${blocClass.name} not found`);
        }
      }
    } else {
      const registeredBloc = this.findRegisteredBlocInstance(blocClass, blocId)
      if (registeredBloc) {
        this.log(`[${blocClass.name}:${String(blocId)}] (getBloc) Found existing registered instance.`, options);
        return registeredBloc
      } else {
        if (options.throwIfNotFound) {
          throw new Error(`Registered bloc ${blocClass.name} not found`);
        }
      }
    }

    const bloc = this.createNewBlocInstance(
      blocClass,
      blocId,
      options,
    );
    this.log(`[${blocClass.name}:${String(blocId)}] (getBloc) No existing instance found. Creating new one.`, options, bloc);
    
    if (!bloc) {
      throw new Error(`[getBloc] Failed to create bloc instance for ${blocClass.name}. This should never happen.`);
    }
    
    return bloc;
  };
  static get getBloc() { return Blac.instance.getBloc; }

  /**
   * Gets a bloc instance or throws an error if it doesn't exist
   * @param blocClass - The bloc class to get
   * @param options - Options including:
   *   - id: The instance ID (defaults to class name if not provided)
   *   - props: Properties to pass to the bloc constructor
   *   - instanceRef: Optional reference string for the instance
   */
  getBlocOrThrow = <B extends BlocConstructor<any>>(
    blocClass: B,
    options: {
      id?: BlocInstanceId;
      props?: InferPropsFromGeneric<B>;
      instanceRef?: string;
    } = {},
  ): InstanceType<B> => {
    const isIsolated = (blocClass as unknown as BlocBaseAbstract).isolated;
    const id = options.id || blocClass.name;

    const registered = isIsolated
      ? this.findIsolatedBlocInstance(blocClass, id)
      : this.findRegisteredBlocInstance(blocClass, id);

    if (registered) {
      return registered;
    }
    throw new Error(`Bloc ${blocClass.name} not found`);
  };
  static get getBlocOrThrow() { return Blac.instance.getBlocOrThrow; }

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
    // const blocClassName = (blocClass as any).name; // Temporarily removed for debugging

    // Search non-isolated blocs
    this.blocInstanceMap.forEach((blocInstance) => {
      if (blocInstance.constructor === blocClass) { // Strict constructor check
        results.push(blocInstance as InstanceType<B>);
      }
    });

    // Optionally search isolated blocs
    if (options.searchIsolated !== false) {
      const isolatedBlocs = this.isolatedBlocMap.get(blocClass);
      if (isolatedBlocs) {
        results.push(...isolatedBlocs.map(bloc => bloc as InstanceType<B>));
      }
    }

    return results;
  };

  /**
   * Disposes all keep-alive blocs of a specific type
   * @param blocClass - The bloc class to dispose
   */
  disposeKeepAliveBlocs = <B extends BlocConstructor<any>>(
    blocClass?: B
  ): void => {
    const toDispose: BlocBase<unknown>[] = [];
    
    for (const bloc of this.keepAliveBlocs) {
      if (!blocClass || bloc.constructor === blocClass) {
        toDispose.push(bloc);
      }
    }
    
    toDispose.forEach(bloc => bloc._dispose());
  };
  static get disposeKeepAliveBlocs() { return Blac.instance.disposeKeepAliveBlocs; }

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
    
    toDispose.forEach(bloc => bloc._dispose());
  };
  static get disposeBlocs() { return Blac.instance.disposeBlocs; }

  /**
   * Gets memory usage statistics for debugging
   */
  getMemoryStats = () => {
    return {
      totalBlocs: this.uidRegistry.size,
      registeredBlocs: this.blocInstanceMap.size,
      isolatedBlocs: Array.from(this.isolatedBlocMap.values()).reduce((sum, arr) => sum + arr.length, 0),
      keepAliveBlocs: this.keepAliveBlocs.size,
      isolatedBlocTypes: this.isolatedBlocMap.size,
    };
  };
  static get getMemoryStats() { return Blac.instance.getMemoryStats; }

  /**
   * Validates consumer references and cleans up orphaned consumers
   */
  validateConsumers = (): void => {
    for (const bloc of this.uidRegistry.values()) {
      // Validate consumers using the bloc's own validation method
      bloc._validateConsumers();
      
      // Check if bloc should be disposed after validation
      // TODO: Type assertion for private property access (see explanation above)
      if (bloc._consumers.size === 0 && !bloc._keepAlive && (bloc as any)._disposalState === 'active') {
        // Schedule disposal for blocs with no consumers
        setTimeout(() => {
          // Double-check conditions before disposal
          // TODO: Type assertion for private property access (see explanation above)
          if (bloc._consumers.size === 0 && !bloc._keepAlive && (bloc as any)._disposalState === 'active') {
            this.disposeBloc(bloc);
          }
        }, 1000); // Give a grace period
      }
    }
  };
  static get validateConsumers() { return Blac.instance.validateConsumers; }
}
