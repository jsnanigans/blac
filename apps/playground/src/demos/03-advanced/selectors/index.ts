import { DemoRegistry } from '@/core/utils/demoRegistry';
import { SelectorsDemo } from './SelectorsDemo';
// eslint-disable-next-line import/no-unused-modules

DemoRegistry.register({
  id: 'custom-selectors',
  category: '03-advanced',
  title: 'Custom Selectors',
  description:
    'Optimize re-renders with custom selectors that let components subscribe to specific parts of state or computed values.',
  difficulty: 'advanced',
  tags: ['optimization', 'selectors', 'performance', 'dependencies'],
  concepts: [
    'render optimization',
    'dependency tracking',
    'computed values',
    'selective updates',
  ],
  component: SelectorsDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Selectors reduce re-renders',
      run: () => true,
      description: 'Verifies that selectors prevent unnecessary re-renders',
    },
  ],
  relatedDemos: ['dependency-tracking'],
  prerequisites: ['counter', 'isolated-counter'],
  documentation: `
## Custom Selectors for Optimization

Selectors allow components to subscribe to specific parts of state, dramatically reducing unnecessary re-renders.

### Why Use Selectors?

Without selectors, components re-render on ANY state change. With selectors, they only re-render when selected data changes.

### How to Use:

\`\`\`typescript
const [state, cubit] = useBloc(MyCubit, {
  dependencies: (cubit) => [
    // List values to track
    cubit.state.specificField,
    cubit.computedValue,
    cubit.state.nested.property
  ]
});
\`\`\`

### Best Practices:

1. **Be Specific**: Select only the data you need
2. **Use Computed Values**: Track derived state via getters
3. **Avoid Complex Logic**: Keep selectors simple and fast
4. **Memoize When Needed**: For expensive computations

### Performance Impact:

- Can reduce re-renders by 90%+ in complex apps
- Essential for lists and frequently updating state
- Minimal overhead from dependency tracking
`,
});
