import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type ConceptCalloutType = 'tip' | 'warning' | 'success' | 'info' | 'danger';

export interface ConceptCalloutProps {
  type: ConceptCalloutType;
  title?: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

const typeConfig: Record<
  ConceptCalloutType,
  { border: string; icon: React.ReactNode; titleColor: string }
> = {
  tip: {
    border: 'border-sky-300',
    icon: <Lightbulb className="h-5 w-5 text-sky-600 dark:text-sky-300" />,
    titleColor: 'text-sky-700 dark:text-sky-200',
  },
  warning: {
    border: 'border-amber-300',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300" />,
    titleColor: 'text-amber-700 dark:text-amber-200',
  },
  success: {
    border: 'border-emerald-300',
    icon: <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />,
    titleColor: 'text-emerald-700 dark:text-emerald-200',
  },
  info: {
    border: 'border-blue-300',
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-300" />,
    titleColor: 'text-blue-700 dark:text-blue-200',
  },
  danger: {
    border: 'border-rose-300',
    icon: <AlertOctagon className="h-5 w-5 text-rose-600 dark:text-rose-300" />,
    titleColor: 'text-rose-700 dark:text-rose-200',
  },
};

const defaultTitles: Record<ConceptCalloutType, string> = {
  tip: 'Tip',
  warning: 'Warning',
  success: 'Success',
  info: 'Info',
  danger: 'Important',
};

export const ConceptCallout: React.FC<ConceptCalloutProps> = ({
  type,
  title,
  children,
  icon,
  collapsible = false,
  defaultCollapsed = false,
  className,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const config = typeConfig[type];

  const handleToggle = () => {
    if (collapsible) {
      setCollapsed((prev) => !prev);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-surface px-4 py-3 shadow-subtle',
        config.border,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {icon ? React.createElement(icon, { className: 'h-5 w-5 text-muted-foreground' }) : config.icon}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className={cn('text-sm font-semibold', config.titleColor)}>
              {title ?? defaultTitles[type]}
            </p>
            {collapsible && (
              <button
                type="button"
                onClick={handleToggle}
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {collapsed ? 'Show' : 'Hide'}
                {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
          {!collapsed && (
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type CalloutShortcutProps = Omit<ConceptCalloutProps, 'type'>;

export const TipCallout: React.FC<CalloutShortcutProps> = (props) => (
  <ConceptCallout type="tip" {...props} />
);

export const WarningCallout: React.FC<CalloutShortcutProps> = (props) => (
  <ConceptCallout type="warning" {...props} />
);

export const SuccessCallout: React.FC<CalloutShortcutProps> = (props) => (
  <ConceptCallout type="success" {...props} />
);

export const InfoCallout: React.FC<CalloutShortcutProps> = (props) => (
  <ConceptCallout type="info" {...props} />
);

export const DangerCallout: React.FC<CalloutShortcutProps> = (props) => (
  <ConceptCallout type="danger" {...props} />
);
