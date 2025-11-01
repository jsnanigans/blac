import { ReactNode } from 'react';

interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
  className?: string;
}

/**
 * Simple alert component for displaying messages and notifications.
 */
export function Alert({ variant, children, className = '' }: AlertProps) {
  const classes = ['alert', variant, className].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
}
