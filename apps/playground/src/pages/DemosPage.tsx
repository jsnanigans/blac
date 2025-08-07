import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DemoRegistry, type DemoCategory } from '@/core/utils/demoRegistry';
import { ChevronRight, Search, Filter } from 'lucide-react';

export function DemosPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<
    DemoCategory | 'all'
  >('all');
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<
    'all' | 'beginner' | 'intermediate' | 'advanced'
  >('all');

  const categories: { id: DemoCategory; label: string; description: string }[] =
    [
      {
        id: '01-basics',
        label: 'Basics',
        description: 'Getting started with BlaC',
      },
      {
        id: '02-patterns',
        label: 'Patterns',
        description: 'Common state management patterns',
      },
      {
        id: '03-advanced',
        label: 'Advanced',
        description: 'Advanced features and optimizations',
      },
      {
        id: '04-plugins',
        label: 'Plugins',
        description: 'Plugin ecosystem and extensions',
      },
      {
        id: '05-testing',
        label: 'Testing',
        description: 'Testing patterns and utilities',
      },
      {
        id: '06-real-world',
        label: 'Real World',
        description: 'Complete application examples',
      },
    ];

  // Filter demos based on search and filters
  const filteredDemos = React.useMemo(() => {
    let demos = DemoRegistry.getAllDemos();

    if (searchQuery) {
      demos = DemoRegistry.search(searchQuery);
    }

    if (selectedCategory !== 'all') {
      demos = demos.filter((d) => d.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      demos = demos.filter((d) => d.difficulty === selectedDifficulty);
    }

    return demos;
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  return (
    <div className="container py-6">
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <div className="sticky top-20">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search demos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-1">
                <Filter className="h-4 w-4" />
                Filters
              </h3>

              {/* Difficulty Filter */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  Difficulty
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-semibold mb-3">Categories</h3>
              <nav className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                    selectedCategory === 'all'
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50',
                  )}
                >
                  All Demos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                      selectedCategory === cat.id
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50',
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <Routes>
            <Route index element={<DemoList demos={filteredDemos} />} />
            <Route path=":category/:demoId" element={<DemoViewer />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function DemoList({ demos }: { demos: any[] }) {
  const difficultyColors = {
    beginner:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    intermediate:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  if (demos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No demos found matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Interactive Demos</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {demos.map((demo) => (
          <Link
            key={demo.id}
            to={`/demos/${demo.category}/${demo.id}`}
            className="group relative overflow-hidden rounded-lg border p-6 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold group-hover:text-accent-foreground">
                {demo.title}
              </h3>
              <span
                className={cn(
                  'px-2 py-1 text-xs rounded-full',
                  difficultyColors[
                    demo.difficulty as keyof typeof difficultyColors
                  ],
                )}
              >
                {demo.difficulty}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {demo.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {demo.tags.slice(0, 3).map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded"
                >
                  {tag}
                </span>
              ))}
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-accent-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DemoViewer() {
  const DemoRunner = React.lazy(() =>
    import('@/core/components/DemoRunner').then((m) => ({
      default: m.DemoRunner,
    })),
  );

  return (
    <React.Suspense
      fallback={<div className="p-6 text-center">Loading demo...</div>}
    >
      <DemoRunner />
    </React.Suspense>
  );
}
