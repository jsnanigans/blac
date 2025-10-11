/**
 * DemoArticle Component
 *
 * Required wrapper component for all interactive article-style demos.
 * Enforces consistent structure while allowing flexible content composition.
 *
 * Features:
 * - Renders header with title, difficulty badge, and tags
 * - Renders prev/next navigation
 * - Initializes BlocGraphVisualizer if enabled
 * - Provides context for child components
 * - Handles scroll progress indicator
 *
 * @example
 * ```tsx
 * <DemoArticle
 *   metadata={demoMetadata}
 *   showBlocGraph={true}
 *   graphLayout="grid"
 * >
 *   <ArticleSection>...</ArticleSection>
 * </DemoArticle>
 * ```
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { variants } from '../../utils/animations';

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
  estimatedTime?: number; // in minutes
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

/**
 * DemoArticle props
 */
export interface DemoArticleProps {
  /** Demo metadata (required) */
  metadata: DemoMetadata;

  /** Enable Bloc graph visualization */
  showBlocGraph?: boolean;

  /** Graph layout algorithm ('grid' | 'force') */
  graphLayout?: 'grid' | 'force';

  /** Highlight lifecycle states in graph */
  highlightLifecycle?: boolean;

  /** Children components (article content) */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Context for child components to access demo metadata
 */
interface DemoArticleContextValue {
  metadata: DemoMetadata;
  showBlocGraph: boolean;
  graphLayout: 'grid' | 'force';
  highlightLifecycle: boolean;
}

const DemoArticleContext = createContext<DemoArticleContextValue | null>(null);

/**
 * Hook to access DemoArticle context
 */
export const useDemoArticle = () => {
  const context = useContext(DemoArticleContext);
  if (!context) {
    throw new Error('useDemoArticle must be used within a DemoArticle component');
  }
  return context;
};

/**
 * Difficulty badge colors
 */
const difficultyColors: Record<DemoDifficulty, string> = {
  beginner: 'bg-semantic-success-light text-semantic-success-dark border-semantic-success',
  intermediate:
    'bg-semantic-warning-light text-semantic-warning-dark border-semantic-warning',
  advanced: 'bg-semantic-danger-light text-semantic-danger-dark border-semantic-danger',
};

/**
 * DemoArticle Component
 */
export const DemoArticle: React.FC<DemoArticleProps> = ({
  metadata,
  showBlocGraph = false,
  graphLayout = 'grid',
  highlightLifecycle = true,
  children,
  className,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  // Calculate scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const contextValue: DemoArticleContextValue = {
    metadata,
    showBlocGraph,
    graphLayout,
    highlightLifecycle,
  };

  return (
    <DemoArticleContext.Provider value={contextValue}>
      <motion.article
        initial="hidden"
        animate="visible"
        variants={variants.fadeIn}
        className={cn(
          'demo-article',
          'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8',
          className
        )}
      >
        {/* Scroll Progress Indicator */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-concept-cubit to-concept-bloc"
            style={{ width: `${scrollProgress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${scrollProgress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Header */}
        <header className="mb-12">
          {/* Category & Difficulty */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {metadata.category}
            </span>
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border',
                difficultyColors[metadata.difficulty]
              )}
            >
              {metadata.difficulty}
            </span>
            {metadata.estimatedTime && (
              <span className="text-sm text-muted-foreground">
                ~{metadata.estimatedTime} min
              </span>
            )}
          </div>

          {/* Title */}
          <motion.h1
            className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
            variants={variants.slideUp}
          >
            {metadata.title}
          </motion.h1>

          {/* Description */}
          <motion.p
            className="text-xl text-muted-foreground mb-6"
            variants={variants.slideUp}
          >
            {metadata.description}
          </motion.p>

          {/* Tags */}
          {metadata.tags.length > 0 && (
            <motion.div className="flex flex-wrap gap-2" variants={variants.slideUp}>
              {metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm rounded-md bg-accent text-accent-foreground"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          )}
        </header>

        {/* Article Content */}
        <div className="demo-article-content">{children}</div>

        {/* Navigation Footer */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="flex justify-between items-center">
            {/* Previous Demo */}
            {metadata.learningPath?.previous ? (
              <Link
                to={`/demos/${metadata.learningPath.previous}`}
                className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Previous</span>
              </Link>
            ) : (
              <div />
            )}

            {/* Next Demo */}
            {metadata.learningPath?.next ? (
              <Link
                to={`/demos/${metadata.learningPath.next}`}
                className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </footer>
      </motion.article>
    </DemoArticleContext.Provider>
  );
};

export default DemoArticle;
