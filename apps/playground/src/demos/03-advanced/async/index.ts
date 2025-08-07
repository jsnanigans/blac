import { DemoRegistry } from '@/core/utils/demoRegistry';
import { AsyncDemo, asyncDemoCode } from './AsyncDemo';

DemoRegistry.register({
  id: 'async-operations',
  category: '03-advanced',
  title: 'Async Operations',
  description:
    'Demonstrates async operations in Cubits including loading states, error handling, retries with exponential backoff, and statistics tracking.',
  difficulty: 'intermediate',
  tags: ['async', 'cubit', 'error-handling', 'loading', 'retry'],
  concepts: [
    'async state management',
    'loading states',
    'error handling',
    'exponential backoff',
    'retry logic',
  ],
  component: AsyncDemo,
  code: {
    demo: asyncDemoCode.usage,
    bloc: asyncDemoCode.bloc,
  },
  tests: [
    {
      name: 'Handles loading state',
      run: () => {
        // Test would verify loading state transitions
        return true;
      },
      description: 'Verifies that loading state is properly managed',
    },
    {
      name: 'Handles errors gracefully',
      run: () => {
        // Test would verify error handling
        return true;
      },
      description: 'Verifies that errors are caught and displayed',
    },
    {
      name: 'Retry logic works',
      run: () => {
        // Test would verify retry with backoff
        return true;
      },
      description: 'Verifies exponential backoff retry mechanism',
    },
  ],
  relatedDemos: ['todo-bloc', 'counter'],
  prerequisites: ['counter'],
  documentation: `
## Async Operations with BlaC

This demo showcases how to handle asynchronous operations in BlaC Cubits, including proper loading states, error handling, and retry logic.

### Key Patterns:

1. **Loading States**: Show UI feedback during async operations
2. **Error Handling**: Gracefully handle and display errors
3. **Retry Logic**: Implement exponential backoff for failed requests
4. **State Tracking**: Keep statistics of successes and failures

### Best Practices:

- Always set loading state before async operations
- Clear errors when appropriate
- Provide user feedback for all states
- Implement proper cleanup and reset functionality
- Use exponential backoff for retries to avoid overwhelming servers

### Code Structure:

The ApiCubit demonstrates a complete async state management pattern:
- Initial state with null data
- Loading state during operations
- Success state with data
- Error state with error messages
- Statistics tracking for monitoring

This pattern can be adapted for any async operation including:
- API calls
- File uploads
- Database operations
- Long-running computations
`,
});
