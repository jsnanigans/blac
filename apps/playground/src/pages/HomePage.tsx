import {
  ArrowRight,
  Code,
  Code2,
  Command,
  GaugeCircle,
  Monitor,
  Puzzle,
  Sparkles,
  TestTube2,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, PageHeaderStat } from '@/layouts/PageHeader';
import { DemoRegistry } from '@/core/utils/demoRegistry';

const featurePillars = [
  {
    title: 'Learn by doing',
    description:
      'Follow a guided curriculum that pairs conceptual explanations with interactive demos you can edit and run in place.',
    icon: Sparkles,
  },
  {
    title: 'Build confidently',
    description:
      'Prototype features in a Monaco workspace with TypeScript tooling, multi-file support, and quick reset actions.',
    icon: Monitor,
  },
  {
    title: 'Optimize with clarity',
    description:
      'Track render frequency with the performance panel and inspect Bloc relationships in the graph explorer.',
    icon: GaugeCircle,
  },
];

const quickStartSteps = [
  {
    step: '01',
    title: 'Explore the guide',
    description:
      'Start with "Hello Bloc" to understand how Cubits and Blocs work together.',
    href: '/guide/getting-started/hello-world',
    estimate: '10 min',
    badge: 'Beginner',
  },
  {
    step: '02',
    title: 'Open the playground',
    description:
      'Experiment with live code, share links with teammates, and tweak performance knobs.',
    href: '/playground',
    estimate: '15 min',
    badge: 'Hands-on',
  },
  {
    step: '03',
    title: 'Dive into patterns',
    description:
      'Review advanced demos covering shared state, selectors, and plugin authoring.',
    href: '/guide/patterns/todo-bloc',
    estimate: '20 min',
    badge: 'Intermediate',
  },
];

const updates = [
  {
    title: 'Resizable SplitPane lands',
    description:
      'Rebuilt workspace layout with accessible split panes and contextual toolbars.',
    icon: Command,
    href: '/playground',
  },
  {
    title: 'New Bloc graph explorer',
    description:
      'Visualize transitions and dependencies with a refreshed graph experience.',
    icon: Puzzle,
    href: '/graph-test',
  },
  {
    title: 'Command palette everywhere',
    description:
      'Jump to guides, demos, or commands with ⌘K / Ctrl K across the Playground.',
    icon: Code,
    href: '/guide',
  },
];

function GradientCard({
  title,
  description,
  Icon,
}: {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-subtle">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-surface-muted text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function QuickStartCard({
  step,
  title,
  description,
  href,
  estimate,
  badge,
}: (typeof quickStartSteps)[number]) {
  return (
    <Link
      to={href}
      className="group flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-subtle transition-transform hover:-translate-y-1 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{step}</span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {badge}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between text-sm text-brand">
        <span className="inline-flex items-center gap-1">
          Start now
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </span>
        <span className="text-muted-foreground">{estimate}</span>
      </div>
    </Link>
  );
}

function UpdateCard({
  title,
  description,
  Icon,
  href,
}: {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-subtle transition-transform hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground group-hover:text-brand">
          {title}
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

export function HomePage() {
  const demoCount = DemoRegistry.getAllDemos().length;
  const workspaceActionCount = 5;

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Welcome"
        title="Build stateful apps with BlaC"
        description="Learn the core patterns, explore live demos, and iterate in a developer workspace designed for state management."
        actions={
          <>
            <Link
              to="/guide"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
            >
              <BookOpenIcon className="h-4 w-4" />
              View Guide
            </Link>
            <Link
              to="/playground"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-subtle transition-transform hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <Zap className="h-4 w-4" />
              Open Playground
            </Link>
          </>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-xs">
              <Users className="h-3.5 w-3.5 text-brand" />
              Community preview
            </span>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <PageHeaderStat value={`${demoCount}`} label="Interactive demos" />
          <PageHeaderStat
            value={`${workspaceActionCount}`}
            label="Workspace actions"
          />
          <PageHeaderStat value="TS-first" label="Typed APIs" />
        </div>
      </PageHeader>

      {/* Hero content */}
      <section className="relative mx-auto mt-10 flex w-full max-w-6xl flex-col gap-10 px-4 lg:flex-row lg:items-stretch">
        <div className="flex flex-1 flex-col justify-between gap-6 rounded-3xl border border-border bg-surface p-8 shadow-subtle">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
              New in the playground
            </span>
            <h2 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              A workbench built for iteration
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg leading-relaxed">
              Configure files, preview UI, and review performance metrics from
              one screen. The workspace stays lightweight while giving you the
              essentials for quick experiments.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Monaco editor
              </div>
              <p className="mt-1 text-sm text-foreground">
                TypeScript-aware Monaco with multi-file editing and synced file
                models.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Diagnostics
              </div>
              <p className="mt-1 text-sm text-foreground">
                Console output and performance metrics are captured alongside
                each run.
              </p>
            </div>
          </div>
        </div>
        <div className="relative flex flex-1 items-stretch">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-elevated">
            <div className="relative border-b border-border bg-gradient-to-r from-brand/20 via-transparent to-surface-muted px-6 py-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                  <TestTube2 className="h-4 w-4 text-brand" />
                  Live preview
                </span>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium">
                  Ready
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-0 bg-surface px-6 py-5">
              <div className="rounded-2xl border border-border bg-surface-muted p-4 font-mono text-xs leading-relaxed text-foreground shadow-subtle">
                <pre className="whitespace-pre-wrap">
                  {`import { bloc } from '@blac/core';

const counter = bloc({
  state: { count: 0 },
  on: {
    increment: ({ state }) => ({ count: state.count + 1 }),
  },
});

export function Counter() {
  const { state, send } = counter.use();

  return (
    <div className="surface">
      <span className="metric">{state.count}</span>
      <button onClick={() => send('increment')}>
        Add
      </button>
    </div>
  );
}`}{' '}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="mx-auto mt-16 w-full max-w-6xl px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
              Why developers choose BlaC Playground
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Purpose-built for teams adopting Bloc patterns. Move from guided
              learning to real problem solving without switching tools.
            </p>
          </div>
          <Link
            to="/guide"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            Browse curriculum
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featurePillars.map((pillar) => (
            <GradientCard
              key={pillar.title}
              title={pillar.title}
              description={pillar.description}
              Icon={pillar.icon}
            />
          ))}
        </div>
      </section>

      {/* Workspace capabilities */}
      <section className="mx-auto mt-16 w-full max-w-6xl px-4">
        <div className="rounded-3xl border border-border bg-surface p-8 shadow-subtle">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Everything you need to iterate quickly
              </h3>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Toggle between preview and performance views, keep an eye on
                console output, and store your current files locally or in
                shareable links.
              </p>
            </div>
            <Link
              to="/playground"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-subtle transition-transform hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <Monitor className="h-4 w-4" />
              Launch workspace
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CapabilityCard
              icon={Code2}
              title="Multi-file Monaco"
              description="Switch between source files, rename, reorganize, and transpile with in-browser TypeScript."
            />
            <CapabilityCard
              icon={TestTube2}
              title="Performance monitor"
              description="Track render counts, timings, and selector efficiency alongside each run."
            />
            <CapabilityCard
              icon={Zap}
              title="One-click reset"
              description="Restore the starter files or jump into a guide demo with a single click."
            />
            <CapabilityCard
              icon={Users}
              title="Shareable sessions"
              description="Copy URLs with embedded code so teammates can reopen your exact workspace."
            />
          </div>
        </div>
      </section>

      {/* Quick Start Timeline */}
      <section className="mx-auto mt-16 w-full max-w-6xl px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold text-foreground">
              Choose your starting point
            </h3>
            <p className="text-sm text-muted-foreground sm:text-base">
              Jump into the workflow that matches your goals—learning, building,
              or debugging.
            </p>
          </div>
          <Link
            to="/guide"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
          >
            View all sections
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {quickStartSteps.map((step) => (
            <QuickStartCard key={step.title} {...step} />
          ))}
        </div>
      </section>

      {/* Updates */}
      <section className="mx-auto mt-16 w-full max-w-6xl px-4">
        <div className="rounded-3xl border border-border bg-surface-muted/60 p-6 shadow-subtle">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold text-foreground">
                What’s new
              </h3>
              <p className="text-sm text-muted-foreground">
                Fresh improvements shipping to the Playground experience.
              </p>
            </div>
            <span className="hidden rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand sm:inline-flex">
              Release cadence · Weekly
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {updates.map((item) => (
              <UpdateCard
                key={item.title}
                title={item.title}
                description={item.description}
                Icon={item.icon}
                href={item.href}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CapabilityCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-subtle">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-foreground">{title}</h4>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function BookOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 7H20" />
      <path d="M20 22V2" />
      <path d="M4 22V2" />
    </svg>
  );
}
