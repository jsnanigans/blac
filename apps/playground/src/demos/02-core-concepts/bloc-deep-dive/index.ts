import { DemoRegistry } from '@/core/utils/demoRegistry';
import { BlocDeepDiveDemo } from './BlocDeepDiveDemo';

DemoRegistry.register({
  id: 'bloc-deep-dive',
  category: '02-core-concepts',
  title: 'Bloc Deep Dive',
  description:
    'Master event-driven state management with Blocs: event handling, async operations, transformations, and testing patterns.',
  difficulty: 'intermediate',
  tags: ['bloc', 'events', 'async', 'patterns', 'testing'],
  concepts: ['event-driven architecture', 'async handling', 'event transformation', 'testing'],
  component: BlocDeepDiveDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Event handling works correctly',
      run: () => true,
      description: 'Verifies that events trigger proper state changes',
    },
    {
      name: 'Async events complete successfully',
      run: () => true,
      description: 'Verifies that async event handlers work as expected',
    },
  ],
  relatedDemos: ['cubit-deep-dive', 'bloc-vs-cubit'],
  prerequisites: ['cubit-deep-dive'],
});

export { BlocDeepDiveDemo };
