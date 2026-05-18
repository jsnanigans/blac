import { useId, useMemo, type ReactNode, type ReactElement } from 'react';
import { BlocProvider as V2BlocProvider } from '@blac/react';
import { ensure } from '@blac/core';
import type {
  StateContainerConstructor,
  StateContainerInstance,
} from '@blac/core';

type BlocOrFactory =
  | StateContainerInstance
  | ((id: string) => StateContainerInstance);

export interface BlocProviderProps {
  bloc: BlocOrFactory;
  children: ReactNode;
}

/**
 * v0 `<BlocProvider bloc={instance | factory}>` adapter.
 *
 * v0 scoped its `bloc` prop to descendants by passing the *instance* through
 * React context. v2 uses E1's id-based provider, so this shim:
 *   1. Allocates a stable per-mount `instanceKey` via `useId()`.
 *   2. Resolves the caller's instance (or factory output) and adopts its
 *      state onto the registry instance keyed by that id (state is copied
 *      with `Object.assign` — a known limitation that suffices for the 3 v0
 *      call sites in user-fe but is not safe for blocs with complex internal
 *      references).
 *   3. Renders v2's `BlocProvider` so descendants' `useBloc(C)` resolves to
 *      the same registry instance.
 */
export function BlocProvider({
  bloc,
  children,
}: BlocProviderProps): ReactElement {
  const reactId = useId();
  const instanceKey = `compat-provider-${reactId}`;

  useMemo(() => {
    const inst =
      typeof bloc === 'function'
        ? (bloc as (id: string) => StateContainerInstance)(instanceKey)
        : bloc;
    const ctor = inst.constructor as StateContainerConstructor;
    const registryInstance = ensure(
      ctor,
      instanceKey,
    ) as StateContainerInstance;
    if (registryInstance !== inst) {
      // Best-effort state adoption — limited to plain own-enumerable props.
      Object.assign(registryInstance, inst);
    }
  }, [bloc, instanceKey]);

  return <V2BlocProvider instanceId={instanceKey}>{children}</V2BlocProvider>;
}
