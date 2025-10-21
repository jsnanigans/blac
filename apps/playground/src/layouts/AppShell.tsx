import * as React from 'react';
import { cn } from '@/lib/utils';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export const AppShell = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'min-h-screen bg-background text-foreground antialiased flex flex-col',
        className,
      )}
      {...props}
    />
  ),
);
AppShell.displayName = 'AppShell';

export const ShellTopBar = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'border-b border-border bg-surface-muted/80 backdrop-blur supports-[backdrop-filter]:bg-surface-muted/60',
        className,
      )}
      {...props}
    />
  ),
);
ShellTopBar.displayName = 'ShellTopBar';

export const ShellHeader = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        'relative border-b border-border bg-surface shadow-subtle',
        className,
      )}
      {...props}
    />
  ),
);
ShellHeader.displayName = 'ShellHeader';

export const ShellBody = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-1 w-full bg-background/40', className)}
      {...props}
    />
  ),
);
ShellBody.displayName = 'ShellBody';

export const ShellSidebar = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(
        'hidden lg:flex w-72 shrink-0 flex-col border-r border-border bg-surface shadow-subtle',
        className,
      )}
      {...props}
    />
  ),
);
ShellSidebar.displayName = 'ShellSidebar';

export const ShellMain = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <main ref={ref} className={cn('flex-1 min-w-0', className)} {...props} />
  ),
);
ShellMain.displayName = 'ShellMain';

export const ShellAside = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(
        'hidden xl:flex w-80 shrink-0 flex-col border-l border-border bg-surface shadow-subtle',
        className,
      )}
      {...props}
    />
  ),
);
ShellAside.displayName = 'ShellAside';

export const ShellFooter = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <footer
      ref={ref}
      className={cn(
        'border-t border-border bg-surface shadow-subtle',
        className,
      )}
      {...props}
    />
  ),
);
ShellFooter.displayName = 'ShellFooter';
