import * as React from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export function Section({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={twMerge(
        clsx('rounded-lg border bg-background p-4 md:p-6', className),
      )}
      {...props}
    />
  );
}

export function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={twMerge(clsx('space-y-1', className))}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
