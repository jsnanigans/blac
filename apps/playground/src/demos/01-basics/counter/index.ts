import { DemoRegistry } from '@/core/utils/demoRegistry';
import { CounterDemo, counterDemoCode } from './CounterDemo';

DemoRegistry.register({
  id: 'counter',
  category: '01-basics',
  title: 'Basic Counter',
  description: 'A simple counter demonstrating basic Cubit usage with increment, decrement, and reset functionality.',
  difficulty: 'beginner',
  tags: ['cubit', 'state', 'basics'],
  concepts: ['state management', 'event handlers', 'React hooks'],
  component: CounterDemo,
  code: {
    demo: counterDemoCode.usage,
    bloc: counterDemoCode.cubit,
  },
  tests: [
    {
      name: 'Counter increments',
      run: () => true,
      description: 'Verifies that the counter increments correctly',
    },
    {
      name: 'Counter decrements',
      run: () => true,
      description: 'Verifies that the counter decrements correctly',
    },
  ],
  relatedDemos: ['isolated-counter', 'shared-counter'],
  prerequisites: [],
});