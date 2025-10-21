import { DemoRegistry } from '@/core/utils/demoRegistry';
import { MultipleComponentsDemo } from './MultipleComponentsDemo';

DemoRegistry.register({
  id: 'multiple-components',
  category: '01-basics',
  title: 'Component Composition',
  description:
    'Learn how to share state across parent and child components without prop drilling. See component composition in action!',
  difficulty: 'beginner',
  tags: ['cubit', 'components', 'composition', 'shared-state', 'prop-drilling'],
  concepts: [
    'component composition',
    'no prop drilling',
    'direct state access',
  ],
  component: MultipleComponentsDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Children access state without props',
      run: () => true,
      description: 'Verifies that child components can access state directly',
    },
  ],
  relatedDemos: ['reading-state', 'instance-management'],
  prerequisites: ['reading-state'],
});
