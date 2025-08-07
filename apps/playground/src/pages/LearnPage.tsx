import { Link } from 'react-router-dom';
import {
  BookOpen,
  Video,
  FileText,
  Code2,
  Users,
  ExternalLink,
} from 'lucide-react';

export function LearnPage() {
  const learningPaths = [
    {
      title: 'Getting Started',
      description: 'New to BlaC? Start here with the fundamentals.',
      icon: BookOpen,
      lessons: [
        { title: 'Introduction to BlaC', duration: '5 min', completed: false },
        { title: 'Your First Cubit', duration: '10 min', completed: false },
        { title: 'Understanding State', duration: '8 min', completed: false },
        { title: 'React Integration', duration: '12 min', completed: false },
      ],
    },
    {
      title: 'Advanced Patterns',
      description: 'Master advanced state management patterns.',
      icon: Code2,
      lessons: [
        {
          title: 'Selectors & Performance',
          duration: '15 min',
          completed: false,
        },
        { title: 'Async Operations', duration: '20 min', completed: false },
        { title: 'Plugin Development', duration: '25 min', completed: false },
        { title: 'Testing Strategies', duration: '18 min', completed: false },
      ],
    },
  ];

  const resources = [
    {
      title: 'Video Tutorials',
      description: 'Watch step-by-step video guides',
      icon: Video,
      link: '#',
    },
    {
      title: 'Documentation',
      description: 'Read the comprehensive docs',
      icon: FileText,
      link: '/api',
    },
    {
      title: 'Community',
      description: 'Join our Discord community',
      icon: Users,
      link: '#',
    },
  ];

  return (
    <div className="container py-10">
      {/* Hero */}
      <div className="mx-auto max-w-[980px] text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">Learn BlaC</h1>
        <p className="text-lg text-muted-foreground">
          Master state management with our structured learning paths and
          comprehensive resources.
        </p>
      </div>

      {/* Learning Paths */}
      <section className="mx-auto max-w-[980px] mb-12">
        <h2 className="text-2xl font-bold mb-6">Learning Paths</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {learningPaths.map((path) => {
            const Icon = path.icon;
            return (
              <div key={path.title} className="border rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{path.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {path.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {path.lessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'h-5 w-5 rounded-full border-2',
                            lesson.completed
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground',
                          )}
                        />
                        <span className="text-sm">{lesson.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {lesson.duration}
                      </span>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-9">
                  Start Learning
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="mx-auto max-w-[980px] mb-12">
        <h2 className="text-2xl font-bold mb-6">Quick Start Guide</h2>
        <div className="border rounded-lg p-6 bg-card">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Install BlaC</h3>
              <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-sm">
                <code>npm install @blac/core @blac/react</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Create Your First Cubit</h3>
              <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-sm overflow-x-auto">
                <code>{`import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
  
  increment = () => this.emit(this.state + 1);
}`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Use in React</h3>
              <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-sm overflow-x-auto">
                <code>{`import { useBloc } from '@blac/react';

function Counter() {
  const [count, cubit] = useBloc(CounterCubit);
  
  return (
    <button onClick={cubit.increment}>
      Count: {count}
    </button>
  );
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="mx-auto max-w-[980px]">
        <h2 className="text-2xl font-bold mb-6">Resources</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <Link
                key={resource.title}
                to={resource.link}
                className="group border rounded-lg p-6 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className="h-8 w-8 text-primary" />
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                <h3 className="font-semibold mb-1">{resource.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {resource.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
