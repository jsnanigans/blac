import { BlocBase } from './BlocBase';
import { BlocClass } from './types';

export type BlacGlobalState = {
  [key: string]: BlocBase<any>;  
}

export interface BlacOptions <G extends BlacGlobalState>{
  global?: G;
}


export class Blac <GS extends BlacGlobalState, O extends BlacOptions<GS>>{
  blocMap: Map<BlocClass<BlocBase<any>>, BlocBase<any>> = new Map();
  pluginMap: Map<string, any> = new Map();
  global?: GS;

  constructor(options: O = {} as O) {
    // register blac instance on global object
    (globalThis as any).blac = this;

    if (options.global) {
      this.global = options.global;
      Object.keys(options.global).forEach((key) => {
        const gloBloc = options?.global?.[key] as GS[string];
        if (gloBloc) this.registerBloc(gloBloc);
      });
    }
  }

  registerBloc(bloc: GS[string]): void {
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
    blac?: Blac<any, any>;
  }
  interface GlobalThis {
    blac?: Blac<any, any>;
  }
}
