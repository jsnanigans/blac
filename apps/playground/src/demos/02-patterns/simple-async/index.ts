import { DemoRegistry } from '@/core/utils/demoRegistry';
import { SimpleAsyncDemo } from './SimpleAsyncDemo';

DemoRegistry.register({
  id: 'simple-async',
  category: '02-patterns',
  title: 'Simple Async Operations',
  description:
    'Master the basics of async state management with a straightforward loading pattern. Perfect for understanding how to handle API calls, loading states, and errors in Cubits.',
  difficulty: 'intermediate',
  tags: ['async', 'cubit', 'loading', 'error-handling', 'patterns'],
  concepts: [
    'async/await in Cubits',
    'loading state management',
    'basic error handling',
    'retry patterns',
    'state transitions',
    'discriminated unions',
  ],
  component: SimpleAsyncDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Initial idle state',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies the Cubit starts in idle state',
    },
    {
      name: 'Fetch data transitions: idle → loading → success',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies successful data fetch flow',
    },
    {
      name: 'Fetch data transitions: idle → loading → error',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies error handling during data fetch',
    },
    {
      name: 'Retry after error',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies retry functionality works after an error',
    },
    {
      name: 'Reset to idle state',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies reset returns state to idle from any state',
    },
    {
      name: 'Multiple sequential fetches',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies handling of multiple fetch operations in sequence',
    },
  ],
  relatedDemos: ['async-operations', 'form-cubit', 'loading-states'],
  prerequisites: ['counter', 'loading-states'],
  documentation: `
## Simple Async Operations

This demo teaches the **fundamentals of handling asynchronous operations** in Cubits using a clean, type-safe approach with discriminated unions.

### Why This Pattern?

Async operations are everywhere in modern web apps:
- Fetching data from APIs
- Submitting forms
- Loading resources
- Processing user uploads

This pattern provides a **simple, predictable way** to manage these operations.

### Core Concepts

#### 1. State Definition
We use discriminated unions to represent all possible states:

\`\`\`typescript
type AsyncState =
  | { status: 'idle' }      // Waiting to start
  | { status: 'loading' }   // Operation in progress
  | { status: 'success'; data: string }  // Completed successfully
  | { status: 'error'; error: string }   // Failed with error
\`\`\`

#### 2. Async Method Pattern
The Cubit methods follow this pattern:

\`\`\`typescript
fetchData = async () => {
  // 1. Set loading state
  this.emit({ status: 'loading' });

  try {
    // 2. Perform async operation
    const data = await someAsyncOperation();

    // 3. Emit success state
    this.emit({ status: 'success', data });
  } catch (error) {
    // 4. Handle errors
    this.emit({ status: 'error', error: error.message });
  }
};
\`\`\`

### Key Features

#### Simple Retry
Unlike the advanced **Async Operations** demo with exponential backoff, this demo shows basic retry:

\`\`\`typescript
retry = () => {
  // Just try again - no backoff logic
  this.fetchData();
};
\`\`\`

#### State Reset
Return to initial state for fresh starts:

\`\`\`typescript
reset = () => {
  this.emit({ status: 'idle' });
};
\`\`\`

### UI Integration

The demo shows how to:
1. **Display different UI for each state** - Loading spinners, success messages, error alerts
2. **Enable/disable actions based on state** - Disable buttons during loading
3. **Provide clear user feedback** - Visual state indicators
4. **Handle user interactions** - Fetch, retry, reset buttons

### When to Use This Pattern

Use this simple pattern when:
- You need basic async operations
- Error handling is straightforward
- No complex retry logic needed
- Single operation at a time

### When to Use Advanced Patterns

Consider the **Async Operations** demo when you need:
- Exponential backoff retry logic
- Request cancellation
- Concurrent request handling
- Request deduplication
- Complex error recovery strategies

### Common Pitfalls

1. **Not handling loading state**: Always show feedback during async operations
2. **Forgetting error states**: Every async operation can fail
3. **Missing cleanup**: Consider what happens if component unmounts during loading
4. **Not disabling interactions**: Prevent duplicate requests during loading

### Best Practices

1. **Always use discriminated unions** for type safety
2. **Emit loading state immediately** when starting async work
3. **Provide clear error messages** to users
4. **Include retry capability** for transient failures
5. **Allow state reset** for fresh starts

### Real-World Applications

This pattern is perfect for:
- API data fetching
- Form submissions
- File uploads
- Authentication flows
- Resource loading

### Testing Async Operations

Key areas to test:
1. State transitions (idle → loading → success/error)
2. Error handling and recovery
3. Retry behavior
4. Reset functionality
5. Edge cases (rapid state changes, concurrent operations)

### Next Steps

Once you've mastered this pattern:
1. Explore **Async Operations** for advanced retry strategies
2. Check out **Form Cubit** for form-specific async handling
3. Learn about **Loading States** for more complex state machines
4. Study **Persistence** for caching async results

### Summary

This simple async pattern provides a solid foundation for handling asynchronous operations in your Blac applications. It's straightforward, type-safe, and covers the most common use cases you'll encounter.
`,
});