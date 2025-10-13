import { DemoRegistry } from '@/core/utils/demoRegistry';
import { SimpleFormDemo } from './SimpleFormDemo';

DemoRegistry.register({
  id: 'simple-form',
  category: '02-patterns',
  title: 'Simple Form Handling',
  description:
    'Learn how to manage form state, validation, and submission with BlaC Cubits. Covers field updates, real-time validation, and async submission handling.',
  difficulty: 'beginner',
  tags: ['cubit', 'forms', 'validation', 'async', 'patch'],
  concepts: ['form state management', 'validation getters', 'async handlers', 'loading states'],
  component: SimpleFormDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Form validation works',
      run: () => true,
      description: 'Verifies that form validation is working correctly',
    },
    {
      name: 'Form submits successfully',
      run: () => true,
      description: 'Verifies that form submission works',
    },
  ],
  relatedDemos: ['form-cubit', 'loading-states'],
  prerequisites: ['counter', 'updating-state'],
});
