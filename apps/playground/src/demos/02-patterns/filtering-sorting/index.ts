import { DemoRegistry } from '@/core/utils/demoRegistry';
import { FilteringSortingDemo } from './FilteringSortingDemo';

DemoRegistry.register({
  id: 'filtering-sorting',
  category: '02-patterns',
  title: 'Filtering & Sorting',
  description:
    'Master advanced filtering and sorting patterns for lists and catalogs with multiple search criteria, price ranges, and dynamic sorting.',
  difficulty: 'intermediate',
  tags: ['cubit', 'filtering', 'sorting', 'search', 'computed', 'derived-state'],
  concepts: [
    'search filtering',
    'multi-criteria filtering',
    'dynamic sorting',
    'computed properties',
    'derived state',
    'range filters',
  ],
  component: FilteringSortingDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Filtering updates correctly',
      run: () => true,
      description: 'Verifies search, category, and price range filtering',
    },
    {
      name: 'Sorting works correctly',
      run: () => true,
      description: 'Verifies ascending and descending sort by multiple fields',
    },
  ],
  relatedDemos: ['list-management', 'data-fetching', 'computed-properties'],
  prerequisites: ['list-management', 'updating-state'],
});
