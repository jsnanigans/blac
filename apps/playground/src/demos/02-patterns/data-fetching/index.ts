import { DemoRegistry } from '@/core/utils/demoRegistry';
import { DataFetchingDemo } from './DataFetchingDemo';

DemoRegistry.register({
  id: 'data-fetching',
  category: '02-patterns',
  title: 'Data Fetching & Caching',
  description:
    'Learn professional data fetching patterns including time-based caching, stale-while-revalidate (SWR), and pagination strategies for scalable applications.',
  difficulty: 'intermediate',
  tags: [
    'cubit',
    'async',
    'caching',
    'api',
    'pagination',
    'swr',
    'performance',
  ],
  concepts: [
    'time-based caching',
    'cache invalidation',
    'stale-while-revalidate',
    'background revalidation',
    'pagination',
    'data fetching',
  ],
  component: DataFetchingDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Simple cache prevents redundant requests',
      run: () => true,
      description: 'Verifies time-based cache reuses fresh data',
    },
    {
      name: 'SWR shows stale data while revalidating',
      run: () => true,
      description: 'Verifies instant display with background refresh',
    },
    {
      name: 'Pagination loads correct page',
      run: () => true,
      description: 'Verifies pagination navigation and data loading',
    },
  ],
  relatedDemos: ['async-loading', 'list-management', 'async-operations'],
  prerequisites: ['async-loading', 'updating-state'],
});
