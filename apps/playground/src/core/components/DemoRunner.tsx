import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import { CodeViewer } from './CodeViewer';
import { TestRunner } from './TestRunner';
import { ArrowLeft, Code2, Play, TestTube } from 'lucide-react';

export function DemoRunner() {
  const { demoId } = useParams<{ category: string; demoId: string }>();
  const [activeTab, setActiveTab] = React.useState<'demo' | 'code' | 'tests'>('demo');
  
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
        
        <h1 className="text-3xl font-bold mb-2">{demo.title}</h1>
        <p className="text-lg text-muted-foreground">{demo.description}</p>
        
        <div className="flex items-center gap-2 mt-4">
          <span className={`px-2 py-1 text-xs rounded-full ${
            demo.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
            demo.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {demo.difficulty}
          </span>
          {demo.tags.map(tag => (
            <span key={tag} className="px-2 py-1 text-xs bg-secondary rounded">
              {tag}
            </span>
          ))}
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
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'demo' && (
          <div className="border rounded-lg">
            <DemoComponent />
          </div>
        )}
        
        {activeTab === 'code' && (
          <CodeViewer code={demo.code} />
        )}
        
        {activeTab === 'tests' && demo.tests && (
          <TestRunner tests={demo.tests} />
        )}
      </div>

      {/* Related Demos */}
      {demo.relatedDemos && demo.relatedDemos.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-4">Related Demos</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {demo.relatedDemos.map(relatedId => {
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