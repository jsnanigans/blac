import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react';

const InstanceIdContext = createContext<string | undefined>(undefined);

/**
 * Props for {@link BlocProvider}.
 */
export interface BlocProviderProps {
  /**
   * Instance id that descendants' `useBloc(C)` calls will resolve to when no
   * explicit `instanceId` is given.
   */
  instanceId: string | number;
  children: ReactNode;
}

/**
 * Provides an `instanceId` to descendant `useBloc` calls via React context.
 *
 * Descendants calling `useBloc(C)` without an `instanceId` resolve to the id
 * supplied here. An explicit `instanceId` on the `useBloc` call still wins.
 * `autoInstance` / `static isolated = true` also override the context, because
 * those force a per-mount auto-key.
 *
 * @example
 * ```tsx
 * <BlocProvider instanceId="customer-42">
 *   <CustomerView />
 * </BlocProvider>
 * ```
 */
export function BlocProvider({
  instanceId,
  children,
}: BlocProviderProps): ReactElement {
  return (
    <InstanceIdContext.Provider value={String(instanceId)}>
      {children}
    </InstanceIdContext.Provider>
  );
}

/**
 * Reads the nearest {@link BlocProvider} instance id, or `undefined` when
 * called outside a provider.
 */
export function useInstanceIdFromContext(): string | undefined {
  return useContext(InstanceIdContext);
}
