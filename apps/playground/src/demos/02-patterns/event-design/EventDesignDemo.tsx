import React from 'react';
import { useBloc } from '@blac/react';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { ConceptCallout, TipCallout, WarningCallout, InfoCallout, SuccessCallout } from '@/components/shared/ConceptCallout';
import { useInteractionFeedback } from '@/components/shared/InteractionFeedback';
import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { CheckCircle, XCircle, AlertCircle, UserCheck } from 'lucide-react';
import {
  EventPatternBloc,
  ResetStateEvent,
  IncrementByEvent,
  UpdateDataEvent,
  LoadDataEvent,
  UserLoggedInEvent,
  ErrorOccurredEvent,
} from './EventPatternBloc';

const demoMetadata = {
  id: 'event-design',
  title: 'Event Design Patterns',
  description: 'Learn best practices for designing events in BLoC architecture: naming conventions, payload design, and common anti-patterns to avoid.',
  category: '02-patterns',
  difficulty: 'intermediate' as const,
  tags: ['bloc', 'events', 'patterns', 'best-practices', 'architecture'],
  estimatedTime: 15,
  learningPath: {
    previous: 'bloc-vs-cubit',
    next: 'computed-properties',
    sequence: 1,
  },
  theme: {
    primaryColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
};

export const EventDesignDemo: React.FC = () => {
  const [state, bloc] = useBloc(EventPatternBloc);
  const { celebrate } = useInteractionFeedback();

  return (
    <DemoArticle metadata={demoMetadata} hideNavigation={true}>
      {/* Introduction Section */}
      <ArticleSection id="intro">
        <SectionHeader>Why Event Design Matters</SectionHeader>
        <Prose>
          <p>
            Events are the fundamental building blocks of Bloc-based state management.
            Well-designed events clearly communicate <strong>what happened</strong> (not what should happen),
            are immutable and thread-safe, easy to test and debug, make state transitions predictable,
            and follow domain language and business concepts.
          </p>
        </Prose>

        <InfoCallout
          title="Key Principle"
        >
          Events represent facts about things that happened. They should be past-tense nouns
          or noun phrases, never imperative commands.
        </InfoCallout>

        <StateViewer
          bloc={EventPatternBloc}
          title="Live Event Demo State"
          className="mt-6"
        />
      </ArticleSection>

      {/* Good Event Patterns Section */}
      <ArticleSection id="good-patterns">
        <SectionHeader>Good Event Patterns</SectionHeader>
        <Prose>
          <p>
            These examples demonstrate best practices for event design in BLoC architecture.
            Each pattern addresses a specific use case and follows established conventions.
          </p>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Simple Event */}
          <Card className="p-6">
            <h4 className="font-semibold mb-3">1. Simple Event (No Payload)</h4>
            <CodePanel
              code={`class ResetStateEvent {}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <Button
              onClick={() => {
                bloc.reset();
                celebrate('sparkles');
              }}
              variant="outline"
              className="w-full mb-3"
            >
              Reset State
            </Button>
            <p className="text-sm text-muted-foreground">
              Use for actions that don't need additional data
            </p>
          </Card>

          {/* Event with Primitive */}
          <Card className="p-6">
            <h4 className="font-semibold mb-3">2. Event with Primitive</h4>
            <CodePanel
              code={`class IncrementByEvent {
  constructor(readonly amount: number) {}
}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => {
                  bloc.incrementBy(1);
                  // showInteraction('Increment by 1');
                }}
                variant="outline"
                className="flex-1"
              >
                +1
              </Button>
              <Button
                onClick={() => {
                  bloc.incrementBy(5);
                  // showInteraction('Increment by 5');
                }}
                variant="outline"
                className="flex-1"
              >
                +5
              </Button>
              <Button
                onClick={() => {
                  bloc.incrementBy(10);
                  // showInteraction('Increment by 10');
                }}
                variant="outline"
                className="flex-1"
              >
                +10
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use readonly for immutability
            </p>
          </Card>

          {/* Event with Object */}
          <Card className="p-6">
            <h4 className="font-semibold mb-3">3. Event with Object Payload</h4>
            <CodePanel
              code={`class UpdateDataEvent {
  constructor(readonly data: {
    value: string;
    timestamp: number;
  }) {}
}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => {
                  bloc.updateData('Hello');
                  // showInteraction('Update data to Hello');
                }}
                variant="outline"
                className="flex-1"
              >
                Set "Hello"
              </Button>
              <Button
                onClick={() => {
                  bloc.updateData('World');
                  // showInteraction('Update data to World');
                }}
                variant="outline"
                className="flex-1"
              >
                Set "World"
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Group related data in objects
            </p>
          </Card>

          {/* Command Pattern */}
          <Card className="p-6">
            <h4 className="font-semibold mb-3">4. Command Pattern</h4>
            <CodePanel
              code={`class LoadDataEvent {
  constructor(readonly id: string) {}
}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => {
                  bloc.loadData('user-123');
                  // showInteraction('Load user-123');
                }}
                variant="outline"
                className="flex-1"
              >
                Load User
              </Button>
              <Button
                onClick={() => {
                  bloc.loadData('post-456');
                  // showInteraction('Load post-456');
                }}
                variant="outline"
                className="flex-1"
              >
                Load Post
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Commands trigger actions (often async)
            </p>
          </Card>

          {/* Domain Event */}
          <Card className="p-6">
            <h4 className="font-semibold mb-3">5. Domain Event</h4>
            <CodePanel
              code={`class UserLoggedInEvent {
  constructor(readonly user: {...}) {}
}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => {
                  bloc.loginUser('u1', 'Alice');
                  // showInteraction('Login Alice');
                }}
                variant="outline"
                className="flex-1"
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Login Alice
              </Button>
              <Button
                onClick={() => {
                  bloc.loginUser('u2', 'Bob');
                  // showInteraction('Login Bob');
                }}
                variant="outline"
                className="flex-1"
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Login Bob
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Past tense nouns for things that happened
            </p>
          </Card>

          {/* Error Event */}
          <Card className="p-6">
            <h4 className="font-semibold mb-3">6. Error Event</h4>
            <CodePanel
              code={`class ErrorOccurredEvent {
  constructor(readonly error: {...}) {}
}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => {
                  bloc.setError('Network failed', 'NET_ERR');
                  // showInteraction('Set network error');
                }}
                variant="outline"
                className="flex-1"
              >
                Network Error
              </Button>
              <Button
                onClick={() => {
                  bloc.setError('Invalid input', 'VALIDATION');
                  // showInteraction('Set validation error');
                }}
                variant="outline"
                className="flex-1"
              >
                Validation Error
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Structured error information
            </p>
          </Card>
        </div>

      </ArticleSection>

      {/* Anti-Patterns Section */}
      <ArticleSection id="anti-patterns">
        <SectionHeader>Anti-Patterns to Avoid</SectionHeader>
        <WarningCallout
          title="WARNING:"
        >
          These examples show common mistakes in event design. Don't use these patterns in production code!
        </WarningCallout>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Verb-based Naming */}
          <Card className="p-6 border-red-200 dark:border-red-900">
            <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">
              <XCircle className="inline h-4 w-4 mr-2" />
              BAD: Verb-based Naming
            </h4>
            <CodePanel
              code={`// BAD:
class DoIncrementEvent {...}

// GOOD:
class IncrementedEvent {...}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <Button
              onClick={() => {
                bloc.doIncrement(3);
                // showInteraction('Tried bad pattern: DoIncrement');
              }}
              variant="danger"
              className="w-full mb-3"
            >
              Try Bad Pattern
            </Button>
            <p className="text-sm text-muted-foreground">
              Events should be nouns (what happened), not verbs (what to do)
            </p>
          </Card>

          {/* Generic Events */}
          <Card className="p-6 border-red-200 dark:border-red-900">
            <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">
              <XCircle className="inline h-4 w-4 mr-2" />
              BAD: Generic/Unclear Events
            </h4>
            <CodePanel
              code={`// BAD:
class DataEvent {
  constructor(data: any) {}
}

// GOOD:
class UserDataUpdatedEvent {...}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <Button
              onClick={() => {
                bloc.sendGenericData({ random: 'data' });
                // showInteraction('Tried bad pattern: Generic data event');
              }}
              variant="danger"
              className="w-full mb-3"
            >
              Try Bad Pattern
            </Button>
            <p className="text-sm text-muted-foreground">
              Events should have specific, descriptive names
            </p>
          </Card>

          {/* Mutable Payloads */}
          <Card className="p-6 border-red-200 dark:border-red-900">
            <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">
              <XCircle className="inline h-4 w-4 mr-2" />
              BAD: Mutable Payloads
            </h4>
            <CodePanel
              code={`// BAD:
class MutableStateEvent {
  constructor(state: {...}) {} // not readonly!
}

// GOOD:
class StateUpdatedEvent {
  constructor(readonly state: {...}) {}
}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <Button
              onClick={() => {
                bloc.sendMutableState(42);
                // showInteraction('Tried bad pattern: Mutable state');
              }}
              variant="danger"
              className="w-full mb-3"
            >
              Try Bad Pattern
            </Button>
            <p className="text-sm text-muted-foreground">
              Event payloads must be immutable (use readonly)
            </p>
          </Card>

          {/* Multi-purpose Events */}
          <Card className="p-6 border-red-200 dark:border-red-900">
            <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">
              <XCircle className="inline h-4 w-4 mr-2" />
              BAD: Multi-purpose Events
            </h4>
            <CodePanel
              code={`// BAD:
class UpdateAndResetEvent {
  constructor(
    newValue?: string,
    shouldReset?: boolean
  ) {}
}`}
              language="typescript"
              showLineNumbers={false}
              className="mb-4"
            />
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => {
                  bloc.updateOrReset('test', false);
                  // showInteraction('Tried bad pattern: Update only');
                }}
                variant="danger"
                className="flex-1"
              >
                Update
              </Button>
              <Button
                onClick={() => {
                  bloc.updateOrReset(undefined, true);
                  // showInteraction('Tried bad pattern: Reset only');
                }}
                variant="danger"
                className="flex-1"
              >
                Reset
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Each event should have a single, clear purpose
            </p>
          </Card>
        </div>
      </ArticleSection>

      {/* Naming Conventions Section */}
      <ArticleSection id="naming"><SectionHeader>Naming Conventions</SectionHeader>
        <Prose>
          <p>
            Consistent naming conventions make your event-driven code more maintainable
            and easier to understand. Follow these guidelines:
          </p>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="p-6">
            <h4 className="font-semibold mb-4">YES: Good Naming Practices</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Use nouns, not verbs:</strong>
                  <div className="text-sm text-muted-foreground mt-1">
                    UserLoggedInEvent vs LoginUserEvent
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Past tense for domain events:</strong>
                  <div className="text-sm text-muted-foreground mt-1">
                    OrderPlacedEvent, PaymentReceivedEvent
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Present tense for commands:</strong>
                  <div className="text-sm text-muted-foreground mt-1">
                    LoadDataEvent, SaveDocumentEvent
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Suffix with "Event":</strong>
                  <div className="text-sm text-muted-foreground mt-1">
                    Makes purpose clear in code
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold mb-4">NO: Common Mistakes</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Imperative verbs:</strong>
                  <div className="text-sm text-muted-foreground mt-1">
                    DoLoginEvent, PerformSearchEvent
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Generic names:</strong>
                  <div className="text-sm text-muted-foreground mt-1">
                    DataEvent, UpdateEvent, ChangeEvent
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Ambiguous naming:</strong>
                  <div className="text-sm text-muted-foreground mt-1">
                    ProcessEvent, HandleEvent
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Missing context:</strong>
                  <div className="text-sm text-muted-foreground mt-1">
                    SuccessEvent (success of what?)
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </ArticleSection>

      {/* Payload Design Section */}
      <ArticleSection id="payload"><SectionHeader>Payload Design</SectionHeader>
        <Prose>
          <p>
            Well-designed event payloads ensure type safety, immutability, and clarity.
            Follow these best practices when designing event payloads:
          </p>
        </Prose>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <InfoCallout
            title="Immutability First"
          >
            Always use <code>readonly</code> for all event properties. This prevents
            accidental mutations and ensures events remain consistent throughout their lifecycle.
          </InfoCallout>

          <InfoCallout
            title="Type Safety"
          >
            Use specific types instead of <code>any</code>. TypeScript's type system
            helps catch errors at compile time rather than runtime.
          </InfoCallout>
        </div>

        <CodePanel
          code={`// GOOD: Immutable, type-safe payload
class OrderPlacedEvent {
  constructor(
    public readonly orderId: string,
    public readonly items: ReadonlyArray<{
      readonly productId: string;
      readonly quantity: number;
      readonly price: number;
    }>,
    public readonly totalAmount: number,
    public readonly placedAt: Date
  ) {}
}

// BAD: Mutable, loosely typed payload
class OrderEvent {
  constructor(
    public data: any  // No type safety, mutable
  ) {}
}`}
          language="typescript"
          title="Payload Design Example"
          className="mt-6"
        />
      </ArticleSection>

      {/* Event Categories Section */}
      <ArticleSection id="categories"><SectionHeader>Event Categories</SectionHeader>
        <Prose>
          <p>
            Events can be categorized based on their purpose and origin. Understanding
            these categories helps in designing a consistent event architecture:
          </p>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Domain Events</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Business events that happened
                </p>
              </div>
            </div>
            <CodePanel
              code={`UserRegisteredEvent
OrderShippedEvent
PaymentCompletedEvent
SubscriptionRenewedEvent`}
              language="typescript"
              showLineNumbers={false}
            />
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Command Events</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Trigger actions or operations
                </p>
              </div>
            </div>
            <CodePanel
              code={`LoadUserEvent
SaveDocumentEvent
RefreshDataEvent
ValidateFormEvent`}
              language="typescript"
              showLineNumbers={false}
            />
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">System Events</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Technical/infrastructure events
                </p>
              </div>
            </div>
            <CodePanel
              code={`ConnectionLostEvent
CacheExpiredEvent
MemoryLimitReachedEvent
ServiceUnavailableEvent`}
              language="typescript"
              showLineNumbers={false}
            />
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">UI Events</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  User interaction events
                </p>
              </div>
            </div>
            <CodePanel
              code={`ButtonClickedEvent
FormSubmittedEvent
TabSwitchedEvent
ModalClosedEvent`}
              language="typescript"
              showLineNumbers={false}
            />
          </Card>
        </div>
      </ArticleSection>

      {/* Quick Reference Section */}
      <ArticleSection id="reference"><SectionHeader>Quick Reference</SectionHeader>
        <Prose>
          <p>
            Side-by-side comparison of good patterns and anti-patterns for quick reference:
          </p>
        </Prose>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div>
            <h4 className="font-semibold mb-4 text-green-600 dark:text-green-400">
              <CheckCircle className="inline h-5 w-5 mr-2" />
              GOOD: Patterns to Follow
            </h4>
            <CodePanel
              code={`// Simple event
class UserLoggedOutEvent {}

// Event with readonly payload
class UserRegisteredEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
    readonly registeredAt: Date
  ) {}
}

// Command event
class LoadUserDataEvent {
  constructor(
    readonly userId: string
  ) {}
}

// Domain event with nested data
class PaymentProcessedEvent {
  constructor(
    readonly payment: Readonly<{
      id: string;
      amount: number;
      currency: string;
      processedAt: Date;
    }>
  ) {}
}

// Error event
class ValidationFailedEvent {
  constructor(
    readonly errors: ReadonlyArray<{
      readonly field: string;
      readonly message: string;
    }>
  ) {}
}`}
              language="typescript"
              className="h-full"
            />
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-red-600 dark:text-red-400">
              <XCircle className="inline h-5 w-5 mr-2" />
              BAD: Anti-Patterns to Avoid
            </h4>
            <CodePanel
              code={`// Too generic
class DataEvent {
  constructor(data: any) {}
}

// Verb-based naming
class DoSomethingEvent {}
class PerformActionEvent {}

// Mutable properties
class UpdateEvent {
  constructor(
    public state: State // Mutable!
  ) {}
}

// Multi-purpose with flags
class UpdateOrDeleteEvent {
  constructor(
    data?: any,
    shouldDelete?: boolean,
    shouldValidate?: boolean
  ) {}
}

// Events with behavior
class ProcessEvent {
  constructor(data: any) {}

  // Events shouldn't have methods!
  validate() { }
  process() { }
}

// Missing context
class SuccessEvent {} // Success of what?
class ErrorEvent {}   // What error?`}
              language="typescript"
              className="h-full"
            />
          </div>
        </div>
      </ArticleSection>

      {/* Key Takeaways Section */}
      <ArticleSection id="takeaways"><SectionHeader>Key Takeaways</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SuccessCallout
            title="Event Design Checklist"
          >
            <ul className="space-y-2 mt-3">
              <li>Does the name describe what happened (past tense/noun)?</li>
              <li>Are all properties marked readonly?</li>
              <li>Is the event focused on a single purpose?</li>
              <li>Are the types specific and meaningful?</li>
              <li>Does the event name match the domain language?</li>
              <li>Does the event carry only data (no behavior)?</li>
            </ul>
          </SuccessCallout>

          <InfoCallout
            title="Remember"
          >
            <ul className="space-y-2 mt-3">
              <li>Events are facts about things that happened</li>
              <li>Immutability prevents bugs and race conditions</li>
              <li>Specific events are easier to test and debug</li>
              <li>Good naming improves code readability</li>
              <li>Type safety catches errors at compile time</li>
              <li>Single-purpose events simplify state management</li>
            </ul>
          </InfoCallout>
        </div>
      </ArticleSection>

      {/* Next Steps Section */}
      <ArticleSection id="next"><SectionHeader>Next Steps</SectionHeader>
        <Prose>
          <p>
            Now that you understand event design patterns, explore these related topics:
          </p>
          <ul>
            <li>
              <strong>Computed Properties:</strong> Learn how to derive state from events
            </li>
            <li>
              <strong>Async Patterns:</strong> Handle asynchronous operations with events
            </li>
            <li>
              <strong>Testing Strategies:</strong> Write comprehensive tests for event-driven Blocs
            </li>
            <li>
              <strong>Performance Optimization:</strong> Optimize event processing for large-scale applications
            </li>
          </ul>
        </Prose>

        <TipCallout
          title="Pro Tip"
        >
          Start by defining your domain events first. They form the foundation of your
          application's state management and help clarify business requirements.
        </TipCallout>
      </ArticleSection>
    </DemoArticle>
  );
};