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

  const formatSlug = (slug?: string) =>
    slug ? slug.replace(/^[0-9]+-/, '').replace(/-/g, ' ') : '';

  return (
    <DemoArticleContext.Provider value={contextValue}>
      <motion.article
        initial="hidden"
        animate="visible"
        variants={variants.fadeIn}
        className={cn('relative w-full space-y-12 px-6 py-12 sm:px-10', className)}
      >
        <div className="demo-article-content space-y-16">{children}</div>

        {!hideNavigation && (
          <footer className="border-t border-border pt-10">
            <div className="grid gap-4 sm:grid-cols-2">
              {metadata.learningPath?.previous ? (
                <Link
                  to={`/demos/${metadata.learningPath.previous}`}
                  className="group relative flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-brand/60 hover:text-brand"
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
                  className="group relative flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-brand/60 hover:text-brand"
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
