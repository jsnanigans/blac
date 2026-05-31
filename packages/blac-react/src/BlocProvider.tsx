import {
  createContext,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { ExtractArgs, StateContainerConstructor } from '@blac/core';

/**
 * Internal context value: a Map from bloc constructor to the args object
 * provided by the nearest BlocProvider for that bloc class.
 *
 * Stored as a WeakMap-keyed record so nested providers for different blocs
 * compose without clobbering each other.
 */
type ProvidedArgsMap = Map<StateContainerConstructor, unknown>;

const ProvidedArgsContext = createContext<ProvidedArgsMap>(new Map());

/**
 * Props for {@link BlocProvider}.
 */
export interface BlocProviderProps<T extends StateContainerConstructor> {
  /**
   * The bloc class whose args are being provided to descendants.
   */
  bloc: T;
  /**
   * Args that descendant `useBloc(bloc)` calls will resolve to when no
   * own `args` are given.
   */
  args: ExtractArgs<T>;
  children: ReactNode;
}

/**
 * Provides args to descendant `useBloc` calls for a specific bloc class via
 * React context.
 *
 * Descendants calling `useBloc(Bloc)` without their own `args` resolve to the
 * args supplied here. Own `args` on the `useBloc` call always win.
 *
 * Multiple `BlocProvider` wrappers for different bloc classes compose: each
 * provider merges its entry into the inherited map, so nested providers for
 * different blocs do not interfere.
 *
 * @example
 * ```tsx
 * <BlocProvider bloc={UserBloc} args={{ userId: 'alice' }}>
 *   <UserProfile />
 * </BlocProvider>
 * ```
 *
 * @example Per-mount private instance
 * ```tsx
 * const id = useId();
 * <BlocProvider bloc={CartBloc} args={{ _id: id }}>
 *   <CartWidget />
 * </BlocProvider>
 * ```
 */
export function BlocProvider<T extends StateContainerConstructor>({
  bloc,
  args,
  children,
}: BlocProviderProps<T>): ReactElement {
  const parentMap = useContext(ProvidedArgsContext);

  // Merge our entry into a new Map so sibling/parent providers for other blocs
  // are preserved. Memoised on (parentMap, bloc, args) identity.
  const mergedMap = useMemo(() => {
    const next = new Map(parentMap);
    next.set(bloc, args);
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentMap, bloc, args]);

  return (
    <ProvidedArgsContext.Provider value={mergedMap}>
      {children}
    </ProvidedArgsContext.Provider>
  );
}

/**
 * Returns the args provided by the nearest {@link BlocProvider} for the given
 * bloc class, or `undefined` when called outside a matching provider.
 *
 * Used by `useBloc` to inherit provider args when no own `args` are given.
 */
export function useProvidedArgs<T extends StateContainerConstructor>(
  BlocClass: T,
): ExtractArgs<T> | undefined {
  const map = useContext(ProvidedArgsContext);
  return map.get(BlocClass) as ExtractArgs<T> | undefined;
}
