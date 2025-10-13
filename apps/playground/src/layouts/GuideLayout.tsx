import React from 'react';
import { cn } from '@/lib/utils';
import { GuideSidebar } from '@/components/guide/GuideSidebar';
import { GuideBreadcrumb, CompactBreadcrumb } from '@/components/guide/GuideBreadcrumb';
import { GuideNavigation } from '@/components/guide/GuideNavigation';
import { getBreadcrumbs, getNavigationForDemo } from '@/core/guide/guideStructure';
import { motion } from 'framer-motion';

interface GuideLayoutProps {
  children: React.ReactNode;
  currentSection?: string;
  currentDemo?: string;
  showNavigation?: boolean;
  className?: string;
}

export function GuideLayout({
  children,
  currentSection,
  currentDemo,
  showNavigation = true,
  className
}: GuideLayoutProps) {
  const breadcrumbs = getBreadcrumbs(currentSection, currentDemo);
  const navigation = currentSection && currentDemo
    ? getNavigationForDemo(currentSection, currentDemo)
    : null;

  return (
    <div className={cn('flex min-h-screen', className)}>
      {/* Sidebar */}
      <GuideSidebar
        currentSection={currentSection}
        currentDemo={currentDemo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Breadcrumb Navigation */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            {/* Desktop breadcrumb */}
            <div className="hidden sm:block">
              <GuideBreadcrumb items={breadcrumbs} />
            </div>
            {/* Mobile compact breadcrumb */}
            <div className="sm:hidden">
              <CompactBreadcrumb items={breadcrumbs} />
            </div>
          </div>
        </div>

        {/* Content Container */}
        <main className="flex-1">
          <motion.div
            key={`${currentSection}-${currentDemo}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            {children}

            {/* Previous/Next Navigation */}
            {showNavigation && navigation && (
              <GuideNavigation navigation={navigation} />
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// Simplified layout for landing page
export function GuideSimpleLayout({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const breadcrumbs = getBreadcrumbs();

  return (
    <div className={cn('min-h-screen', className)}>
      {/* Header with breadcrumb */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <GuideBreadcrumb items={breadcrumbs} />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}