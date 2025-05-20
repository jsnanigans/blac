/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface GetBlocOptions<B extends BlocBase<any>> {
  id?: string;
  selector?: BlocHookDependencyArrayFn<BlocState<B>>;
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
  instanceRef?: string;
  throwIfNotFound?: boolean;
}

/**
 * Main Blac class that manages the state management system.
 * Implements a singleton pattern to ensure only one instance exists.
 * Handles bloc lifecycle, and instance tracking.
 * 
 * Key responsibilities:
 * - Managing bloc instances (creation, disposal, lookup)
 * - Handling isolated and non-isolated blocs
 * - Providing logging and debugging capabilities
 */
export class Blac {
  /** The singleton instance of Blac */
  static instance: Blac = new Blac();
  /** Timestamp when the instance was created */
  createdAt = Date.now();
  static getAllBlocs = Blac.instance.getAllBlocs;
  /** Map storing all registered bloc instances by their class name and ID */
  blocInstanceMap: Map<string, BlocBase<any>> = new Map();
  /** Map storing isolated bloc instances grouped by their constructor */
  isolatedBlocMap: Map<BlocConstructor<any>, Map<BlocInstanceId, BlocBase<any>>> = new Map();
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
    Blac.instance = this;
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
  static log = Blac.instance.log;

  /**
   * Gets the singleton instance of Blac
   * @returns The Blac instance
   */
  static getInstance(): Blac {
    return Blac.instance;
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
  static warn = Blac.instance.warn;
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
  static error = Blac.instance.error;

  /**
   * Resets the Blac instance to a new one, disposing non-keepAlive blocs
   * from the old instance.
   */
  resetInstance = (): void => {
    this.log("Reset Blac instance");

    // Dispose non-keepAlive blocs from the current instance
    const oldBlocInstanceMap = new Map(this.blocInstanceMap);
    const oldIsolatedBlocMap = new Map(this.isolatedBlocMap);

    oldBlocInstanceMap.forEach((bloc) => {
      bloc._dispose();
    });

    oldIsolatedBlocMap.forEach((blocMap) => {
      blocMap.forEach((bloc) => {
        bloc._dispose();
      });
    });

    this.blocInstanceMap.clear();
    this.isolatedBlocMap.clear();

    // Create and assign the new instance
    Blac.instance = new Blac({
      __unsafe_ignore_singleton: true,
    });
  }
  static resetInstance = Blac.instance.resetInstance;

  /**
   * Disposes of a bloc instance by removing it from the appropriate registry
   * @param bloc - The bloc instance to dispose
   */
  disposeBloc = (bloc: BlocBase<any>): void => {
    const base = bloc.constructor as unknown as BlocBaseAbstract;
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.log(`[${bloc._name}:${String(bloc._id)}] disposeBloc called. Isolated: ${String(base.isolated)}`);

    if (base.isolated) {
      this.unregisterIsolatedBlocInstance(bloc);
      this.blocInstanceMap.delete(key);
    } else {
      this.unregisterBlocInstance(bloc);
    }
    this.log('dispatched bloc', bloc)
  };

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
  unregisterBlocInstance(bloc: BlocBase<any>): void {
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.blocInstanceMap.delete(key);
  }

  /**
   * Registers a bloc instance in the main registry
   * @param bloc - The bloc instance to register
   */
  registerBlocInstance(bloc: BlocBase<any>): void {
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.blocInstanceMap.set(key, bloc);
  }

  /**
   * Finds a registered bloc instance by its class and ID
   * @param blocClass - The bloc class to search for
   * @param id - The instance ID
   * @returns The found bloc instance or undefined if not found
   */
  findRegisteredBlocInstance<B extends BlocConstructor<unknown>>(
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
  registerIsolatedBlocInstance(bloc: BlocBase<any>): void {
    const blocClass = bloc.constructor as BlocConstructor<unknown>;
    let blocMap = this.isolatedBlocMap.get(blocClass);
    if (!blocMap) {
      blocMap = new Map();
      this.isolatedBlocMap.set(blocClass, blocMap);
    }
    blocMap.set(bloc._id, bloc);
  }

  /**
   * Unregister an isolated bloc instance from the isolated registry
   * @param bloc - The isolated bloc instance to unregister
   */
  unregisterIsolatedBlocInstance(bloc: BlocBase<any>): void {
    const blocClass = bloc.constructor as BlocConstructor<unknown>;
    const map = this.isolatedBlocMap.get(blocClass);
    if (!map) return;
    map.delete(bloc._id);
    if (map.size === 0) {
      this.isolatedBlocMap.delete(blocClass);
    }
  }

  /**
   * Finds an isolated bloc instance by its class and ID
   */
  findIsolatedBlocInstance<B extends BlocConstructor<unknown>>(
    blocClass: B,
    id: BlocInstanceId,
  ): InstanceType<B> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (!base.isolated) return undefined;

    const blocMap = this.isolatedBlocMap.get(blocClass);
    if (!blocMap) {
      return undefined;
    }
    return blocMap.get(id) as InstanceType<B> | undefined;
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
    const newBloc = new blocClass(props as never) as InstanceType<BlocConstructor<BlocBase<unknown>>>;
    newBloc._instanceRef = instanceRef;
    newBloc.props = props || null;
    newBloc._updateId(id);

    if (newBloc.isIsolated) {
      this.registerIsolatedBlocInstance(newBloc);
      return newBloc as InstanceType<B>;
    }

    this.registerBlocInstance(newBloc);
    return newBloc as InstanceType<B>;
  }


  activateBloc = (bloc: BlocBase<any>): void => {
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
  static activateBloc = Blac.instance.activateBloc;

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
    return bloc;
  };
  static getBloc = Blac.instance.getBloc;

  /**
   * Gets a bloc instance or throws an error if it doesn't exist
   * @param blocClass - The bloc class to get
   * @param options - Options including:
   *   - id: The instance ID (defaults to class name if not provided)
   *   - props: Properties to pass to the bloc constructor
   *   - instanceRef: Optional reference string for the instance
   */
  getBlocOrThrow = <B extends BlocConstructor<unknown>>(
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
  static getBlocOrThrow = Blac.instance.getBlocOrThrow;

  /**
   * Gets all instances of a specific bloc class
   * @param blocClass - The bloc class to search for
   * @param options - Options including:
   *   - searchIsolated: Whether to search in isolated blocs (defaults to bloc's isolated property)
   * @returns Array of matching bloc instances
   */
  getAllBlocs = <B extends BlocConstructor<unknown>>(
    blocClass: B,
    options: {
      searchIsolated?: boolean;
    } = {},
  ): InstanceType<B>[] => {
    const base = blocClass as unknown as BlocBaseAbstract;

    // Fast path for isolated blocs - they can't exist in the main map
    if (base.isolated && options.searchIsolated !== false) {
      const isolatedBlocs = this.isolatedBlocMap.get(blocClass);
      if (!isolatedBlocs) return [];
      const results: InstanceType<B>[] = [];
      isolatedBlocs.forEach((bloc) => {
        results.push(bloc as InstanceType<B>);
      });
      return results;
    }

    const results: InstanceType<B>[] = [];

    // Search non-isolated blocs
    this.blocInstanceMap.forEach((blocInstance) => {
      if (blocInstance.constructor === blocClass) {
        results.push(blocInstance as InstanceType<B>);
      }
    });

    // Optionally search isolated blocs
    if (options.searchIsolated !== false) {
      const isolatedBlocs = this.isolatedBlocMap.get(blocClass);
      if (isolatedBlocs) {
        isolatedBlocs.forEach((bloc) => {
          results.push(bloc as InstanceType<B>);
        });
      }
    }

    return results;
  };
}
