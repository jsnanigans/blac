import * as React from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-input',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white',
  };
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          variantClasses[variant],
          className,
        ),
      )}
      {...props}
    />
  );
}
