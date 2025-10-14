import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GuideSidebar } from '@/components/guide/GuideSidebar';
import { GuideNavigation } from '@/components/guide/GuideNavigation';
import {
  getBreadcrumbs,
  getNavigationForDemo,
  getSection,
} from '@/core/guide/guideStructure';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import { PageHeader, PageHeaderStat } from '@/layouts/PageHeader';
import { useHeaderVisibility } from '@/hooks/useHeaderVisibility';

interface GuideLayoutProps {
  children: React.ReactNode;
  currentSection?: string;
  currentDemo?: string;
  showNavigation?: boolean;
  className?: string;
}

export function GuideLayout({
  children,
  currentSection,
  currentDemo,
  showNavigation = true,
  className
}: GuideLayoutProps) {
  const { isHeaderVisible } = useHeaderVisibility();
  const breadcrumbs = getBreadcrumbs(currentSection, currentDemo);
  const navigation =
    currentSection && currentDemo
      ? getNavigationForDemo(currentSection, currentDemo)
      : null;

  const section = currentSection ? getSection(currentSection) : undefined;
  const demo = currentDemo ? DemoRegistry.get(currentDemo) : undefined;

  // Calculate top position based on header visibility
  const navigationTop = isHeaderVisible ? 'top-20' : 'top-1';

  const difficultyLabel = demo?.difficulty
    ? `${demo.difficulty.charAt(0).toUpperCase()}${demo.difficulty.slice(1)}`
    : null;

  const difficultyColor: Record<string, string> = {
    beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
    intermediate:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
    advanced:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
  };

  return (
    <div
      className={cn(
        'relative bg-gradient-to-br from-background/60 via-background to-surface-muted/60',
        className,
      )}
    >
      <div className="flex min-h-screen">
        <GuideSidebar currentSection={currentSection} currentDemo={currentDemo} />

        <div className="relative flex flex-1 flex-col min-w-0">
          <div className="border-b border-border/80 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
            <PageHeader
              title={demo?.title ?? 'BlaC Learning Guide'}
              description={demo?.description ?? section?.description}
              eyebrow={section?.title ?? 'Guide'}
              breadcrumbs={breadcrumbs}
              meta={
                difficultyLabel && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                      difficultyColor[demo?.difficulty ?? 'beginner'],
                    )}
                  >
                    {difficultyLabel}
                  </span>
                )
              }
            >
              {demo && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <PageHeaderStat value={section?.title ?? 'Learning Path'} label="Section" />
                  <PageHeaderStat
                    value={`${demo.tags.length || 0}`}
                    label="Concept Tags"
                  />
                  <PageHeaderStat value={demo.concepts.length || 0} label="Key Concepts" />
                </div>
              )}
            </PageHeader>
          </div>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-12">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0 space-y-10">{children}</div>
                {showNavigation && navigation && (
                  <div className="relative">
                    <div className={cn('sticky transition-[top] duration-300', navigationTop)}>
                      <GuideNavigation navigation={navigation} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Simplified layout for landing page
export function GuideSimpleLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const breadcrumbs = getBreadcrumbs();

  return (
    <div
      className={cn(
        'min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-background/70 via-background to-surface-muted/50',
        className,
      )}
    >
      <div className="border-b border-border/80 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <PageHeader
            title="BlaC Learning Guide"
            description="Master BlaC’s mental models through curated demos, deep dives, and hands-on tutorials."
            eyebrow="Guide"
            breadcrumbs={breadcrumbs}
            actions={
              <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
                Updated weekly
              </span>
            }
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-12">
        <div className="space-y-10">
          {children}
        </div>
      </main>
    </div>
  );
}
