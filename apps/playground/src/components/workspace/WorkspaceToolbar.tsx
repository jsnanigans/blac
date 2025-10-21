import * as React from 'react';
import { cn } from '@/lib/utils';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export interface WorkspaceToolbarProps extends DivProps {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const WorkspaceToolbar = React.forwardRef<
  HTMLDivElement,
  WorkspaceToolbarProps
>(({ leading, trailing, className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-muted px-3 py-2 shadow-subtle',
      className,
    )}
    {...props}
  >
    <div className="flex flex-1 items-center gap-3">
      {leading}
      {children}
    </div>
    {trailing && (
      <div className="flex shrink-0 items-center gap-2">{trailing}</div>
    )}
  </div>
));
WorkspaceToolbar.displayName = 'WorkspaceToolbar';

export const WorkspaceToolbarGroup = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-1 shadow-subtle',
        className,
      )}
      {...props}
    />
  ),
);
WorkspaceToolbarGroup.displayName = 'WorkspaceToolbarGroup';

export const WorkspaceToolbarLabel: React.FC<DivProps> = ({
  className,
  ...props
}) => (
  <span
    className={cn(
      'text-xs font-medium uppercase tracking-wide text-muted-foreground',
      className,
    )}
    {...props}
  />
);
