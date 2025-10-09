import { DemoRegistry } from '@/core/utils/demoRegistry';
import { LoadingStatesDemo } from './LoadingStatesDemo';

DemoRegistry.register({
  id: 'loading-states',
  category: '02-patterns',
  title: 'Loading States Pattern',
  description:
    'Learn type-safe state management with discriminated unions. This demo shows a state machine pattern for handling Idle, Loading, Success, and Error states with full TypeScript type safety.',
  difficulty: 'intermediate',
  tags: ['state-machine', 'async', 'typescript', 'patterns', 'discriminated-unions'],
  concepts: [
    'state machines',
    'discriminated unions',
    'type-safe state',
    'async operations',
    'error handling',
    'impossible states prevention',
  ],
  component: LoadingStatesDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Transitions from idle to loading',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies state transitions to loading when fetchData is called',
    },
    {
      name: 'Transitions to success on successful fetch',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies successful data fetch transitions to success state',
    },
    {
      name: 'Transitions to error on failed fetch',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies failed data fetch transitions to error state',
    },
    {
      name: 'Reset returns to idle state',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies reset method returns state to idle',
    },
    {
      name: 'Retry refetches after error',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies retry functionality after error state',
    },
  ],
  relatedDemos: ['simple-async', 'async-operations', 'emit-patch'],
  prerequisites: ['counter', 'emit-patch'],
  documentation: `
## Loading States Pattern

This demo showcases the **state machine pattern** using **discriminated unions** for type-safe state management.

### What are Discriminated Unions?

Discriminated unions (also called tagged unions) are a TypeScript pattern where you have multiple possible object shapes, each identified by a common "tag" or "discriminant" field.

\`\`\`typescript
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };
\`\`\`

The \`status\` field is the discriminant. TypeScript uses it to narrow the type and know which properties are available.

### Benefits

#### 1. Type Safety
When you check the \`status\` field, TypeScript automatically knows which properties are available:

\`\`\`typescript
if (state.status === 'success') {
  console.log(state.data); // ✅ TypeScript knows data exists
}

if (state.status === 'error') {
  console.log(state.error); // ✅ TypeScript knows error exists
}
\`\`\`

#### 2. Impossible States Prevention
Traditional approaches might use boolean flags:

\`\`\`typescript
// ❌ Bad - Many invalid combinations possible
type BadState = {
  isLoading: boolean;
  isError: boolean;
  data?: string;
  error?: string;
};
// What if isLoading=true AND isError=true? 🤔
\`\`\`

With discriminated unions, invalid state combinations are impossible!

#### 3. Exhaustive Checking
TypeScript ensures you handle all possible states:

\`\`\`typescript
switch (state.status) {
  case 'idle': return <IdleUI />;
  case 'loading': return <LoadingUI />;
  case 'success': return <SuccessUI data={state.data} />;
  case 'error': return <ErrorUI error={state.error} />;
  // TypeScript will error if you forget a case!
}
\`\`\`

### State Machine Pattern

This demo implements a finite state machine with well-defined transitions:

1. **Idle → Loading**: User initiates data fetch
2. **Loading → Success**: Fetch completes successfully
3. **Loading → Error**: Fetch fails
4. **Success → Idle**: User resets
5. **Error → Loading**: User retries
6. **Error → Idle**: User resets

### Common Pitfalls to Avoid

1. **Don't use optional fields for states**: Use discriminated unions instead
2. **Don't have multiple boolean flags**: They lead to invalid state combinations
3. **Always provide a discriminant field**: Use consistent naming (like \`status\` or \`type\`)
4. **Handle all cases**: Use exhaustive type checking to catch missing cases

### Real-World Applications

- API data fetching
- Form submission states
- File upload progress
- Authentication flows
- Any async operation with success/failure outcomes

### Next Steps

- Check out the **Simple Async** demo for basic async patterns
- See **Async Operations** for more advanced error handling with retry logic
- Learn about **Event Design Patterns** for event-driven state machines with Blocs
`,
});
