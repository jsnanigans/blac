import { DemoRegistry } from '@/core/utils/demoRegistry';
import { Badge } from '@/ui/Badge';
import { Card, CardContent } from '@/ui/Card';
import {
  ArrowLeft,
  Code2,
  ExternalLink,
  Play,
  Tag,
  TestTube,
} from 'lucide-react';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CodeViewer } from './CodeViewer';
import { TestRunner } from './TestRunner';

export function DemoRunner() {
  const { demoId } = useParams<{ category: string; demoId: string }>();
  const [activeTab, setActiveTab] = React.useState<'demo' | 'code' | 'tests'>(
    'demo',
  );

  const demo = React.useMemo(() => {
    if (!demoId) return null;
    return DemoRegistry.get(demoId);
  }, [demoId]);

  if (!demo) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Demo Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The demo you're looking for doesn't exist.
          </p>
          <Link
            to="/demos"
            className="inline-flex items-center text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Demos
          </Link>
        </div>
      </div>
    );
  }

  const DemoComponent = demo.component;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/demos"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Demos
        </Link>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">{demo.title}</h1>
            <p className="text-lg text-muted-foreground">{demo.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                demo.difficulty === 'beginner'
                  ? 'success'
                  : demo.difficulty === 'intermediate'
                    ? 'warning'
                    : 'danger'
              }
            >
              {demo.difficulty}
            </Badge>
            {demo.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-muted-foreground"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('demo')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'demo'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Play className="h-4 w-4 inline mr-2" />
            Demo
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'code'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="h-4 w-4 inline mr-2" />
            Code
          </button>
          {demo.tests && (
            <button
              onClick={() => setActiveTab('tests')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'tests'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <TestTube className="h-4 w-4 inline mr-2" />
              Tests
            </button>
          )}

          {/* Open in Playground */}
          <a
            href={`/playground?demo=${demo.id}`}
            className="ml-auto inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-accent/60"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Playground
          </a>
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'demo' && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <DemoComponent />
            </CardContent>
          </Card>
        )}

        {activeTab === 'code' && <CodeViewer code={demo.code} />}

        {activeTab === 'tests' && demo.tests && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <TestRunner tests={demo.tests} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Related Demos */}
      {demo.relatedDemos && demo.relatedDemos.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-4">Related Demos</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {demo.relatedDemos.map((relatedId) => {
              const related = DemoRegistry.get(relatedId);
              if (!related) return null;

              return (
                <Link
                  key={relatedId}
                  to={`/demos/${related.category}/${related.id}`}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <h4 className="font-medium mb-1">{related.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {related.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
