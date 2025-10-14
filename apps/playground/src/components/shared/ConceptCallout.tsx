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
    gradient: string;
    border: string;
    iconRing: string;
    iconColor: string;
    title: string;
    badge: string;
  }
> = {
  tip: {
    gradient:
      'from-sky-500/20 via-sky-400/10 to-transparent dark:from-sky-900/25 dark:via-slate-950 dark:to-sky-900/35',
    border: 'border-sky-200/70 dark:border-sky-800/60',
    iconRing: 'bg-sky-100 text-sky-600 ring-sky-500/20 dark:bg-sky-900/40 dark:text-sky-300',
    iconColor: 'text-sky-600 dark:text-sky-300',
    title: 'text-sky-700 dark:text-sky-200',
    badge: 'bg-sky-500 text-white',
  },
  warning: {
    gradient:
      'from-amber-500/20 via-amber-400/10 to-transparent dark:from-amber-900/25 dark:via-slate-950 dark:to-amber-900/35',
    border: 'border-amber-200/70 dark:border-amber-800/60',
    iconRing: 'bg-amber-100 text-amber-600 ring-amber-500/20 dark:bg-amber-900/40 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-300',
    title: 'text-amber-700 dark:text-amber-200',
    badge: 'bg-amber-500 text-white',
  },
  success: {
    gradient:
      'from-emerald-500/18 via-emerald-400/10 to-transparent dark:from-emerald-900/25 dark:via-slate-950 dark:to-emerald-900/35',
    border: 'border-emerald-200/70 dark:border-emerald-800/60',
    iconRing: 'bg-emerald-100 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-900/40 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
    title: 'text-emerald-700 dark:text-emerald-200',
    badge: 'bg-emerald-500 text-white',
  },
  info: {
    gradient:
      'from-indigo-500/20 via-indigo-400/10 to-transparent dark:from-indigo-900/25 dark:via-slate-950 dark:to-indigo-900/35',
    border: 'border-indigo-200/70 dark:border-indigo-800/60',
    iconRing: 'bg-indigo-100 text-indigo-600 ring-indigo-500/20 dark:bg-indigo-900/40 dark:text-indigo-300',
    iconColor: 'text-indigo-600 dark:text-indigo-300',
    title: 'text-indigo-700 dark:text-indigo-200',
    badge: 'bg-indigo-500 text-white',
  },
  danger: {
    gradient:
      'from-rose-500/20 via-rose-400/10 to-transparent dark:from-rose-900/25 dark:via-slate-950 dark:to-rose-900/35',
    border: 'border-rose-200/70 dark:border-rose-800/60',
    iconRing: 'bg-rose-100 text-rose-600 ring-rose-500/20 dark:bg-rose-900/40 dark:text-rose-300',
    iconColor: 'text-rose-600 dark:text-rose-300',
    title: 'text-rose-700 dark:text-rose-200',
    badge: 'bg-rose-500 text-white',
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
        'relative overflow-hidden rounded-3xl border bg-surface p-5 sm:p-6 shadow-subtle transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-elevated',
        styles.border,
        className,
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0 opacity-90', 'bg-gradient-to-br', styles.gradient)} />
      <div className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-white/20 blur-3xl dark:bg-white/5" />

      {/* Header */}
      <div
        className={cn(
          'relative flex items-start gap-4',
          collapsible && 'cursor-pointer',
          'select-none',
        )}
        onClick={toggleCollapse}
      >
        {/* Icon with halo */}
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-4',
            styles.iconRing,
          )}
        >
          <Icon className={cn('h-5 w-5', styles.iconColor)} />
        </div>

        {/* Title and Toggle */}
        <div className="flex flex-1 items-center justify-between">
          <div className="space-y-1">
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-subtle',
                styles.badge,
              )}
            >
              {displayTitle}
            </div>
          </div>

          {collapsible && (
            <button
              className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 dark:border-white/10"
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
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
            <div className="relative mt-4 rounded-2xl border border-white/40 bg-white/60 p-4 text-sm leading-relaxed text-slate-700 shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
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
