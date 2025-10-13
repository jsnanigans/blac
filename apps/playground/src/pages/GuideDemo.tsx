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
        {/* Demo Component */}
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
      </motion.div>
    </GuideLayout>
  );
}