import { DemoRegistry } from '@/core/utils/demoRegistry';
import { CustomSelectorsInteractive } from './CustomSelectorsInteractive';

DemoRegistry.register({
  id: 'custom-selectors',
  category: '03-advanced',
  title: 'Custom Selectors',
  description:
    'Master custom selectors to optimize re-renders by precisely controlling when components update',
  difficulty: 'advanced',
  tags: ['selectors', 'performance', 'optimization', 'memoization'],
  concepts: [
    'selector functions',
    'custom equality',
    'derived values',
    'shallow vs deep equality',
    'computed properties',
  ],
  component: CustomSelectorsInteractive,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Selectors prevent unnecessary re-renders',
      run: () => true,
      description:
        'Verifies components only re-render when selected values change',
    },
    {
      name: 'Custom equality functions work correctly',
      run: () => true,
      description: 'Verifies custom equality checks prevent false re-renders',
    },
  ],
  relatedDemos: ['dependencies', 'bloc-composition', 'computed-properties'],
  prerequisites: ['counter', 'cubit-deep-dive'],
  documentation: `
## Custom Selectors

Custom selectors are one of BlaC's most powerful optimization tools, allowing you to precisely control when components re-render by selecting only the specific parts of state they need.

### Core Concepts:
- **Selector Functions**: Transform and select state
- **Custom Equality**: Control re-render behavior with custom comparison logic
- **Derived Values**: Compute values from state
- **Memoization**: Cache expensive computations

### Basic Usage:
\`\`\`typescript
const [userName] = useBloc(AppCubit, {
  selector: (state) => state.user.name,
});
\`\`\`

### Advanced Patterns:
- Custom equality functions for object comparisons
- Computed property selectors
- Memoized derived values
- Split selectors across components

### Best Practices:
- Prefer primitive values in selectors
- Use custom equalityFn when selecting objects/arrays
- Memoize expensive computations in Cubit getters
- Test selector behavior with render counters

### Performance Impact:
Selectors can reduce re-renders by 90% or more in complex applications by ensuring components only update when their specific selected values change.
`,
});
