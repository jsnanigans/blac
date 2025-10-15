import { DemoRegistry } from '@/core/utils/demoRegistry';
import { InstanceManagementDemo } from './InstanceManagementDemo';

DemoRegistry.register({
  id: 'instance-management',
  category: '01-basics',
  title: 'Instance Management',
  description:
    'Learn the difference between shared and isolated instances. Control whether your state is shared across all components or isolated to each one.',
  difficulty: 'beginner',
  tags: ['cubit', 'instances', 'shared', 'isolated', 'lifecycle'],
  concepts: ['shared instances', 'isolated instances', 'static isolated', 'instance IDs'],
  component: InstanceManagementDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Shared instances stay synchronized',
      run: () => true,
      description: 'Verifies that shared instances share state',
    },
    {
      name: 'Isolated instances are independent',
      run: () => true,
      description: 'Verifies that isolated instances have separate state',
    },
  ],
  relatedDemos: ['multiple-components', 'keep-alive'],
  prerequisites: ['multiple-components'],
});
