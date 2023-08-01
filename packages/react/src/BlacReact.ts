/**
 * Keep track of the hierarchy of Blac BlocProvider components, so that
 * useBloc can find the correct bloc instance.
 */

import { Blac, BlocBase, BlocClass } from "blac/src";
import React from "react";

export interface ProviderItem {
  id: string;
  parent?: string;
  bloc: BlocBase<any>;
}

interface ProviderOptions<B> {
  bloc: BlocClass<B> | (() => B);
  debug?: boolean;
}


export default class BlacReact {
  static pluginKey = "blacReact";
  blac: Blac<any, any>;
  blacContext: React.Context<Blac<any, any>>;
  localContextProvider = React.createContext<BlocBase<any> | null>(null);

  constructor(blac: Blac<any, any>, blacContext: React.Context<Blac<any, any>>) {
    // treat this as singleton
    console.log("create", blac);
    const blacReact = blac.getPluginKey(BlacReact.pluginKey);

    // new setup
    this.blac = blac;
    this.blacContext = blacContext;
    this.setup();

    if (blacReact) {
      return blacReact as BlacReact;
    }
  }

  static safeGetInstance(): BlacReact | undefined {
    const blac = (globalThis as any).blac;
    const blacReact = blac?.getPluginKey(BlacReact.pluginKey);
    return blacReact as BlacReact | undefined;
  }

  static getInstance(throwError = true): BlacReact {
    const blac = (globalThis as any).blac;

    if (!blac) {
      throw new Error("BlacReact: blac instance not found");
    }

    const blacReact = blac.getPluginKey(BlacReact.pluginKey);

    if (!blacReact) {
      throw new Error("BlacReact: blacReact instance not found");
    }

    return blacReact as BlacReact;
  }

  setup() {
    // register blac instance on global object
    (globalThis as any).blac = this.blac;
    console.log(`registered blac instance on globalThis as blac`);

    // add the BlacReact instance to blac
    this.blac.addPluginKey(BlacReact.pluginKey, this);
  }

  /**
   * React hook to get the bloc instance from the nearest BlocProvider
   */
  // useLocalBlocContext() {
  //   return useContext(this.localContextProvider);
  // }

  // private _contextLocalProviderKey = React.createContext<string>('none');
  // get LocalProvider() {
  //   return this._contextLocalProviderKey.Provider;
  // }

  /**
   * React hook to get the id from the nearest BlocProvider
   */
  // useLocalProviderKey() {
  //   return useContext(this._contextLocalProviderKey);
  // }
  //
  // public addLocalBloc = (item: ProviderItem) => {
  //   this.providerList.push(item);
  // };
  //
  // removeLocalBloc = (id: string) => {
  //   const index = this.providerList.findIndex((i) => i.id === id);
  //   if (!index) return;
  //
  //   const item = this.providerList[index];
  //   item.bloc.dispose();
  //   if (index !== -1) {
  //     this.providerList.splice(index, 1);
  //   }
  // };

  // createProviderId = () => {
  //   return Math.random().toString(36).split('.')[1];
  // };

  // public providerList = new Array<ProviderItem>();
  // public getLocalBlocForProvider<B>(
  //   id: string,
  //   blocClass: BlocClass<B>
  // ): BlocBase<B> | undefined {
  //   console.log('getLocalBlocForProvider', id, blocClass, this.providerList)
  //   for (const providerItem of this.providerList) {
  //     if (providerItem.id === id) {
  //       if (providerItem.bloc instanceof blocClass) {
  //         return providerItem.bloc;
  //       }
  //
  //       let parent = providerItem.parent;
  //       while (parent) {
  //         const parentItem = this.providerList.find((i) => i.id === parent);
  //         if (parentItem?.bloc instanceof blocClass) {
  //           return parentItem.bloc;
  //         }
  //
  //         parent = parentItem?.parent;
  //       }
  //     }
  //   }
  //
  //   return undefined;
  // }

  // providerMounted(
  //   options: { providerId: string; localProviderKey?: string } & Parameters<
  //     BlacReact['useLocalProvider']
  //   >[0]
  // ): { instance: BlocBase<any> | undefined; destroyOnUnmount: boolean } {
  //   const { bloc, providerId, localProviderKey } = options;
  //   let instance: undefined | BlocBase<any> = undefined;
  //   let destroyOnUnmount = true;
  //
  //   const isFunction = bloc instanceof Function;
  //   const isLiveBloc =
  //     !isFunction &&
  //     typeof bloc === 'object' &&
  //     (bloc as BlocBase<any>)?.isBlacLive;
  //
  //   if (isFunction) {
  //     instance = (bloc as () => BlocBase<any>)();
  //   }
  //
  //   if (isLiveBloc) {
  //     instance = bloc as unknown as BlocBase<any>;
  //   }
  //
  //   if (instance) {
  //     this.addLocalBloc({
  //       bloc: instance,
  //       id: providerId,
  //       parent: localProviderKey,
  //     });
  //   }
  //
  //   return { instance, destroyOnUnmount };
  // }

  // providerUnmounted(providerId: string | undefined) {
  //   this.removeLocalBloc(providerId as string);
  // }
  //
  // public readonly useLocalProvider = (options: ProviderOptions<any>): string | undefined => {
  //   const [blocInstance, setBlocInstance] = React.useState<
  //     BlocBase<any> | undefined
  //   >(undefined);
  //
  //   const localProviderKey = this.useLocalProviderKey();
  //   const providerId = useMemo(() => this.createProviderId(), []);
  //
  //   useEffect(() => {
  //     const { instance, destroyOnUnmount } = this.providerMounted({
  //       ...options,
  //       localProviderKey,
  //       providerId,
  //     });
  //     setBlocInstance(instance);
  //
  //     if (destroyOnUnmount) return this.providerUnmounted(providerId);
  //   }, []);
  //
  //   if (blocInstance) return providerId;
  // };
}
