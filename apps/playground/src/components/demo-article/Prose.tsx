import React from 'react';
import { cn } from '../../lib/utils';

export interface ProseProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'base' | 'lg';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'prose-sm',
  base: 'prose-base',
  lg: 'prose-lg',
};

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  full: 'max-w-full',
};

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
        'prose-headings:font-semibold prose-headings:text-foreground',
        'prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-3xl sm:prose-h2:text-4xl',
        'prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-2xl sm:prose-h3:text-3xl',
        'prose-p:leading-relaxed prose-p:text-muted-foreground',
        'prose-a:text-brand hover:prose-a:underline',
        'prose-code:rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-slate-900 prose-pre:text-slate-50 dark:prose-pre:bg-slate-950',
        'prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-700',
        'prose-blockquote:bg-slate-100/60 prose-blockquote:px-4 prose-blockquote:py-2 dark:prose-blockquote:bg-slate-900/60',
        'prose-ul:pl-6 prose-ol:pl-6',
        sizeClasses[size],
        maxWidthClasses[maxWidth],
        className,
      )}
    >
      {children}
    </div>
  );
};

export const InlineCode: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <code
      className={cn(
        'rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100',
        className,
      )}
    >
      {children}
    </code>
  );
};

export default Prose;
