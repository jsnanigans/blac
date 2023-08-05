import type { BlocBase } from "./BlocBase";
import { BlacEvent } from "./BlocBase";
import { BlocBaseAbstract, BlocConstructor } from "./types";


export class Blac {
  static instance: Blac = new Blac();
  blocMap: Map<BlocConstructor<BlocBase<any>>, BlocBase<any>> = new Map();
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
        this.unregisterBloc(bloc);
        break;
      case BlacEvent.LISTENER_REMOVED:
        if (bloc.observer._observers.size === 0 && !base.keepAlive) bloc.dispose();
        break;
    }
  };

  unregisterBloc(bloc: BlocBase<any>): void {
    this.blocMap.delete(bloc.constructor as BlocConstructor<BlocBase<any>>);
  }

  registerBloc(bloc: BlocBase<any>): void {
    this.blocMap.set(bloc.constructor as BlocConstructor<BlocBase<any>>, bloc);
  }

  createNewInstance<B extends BlocBase<any>>(blocClass: BlocConstructor<B>): B | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    const allowMultipleInstances = base.allowMultipleInstances;
    try {
      const hasCreateMethod = Object.prototype.hasOwnProperty.call(blocClass, "create");
      const newBloc = hasCreateMethod ? base.create() : new blocClass();
      if (!allowMultipleInstances) {
        this.registerBloc(newBloc);
      }
      return newBloc as B;
    } catch (e) {
      console.error(e);
    }
  }

  getBloc<B extends BlocBase<any>>(blocClass: BlocConstructor<B>): B | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    const allowMultipleInstances = base.allowMultipleInstances;

    if (allowMultipleInstances) {
      return this.createNewInstance(blocClass);
    }

    const registered = this.blocMap.get(blocClass) as B | undefined;
    if (registered) return registered;
    return this.createNewInstance(blocClass);
  }

  addPluginKey(ref: string, value: any): void {
    this.pluginMap.set(ref, value);
  }

  getPluginKey(ref: string): unknown {
    return this.pluginMap.get(ref);
  }
}
