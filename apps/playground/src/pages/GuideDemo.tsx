import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { GuideLayout } from '@/layouts/GuideLayout';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import { getSection } from '@/core/guide/guideStructure';
import { motion } from 'framer-motion';

export function GuideDemo() {
  const { sectionId, demoId } = useParams<{ sectionId: string; demoId: string }>();

  // Validate section and demo exist
  const section = sectionId ? getSection(sectionId) : null;
  const demo = demoId ? DemoRegistry.get(demoId) : null;

  // Check if demo belongs to section
  const isDemoInSection = section && section.demos.includes(demoId || '');

  if (!section || !demo || !isDemoInSection) {
    // Redirect to guide landing if invalid
    return <Navigate to="/guide" replace />;
  }

  // Lazy load the demo component
  const DemoComponent = demo.component;

  return (
    <GuideLayout
      currentSection={sectionId}
      currentDemo={demoId}
      showNavigation={true}
    >
      <motion.div
        key={`${sectionId}-${demoId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Demo Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{demo.title}</h1>
              <p className="text-muted-foreground">{demo.description}</p>
            </div>
            {demo.difficulty && (
              <span
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-full
                  ${demo.difficulty === 'beginner'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : demo.difficulty === 'intermediate'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
                `}
              >
                {demo.difficulty.charAt(0).toUpperCase() + demo.difficulty.slice(1)}
              </span>
            )}
          </div>

          {/* Tags and Concepts */}
          <div className="flex flex-wrap gap-2">
            {demo.concepts.map((concept) => (
              <span
                key={concept}
                className="px-3 py-1 text-sm bg-accent/10 text-accent-foreground rounded-full"
              >
                {concept}
              </span>
            ))}
            {demo.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </header>

        {/* Demo Component */}
        <div className="rounded-lg border bg-card">
          <React.Suspense
            fallback={
              <div className="p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-secondary rounded w-1/3 mx-auto mb-4" />
                  <div className="h-4 bg-secondary rounded w-1/2 mx-auto" />
                </div>
              </div>
            }
          >
            <DemoComponent />
          </React.Suspense>
        </div>

        {/* Related Demos (Optional) */}
        {demo.relatedDemos && demo.relatedDemos.length > 0 && (
          <section className="mt-12 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">Related Demos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {demo.relatedDemos.slice(0, 4).map((relatedId) => {
                const relatedDemo = DemoRegistry.get(relatedId);
                if (!relatedDemo) return null;

                // Find which section this demo belongs to
                let relatedSection = '';
                for (const sec of section ? [section] : []) {
                  if (sec.demos.includes(relatedId)) {
                    relatedSection = sec.id;
                    break;
                  }
                }

                return (
                  <a
                    key={relatedId}
                    href={`/guide/${relatedSection}/${relatedId}`}
                    className="block p-4 rounded-lg border hover:bg-accent/5 transition-colors"
                  >
                    <h3 className="font-medium mb-1">{relatedDemo.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {relatedDemo.description}
                    </p>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </motion.div>
    </GuideLayout>
  );
}