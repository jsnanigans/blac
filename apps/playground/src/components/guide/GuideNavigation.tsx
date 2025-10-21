import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import type { GuideNavigation as GuideNavigationType } from './types';
import { cn } from '@/lib/utils';

interface GuideNavigationProps {
  navigation: GuideNavigationType | null;
  className?: string;
  id?: string;
}

export function GuideNavigation({
  navigation,
  className,
  id,
}: GuideNavigationProps) {
  if (!navigation) return null;

  return (
    <nav
      id={id}
      className={cn('border-t border-border pt-6', className)}
      aria-label="Guide navigation"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-4 w-4 text-brand" />
          Learning path
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {navigation.previous && (
            <NavLink
              direction="previous"
              title={navigation.previous.title}
              to={navigation.previous.path}
            />
          )}
          {navigation.next ? (
            <NavLink
              direction="next"
              title={navigation.next.title}
              to={navigation.next.path}
            />
          ) : (
            <NavLink
              direction="complete"
              title="Complete! Return to Guide"
              to="/guide"
            />
          )}
        </div>
      </div>
    </nav>
  );
}

interface NavLinkProps {
  direction: 'previous' | 'next' | 'complete';
  title: string;
  to: string;
}

function NavLink({ direction, title, to }: NavLinkProps) {
  const isPrevious = direction === 'previous';
  const isComplete = direction === 'complete';

  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand',
        isComplete && 'hover:bg-brand hover:text-brand-foreground',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground',
          isComplete &&
            'bg-brand text-brand-foreground group-hover:bg-brand group-hover:text-brand-foreground',
        )}
      >
        {isPrevious ? (
          <ArrowLeft className="h-5 w-5" />
        ) : isComplete ? (
          <Sparkles className="h-5 w-5" />
        ) : (
          <ArrowRight className="h-5 w-5" />
        )}
      </div>
      <div className="flex flex-col items-start gap-1 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-brand">
          {isComplete ? 'Finished' : isPrevious ? 'Previous demo' : 'Next demo'}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
    </Link>
  );
}
