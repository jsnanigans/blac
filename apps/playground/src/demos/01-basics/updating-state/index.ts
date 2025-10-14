import { DemoRegistry } from '@/core/utils/demoRegistry';
import { UpdatingStateDemo } from './UpdatingStateDemo';

DemoRegistry.register({
  id: 'updating-state',
  category: '01-basics',
  title: 'Updating State: emit() vs patch()',
  description:
    'Learn the two ways to update state in BlaC and when to use each one. Master emit() for full replacements and patch() for partial updates.',
  difficulty: 'beginner',
  tags: ['cubit', 'emit', 'patch', 'state-updates'],
  concepts: ['state updates', 'emit', 'patch', 'shallow merge'],
  component: UpdatingStateDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'emit() replaces entire state',
      run: () => true,
      description: 'Verifies that emit() replaces the entire state object',
    },
    {
      name: 'patch() performs shallow merge',
      run: () => true,
      description: 'Verifies that patch() only updates specified fields',
    },
  ],
  relatedDemos: ['reading-state', 'multiple-components'],
  prerequisites: ['reading-state'],
});
