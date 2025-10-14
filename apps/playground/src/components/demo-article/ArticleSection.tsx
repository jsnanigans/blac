/**
 * ArticleSection Component
 *
 * Content grouping component with theme colors for organizing
 * demo content into logical sections.
 *
 * Features:
 * - Color-themed sections
 * - Smooth scroll anchor support
 * - Framer Motion entrance animations
 * - Responsive spacing
 *
 * @example
 * ```tsx
 * <ArticleSection theme="cubit" id="basics">
 *   <SectionHeader>Understanding Cubits</SectionHeader>
 *   <Prose>
 *     <p>Content here...</p>
 *   </Prose>
 * </ArticleSection>
 * ```
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { scroll } from '../../utils/animations';
import type { ConceptType, SemanticType } from '../../utils/design-tokens';

/**
 * Theme color options for sections
 */
export type SectionTheme =
  | ConceptType // 'cubit' | 'bloc' | 'event'
  | SemanticType // 'tip' | 'warning' | 'success' | 'info' | 'danger'
  | 'neutral';

/**
 * ArticleSection props
 */
export interface ArticleSectionProps {
  /** Theme color for the section */
  theme?: SectionTheme;

  /** HTML id for scroll anchoring */
  id?: string;

  /** Section children */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Disable entrance animation */
  noAnimation?: boolean;

  /** Custom background color (overrides theme) */
  backgroundColor?: string;

  /** Add border on the left side */
  showBorder?: boolean;
}

/**
 * Map theme to Tailwind classes
 */
const themeClasses: Record<SectionTheme, { surface: string; halo: string; border: string }> = {
  cubit: {
    surface:
      'bg-gradient-to-br from-sky-100/70 via-white to-sky-50/80 dark:from-sky-900/35 dark:via-slate-950 dark:to-sky-900/25',
    halo: 'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.32),_transparent_55%)]',
    border: 'border-sky-200/70 dark:border-sky-800/60',
  },
  bloc: {
    surface:
      'bg-gradient-to-br from-violet-100/70 via-white to-fuchsia-100/60 dark:from-violet-900/35 dark:via-slate-950 dark:to-fuchsia-900/25',
    halo: 'bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.3),_transparent_55%)]',
    border: 'border-violet-200/70 dark:border-violet-800/60',
  },
  event: {
    surface:
      'bg-gradient-to-br from-orange-100/70 via-white to-amber-100/60 dark:from-orange-900/40 dark:via-slate-950 dark:to-amber-900/25',
    halo: 'bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.3),_transparent_55%)]',
    border: 'border-orange-200/70 dark:border-orange-800/60',
  },
  tip: {
    surface:
      'bg-gradient-to-br from-sky-100/70 via-white to-cyan-100/60 dark:from-sky-900/40 dark:via-slate-950 dark:to-cyan-900/25',
    halo: 'bg-[radial-gradient(circle_at_top,_rgba(56,178,172,0.3),_transparent_55%)]',
    border: 'border-cyan-200/70 dark:border-cyan-800/60',
  },
  warning: {
    surface:
      'bg-gradient-to-br from-amber-100/70 via-white to-amber-50/80 dark:from-amber-900/40 dark:via-slate-950 dark:to-amber-900/25',
    halo: 'bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.3),_transparent_55%)]',
    border: 'border-amber-200/70 dark:border-amber-800/60',
  },
  success: {
    surface:
      'bg-gradient-to-br from-emerald-100/70 via-white to-emerald-50/80 dark:from-emerald-900/40 dark:via-slate-950 dark:to-emerald-900/25',
    halo: 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.28),_transparent_55%)]',
    border: 'border-emerald-200/70 dark:border-emerald-800/60',
  },
  info: {
    surface:
      'bg-gradient-to-br from-indigo-100/70 via-white to-blue-100/60 dark:from-indigo-900/40 dark:via-slate-950 dark:to-blue-900/25',
    halo: 'bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.28),_transparent_55%)]',
    border: 'border-indigo-200/70 dark:border-indigo-800/60',
  },
  danger: {
    surface:
      'bg-gradient-to-br from-rose-100/65 via-white to-rose-50/80 dark:from-rose-900/40 dark:via-slate-950 dark:to-rose-900/30',
    halo: 'bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.32),_transparent_55%)]',
    border: 'border-rose-200/70 dark:border-rose-800/60',
  },
  neutral: {
    surface:
      'bg-gradient-to-br from-slate-100/70 via-white to-slate-50/80 dark:from-slate-900/40 dark:via-slate-950 dark:to-slate-900/30',
    halo: 'bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.24),_transparent_55%)]',
    border: 'border-border',
  },
};

/**
 * Section header component (optional sub-component)
 */
export const SectionHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <h2
      className={cn(
        'mb-8 text-3xl font-semibold tracking-tight sm:text-4xl',
        'bg-gradient-to-r from-brand via-purple-500 to-rose-400 bg-clip-text text-transparent',
        'bg-clip-text text-transparent',
        'leading-tight',
        className,
      )}
    >
      {children}
    </h2>
  );
};

/**
 * ArticleSection Component
 */
export const ArticleSection: React.FC<ArticleSectionProps> = ({
  theme = 'neutral',
  id,
  children,
  className,
  noAnimation = false,
  backgroundColor,
  showBorder = true,
}) => {
  const themeConfig = themeClasses[theme];

  // Animation props
  const animationProps = noAnimation
    ? {}
    : {
        ...scroll.fadeInOnScroll(),
      };

  return (
    <motion.section
      id={id}
      {...animationProps}
      className={cn(
        'relative my-16 scroll-mt-24 overflow-hidden rounded-3xl border bg-surface/90 p-6 sm:p-10 shadow-subtle transition-transform duration-300 hover:-translate-y-1 hover:shadow-elevated',
        !backgroundColor && themeConfig.surface,
        showBorder && themeConfig.border,
        className,
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-70 blur-0 mix-blend-normal',
          themeConfig.halo,
        )}
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand/5 blur-3xl" />
      {children}
    </motion.section>
  );
};

export default ArticleSection;
