import { DemoRegistry } from '@/core/utils/demoRegistry';
import {
  IsolatedCounterDemo,
  isolatedCounterCode,
} from './IsolatedCounterDemo';

DemoRegistry.register({
  id: 'isolated-counter',
  category: '01-basics',
  title: 'Shared vs Isolated Instances',
  description:
    'Demonstrates the difference between shared and isolated Cubit instances. Shared instances share state across all components, while isolated instances maintain independent state.',
  difficulty: 'beginner',
  tags: ['cubit', 'state', 'isolation', 'shared', 'instances'],
  concepts: [
    'instance management',
    'state isolation',
    'shared state',
    'static properties',
  ],
  component: IsolatedCounterDemo,
  code: {
    demo: isolatedCounterCode.usage,
    bloc: isolatedCounterCode.bloc,
  },
  tests: [
    {
      name: 'Shared counters sync',
      run: () => true,
      description: 'Verifies that shared counters update together',
    },
    {
      name: 'Isolated counters are independent',
      run: () => true,
      description: 'Verifies that isolated counters maintain separate state',
    },
  ],
  relatedDemos: ['counter', 'keep-alive'],
  prerequisites: ['counter'],
  documentation: `
## Shared vs Isolated Instances

BlaC provides two ways to manage Cubit/Bloc instances:

### Shared Instances (Default)
- All components using the same Cubit class share the same state
- Changes in one component affect all others
- Useful for global state like user authentication, app settings

### Isolated Instances
- Each component gets its own independent instance
- Changes in one component don't affect others
- Useful for reusable components like form fields, modals

### How to Create Isolated Instances:

1. **Using static isolated property**:
   \`\`\`typescript
   class IsolatedCubit extends Cubit<State> {
     static isolated = true;
   }
   \`\`\`

2. **Using unique IDs**:
   \`\`\`typescript
   const [state, cubit] = useBloc(MyCubit, {
     id: uniqueId
   });
   \`\`\`

Choose based on your use case!
`,
});
