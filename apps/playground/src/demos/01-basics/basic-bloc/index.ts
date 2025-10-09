import { DemoRegistry } from '@/core/utils/demoRegistry';
import { BasicBlocDemo } from './BasicBlocDemo';

DemoRegistry.register({
  id: 'basic-bloc',
  category: '01-basics',
  title: 'Basic Bloc',
  description:
    'Introduction to event-driven state management with Bloc pattern. Learn about event classes, event handlers, and event traceability with a simple counter example.',
  difficulty: 'beginner',
  tags: ['bloc', 'events', 'basics', 'event-driven'],
  concepts: [
    'event classes',
    'event handlers',
    'event-driven architecture',
    'traceability',
    'Bloc pattern',
  ],
  component: BasicBlocDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Increment event increases count',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies that IncrementEvent increases the counter',
    },
    {
      name: 'Decrement event decreases count',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies that DecrementEvent decreases the counter',
    },
    {
      name: 'Reset event sets count to zero',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies that ResetEvent resets the counter to 0',
    },
  ],
  relatedDemos: ['counter', 'bloc-vs-cubit'],
  prerequisites: ['counter'],
  documentation: `
## Basic Bloc Pattern

This demo introduces the **Bloc (Business Logic Component)** pattern - an event-driven approach to state management.

### What is a Bloc?

Unlike Cubit which uses direct method calls to change state, Bloc uses **events** to trigger state changes. Each user action is represented as an event class, and event handlers process these events to emit new state.

### Key Concepts

#### 1. Event Classes
Events are simple classes that represent user actions or system events:
\`\`\`typescript
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}
\`\`\`

#### 2. Event Handlers
Handlers are registered in the Bloc constructor using the \`on()\` method:
\`\`\`typescript
this.on(IncrementEvent, (event, emit) => {
  emit({ count: this.state.count + event.amount });
});
\`\`\`

#### 3. Dispatching Events
Events are dispatched using the \`add()\` method:
\`\`\`typescript
bloc.add(new IncrementEvent(1));
\`\`\`

### Benefits of Event-Driven Architecture

1. **Traceability**: Every state change has a clear cause (an event)
2. **Debugging**: Easy to log and track all events in your application
3. **Testing**: Test event handlers in isolation
4. **Time-Travel**: Events can be recorded and replayed for debugging
5. **Middleware**: Events can be intercepted and transformed

### When to Use Bloc vs Cubit

**Use Bloc when:**
- You need event tracking and logging
- Your app requires time-travel debugging
- You have complex business logic with multiple triggers
- You need to intercept or transform actions

**Use Cubit when:**
- Your state updates are simple and direct
- You don't need event tracking
- Performance is critical (Cubit has less overhead)

### Next Steps

After mastering this basic Bloc pattern, check out:
- **Bloc vs Cubit** demo for a side-by-side comparison
- **Todo Bloc** demo for a more complex real-world example
`,
});
