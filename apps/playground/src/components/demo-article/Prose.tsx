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
        // Size
        sizeClasses[size],
        // Max width
        maxWidthClasses[maxWidth],
        // Custom styling
        'prose-headings:scroll-mt-20', // Offset for fixed header
        'prose-headings:font-bold',
        'prose-h2:text-3xl',
        'prose-h2:mb-4',
        'prose-h2:mt-8',
        'prose-h3:text-2xl',
        'prose-h3:mb-3',
        'prose-h3:mt-6',
        'prose-h4:text-xl',
        'prose-h4:mb-2',
        'prose-h4:mt-4',
        'prose-p:leading-relaxed',
        'prose-p:mb-4',
        'prose-a:text-concept-cubit',
        'prose-a:no-underline',
        'prose-a:font-medium',
        'hover:prose-a:underline',
        'prose-strong:text-foreground',
        'prose-strong:font-semibold',
        'prose-code:text-concept-event',
        'prose-code:bg-accent/50',
        'prose-code:px-1.5',
        'prose-code:py-0.5',
        'prose-code:rounded',
        'prose-code:font-mono',
        'prose-code:text-sm',
        'prose-code:before:content-none',
        'prose-code:after:content-none',
        'prose-pre:bg-slate-900',
        'prose-pre:text-white',
        'dark:prose-pre:bg-slate-950',
        'prose-ul:my-4',
        'prose-ul:list-disc',
        'prose-ul:pl-6',
        'prose-ol:my-4',
        'prose-ol:list-decimal',
        'prose-ol:pl-6',
        'prose-li:my-2',
        'prose-blockquote:border-l-concept-cubit',
        'prose-blockquote:bg-accent/20',
        'prose-blockquote:py-2',
        'prose-blockquote:px-4',
        'prose-blockquote:rounded-r',
        'prose-blockquote:not-italic',
        'prose-img:rounded-lg',
        'prose-img:shadow-lg',
        className
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
        'text-concept-event',
        'bg-accent/50',
        'px-1.5 py-0.5',
        'rounded',
        'font-mono text-sm',
        className
      )}
    >
      {children}
    </code>
  );
};

export default Prose;
