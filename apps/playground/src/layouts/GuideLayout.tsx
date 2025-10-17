import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GuideSidebar } from '@/components/guide/GuideSidebar';
import { GuideNavigation } from '@/components/guide/GuideNavigation';
import {
  getBreadcrumbs,
  getNavigationForDemo,
  getSection,
} from '@/core/guide/guideStructure';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import { PageHeader } from '@/layouts/PageHeader';

interface MetaBlockProps {
  label: string;
  children: React.ReactNode;
}

function MetaBlock({ label, children }: MetaBlockProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function MetaChips({
  items,
  emptyLabel,
}: {
  items?: string[];
  emptyLabel: string;
}) {
  if (!items || items.length === 0) {
    return (
      <span className="text-sm text-muted-foreground/70">
        {emptyLabel}
      </span>
    );
  }

  const formatChip = (value: string) => {
    const withSpaces = value.replace(/[-_]/g, ' ');
    if (value === value.toLowerCase()) {
      return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
    }
    return withSpaces;
  };

  return (
    <>
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-full border border-border/70 bg-surface px-3 py-1 text-xs font-medium text-muted-foreground"
        >
          #{formatChip(item)}
        </span>
      ))}
    </>
  );
}

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
  const breadcrumbs = getBreadcrumbs(currentSection, currentDemo);
  const navigation =
    currentSection && currentDemo
      ? getNavigationForDemo(currentSection, currentDemo)
      : null;

  const section = currentSection ? getSection(currentSection) : undefined;
  const demo = currentDemo ? DemoRegistry.get(currentDemo) : undefined;

  const difficultyLabel = demo?.difficulty
    ? `${demo.difficulty.charAt(0).toUpperCase()}${demo.difficulty.slice(1)}`
    : null;

  const difficultyColor: Record<string, string> = {
    beginner:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
    intermediate:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
    advanced:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
  };

  useEffect(() => {
    //scroll to top, if in browser
    document.scrollingElement?.scrollTo({
      top: 0,
      behavior: 'instant'
    })

  }, [navigation?.current.path])

  return (
    <div
      id="guide-layout"
      className={cn(
        'relative bg-background',
        className,
      )}
    >
      <div id="guide-layout-shell" className="flex min-h-screen">
        <div id="guide-layout-sidebar" className="contents">
          <GuideSidebar currentSection={currentSection} currentDemo={currentDemo} />
        </div>

        <div id="guide-layout-main" className="relative flex flex-1 flex-col min-w-0">
          <div
            id="guide-layout-header"
            className="border-b border-border/80 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80"
          >
            <PageHeader
              id="guide-page-header"
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
            </PageHeader>
          </div>

          <main id="guide-layout-content" className="flex-1">
            <div id="guide-article-container" className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-4 lg:py-12 lg:pt-0">
              <div id="guide-article-content" className="min-w-0 space-y-12 max-w-2xl">{children}</div>
              {showNavigation && navigation && (
                <GuideNavigation id="guide-page-navigation" navigation={navigation} className="mt-12" />
              )}
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
      id="guide-simple-layout"
      className={cn(
        'min-h-[calc(100vh-3.5rem)] bg-background',
        className,
      )}
    >
      <div
        id="guide-simple-layout-header"
        className="border-b border-border/80 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80"
      >
        <div id="guide-simple-layout-header-inner" className="mx-auto w-full max-w-6xl px-4 py-6">
          <PageHeader
            id="guide-simple-page-header"
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

      <main id="guide-simple-layout-content" className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-12">
        <div id="guide-simple-layout-body" className="space-y-10">
          {children}
        </div>
      </main>
    </div>
  );
}
