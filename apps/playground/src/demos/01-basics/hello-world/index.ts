import { DemoRegistry } from '@/core/utils/demoRegistry';
import { HelloWorldDemo } from './HelloWorldDemo';

DemoRegistry.register({
  id: 'hello-world',
  category: '01-basics',
  title: 'Hello World',
  description:
    "The absolute simplest BlaC application. Start here if you're completely new to BlaC!",
  difficulty: 'beginner',
  tags: ['cubit', 'basics', 'getting-started', 'beginner'],
  concepts: ['state management', 'Cubit', 'useBloc hook'],
  component: HelloWorldDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Displays greeting',
      run: () => true,
      description: 'Verifies that the greeting is displayed',
    },
  ],
  relatedDemos: ['counter', 'reading-state'],
  prerequisites: [],
});
