import { ensure } from '@blac/core';
import type {
  StateContainerConstructor,
  StateContainerInstance,
} from '@blac/core';
import { BlocObserver } from './BlocObserver';
import { BlocProvider } from './BlocProvider';
import { useBloc } from './useBloc';

export interface BlacReactOptions {
  observer?: BlocObserver;
}

/**
 * v0 `BlacReact` adapter. v0's root container was constructed with an array
 * of pre-built bloc instances and an optional observer; this shim adopts
 * each instance into v2's global registry under its default key, copying
 * own-enumerable fields onto whichever instance the registry already holds.
 *
 * Known limitation. v0's container truly scoped its blocs to a per-instance
 * world. v2 has a single global registry per process; if two `BlacReact`
 * roots ever coexist in the same runtime, they will share state. None of
 * `user-fe-reviews`'s apps run two roots in the same bundle today.
 */
export class BlacReact {
  // Destructured off the instance by v0 consumers: `const { useBloc } = state;`
  useBloc = useBloc;
  BlocProvider = BlocProvider;

  constructor(blocs: StateContainerInstance[], _options?: BlacReactOptions) {
    for (const bloc of blocs) {
      const ctor = bloc.constructor as StateContainerConstructor;
      const registryInstance = ensure(ctor) as StateContainerInstance;
      if (registryInstance !== bloc) {
        Object.assign(registryInstance, bloc);
      }
    }
    // observer self-installs via its constructor; nothing else to do here.
  }
}
