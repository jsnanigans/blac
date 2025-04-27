import { BlacPlugin } from "./BlacPlugin";
import { BlocBase, BlocInstanceId } from "./BlocBase";
import {
  BlocBaseAbstract,
  BlocConstructor,
  InferPropsFromGeneric,
} from "./types";

/**
 * Configuration options for the Blac instance
 */
export interface BlacConfig {
  /** Whether to expose the Blac instance globally */
  exposeBlacInstance?: boolean;
}

/**
 * Enum representing different lifecycle events that can occur in the Blac system.
 * These events are used to track the lifecycle of blocs and their consumers.
 */
export enum BlacLifecycleEvent {
  BLOC_DISPOSED = "BLOC_DISPOSED",
  BLOC_CREATED = "BLOC_CREATED",
  LISTENER_REMOVED = "LISTENER_REMOVED",
  LISTENER_ADDED = "LISTENER_ADDED",
  STATE_CHANGED = "STATE_CHANGED",
  BLOC_CONSUMER_REMOVED = "BLOC_CONSUMER_REMOVED",
  BLOC_CONSUMER_ADDED = "BLOC_CONSUMER_ADDED",
}

/**
 * Main Blac class that manages the state management system.
 * Implements a singleton pattern to ensure only one instance exists.
 * Handles bloc lifecycle, plugin management, and instance tracking.
 * 
 * Key responsibilities:
 * - Managing bloc instances (creation, disposal, lookup)
 * - Handling isolated and non-isolated blocs
 * - Managing plugins and lifecycle events
 * - Providing logging and debugging capabilities
 */
export class Blac {
  /** The singleton instance of Blac */
  static instance: Blac = new Blac();
  /** Timestamp when the instance was created */
  createdAt = Date.now();
  static getAllBlocs = Blac.instance.getAllBlocs;
  static addPlugin = Blac.instance.addPlugin;
  /** Map storing all registered bloc instances by their class name and ID */
  blocInstanceMap: Map<string, BlocBase<any, any>> = new Map();
  /** Map storing isolated bloc instances grouped by their constructor */
  isolatedBlocMap: Map<Function, BlocBase<any, any>[]> = new Map();
  pluginList: BlacPlugin[] = [];
  /** Flag to control whether changes should be posted to document */
  postChangesToDocument = false;

  /**
   * Creates a new Blac instance.
   * @param options - Configuration options including singleton control
   */
  constructor(options: { __unsafe_ignore_singleton?: boolean } = {}) {
    const { __unsafe_ignore_singleton = false } = options;
    if (Blac.instance && !__unsafe_ignore_singleton) {
      return Blac.instance;
    }
    Blac.instance = this;
  }

  /** Flag to enable/disable logging */
  static enableLog = true;

  /**
   * Logs messages to console when logging is enabled
   * @param args - Arguments to log
   */
  log = (...args: any[]) => {
    if (Blac.enableLog) console.warn(`☢️ [Blac ${this.createdAt}]`, ...args);
  };

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
  static warn = (message: string, ...args: unknown[]) => {
    console.warn(`🚨 [Blac ${Blac.instance.createdAt}]`, message, ...args);
  };

  /**
   * Logs an error message
   * @param message - Error message
   * @param args - Additional arguments
   */
  static error = (message: string, ...args: unknown[]) => {
    console.error(`🚨 [Blac ${Blac.instance.createdAt}]`, message, ...args);
  };

  /**
   * Resets the Blac instance to a new one
   */
  resetInstance = (): void => {
    this.log("Reset Blac instance");
    Blac.instance = new Blac({
      __unsafe_ignore_singleton: true,
    });
  }
  static resetInstance = Blac.instance.resetInstance;

  /**
   * Adds a plugin to the Blac instance
   * @param plugin - The plugin to add
   */
  addPlugin = (plugin: BlacPlugin): void => {
    // check if already added
    const index = this.pluginList.findIndex((p) => p.name === plugin.name);
    if (index !== -1) return;
    this.log("Add plugin", plugin.name);
    this.pluginList.push(plugin);
  };

  /**
   * Dispatches a lifecycle event to all registered plugins
   * @param event - The lifecycle event to dispatch
   * @param bloc - The bloc instance involved in the event
   * @param params - Additional parameters for the event
   */
  dispatchEventToPlugins = <B extends BlacLifecycleEvent>(
    event: B,
    bloc: BlocBase<any, any>,
    params?: any,
  ) => {
    this.pluginList.forEach((plugin) => {
      plugin.onEvent(event, bloc, params);
    });
  };

  /**
   * Dispatches a lifecycle event and handles related cleanup actions.
   * This method is responsible for:
   * - Logging the event
   * - Handling bloc disposal when needed
   * - Managing bloc consumer cleanup
   * - Forwarding the event to plugins
   * 
   * @param event - The lifecycle event to dispatch
   * @param bloc - The bloc instance involved in the event
   * @param params - Additional parameters for the event
   */
  dispatchEvent = <B extends BlacLifecycleEvent>(
    event: B,
    bloc: BlocBase<any, any>,
    params?: any,
  ) => {
    this.log(event, bloc, params);

    switch (event) {
      case BlacLifecycleEvent.BLOC_DISPOSED:
        this.disposeBloc(bloc);
        break;
      case BlacLifecycleEvent.BLOC_CONSUMER_REMOVED:
      case BlacLifecycleEvent.LISTENER_REMOVED:
        this.log(`[${bloc._name}:${bloc._id}] Listener/Consumer removed. Listeners: ${bloc._observer.size}, Consumers: ${bloc._consumers.size}, KeepAlive: ${bloc._keepAlive}`);
        if (
          bloc._observer.size === 0 &&
          bloc._consumers.size === 0 &&
          !bloc._keepAlive
        ) {
          this.log(`[${bloc._name}:${bloc._id}] No listeners or consumers left and not keepAlive. Disposing.`);
          bloc._dispose();
        }
        break;
    }

    this.dispatchEventToPlugins(event, bloc, params);
  };

  /**
   * Disposes of a bloc instance by removing it from the appropriate registry
   * @param bloc - The bloc instance to dispose
   */
  disposeBloc = (bloc: BlocBase<any, any>): void => {
    const base = bloc.constructor as unknown as BlocBaseAbstract;
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.log(`[${bloc._name}:${bloc._id}] disposeBloc called. Isolated: ${base.isolated}`);

    if (base.isolated) {
      this.unregisterIsolatedBlocInstance(bloc);
      this.blocInstanceMap.delete(key);
    } else {
      this.unregisterBlocInstance(bloc);
    }
    this.dispatchEventToPlugins(BlacLifecycleEvent.BLOC_DISPOSED, bloc);
  };

  /**
   * Creates a unique key for a bloc instance in the map based on the bloc class name and instance ID
   * @param blocClassName - The name of the bloc class
   * @param id - The instance ID
   * @returns A unique key string in the format "className:id"
   */
  createBlocInstanceMapKey(blocClassName: string, id: BlocInstanceId): string {
    return `${blocClassName}:${id}`;
  }

  /**
   * Unregisters a bloc instance from the main registry
   * @param bloc - The bloc instance to unregister
   */
  unregisterBlocInstance(bloc: BlocBase<any, any>): void {
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.blocInstanceMap.delete(key);
  }

  /**
   * Registers a bloc instance in the main registry
   * @param bloc - The bloc instance to register
   */
  registerBlocInstance(bloc: BlocBase<any, any>): void {
    const key = this.createBlocInstanceMapKey(bloc._name, bloc._id);
    this.blocInstanceMap.set(key, bloc);
  }

  /**
   * Finds a registered bloc instance by its class and ID
   * @param blocClass - The bloc class to search for
   * @param id - The instance ID
   * @returns The found bloc instance or undefined if not found
   */
  findRegisteredBlocInstance<B extends BlocBase<any, any>>(
    blocClass: BlocConstructor<B>,
    id: BlocInstanceId,
  ): InstanceType<BlocConstructor<B>> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (base.isolated) return undefined;

    const key = this.createBlocInstanceMapKey(blocClass.name, id);
    const found = this.blocInstanceMap.get(key) as InstanceType<
      BlocConstructor<B>
    >;
    if (found) {
      this.log(`[${blocClass.name}:${id}] Found registered instance. Returning.`);
    }
    return found;
  }

  /**
   * Registers an isolated bloc instance in the isolated registry
   * @param bloc - The isolated bloc instance to register
   */
  registerIsolatedBlocInstance(bloc: BlocBase<any, any>): void {
    const blocClass = bloc.constructor;
    const blocs = this.isolatedBlocMap.get(blocClass);
    if (blocs) {
      blocs.push(bloc);
    } else {
      this.isolatedBlocMap.set(blocClass, [bloc]);
    }
  }

  /**
   * Unregisters an isolated bloc instance from the isolated registry
   * @param bloc - The isolated bloc instance to unregister
   */
  unregisterIsolatedBlocInstance(bloc: BlocBase<any, any>): void {
    const blocClass = bloc.constructor;
    const blocs = this.isolatedBlocMap.get(blocClass);
    if (blocs) {
      const index = blocs.findIndex((b) => b._id === bloc._id);
      blocs.splice(index, 1);

      if (blocs.length === 0) {
        this.isolatedBlocMap.delete(blocClass);
      }
    }
  }

  /**
   * Finds an isolated bloc instance by its class and ID
   * @param blocClass - The bloc class to search for
   * @param id - The instance ID
   * @returns The found isolated bloc instance or undefined if not found
   */
  findIsolatedBlocInstance<B extends BlocBase<any, any>>(
    blocClass: BlocConstructor<B>,
    id: BlocInstanceId,
  ):
    | InstanceType<BlocConstructor<B>>
    | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (!base.isolated) return undefined;

    const blocs = this.isolatedBlocMap.get(blocClass);
    if (!blocs) return undefined;

    // Fix: Find the specific bloc by ID within the isolated array
    const found = blocs.find((b) => b._id === id) as InstanceType<
      BlocConstructor<B>
    >;

    if (found) {
      this.log(`[${blocClass.name}:${id}] Found isolated instance. Returning.`);
    }
    return found;
  }

  /**
   * Creates a new bloc instance and registers it in the appropriate registry
   * @param blocClass - The bloc class to instantiate
   * @param id - The instance ID
   * @param props - Properties to pass to the bloc constructor
   * @param instanceRef - Optional reference string for the instance
   * @returns The newly created bloc instance
   */
  createNewBlocInstance<B extends BlocBase>(
    blocClass: BlocConstructor<B>,
    id: BlocInstanceId,
    props?: InferPropsFromGeneric<B>,
    instanceRef?: string,
  ): InstanceType<BlocConstructor<B>> {
    const base = blocClass as unknown as BlocBaseAbstract;

    const newBloc = new blocClass(props as never);
    newBloc._instanceRef = instanceRef;
    newBloc.props = props || null;
    newBloc._updateId(id);

    if (base.isolated) {
      this.registerIsolatedBlocInstance(newBloc);
      return newBloc as InstanceType<BlocConstructor<any>>;
    }

    this.registerBlocInstance(newBloc);
    return newBloc as InstanceType<BlocConstructor<any>>;
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
  getBloc = <B extends BlocConstructor<any>>(
    blocClass: B,
    options: {
      id?: BlocInstanceId;
      props?: InferPropsFromGeneric<B>;
      instanceRef?: string;
    } = {},
  ): InstanceType<B> => {
    const { id, props, instanceRef } = options;
    const base = blocClass as unknown as BlocBaseAbstract;
    const blocId = id ?? blocClass.name;

    this.log(`[${blocClass.name}:${blocId}] getBloc called. Options:`, options);

    let blocInstance: InstanceType<B> | undefined;

    if (base.isolated) {
      blocInstance = this.findIsolatedBlocInstance(blocClass, blocId);
      if (blocInstance) {
        this.log(`[${blocClass.name}:${blocId}] Found existing isolated instance.`);
        return blocInstance;
      }
    }

    if (!blocInstance && !base.isolated) {
      blocInstance = this.findRegisteredBlocInstance(blocClass, blocId);
      if (blocInstance) {
        this.log(`[${blocClass.name}:${blocId}] Found existing registered instance.`);
        return blocInstance;
      }
    }

    this.log(`[${blocClass.name}:${blocId}] No existing instance found. Creating new one.`);
    return this.createNewBlocInstance(
      blocClass,
      blocId,
      props as any,
      instanceRef,
    );
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
  getBlocOrThrow = <B extends BlocConstructor<any>>(
    blocClass: B,
    options: {
      id?: BlocInstanceId;
      props?: InferPropsFromGeneric<B>;
      instanceRef?: string;
    } = {},
  ): InstanceType<B> => {
    const isIsolated = (blocClass as InstanceType<B>).isolated;
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
  getAllBlocs = <B extends BlocBase<any, any>>(
    blocClass: BlocConstructor<B>,
    options: {
      searchIsolated?: boolean;
    } = {},
  ): B[] => {
    const base = blocClass as unknown as BlocBaseAbstract;

    const { searchIsolated = base.isolated } = options;

    if (searchIsolated) {
      const blocs = this.isolatedBlocMap.get(blocClass);
      if (blocs) return blocs as B[];
    } else {
      const blocs = Array.from(this.blocInstanceMap.values());
      return blocs.filter((b) => b instanceof blocClass) as B[];
    }
    return [];
  };
}
