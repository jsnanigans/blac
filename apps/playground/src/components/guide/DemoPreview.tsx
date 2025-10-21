import React from 'react';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import { cn } from '@/lib/utils';

interface DemoPreviewProps {
  demoId: string;
  title?: string;
  description?: string;
  className?: string;
  showHeader?: boolean;
}

export function DemoPreview({
  demoId,
  title,
  description,
  className,
  showHeader = true,
}: DemoPreviewProps) {
  const demo = DemoRegistry.get(demoId);

  if (!demo) {
    return (
      <div className="my-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Demo not found: {demoId}
        </p>
      </div>
    );
  }

  const DemoComponent = demo.component;
  const displayTitle = title || demo.title;
  const displayDescription = description || demo.description;

  return (
    <div
      className={cn(
        'not-prose my-8 overflow-hidden rounded-lg border border-border bg-surface shadow-subtle',
        className,
      )}
    >
      {showHeader && (
        <div className="border-b border-border bg-surface-muted px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground">
                {displayTitle}
              </h4>
              {displayDescription && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {displayDescription}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
                  demo.difficulty === 'beginner' &&
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                  demo.difficulty === 'intermediate' &&
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                  demo.difficulty === 'advanced' &&
                    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                )}
              >
                {demo.difficulty}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="p-6">
        <DemoComponent />
      </div>
    </div>
  );
}
