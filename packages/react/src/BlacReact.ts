/**
 * Keep track of the hierarchy of Blac BlocProvider components, so that
 * useBloc can find the correct bloc instance.
 */

import { Blac, BlocBase, BlocClass } from 'blac';
import React, { useContext } from 'react';

export interface ProviderItem {
  id: string;
  parent?: string;
  bloc: BlocBase<any>;
}

export default class BlacReact {
  blac: Blac;
  blacContext: React.Context<Blac>;
  localContextProvider = React.createContext<BlocBase<any> | null>(null);
  static pluginKey = 'blacReact';

  constructor(blac: Blac, blacContext: React.Context<Blac>) {
    // treat this as singleton
    const blacReact = blac.getPluginKey(BlacReact.pluginKey);

    if (blacReact) {
      return blacReact as BlacReact;
    }

    // new setup
    this.blac = blac;
    this.blacContext = blacContext;
    this.setup();
  }

  static getInstance(): BlacReact {
    const blac = globalThis.blac;

    if (!blac) {
      throw new Error('BlacReact: blac instance not found');
    }

    const blacReact = blac.getPluginKey(BlacReact.pluginKey);

    if (!blacReact) {
      throw new Error('BlacReact: blacReact instance not found');
    }

    return blacReact as BlacReact;
  }

  setup() {
    // register blac instance on global object
    globalThis.blac = this.blac;

    // add the BlacReact instance to blac
    this.blac.addPluginKey(BlacReact.pluginKey, this);
  }

  findGlobalBloc<B extends BlocBase<any>>(blocClass: BlocClass<B>): BlocBase<B> | undefined {
    return this.blac.blocMap.get(blocClass) as BlocBase<B>;
  }

  useLocalBlocContext() {
    return useContext(this.localContextProvider);
  }

  private _contextLocalProviderKey = React.createContext<string>("none");
  get LocalProvider() {
    return this._contextLocalProviderKey.Provider;
  }
  useLocalProviderKey() {
    return useContext(this._contextLocalProviderKey);
  }


  public addLocalBloc(item: ProviderItem) {
    this.providerList.push(item);
    // item.bloc.consumer = this;
    // item.bloc.registerListeners.forEach((fn) => fn(this, item.bloc));
    // item.bloc.meta.scope = "local";
    // this.observer.addBlocAdded(item.bloc);

    console.log("addLocalBloc", item)
  }

  public providerList = new Array<ProviderItem>();
  public getLocalBlocForProvider<B>(
    id: string,
    blocClass: BlocClass<B>
  ): BlocBase<B> | undefined {
    for (const providerItem of this.providerList) {
      if (providerItem.id === id) {
        if (providerItem.bloc instanceof blocClass) {
          return providerItem.bloc;
        }

        let parent = providerItem.parent;
        while (parent) {
          const parentItem = this.providerList.find((i) => i.id === parent);
          if (parentItem?.bloc instanceof blocClass) {
            return parentItem.bloc;
          }

          parent = parentItem?.parent;
        }
      }
    }

    return undefined;
  }
}
