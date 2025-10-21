import { DemoRegistry } from '@/core/utils/demoRegistry';
import { LifecycleDemo } from './LifecycleDemo';

DemoRegistry.register({
  id: 'lifecycle',
  category: '02-core-concepts',
  title: 'Bloc Lifecycle Management',
  description:
    'Understand the lifecycle of Blocs and Cubits: initialization, state updates, instance management, and disposal.',
  difficulty: 'intermediate',
  tags: ['bloc', 'cubit', 'lifecycle', 'instances', 'disposal', 'memory'],
  concepts: [
    'constructor',
    'disposal',
    'shared instances',
    'isolated instances',
    'keep alive',
    'memory management',
  ],
  component: LifecycleDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Instance creation and disposal',
      run: () => true,
      description: 'Verifies that instances are created and disposed correctly',
    },
    {
      name: 'Shared vs isolated instances',
      run: () => true,
      description: 'Verifies different instance patterns work as expected',
    },
    {
      name: 'Keep alive persists state',
      run: () => true,
      description:
        'Verifies that keep-alive instances survive component unmounting',
    },
  ],
  relatedDemos: ['instance-management', 'async-operations', 'bloc-deep-dive'],
  prerequisites: ['counter', 'updating-state'],
});

export { LifecycleDemo } from './LifecycleDemo';
