import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Code, Sparkles } from 'lucide-react';
import { guideStructure } from '@/core/guide/guideStructure';
import { DemoRegistry } from '@/core/utils/demoRegistry';

interface StatCardProps {
  label: string;
  value: string | number;
  description: string;
}

function StatCard({ label, value, description }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

interface FeaturedDemoCardProps {
  sectionId: string;
  demoId: string;
  badge: string;
}

function FeaturedDemoCard({ sectionId, demoId, badge }: FeaturedDemoCardProps) {
  const demo = DemoRegistry.get(demoId);
  if (!demo) return null;

  return (
    <Link
      to={`/guide/${sectionId}/${demoId}`}
      className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-subtle transition-transform hover:-translate-y-1 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {badge}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <h3 className="mt-3 text-lg font-semibold text-foreground">
        {demo.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {demo.description}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4 text-xs text-muted-foreground">
        {demo.concepts.slice(0, 2).map((concept) => (
          <span
            key={concept}
            className="rounded-full border border-border bg-surface px-2 py-1"
          >
            {concept}
          </span>
        ))}
      </div>
    </Link>
  );
}

export function GuideLanding() {
  const sections = guideStructure.sections;
  const totalDemos = DemoRegistry.getAllDemos().length;
  const beginnerTotal = DemoRegistry.getByDifficulty('beginner').length;
  const advancedTotal = DemoRegistry.getByDifficulty('advanced').length;

  const firstSection = sections[0];
  const firstDemoId = firstSection?.demos[0];

  return (
    <div className="space-y-12">
      <section className="rounded-xl border border-border bg-surface p-8 shadow-subtle">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Guided curriculum
            </span>
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
              Master BlaC with a structured set of interactive guides
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Work through the core mental models behind Cubits and Blocs,
              explore practical patterns, and reinforce each topic with runnable
              examples that mirror real projects.
            </p>
            <div className="flex flex-wrap gap-3">
              {firstSection && firstDemoId && (
                <Link
                  to={`/guide/${firstSection.id}/${firstDemoId}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-subtle transition-transform hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <BookOpen className="h-4 w-4" />
                  Start learning
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                to="/playground"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
              >
                <Code className="h-4 w-4" />
                Open playground
              </Link>
            </div>
          </div>
          <div className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-background p-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              What you will find
            </h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>• Concept articles paired with runnable demos</li>
              <li>• Practical patterns for forms, data, and async flows</li>
              <li>• Tooling guidance for playground and devtools</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              {totalDemos} demos · {sections.length} sections · Updated as the
              libraries evolve
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Guide sections"
          value={sections.length}
          description="Progress from fundamentals to advanced topics in order."
        />
        <StatCard
          label="Interactive demos"
          value={totalDemos}
          description="Each article pairs with a runnable example you can edit."
        />
        <StatCard
          label="Beginner friendly"
          value={beginnerTotal}
          description="Hands-on starting points that assume no prior BlaC knowledge."
        />
        <StatCard
          label="Advanced explorations"
          value={advancedTotal}
          description="Deep dives on selectors, composition, and plugin authoring."
        />
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Curriculum overview
        </h2>
        <div className="space-y-4">
          {sections.map((section) => {
            const demos = section.demos
              .map((demoId) => DemoRegistry.get(demoId))
              .filter((demo): demo is NonNullable<typeof demo> =>
                Boolean(demo),
              );

            const beginnerCount = demos.filter(
              (demo) => demo.difficulty === 'beginner',
            ).length;
            const intermediateCount = demos.filter(
              (demo) => demo.difficulty === 'intermediate',
            ).length;
            const advancedCount = demos.filter(
              (demo) => demo.difficulty === 'advanced',
            ).length;

            const primaryDemoId = section.demos[0];

            return (
              <Link
                key={section.id}
                to={`/guide/${section.id}/${primaryDemoId}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-5 py-4 shadow-subtle transition-colors hover:bg-surface-muted"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-background px-2 py-1">
                    {section.demos.length} demos
                  </span>
                  {beginnerCount > 0 && (
                    <span className="rounded-full border border-border bg-background px-2 py-1">
                      {beginnerCount} beginner
                    </span>
                  )}
                  {intermediateCount > 0 && (
                    <span className="rounded-full border border-border bg-background px-2 py-1">
                      {intermediateCount} intermediate
                    </span>
                  )}
                  {advancedCount > 0 && (
                    <span className="rounded-full border border-border bg-background px-2 py-1">
                      {advancedCount} advanced
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" />
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Featured demos
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FeaturedDemoCard
            sectionId="getting-started"
            demoId="hello-world"
            badge="Start here"
          />
          <FeaturedDemoCard
            sectionId="core-concepts"
            demoId="bloc-vs-cubit"
            badge="Core concept"
          />
          <FeaturedDemoCard
            sectionId="patterns"
            demoId="todo-bloc"
            badge="Practical pattern"
          />
          <FeaturedDemoCard
            sectionId="advanced"
            demoId="async-operations"
            badge="Advanced topic"
          />
        </div>
      </section>
    </div>
  );
}
