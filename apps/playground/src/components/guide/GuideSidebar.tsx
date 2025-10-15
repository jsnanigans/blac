import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { guideStructure } from '@/core/guide/guideStructure';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import type { GuideSection } from './types';
import { useHeaderVisibility } from '@/hooks/useHeaderVisibility';

interface GuideSidebarProps {
  currentSection?: string;
  currentDemo?: string;
  className?: string;
}

export function GuideSidebar({ currentSection, currentDemo, className }: GuideSidebarProps) {
  const { isHeaderVisible } = useHeaderVisibility();
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(guideStructure.sections.map(s => s.id))
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Calculate top position based on header visibility
  const sidebarTop = isHeaderVisible ? 'top-16' : 'top-1';

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

  const renderSidebarNav = (id?: string) => (
    <nav id={id} className="space-y-3">
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
        id="guide-sidebar-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed left-4 top-24 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground shadow-subtle"
        aria-label="Toggle navigation menu"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Desktop Sidebar */}
      <aside
        id="guide-sidebar-desktop"
        className={cn(
          'hidden lg:flex w-72 shrink-0 border-r border-border/80 bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80 sticky flex-col overflow-hidden transition-[top,height] duration-300',
          sidebarTop,
          isHeaderVisible ? 'h-[calc(100vh-4rem)]' : 'h-[calc(100vh-0.25rem)]',
          className,
        )}
      >
        <div className="border-b border-border/80 bg-surface-muted/80 px-5 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Guide map
              </h2>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Follow the curated BlaC learning path.
              </p>
            </div>
            <Sparkles className="h-4 w-4 text-brand" />
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 pb-8">
          {renderSidebarNav('guide-sidebar-nav-desktop')}
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
              id="guide-sidebar-mobile"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-72 border-r border-border bg-surface shadow-elevated z-50 overflow-y-auto"
            >
              <div className="p-4 pt-16 space-y-4">
                <div className="rounded-2xl border border-border bg-surface-muted/70 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Guide map
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    Follow the curated BlaC learning path.
                  </p>
                </div>
                {renderSidebarNav('guide-sidebar-nav-mobile')}
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
          'w-full rounded-2xl border border-border bg-surface px-4 py-3 text-left hover:shadow-subtle',
          isCurrentSection && 'border-brand/60 bg-brand/10 shadow-subtle text-brand',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand shadow-subtle',
                section.color,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                {section.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {section.description}
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-3 space-y-1">
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
                      'block rounded-xl border border-transparent px-3 py-2 text-sm hover:border-border hover:bg-surface',
                      isActive &&
                        'border-brand/60 bg-brand/15 text-brand shadow-subtle font-semibold',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate pr-2 text-sm text-foreground">
                        {demo.title}
                      </span>
                      {demo.difficulty && (
                        <span
                          className={cn(
                            'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border',
                            demo.difficulty === 'beginner' &&
                              'border-emerald-200/70 bg-emerald-100 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300',
                            demo.difficulty === 'intermediate' &&
                              'border-amber-200/70 bg-amber-100 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-300',
                            demo.difficulty === 'advanced' &&
                              'border-rose-200/70 bg-rose-100 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/30 dark:text-rose-300',
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
