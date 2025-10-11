/**
 * CodePanel Component
 *
 * Syntax-highlighted code display with interactive features.
 *
 * Features:
 * - Syntax highlighting (using prism-react-renderer)
 * - Copy button functionality
 * - Line highlighting with labels
 * - Expandable/collapsible option
 * - Language indicator
 *
 * @example
 * ```tsx
 * <CodePanel
 *   code={sourceCode}
 *   language="typescript"
 *   highlightLines={[3, 4, 5]}
 *   lineLabels={{ 3: 'Important!' }}
 *   showLineNumbers
 * />
 * ```
 */

import React, { useState } from 'react';
import { Highlight, themes, type Language } from 'prism-react-renderer';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { variants } from '../../utils/animations';

/**
 * CodePanel props
 */
export interface CodePanelProps {
  /** Source code to display */
  code: string;

  /** Programming language for syntax highlighting */
  language: Language;

  /** Title/filename to display */
  title?: string;

  /** Line numbers to highlight */
  highlightLines?: number[];

  /** Labels for specific lines */
  lineLabels?: Record<number, string>;

  /** Show line numbers */
  showLineNumbers?: boolean;

  /** Allow collapsing the code */
  collapsible?: boolean;

  /** Start collapsed */
  defaultCollapsed?: boolean;

  /** Maximum height before scrolling */
  maxHeight?: string;

  /** Additional CSS classes */
  className?: string;
}

/**
 * CodePanel Component
 */
export const CodePanel: React.FC<CodePanelProps> = ({
  code,
  language,
  title,
  highlightLines = [],
  lineLabels = {},
  showLineNumbers = true,
  collapsible = false,
  defaultCollapsed = false,
  maxHeight = '500px',
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Toggle collapse state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants.slideUp}
      className={cn(
        'code-panel',
        'rounded-lg overflow-hidden',
        'border border-border',
        'bg-slate-900 dark:bg-slate-950',
        'shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 dark:bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-3">
          {/* Language badge */}
          <span className="text-xs font-mono text-slate-400 uppercase">
            {language}
          </span>

          {/* Title */}
          {title && (
            <span className="text-sm font-medium text-slate-300">{title}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={cn(
              'p-1.5 rounded transition-colors',
              copied
                ? 'bg-semantic-success/20 text-semantic-success'
                : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
            )}
            aria-label="Copy code"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Collapse button */}
          {collapsible && (
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label={isCollapsed ? 'Expand code' : 'Collapse code'}
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

      {/* Code content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
              {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={cn(highlightClassName, 'overflow-x-auto')}
                  style={{
                    ...style,
                    maxHeight,
                    margin: 0,
                    padding: '1rem',
                  }}
                >
                  {tokens.map((line, lineIndex) => {
                    const lineNumber = lineIndex + 1;
                    const isHighlighted = highlightLines.includes(lineNumber);
                    const lineLabel = lineLabels[lineNumber];

                    return (
                      <div
                        key={lineIndex}
                        {...getLineProps({ line })}
                        className={cn(
                          'relative',
                          isHighlighted && 'bg-concept-cubit/10',
                          isHighlighted && 'border-l-2 border-l-concept-cubit',
                          lineLabel && 'mb-6' // Extra space for label
                        )}
                      >
                        <div className="flex">
                          {/* Line number */}
                          {showLineNumbers && (
                            <span
                              className={cn(
                                'select-none inline-block w-8 text-right mr-4',
                                isHighlighted
                                  ? 'text-concept-cubit font-semibold'
                                  : 'text-slate-600'
                              )}
                            >
                              {lineNumber}
                            </span>
                          )}

                          {/* Code tokens */}
                          <span>
                            {line.map((token, key) => (
                              <span key={key} {...getTokenProps({ token })} />
                            ))}
                          </span>
                        </div>

                        {/* Line label */}
                        {lineLabel && (
                          <div className="absolute left-0 right-0 mt-1">
                            <span className="inline-block ml-12 px-2 py-0.5 text-xs font-medium bg-concept-cubit text-white rounded">
                              {lineLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </pre>
              )}
            </Highlight>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CodePanel;
