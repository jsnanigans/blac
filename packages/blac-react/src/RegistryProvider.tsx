import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react';
import { getRegistry, type StateContainerRegistry } from '@blac/core';

const RegistryContext = createContext<StateContainerRegistry | null>(null);

/**
 * Props for {@link RegistryProvider}.
 * @public
 */
export interface RegistryProviderProps {
  registry: StateContainerRegistry;
  children: ReactNode;
}

/**
 * Scopes descendant `useBloc` calls to a specific registry instead of the
 * module-global default.
 *
 * Useful for test isolation, SSR isolation, and micro-frontends that must
 * not share bloc instances with the host page.
 *
 * @example
 * ```tsx
 * <RegistryProvider registry={new StateContainerRegistry()}>
 *   <App />
 * </RegistryProvider>
 * ```
 * @public
 */
export function RegistryProvider({
  registry,
  children,
}: RegistryProviderProps): ReactElement {
  return (
    <RegistryContext.Provider value={registry}>
      {children}
    </RegistryContext.Provider>
  );
}

/**
 * The registry `useBloc` uses here: the nearest {@link RegistryProvider}'s,
 * else `getRegistry()`. The plain `@blac/core` helpers (`acquire`, `ensure`,
 * `watch`, …) can't read React context and always use `getRegistry()`; call
 * this registry's methods directly to stay inside a provider's scope.
 * @public
 */
export function useRegistry(): StateContainerRegistry {
  return useContext(RegistryContext) ?? getRegistry();
}
