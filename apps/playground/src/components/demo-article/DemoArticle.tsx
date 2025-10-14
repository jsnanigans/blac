import React, { createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { variants } from '@/utils/animations';

/**
 * Demo difficulty levels
 */
export type DemoDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Demo metadata structure
 */
export interface DemoMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: DemoDifficulty;
  tags: string[];
  estimatedTime?: number;
  learningPath?: {
    previous?: string;
    next?: string;
    sequence?: number;
  };
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    gradient?: [string, string];
  };
}

export interface DemoArticleProps {
  metadata: DemoMetadata;
  showBlocGraph?: boolean;
  graphLayout?: 'grid' | 'force';
  highlightLifecycle?: boolean;
  hideNavigation?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface DemoArticleContextValue {
  metadata: DemoMetadata;
  showBlocGraph: boolean;
  graphLayout: 'grid' | 'force';
  highlightLifecycle: boolean;
}

const DemoArticleContext = createContext<DemoArticleContextValue | null>(null);

export const useDemoArticle = () => {
  const context = useContext(DemoArticleContext);
  if (!context) {
    throw new Error('useDemoArticle must be used within a DemoArticle component');
  }
  return context;
};

const difficultyStyles: Record<DemoDifficulty, string> = {
  beginner:
    'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300',
  intermediate:
    'border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-300',
  advanced:
    'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/30 dark:text-rose-300',
};

export const DemoArticle: React.FC<DemoArticleProps> = ({
  metadata,
  showBlocGraph = false,
  graphLayout = 'grid',
  highlightLifecycle = true,
  hideNavigation = false,
  children,
  className,
}) => {
  const contextValue: DemoArticleContextValue = {
    metadata,
    showBlocGraph,
    graphLayout,
    highlightLifecycle,
  };

  const categoryLabel = React.useMemo(() => {
    const cleaned = metadata.category.replace(/^[0-9]+-/, '').replace(/-/g, ' ');
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }, [metadata.category]);

  const formatSlug = (slug?: string) =>
    slug ? slug.replace(/^[0-9]+-/, '').replace(/-/g, ' ') : '';

  return (
    <DemoArticleContext.Provider value={contextValue}>
      <motion.article
        initial="hidden"
        animate="visible"
        variants={variants.fadeIn}
        className={cn('relative mx-auto w-full max-w-4xl space-y-10 px-4 py-8 sm:px-6', className)}
      >
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/15 via-transparent to-purple-500/15 opacity-90" />
          <div className="pointer-events-none absolute -right-16 top-0 h-44 w-44 rounded-full bg-brand/20 blur-3xl" />

          <div className="relative space-y-12 px-6 py-8 sm:px-10 sm:py-12">
            <header className="space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted-foreground">
                  {categoryLabel}
                </span>
                <span className={cn('rounded-full border px-2.5 py-1', difficultyStyles[metadata.difficulty])}>
                  {metadata.difficulty}
                </span>
                {metadata.estimatedTime && (
                  <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                    ~{metadata.estimatedTime} min
                  </span>
                )}
              </div>

              <motion.h1
                className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
                variants={variants.slideUp}
              >
                {metadata.title}
              </motion.h1>

              <motion.p className="max-w-3xl text-base text-muted-foreground sm:text-lg" variants={variants.slideUp}>
                {metadata.description}
              </motion.p>

              {metadata.tags.length > 0 && (
                <motion.div className="flex flex-wrap gap-2" variants={variants.slideUp}>
                  {metadata.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              )}
            </header>

            <div className="demo-article-content space-y-16">{children}</div>
          </div>
        </div>

        {!hideNavigation && (
          <footer className="mx-auto max-w-4xl">
            <div className="grid gap-4 sm:grid-cols-2">
              {metadata.learningPath?.previous ? (
                <Link
                  to={`/demos/${metadata.learningPath.previous}`}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/70 bg-surface px-5 py-4 shadow-subtle transition-transform hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Previous</p>
                    <p className="text-sm font-semibold text-foreground">{formatSlug(metadata.learningPath.previous)}</p>
                  </div>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}

              {metadata.learningPath?.next ? (
                <Link
                  to={`/demos/${metadata.learningPath.next}`}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/70 bg-surface px-5 py-4 shadow-subtle transition-transform hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next</p>
                    <p className="text-sm font-semibold text-foreground">{formatSlug(metadata.learningPath.next)}</p>
                  </div>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
          </footer>
        )}
      </motion.article>
    </DemoArticleContext.Provider>
  );
};
