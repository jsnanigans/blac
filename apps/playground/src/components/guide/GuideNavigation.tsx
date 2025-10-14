import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GuideNavigation as GuideNavigationType } from './types';
import { cn } from '@/lib/utils';

interface GuideNavigationProps {
  navigation: GuideNavigationType | null;
  className?: string;
}

export function GuideNavigation({ navigation, className }: GuideNavigationProps) {
  if (!navigation) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('space-y-4', className)}
    >
      <div className="rounded-3xl border border-border bg-surface shadow-subtle">
        <div className="flex items-center justify-between border-b border-border/70 bg-surface-muted/80 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Learning path
          </span>
          <Sparkles className="h-4 w-4 text-brand" />
        </div>
        <div className="flex flex-col gap-3 p-4">
          {navigation.previous && (
            <NavCard
              direction="previous"
              title={navigation.previous.title}
              to={navigation.previous.path}
            />
          )}
          {navigation.next ? (
            <NavCard
              direction="next"
              title={navigation.next.title}
              to={navigation.next.path}
            />
          ) : (
            <NavCard
              direction="complete"
              title="Complete! Return to Guide"
              to="/guide"
            />
          )}
        </div>
      </div>
    </motion.nav>
  );
}

interface NavCardProps {
  direction: 'previous' | 'next' | 'complete';
  title: string;
  to: string;
}

function NavCard({ direction, title, to }: NavCardProps) {
  const isPrevious = direction === 'previous';
  const isComplete = direction === 'complete';

  return (
    <Link
      to={to}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-surface px-4 py-3 transition-transform hover:-translate-y-0.5 hover:shadow-elevated',
        isComplete
          ? 'bg-gradient-to-r from-brand/10 via-surface to-accent/20'
          : 'bg-gradient-to-r from-surface to-surface-muted/60',
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,254,0.25),_transparent_45%)] opacity-60" />
      <div className="relative flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand', isComplete && 'text-brand-foreground bg-brand')}>
          {isPrevious ? (
            <ArrowLeft className="h-5 w-5" />
          ) : isComplete ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isComplete ? 'Finished' : isPrevious ? 'Previous demo' : 'Next demo'}
          </div>
          <div className="text-sm font-semibold text-foreground">
            {title}
          </div>
        </div>
        {!isComplete && (
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        )}
      </div>
    </Link>
  );
}
