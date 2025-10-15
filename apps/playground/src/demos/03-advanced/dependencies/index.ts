import { DemoRegistry } from '@/core/utils/demoRegistry';
import { DependenciesDemo } from './DependenciesDemo';

DemoRegistry.register({
  id: 'dependencies',
  category: '03-advanced',
  title: 'Dependency Tracking',
  description:
    'Master fine-grained subscriptions to optimize re-renders by tracking specific state properties',
  difficulty: 'advanced',
  tags: ['dependencies', 'performance', 'optimization', 'subscriptions'],
  concepts: [
    'dependency arrays',
    'fine-grained subscriptions',
    'computed dependencies',
    'deep property tracking',
  ],
  component: DependenciesDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Dependencies prevent unnecessary re-renders',
      run: () => true,
      description:
        'Verifies components only re-render when their dependencies change',
    },
    {
      name: 'Computed dependencies track derived values',
      run: () => true,
      description: 'Verifies computed properties work as dependencies',
    },
  ],
  relatedDemos: ['custom-selectors', 'bloc-composition'],
  prerequisites: ['counter', 'custom-selectors'],
  documentation: `
## Dependency Tracking

Dependencies allow you to specify exactly which parts of state your component subscribes to, enabling fine-grained reactivity and optimal performance.

### Core Concepts:
- **Dependency Arrays**: Track specific state properties
- **Computed Dependencies**: Subscribe to getter/computed values
- **Deep Property Access**: Track nested object properties
- **Performance**: Only re-render when dependencies change

### Basic Usage:
\`\`\`typescript
const [state] = useBloc(UserCubit, {
  dependencies: (cubit) => [
    cubit.state.profile.name,
    cubit.state.profile.email
  ]
});
\`\`\`

### Advanced Patterns:
- Track computed properties (getters)
- Deep property access for nested state
- Multiple dependencies for complex subscriptions
- Combine with selectors for transformation + tracking

### Best Practices:
- Track primitive values, not entire objects
- Use static dependency arrays when possible
- Test re-render behavior with render counters
- Combine with selectors for complex derivations

### Performance Impact:
Dependencies dramatically reduce unnecessary re-renders in applications with large state objects. Components only re-render when their specific dependencies change, not on every state update.
`,
});
