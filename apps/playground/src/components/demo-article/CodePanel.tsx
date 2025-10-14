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

import React, { useState, useEffect } from 'react';
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
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

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

  const lightCodeTheme = (themes as Record<string, any>).nightOwlLight ?? themes.github;
  const darkCodeTheme = themes.nightOwl;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants.slideUp}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-subtle',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.18),_transparent_55%)] opacity-90" />
      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border/70 bg-surface-muted/80 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Language badge */}
          <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand">
            {language}
          </span>

          {/* Title */}
          {title && (
            <span className="text-sm font-semibold text-foreground">{title}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors',
              copied && 'border-emerald-300/70 bg-emerald-100 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300',
              !copied && 'hover:text-foreground',
            )}
            aria-label="Copy code"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Collapse button */}
          {collapsible && (
            <button
              onClick={toggleCollapse}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
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
            <Highlight
              theme={isDarkMode ? darkCodeTheme : lightCodeTheme}
              code={code.trim()}
              language={language}
            >
              {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={cn(
                    highlightClassName,
                    'relative overflow-auto rounded-b-3xl bg-[rgba(2,6,23,0.92)] dark:bg-[rgba(2,6,23,0.92)]',
                    !isDarkMode && 'bg-[#0f172a]/90 text-white',
                  )}
                  style={{
                    ...style,
                    margin: 0,
                    padding: '1.25rem 1.5rem',
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
                          'relative rounded-lg px-2 py-1 transition-colors',
                          isHighlighted && 'bg-brand/10 ring-1 ring-brand/30',
                          lineLabel && 'mb-6',
                        )}
                      >
                        <div className="flex">
                          {/* Line number */}
                          {showLineNumbers && (
                            <span
                              className={cn(
                                'mr-4 inline-block w-10 select-none text-right font-mono text-[11px]',
                                isHighlighted
                                  ? 'text-brand font-semibold'
                                  : 'text-slate-500',
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
                          <div className="mt-1 flex items-center pl-12">
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-foreground shadow-subtle">
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
