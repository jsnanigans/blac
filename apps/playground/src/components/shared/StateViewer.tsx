/**
 * StateViewer Component
 *
 * Displays live state from a Bloc/Cubit instance with color-coded values.
 *
 * Features:
 * - Auto-subscribe to Bloc/Cubit instance
 * - Color-code values by type (string, number, boolean, object, etc.)
 * - Expandable/collapsible for nested objects
 * - Smooth transitions on state changes
 * - Copy state to clipboard button
 * - Max depth configuration
 * - Custom render prop support
 *
 * @example
 * ```tsx
 * <StateViewer
 *   bloc={counterCubit}
 *   title="Counter State"
 *   maxDepth={3}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useBloc } from '@blac/react';
import type { BlocBase } from '@blac/core';
import { cn } from '../../lib/utils';
import { getTypeText, getTypeBg } from '../../utils/design-tokens';
import { variants } from '../../utils/animations';

/**
 * StateViewer props
 */
export interface StateViewerProps<TState = unknown> {
  /** Bloc or Cubit class to subscribe to */
  bloc: new (...args: any[]) => BlocBase<TState>;

  /** Optional title */
  title?: string;

  /** Maximum depth for nested objects */
  maxDepth?: number;

  /** Custom render function for state */
  render?: (state: TState) => React.ReactNode;

  /** Start collapsed */
  defaultCollapsed?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Show copy button */
  showCopy?: boolean;
}

/**
 * ValueDisplay Component
 * Displays a single value with type-based color coding
 */
const ValueDisplay: React.FC<{
  value: unknown;
  depth: number;
  maxDepth: number;
  label?: string;
}> = ({ value, depth, maxDepth, label }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  // Handle null/undefined
  if (value === null) {
    return <span className="text-slate-500 italic">null</span>;
  }
  if (value === undefined) {
    return <span className="text-slate-500 italic">undefined</span>;
  }

  const valueType = typeof value;

  // Handle arrays
  if (Array.isArray(value)) {
    if (depth >= maxDepth) {
      return <span className="text-slate-500">[Array({value.length})]</span>;
    }

    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span className={cn(getTypeBg('object'), 'px-1.5 py-0.5 rounded text-xs')}>
            Array({value.length})
          </span>
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {value.map((item, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-slate-500 text-sm">{index}:</span>
                <ValueDisplay value={item} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle objects
  if (valueType === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);

    if (depth >= maxDepth) {
      return <span className="text-slate-500">[Object]</span>;
    }

    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span className={cn(getTypeBg('object'), 'px-1.5 py-0.5 rounded text-xs')}>
            Object({entries.length})
          </span>
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {entries.map(([key, val]) => (
              <div key={key} className="flex gap-2">
                <span className="text-slate-400 text-sm font-mono">{key}:</span>
                <ValueDisplay value={val} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle primitives
  const displayValue = String(value);
  const textColor = getTypeText(value);

  return (
    <span className={cn('font-mono text-sm', textColor)}>
      {valueType === 'string' && '"'}
      {displayValue}
      {valueType === 'string' && '"'}
    </span>
  );
};

/**
 * StateViewer Component
 */
export const StateViewer = <TState = unknown,>({
  bloc,
  title = 'State',
  maxDepth = 5,
  render,
  defaultCollapsed = false,
  className,
  showCopy = true,
}: StateViewerProps<TState>) => {
  const [state] = useBloc(bloc);
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [pulseKey, setPulseKey] = useState(0);

  // Trigger pulse animation on state change
  useEffect(() => {
    setPulseKey((prev) => prev + 1);
  }, [state]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy state:', err);
    }
  };

  return (
    <motion.div
      key={pulseKey}
      animate="animate"
      variants={variants.pulse}
      className={cn(
        'state-viewer',
        'rounded-lg border border-border',
        'bg-card shadow-lg',
        'overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-accent/50 border-b border-border">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 hover:text-foreground transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          <span className="font-semibold text-sm">{title}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Copy button */}
          {showCopy && !isCollapsed && (
            <button
              onClick={handleCopy}
              className={cn(
                'p-1.5 rounded transition-colors',
                copied
                  ? 'bg-semantic-success/20 text-semantic-success'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
              aria-label="Copy state"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* State content */}
      {!isCollapsed && (
        <div className="p-4">
          {render ? (
            render(state)
          ) : (
            <ValueDisplay value={state} depth={0} maxDepth={maxDepth} />
          )}
        </div>
      )}
    </motion.div>
  );
};

export default StateViewer;
