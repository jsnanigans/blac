/**
 * ConceptCallout Component
 *
 * Color-coded callout boxes for tips, warnings, success messages, info, and danger alerts.
 *
 * Features:
 * - Multiple semantic types with consistent color coding
 * - Optional icon support
 * - Expandable/collapsible option
 * - Framer Motion entrance animations
 * - Responsive design
 *
 * @example
 * ```tsx
 * <ConceptCallout type="tip" title="Pro Tip">
 *   <p>Use selectors to optimize re-renders!</p>
 * </ConceptCallout>
 *
 * <ConceptCallout type="warning" collapsible title="Important">
 *   <p>Remember to dispose of Blocs when done.</p>
 * </ConceptCallout>
 * ```
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { variants } from '../../utils/animations';

/**
 * Callout type options
 */
export type ConceptCalloutType = 'tip' | 'warning' | 'success' | 'info' | 'danger';

/**
 * ConceptCallout props
 */
export interface ConceptCalloutProps {
  /** Callout type determines color and default icon */
  type: ConceptCalloutType;

  /** Optional title */
  title?: string;

  /** Callout content */
  children: React.ReactNode;

  /** Custom icon (overrides default) */
  icon?: LucideIcon;

  /** Allow collapsing the callout */
  collapsible?: boolean;

  /** Start collapsed */
  defaultCollapsed?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Disable entrance animation */
  noAnimation?: boolean;
}

/**
 * Default icons for each callout type
 */
const typeIcons: Record<ConceptCalloutType, LucideIcon> = {
  tip: Lightbulb,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
  danger: AlertOctagon,
};

/**
 * Default titles for each callout type
 */
const typeTitles: Record<ConceptCalloutType, string> = {
  tip: 'Tip',
  warning: 'Warning',
  success: 'Success',
  info: 'Info',
  danger: 'Danger',
};

/**
 * Style configuration for each callout type
 */
const typeStyles: Record<
  ConceptCalloutType,
  {
    container: string;
    icon: string;
    title: string;
  }
> = {
  tip: {
    container: 'bg-semantic-tip-light/30 border-semantic-tip',
    icon: 'text-semantic-tip-dark',
    title: 'text-semantic-tip-dark',
  },
  warning: {
    container: 'bg-semantic-warning-light/30 border-semantic-warning',
    icon: 'text-semantic-warning-dark',
    title: 'text-semantic-warning-dark',
  },
  success: {
    container: 'bg-semantic-success-light/30 border-semantic-success',
    icon: 'text-semantic-success-dark',
    title: 'text-semantic-success-dark',
  },
  info: {
    container: 'bg-semantic-info-light/30 border-semantic-info',
    icon: 'text-semantic-info-dark',
    title: 'text-semantic-info-dark',
  },
  danger: {
    container: 'bg-semantic-danger-light/30 border-semantic-danger',
    icon: 'text-semantic-danger-dark',
    title: 'text-semantic-danger-dark',
  },
};

/**
 * ConceptCallout Component
 */
export const ConceptCallout: React.FC<ConceptCalloutProps> = ({
  type,
  title,
  children,
  icon: CustomIcon,
  collapsible = false,
  defaultCollapsed = false,
  className,
  noAnimation = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const Icon = CustomIcon || typeIcons[type];
  const displayTitle = title || typeTitles[type];
  const styles = typeStyles[type];

  // Animation props
  const animationProps = noAnimation
    ? {}
    : {
        initial: 'hidden',
        animate: 'visible',
        variants: variants.slideUp,
      };

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <motion.div
      {...animationProps}
      className={cn(
        'concept-callout',
        'rounded-lg border-l-4',
        'p-4',
        'shadow-sm',
        styles.container,
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-start gap-3',
          collapsible && 'cursor-pointer',
          'select-none'
        )}
        onClick={toggleCollapse}
      >
        {/* Icon */}
        <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Title and Toggle */}
        <div className="flex-1 flex items-center justify-between">
          <h4 className={cn('font-semibold text-sm', styles.title)}>{displayTitle}</h4>

          {/* Collapse button */}
          {collapsible && (
            <button
              className={cn(
                'ml-2 p-1 rounded hover:bg-black/5 transition-colors',
                styles.icon
              )}
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-8 text-sm text-foreground/90 prose prose-sm max-w-none">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * Pre-configured callout shortcuts for common use cases
 */
export const TipCallout: React.FC<Omit<ConceptCalloutProps, 'type'>> = (props) => (
  <ConceptCallout type="tip" {...props} />
);

export const WarningCallout: React.FC<Omit<ConceptCalloutProps, 'type'>> = (props) => (
  <ConceptCallout type="warning" {...props} />
);

export const SuccessCallout: React.FC<Omit<ConceptCalloutProps, 'type'>> = (props) => (
  <ConceptCallout type="success" {...props} />
);

export const InfoCallout: React.FC<Omit<ConceptCalloutProps, 'type'>> = (props) => (
  <ConceptCallout type="info" {...props} />
);

export const DangerCallout: React.FC<Omit<ConceptCalloutProps, 'type'>> = (props) => (
  <ConceptCallout type="danger" {...props} />
);

export default ConceptCallout;
