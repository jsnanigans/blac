import { createContext, type ReactElement, type ReactNode } from 'react';
import type { StateContainerRegistry } from '@blac/core';

/**
 * Internal context value: a registry to use in place of the module-global
 * default (`getRegistry()`), or `null` when no provider is present.
 */
export const RegistryContext = createContext<StateContainerRegistry | null>(
  null,
);

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
