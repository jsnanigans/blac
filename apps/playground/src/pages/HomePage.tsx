import { ArrowRight, Code2, TestTube, Zap, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="w-full px-4 py-10">
      {/* Hero Section */}
      <section className="relative mx-auto flex w-full flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b from-background to-muted/40 px-6 py-12 md:py-16 lg:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Now with Command Palette and Resizable Playground
        </div>
        <h1 className="text-center text-4xl font-extrabold leading-tight tracking-tight md:text-6xl lg:leading-[1.1]">
          Build stateful apps with BlaC
        </h1>
        <p className="max-w-[800px] text-center text-lg text-muted-foreground sm:text-xl">
          Explore demos, tweak code live, and understand performance
          implications with first-class developer tooling.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link
            to="/demos"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 shadow-sm"
          >
            Explore Demos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            to="/playground"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-11 px-8"
          >
            Open Playground
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto grid w-full grid-cols-1 gap-6 py-10 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-lg border bg-background p-6">
          <Zap className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-bold mb-2">Live Demos</h3>
          <p className="text-sm text-muted-foreground">
            Interactive examples with real-time state visualization and
            performance metrics.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-lg border bg-background p-6">
          <Code2 className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-bold mb-2">Code Playground</h3>
          <p className="text-sm text-muted-foreground">
            Write and test BlaC code with instant feedback and Monaco editor
            support.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-lg border bg-background p-6">
          <TestTube className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-bold mb-2">Testing Suite</h3>
          <p className="text-sm text-muted-foreground">
            Built-in testing utilities with visual test runners and benchmarking
            tools.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-lg border bg-background p-6">
          <Sparkles className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-bold mb-2">Real-time Updates</h3>
          <p className="text-sm text-muted-foreground">
            See state changes instantly with hot module replacement and live
            preview.
          </p>
        </div>
      </section>

      {/* Quick Start */}
      <section className="mx-auto w-full py-8">
        <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            to="/demos/01-basics/counter"
            className="group relative overflow-hidden rounded-lg border p-6 hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-2 group-hover:text-accent-foreground">
              1. Basic Counter
            </h3>
            <p className="text-sm text-muted-foreground">
              Start with the fundamentals - a simple counter using Cubit.
            </p>
          </Link>

          <Link
            to="/demos/02-patterns/shared-state"
            className="group relative overflow-hidden rounded-lg border p-6 hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-2 group-hover:text-accent-foreground">
              2. State Patterns
            </h3>
            <p className="text-sm text-muted-foreground">
              Learn about shared vs isolated state and when to use each.
            </p>
          </Link>

          <Link
            to="/demos/03-advanced/selectors"
            className="group relative overflow-hidden rounded-lg border p-6 hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-2 group-hover:text-accent-foreground">
              3. Advanced Features
            </h3>
            <p className="text-sm text-muted-foreground">
              Explore selectors, performance optimization, and plugins.
            </p>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto w-full py-8 border-t">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold">24+</div>
            <div className="text-sm text-muted-foreground">
              Interactive Demos
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">15+</div>
            <div className="text-sm text-muted-foreground">Code Examples</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">100%</div>
            <div className="text-sm text-muted-foreground">TypeScript</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">∞</div>
            <div className="text-sm text-muted-foreground">Possibilities</div>
          </div>
        </div>
      </section>
    </div>
  );
}
