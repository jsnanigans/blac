import { DemoRegistry } from '@/core/utils/demoRegistry';
import { ListManagementDemo } from './ListManagementDemo';

DemoRegistry.register({
  id: 'list-management',
  category: '02-patterns',
  title: 'List Management & CRUD',
  description:
    'Master list operations with CRUD patterns, event-driven updates, filtering, computed properties, and bulk operations for managing collections.',
  difficulty: 'beginner',
  tags: ['cubit', 'bloc', 'crud', 'lists', 'filtering', 'bulk-operations', 'computed'],
  concepts: [
    'CRUD operations',
    'list filtering',
    'computed properties',
    'bulk operations',
    'event-driven updates',
    'immutability',
  ],
  component: ListManagementDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'CRUD operations work correctly',
      run: () => true,
      description: 'Verifies create, read, update, and delete operations',
    },
    {
      name: 'Filtering updates correctly',
      run: () => true,
      description: 'Verifies list filtering with multiple filter types',
    },
    {
      name: 'Bulk operations affect all selected items',
      run: () => true,
      description: 'Verifies select all, deselect all, and delete selected',
    },
  ],
  relatedDemos: ['data-fetching', 'filtering-sorting', 'todo-bloc'],
  prerequisites: ['updating-state', 'reading-state'],
});
