import { useBloc } from '@blac/react';
import { RouterBloc } from './RouterBloc';

interface RouteProps {
  path: string;
  children: React.ReactNode;
}

/**
 * Route component that conditionally renders based on current path.
 * Uses RouterBloc to track the current route.
 */
export function Route({ path, children }: RouteProps) {
  const [state] = useBloc(RouterBloc);

  // Simple exact path matching
  if (state.path === path) {
    return <span>{children}</span>;
  }

  return null;
}
