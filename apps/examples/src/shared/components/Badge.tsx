import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning';
  children: ReactNode;
  className?: string;
}

/**
 * Simple badge component for labeling and categorization.
 */
export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  const variantClass = variant !== 'default' ? variant : '';
  const classes = ['badge', variantClass, className].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
}
