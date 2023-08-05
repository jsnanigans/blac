import { BlacEvent, BlocBase, BlocInstanceId, BlocProps } from "./BlocBase";
import { BlocBaseAbstract, BlocConstructor } from "./types";

export class Blac {
  static instance: Blac = new Blac();
  blocInstanceMap: Map<string, BlocBase<any>> = new Map();
  pluginMap: Map<string, any> = new Map();

  constructor() {
    if (Blac.instance) {
      return Blac.instance;
    }

    Blac.instance = this;
  }

  report = (event: BlacEvent, bloc: BlocBase<any>) => {
    const base = bloc.constructor as unknown as BlocBaseAbstract;
    switch (event) {
      case BlacEvent.BLOC_DISPOSED:
        this.unregisterBlocInstance(bloc);
        break;
      case BlacEvent.LISTENER_REMOVED:
        if (bloc.observer._observers.size === 0 && !base.keepAlive) bloc.dispose();
        break;
    }
  };

  createBlocInstanceMapKey(blocClassName: string, id?: BlocInstanceId): string {
    return `${blocClassName}${id ? id : ""}`;
  }

  unregisterBlocInstance(bloc: BlocBase<any>): void {
    const key = this.createBlocInstanceMapKey(bloc.name, bloc.id);
    this.blocInstanceMap.delete(key);
  }

  registerBlocInstance(bloc: BlocBase<any>): void {
    const key = this.createBlocInstanceMapKey(bloc.name, bloc.id);
    this.blocInstanceMap.set(key, bloc);
  }

  findRegisteredBlocInstance<B extends BlocBase<any>>(blocClass: BlocConstructor<B>, id: BlocInstanceId): B | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (base.isolated) return undefined;

    const key = this.createBlocInstanceMapKey(blocClass.name, id);
    return this.blocInstanceMap.get(key) as B;
  }

  createNewBlocInstance<B extends BlocBase<any>>(blocClass: BlocConstructor<B>, id: BlocInstanceId, props: BlocProps | undefined): B {
    const base = blocClass as unknown as BlocBaseAbstract;
    try {
      const hasCreateMethod = Object.prototype.hasOwnProperty.call(blocClass, "create");
      base.propsProxy = props;
      const newBloc = hasCreateMethod ? base.create() : new blocClass();
      newBloc.id = id;

      if (base.isolated) {
        return newBloc as B;
      }

      this.registerBlocInstance(newBloc);
      return newBloc as B;
    } catch (e) {
      throw new Error(`Failed to create instance of ${blocClass.name}. ${e}`);
      console.error(e);
    }
  }

  getBloc<B extends BlocBase<any>>(blocClass: BlocConstructor<B>, options: {
    id?: BlocInstanceId;
    props?: BlocProps;
  } = {}): B {
    const registered = this.findRegisteredBlocInstance(blocClass, options.id);
    if (registered) return registered;
    return this.createNewBlocInstance(blocClass, options.id, options.props);
  }

  addPluginKey(ref: string, value: any): void {
    this.pluginMap.set(ref, value);
  }

  getPluginKey(ref: string): unknown {
    return this.pluginMap.get(ref);
  }
}
