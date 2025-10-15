import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

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
      <article
        className={cn(
          'mx-auto w-full max-w-3xl space-y-12 px-4 py-10 sm:px-6',
          className,
        )}
      >
        <div className="space-y-12">{children}</div>

        {!hideNavigation && metadata.learningPath && (
          <footer className="border-t border-border pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {metadata.learningPath.previous ? (
                <div className="text-sm text-muted-foreground">
                  Previous: <span className="font-medium text-foreground">{formatSlug(metadata.learningPath.previous)}</span>
                </div>
              ) : (
                <div />
              )}
              {metadata.learningPath.next ? (
                <div className="text-sm text-muted-foreground text-right">
                  Next: <span className="font-medium text-foreground">{formatSlug(metadata.learningPath.next)}</span>
                </div>
              ) : (
                <div />
              )}
            </div>
          </footer>
        )}
      </article>
    </DemoArticleContext.Provider>
  );
};
