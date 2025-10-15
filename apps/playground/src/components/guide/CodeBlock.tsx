import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children?: string;
  className?: string;
  inline?: boolean;
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  // Extract language from className (format: language-js, language-typescript, etc.)
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  // If inline code or no language specified, render simple code element
  if (inline || !language) {
    return (
      <code
        className={cn(
          'rounded bg-muted px-1.5 py-0.5 font-mono text-sm before:content-none after:content-none',
          className,
        )}
      >
        {children}
      </code>
    );
  }

  // For code blocks with language, use syntax highlighting
  return (
    <div className="relative my-4 overflow-hidden rounded-lg border border-border bg-muted">
      {language && (
        <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {language}
          </span>
        </div>
      )}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
        showLineNumbers={false}
        wrapLines={true}
        wrapLongLines={true}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
}
