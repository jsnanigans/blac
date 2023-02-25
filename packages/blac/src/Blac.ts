import { BlocBase } from './BlocBase';
import { BlocClass } from './types';

export class Blac {
  blocStack: BlocBase<any>[] = [];
  blocMap: Map<BlocClass<BlocBase<any>>, BlocBase<any>> = new Map();
  pluginMap: Map<string, any> = new Map();

  registerBloc(bloc: BlocBase<any>): void {
    this.blocMap.set(bloc.constructor as BlocClass<BlocBase<any>>, bloc);
  }

  addPluginKey(ref: string, value: any): void {
    this.pluginMap.set(ref, value);
  }

  getPluginKey(ref: string): unknown {
    return this.pluginMap.get(ref);
  }
}
