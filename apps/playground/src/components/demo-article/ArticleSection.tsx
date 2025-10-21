import React from 'react';
import { cn } from '../../lib/utils';

export type SectionTheme =
  | 'neutral'
  | 'cubit'
  | 'bloc'
  | 'event'
  | 'tip'
  | 'warning'
  | 'success'
  | 'info'
  | 'danger';

const themeStyles: Record<SectionTheme, { border: string; badge: string }> = {
  neutral: { border: 'border-border', badge: 'text-muted-foreground' },
  cubit: { border: 'border-sky-300', badge: 'text-sky-600 dark:text-sky-300' },
  bloc: {
    border: 'border-violet-300',
    badge: 'text-violet-600 dark:text-violet-300',
  },
  event: {
    border: 'border-amber-300',
    badge: 'text-amber-600 dark:text-amber-300',
  },
  tip: { border: 'border-cyan-300', badge: 'text-cyan-600 dark:text-cyan-300' },
  warning: {
    border: 'border-amber-400',
    badge: 'text-amber-700 dark:text-amber-300',
  },
  success: {
    border: 'border-emerald-300',
    badge: 'text-emerald-600 dark:text-emerald-300',
  },
  info: {
    border: 'border-blue-300',
    badge: 'text-blue-600 dark:text-blue-300',
  },
  danger: {
    border: 'border-rose-300',
    badge: 'text-rose-600 dark:text-rose-300',
  },
};

export interface ArticleSectionProps {
  theme?: SectionTheme;
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h2
    className={cn(
      'text-2xl font-semibold text-foreground sm:text-3xl',
      className,
    )}
  >
    {children}
  </h2>
);

export const ArticleSection: React.FC<ArticleSectionProps> = ({
  theme = 'neutral',
  id,
  title,
  children,
  className,
}) => {
  const themeStyle = themeStyles[theme] ?? themeStyles.neutral;

  return (
    <section
      id={id}
      className={cn(
        'space-y-4 rounded-lg border bg-background px-5 py-6 shadow-subtle',
        themeStyle.border,
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-4">
          <SectionHeader>{title}</SectionHeader>
          {theme !== 'neutral' && (
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-wide',
                themeStyle.badge,
              )}
            >
              {theme}
            </span>
          )}
        </div>
      )}
      <div className="space-y-4 text-base leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  );
};

export default ArticleSection;
