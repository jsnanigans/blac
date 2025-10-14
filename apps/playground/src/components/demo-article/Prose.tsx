/**
 * Prose Component
 *
 * Typography component with optimal readability for article-style content.
 *
 * Features:
 * - Line length constraints (60-80 characters)
 * - Proper heading hierarchy
 * - List styling
 * - Code inline styling
 * - Responsive typography
 *
 * @example
 * ```tsx
 * <Prose>
 *   <p>This is readable content...</p>
 *   <h3>Subheading</h3>
 *   <ul>
 *     <li>List item</li>
 *   </ul>
 * </Prose>
 * ```
 */

import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Prose props
 */
export interface ProseProps {
  /** Content children */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Size variant */
  size?: 'sm' | 'base' | 'lg';

  /** Max width constraint */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Size classes
 */
const sizeClasses = {
  sm: 'prose-sm',
  base: 'prose-base',
  lg: 'prose-lg',
};

/**
 * Max width classes
 */
const maxWidthClasses = {
  sm: 'max-w-2xl', // ~672px
  md: 'max-w-3xl', // ~768px
  lg: 'max-w-4xl', // ~896px
  xl: 'max-w-5xl', // ~1024px
  full: 'max-w-full',
};

/**
 * Prose Component
 *
 * Uses Tailwind's prose plugin styling with customizations
 * for optimal readability in educational content.
 */
export const Prose: React.FC<ProseProps> = ({
  children,
  className,
  size = 'base',
  maxWidth = 'md',
}) => {
  return (
    <div
      className={cn(
        'prose prose-slate dark:prose-invert',
        sizeClasses[size],
        maxWidthClasses[maxWidth],
        // Headings
        'prose-headings:scroll-mt-24',
        'prose-headings:font-semibold',
        'prose-headings:tracking-tight',
        'prose-h2:text-3xl sm:prose-h2:text-4xl',
        'prose-h2:mt-14 prose-h2:mb-6',
        'prose-h2:text-brand',
        'dark:prose-h2:text-brand',
        'prose-h3:text-2xl sm:prose-h3:text-3xl',
        'prose-h3:mt-10 prose-h3:mb-4',
        'prose-h3:text-fuchsia-500 dark:prose-h3:text-fuchsia-400',
        'prose-h4:text-xl sm:prose-h4:text-2xl',
        'prose-h4:mt-8 prose-h4:mb-3',
        'prose-h4:text-indigo-500 dark:prose-h4:text-indigo-300',
        // Paragraphs
        'prose-p:leading-[1.75]',
        'prose-p:mb-6',
        'prose-p:text-muted-foreground',
        // Links
        'prose-a:rounded-full prose-a:bg-brand/10 prose-a:px-2.5 prose-a:py-0.5 prose-a:text-sm prose-a:font-semibold prose-a:text-brand prose-a:no-underline',
        'hover:prose-a:bg-brand/20',
        // Strong
        'prose-strong:text-foreground prose-strong:font-semibold',
        // Inline code
        'prose-code:rounded-md prose-code:bg-rose-100 prose-code:px-2 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:text-rose-600 dark:prose-code:bg-rose-900/40 dark:prose-code:text-rose-200',
        'prose-code:before:content-none prose-code:after:content-none',
        // Code blocks
        'prose-pre:bg-slate-900 prose-pre:text-slate-200 dark:prose-pre:bg-slate-950',
        // Lists
        'prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6',
        'prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6',
        'prose-li:my-2 prose-li:leading-relaxed',
        // Blockquotes
        'prose-blockquote:border-l-4 prose-blockquote:border-l-brand/70',
        'prose-blockquote:bg-gradient-to-r prose-blockquote:from-brand/10 prose-blockquote:via-transparent prose-blockquote:to-transparent',
        'prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:rounded-2xl prose-blockquote:not-italic prose-blockquote:text-foreground/90',
        // Tables & images
        'prose-img:rounded-2xl prose-img:shadow-subtle',
        className,
      )}
    >
      {children}
    </div>
  );
};

/**
 * Inline code component for use outside of Prose
 */
export const InlineCode: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <code
      className={cn(
        'rounded-md bg-rose-100 px-1.5 py-0.5 font-mono text-sm text-rose-600 dark:bg-rose-900/40 dark:text-rose-200',
        className,
      )}
    >
      {children}
    </code>
  );
};

export default Prose;
