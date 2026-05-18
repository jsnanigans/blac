import {
  ensure,
  getAll,
  getPluginManager,
  getRegistry,
  type BlacPlugin,
  type StateContainerConstructor,
  type StateContainerInstance,
} from '@blac/core';
import { applyStaticConfig } from './statics';

/**
 * v1 `Blac.getBloc` options. Only `id` and `props` are honored by app code.
 */
export interface GetBlocOptions {
  id?: string;
  props?: unknown;
  instanceRef?: string;
}

class BlacFacade {
  /**
   * Resolve (creating if necessary) the bloc instance for `BlocClass` under
   * the optional `id`. Mirrors v1's `Blac.getBloc(C, { id, props })`.
   *
   * Best-effort props injection: prefers `bloc.initWithProps(props)` when
   * defined, otherwise assigns to the legacy `bloc.props` field on the cubit.
   */
  getBloc<C extends StateContainerConstructor>(
    BlocClass: C,
    options?: GetBlocOptions,
  ): InstanceType<C> {
    applyStaticConfig(BlocClass);
    const instance = ensure(BlocClass, options?.id) as InstanceType<C>;
    if (options?.props !== undefined) {
      this.applyProps(instance, options.props);
    }
    return instance;
  }

  /**
   * v1 `Blac.getAllBlocs(C)` — returns every registered instance for the
   * class. The `searchIsolated` flag is accepted for shape but unused; v2
   * stores isolated instances in the same registry, so they're already
   * included.
   */
  getAllBlocs<C extends StateContainerConstructor>(
    BlocClass: C,
    _options?: { searchIsolated?: boolean },
  ): InstanceType<C>[] {
    return getAll(BlocClass) as unknown as InstanceType<C>[];
  }

  /**
   * v1 `Blac.addPlugin(plugin)` — forwards to v2's plugin manager. Accepts
   * either a v2 `BlacPlugin` directly, or a legacy plugin shape with the
   * same hook names (forwarded unchanged).
   */
  addPlugin(plugin: BlacPlugin): void {
    getPluginManager().install(plugin);
  }

  /**
   * v1 `Blac.resetInstance()` used in a handful of tests. Clears every
   * registered type — only safe in test setup / teardown.
   */
  resetInstance(): void {
    getRegistry().clearAll();
  }

  private applyProps(instance: StateContainerInstance, props: unknown): void {
    const withInit = instance as { initWithProps?: (p: unknown) => void };
    if (typeof withInit.initWithProps === 'function') {
      withInit.initWithProps(props);
      return;
    }
    (instance as unknown as { props: unknown }).props = props;
  }
}

const facade = new BlacFacade();

/**
 * Singleton façade matching the v1 `Blac` import. Methods are bound so that
 * test code can `vi.spyOn(Blac, 'getBloc')` without losing `this`.
 *
 * v1 also exposed `Blac.getInstance()` — preserved as a passthrough.
 */
export const Blac = Object.assign(facade, {
  getInstance: () => facade,
  getBloc: facade.getBloc.bind(facade),
  getAllBlocs: facade.getAllBlocs.bind(facade),
  addPlugin: facade.addPlugin.bind(facade),
  resetInstance: facade.resetInstance.bind(facade),
});

export type BlacFacadeInstance = BlacFacade;
