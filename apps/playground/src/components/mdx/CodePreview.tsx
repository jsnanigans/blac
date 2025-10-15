import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface CodePreviewProps {
  /**
   * The code to display
   */
  code: string;
  /**
   * Optional title for the code block
   */
  title?: string;
  /**
   * Language for syntax highlighting
   */
  language?: string;
  /**
   * Optional preview component to render alongside the code
   */
  preview?: React.ReactNode;
  /**
   * Show line numbers
   */
  showLineNumbers?: boolean;
  /**
   * Highlight specific lines (e.g., "1,3-5,10")
   */
  highlightLines?: string;
  /**
   * Start with preview or code tab active
   */
  defaultTab?: 'preview' | 'code';
}

export function CodePreview({
  code,
  title,
  language = 'typescript',
  preview,
  showLineNumbers = false,
  highlightLines,
  defaultTab = 'preview',
}: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>(preview ? defaultTab : 'code');

  const lines = code.split('\n');

  // Parse highlight lines string (e.g., "1,3-5,10" -> [1, 3, 4, 5, 10])
  const highlightedLines = React.useMemo(() => {
    if (!highlightLines) return new Set<number>();
    const ranges = highlightLines.split(',');
    const lineNumbers = new Set<number>();
    ranges.forEach((range) => {
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          lineNumbers.add(i);
        }
      } else {
        lineNumbers.add(Number(range));
      }
    });
    return lineNumbers;
  }, [highlightLines]);

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      {/* Header */}
      {(title || preview) && (
        <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-2">
          {title && <div className="text-sm font-semibold text-foreground">{title}</div>}
          {preview && (
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'rounded px-3 py-1 text-xs font-medium transition-colors',
                  activeTab === 'preview'
                    ? 'bg-brand/10 text-brand'
                    : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                )}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={cn(
                  'rounded px-3 py-1 text-xs font-medium transition-colors',
                  activeTab === 'code'
                    ? 'bg-brand/10 text-brand'
                    : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                )}
              >
                Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {activeTab === 'preview' && preview ? (
        <div className="p-6">{preview}</div>
      ) : (
        <div className="relative">
          {/* Language badge */}
          {language && (
            <div className="absolute right-3 top-3 rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {language}
            </div>
          )}

          {/* Code block */}
          <pre className="overflow-x-auto bg-muted p-4">
            <code className="font-mono text-sm text-foreground">
              {lines.map((line, index) => {
                const lineNumber = index + 1;
                const isHighlighted = highlightedLines.has(lineNumber);
                return (
                  <div
                    key={index}
                    className={cn(
                      'leading-6',
                      isHighlighted && 'bg-brand/10 -mx-4 px-4 border-l-2 border-brand',
                    )}
                  >
                    {showLineNumbers && (
                      <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground/50">
                        {lineNumber}
                      </span>
                    )}
                    {line || ' '}
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}

interface CodeSplitProps {
  /**
   * The code to display
   */
  children: string;
  /**
   * Optional title
   */
  title?: string;
  /**
   * Language for syntax highlighting
   */
  language?: string;
  /**
   * Show line numbers
   */
  showLineNumbers?: boolean;
}

/**
 * A simpler code block component for when you just want to show code
 */
export function CodeSplit({
  children,
  title,
  language = 'typescript',
  showLineNumbers = false,
}: CodeSplitProps) {
  return (
    <CodePreview
      code={children}
      title={title}
      language={language}
      showLineNumbers={showLineNumbers}
    />
  );
}
