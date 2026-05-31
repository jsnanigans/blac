import { useId, useMemo, type ReactNode, type ReactElement } from 'react';
import { BlocProvider as V2BlocProvider } from '@blac/react';
import { getRegistry } from '@blac/core';
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
 * React context. v2 uses args-based providers, so this shim:
 *   1. Allocates a stable per-mount `instanceKey` via `useId()`.
 *   2. Resolves the caller's instance (or factory output) and adopts its
 *      state onto the registry instance keyed by `args: { _compat_id: instanceKey }`
 *      (state is copied with `Object.assign` — a known limitation that
 *      suffices for the v0 call sites but is not safe for blocs with complex
 *      internal references).
 *   3. Renders v2's `BlocProvider` with `args={{ _compat_id: instanceKey }}`
 *      so descendants' `useBloc(C)` (and compat's `useBloc(C)` without an
 *      explicit `id`) resolve to the same registry instance.
 *
 * The registry instance is stored under the structural-hash key derived from
 * `{ _compat_id: instanceKey }` so it matches v2's `useBloc` key derivation.
 */
export function BlocProvider({
  bloc,
  children,
}: BlocProviderProps): ReactElement {
  const reactId = useId();
  const instanceKey = `compat-provider-${reactId}`;

  // Stable args object used both for v2's BlocProvider and for keying the
  // registry instance — the identity is stable (instanceKey never changes).
  const compatArgs = useMemo(
    () => ({ _compat_id: instanceKey }),
    [instanceKey],
  );

  // Resolve + ensure the registry instance, adopting state from the caller's
  // provided instance. We memoize on `bloc` so re-renders with the same prop
  // don't re-run the adoption step.
  const ctor = useMemo<StateContainerConstructor>(() => {
    const inst =
      typeof bloc === 'function'
        ? (bloc as (id: string) => StateContainerInstance)(instanceKey)
        : bloc;
    const resolvedCtor = inst.constructor as StateContainerConstructor;
    // Resolve the same key v2's args-path produces for these args.
    const resolvedKey = getRegistry().resolveKey(
      resolvedCtor,
      undefined,
      compatArgs,
    );
    const registryInstance = getRegistry().ensure(
      resolvedCtor,
      resolvedKey,
      compatArgs,
    ) as StateContainerInstance;
    if (registryInstance !== inst) {
      // Best-effort state adoption — limited to plain own-enumerable props.
      Object.assign(registryInstance, inst);
    }
    return resolvedCtor;
  }, [bloc, instanceKey, compatArgs]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <V2BlocProvider bloc={ctor} args={compatArgs as any}>
      {children}
    </V2BlocProvider>
  );
}
