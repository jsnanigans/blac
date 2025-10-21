import React from 'react';
import { Link } from 'react-router-dom';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import { guideStructure } from '@/core/guide/guideStructure';
import { cn } from '@/lib/utils';

interface GuideArticleProps {
  demoId: string;
  sectionId?: string;
  children?: React.ReactNode;
}

function getSectionForDemo(demoId: string, explicitSectionId?: string) {
  if (explicitSectionId) {
    return guideStructure.sections.find(
      (section) => section.id === explicitSectionId,
    );
  }

  return guideStructure.sections.find((section) =>
    section.demos.includes(demoId),
  );
}

function formatDifficulty(value: string | undefined) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function GuideArticle({
  demoId,
  sectionId,
  children,
}: GuideArticleProps) {
  const demo = DemoRegistry.get(demoId);
  const section = getSectionForDemo(demoId, sectionId);

  if (!demo) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 shadow-subtle">
        <h1 className="text-xl font-semibold text-foreground">
          Demo not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The guide entry could not be located. Please check the URL or pick
          another demo from the navigation.
        </p>
      </div>
    );
  }

  const description =
    demo.description ?? 'This demo does not yet have a description.';

  return (
    <article className="space-y-10">
      <section className="max-w-none">
        {children ? children : <p>{description}</p>}
      </section>

      {demo.relatedDemos && demo.relatedDemos.length > 0 && (
        <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-subtle">
          <h2 className="text-lg font-semibold text-foreground">
            Related demos
          </h2>
          <div className="flex flex-wrap gap-2">
            {demo.relatedDemos.map((relatedId) => {
              const related = DemoRegistry.get(relatedId);
              if (!related) return null;
              const relatedSection = getSectionForDemo(relatedId);
              const url = relatedSection
                ? `/guide/${relatedSection.id}/${related.id}`
                : `/guide`;
              return (
                <Link
                  key={relatedId}
                  to={url}
                  className="inline-flex items-center rounded-md border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
                >
                  {related.title}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}

export function GuideArticleNote({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted-foreground shadow-subtle',
        className,
      )}
    >
      <p className="font-semibold text-foreground">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

// Semantic note variants
export function InfoNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-subtle dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
      <p className="font-semibold text-blue-950 dark:text-blue-50">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

export function WarningNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-subtle dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-semibold text-amber-950 dark:text-amber-50">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

export function DangerNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-subtle dark:border-red-900 dark:bg-red-950 dark:text-red-100">
      <p className="font-semibold text-red-950 dark:text-red-50">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

export function SuccessNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 shadow-subtle dark:border-green-900 dark:bg-green-950 dark:text-green-100">
      <p className="font-semibold text-green-950 dark:text-green-50">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}
