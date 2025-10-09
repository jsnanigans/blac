import * as React from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export type CalloutVariant = 'info' | 'success' | 'warning' | 'danger';

const variantClasses: Record<CalloutVariant, string> = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
  success:
    'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700',
  warning:
    'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700',
  danger: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
};

export function Callout({
  className,
  variant = 'info',
  title,
  children,
}: React.PropsWithChildren<{
  className?: string;
  variant?: CalloutVariant;
  title?: string;
}>) {
  return (
    <div
      className={twMerge(
        clsx('rounded-lg border p-4', variantClasses[variant], className),
      )}
    >
      {title ? <h4 className="font-semibold mb-2">{title}</h4> : null}
      <div className="text-sm text-foreground/80">{children}</div>
    </div>
  );
}
