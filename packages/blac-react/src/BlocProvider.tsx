import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { ExtractArgs, StateContainerConstructor } from '@blac/core';

/**
 * Internal context value: a Map from bloc constructor to the args object
 * provided by the nearest BlocProvider for that bloc class.
 *
 * Each provider copies its parent's map and adds its own entry, so nested
 * providers for different blocs compose without clobbering each other.
 */
type ProvidedArgsMap = Map<StateContainerConstructor, unknown>;

const ProvidedArgsContext = createContext<ProvidedArgsMap>(new Map());

/**
 * Props for {@link BlocProvider}.
 * @public
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
 * React context. Own `args` on the `useBloc` call always win.
 *
 * Multiple `BlocProvider` wrappers for different bloc classes compose: each
 * merges its entry into the inherited map, so nested providers for different
 * blocs do not interfere.
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
 * @public
 */
export function BlocProvider<T extends StateContainerConstructor>({
  bloc,
  args,
  children,
}: BlocProviderProps<T>): ReactElement {
  const parentMap = useContext(ProvidedArgsContext);

  // Same content keeps the previous object, so an inline `args={{ ... }}`
  // literal does not rebuild the map (and re-render every consumer) on every
  // render, while a real field change still reaches `useProvidedArgs`.
  const stable = useRef(args);
  if (!sameArgs(stable.current, args)) stable.current = args;
  const stableArgs = stable.current;

  // Merge our entry into a new Map so sibling/parent providers for other blocs
  // are preserved.
  const mergedMap = useMemo(() => {
    const next = new Map(parentMap);
    next.set(bloc, stableArgs);
    return next;
  }, [parentMap, bloc, stableArgs]);

  return (
    <ProvidedArgsContext.Provider value={mergedMap}>
      {children}
    </ProvidedArgsContext.Provider>
  );
}

/** Plain objects and arrays compare by content, everything else by identity. */
function sameArgs(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!isObject(a) || !isObject(b)) return false;
  const proto = Object.getPrototypeOf(a);
  if (proto !== Object.getPrototypeOf(b)) return false;
  if (proto !== Object.prototype && proto !== Array.prototype) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((k) => Object.hasOwn(b, k) && sameArgs(a[k], b[k]))
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Returns the args provided by the nearest {@link BlocProvider} for the given
 * bloc class, or `undefined` when called outside a matching provider.
 *
 * Used by `useBloc` to inherit provider args when no own `args` are given.
 * @public
 */
export function useProvidedArgs<T extends StateContainerConstructor>(
  BlocClass: T,
): ExtractArgs<T> | undefined {
  const map = useContext(ProvidedArgsContext);
  return map.get(BlocClass) as ExtractArgs<T> | undefined;
}
