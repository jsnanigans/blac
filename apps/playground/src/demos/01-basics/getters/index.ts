import { DemoRegistry } from '@/core/utils/demoRegistry';
import { GettersDemo } from './GettersDemo';
// eslint-disable-next-line import/no-unused-modules

DemoRegistry.register({
  id: 'getters',
  category: '01-basics',
  title: 'Computed Getters',
  description:
    'Learn how to use getters for computed properties that automatically update when state changes.',
  difficulty: 'beginner',
  tags: ['getters', 'computed', 'derived-state', 'calculations'],
  concepts: ['computed properties', 'derived state', 'reactive calculations'],
  component: GettersDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Getters update automatically',
      run: () => true,
      description: 'Verifies getters recalculate when state changes',
    },
  ],
  relatedDemos: ['custom-selectors', 'emit-patch'],
  prerequisites: ['counter'],
  documentation: `
## Computed Getters

Getters provide computed properties that automatically update when the underlying state changes.

### Benefits:
- **Automatic Updates**: Recalculate when state changes
- **Clean API**: Access like regular properties
- **Reusable Logic**: Define once, use everywhere
- **Performance**: Can be used with selectors

### Common Use Cases:
1. **Calculations**: Totals, averages, percentages
2. **Formatting**: Display strings, dates
3. **Derived State**: isLoading, isEmpty, hasError
4. **Aggregations**: Counts, summaries
5. **Validations**: Form validity, data checks

### Best Practices:
- Keep getters pure (no side effects)
- Avoid expensive computations (or memoize)
- Use descriptive names
- Can reference other getters
- Perfect for selector dependencies

### Example:
\`\`\`typescript
class FormCubit extends Cubit<FormState> {
  get isValid() {
    return this.state.email && this.state.password;
  }
  
  get canSubmit() {
    return this.isValid && !this.state.isSubmitting;
  }
}
\`\`\`
`,
});
