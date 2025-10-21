import * as React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: PageHeaderBreadcrumb[];
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

const BreadcrumbLink: React.FC<PageHeaderBreadcrumb> = ({ label, href }) => {
  if (!href) {
    return (
      <span className="text-sm font-medium text-muted-foreground/80">
        {label}
      </span>
    );
  }
  return (
    <Link
      to={href}
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </Link>
  );
};

export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  meta,
  actions,
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        'relative border-b border-border bg-surface py-8 sm:py-10',
        className,
      )}
      {...props}
    >
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brand/10 to-transparent" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={`${crumb.label}-${index}`}>
                <BreadcrumbLink {...crumb} />
                {index < breadcrumbs.length - 1 && (
                  <span className="text-muted-foreground/50">/</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            {eyebrow && (
              <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
                {eyebrow}
              </span>
            )}
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              {description && (
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                  {description}
                </p>
              )}
            </div>
          </div>

          {(actions || meta) && (
            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              {meta && (
                <div className="inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {meta}
                </div>
              )}
              {actions && (
                <div className="inline-flex flex-wrap items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
          )}
        </div>

        {children && <div className="mt-2 grid gap-4 sm:mt-4">{children}</div>}
      </div>
    </section>
  );
}

interface PageHeaderStatProps {
  value: string | number;
  label: string;
}

export const PageHeaderStat: React.FC<PageHeaderStatProps> = ({
  value,
  label,
}) => (
  <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-muted/60 px-4 py-3">
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    <span className="text-2xl font-semibold text-foreground">{value}</span>
  </div>
);
