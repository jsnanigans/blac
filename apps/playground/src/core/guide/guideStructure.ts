import { Rocket, Target, Layers, Zap, TestTube, Building2 } from 'lucide-react';
import type {
  GuideStructure,
  GuideSection,
  NavigationItem,
  GuideNavigation,
} from '@/components/guide/types';
import { DemoRegistry } from '@/core/utils/demoRegistry';

export const guideStructure: GuideStructure = {
  sections: [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the fundamentals of BlaC state management',
      icon: Rocket,
      category: '01-basics',
      color: 'text-blue-600 dark:text-blue-400',
      demos: [
        'hello-world',
        'counter',
        'reading-state',
        'updating-state',
        'multiple-components',
        'instance-management',
      ],
    },
    {
      id: 'core-concepts',
      title: 'Core Concepts',
      description: 'Deep dive into Cubits, Blocs, and the event system',
      icon: Target,
      category: '02-core-concepts',
      color: 'text-purple-600 dark:text-purple-400',
      demos: [
        'cubit-deep-dive',
        'bloc-deep-dive',
        'bloc-vs-cubit',
        'computed-properties',
        'lifecycle',
      ],
    },
    {
      id: 'patterns',
      title: 'Patterns',
      description: 'Common patterns and best practices',
      icon: Layers,
      category: '02-patterns',
      color: 'text-green-600 dark:text-green-400',
      demos: [
        'simple-form',
        'form-validation',
        'async-loading',
        'data-fetching',
        'list-management',
        'filtering-sorting',
        'event-design',
        'todo-bloc',
        'keep-alive',
        'props',
        'persistence',
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Advanced features and optimizations',
      icon: Zap,
      category: '03-advanced',
      color: 'text-orange-600 dark:text-orange-400',
      demos: [
        'schema-validation',
        'async-operations',
        'custom-selectors',
        'stream',
        'bloc-composition',
        'dependencies',
      ],
    },
    {
      id: 'plugins',
      title: 'Plugins',
      description: 'Extend BlaC with plugins',
      icon: TestTube,
      category: '04-plugins',
      color: 'text-cyan-600 dark:text-cyan-400',
      demos: ['custom-plugins'],
    },
  ],
};

// Helper function to get all demos in order
export function getAllDemosInOrder(): Array<{
  sectionId: string;
  demoId: string;
}> {
  const allDemos: Array<{ sectionId: string; demoId: string }> = [];

  guideStructure.sections.forEach((section) => {
    section.demos.forEach((demoId) => {
      allDemos.push({ sectionId: section.id, demoId });
    });
  });

  return allDemos;
}

// Helper function to get section by ID
export function getSection(sectionId: string): GuideSection | undefined {
  return guideStructure.sections.find((s) => s.id === sectionId);
}

// Helper function to get navigation info for a demo
export function getNavigationForDemo(
  sectionId: string,
  demoId: string,
): GuideNavigation | null {
  const allDemos = getAllDemosInOrder();
  const currentIndex = allDemos.findIndex(
    (d) => d.sectionId === sectionId && d.demoId === demoId,
  );

  if (currentIndex === -1) return null;

  const current = allDemos[currentIndex];
  const previous = currentIndex > 0 ? allDemos[currentIndex - 1] : undefined;
  const next =
    currentIndex < allDemos.length - 1 ? allDemos[currentIndex + 1] : undefined;

  const currentSection = getSection(current.sectionId);
  const currentDemo = DemoRegistry.get(current.demoId);

  if (!currentSection || !currentDemo) return null;

  const navigation: GuideNavigation = {
    current: {
      sectionId: current.sectionId,
      demoId: current.demoId,
      title: currentDemo.title,
      path: `/guide/${current.sectionId}/${current.demoId}`,
    },
  };

  if (previous) {
    const prevSection = getSection(previous.sectionId);
    const prevDemo = DemoRegistry.get(previous.demoId);
    if (prevSection && prevDemo) {
      navigation.previous = {
        sectionId: previous.sectionId,
        demoId: previous.demoId,
        title: prevDemo.title,
        path: `/guide/${previous.sectionId}/${previous.demoId}`,
      };
    }
  }

  if (next) {
    const nextSection = getSection(next.sectionId);
    const nextDemo = DemoRegistry.get(next.demoId);
    if (nextSection && nextDemo) {
      navigation.next = {
        sectionId: next.sectionId,
        demoId: next.demoId,
        title: nextDemo.title,
        path: `/guide/${next.sectionId}/${next.demoId}`,
      };
    }
  }

  return navigation;
}

// Helper function to get breadcrumb items for a demo
export function getBreadcrumbs(sectionId?: string, demoId?: string) {
  const breadcrumbs: Array<{ label: string; path?: string }> = [
    { label: 'Guide', path: '/guide' },
  ];

  if (sectionId) {
    const section = getSection(sectionId);
    if (section) {
      breadcrumbs.push({
        label: section.title,
        path: `/guide/${sectionId}`,
      });

      if (demoId) {
        const demo = DemoRegistry.get(demoId);
        if (demo) {
          breadcrumbs.push({
            label: demo.title,
            // No path for current page
          });
        }
      }
    }
  }

  return breadcrumbs;
}

// Helper to check if a demo is the first in its section
export function isFirstInSection(sectionId: string, demoId: string): boolean {
  const section = getSection(sectionId);
  return section?.demos[0] === demoId;
}

// Helper to check if a demo is the last in its section
export function isLastInSection(sectionId: string, demoId: string): boolean {
  const section = getSection(sectionId);
  if (!section) return false;
  return section.demos[section.demos.length - 1] === demoId;
}
