import { DemoRegistry } from '@/core/utils/demoRegistry';
import { ReadingStateDemo } from './ReadingStateDemo';

DemoRegistry.register({
  id: 'reading-state',
  category: '01-basics',
  title: 'Reading State',
  description:
    'Learn how multiple components can read and display the same state. See the power of shared state management!',
  difficulty: 'beginner',
  tags: ['cubit', 'state', 'useBloc', 'shared-state'],
  concepts: ['shared state', 'useBloc hook', 'component synchronization'],
  component: ReadingStateDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Multiple components share state',
      run: () => true,
      description: 'Verifies that multiple components read from the same state',
    },
  ],
  relatedDemos: ['hello-world', 'multiple-components'],
  prerequisites: ['hello-world'],
});
