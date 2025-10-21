import { useBloc } from '@blac/react';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { CheckCircle, XCircle, UserCheck } from 'lucide-react';
import {
  EventPatternBloc,
  ResetStateEvent,
  IncrementByEvent,
  UpdateDataEvent,
  LoadDataEvent,
  UserLoggedInEvent,
  ErrorOccurredEvent,
} from '@/demos/02-patterns/event-design/EventPatternBloc';

/**
 * Interactive demo for Event Design patterns
 * Demonstrates good patterns (immutable, specific events) vs anti-patterns
 */
export function EventDesignInteractive() {
  const [state, bloc] = useBloc(EventPatternBloc);

  return (
    <div className="my-8 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column: Interactive patterns */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Good Event Patterns</h3>

          {/* Simple Event */}
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-4 shadow-subtle">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
            <div className="relative space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                1. Simple Event (No Payload)
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded">
                class ResetStateEvent &#123;&#125;
              </code>
              <Button
                onClick={bloc.reset}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Reset State
              </Button>
              <p className="text-xs text-muted-foreground">
                Use for actions that don't need additional data
              </p>
            </div>
          </div>

          {/* Event with Primitive */}
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-4 shadow-subtle">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
            <div className="relative space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                2. Event with Primitive
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded whitespace-pre">
                {`class IncrementByEvent {
  constructor(readonly amount: number) {}
}`}
              </code>
              <div className="flex gap-2">
                <Button
                  onClick={() => bloc.incrementBy(1)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  +1
                </Button>
                <Button
                  onClick={() => bloc.incrementBy(5)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  +5
                </Button>
                <Button
                  onClick={() => bloc.incrementBy(10)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  +10
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use readonly for immutability
              </p>
            </div>
          </div>

          {/* Event with Object */}
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-4 shadow-subtle">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
            <div className="relative space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                3. Event with Object Payload
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded whitespace-pre">
                {`class UpdateDataEvent {
  constructor(readonly data: {
    value: string;
    timestamp: number;
  }) {}
}`}
              </code>
              <div className="flex gap-2">
                <Button
                  onClick={() => bloc.updateData('Hello')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  "Hello"
                </Button>
                <Button
                  onClick={() => bloc.updateData('World')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  "World"
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Group related data in objects
              </p>
            </div>
          </div>

          {/* Command Pattern */}
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-4 shadow-subtle">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
            <div className="relative space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                4. Command Pattern
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded whitespace-pre">
                {`class LoadDataEvent {
  constructor(readonly id: string) {}
}`}
              </code>
              <div className="flex gap-2">
                <Button
                  onClick={() => bloc.loadData('user-123')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Load User
                </Button>
                <Button
                  onClick={() => bloc.loadData('post-456')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Load Post
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Commands trigger actions (often async)
              </p>
            </div>
          </div>

          {/* Domain Event */}
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-4 shadow-subtle">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
            <div className="relative space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                5. Domain Event
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded whitespace-pre">
                {`class UserLoggedInEvent {
  constructor(readonly user: {...}) {}
}`}
              </code>
              <div className="flex gap-2">
                <Button
                  onClick={() => bloc.loginUser('u1', 'Alice')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Login Alice
                </Button>
                <Button
                  onClick={() => bloc.loginUser('u2', 'Bob')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Login Bob
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Past tense nouns for things that happened
              </p>
            </div>
          </div>

          {/* Error Event */}
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-4 shadow-subtle">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
            <div className="relative space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                6. Error Event
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded whitespace-pre">
                {`class ErrorOccurredEvent {
  constructor(readonly error: {...}) {}
}`}
              </code>
              <div className="flex gap-2">
                <Button
                  onClick={() => bloc.setError('Network failed', 'NET_ERR')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Network Error
                </Button>
                <Button
                  onClick={() => bloc.setError('Invalid input', 'VALIDATION')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Validation Error
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Structured error information
              </p>
            </div>
          </div>

          {/* Anti-Patterns Section */}
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 pt-4">
            Anti-Patterns to Avoid
          </h3>

          {/* Verb-based Naming */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 px-4 py-4 shadow-subtle">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                BAD: Verb-based Naming
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded whitespace-pre">
                {`// BAD:
class DoIncrementEvent {...}

// GOOD:
class IncrementedEvent {...}`}
              </code>
              <Button
                onClick={() => bloc.doIncrement(3)}
                variant="danger"
                size="sm"
                className="w-full"
              >
                Try Bad Pattern
              </Button>
              <p className="text-xs text-muted-foreground">
                Events should be nouns (what happened), not verbs (what to do)
              </p>
            </div>
          </div>

          {/* Generic Events */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 px-4 py-4 shadow-subtle">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                BAD: Generic/Unclear Events
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded whitespace-pre">
                {`// BAD:
class DataEvent {
  constructor(data: any) {}
}

// GOOD:
class UserDataUpdatedEvent {...}`}
              </code>
              <Button
                onClick={() => bloc.sendGenericData({ random: 'data' })}
                variant="danger"
                size="sm"
                className="w-full"
              >
                Try Bad Pattern
              </Button>
              <p className="text-xs text-muted-foreground">
                Events should have specific, descriptive names
              </p>
            </div>
          </div>

          {/* Mutable Payloads */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 px-4 py-4 shadow-subtle">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                BAD: Mutable Payloads
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded whitespace-pre">
                {`// BAD:
class MutableStateEvent {
  constructor(state: {...}) {} // not readonly!
}

// GOOD:
class StateUpdatedEvent {
  constructor(readonly state: {...}) {}
}`}
              </code>
              <Button
                onClick={() => bloc.sendMutableState(42)}
                variant="danger"
                size="sm"
                className="w-full"
              >
                Try Bad Pattern
              </Button>
              <p className="text-xs text-muted-foreground">
                Event payloads must be immutable (use readonly)
              </p>
            </div>
          </div>

          {/* Multi-purpose Events */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 px-4 py-4 shadow-subtle">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                BAD: Multi-purpose Events
              </h4>
              <code className="block text-xs bg-surface-muted p-2 rounded whitespace-pre">
                {`// BAD:
class UpdateAndResetEvent {
  constructor(
    newValue?: string,
    shouldReset?: boolean
  ) {}
}`}
              </code>
              <div className="flex gap-2">
                <Button
                  onClick={() => bloc.updateOrReset('test', false)}
                  variant="danger"
                  size="sm"
                  className="flex-1"
                >
                  Update
                </Button>
                <Button
                  onClick={() => bloc.updateOrReset(undefined, true)}
                  variant="danger"
                  size="sm"
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Each event should have a single, clear purpose
              </p>
            </div>
          </div>
        </div>

        {/* Right column: State viewer */}
        <div className="space-y-4">
          <StateViewer
            bloc={EventPatternBloc}
            title="Event Demo State"
            defaultCollapsed={false}
            maxDepth={2}
          />
        </div>
      </div>
    </div>
  );
}
