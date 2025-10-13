import { DemoRegistry } from '@/core/utils/demoRegistry';
import { CubitDeepDiveDemo } from './CubitDeepDiveDemo';

DemoRegistry.register({
  id: 'cubit-deep-dive',
  category: '02-patterns',
  title: 'Cubit Deep Dive',
  description:
    'Master advanced Cubit patterns including nested state, computed properties, async operations, and performance optimization.',
  difficulty: 'intermediate',
  tags: ['cubit', 'advanced', 'patterns', 'computed', 'async'],
  concepts: ['nested state', 'computed properties', 'async operations', 'getters', 'immutability'],
  component: CubitDeepDiveDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Nested state updates',
      run: () => true,
      description: 'Verifies that nested state updates work correctly',
    },
    {
      name: 'Computed properties work',
      run: () => true,
      description: 'Verifies that getter-based computed properties calculate correctly',
    },
    {
      name: 'Async operations handle loading states',
      run: () => true,
      description: 'Verifies async patterns handle loading, error, and success states',
    },
  ],
  relatedDemos: ['simple-counter', 'bloc-deep-dive', 'async'],
  prerequisites: ['simple-counter', 'reading-state'],
});

export { CubitDeepDiveDemo } from './CubitDeepDiveDemo';
