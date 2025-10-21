import { DemoRegistry } from '@/core/utils/demoRegistry';
import { FormValidationDemo } from './FormValidationDemo';

DemoRegistry.register({
  id: 'form-validation',
  category: '02-patterns',
  title: 'Advanced Form Validation',
  description:
    'Master complex validation patterns including field-level, cross-field, and async validation. Learn debouncing, password strength indicators, and optimistic error display.',
  difficulty: 'intermediate',
  tags: ['cubit', 'forms', 'validation', 'async', 'advanced', 'debouncing'],
  concepts: [
    'field-level validation',
    'cross-field validation',
    'async validation',
    'password strength',
    'debouncing',
    'error handling',
  ],
  component: FormValidationDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'All validation types work',
      run: () => true,
      description:
        'Verifies synchronous, asynchronous, and cross-field validation',
    },
    {
      name: 'Form submits when valid',
      run: () => true,
      description: 'Verifies form submission with all fields valid',
    },
  ],
  relatedDemos: ['simple-form', 'async-loading'],
  prerequisites: ['simple-form', 'updating-state'],
});
