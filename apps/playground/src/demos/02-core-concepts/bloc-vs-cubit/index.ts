import { DemoRegistry } from '@/core/utils/demoRegistry';
import { BlocVsCubitDemo, blocVsCubitDemoCode } from './BlocVsCubitDemo';

DemoRegistry.register({
  id: 'bloc-vs-cubit',
  category: '02-patterns',
  title: 'Bloc vs Cubit: When to Use Which?',
  description:
    'Understand the differences between Blocs and Cubits and learn when to use each pattern for your state management needs.',
  difficulty: 'beginner',
  tags: ['bloc', 'cubit', 'comparison', 'decision-making'],
  concepts: [
    'cubit vs bloc trade-offs',
    'direct methods vs events',
    'event traceability',
    'complexity comparison',
    'performance considerations',
    'when to use which pattern',
  ],
  component: BlocVsCubitDemo,
  code: {
    demo: blocVsCubitDemoCode,
  },
  relatedDemos: ['cubit-deep-dive', 'bloc-deep-dive', 'computed-properties'],
  prerequisites: ['cubit-deep-dive', 'bloc-deep-dive'],
});