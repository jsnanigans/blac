import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Code, Compass, LayoutTemplate, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { guideStructure } from '@/core/guide/guideStructure';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import { motion } from 'framer-motion';

const highlightPalette = {
  'getting-started': 'from-sky-500/20 via-sky-400/10 to-transparent',
  'core-concepts': 'from-violet-500/20 via-fuchsia-400/10 to-transparent',
  patterns: 'from-emerald-500/20 via-emerald-400/10 to-transparent',
  advanced: 'from-orange-500/20 via-orange-400/10 to-transparent',
  plugins: 'from-cyan-500/20 via-cyan-400/10 to-transparent',
};

export function GuideLanding() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-8 shadow-subtle sm:px-10 sm:py-12"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand/15 via-transparent to-purple-500/10" />
        <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_minmax(0,0.85fr)]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
              Guided curriculum
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Master BlaC, one interactive demo at a time
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              Learn the mental models behind Cubits and Blocs, unlock advanced patterns, and practice in a friendly workspace designed for iteration.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/guide/${guideStructure.sections[0].id}/${guideStructure.sections[0].demos[0]}`}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-subtle transition-transform hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <BookOpen className="h-4 w-4" />
                Start learning
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/playground"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
              >
                <Code className="h-4 w-4" />
                Jump to playground
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface/70 p-6 shadow-subtle">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.22),_transparent_60%)] opacity-90" />
            <div className="relative space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                What’s inside
              </h3>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Compass className="mt-1 h-4 w-4 text-brand" />
                  <div>
                    <p className="font-semibold text-foreground">Curated learning path</p>
                    <p>Move from fundamentals to advanced topics with guided checkpoints.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <LayoutTemplate className="mt-1 h-4 w-4 text-fuchsia-500" />
                  <div>
                    <p className="font-semibold text-foreground">Interactive demos</p>
                    <p>Every chapter pairs written guidance with runnable, editable examples.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  24+ demos · 5 sections · Weekly updates
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Quick Stats */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard label="Sections" value={guideStructure.sections.length} icon="📚" />
        <StatCard label="Interactive demos" value={DemoRegistry.getAllDemos().length} icon="🎮" />
        <StatCard label="Difficulty levels" value="Beginner → Advanced" icon="🪜" />
        <StatCard label="Learning mode" value="Self-paced & guided" icon="🗺️" />
      </motion.section>

      {/* Learning Path Sections */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Explore the learning path
          </h2>
          <Link
            to="/guide"
            className="hidden items-center gap-2 text-sm font-semibold text-brand sm:inline-flex"
          >
            View curriculum map
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {guideStructure.sections.map((section, index) => {
            const Icon = section.icon;
            const demos = section.demos
              .map(id => DemoRegistry.get(id))
              .filter(Boolean);

            const beginnerCount = demos.filter(d => d?.difficulty === 'beginner').length;
            const intermediateCount = demos.filter(d => d?.difficulty === 'intermediate').length;
            const advancedCount = demos.filter(d => d?.difficulty === 'advanced').length;

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index, duration: 0.3 }}
              >
                <Link
                  to={`/guide/${section.id}/${section.demos[0]}`}
                  className="group relative block h-full overflow-hidden rounded-3xl border border-border/70 bg-surface p-6 shadow-subtle transition-transform hover:-translate-y-1 hover:shadow-elevated"
                >
                  <div className={cn('pointer-events-none absolute inset-0 opacity-90', highlightPalette[section.id as keyof typeof highlightPalette] ?? 'from-slate-400/20 via-transparent to-transparent', 'bg-gradient-to-br')} />
                  <div className="relative flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-brand shadow-subtle">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {section.title}
                          </h3>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {section.demos.length} demos
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {beginnerCount > 0 && (
                        <span className="rounded-full border border-emerald-200/70 bg-emerald-100 px-2 py-1 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {beginnerCount} Beginner
                        </span>
                      )}
                      {intermediateCount > 0 && (
                        <span className="rounded-full border border-amber-200/70 bg-amber-100 px-2 py-1 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/40 dark:text-amber-300">
                          {intermediateCount} Intermediate
                        </span>
                      )}
                      {advancedCount > 0 && (
                        <span className="rounded-full border border-rose-200/70 bg-rose-100 px-2 py-1 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/40 dark:text-rose-300">
                          {advancedCount} Advanced
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Featured Demos */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Featured demos to try next
          </h2>
          <Sparkles className="h-5 w-5 text-brand" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FeaturedDemoCard
            sectionId="getting-started"
            demoId="hello-world"
            badge="Start Here"
            badgeColor="bg-emerald-500"
          />
          <FeaturedDemoCard
            sectionId="core-concepts"
            demoId="bloc-vs-cubit"
            badge="Popular"
            badgeColor="bg-fuchsia-500"
          />
          <FeaturedDemoCard
            sectionId="patterns"
            demoId="todo"
            badge="Practical"
            badgeColor="bg-sky-500"
          />
          <FeaturedDemoCard
            sectionId="advanced"
            demoId="async"
            badge="Advanced"
            badgeColor="bg-orange-500"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-surface p-5 text-center shadow-subtle">
      <div className="text-2xl">{icon}</div>
      <div className="mt-3 text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function FeaturedDemoCard({
  sectionId,
  demoId,
  badge,
  badgeColor
}: {
  sectionId: string;
  demoId: string;
  badge: string;
  badgeColor: string;
}) {
  const demo = DemoRegistry.get(demoId);
  if (!demo) return null;

  return (
    <Link
      to={`/guide/${sectionId}/${demoId}`}
      className="relative block overflow-hidden rounded-3xl border border-border/70 bg-surface p-6 shadow-subtle transition-transform hover:-translate-y-1 hover:shadow-elevated"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.24),_transparent_60%)] opacity-80" />
      <div className="relative flex h-full flex-col gap-3">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold text-foreground">{demo.title}</h3>
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white', badgeColor)}>
            {badge}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{demo.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {demo.concepts.slice(0, 2).map((concept) => (
            <span
              key={concept}
              className="rounded-full border border-border bg-surface px-2 py-1"
            >
              {concept}
            </span>
          ))}
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
