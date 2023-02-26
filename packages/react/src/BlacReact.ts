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
    
    // new setup
    this.blac = blac;
    this.blacContext = blacContext;
    this.setup();

    if (blacReact) {
      return blacReact as BlacReact;
    }
  }

  static getInstance(): BlacReact {
    const blac = (globalThis as any).blac;

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
    (globalThis as any).blac = this.blac;

    // add the BlacReact instance to blac
    this.blac.addPluginKey(BlacReact.pluginKey, this);
  }

  useLocalBlocContext() {
    return useContext(this.localContextProvider);
  }

  private _contextLocalProviderKey = React.createContext<string>('none');
  get LocalProvider() {
    return this._contextLocalProviderKey.Provider;
  }
  useLocalProviderKey() {
    return useContext(this._contextLocalProviderKey);
  }

  public addLocalBloc = (item: ProviderItem) => {
    this.providerList.push(item);
  };

  removeLocalBloc = (id: string) => {
    const index = this.providerList.findIndex((i) => i.id === id);
    if (!index) return;

    const item = this.providerList[index];
    item.bloc.dispose();
    if (index !== -1) {
      this.providerList.splice(index, 1);
    }
  };

  createProviderId = () => {
    return Math.random().toString(36).split('.')[1];
  };

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
