import { BlocBase } from './BlocBase';
import { BlocClass } from './types';


export class Blac {
  blocMap: Map<BlocClass<BlocBase<any>>, BlocBase<any>> = new Map();
  pluginMap: Map<string, any> = new Map();

  constructor() {
    // register blac instance on global object
    (globalThis as any).blac = this;
  }

  registerBloc(bloc: BlocBase<any>): void {
    this.blocMap.set(bloc.constructor as BlocClass<BlocBase<any>>, bloc);
  }

  getBloc<B extends BlocBase<any>>(blocClass: BlocClass<B>): B | undefined {
    return this.blocMap.get(blocClass) as B | undefined;
  }

  isGlobalBloc(bloc: BlocBase<any>): boolean {
    return this.blocMap.has(bloc.constructor as BlocClass<BlocBase<any>>);
  }
  
  // getGlobal(bloc: BlocClass<any>): BlocBase<any> | undefined {
  //   return this.blocMap.get(bloc.constructor as BlocClass<BlocBase<any>>);
  // }

  addPluginKey(ref: string, value: any): void {
    this.pluginMap.set(ref, value);
  }

  getPluginKey(ref: string): unknown {
    return this.pluginMap.get(ref);
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
