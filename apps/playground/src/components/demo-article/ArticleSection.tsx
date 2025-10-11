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
const themeClasses: Record<SectionTheme, { bg: string; border: string }> = {
  // Concept themes
  cubit: {
    bg: 'bg-concept-cubit/5',
    border: 'border-l-4 border-l-concept-cubit',
  },
  bloc: {
    bg: 'bg-concept-bloc/5',
    border: 'border-l-4 border-l-concept-bloc',
  },
  event: {
    bg: 'bg-concept-event/5',
    border: 'border-l-4 border-l-concept-event',
  },

  // Semantic themes
  tip: {
    bg: 'bg-semantic-tip-light/30',
    border: 'border-l-4 border-l-semantic-tip',
  },
  warning: {
    bg: 'bg-semantic-warning-light/30',
    border: 'border-l-4 border-l-semantic-warning',
  },
  success: {
    bg: 'bg-semantic-success-light/30',
    border: 'border-l-4 border-l-semantic-success',
  },
  info: {
    bg: 'bg-semantic-info-light/30',
    border: 'border-l-4 border-l-semantic-info',
  },
  danger: {
    bg: 'bg-semantic-danger-light/30',
    border: 'border-l-4 border-l-semantic-danger',
  },

  // Neutral (no color)
  neutral: {
    bg: '',
    border: '',
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
        'text-3xl font-bold mb-6',
        'bg-gradient-to-r from-foreground to-muted-foreground',
        'bg-clip-text text-transparent',
        className
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
        'article-section',
        'my-12 scroll-mt-20', // scroll-mt for anchor offset
        'rounded-lg',
        'transition-colors duration-300',
        // Apply theme background if no custom background
        !backgroundColor && themeConfig.bg,
        // Apply border if enabled and theme has border
        showBorder && themeConfig.border,
        // Padding when background or border is present
        (themeConfig.bg || themeConfig.border || backgroundColor) && 'p-6 sm:p-8',
        className
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {children}
    </motion.section>
  );
};

export default ArticleSection;
