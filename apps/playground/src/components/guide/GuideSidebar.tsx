import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { guideStructure } from '@/core/guide/guideStructure';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import type { GuideSection } from './types';
import { motion, AnimatePresence } from 'framer-motion';

interface GuideSidebarProps {
  currentSection?: string;
  currentDemo?: string;
  className?: string;
}

export function GuideSidebar({ currentSection, currentDemo, className }: GuideSidebarProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(guideStructure.sections.map(s => s.id))
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Auto-expand current section on mount
  React.useEffect(() => {
    if (currentSection) {
      setExpandedSections(prev => new Set([...prev, currentSection]));
    }
  }, [currentSection]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const sidebarContent = (
    <nav className="space-y-2">
      {guideStructure.sections.map((section) => (
        <SidebarSection
          key={section.id}
          section={section}
          isExpanded={expandedSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          currentSection={currentSection}
          currentDemo={currentDemo}
          onDemoClick={() => setIsMobileMenuOpen(false)}
        />
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border shadow-sm"
        aria-label="Toggle navigation menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block w-64 shrink-0 border-r bg-card/50',
          className
        )}
      >
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4">
          <h2 className="font-semibold text-lg mb-4">Learning Guide</h2>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />

            {/* Sidebar */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-background border-r z-50 overflow-y-auto"
            >
              <div className="p-4 pt-16">
                <h2 className="font-semibold text-lg mb-4">Learning Guide</h2>
                {sidebarContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

interface SidebarSectionProps {
  section: GuideSection;
  isExpanded: boolean;
  onToggle: () => void;
  currentSection?: string;
  currentDemo?: string;
  onDemoClick?: () => void;
}

function SidebarSection({
  section,
  isExpanded,
  onToggle,
  currentSection,
  currentDemo,
  onDemoClick
}: SidebarSectionProps) {
  const Icon = section.icon;
  const isCurrentSection = section.id === currentSection;

  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          'hover:bg-accent/50',
          isCurrentSection && 'bg-accent/50'
        )}
      >
        <Icon className={cn('h-4 w-4', section.color)} />
        <span className="flex-1 text-left">{section.title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-6 space-y-0.5">
              {section.demos.map((demoId) => {
                const demo = DemoRegistry.get(demoId);
                if (!demo) return null;

                const isActive =
                  section.id === currentSection &&
                  demoId === currentDemo;

                return (
                  <Link
                    key={demoId}
                    to={`/guide/${section.id}/${demoId}`}
                    onClick={onDemoClick}
                    className={cn(
                      'block px-3 py-1.5 rounded-md text-sm transition-colors',
                      'hover:bg-accent/50',
                      isActive && 'bg-accent text-accent-foreground font-medium'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{demo.title}</span>
                      {demo.difficulty && (
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full',
                            demo.difficulty === 'beginner' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
                            demo.difficulty === 'intermediate' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
                            demo.difficulty === 'advanced' && 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                          )}
                        >
                          {demo.difficulty[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}