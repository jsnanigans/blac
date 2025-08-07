import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Code2, TestTube, BookOpen } from 'lucide-react';

export function HomePage() {
  return (
    <div className="container py-10">
      {/* Hero Section */}
      <section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20">
        <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Interactive BlaC State Management
        </h1>
        <p className="max-w-[750px] text-center text-lg text-muted-foreground sm:text-xl">
          Learn, experiment, and master BlaC through interactive demos, live coding, and comprehensive examples.
        </p>
        <div className="flex gap-4 mt-8">
          <Link
            to="/demos"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
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
      <section className="mx-auto grid max-w-[980px] grid-cols-1 gap-8 py-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-lg border bg-background p-6">
          <Zap className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-bold mb-2">Live Demos</h3>
          <p className="text-sm text-muted-foreground">
            Interactive examples with real-time state visualization and performance metrics.
          </p>
        </div>
        
        <div className="relative overflow-hidden rounded-lg border bg-background p-6">
          <Code2 className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-bold mb-2">Code Playground</h3>
          <p className="text-sm text-muted-foreground">
            Write and test BlaC code with instant feedback and Monaco editor support.
          </p>
        </div>
        
        <div className="relative overflow-hidden rounded-lg border bg-background p-6">
          <TestTube className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-bold mb-2">Testing Suite</h3>
          <p className="text-sm text-muted-foreground">
            Built-in testing utilities with visual test runners and benchmarking tools.
          </p>
        </div>
        
        <div className="relative overflow-hidden rounded-lg border bg-background p-6">
          <BookOpen className="h-12 w-12 text-primary mb-4" />
          <h3 className="font-bold mb-2">Learning Paths</h3>
          <p className="text-sm text-muted-foreground">
            Structured tutorials from basics to advanced patterns and best practices.
          </p>
        </div>
      </section>

      {/* Quick Start */}
      <section className="mx-auto max-w-[980px] py-8">
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
      <section className="mx-auto max-w-[980px] py-8 border-t">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold">24+</div>
            <div className="text-sm text-muted-foreground">Interactive Demos</div>
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