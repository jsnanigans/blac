import React from 'react';
import { useBloc } from '@blac/react';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
import { Callout } from '@/ui/Callout';
import { Section } from '@/ui/Section';
import { AlertCircle, CheckCircle, XCircle, Info, UserCheck } from 'lucide-react';
import {
  EventPatternBloc,
  ResetStateEvent,
  IncrementByEvent,
  UpdateDataEvent,
  LoadDataEvent,
  UserLoggedInEvent,
  ErrorOccurredEvent,
} from './EventPatternBloc';

export const EventDesignDemo: React.FC = () => {
  const [state, bloc] = useBloc(EventPatternBloc);

  return (
    <div className="space-y-6">
      {/* Current State Display */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
        <h3 className="text-lg font-semibold mb-4">Current State</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Count:</span>
              <Badge variant="default" className="font-mono">
                {state.count}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Data:</span>
              <Badge variant="default" className="font-mono">
                {state.data}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Event:</span>
              <Badge
                variant={state.lastEvent.includes('BAD') ? 'danger' : 'default'}
                className="font-mono text-xs"
              >
                {state.lastEvent}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">User:</span>
              <Badge variant="default" className="font-mono">
                {state.user ? state.user.name : 'Not logged in'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Loaded Data:</span>
              <Badge variant="default" className="font-mono text-xs">
                {state.loadedData ? state.loadedData.id : 'None'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Error:</span>
              <Badge variant={state.error ? 'danger' : 'default'} className="font-mono text-xs">
                {state.error ? state.error.message : 'None'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Good Patterns Section */}
      <Section title="Good Event Design Patterns">
        <div className="space-y-4">
          <Callout
            variant="success"
            title="Good Event Design Patterns"
          >
            These examples demonstrate best practices for event design in BLoC architecture.
          </Callout>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Simple Event */}
            <Card className="p-4">
              <h4 className="font-semibold mb-2">1. Simple Event (No Payload)</h4>
              <div className="bg-muted p-2 rounded mb-3 font-mono text-xs">
                class ResetStateEvent {}
              </div>
              <Button onClick={bloc.reset} variant="outline" className="w-full">
                Reset State
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Use for actions that don't need additional data
              </p>
            </Card>

            {/* Event with Primitive */}
            <Card className="p-4">
              <h4 className="font-semibold mb-2">2. Event with Primitive</h4>
              <div className="bg-muted p-2 rounded mb-3 font-mono text-xs">
                {'class IncrementByEvent {\n  constructor(readonly amount: number) {}\n}'}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => bloc.incrementBy(1)} variant="outline" className="flex-1">
                  +1
                </Button>
                <Button onClick={() => bloc.incrementBy(5)} variant="outline" className="flex-1">
                  +5
                </Button>
                <Button onClick={() => bloc.incrementBy(10)} variant="outline" className="flex-1">
                  +10
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Use readonly for immutability</p>
            </Card>

            {/* Event with Object */}
            <Card className="p-4">
              <h4 className="font-semibold mb-2">3. Event with Object Payload</h4>
              <div className="bg-muted p-2 rounded mb-3 font-mono text-xs">
                {'class UpdateDataEvent {\n  constructor(readonly data: {\n    value: string;\n    timestamp: number;\n  }) {}\n}'}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => bloc.updateData('Hello')} variant="outline" className="flex-1">
                  Set "Hello"
                </Button>
                <Button onClick={() => bloc.updateData('World')} variant="outline" className="flex-1">
                  Set "World"
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Group related data in objects</p>
            </Card>

            {/* Command Pattern */}
            <Card className="p-4">
              <h4 className="font-semibold mb-2">4. Command Pattern</h4>
              <div className="bg-muted p-2 rounded mb-3 font-mono text-xs">
                {'class LoadDataEvent {\n  constructor(readonly id: string) {}\n}'}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => bloc.loadData('user-123')} variant="outline" className="flex-1">
                  Load User
                </Button>
                <Button onClick={() => bloc.loadData('post-456')} variant="outline" className="flex-1">
                  Load Post
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Commands trigger actions (often async)
              </p>
            </Card>

            {/* Domain Event */}
            <Card className="p-4">
              <h4 className="font-semibold mb-2">5. Domain Event</h4>
              <div className="bg-muted p-2 rounded mb-3 font-mono text-xs">
                {'class UserLoggedInEvent {\n  constructor(readonly user: {...}) {}\n}'}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => bloc.loginUser('u1', 'Alice')}
                  variant="outline"
                  className="flex-1"
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Login Alice
                </Button>
                <Button
                  onClick={() => bloc.loginUser('u2', 'Bob')}
                  variant="outline"
                  className="flex-1"
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Login Bob
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Past tense nouns for things that happened
              </p>
            </Card>

            {/* Error Event */}
            <Card className="p-4">
              <h4 className="font-semibold mb-2">6. Error Event</h4>
              <div className="bg-muted p-2 rounded mb-3 font-mono text-xs">
                {'class ErrorOccurredEvent {\n  constructor(readonly error: {...}) {}\n}'}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => bloc.setError('Network failed', 'NET_ERR')}
                  variant="outline"
                  className="flex-1"
                >
                  Network Error
                </Button>
                <Button
                  onClick={() => bloc.setError('Invalid input', 'VALIDATION')}
                  variant="outline"
                  className="flex-1"
                >
                  Validation Error
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Structured error information</p>
            </Card>
          </div>
        </div>
      </Section>

      {/* Bad Patterns Section */}
      <Section title="Anti-Patterns to Avoid">
        <div className="space-y-4">
          <Callout
            variant="danger"
            title="Anti-Patterns to Avoid"
          >
            These examples show common mistakes in event design. Don't use these patterns!
          </Callout>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Verb-based Naming */}
            <Card className="p-4 border-red-200 dark:border-red-900">
              <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                ❌ Verb-based Naming
              </h4>
              <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded mb-3 font-mono text-xs">
                {'// BAD\nclass DoIncrementEvent {...}\n\n// GOOD\nclass IncrementedEvent {...}'}
              </div>
              <Button onClick={() => bloc.doIncrement(3)} variant="primary" className="w-full">
                Try Bad Pattern
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Events should be nouns (what happened), not verbs (what to do)
              </p>
            </Card>

            {/* Generic Events */}
            <Card className="p-4 border-red-200 dark:border-red-900">
              <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                ❌ Generic/Unclear Events
              </h4>
              <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded mb-3 font-mono text-xs">
                {'// BAD\nclass DataEvent {\n  constructor(data: any) {}\n}\n\n// GOOD\nclass UserDataUpdatedEvent {...}'}
              </div>
              <Button
                onClick={() => bloc.sendGenericData({ random: 'data' })}
                variant="primary"
                className="w-full"
              >
                Try Bad Pattern
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Events should have specific, descriptive names
              </p>
            </Card>

            {/* Mutable Payloads */}
            <Card className="p-4 border-red-200 dark:border-red-900">
              <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                ❌ Mutable Payloads
              </h4>
              <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded mb-3 font-mono text-xs">
                {'// BAD\nclass MutableStateEvent {\n  constructor(state: {...}) {} // not readonly!\n}\n\n// GOOD\nclass StateUpdatedEvent {\n  constructor(readonly state: {...}) {}\n}'}
              </div>
              <Button onClick={() => bloc.sendMutableState(42)} variant="primary" className="w-full">
                Try Bad Pattern
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Event payloads must be immutable (use readonly)
              </p>
            </Card>

            {/* Multi-purpose Events */}
            <Card className="p-4 border-red-200 dark:border-red-900">
              <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                ❌ Multi-purpose Events
              </h4>
              <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded mb-3 font-mono text-xs">
                {'// BAD\nclass UpdateAndResetEvent {\n  constructor(\n    newValue?: string,\n    shouldReset?: boolean\n  ) {}\n}'}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => bloc.updateOrReset('test', false)}
                  variant="primary"
                  className="flex-1"
                >
                  Update
                </Button>
                <Button
                  onClick={() => bloc.updateOrReset(undefined, true)}
                  variant="primary"
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Each event should have a single, clear purpose
              </p>
            </Card>
          </div>
        </div>
      </Section>

      {/* Guidelines Section */}
      <Section title="Event Design Guidelines">
        <div className="space-y-4">
          <Callout
            variant="info"
            title="Event Design Guidelines"
          >
            Best practices for designing events in BLoC architecture
          </Callout>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Naming Conventions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Use nouns, not verbs:</strong>
                    <div className="text-xs text-muted-foreground">
                      UserLoggedInEvent ✓ vs LoginUserEvent ✗
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Past tense for domain events:</strong>
                    <div className="text-xs text-muted-foreground">
                      OrderPlacedEvent, PaymentReceivedEvent
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Present tense for commands:</strong>
                    <div className="text-xs text-muted-foreground">LoadDataEvent, SaveDocumentEvent</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Suffix with "Event":</strong>
                    <div className="text-xs text-muted-foreground">Makes purpose clear in code</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-3">Payload Design</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Always use readonly:</strong>
                    <div className="text-xs text-muted-foreground">Prevents accidental mutations</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Prefer primitives and simple objects:</strong>
                    <div className="text-xs text-muted-foreground">Easier to serialize and debug</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Group related data:</strong>
                    <div className="text-xs text-muted-foreground">
                      Use objects for cohesive data groups
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Avoid optional parameters:</strong>
                    <div className="text-xs text-muted-foreground">
                      Create separate events instead
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-3">Event Categories</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Domain Events:</strong>
                    <div className="text-xs text-muted-foreground">
                      Business events that happened (UserRegistered, OrderShipped)
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Command Events:</strong>
                    <div className="text-xs text-muted-foreground">
                      Trigger actions (LoadUser, SaveDocument)
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>System Events:</strong>
                    <div className="text-xs text-muted-foreground">
                      Technical events (ConnectionLost, CacheExpired)
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>UI Events:</strong>
                    <div className="text-xs text-muted-foreground">
                      User interactions (ButtonClicked, FormSubmitted)
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-3">Common Mistakes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Using any type:</strong>
                    <div className="text-xs text-muted-foreground">Loses type safety benefits</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Mixing concerns:</strong>
                    <div className="text-xs text-muted-foreground">
                      One event should do one thing
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Large payloads:</strong>
                    <div className="text-xs text-muted-foreground">
                      Keep events lightweight
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Business logic in events:</strong>
                    <div className="text-xs text-muted-foreground">
                      Events carry data, not behavior
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
            <h4 className="font-semibold mb-3">Quick Reference</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <div className="text-green-600 dark:text-green-400 mb-2">✓ Good Patterns</div>
                <pre className="bg-white/50 dark:bg-black/20 p-2 rounded">
{`class UserRegisteredEvent {
  constructor(
    readonly userId: string,
    readonly email: string
  ) {}
}

class LoadUserDataEvent {
  constructor(
    readonly userId: string
  ) {}
}

class PaymentProcessedEvent {
  constructor(
    readonly payment: {
      id: string;
      amount: number;
      currency: string;
    }
  ) {}
}`}
                </pre>
              </div>
              <div>
                <div className="text-red-600 dark:text-red-400 mb-2">✗ Anti-Patterns</div>
                <pre className="bg-white/50 dark:bg-black/20 p-2 rounded">
{`// Too generic
class DataEvent {
  constructor(data: any) {}
}

// Verb-based
class DoSomethingEvent {}

// Mutable
class UpdateEvent {
  constructor(
    public state: State
  ) {}
}

// Multi-purpose
class UpdateOrDeleteEvent {
  constructor(
    data?: any,
    shouldDelete?: boolean
  ) {}
}`}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  );
};