import { DemoRegistry } from '@/core/utils/demoRegistry';
import { PropsDemo } from './PropsDemo';

DemoRegistry.register({
  id: 'props',
  category: '02-patterns',
  title: 'Props Pattern',
  description:
    'Learn how to pass configuration and initial values to Cubits/Blocs through props for reusable state containers.',
  difficulty: 'intermediate',
  tags: ['props', 'configuration', 'initialization', 'reusability'],
  concepts: ['constructor props', 'configuration', 'parameterized state'],
  component: PropsDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Props configure initial state',
      run: () => true,
      description: 'Verifies props set initial state correctly',
    },
  ],
  relatedDemos: ['instance-management'],
  prerequisites: ['counter', 'instance-management'],
  documentation: `
## Props Pattern

Props allow you to configure Cubits/Blocs at creation time with initial values and settings.

### Use Cases:
- **Initial Values**: Set starting state from props
- **Configuration**: Pass settings like API endpoints, limits
- **Dependencies**: Inject services or dependencies
- **Reusability**: Create parameterized state containers

### Implementation:
\`\`\`typescript
class ConfigurableCubit extends Cubit<State> {
  constructor(props?: Props) {
    const defaults = { /* ... */ };
    const final = { ...defaults, ...props };
    super(initialState);
  }
}
\`\`\`

### Best Practices:
- Define default values for optional props
- Make props immutable after construction
- Use TypeScript interfaces for type safety
- Consider using instanceId for prop-based instances
`,
});
