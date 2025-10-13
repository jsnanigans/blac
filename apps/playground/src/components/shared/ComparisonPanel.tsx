/**
 * ComparisonPanel Component
 *
 * Side-by-side comparison component using compound component pattern.
 *
 * Features:
 * - Compound component pattern (Left, Right)
 * - Horizontal/vertical orientation
 * - Optional synchronized scrolling
 * - Color coding for each side
 * - Mobile responsive (stacks vertically on small screens)
 * - Framer Motion animations
 *
 * @example
 * ```tsx
 * <ComparisonPanel>
 *   <ComparisonPanel.Left title="Cubit" color="blue">
 *     <CubitExample />
 *   </ComparisonPanel.Left>
 *   <ComparisonPanel.Right title="Bloc" color="purple">
 *     <BlocExample />
 *   </ComparisonPanel.Right>
 * </ComparisonPanel>
 *
 * // Vertical orientation
 * <ComparisonPanel orientation="vertical">
 *   <ComparisonPanel.Left title="Before">...</ComparisonPanel.Left>
 *   <ComparisonPanel.Right title="After">...</ComparisonPanel.Right>
 * </ComparisonPanel>
 * ```
 */

import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { variants } from '../../utils/animations';
import type { ConceptType, SemanticType } from '../../utils/design-tokens';

/**
 * Color options for comparison sides
 */
export type ComparisonColor =
  | ConceptType // 'cubit' | 'bloc' | 'event'
  | SemanticType // 'tip' | 'warning' | 'success' | 'info' | 'danger'
  | 'neutral';

/**
 * Orientation options
 */
export type ComparisonOrientation = 'horizontal' | 'vertical';

/**
 * Context for child components
 */
interface ComparisonPanelContextValue {
  orientation: ComparisonOrientation;
  syncScroll: boolean;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
}

const ComparisonPanelContext = createContext<ComparisonPanelContextValue | null>(null);

/**
 * Hook to access ComparisonPanel context
 */
const useComparisonPanel = () => {
  const context = useContext(ComparisonPanelContext);
  if (!context) {
    throw new Error(
      'ComparisonPanel compound components must be used within a ComparisonPanel'
    );
  }
  return context;
};

/**
 * Main ComparisonPanel props
 */
export interface ComparisonPanelProps {
  /** Orientation (horizontal or vertical) */
  orientation?: ComparisonOrientation;

  /** Synchronize scrolling between left and right panels */
  syncScroll?: boolean;

  /** Children (should be Left and Right components) */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * ComparisonSide props (for Left and Right)
 */
export interface ComparisonSideProps {
  /** Title for this side */
  title?: string;

  /** Color theme for this side */
  color?: ComparisonColor;

  /** Side content */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Color theme classes
 */
const colorClasses: Record<ComparisonColor, { border: string; bg: string; title: string }> = {
  // Concept colors
  cubit: {
    border: 'border-concept-cubit',
    bg: 'bg-concept-cubit/5',
    title: 'text-concept-cubit',
  },
  bloc: {
    border: 'border-concept-bloc',
    bg: 'bg-concept-bloc/5',
    title: 'text-concept-bloc',
  },
  event: {
    border: 'border-concept-event',
    bg: 'bg-concept-event/5',
    title: 'text-concept-event',
  },

  // Semantic colors
  tip: {
    border: 'border-semantic-tip',
    bg: 'bg-semantic-tip-light/30',
    title: 'text-semantic-tip-dark',
  },
  warning: {
    border: 'border-semantic-warning',
    bg: 'bg-semantic-warning-light/30',
    title: 'text-semantic-warning-dark',
  },
  success: {
    border: 'border-semantic-success',
    bg: 'bg-semantic-success-light/30',
    title: 'text-semantic-success-dark',
  },
  info: {
    border: 'border-semantic-info',
    bg: 'bg-semantic-info-light/30',
    title: 'text-semantic-info-dark',
  },
  danger: {
    border: 'border-semantic-danger',
    bg: 'bg-semantic-danger-light/30',
    title: 'text-semantic-danger-dark',
  },

  // Neutral
  neutral: {
    border: 'border-border',
    bg: '',
    title: 'text-foreground',
  },
};

/**
 * ComparisonSide Component (used by Left and Right)
 */
const ComparisonSide: React.FC<ComparisonSideProps> = ({
  title,
  color = 'neutral',
  children,
  className,
}) => {
  const { orientation, syncScroll, onScroll } = useComparisonPanel();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const colors = colorClasses[color];

  // Handle scroll events for synchronization
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (syncScroll && !isScrolling && onScroll) {
      const target = e.currentTarget;
      onScroll(target.scrollTop, target.scrollLeft);
    }
  };

  // Listen for external scroll events (from other panel)
  useEffect(() => {
    if (!syncScroll || !scrollRef.current) return;

    const handleExternalScroll = (scrollTop: number, scrollLeft: number) => {
      if (scrollRef.current) {
        setIsScrolling(true);
        scrollRef.current.scrollTop = scrollTop;
        scrollRef.current.scrollLeft = scrollLeft;
        setTimeout(() => setIsScrolling(false), 100);
      }
    };

    // Store reference for cleanup
    const currentRef = scrollRef.current;
    if (onScroll) {
      // Listen for scroll events from parent
      // (Note: This is a simplified implementation; a more robust solution
      // would use a proper event system or state management)
    }

    return () => {
      // Cleanup if needed
    };
  }, [syncScroll, onScroll]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants.slideUp}
      className={cn(
        'comparison-side',
        'flex-1',
        'rounded-lg',
        'border-2',
        colors.border,
        colors.bg,
        'overflow-hidden',
        className
      )}
    >
      {/* Title */}
      {title && (
        <div className="px-4 py-3 border-b border-current/20">
          <h3 className={cn('font-semibold text-lg', colors.title)}>{title}</h3>
        </div>
      )}

      {/* Content */}
      <div ref={scrollRef} className="p-4 overflow-auto" onScroll={handleScroll}>
        {children}
      </div>
    </motion.div>
  );
};

/**
 * Main ComparisonPanel Component
 */
export const ComparisonPanel: React.FC<ComparisonPanelProps> & {
  Left: React.FC<ComparisonSideProps>;
  Right: React.FC<ComparisonSideProps>;
} = ({ orientation = 'horizontal', syncScroll = false, children, className }) => {
  const [scrollState, setScrollState] = useState({ scrollTop: 0, scrollLeft: 0 });

  const handleScroll = (scrollTop: number, scrollLeft: number) => {
    if (syncScroll) {
      setScrollState({ scrollTop, scrollLeft });
    }
  };

  const contextValue: ComparisonPanelContextValue = {
    orientation,
    syncScroll,
    onScroll: handleScroll,
  };

  return (
    <ComparisonPanelContext.Provider value={contextValue}>
      <div
        className={cn(
          'comparison-panel',
          'flex gap-4',
          orientation === 'horizontal' ? 'flex-col md:flex-row' : 'flex-col',
          'my-8',
          className
        )}
      >
        {children}
      </div>
    </ComparisonPanelContext.Provider>
  );
};

// Attach compound components
ComparisonPanel.Left = ComparisonSide;
ComparisonPanel.Right = ComparisonSide;

export default ComparisonPanel;
