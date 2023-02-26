import { BlocBase } from './BlocBase';
import { BlocClass } from './types';


export class Blac {
  blocStack: BlocBase<any>[] = [];
  blocMap: Map<BlocClass<BlocBase<any>>, BlocBase<any>> = new Map();
  pluginMap: Map<string, any> = new Map();

  constructor() {
    // register blac instance on global object
    window.blac = this;
  }

  registerBloc(bloc: BlocBase<any>): void {
    this.blocMap.set(bloc.constructor as BlocClass<BlocBase<any>>, bloc);
  }

  addPluginKey(ref: string, value: any): void {
    this.pluginMap.set(ref, value);
  }

  getPluginKey(ref: string): unknown {
    return this.pluginMap.get(ref);
  }

  isGlobalBloc(bloc: BlocBase<any>): boolean {
    return this.blocMap.has(bloc.constructor as BlocClass<BlocBase<any>>);
  }
}

// declare blac instance on global object
declare global {
  interface Window {
    blac?: Blac;
  }
  interface GlobalThis {
    blac?: Blac;
  }
}
