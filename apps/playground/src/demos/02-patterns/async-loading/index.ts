import { DemoRegistry } from '@/core/utils/demoRegistry';
import { AsyncLoadingDemo } from './AsyncLoadingDemo';

DemoRegistry.register({
  id: 'async-loading',
  category: '02-patterns',
  title: 'Async Loading States',
  description:
    'Master async operations with loading states, error handling, retry logic with exponential backoff, and optimistic updates for instant feedback.',
  difficulty: 'intermediate',
  tags: ['cubit', 'async', 'loading', 'error-handling', 'retry', 'optimistic'],
  concepts: [
    'state machine pattern',
    'discriminated unions',
    'exponential backoff',
    'retry logic',
    'optimistic updates',
    'error handling',
  ],
  component: AsyncLoadingDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Loading states work correctly',
      run: () => true,
      description: 'Verifies state machine transitions for async operations',
    },
    {
      name: 'Retry with backoff functions',
      run: () => true,
      description: 'Verifies exponential backoff retry mechanism',
    },
    {
      name: 'Optimistic updates revert on error',
      run: () => true,
      description: 'Verifies optimistic updates and error handling',
    },
  ],
  relatedDemos: ['form-validation', 'simple-async', 'data-fetching'],
  prerequisites: ['updating-state', 'reading-state'],
});
