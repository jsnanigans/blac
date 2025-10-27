import { useBloc } from '@blac/react';
import { RouterBloc } from './RouterBloc';

interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Link component for navigation using our custom Blac router.
 * Prevents default browser navigation and uses RouterBloc instead.
 */
export function Link({ to, children, className }: LinkProps) {
  const [state, router] = useBloc(RouterBloc);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.navigate(to);
  };

  const isActive = state.path === to;

  return (
    <a
      href={to}
      onClick={handleClick}
      className={`${className || ''} ${isActive ? 'active' : ''}`.trim()}
    >
      {children}
    </a>
  );
}
