import { DemoRegistry } from '@/core/utils/demoRegistry';
import { BlocVsCubitDemo } from './BlocVsCubitDemo';

DemoRegistry.register({
  id: 'bloc-vs-cubit',
  category: '01-basics',
  title: 'Bloc vs Cubit',
  description:
    'Side-by-side comparison of Cubit and Bloc patterns. Learn the differences, trade-offs, and when to use each approach with interactive examples and a decision matrix.',
  difficulty: 'beginner',
  tags: ['cubit', 'bloc', 'comparison', 'patterns', 'decision-guide'],
  concepts: [
    'cubit vs bloc trade-offs',
    'direct methods vs events',
    'event traceability',
    'complexity comparison',
    'performance considerations',
    'when to use which pattern',
  ],
  component: BlocVsCubitDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  tests: [
    {
      name: 'Cubit increment works',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies Cubit increment functionality',
    },
    {
      name: 'Bloc increment works',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies Bloc increment with events',
    },
    {
      name: 'Both implementations have same behavior',
      run: () => true, // Will be replaced with actual test
      description: 'Verifies feature parity between Cubit and Bloc',
    },
  ],
  relatedDemos: ['counter', 'basic-bloc'],
  prerequisites: ['counter', 'basic-bloc'],
  documentation: `
## Bloc vs Cubit: Which Should You Use?

This demo provides a **side-by-side comparison** of the two main state management patterns in BlaC: **Cubit** and **Bloc**.

### Understanding the Difference

Both Cubit and Bloc manage state, but they differ in **how** state changes are triggered:

#### Cubit: Direct Method Calls
\`\`\`typescript
class CounterCubit extends Cubit<State> {
  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

// Usage
cubit.increment(); // Direct method call
\`\`\`

#### Bloc: Event-Driven
\`\`\`typescript
class IncrementEvent {}

class CounterBloc extends Bloc<State> {
  constructor() {
    super(initialState);
    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + 1 });
    });
  }
}

// Usage
bloc.add(new IncrementEvent()); // Dispatch event
\`\`\`

### Key Trade-offs

| Aspect | Cubit | Bloc |
|--------|-------|------|
| **Simplicity** | ✅ Less code, faster to write | ⚠️ More boilerplate |
| **Traceability** | ❌ Method calls are invisible | ✅ Events are explicitly logged |
| **Debugging** | ⚠️ Standard debugging tools | ✅ Event logs, time-travel |
| **Testing** | ✅ Test methods directly | ✅ Test event handlers separately |
| **Performance** | ✅ Slightly faster (no event queue) | ⚠️ Small overhead from events |
| **Complexity** | ✅ Best for simple state | ✅ Better for complex logic |

### When to Use Cubit

Choose **Cubit** when:
- ✅ Your state management is **straightforward**
- ✅ You don't need to track **why** state changed
- ✅ Direct method calls are sufficient
- ✅ You're prototyping or building simple features
- ✅ Performance is absolutely critical

**Example Use Cases:**
- Form field state
- UI toggle states
- Simple counters or flags
- Client-side filters
- Local component state

### When to Use Bloc

Choose **Bloc** when:
- ✅ You need **event tracking** and logging
- ✅ **Complex business logic** with multiple triggers
- ✅ **Time-travel debugging** is valuable
- ✅ Multiple parts of your app need to react to the same action
- ✅ You want to **replay** or **test** event sequences

**Example Use Cases:**
- Authentication flows
- Complex forms with validation
- Shopping carts with analytics
- Game state management
- Undo/redo functionality
- Event sourcing patterns

### Performance Considerations

**Cubit** has a **slight performance advantage** because it doesn't use an event queue. However, this difference is negligible for most applications.

**Bloc** adds minimal overhead:
- Events are queued and processed sequentially
- Each event goes through a handler lookup
- Typically adds <1ms per state change

**Verdict:** Performance should **not** be your primary deciding factor. Choose based on your debugging and traceability needs.

### Complexity Comparison

Let's compare the same counter implementation:

**Cubit: ~10 lines of code**
\`\`\`typescript
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.patch({ count: this.state.count + 1 });
  decrement = () => this.patch({ count: this.state.count - 1 });
  reset = () => this.emit({ count: 0 });
}
\`\`\`

**Bloc: ~25 lines of code**
\`\`\`typescript
class IncrementEvent {}
class DecrementEvent {}
class ResetEvent {}

class CounterBloc extends Bloc<{ count: number }> {
  constructor() {
    super({ count: 0 });

    this.on(IncrementEvent, (e, emit) => {
      emit({ count: this.state.count + 1 });
    });

    this.on(DecrementEvent, (e, emit) => {
      emit({ count: this.state.count - 1 });
    });

    this.on(ResetEvent, (e, emit) => {
      emit({ count: 0 });
    });
  }
}
\`\`\`

**More code doesn't mean worse!** Bloc's extra code provides:
- Explicit event names for logging
- Testable event handlers
- Clear separation of actions and logic
- Event history for debugging

### Testing Comparison

Both are easily testable, but in different ways:

**Testing Cubit:**
\`\`\`typescript
it('increments count', () => {
  const cubit = new CounterCubit();
  cubit.increment();
  expect(cubit.state.count).toBe(1);
});
\`\`\`

**Testing Bloc:**
\`\`\`typescript
it('handles increment event', async () => {
  const bloc = new CounterBloc();
  await bloc.add(new IncrementEvent());
  expect(bloc.state.count).toBe(1);
});

it('processes events in order', async () => {
  const bloc = new CounterBloc();
  await bloc.add(new IncrementEvent());
  await bloc.add(new IncrementEvent());
  await bloc.add(new DecrementEvent());
  expect(bloc.state.count).toBe(1);
});
\`\`\`

Bloc allows you to test **event sequences** and verify events are processed correctly.

### Migration Path

**Start simple, evolve when needed:**

1. **Start with Cubit** for new features
2. **Monitor** if you need event tracking
3. **Migrate to Bloc** if you need:
   - Event logging
   - Complex business logic
   - Multiple event sources
   - Time-travel debugging

**Good news:** Cubit and Bloc share the same core API, so migration is straightforward!

### Real-World Guideline

Here's a practical rule of thumb:

- **~80% of your state** will be simple enough for **Cubit**
- **~20% of your state** will benefit from **Bloc**'s event tracking

Don't overthink it! Start with Cubit and migrate to Bloc only when you need the extra power.

### Next Steps

- Try the **Basic Bloc** demo to see event-driven patterns in action
- Check out **Todo Bloc** for a real-world Bloc example
- Explore **Loading States** to see discriminated unions with Cubit
`,
});
