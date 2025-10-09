import { DemoRegistry } from '@/core/utils/demoRegistry';
import { EventDesignDemo } from './EventDesignDemo';

DemoRegistry.register({
  id: 'event-design',
  title: 'Event Design Patterns',
  category: '02-patterns',
  difficulty: 'intermediate',
  prerequisites: ['basic-bloc', 'bloc-vs-cubit'],
  relatedDemos: ['form-cubit', 'simple-async'],
  tags: ['events', 'bloc', 'patterns', 'best-practices', 'anti-patterns'],
  concepts: [
    'event naming conventions',
    'immutable event payloads',
    'event handler patterns',
    'command events',
    'domain events',
    'anti-patterns to avoid',
  ],
  description: 'Learn best practices for designing events in BlaC Blocs, including naming, immutability, and common anti-patterns to avoid',
  component: EventDesignDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  documentation: `
    # Event Design Patterns in BlaC

    This demo showcases best practices for designing events in BlaC Blocs, demonstrating both
    good patterns to follow and anti-patterns to avoid.

    ## Why Good Event Design Matters

    Events are the fundamental building blocks of Bloc-based state management. Well-designed events:
    - Clearly communicate **what happened** (not what should happen)
    - Are immutable and thread-safe
    - Are easy to test and debug
    - Make state transitions predictable
    - Follow domain language and business concepts

    ## Good Event Patterns

    ### 1. Noun-Based Naming

    Events represent facts - things that have happened. Use past-tense nouns or noun phrases:

    \`\`\`typescript
    // ✅ Good - describes what happened
    class UserLoggedInEvent {
      constructor(public readonly user: User) {}
    }

    class DataLoadedEvent {
      constructor(public readonly data: Data) {}
    }

    class PaymentCompletedEvent {
      constructor(public readonly paymentId: string) {}
    }

    // ❌ Bad - verb-based, describes what to do
    class DoLoginEvent { }
    class LoadDataEvent { } // "Load" is imperative, not declarative
    class ProcessPaymentEvent { }
    \`\`\`

    **Why this matters**: Events are facts about things that happened. They should be in past tense
    or use nouns. Commands (which trigger events) can be imperative, but events themselves are
    declarative.

    ### 2. Immutable Event Payloads

    Always use \`readonly\` for event properties:

    \`\`\`typescript
    // ✅ Good - readonly properties
    class IncrementByEvent {
      constructor(public readonly amount: number) {}
    }

    class UpdateUserEvent {
      constructor(
        public readonly userId: string,
        public readonly updates: Readonly<UserUpdates>
      ) {}
    }

    // ❌ Bad - mutable properties
    class IncrementEvent {
      constructor(public amount: number) {} // Can be mutated!
    }
    \`\`\`

    **Why this matters**: Mutable events can be changed after creation, leading to unpredictable
    behavior, race conditions, and hard-to-debug issues. Immutability ensures events remain
    consistent throughout their lifecycle.

    ### 3. Specific, Single-Purpose Events

    Each event should represent one specific occurrence:

    \`\`\`typescript
    // ✅ Good - specific, single purpose
    class UserRegisteredEvent {
      constructor(public readonly user: User) {}
    }

    class UserEmailVerifiedEvent {
      constructor(public readonly userId: string) {}
    }

    // ❌ Bad - multi-purpose, confusing
    class UserEvent {
      constructor(
        public readonly action: 'register' | 'verify' | 'delete',
        public readonly user?: User
      ) {}
    }
    \`\`\`

    **Why this matters**: Single-purpose events make your state machine explicit and testable.
    Multi-purpose events hide business logic in conditional branches.

    ### 4. Type-Safe Payloads

    Use strongly-typed interfaces, not \`any\`:

    \`\`\`typescript
    // ✅ Good - strongly typed
    interface UpdateDataEvent {
      data: {
        value: string;
        timestamp: number;
      };
    }

    // ❌ Bad - loses type safety
    class DataEvent {
      constructor(public readonly data: any) {}
    }
    \`\`\`

    ### 5. Domain-Driven Event Names

    Use the language of your domain:

    \`\`\`typescript
    // E-commerce domain
    class OrderPlacedEvent { }
    class PaymentProcessedEvent { }
    class ItemShippedEvent { }

    // Social media domain
    class PostPublishedEvent { }
    class CommentAddedEvent { }
    class UserFollowedEvent { }
    \`\`\`

    ## Event Categories

    ### Command Events
    Trigger an action that will result in a state change:

    \`\`\`typescript
    class LoadDataEvent {
      constructor(public readonly id: string) {}
    }
    \`\`\`

    ### Domain Events
    Represent something that happened in the business domain:

    \`\`\`typescript
    class UserLoggedInEvent {
      constructor(public readonly user: User) {}
    }
    \`\`\`

    ### Query Result Events
    Carry the result of an asynchronous operation:

    \`\`\`typescript
    class DataLoadedEvent {
      constructor(public readonly data: Data) {}
    }
    \`\`\`

    ### Error Events
    Represent errors or failures:

    \`\`\`typescript
    class ErrorOccurredEvent {
      constructor(
        public readonly error: {
          message: string;
          code?: string;
        }
      ) {}
    }
    \`\`\`

    ## Anti-Patterns to Avoid

    ### ❌ 1. Verb-Based Event Names

    \`\`\`typescript
    // Wrong
    class DoIncrementEvent { }
    class PerformLoginEvent { }
    class ExecuteSearchEvent { }
    \`\`\`

    These sound like commands, not events. Events describe what happened, not what to do.

    ### ❌ 2. Generic/Vague Event Names

    \`\`\`typescript
    // Wrong - too generic
    class DataEvent { }
    class UpdateEvent { }
    class StateChangedEvent { }
    \`\`\`

    Be specific about what changed and why.

    ### ❌ 3. Mutable Event Properties

    \`\`\`typescript
    // Wrong - properties can be mutated
    class UpdateEvent {
      constructor(public state: AppState) {}
    }

    // Later...
    const event = new UpdateEvent(state);
    event.state = differentState; // Mutation! Bad!
    \`\`\`

    ### ❌ 4. Multi-Purpose Events with Flags

    \`\`\`typescript
    // Wrong - one event doing multiple things
    class UpdateEvent {
      constructor(
        public readonly newValue?: string,
        public readonly shouldReset?: boolean,
        public readonly shouldValidate?: boolean
      ) {}
    }
    \`\`\`

    Create separate, specific events instead.

    ### ❌ 5. Events with Behavior/Logic

    \`\`\`typescript
    // Wrong - events should be data, not behavior
    class UpdateEvent {
      constructor(public readonly value: string) {}

      validate() { /* validation logic */ }
      process() { /* processing logic */ }
    }
    \`\`\`

    Events should be pure data. Put logic in handlers, not events.

    ## Event Handler Best Practices

    ### 1. Handlers Should Be Pure Functions

    \`\`\`typescript
    this.on(IncrementByEvent, (event, emit) => {
      emit({
        ...this.state,
        count: this.state.count + event.amount,
      });
    });
    \`\`\`

    ### 2. Use Arrow Functions for Proper \`this\` Binding

    \`\`\`typescript
    // ✅ Good
    private handleIncrement = (event: IncrementEvent, emit) => {
      emit({ ...this.state, count: this.state.count + 1 });
    };

    // ❌ Bad - loses \`this\` context
    private handleIncrement(event: IncrementEvent, emit) {
      emit({ ...this.state, count: this.state.count + 1 });
    }
    \`\`\`

    ### 3. Keep Handlers Focused and Single-Purpose

    Each handler should do one thing well. If a handler is complex, consider breaking it into
    smaller helper methods.

    ## Testing Event-Driven Blocs

    ### Test Event Processing

    \`\`\`typescript
    it('should process increment event', async () => {
      await bloc.add(new IncrementByEvent(5));
      expect(bloc.state.count).toBe(5);
    });
    \`\`\`

    ### Test Event Immutability (at compile-time)

    TypeScript's \`readonly\` provides compile-time safety. Trust the type system:

    \`\`\`typescript
    it('should use readonly properties', () => {
      const event = new IncrementByEvent(5);
      // TypeScript prevents: event.amount = 10; (compile error)
      expect(event.amount).toBe(5);
    });
    \`\`\`

    ### Test State Consistency

    \`\`\`typescript
    it('should maintain state consistency', async () => {
      await bloc.add(new IncrementByEvent(5));
      await bloc.add(new UpdateDataEvent('test'));

      // Verify both state changes persisted correctly
      expect(bloc.state.count).toBe(5);
      expect(bloc.state.data).toBe('test');
    });
    \`\`\`

    ## Summary: Event Design Checklist

    When creating a new event, ask yourself:

    - [ ] Does the name describe what happened (past tense/noun)?
    - [ ] Are all properties marked \`readonly\`?
    - [ ] Is the event focused on a single purpose?
    - [ ] Are the types specific and meaningful?
    - [ ] Does the event name match the domain language?
    - [ ] Does the event carry only data (no behavior)?
    - [ ] Can the event be easily tested?
    - [ ] Is the event payload immutable (deeply)?

    Following these principles will lead to maintainable, testable, and understandable event-driven
    architectures.
  `,
});
