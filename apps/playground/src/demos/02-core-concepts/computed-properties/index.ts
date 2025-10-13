import { DemoRegistry } from '@/core/utils/demoRegistry';
import { ComputedPropertiesDemo } from './ComputedPropertiesDemo';

// Register the computed properties demo
DemoRegistry.register({
  id: 'computed-properties',
  title: 'Computed Properties with Getters',
  description: 'Learn how to use TypeScript getters to create computed properties that derive values from state automatically.',
  category: '02-patterns',
  component: ComputedPropertiesDemo,
  difficulty: 'beginner',
  tags: ['cubit', 'getters', 'computed', 'derived-state'],
  concepts: ['getters', 'computed-properties', 'derived-state', 'selectors'],
  code: {
    demo: '',
    bloc: '',
    usage: '',
  },
});

export { ComputedPropertiesDemo };