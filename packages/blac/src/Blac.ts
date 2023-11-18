import { BlocBase, BlocInstanceId } from './BlocBase';
import { BlocBaseAbstract, BlocConstructor } from './types';
import { BlocProps } from './Cubit';
import { BlacPlugin } from './BlacPlugin';

export interface BlacConfig {
  exposeBlacInstance?: boolean;
}

export enum BlacEvent {
  BLOC_DISPOSED = 'BLOC_DISPOSED',
  LISTENER_REMOVED = 'LISTENER_REMOVED',
  LISTENER_ADDED = 'LISTENER_ADDED',
  STATE_CHANGED = 'STATE_CHANGED',
  BLOC_CREATED = 'BLOC_CREATED',
}

export interface EventParams {
  [BlacEvent.BLOC_DISPOSED]: undefined;
  [BlacEvent.LISTENER_REMOVED]: undefined;
  [BlacEvent.LISTENER_ADDED]: undefined;
  [BlacEvent.BLOC_CREATED]: undefined;
  [BlacEvent.STATE_CHANGED]: {
    newState: any;
    oldState: any;
  };
}

export class Blac {
  static instance: Blac = new Blac();
  static getAllBlocs = Blac.instance.getAllBlocs;
  static addPlugin = Blac.instance.addPlugin;
  static configure = Blac.instance.configure;
  blocInstanceMap: Map<string, BlocBase<any>> = new Map();
  isolatedBlocMap: Map<Function, BlocBase<any>[]> = new Map();
  pluginList: BlacPlugin[] = [];
  customPropsMap: Map<Function, BlocProps> = new Map();
  postChangesToDocument = false;

  constructor() {
    if (Blac.instance) {
      return Blac.instance;
    }

    Blac.instance = this;
  }

  static getInstance(): Blac {
    return Blac.instance;
  }

  addPlugin = (plugin: BlacPlugin): void => {
    // check if already added
    const index = this.pluginList.findIndex((p) => p.name === plugin.name);
    if (index !== -1) return;
    this.pluginList.push(plugin);
  };

  reportToPlugins = <B extends BlacEvent>(
    event: B,
    bloc: BlocBase<any>,
    params?: EventParams[B],
  ) => {
    this.pluginList.forEach((plugin) => {
      plugin.onEvent(event, bloc, params);
    });
  };

  report = <B extends BlacEvent>(
    event: B,
    bloc: BlocBase<any>,
    params?: EventParams[B],
  ) => {
    const base = bloc.constructor as unknown as BlocBaseAbstract;

    switch (event) {
      case BlacEvent.BLOC_DISPOSED:
        if (base.isolated) {
          this.unregisterIsolatedBlocInstance(bloc);
        } else {
          this.unregisterBlocInstance(bloc);
        }
        break;
      case BlacEvent.LISTENER_REMOVED:
        if (bloc.observer.size === 0 && !base.keepAlive) bloc.dispose();
        break;
    }

    this.reportToPlugins(event, bloc, params);
  };

  createBlocInstanceMapKey(blocClassName: string, id: BlocInstanceId): string {
    return `${blocClassName}:${id}`;
  }

  unregisterBlocInstance(bloc: BlocBase<any>): void {
    const key = this.createBlocInstanceMapKey(bloc.name, bloc.id);
    this.blocInstanceMap.delete(key);
  }

  registerBlocInstance(bloc: BlocBase<any>): void {
    const key = this.createBlocInstanceMapKey(bloc.name, bloc.id);
    this.blocInstanceMap.set(key, bloc);
  }

  findRegisteredBlocInstance<B extends BlocBase<any>>(
    blocClass: BlocConstructor<B>,
    id: BlocInstanceId,
  ): InstanceType<BlocConstructor<B>> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (base.isolated) return undefined;

    const key = this.createBlocInstanceMapKey(blocClass.name, id);
    return this.blocInstanceMap.get(key) as InstanceType<BlocConstructor<B>>;
  }

  registerIsolatedBlocInstance(bloc: BlocBase<any>): void {
    const blocClass = bloc.constructor;
    const blocs = this.isolatedBlocMap.get(blocClass);
    if (blocs) {
      blocs.push(bloc);
    } else {
      this.isolatedBlocMap.set(blocClass, [bloc]);
    }
  }

  unregisterIsolatedBlocInstance(bloc: BlocBase<any>): void {
    const blocClass = bloc.constructor;
    const blocs = this.isolatedBlocMap.get(blocClass);
    if (blocs) {
      const index = blocs.findIndex((b) => b.id === bloc.id);
      blocs.splice(index, 1);
    }
  }

  setCustomProps(
    blocClass: BlocBaseAbstract,
    props: BlocProps | undefined,
  ): void {
    if (!props) return;
    this.customPropsMap.set(blocClass, props);
  }

  getCustomProps(blocClass: BlocBaseAbstract): BlocProps | undefined {
    return this.customPropsMap.get(blocClass);
  }

  createNewBlocInstance<B extends BlocBase<any>>(
    blocClass: BlocConstructor<B>,
    id: BlocInstanceId,
    props: BlocProps | undefined,
  ): InstanceType<BlocConstructor<B>> {
    const base = blocClass as unknown as BlocBaseAbstract;
    const hasCreateMethod = Object.prototype.hasOwnProperty.call(
      blocClass,
      'create',
    );

    this.setCustomProps(base, props);
    const newBloc = hasCreateMethod ? base.create() : new blocClass();
    newBloc.updateId(id);

    if (base.isolated) {
      this.registerIsolatedBlocInstance(newBloc);
      return newBloc as InstanceType<BlocConstructor<B>>;
    }

    this.registerBlocInstance(newBloc);
    return newBloc as InstanceType<BlocConstructor<B>>;
  }

  getBloc<B extends BlocBase<S>, S>(
    blocClass: BlocConstructor<B>,
    options: {
      id?: BlocInstanceId;
      props?: BlocProps;
    } = {},
  ): InstanceType<BlocConstructor<B>> {
    const id = options.id || blocClass.name;
    const registered = this.findRegisteredBlocInstance(blocClass, id);
    if (registered) return registered;
    return this.createNewBlocInstance(blocClass, id, options.props);
  }

  getAllBlocs = async <B extends BlocBase<any>>(
    blocClass: BlocConstructor<B>,
    options: {
      searchIsolated?: boolean;
    } = {},
  ): Promise<B[]> => {
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

  configure = (config: BlacConfig) => {
    if (config.exposeBlacInstance) {
      // window.__blac = this;
    }
  };
}

declare global {
  interface Window {
    // __blac?: Blac;
  }
}
